/**
 * network.js — IP/subnet helpers + routing multi-interface
 */

export function parseIp(ip) {
  return ip.trim().split(".").map(Number);
}

export function isValidIp(ip) {
  if (!ip) return false;
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every(p => { const n = Number(p); return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p; });
}

export function parsePrefixLength(mask) {
  if (!mask) return 24;
  const s = String(mask).trim();
  if (s.startsWith("/")) return parseInt(s.slice(1));
  if (!s.includes(".")) return parseInt(s);
  return s.split(".").reduce((acc, oct) => {
    let bits = parseInt(oct), count = 0;
    while (bits) { count += bits & 1; bits >>= 1; }
    return acc + count;
  }, 0);
}

function prefixToMask(prefix) {
  return Array.from({ length: 4 }, (_, i) => {
    const bits = Math.min(8, Math.max(0, prefix - i * 8));
    return 256 - Math.pow(2, 8 - bits);
  });
}

export function networkAddress(ip, prefix) {
  const parts = parseIp(ip);
  const mask  = prefixToMask(prefix);
  return parts.map((o, i) => o & mask[i]).join(".");
}

export function broadcastAddress(ip, prefix) {
  const parts = parseIp(ip);
  const mask  = prefixToMask(prefix);
  return parts.map((o, i) => (o & mask[i]) | (~mask[i] & 0xff)).join(".");
}

export function isSameSubnet(ipA, ipB, prefix = 24) {
  return networkAddress(ipA, prefix) === networkAddress(ipB, prefix);
}

export function subnetInfo(ip, prefix) {
  if (!isValidIp(ip)) return null;
  return {
    network:   networkAddress(ip, prefix),
    broadcast: broadcastAddress(ip, prefix),
    prefix,
    cidr:      `${networkAddress(ip, prefix)}/${prefix}`,
  };
}

// ── Multi-interface routing ───────────────────────────────────────────────────

/**
 * Cherche l'interface UP du device dont le réseau englobe dstIp.
 * Retourne l'objet interface ou null (= no route to host).
 */
export function findSourceInterface(device, dstIp) {
  if (!device.interfaces) return null;
  return device.interfaces.find(
    iface => iface.ip && iface.status === "up" && isSameSubnet(iface.ip, dstIp, iface.prefix)
  ) ?? null;
}

/**
 * Validation de route multi-interface.
 * Cherche automatiquement la bonne interface source.
 * Retourne { ok, reason, srcIface, dstIface }
 */
export function validateRoute(srcDevice, dstDevice, dstIp) {
  if (srcDevice.status !== "online")
    return { ok: false, reason: `${srcDevice.name} est hors ligne` };
  if (dstDevice.status !== "online")
    return { ok: false, reason: `${dstDevice.name} est hors ligne` };

  // Trouver l'interface source qui peut joindre dstIp
  const srcIface = findSourceInterface(srcDevice, dstIp);
  if (!srcIface) {
    // Lister les réseaux disponibles pour un message utile
    const nets = (srcDevice.interfaces ?? [])
      .filter(i => i.ip && i.status === "up")
      .map(i => `${networkAddress(i.ip, i.prefix)}/${i.prefix}`)
      .join(", ");
    const hint = nets ? `Réseaux disponibles: ${nets}` : "Aucune interface up avec une IP";
    return {
      ok: false,
      reason: `Réseau inaccessible — ${dstIp} hors de portée. ${hint}. Aucune route par défaut.`,
    };
  }

  // Trouver l'interface destination qui possède dstIp
  const dstIface = (dstDevice.interfaces ?? []).find(i => i.ip === dstIp);
  if (!dstIface)
    return { ok: false, reason: `${dstIp} n'est configurée sur aucune interface de ${dstDevice.name}` };

  if (dstIface.status !== "up")
    return { ok: false, reason: `Interface ${dstIface.name} sur ${dstDevice.name} est DOWN` };

  if (srcIface.ip === dstIp)
    return { ok: false, reason: `Conflit d'adresse IP: ${dstIp}` };

  return { ok: true, reason: null, srcIface, dstIface };
}
