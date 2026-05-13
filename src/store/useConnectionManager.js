/**
 * useConnectionManager.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère les règles physiques de câblage entre interfaces.
 *
 * Règles strictes :
 *  1. Une interface ne peut porter qu'UN SEUL lien (1-to-1 physique)
 *  2. Un device ne peut pas avoir plus de liens que ses interfaces disponibles
 *  3. Compatibilité de type : Gi↔Gi, Fa↔Fa, Se↔Se (pas de crossover incohérent)
 *  4. Pas d'auto-connexion (A↔A)
 *  5. Une interface management (Vlan) n'est jamais câblable
 *  6. Les interfaces DOWN peuvent être câblées (elles monteront quand reliées)
 *
 * Exports :
 *   validateConnection(devices, links, fromDevId, fromIface, toDevId, toIface)
 *     → { ok: boolean, error?: string }
 *
 *   getUsedInterfaces(links, deviceId)
 *     → Set<ifaceName>
 *
 *   getAvailableInterfaces(device, links)
 *     → interface[]   (filtre management + déjà câblées)
 *
 *   getPortCompatibility(typeA, typeB)
 *     → { compatible: boolean, reason?: string }
 *
 *   getLinkForInterface(links, deviceId, ifaceName)
 *     → link | undefined
 */

// ── Compatibilité de type d'interface ─────────────────────────────────────────

/**
 * Matrice de compatibilité physique.
 * serial ne peut se connecter qu'à serial (liaison WAN point-à-point).
 * gigabit ↔ fastethernet est techniquement possible (auto-négociation),
 * mais on applique une règle stricte pour la simulation.
 */
const COMPAT = {
  gigabit:      ["gigabit"],
  fastethernet: ["fastethernet", "gigabit"], // Fa peut se brancher sur Gi (downgrade)
  serial:       ["serial"],
  management:   [],  // jamais câblable
};

export function getPortCompatibility(typeA, typeB) {
  if (!typeA || !typeB) return { compatible: false, reason: "Type d'interface inconnu" };
  if (typeA === "management" || typeB === "management")
    return { compatible: false, reason: "Les interfaces de management (Vlan) ne sont pas câblables" };

  const allowed = COMPAT[typeA] ?? [];
  if (!allowed.includes(typeB)) {
    const labels = { gigabit: "GigabitEthernet", fastethernet: "FastEthernet", serial: "Serial" };
    return {
      compatible: false,
      reason: `Incompatibilité de port : ${labels[typeA] ?? typeA} ↔ ${labels[typeB] ?? typeB}. `
             + `Serial ne connecte qu'à Serial ; GigabitEthernet ne connecte qu'à GigabitEthernet.`,
    };
  }
  return { compatible: true };
}

// ── Interfaces utilisées ───────────────────────────────────────────────────────

/**
 * Retourne le Set des noms d'interfaces déjà câblées pour un device.
 */
export function getUsedInterfaces(links, deviceId) {
  const used = new Set();
  Object.values(links).forEach(link => {
    if (link.from.deviceId === deviceId) used.add(link.from.interface);
    if (link.to.deviceId   === deviceId) used.add(link.to.interface);
  });
  return used;
}

/**
 * Retourne le lien associé à une interface spécifique d'un device.
 */
export function getLinkForInterface(links, deviceId, ifaceName) {
  return Object.values(links).find(link =>
    (link.from.deviceId === deviceId && link.from.interface === ifaceName) ||
    (link.to.deviceId   === deviceId && link.to.interface   === ifaceName)
  );
}

/**
 * Retourne les interfaces disponibles pour le câblage :
 *  - exclut les interfaces management (Vlan)
 *  - exclut les interfaces déjà câblées
 */
export function getAvailableInterfaces(device, links) {
  const used = getUsedInterfaces(links, device.id);
  return (device.interfaces ?? []).filter(iface => {
    if (iface.type === "management") return false;
    if (used.has(iface.name))        return false;
    return true;
  });
}

/**
 * Retourne toutes les interfaces câblables (sans filtrer les déjà utilisées),
 * avec leur état linked pour l'affichage.
 */
export function getInterfacesWithLinkState(device, links) {
  const used = getUsedInterfaces(links, device.id);
  return (device.interfaces ?? [])
    .filter(iface => iface.type !== "management")
    .map(iface => ({ ...iface, linked: used.has(iface.name) }));
}

// ── Validation complète d'une connexion ───────────────────────────────────────

/**
 * Valide qu'un câble peut être posé entre deux interfaces.
 * Retourne { ok, error } — error est undefined si ok.
 */
export function validateConnection(devices, links, fromDevId, fromIface, toDevId, toIface) {
  // 1. Existence des devices
  const fromDev = devices[fromDevId];
  const toDev   = devices[toDevId];
  if (!fromDev) return { ok: false, error: `Device source introuvable: ${fromDevId}` };
  if (!toDev)   return { ok: false, error: `Device destination introuvable: ${toDevId}` };

  // 2. Pas d'auto-boucle
  if (fromDevId === toDevId)
    return { ok: false, error: "Auto-connexion impossible : source et destination identiques" };

  // 3. Existence des interfaces
  const fromIfaceObj = (fromDev.interfaces ?? []).find(i => i.name === fromIface);
  const toIfaceObj   = (toDev.interfaces   ?? []).find(i => i.name === toIface);
  if (!fromIfaceObj)
    return { ok: false, error: `Interface ${fromIface} introuvable sur ${fromDev.name}` };
  if (!toIfaceObj)
    return { ok: false, error: `Interface ${toIface} introuvable sur ${toDev.name}` };

  // 4. Pas de management
  if (fromIfaceObj.type === "management")
    return { ok: false, error: `${fromIface} est une interface de management — non câblable` };
  if (toIfaceObj.type === "management")
    return { ok: false, error: `${toIface} est une interface de management — non câblable` };

  // 5. Interface source déjà câblée ?
  const usedFrom = getUsedInterfaces(links, fromDevId);
  if (usedFrom.has(fromIface))
    return {
      ok: false,
      error: `${fromDev.name} ${fromIface} est déjà câblée — une interface = un seul lien physique`,
    };

  // 6. Interface dest déjà câblée ?
  const usedTo = getUsedInterfaces(links, toDevId);
  if (usedTo.has(toIface))
    return {
      ok: false,
      error: `${toDev.name} ${toIface} est déjà câblée — une interface = un seul lien physique`,
    };

  // 7. Capacité : nombre de liens ≤ nombre d'interfaces disponibles
  const maxFrom = (fromDev.interfaces ?? []).filter(i => i.type !== "management").length;
  const maxTo   = (toDev.interfaces   ?? []).filter(i => i.type !== "management").length;
  if (usedFrom.size >= maxFrom)
    return {
      ok: false,
      error: `${fromDev.name} a atteint sa capacité maximale (${maxFrom} interface(s) physique(s))`,
    };
  if (usedTo.size >= maxTo)
    return {
      ok: false,
      error: `${toDev.name} a atteint sa capacité maximale (${maxTo} interface(s) physique(s))`,
    };

  // 8. Compatibilité de type de port
  const compat = getPortCompatibility(fromIfaceObj.type, toIfaceObj.type);
  if (!compat.compatible)
    return { ok: false, error: compat.reason };

  // 9. Lien dupliqué entre les mêmes deux devices sur les mêmes interfaces ?
  const dupKey = [fromDevId, toDevId].sort().join("__");
  if (links[dupKey]) {
    const ex = links[dupKey];
    return {
      ok: false,
      error: `Un lien existe déjà entre ${fromDev.name} et ${toDev.name} `
           + `(${ex.from.interface} ↔ ${ex.to.interface})`,
    };
  }

  return { ok: true };
}
