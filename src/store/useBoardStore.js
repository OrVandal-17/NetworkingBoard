/**
 * useBoardStore
 * Unified state for ALL devices and links on the canvas.
 * Replaces the old useRouterStore.
 */
import { useState, useCallback } from "react";
import { makeDevice } from "../data/devices";

// ── initial topology ─────────────────────────────────────────────────────────
const routerA = makeDevice("router", 300, 280);
routerA.name = "Router-A"; routerA.ip = "192.168.1.1";

const routerB = makeDevice("router", 700, 280);
routerB.name = "Router-B"; routerB.ip = "192.168.1.2";

const INITIAL_DEVICES = {
  [routerA.id]: routerA,
  [routerB.id]: routerB,
};

const INITIAL_LINKS = {
  [`${routerA.id}__${routerB.id}`]: {
    id: `${routerA.id}__${routerB.id}`,
    from: routerA.id,
    to: routerB.id,
  },
};

// ── store ────────────────────────────────────────────────────────────────────
export function useBoardStore() {
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [links,   setLinks]   = useState(INITIAL_LINKS);
  const [leds,    setLedsMap] = useState({});

  // ── device CRUD ─────────────────────────────────────────────────────────
  const addDevice = useCallback((type, x, y) => {
    const d = makeDevice(type, x, y);
    setDevices((prev) => ({ ...prev, [d.id]: d }));
    return d;
  }, []);

  const updateDevice = useCallback((id, patch) => {
    setDevices((prev) =>
      prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev
    );
  }, []);

  const removeDevice = useCallback((id) => {
    setDevices((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // remove all links involving this device
    setLinks((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k].from === id || next[k].to === id) delete next[k];
      });
      return next;
    });
  }, []);

  const moveDevice = useCallback((id, x, y) => {
    updateDevice(id, { x, y });
  }, [updateDevice]);

  // ── link CRUD ────────────────────────────────────────────────────────────
  const addLink = useCallback((fromId, toId) => {
    const key = [fromId, toId].sort().join("__");
    setLinks((prev) => ({
      ...prev,
      [key]: { id: key, from: fromId, to: toId },
    }));
  }, []);

  const removeLink = useCallback((linkId) => {
    setLinks((prev) => {
      const next = { ...prev };
      delete next[linkId];
      return next;
    });
  }, []);

  const hasLink = useCallback(
    (fromId, toId) => {
      const key = [fromId, toId].sort().join("__");
      return !!links[key];
    },
    [links]
  );

  // ── LED states ───────────────────────────────────────────────────────────
  const setLed = useCallback((id, state) => {
    setLedsMap((prev) => ({ ...prev, [id]: state }));
  }, []);

  return {
    devices,
    links,
    leds,
    addDevice,
    updateDevice,
    removeDevice,
    moveDevice,
    addLink,
    removeLink,
    hasLink,
    setLed,
  };
}
