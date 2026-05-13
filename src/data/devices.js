/**
 * Device catalog + factory
 * Chaque device possède un tableau `interfaces[]` au lieu d'un seul champ `interface`.
 */

export const DEVICE_CATALOG = [
  { type: "router", label: "Routeur",   description: "Couche 3 — IP forwarding" },
  { type: "switch", label: "Switch L2", description: "Couche 2 — MAC switching"  },
  { type: "pc",     label: "PC",        description: "End device — hôte IP"       },
];

let _seq = 0;
export function genId(type) { return `${type}-${++_seq}`; }

// ── Interface templates ───────────────────────────────────────────────────────

function makeGi(slot, ip = null, prefix = 24, status = "down") {
  return { name: `Gi0/${slot}`, type: "gigabit", ip, prefix, status, mac: randomMac() };
}

function makeFa(slot, ip = null, prefix = 24, status = "down") {
  return { name: `Fa0/${slot}`, type: "fastethernet", ip, prefix, status, mac: randomMac() };
}

function makeSe(slot, ip = null, prefix = 30, status = "down") {
  return { name: `Se0/${slot}`, type: "serial", ip, prefix, status, mac: null };
}

function makeSwitchPort(slot) {
  return { name: `Fa0/${slot}`, type: "fastethernet", status: "up", linked: false };
}

function makeVlan(id = 1, ip = null, prefix = 24) {
  return { name: `Vlan${id}`, type: "management", ip, prefix, status: "up" };
}

// ── Device factory ────────────────────────────────────────────────────────────

export function makeDevice(type, x, y) {
  const id   = genId(type);
  const name = labelFor(type, id);

  const base = { id, type, x, y, status: "online", name };

  if (type === "router") {
    return {
      ...base,
      interfaces: [
        makeGi(0, "192.168.1.1", 24, "up"),   // Gi0/0 up par défaut
        makeGi(1, null, 24, "down"),
        makeGi(2, null, 24, "down"),
        makeSe(0, null, 30, "down"),
      ],
    };
  }

  if (type === "switch") {
    return {
      ...base,
      vlan: 1,
      interfaces: [
        makeVlan(1),                          // interface de management
        ...Array.from({ length: 8 }, (_, i) => makeSwitchPort(i + 1)),
      ],
    };
  }

  if (type === "pc") {
    return {
      ...base,
      gateway: "192.168.1.1",
      mac: randomMac(),
      interfaces: [
        makeFa(0, "192.168.1.10", 24, "up"),  // une seule NIC
      ],
    };
  }

  return base;
}

function labelFor(type, id) {
  const n = id.split("-")[1];
  if (type === "router") return `Router-${n}`;
  if (type === "switch") return `Switch-${n}`;
  if (type === "pc")     return `PC-${n}`;
  return id;
}

function randomMac() {
  return Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join(":");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retourne la liste des interfaces IP configurées (ip != null) */
export function ipInterfaces(device) {
  return (device.interfaces ?? []).filter(i => i.ip);
}

/** Première interface up avec une IP */
export function primaryIp(device) {
  const iface = (device.interfaces ?? []).find(i => i.ip && i.status === "up");
  return iface ? { ip: iface.ip, prefix: iface.prefix, iface } : null;
}

/** Trouve l'interface correspondant au nom donné */
export function findInterface(device, name) {
  return (device.interfaces ?? []).find(i => i.name === name) ?? null;
}

/** Met à jour une interface par nom, retourne le nouveau tableau */
export function patchInterface(interfaces, name, patch) {
  return interfaces.map(i => i.name === name ? { ...i, ...patch } : i);
}
