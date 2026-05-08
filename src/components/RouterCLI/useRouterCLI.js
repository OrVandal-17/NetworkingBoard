import { useState, useCallback } from "react";
import { isValidIp, subnetInfo, parsePrefixLength } from "../../utils/network";

export function useRouterCLI({ device, devices, onUpdate, onPing, onClose }) {
  const [lines, setLines] = useState(() => bootLines(device));
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);

  const push = useCallback((text, cls = "") => {
    setLines((prev) => [...prev, { text, cls }]);
  }, []);

  // Re-sync banner when device name changes externally
  const exec = useCallback(
    (raw) => {
      const input = raw.trim();
      if (!input) return;
      push(`${device.name}# ${input}`, "prompt");
      setHistory((h) => [input, ...h.filter((x) => x !== input)].slice(0, 50));
      setHistIdx(-1);
      const [cmd, ...args] = input.split(/\s+/);

      switch (cmd.toLowerCase()) {
        case "help": case "?":   return execHelp(device, push);
        case "show":             return execShow(args, device, devices, push);
        case "hostname":         return execHostname(args, device, onUpdate, push);
        case "ip":               return execIp(args, device, onUpdate, push);
        case "mac":              return execMac(args, device, push);
        case "gateway":          return execGateway(args, device, onUpdate, push);
        case "no":
          if (args[0] === "shutdown") {
            onUpdate(device.id, { status: "online" });
            push("Interface activée.", "ok");
          } else {
            push(`Commande inconnue: no ${args.join(" ")}`, "err");
          }
          return;
        case "shutdown":
          onUpdate(device.id, { status: "offline" });
          push("Interface désactivée.", "stat");
          return;
        case "ping":
          if (device.type === "switch") {
            push("Les switches L2 ne font pas de ping (pas de couche IP).", "err");
            return;
          }
          return execPing(args, device, onPing, push);
        case "clear":  setLines(bootLines(device)); return;
        case "exit": case "quit": case "q": onClose(); return;
        default:
          push(`Commande introuvable: ${cmd}. Tapez 'help'.`, "err");
      }
    },
    [device, devices, onUpdate, onPing, onClose, push]
  );

  return { lines, history, histIdx, setHistIdx, exec, push };
}

// ── Boot banner ──────────────────────────────────────────────────────────────
function bootLines(device) {
  const typeLabel = { router: "Routeur L3", switch: "Switch L2", pc: "PC / Hôte" }[device.type] ?? device.type;
  return [
    { text: "────────────────────────────────────────────────────", cls: "dim" },
    { text: ` ${device.name} — Console  [${typeLabel}]`, cls: "header" },
    { text: `  Interface: ${device.interface ?? "ETH0"}   Statut: ${device.status}`, cls: "info" },
    { text: "────────────────────────────────────────────────────", cls: "dim" },
    { text: "  Tapez 'help' pour la liste des commandes.", cls: "dim" },
    { text: "", cls: "" },
  ];
}

// ── Command handlers ──────────────────────────────────────────────────────────
function execHelp(device, push) {
  const isSwitch = device.type === "switch";
  const isPC     = device.type === "pc";
  const cmds = [
    ["help",                          "Afficher cette aide"],
    ["show [config|ip|arp]",          "Informations du device"],
    ["hostname <nom>",                "Renommer"],
    ...(!isSwitch ? [
      ["ip address <ip>[/prefix]",    "Configurer l'adresse IP"],
      ["ip prefix <len>",             "Configurer le masque (ex: 24)"],
    ] : [
      ["vlan <id>",                   "Configurer le VLAN natif"],
    ]),
    ...(isPC ? [
      ["gateway <ip>",                "Configurer la passerelle"],
      ["mac",                         "Afficher l'adresse MAC"],
    ] : []),
    ["no shutdown",                   "Activer l'interface"],
    ["shutdown",                      "Désactiver l'interface"],
    ...(!isSwitch ? [
      ["ping <ip> [-c N] [-t TTL]",   "Envoyer des paquets ICMP"],
    ] : []),
    ["clear",                         "Vider le terminal"],
    ["exit / quit",                   "Fermer cette console"],
  ];
  push("Commandes disponibles:", "info");
  cmds.forEach(([c, d]) => push(`  ${c.padEnd(36)}${d}`, ""));
  push("", "");
}

function execShow(args, device, devices, push) {
  const sub = (args[0] ?? "").toLowerCase();

  if (!sub || sub === "config") {
    push("Configuration:", "info");
    push(`  Hostname   : ${device.name}`, "");
    push(`  Type       : ${device.type}`, "");
    push(`  Interface  : ${device.interface ?? "ETH0"}`, "");
    if (device.ip) {
      const info = subnetInfo(device.ip, device.prefix ?? 24);
      push(`  IP Address : ${device.ip}/${device.prefix ?? 24}`, "ok");
      if (info) {
        push(`  Réseau     : ${info.network}/${info.prefix}`, "");
        push(`  Broadcast  : ${info.broadcast}`, "");
      }
    }
    if (device.gateway)  push(`  Passerelle : ${device.gateway}`, "");
    if (device.mac)      push(`  MAC        : ${device.mac}`, "");
    if (device.ports)    push(`  Ports      : ${device.ports}`, "");
    if (device.vlan)     push(`  VLAN natif : ${device.vlan}`, "");
    push(`  Statut     : ${device.status}`, device.status === "online" ? "ok" : "err");
    push("", "");
    return;
  }

  if (sub === "ip") {
    if (!device.ip) { push("Pas d'adresse IP configurée (device L2).", "dim"); return; }
    push(`${device.interface ?? "ETH0"}   ${device.ip}/${device.prefix ?? 24}   ${device.status}`, "ok");
    return;
  }

  if (sub === "arp" || sub === "neighbors") {
    const peers = Object.values(devices).filter((d) => d.id !== device.id && d.ip);
    if (!peers.length) { push("Table ARP vide.", "dim"); return; }
    push("Table ARP / Voisins:", "info");
    peers.forEach((d) =>
      push(`  ${d.ip.padEnd(18)} ${(d.mac ?? "").padEnd(20)} ${d.name}`, "")
    );
    push("", "");
    return;
  }

  push(`Option inconnue: show ${sub}`, "err");
}

function execHostname(args, device, onUpdate, push) {
  if (!args[0]) { push("Usage: hostname <nom>", "err"); return; }
  const name = args.join(" ").slice(0, 32);
  onUpdate(device.id, { name });
  push(`Hostname modifié → ${name}`, "ok");
}

function execIp(args, device, onUpdate, push) {
  if (device.type === "switch") { push("Les switches L2 n'ont pas d'IP (sauf VLAN mgmt).", "err"); return; }
  const sub = (args[0] ?? "").toLowerCase();

  if (sub === "address") {
    const raw = args[1] ?? "";
    let ip = raw, prefix = device.prefix ?? 24;
    if (raw.includes("/")) { [ip] = raw.split("/"); prefix = parsePrefixLength(raw.split("/")[1]); }
    else if (args[2]) { prefix = parsePrefixLength(args[2]); }
    if (!isValidIp(ip)) { push(`Adresse IP invalide: ${ip}`, "err"); return; }
    if (isNaN(prefix) || prefix < 0 || prefix > 32) { push(`Préfixe invalide: ${prefix}`, "err"); return; }
    onUpdate(device.id, { ip, prefix });
    const info = subnetInfo(ip, prefix);
    push(`IP configurée → ${ip}/${prefix}`, "ok");
    if (info) push(`Réseau: ${info.cidr}  Broadcast: ${info.broadcast}`, "info");
    return;
  }

  if (sub === "prefix") {
    const len = parsePrefixLength(args[1]);
    if (isNaN(len) || len < 0 || len > 32) { push("Préfixe invalide (0-32).", "err"); return; }
    onUpdate(device.id, { prefix: len });
    push(`Masque configuré → /${len}`, "ok");
    return;
  }
  push("Usage: ip address <ip>[/prefix]  |  ip prefix <len>", "err");
}

function execGateway(args, device, onUpdate, push) {
  if (!args[0]) { push("Usage: gateway <ip>", "err"); return; }
  if (!isValidIp(args[0])) { push(`IP invalide: ${args[0]}`, "err"); return; }
  onUpdate(device.id, { gateway: args[0] });
  push(`Passerelle configurée → ${args[0]}`, "ok");
}

function execMac(args, device, push) {
  if (device.mac) {
    push(`Adresse MAC : ${device.mac}`, "ok");
  } else {
    push("Pas d'adresse MAC disponible.", "dim");
  }
}

function execPing(args, device, onPing, push) {
  if (!args[0]) { push("Usage: ping <ip> [-c N] [-t TTL]", "err"); return; }
  const dstIp = args[0];
  let count = 4, ttl = 64;
  for (let i = 1; i < args.length; i++) {
    if ((args[i] === "-c" || args[i] === "-n") && args[i+1]) count = parseInt(args[++i]) || 4;
    if (args[i] === "-t" && args[i+1]) ttl = parseInt(args[++i]) || 64;
  }
  onPing({ srcId: device.id, dstIp, count: Math.max(1, Math.min(10, count)), ttl: Math.max(1, Math.min(255, ttl)), onLog: push });
}
