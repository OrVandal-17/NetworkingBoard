import { useState, useCallback } from "react";
import { isValidIp, subnetInfo, parsePrefixLength } from "../../utils/network";
import { findInterface, patchInterface } from "../../data/devices";

/**
 * useRouterCLI — supporte :
 *   mode normal     : show, hostname, ping, shutdown, interface <if>, etc.
 *   mode config-if  : ip address, no shutdown, shutdown, exit
 */
export function useRouterCLI({ device, devices, onUpdate, onPing, onClose }) {
  const [lines,   setLines]   = useState(() => bootLines(device));
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  // Mode courant: "normal" | "config-if"
  const [cliMode, setCliMode]   = useState("normal");
  const [activeIf, setActiveIf] = useState(null); // nom de l'interface sélectionnée

  const push = useCallback((text, cls = "") => {
    setLines(prev => [...prev, { text, cls }]);
  }, []);

  const prompt = cliMode === "config-if"
    ? `${device.name}(config-if)#`
    : `${device.name}#`;

  const exec = useCallback((raw) => {
    const input = raw.trim();
    if (!input) return;
    push(`${prompt} ${input}`, "prompt");
    setHistory(h => [input, ...h.filter(x => x !== input)].slice(0, 50));
    setHistIdx(-1);

    const [cmd, ...args] = input.split(/\s+/);

    // ── Mode config-if ────────────────────────────────────────────────────
    if (cliMode === "config-if") {
      switch (cmd.toLowerCase()) {
        case "ip":
          if (device.type === "switch") { push("Switch L2 — pas d'IP sur port physique. Utilisez l'interface Vlan.", "err"); return; }
          return execIfIp(args, device, activeIf, onUpdate, push);

        case "no":
          if (args[0] === "shutdown") {
            onUpdate(device.id, { interfaces: patchInterface(device.interfaces, activeIf, { status: "up" }) });
            push(`${activeIf} activée.`, "ok");
          } else if (args[0] === "ip" && args[1] === "address") {
            onUpdate(device.id, { interfaces: patchInterface(device.interfaces, activeIf, { ip: null }) });
            push(`Adresse IP supprimée sur ${activeIf}.`, "ok");
          } else {
            push(`Commande inconnue: no ${args.join(" ")}`, "err");
          }
          return;

        case "shutdown":
          onUpdate(device.id, { interfaces: patchInterface(device.interfaces, activeIf, { status: "down" }) });
          push(`${activeIf} désactivée.`, "stat");
          return;

        case "description":
          onUpdate(device.id, { interfaces: patchInterface(device.interfaces, activeIf, { description: args.join(" ") }) });
          push(`Description configurée.`, "ok");
          return;

        case "show":
          return execShowIf(device, activeIf, push);

        case "exit": case "end":
          setCliMode("normal"); setActiveIf(null);
          push(`Retour en mode normal.`, "dim");
          return;

        case "help": case "?":
          return execHelpIf(push);

        default:
          push(`Commande inconnue en config-if: ${cmd}. Tapez 'help'.`, "err");
      }
      return;
    }

    // ── Mode normal ────────────────────────────────────────────────────────
    switch (cmd.toLowerCase()) {
      case "help": case "?":
        return execHelp(device, push);

      case "show":
        return execShow(args, device, devices, push);

      case "hostname":
        return execHostname(args, device, onUpdate, push);

      case "interface": case "int":
        return execInterface(args, device, setCliMode, setActiveIf, push);

      case "ip":
        // ip address directement (sans config-if) — redirige vers la première interface up
        if (device.type === "switch") { push("Utilisez 'interface Vlan1' puis 'ip address ...'", "err"); return; }
        push("Entrez d'abord en mode interface: 'interface <Gi0/0>'", "err");
        return;

      case "no":
        if (args[0] === "shutdown") {
          onUpdate(device.id, { status: "online" });
          push("Device activé.", "ok");
        } else {
          push(`Commande inconnue: no ${args.join(" ")}`, "err");
        }
        return;

      case "shutdown":
        onUpdate(device.id, { status: "offline" });
        push("Device désactivé.", "stat");
        return;

      case "ping":
        if (device.type === "switch") { push("Les switches L2 ne font pas de ping.", "err"); return; }
        return execPing(args, device, onPing, push);

      case "gateway":
        return execGateway(args, device, onUpdate, push);

      case "mac":
        push(device.mac ? `MAC : ${device.mac}` : "Pas d'adresse MAC.", "ok");
        return;

      case "clear":
        setLines(bootLines(device));
        return;

      case "exit": case "quit": case "q":
        onClose();
        return;

      default:
        push(`Commande introuvable: ${cmd}. Tapez 'help'.`, "err");
    }
  }, [cliMode, activeIf, prompt, device, devices, onUpdate, onPing, onClose, push]);

  return { lines, history, histIdx, setHistIdx, exec, cliMode, activeIf };
}

// ── Boot banner ────────────────────────────────────────────────────────────────
function bootLines(device) {
  const typeLabel = { router:"Routeur L3", switch:"Switch L2", pc:"PC / Hôte" }[device.type] ?? device.type;
  const upIfs = (device.interfaces ?? []).filter(i => i.status === "up");
  return [
    { text:"─────────────────────────────────────────────────────", cls:"dim" },
    { text:` ${device.name} — Console  [${typeLabel}]`, cls:"header" },
    { text:`  ${upIfs.length} interface(s) UP   Statut: ${device.status}`, cls:"info" },
    { text:"─────────────────────────────────────────────────────", cls:"dim" },
    { text:"  Tapez 'help' pour les commandes disponibles.", cls:"dim" },
    { text:"", cls:"" },
  ];
}

// ── Commandes mode normal ──────────────────────────────────────────────────────
function execHelp(device, push) {
  const isSwitch = device.type === "switch";
  push("Commandes disponibles:", "info");
  const cmds = [
    ["help / ?",                        "Cette aide"],
    ["show interfaces",                 "État de toutes les interfaces"],
    ["show config",                     "Configuration complète"],
    ["show arp",                        "Table ARP / voisins"],
    ["interface <nom>",                 "Passer en config-if (ex: Gi0/0)"],
    ["hostname <nom>",                  "Renommer le device"],
    ...(!isSwitch ? [
      ["ping <ip> [-c N] [-t TTL]",     "Envoyer des paquets ICMP"],
    ] : []),
    ...(device.type === "pc" ? [
      ["gateway <ip>",                  "Configurer la passerelle"],
      ["mac",                           "Afficher l'adresse MAC"],
    ] : []),
    ["no shutdown",                     "Activer le device"],
    ["shutdown",                        "Désactiver le device"],
    ["clear",                           "Vider le terminal"],
    ["exit / quit",                     "Fermer la console"],
  ];
  cmds.forEach(([c, d]) => push(`  ${c.padEnd(38)}${d}`, ""));
  push("", "");
}

function execShow(args, device, devices, push) {
  const sub = (args[0] ?? "").toLowerCase();

  if (!sub || sub === "config") {
    push("Configuration:", "info");
    push(`  Hostname : ${device.name}`, "");
    push(`  Type     : ${device.type}`, "");
    push(`  Statut   : ${device.status}`, device.status==="online"?"ok":"err");
    if (device.gateway) push(`  Gateway  : ${device.gateway}`, "");
    if (device.mac)     push(`  MAC      : ${device.mac}`, "");
    push("", "");
    push("  Interfaces:", "info");
    (device.interfaces ?? []).forEach(iface => {
      const updown = iface.status === "up" ? "UP  " : "DOWN";
      const ipStr  = iface.ip ? `${iface.ip}/${iface.prefix}` : "non configurée";
      const cls    = iface.status === "up" && iface.ip ? "ok" : iface.status === "up" ? "" : "dim";
      push(`    ${iface.name.padEnd(10)} ${updown}  ${ipStr}`, cls);
    });
    push("", "");
    return;
  }

  if (sub === "interfaces" || sub === "int") {
    push("État des interfaces:", "info");
    (device.interfaces ?? []).forEach(iface => {
      const updown  = iface.status === "up" ? "UP  " : "DOWN";
      const ipStr   = iface.ip ? `${iface.ip}/${iface.prefix}` : "—";
      const linked  = iface.linked !== undefined ? (iface.linked ? " [câblé]" : "") : "";
      const cls     = iface.status === "up" && iface.ip ? "ok" : iface.status === "up" ? "stat" : "dim";
      push(`  ${iface.name.padEnd(12)} ${updown}  ${ipStr.padEnd(20)}${iface.type.padEnd(14)}${linked}`, cls);
    });
    push("", "");
    return;
  }

  if (sub === "ip") {
    const ipIfs = (device.interfaces ?? []).filter(i => i.ip);
    if (!ipIfs.length) { push("Aucune interface avec IP configurée.", "dim"); return; }
    push("Interfaces IP:", "info");
    ipIfs.forEach(i => push(`  ${i.name.padEnd(12)} ${i.ip}/${i.prefix}   ${i.status}`, i.status==="up"?"ok":"dim"));
    push("", "");
    return;
  }

  if (sub === "arp" || sub === "neighbors") {
    const peers = Object.values(devices).filter(d => d.id !== device.id);
    if (!peers.length) { push("Table ARP vide.", "dim"); return; }
    push("Table ARP / Voisins:", "info");
    peers.forEach(d => {
      const pIp = (d.interfaces ?? []).filter(i=>i.ip).map(i=>`${i.ip}/${i.prefix}`).join(", ") || "—";
      push(`  ${(d.name).padEnd(16)} ${pIp.padEnd(22)} ${(d.mac??"")}`, "");
    });
    push("", "");
    return;
  }

  push(`Option inconnue: show ${sub}. Essayez: config, interfaces, ip, arp`, "err");
}

function execInterface(args, device, setCliMode, setActiveIf, push) {
  const ifName = args.join("").toUpperCase()
    .replace("GIGABITETHERNET","GI").replace("FASTETHERNET","FA").replace("SERIAL","SE")
    .replace(/^GI(\d)/, "Gi$1").replace(/^FA(\d)/, "Fa$1").replace(/^SE(\d)/, "Se$1")
    .replace(/^VLAN(\d)/, "Vlan$1");

  // Essai de correspondance flexible (Gi0, gi0/0, g0/0…)
  const found = (device.interfaces ?? []).find(i =>
    i.name.toLowerCase() === ifName.toLowerCase() ||
    i.name.toLowerCase().replace("/","") === ifName.toLowerCase().replace("/","")
  );

  if (!found) {
    const names = (device.interfaces ?? []).map(i => i.name).join(", ");
    push(`Interface introuvable: ${args.join(" ")}. Disponibles: ${names}`, "err");
    return;
  }
  setActiveIf(found.name);
  setCliMode("config-if");
  push(`Entrée en configuration de ${found.name}.`, "info");
  const info = found.ip ? ` — ${found.ip}/${found.prefix}` : " — non configurée";
  push(`  ${found.name}  ${found.status.toUpperCase()}${info}`, found.status==="up"?"ok":"dim");
}

function execHostname(args, device, onUpdate, push) {
  if (!args[0]) { push("Usage: hostname <nom>", "err"); return; }
  onUpdate(device.id, { name: args.join(" ").slice(0, 32) });
  push(`Hostname modifié → ${args.join(" ")}`, "ok");
}

function execGateway(args, device, onUpdate, push) {
  if (!args[0]) { push("Usage: gateway <ip>", "err"); return; }
  if (!isValidIp(args[0])) { push(`IP invalide: ${args[0]}`, "err"); return; }
  onUpdate(device.id, { gateway: args[0] });
  push(`Passerelle configurée → ${args[0]}`, "ok");
}

function execPing(args, device, onPing, push) {
  if (!args[0]) { push("Usage: ping <ip> [-c N] [-t TTL]", "err"); return; }
  let count = 4, ttl = 64;
  for (let i = 1; i < args.length; i++) {
    if ((args[i]==="-c"||args[i]==="-n") && args[i+1]) count = parseInt(args[++i]) || 4;
    if (args[i]==="-t" && args[i+1]) ttl = parseInt(args[++i]) || 64;
  }
  onPing({ srcId: device.id, dstIp: args[0], count: Math.max(1, Math.min(10,count)), ttl: Math.max(1,Math.min(255,ttl)), onLog: push });
}

// ── Commandes mode config-if ───────────────────────────────────────────────────
function execHelpIf(push) {
  push("Commandes config-if:", "info");
  [
    ["ip address <ip>[/prefix]",  "Configurer l'IP de cette interface"],
    ["no ip address",             "Supprimer l'IP"],
    ["no shutdown",               "Activer l'interface"],
    ["shutdown",                  "Désactiver l'interface"],
    ["description <texte>",       "Ajouter une description"],
    ["show",                      "Afficher l'état de cette interface"],
    ["exit / end",                "Retour en mode normal"],
  ].forEach(([c,d]) => push(`  ${c.padEnd(30)}${d}`, ""));
  push("", "");
}

function execIfIp(args, device, ifName, onUpdate, push) {
  const sub = (args[0] ?? "").toLowerCase();
  if (sub !== "address") { push("Usage: ip address <ip>[/prefix]", "err"); return; }

  const raw = args[1] ?? "";
  let ip = raw, prefix = 24;
  if (raw.includes("/")) { [ip] = raw.split("/"); prefix = parsePrefixLength(raw.split("/")[1]); }
  else if (args[2]) { prefix = parsePrefixLength(args[2]); }

  if (!isValidIp(ip)) { push(`IP invalide: ${ip}`, "err"); return; }
  if (isNaN(prefix) || prefix < 0 || prefix > 32) { push(`Préfixe invalide: ${prefix}`, "err"); return; }

  onUpdate(device.id, { interfaces: patchInterface(device.interfaces, ifName, { ip, prefix }) });
  const info = subnetInfo(ip, prefix);
  push(`IP configurée sur ${ifName} → ${ip}/${prefix}`, "ok");
  if (info) push(`  Réseau: ${info.cidr}  Broadcast: ${info.broadcast}`, "info");
}

function execShowIf(device, ifName, push) {
  const iface = findInterface(device, ifName);
  if (!iface) { push(`Interface ${ifName} introuvable.`, "err"); return; }
  push(`Interface ${iface.name}:`, "info");
  push(`  Statut      : ${iface.status}`, iface.status==="up"?"ok":"err");
  push(`  Type        : ${iface.type}`, "");
  push(`  IP Address  : ${iface.ip ? `${iface.ip}/${iface.prefix}` : "non configurée"}`, iface.ip?"ok":"dim");
  if (iface.mac)         push(`  MAC         : ${iface.mac}`, "");
  if (iface.description) push(`  Description : ${iface.description}`, "");
  if (iface.linked !== undefined) push(`  Câblé       : ${iface.linked ? "oui" : "non"}`, "");
  push("", "");
}
