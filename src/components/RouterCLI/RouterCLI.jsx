import { useRef, useEffect, useState, useCallback } from "react";
import "./RouterCLI.css";
import { useRouterCLI } from "./useRouterCLI";

/**
 * RouterCLI
 * Modal CLI terminal for per-device configuration.
 *
 * Props:
 *   device    - the device being configured
 *   routers   - full routers map (for ARP / neighbor display)
 *   onUpdate  - (id, patch) => void  — from useRouterStore.updateRouter
 *   onPing    - ({ srcId, dstIp, count, ttl, onLog }) => void — from usePing.run
 *   onClose   - () => void
 */
export function RouterCLI({ device, devices, onUpdate, onPing, onClose }) {
  const outputRef = useRef(null);
  const inputRef  = useRef(null);
  const [input, setInput] = useState("");

  const { lines, history, histIdx, setHistIdx, exec } = useRouterCLI({
    device, devices, onUpdate, onPing, onClose,
  });

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current)
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        exec(input);
        setInput("");
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.min(histIdx + 1, history.length - 1);
        setHistIdx(next);
        setInput(history[next] ?? "");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = histIdx - 1;
        if (next < 0) { setHistIdx(-1); setInput(""); return; }
        setHistIdx(next);
        setInput(history[next] ?? "");
        return;
      }
      // Tab completion (basic)
      if (e.key === "Tab") {
        e.preventDefault();
        const CMDS = ["help", "show", "hostname", "ip address", "ip prefix",
                      "no shutdown", "shutdown", "ping", "clear", "exit"];
        const match = CMDS.find((c) => c.startsWith(input));
        if (match) setInput(match + " ");
      }
    },
    [input, exec, history, histIdx, setHistIdx]
  );

  const offline = device.status !== "online";

  return (
    <div className="rcli-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rcli-window">

        {/* Title bar */}
        <div className="rcli-titlebar">
          <div className="rcli-titlebar__dots">
            <div className="rcli-dot rcli-dot--close" onClick={onClose} title="Fermer" />
            <div className="rcli-dot rcli-dot--min" />
            <div className="rcli-dot rcli-dot--max" />
          </div>
          <span className="rcli-titlebar__title">
            {device.name} — {device.ip ? `${device.ip}/${device.prefix ?? 24}` : "L2"} — {device.interface ?? "ETH0"}
          </span>
          <span className={`rcli-titlebar__badge${offline ? " rcli-titlebar__badge--offline" : ""}`}>
            {offline ? "OFFLINE" : "ONLINE"}
          </span>
        </div>

        {/* Output */}
        <div className="rcli-output" ref={outputRef}>
          {lines.map((line, i) => (
            <div
              key={i}
              className={`rcli-line${line.cls ? ` rcli-line--${line.cls}` : ""}`}
            >
              {line.text || "\u00a0"}
            </div>
          ))}
        </div>

        {/* Input row */}
        <div className="rcli-inputrow" onClick={() => inputRef.current?.focus()}>
          <span className="rcli-inputrow__prompt">
            {device.name}#
          </span>
          <input
            ref={inputRef}
            className="rcli-inputrow__field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="help"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />
        </div>

      </div>
    </div>
  );
}
