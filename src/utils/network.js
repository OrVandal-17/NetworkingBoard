/**
 * network.js
 * IP / subnet helpers + routing rules for the simulation.
 */

/** Parse "192.168.1.5" → [192, 168, 1, 5] */
export function parseIp(ip) {
  return ip.trim().split(".").map(Number);
}

/** Validate IPv4 format */
export function isValidIp(ip) {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

/** Parse CIDR prefix length from mask or prefix string ("24" | "/24" | "255.255.255.0") */
export function parsePrefixLength(mask) {
  if (!mask) return 24;
  const s = String(mask).trim();
  if (s.startsWith("/")) return parseInt(s.slice(1));
  if (!s.includes(".")) return parseInt(s);
  // dotted mask → prefix length
  return s.split(".").reduce((acc, oct) => {
    let bits = parseInt(oct);
    let count = 0;
    while (bits) { count += bits & 1; bits >>= 1; }
    return acc + count;
  }, 0);
}

/** Convert IP + prefix to network address */
export function networkAddress(ip, prefix) {
  const parts = parseIp(ip);
  const mask = prefixToMask(prefix);
  return parts.map((o, i) => o & mask[i]).join(".");
}

/** Convert prefix length to 4-octet mask array */
function prefixToMask(prefix) {
  const mask = [];
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, prefix - i * 8));
    mask.push(256 - Math.pow(2, 8 - bits));
  }
  return mask;
}

/** Broadcast address for a subnet */
export function broadcastAddress(ip, prefix) {
  const parts = parseIp(ip);
  const mask  = prefixToMask(prefix);
  return parts.map((o, i) => (o & mask[i]) | (~mask[i] & 0xff)).join(".");
}

/**
 * Check whether two IPs are on the same subnet.
 * Uses the src router's prefix.
 */
export function isSameSubnet(ipA, ipB, prefix = 24) {
  const netA = networkAddress(ipA, prefix);
  const netB = networkAddress(ipB, prefix);
  return netA === netB;
}

/**
 * Full routing validation between two routers.
 * Returns { ok: boolean, reason: string | null }
 */
export function validateRoute(srcRouter, dstRouter) {
  const srcPrefix = srcRouter.prefix ?? 24;

  if (!isValidIp(srcRouter.ip)) {
    return { ok: false, reason: `IP source invalide: ${srcRouter.ip}` };
  }
  if (!isValidIp(dstRouter.ip)) {
    return { ok: false, reason: `IP destination invalide: ${dstRouter.ip}` };
  }
  if (srcRouter.status !== "online") {
    return { ok: false, reason: `${srcRouter.name} est hors ligne` };
  }
  if (dstRouter.status !== "online") {
    return { ok: false, reason: `${dstRouter.name} est hors ligne` };
  }
  if (!isSameSubnet(srcRouter.ip, dstRouter.ip, srcPrefix)) {
    const net = networkAddress(srcRouter.ip, srcPrefix);
    return {
      ok: false,
      reason: `Réseau inaccessible — ${dstRouter.ip} hors du sous-réseau ${net}/${srcPrefix}. Aucune route par défaut configurée.`,
    };
  }
  if (srcRouter.ip === dstRouter.ip) {
    return { ok: false, reason: `Conflit d'adresse IP: ${srcRouter.ip}` };
  }
  return { ok: true, reason: null };
}

/** Format subnet info for display */
export function subnetInfo(ip, prefix) {
  if (!isValidIp(ip)) return null;
  return {
    network:   networkAddress(ip, prefix),
    broadcast: broadcastAddress(ip, prefix),
    prefix,
    cidr:      `${networkAddress(ip, prefix)}/${prefix}`,
  };
}
