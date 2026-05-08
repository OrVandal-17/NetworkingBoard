/**
 * Device catalog — what can be dragged from the sidebar onto the canvas.
 * type: "router" | "switch" | "pc"
 */
export const DEVICE_CATALOG = [
  {
    type: "router",
    label: "Routeur",
    description: "Couche 3 — IP forwarding",
    defaultIp: "192.168.1.",
    defaultPrefix: 24,
  },
  {
    type: "switch",
    label: "Switch L2",
    description: "Couche 2 — MAC switching",
    ports: 8,
  },
  {
    type: "pc",
    label: "PC",
    description: "End device — hôte IP",
    defaultIp: "192.168.1.",
    defaultPrefix: 24,
    defaultGateway: "192.168.1.1",
  },
];

/** Generate a unique device ID */
let _seq = 0;
export function genId(type) {
  return `${type}-${++_seq}`;
}

/** Default device object for a given catalog entry */
export function makeDevice(type, x, y) {
  const id = genId(type);
  const base = {
    id,
    type,
    x,
    y,
    status: "online",
    name: labelFor(type, id),
    interface: "ETH0",
  };

  if (type === "router") {
    return { ...base, ip: "192.168.1.1", prefix: 24 };
  }
  if (type === "switch") {
    return { ...base, ports: 8, vlan: 1 };
  }
  if (type === "pc") {
    return {
      ...base,
      ip: "192.168.1.10",
      prefix: 24,
      gateway: "192.168.1.1",
      mac: randomMac(),
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
