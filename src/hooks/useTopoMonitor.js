/**
 * useTopoMonitor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Monitor global de topologie.
 * Remplace useTerminal — ne sert plus de terminal de ping mais de journal
 * temps-réel de TOUS les événements du board :
 *
 *   • Ajout / suppression de device
 *   • Déplacement (regroupé, non spammé)
 *   • Câblage / découplage de liens
 *   • Tentative de connexion refusée (avec la raison)
 *   • Changement de statut d'interface (up/down)
 *   • Changement de configuration IP
 *   • Ping : démarrage, résultats paquet par paquet, statistiques
 *   • Événements LED (tx/rx)
 *   • Changement de hostname
 *
 * API retournée :
 *   logs          [{ text, cls, ts }]
 *   monitorRef    ref pour auto-scroll
 *   emit(event)   méthode d'émission centralisée
 *   clearMonitor  vider les logs
 *
 * Types d'événement supportés (event.type) :
 *   "device:add"          { device }
 *   "device:remove"       { device }
 *   "device:move"         { device }         (debounced en interne)
 *   "device:status"       { device, old, status }
 *   "device:rename"       { device, old, name }
 *   "link:add"            { link, fromDev, toDev, fromIface, toIface }
 *   "link:remove"         { link, fromDev, toDev }
 *   "link:reject"         { fromDev, fromIface, toDev, toIface, reason }
 *   "iface:up"            { device, iface }
 *   "iface:down"          { device, iface }
 *   "iface:ip"            { device, iface, ip, prefix }
 *   "iface:ip:remove"     { device, iface }
 *   "ping:start"          { src, dst, dstIp, count, ttl }
 *   "ping:reply"          { seq, ms, dstIp }
 *   "ping:timeout"        { seq }
 *   "ping:stats"          { sent, recv, loss, min, avg, max }
 *   "ping:error"          { reason }
 *   "led"                 { deviceId, state }   (optionnel, silencieux)
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ── Couleur par device type ────────────────────────────────────────────────────
const TYPE_LABEL = { router: "Router", switch: "Switch", pc: "PC" };

function devLabel(dev) {
  if (!dev) return "?";
  return `${dev.name}`;
}

// ── Formateur de timestamp ─────────────────────────────────────────────────────
function ts() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, "0"))
    .join(":");
}

// ── Classe CSS par catégorie ───────────────────────────────────────────────────
const EVT_CLS = {
  "device:add":      "ok",
  "device:remove":   "err",
  "device:move":     "dim",
  "device:status":   "stat",
  "device:rename":   "info",
  "link:add":        "ok",
  "link:remove":     "stat",
  "link:reject":     "err",
  "iface:up":        "ok",
  "iface:down":      "stat",
  "iface:ip":        "info",
  "iface:ip:remove": "dim",
  "ping:start":      "cmd",
  "ping:reply":      "ok",
  "ping:timeout":    "err",
  "ping:stats":      "stat",
  "ping:error":      "err",
};

// ── Formateur d'événements → texte ────────────────────────────────────────────

function formatEvent(event) {
  const { type } = event;
  const t = ts();

  switch (type) {
    case "device:add":
      return [{
        text: `[${t}] + ${devLabel(event.device)} ajouté  (${TYPE_LABEL[event.device.type] ?? event.device.type})`,
        cls: "ok",
      }];

    case "device:remove":
      return [{
        text: `[${t}] ✕ ${devLabel(event.device)} supprimé`,
        cls: "err",
      }];

    case "device:move":
      // Silencieux sauf premier déplacement — géré par debounce externe
      return [{
        text: `[${t}] ↕ ${devLabel(event.device)} déplacé → (${Math.round(event.device.x)}, ${Math.round(event.device.y)})`,
        cls: "dim",
      }];

    case "device:status": {
      const up = event.status === "online";
      return [{
        text: `[${t}] ${up ? "▲" : "▼"} ${devLabel(event.device)} → ${event.status.toUpperCase()}`,
        cls: up ? "ok" : "err",
      }];
    }

    case "device:rename":
      return [{
        text: `[${t}] ✎ Rename : ${event.old} → ${event.name}`,
        cls: "info",
      }];

    case "link:add":
      return [{
        text: `[${t}] ─── Câble posé :`,
        cls: "ok",
      }, {
        text: `       ${devLabel(event.fromDev)} [${event.fromIface}] ↔ ${devLabel(event.toDev)} [${event.toIface}]`,
        cls: "ok",
      }];

    case "link:remove":
      return [{
        text: `[${t}] ╌╌╌ Câble retiré :`,
        cls: "stat",
      }, {
        text: `       ${devLabel(event.fromDev)} [${event.link?.from?.interface ?? "?"}] ↔ ${devLabel(event.toDev)} [${event.link?.to?.interface ?? "?"}]`,
        cls: "stat",
      }];

    case "link:reject":
      return [{
        text: `[${t}] ✖ CONNEXION REFUSÉE :`,
        cls: "err",
      }, {
        text: `       ${devLabel(event.fromDev)} [${event.fromIface ?? "?"}] → ${devLabel(event.toDev)} [${event.toIface ?? "?"}]`,
        cls: "err",
      }, {
        text: `       Raison : ${event.reason}`,
        cls: "err",
      }];

    case "iface:up":
      return [{
        text: `[${t}] ↑ ${devLabel(event.device)} ${event.iface} : UP`,
        cls: "ok",
      }];

    case "iface:down":
      return [{
        text: `[${t}] ↓ ${devLabel(event.device)} ${event.iface} : DOWN`,
        cls: "stat",
      }];

    case "iface:ip":
      return [{
        text: `[${t}] IP ${devLabel(event.device)} ${event.iface} → ${event.ip}/${event.prefix}`,
        cls: "info",
      }];

    case "iface:ip:remove":
      return [{
        text: `[${t}] IP ${devLabel(event.device)} ${event.iface} → supprimée`,
        cls: "dim",
      }];

    case "ping:start":
      return [
        { text: "", cls: "" },
        { text: `[${t}] ▶ PING ${event.dstIp} depuis ${devLabel(event.src)}`, cls: "cmd" },
        { text: `       → ${devLabel(event.dst)}  count=${event.count}  ttl=${event.ttl}`, cls: "cmd" },
        { text: "", cls: "" },
      ];

    case "ping:reply":
      return [{
        text: `       seq=${event.seq}  time=${event.ms} ms  ✓`,
        cls: "ok",
      }];

    case "ping:timeout":
      return [{
        text: `       seq=${event.seq}  délai dépassé  ✗`,
        cls: "err",
      }];

    case "ping:stats": {
      const lines = [
        { text: "", cls: "" },
        { text: `       ${event.sent} envoyés · ${event.recv} reçus · ${event.loss}% perte`, cls: "stat" },
      ];
      if (event.min != null)
        lines.push({ text: `       rtt min/avg/max = ${event.min}/${event.avg}/${event.max} ms`, cls: "stat" });
      lines.push({ text: "", cls: "" });
      return lines;
    }

    case "ping:error":
      return [
        { text: `[${t}] ✖ Ping échoué : ${event.reason}`, cls: "err" },
        { text: "", cls: "" },
      ];

    default:
      return [];
  }
}

// ── Header de boot ─────────────────────────────────────────────────────────────
const BOOT = [
  { text: "╔══════════════════════════════════════════════════╗", cls: "info" },
  { text: "║     TOPOLOGY MONITOR  — Networking Board         ║", cls: "info" },
  { text: "╚══════════════════════════════════════════════════╝", cls: "info" },
  { text: "  Tous les événements réseau sont tracés ici.", cls: "dim" },
  { text: "  Câbles · Interfaces · Pings · Statuts · Config", cls: "dim" },
  { text: "", cls: "" },
];

// ── Hook principal ─────────────────────────────────────────────────────────────

export function useTopoMonitor() {
  const [logs, setLogs] = useState(BOOT);
  const monitorRef      = useRef(null);
  const moveDebounce    = useRef({});   // deviceId → timer

  // Auto-scroll
  useEffect(() => {
    if (monitorRef.current)
      monitorRef.current.scrollTop = monitorRef.current.scrollHeight;
  }, [logs]);

  const push = useCallback((lines) => {
    if (!lines.length) return;
    setLogs(prev => [...prev, ...lines]);
  }, []);

  /**
   * emit(event) — point d'entrée unique pour tous les événements.
   * Les déplacements sont debounced (un log / device toutes les 800 ms).
   */
  const emit = useCallback((event) => {
    if (!event?.type) return;

    // Silencieux : LED events
    if (event.type === "led") return;

    // Debounce des moves
    if (event.type === "device:move") {
      const id = event.device?.id;
      if (!id) return;
      if (moveDebounce.current[id]) clearTimeout(moveDebounce.current[id]);
      moveDebounce.current[id] = setTimeout(() => {
        push(formatEvent(event));
        delete moveDebounce.current[id];
      }, 800);
      return;
    }

    push(formatEvent(event));
  }, [push]);

  const clearMonitor = useCallback(() => {
    setLogs([
      { text: `[${ts()}] ── Monitor effacé ─────────────────────────────`, cls: "info" },
      { text: "", cls: "" },
    ]);
  }, []);

  return { logs, monitorRef, emit, clearMonitor };
}
