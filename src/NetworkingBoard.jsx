import { useState, useCallback } from "react";
import { Sidebar }       from "./components/Sidebar/Sidebar";
import { Canvas }        from "./components/Canvas/Canvas";
import { Terminal }      from "./components/Terminal/Terminal";
import { RouterCLI }     from "./components/RouterCLI/RouterCLI";
import { useBoardStore } from "./store/useBoardStore";
import { usePing }       from "./hooks/usePing";
import { useTerminal }   from "./hooks/useTerminal";
import "./styles/global.css";

export default function NetworkingBoard() {
  const {
    devices, links, leds,
    addDevice, updateDevice, removeDevice, moveDevice,
    addLink, removeLink,
    setLed,
  } = useBoardStore();

  const { logs, addLog, clear: clearLogs, termRef } = useTerminal();
  const { running, packet, run } = usePing({ devices, onLed: setLed });

  // Which device CLI is open
  const [cliOpen, setCliOpen] = useState(null);

  // ── Canvas device press handler ─────────────────────────────────────
  const handleDevicePress = useCallback((id) => {
    if (id.startsWith("__delete__")) {
      removeDevice(id.replace("__delete__", ""));
      return;
    }
    setCliOpen(id);
  }, [removeDevice]);

  // ── Ping from CLI ────────────────────────────────────────────────────
  const handleCliPing = useCallback(
    ({ srcId, dstIp, count, ttl, onLog }) => {
      run({ srcId, dstIp, count, ttl, onLog });
    },
    [run]
  );

  const deviceCount  = Object.keys(devices).length;
  const linkCount    = Object.keys(links).length;
  const onlineCount  = Object.values(devices).filter(d => d.status === "online").length;

  return (
    <div className="app">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="app__topbar">
        <div className="app__topbar-dot"/>
        <span className="app__topbar-title">Networking Board</span>
        <span className="app__topbar-sep">|</span>
        <span style={{ fontSize: 10, color: "#2a4a60", fontFamily: "JetBrains Mono, monospace" }}>
          Simulation ICMP
        </span>
        <div className="app__topbar-right">
          <span className="app__topbar-badge">{deviceCount} devices</span>
          <span className="app__topbar-badge">{linkCount} liens</span>
          <span className="app__topbar-badge" style={{ color: onlineCount === deviceCount && deviceCount > 0 ? "#1D9E75" : "#3a5060" }}>
            {onlineCount}/{deviceCount} online
          </span>
        </div>
      </header>

      {/* ── Main body ───────────────────────────────────────────────── */}
      <div className="app__body">
        {/* Sidebar */}
        <Sidebar devices={devices} onDevicePress={handleDevicePress}/>

        {/* Center: canvas + terminal */}
        <div className="app__center">
          <Canvas
            devices={devices}
            links={links}
            leds={leds}
            packet={packet}
            onAddDevice={addDevice}
            onMoveDevice={moveDevice}
            onAddLink={addLink}
            onRemoveLink={removeLink}
            onDevicePress={handleDevicePress}
          />

          {/* Bottom terminal */}
          <div className="app__terminal">
            <div className="app__terminal-header">
              <span className="app__terminal-title">Terminal réseau</span>
              {running && (
                <span style={{
                  fontSize: 9, color: "#378ADD",
                  fontFamily: "JetBrains Mono, monospace",
                  animation: "pulse 1s infinite",
                }}>
                  ● ping en cours
                </span>
              )}
              <button className="app__terminal-clear" onClick={clearLogs}>effacer</button>
            </div>
            <Terminal logs={logs} running={running} termRef={termRef}/>
          </div>
        </div>
      </div>

      {/* ── Per-device CLI modal ─────────────────────────────────────── */}
      {cliOpen && devices[cliOpen] && (
        <RouterCLI
          device={devices[cliOpen]}
          devices={devices}
          onUpdate={updateDevice}
          onPing={handleCliPing}
          onClose={() => setCliOpen(null)}
        />
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
