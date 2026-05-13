import { useRef, useEffect, useState, useCallback } from "react";
import "./RouterCLI.css";
import { useRouterCLI } from "./useRouterCLI";

export function RouterCLI({ device, devices, onUpdate, onPing, onClose }) {
  const outputRef = useRef(null);
  const inputRef  = useRef(null);
  const [input, setInput] = useState("");

  const { lines, history, histIdx, setHistIdx, exec, cliMode, activeIf } = useRouterCLI({
    device, devices, onUpdate, onPing, onClose,
  });

  useEffect(() => {
    if (outputRef.current)
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const h = e => { if (e.key === "Escape" && cliMode === "normal") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, cliMode]);

  const CMDS_NORMAL = ["help","show interfaces","show config","show arp","show ip",
    "interface","hostname","ping","gateway","mac","no shutdown","shutdown","clear","exit"];
  const CMDS_IF = ["ip address","no ip address","no shutdown","shutdown","description","show","exit","end"];

  const handleKeyDown = useCallback(e => {
    if (e.key === "Enter") { exec(input); setInput(""); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx+1, history.length-1);
      setHistIdx(next); setInput(history[next] ?? "");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx-1;
      if (next < 0) { setHistIdx(-1); setInput(""); return; }
      setHistIdx(next); setInput(history[next] ?? "");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const cmds = cliMode === "config-if" ? CMDS_IF : CMDS_NORMAL;
      const match = cmds.find(c => c.startsWith(input) && c !== input);
      if (match) setInput(match + " ");
    }
  }, [input, exec, history, histIdx, setHistIdx, cliMode]);

  const offline = device.status !== "online";
  const promptLabel = cliMode === "config-if"
    ? `${device.name}(config-if[${activeIf}])#`
    : `${device.name}#`;

  const typeColor = { router:"#378ADD", switch:"#1D9E75", pc:"#d2a8ff" }[device.type] ?? "#555";

  return (
    <div className="rcli-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rcli-window">

        {/* Title bar */}
        <div className="rcli-titlebar">
          <div className="rcli-titlebar__dots">
            <div className="rcli-dot rcli-dot--close" onClick={onClose}/>
            <div className="rcli-dot rcli-dot--min"/>
            <div className="rcli-dot rcli-dot--max"/>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, margin:"0 auto" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:typeColor, display:"inline-block", boxShadow:`0 0 5px ${typeColor}` }}/>
            <span className="rcli-titlebar__title">
              {device.name}
              {cliMode === "config-if" && <span style={{ color:"#378ADD" }}> › {activeIf}</span>}
            </span>
          </div>
          <span className={`rcli-titlebar__badge${offline?" rcli-titlebar__badge--offline":""}`}>
            {offline ? "OFFLINE" : "ONLINE"}
          </span>
        </div>

        {/* Mode indicator */}
        {cliMode === "config-if" && (
          <div style={{
            padding:"3px 16px", background:"#050e18",
            borderBottom:"1px solid #0f1e2a",
            fontFamily:"JetBrains Mono,monospace", fontSize:9,
            color:"#1a4a70", letterSpacing:".1em",
          }}>
            MODE CONFIG-IF › {activeIf} — tapez 'exit' pour revenir
          </div>
        )}

        {/* Output */}
        <div className="rcli-output" ref={outputRef}>
          {lines.map((line, i) => (
            <div key={i} className={`rcli-line${line.cls ? ` rcli-line--${line.cls}` : ""}`}>
              {line.text || "\u00a0"}
            </div>
          ))}
        </div>

        {/* Input row */}
        <div className="rcli-inputrow" onClick={() => inputRef.current?.focus()}>
          <span className="rcli-inputrow__prompt">{promptLabel}</span>
          <input
            ref={inputRef}
            className="rcli-inputrow__field"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={cliMode === "config-if" ? "ip address / no shutdown / exit" : "help"}
            spellCheck={false} autoComplete="off" autoCorrect="off"
          />
        </div>

      </div>
    </div>
  );
}
