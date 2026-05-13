import { useState, useCallback } from "react";
import { makeDevice, patchInterface } from "../data/devices";
import { validateConnection, getUsedInterfaces } from "./useConnectionManager";

// ── Topologie initiale ────────────────────────────────────────────────────────
const routerA = makeDevice("router", 320, 280);
routerA.name = "Router-A";

const routerB = makeDevice("router", 720, 280);
routerB.name = "Router-B";
// Gi0/0 de B sur un autre sous-réseau pour illustrer les règles réseau
routerB.interfaces[0] = { ...routerB.interfaces[0], ip: "192.168.1.2" };

const INITIAL_DEVICES = {
  [routerA.id]: routerA,
  [routerB.id]: routerB,
};

// Lien initial: Gi0/0 de A ↔ Gi0/0 de B
const initLinkKey = [routerA.id, routerB.id].sort().join("__");
const INITIAL_LINKS = {
  [initLinkKey]: {
    id: initLinkKey,
    from: { deviceId: routerA.id, interface: "Gi0/0" },
    to:   { deviceId: routerB.id, interface: "Gi0/0" },
  },
};

// ── Store ─────────────────────────────────────────────────────────────────────
export function useBoardStore() {
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [links,   setLinks]   = useState(INITIAL_LINKS);
  const [leds,    setLedsMap] = useState({});

  // ── Devices ────────────────────────────────────────────────────────────

  const addDevice = useCallback((type, x, y) => {
    const d = makeDevice(type, x, y);
    setDevices(prev => ({ ...prev, [d.id]: d }));
    return d;
  }, []);

  const updateDevice = useCallback((id, patch) => {
    setDevices(prev =>
      prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev
    );
  }, []);

  /** Met à jour une interface spécifique d'un device */
  const updateInterface = useCallback((deviceId, ifaceName, patch) => {
    setDevices(prev => {
      if (!prev[deviceId]) return prev;
      return {
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          interfaces: patchInterface(prev[deviceId].interfaces ?? [], ifaceName, patch),
        },
      };
    });
  }, []);

  const removeDevice = useCallback((id) => {
    setDevices(prev => { const n = { ...prev }; delete n[id]; return n; });
    setLinks(prev => {
      const n = { ...prev };
      Object.keys(n).forEach(k => {
        if (n[k].from.deviceId === id || n[k].to.deviceId === id) delete n[k];
      });
      return n;
    });
  }, []);

  const moveDevice = useCallback((id, x, y) => {
    updateDevice(id, { x, y });
  }, [updateDevice]);

  // ── Links ──────────────────────────────────────────────────────────────
  // from / to sont { deviceId, interface }
  // addLink retourne { ok, error } pour le monitor

  const addLink = useCallback((fromDeviceId, fromIface, toDeviceId, toIface) => {
    // On valide avec un snapshot des states courants via refs
    let result = { ok: false, error: "Store non initialisé" };

    // Lire les states courants via setters fonctionnels (sans useState ref)
    // On utilise une closure qui capture les valeurs au moment du call
    let currentDevices, currentLinks;
    setDevices(d => { currentDevices = d; return d; });
    setLinks(l => { currentLinks = l; return l; });

    if (!currentDevices || !currentLinks) {
      return { ok: false, error: "Store non disponible" };
    }

    result = validateConnection(currentDevices, currentLinks, fromDeviceId, fromIface, toDeviceId, toIface);
    if (!result.ok) return result;

    const key = [fromDeviceId, toDeviceId].sort().join("__");
    setLinks(prev => ({
      ...prev,
      [key]: {
        id: key,
        from: { deviceId: fromDeviceId, interface: fromIface },
        to:   { deviceId: toDeviceId,   interface: toIface   },
      },
    }));

    // Marquer les interfaces comme liées sur TOUS les types de devices
    setDevices(prev => {
      let next = { ...prev };
      const mark = (dId, iName) => {
        if (next[dId]) {
          next = {
            ...next,
            [dId]: {
              ...next[dId],
              interfaces: patchInterface(next[dId].interfaces, iName, { linked: true }),
            },
          };
        }
      };
      mark(fromDeviceId, fromIface);
      mark(toDeviceId,   toIface);
      return next;
    });

    return { ok: true };
  }, []);

  const removeLink = useCallback((linkId) => {
    setLinks(prev => {
      const link = prev[linkId];
      if (!link) return prev;
      // Démarquer les interfaces sur tous les types de devices
      setDevices(d => {
        let next = { ...d };
        const unmark = (dId, iName) => {
          if (next[dId]) {
            next = {
              ...next,
              [dId]: {
                ...next[dId],
                interfaces: patchInterface(next[dId].interfaces, iName, { linked: false }),
              },
            };
          }
        };
        unmark(link.from.deviceId, link.from.interface);
        unmark(link.to.deviceId,   link.to.interface);
        return next;
      });
      const n = { ...prev }; delete n[linkId]; return n;
    });
  }, []);

  // ── LEDs ───────────────────────────────────────────────────────────────
  const setLed = useCallback((id, state) => {
    setLedsMap(prev => ({ ...prev, [id]: state }));
  }, []);

  return {
    devices, links, leds,
    addDevice, updateDevice, updateInterface,
    removeDevice, moveDevice,
    addLink, removeLink,
    setLed,
  };
}
