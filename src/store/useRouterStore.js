import { useState, useCallback } from "react";
import { INITIAL_ROUTERS } from "../data/routers";

export function useRouterStore() {
  const [routers, setRouters] = useState(INITIAL_ROUTERS);

  const updateRouter = useCallback((id, patch) => {
    setRouters((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }, []);

  const setLed = useCallback((id, ledState) => {
    updateRouter(id, { led: ledState });
  }, [updateRouter]);

  const toggleStatus = useCallback((id) => {
    setRouters((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        status: prev[id].status === "online" ? "offline" : "online",
      },
    }));
  }, []);

  const renameRouter = useCallback((id, name) => {
    updateRouter(id, { name });
  }, [updateRouter]);

  const setIp = useCallback((id, ip) => {
    updateRouter(id, { ip });
  }, [updateRouter]);

  const setPrefix = useCallback((id, prefix) => {
    updateRouter(id, { prefix: parseInt(prefix) });
  }, [updateRouter]);

  return {
    routers,
    updateRouter,
    setLed,
    toggleStatus,
    renameRouter,
    setIp,
    setPrefix,
  };
}
