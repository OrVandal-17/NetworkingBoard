import { useState, useRef, useEffect, useCallback } from "react";

const BOOT_LOGS = [
  { text: "── Networking Board v1.0 ──────────────────────────", cls: "info" },
  { text: "   Router A: 192.168.1.1  ←→  Router B: 192.168.1.2", cls: "info" },
  { text: "" },
  { text: "Configurez les options puis lancez un ping.", cls: "dim" },
];

export function useTerminal() {
  const [logs, setLogs]   = useState(BOOT_LOGS);
  const termRef           = useRef(null);

  useEffect(() => {
    if (termRef.current)
      termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  const addLog = useCallback((text, cls = "") => {
    setLogs((prev) => [...prev, { text, cls }]);
  }, []);

  const clear = useCallback(() => {
    setLogs([{ text: "── Terminal effacé ─────────────────────────────────", cls: "info" }]);
  }, []);

  return { logs, addLog, clear, termRef };
}
