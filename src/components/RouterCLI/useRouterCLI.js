import { useState, useCallback } from "react";
import { isValidIp, subnetInfo, parsePrefixLength } from "../../utils/network";

/**
 * useRouterCLI
 * Parses and executes CLI commands for a single router.
 *
 * Supported commands:
 *   help                          — list commands
 *   show / show ip / show config  — display router info
 *   hostname <name>               — rename router
 *   ip address <ip> [/<prefix>]   — set IP (+ optional prefix)
 *   ip prefix <len>               — set prefix separately
 *   no shutdown / shutdown        — toggle status
 *   ping <ip> [-c <n>] [-t <ttl>]— launch ping
 *   clear                         — clear terminal
 *   exit / quit                   — close panel
 */
export function useRouterCLI({ router, routers, onUpdate, onPing, onClose }) {
  const [lines, setLines] = useState(() => bootLines(router));
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);

  const push = useCallback((text, cls = "") => {
    setLines((prev) => [...prev, { text, cls }]);
  }, []);

  const exec = useCallback(
    (raw) => {
      const input = raw.trim();
      if (!input) return;

      // Echo the command
      push(`${router.name}# ${input}`, "prompt");

      // History
      setHistory((h) => [input, ...h.filter((x) => x !== input)].slice(0, 50));
      setHistIdx(-1);

      const [cmd, ...args] = input.split(/\s+/);

      switch (cmd.toLowerCase()) {
        case "help":
        case "?":
          return execHelp(push);

        case "show":
          return execShow(args, router, routers, push);

        case "hostname":
          return execHostname(args, router, onUpdate, push);

        case "ip":
          return execIp(args, router, onUpdate, push);

        case "no":
          if (args[0] === "shutdown") {
            onUpdate(router.id, { status: "online" });
            push("Interface activée.", "ok");
          } else {
            push(`Commande inconnue: no ${args.join(" ")}`, "err");
          }
          return;

        case "shutdown":
          onUpdate(router.id, { status: "offline" });
          push("Interface désactivée.", "stat");
          return;

        case "ping":
          return execPing(args, router, onPing, push);

        case "clear":
          setLines(bootLines(router));
          return;

        case "exit":
        case "quit":
        case "q":
          onClose();
          return;

        default:
          push(`Commande introuvable: ${cmd}. Tapez 'help'.`, "err");
      }
    },
    [router, routers, onUpdate, onPing, onClose, push]
  );

  return { lines, history, histIdx, setHistIdx, exec, push };
}

// ── Boot banner ──────────────────────────────────────────────────────────────
function bootLines(router) {
  return [
    { text: "────────────────────────────────────────────────", cls: "dim" },
    { text: ` ${router.name} — Console de configuration`, cls: "header" },
    { text: `  Interface: ${router.interface}   Status: ${router.status}`, cls: "info" },
    { text: "────────────────────────────────────────────────", cls: "dim" },
    { text: "  Tapez 'help' pour la liste des commandes.", cls: "dim" },
    { text: "", cls: "" },
  ];
}

// ── Command handlers ─────────────────────────────────────────────────────────
function execHelp(push) {
  const cmds = [
    ["help",                         "Afficher cette aide"],
    ["show [ip|config|interfaces]",  "Informations du routeur"],
    ["hostname <nom>",               "Renommer le routeur"],
    ["ip address <ip> [/prefix]",    "Configurer l'adresse IP"],
    ["ip prefix <longueur>",         "Configurer le masque (ex: 24)"],
    ["no shutdown",                  "Activer l'interface"],
    ["shutdown",                     "Désactiver l'interface"],
    ["ping <ip> [-c N] [-t TTL]",    "Envoyer des paquets ICMP"],
    ["clear",                        "Vider le terminal"],
    ["exit / quit",                  "Fermer cette console"],
  ];
  push("Commandes disponibles:", "info");
  cmds.forEach(([c, d]) => push(`  ${c.padEnd(34)}${d}`, ""));
  push("", "");
}

function execShow(args, router, routers, push) {
  const sub = (args[0] ?? "").toLowerCase();

  if (!sub || sub === "config") {
    const info = subnetInfo(router.ip, router.prefix ?? 24);
    push("Configuration:", "info");
    push(`  Hostname   : ${router.name}`, "");
    push(`  Interface  : ${router.interface}`, "");
    push(`  IP Address : ${router.ip}/${router.prefix ?? 24}`, "ok");
    if (info) {
      push(`  Réseau     : ${info.network}/${info.prefix}`, "");
      push(`  Broadcast  : ${info.broadcast}`, "");
    }
    push(`  Statut     : ${router.status}`, router.status === "online" ? "ok" : "err");
    push("", "");
    return;
  }

  if (sub === "ip") {
    push(`${router.interface}   ${router.ip}/${router.prefix ?? 24}   ${router.status}`, "ok");
    return;
  }

  if (sub === "interfaces") {
    push("Interfaces:", "info");
    push(`  ${router.interface}`, "");
    push(`    IP      : ${router.ip}/${router.prefix ?? 24}`, "ok");
    push(`    Statut  : ${router.status}`, router.status === "online" ? "ok" : "err");
    push("", "");
    return;
  }

  if (sub === "arp" || sub === "neighbors") {
    const peers = Object.values(routers).filter((r) => r.id !== router.id);
    if (!peers.length) { push("Table ARP vide.", "dim"); return; }
    push("Table ARP:", "info");
    peers.forEach((r) =>
      push(`  ${r.ip.padEnd(18)} ${r.interface}   ${r.name}`, "")
    );
    push("", "");
    return;
  }

  push(`Option inconnue: show ${sub}. Essayez: config, ip, interfaces, arp`, "err");
}

function execHostname(args, router, onUpdate, push) {
  if (!args[0]) { push("Usage: hostname <nom>", "err"); return; }
  const name = args.join(" ").slice(0, 32);
  onUpdate(router.id, { name });
  push(`Hostname modifié → ${name}`, "ok");
}

function execIp(args, router, onUpdate, push) {
  const sub = (args[0] ?? "").toLowerCase();

  if (sub === "address") {
    const raw = args[1] ?? "";
    // Support "ip address 192.168.1.5/24" or "ip address 192.168.1.5 24"
    let ip = raw, prefix = router.prefix ?? 24;
    if (raw.includes("/")) {
      [ip, ] = raw.split("/");
      prefix = parsePrefixLength(raw.split("/")[1]);
    } else if (args[2]) {
      prefix = parsePrefixLength(args[2]);
    }

    if (!isValidIp(ip)) {
      push(`Adresse IP invalide: ${ip}`, "err");
      return;
    }
    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      push(`Préfixe invalide: ${prefix}`, "err");
      return;
    }
    onUpdate(router.id, { ip, prefix });
    const info = subnetInfo(ip, prefix);
    push(`IP configurée → ${ip}/${prefix}`, "ok");
    if (info) push(`Réseau: ${info.cidr}  Broadcast: ${info.broadcast}`, "info");
    return;
  }

  if (sub === "prefix") {
    const len = parsePrefixLength(args[1]);
    if (isNaN(len) || len < 0 || len > 32) {
      push(`Préfixe invalide. Valeur entre 0 et 32.`, "err");
      return;
    }
    onUpdate(router.id, { prefix: len });
    push(`Masque configuré → /${len}`, "ok");
    return;
  }

  push(`Usage: ip address <ip>[/prefix]  |  ip prefix <len>`, "err");
}

function execPing(args, router, onPing, push) {
  if (!args[0]) { push("Usage: ping <ip|router-id> [-c N] [-t TTL]", "err"); return; }

  const dstIp = args[0];
  let count = 4, ttl = 64;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "-c" && args[i + 1]) { count = parseInt(args[++i]) || 4; }
    if (args[i] === "-t" && args[i + 1]) { ttl   = parseInt(args[++i]) || 64; }
    if (args[i] === "-n" && args[i + 1]) { count = parseInt(args[++i]) || 4; }
  }

  count = Math.max(1, Math.min(10, count));
  ttl   = Math.max(1, Math.min(255, ttl));

  onPing({ srcId: router.id, dstIp, count, ttl, onLog: push });
}
