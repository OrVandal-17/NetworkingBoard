import { useState, useCallback } from "react";
import { Sidebar }            from "./components/Sidebar/Sidebar";
import { Canvas }             from "./components/Canvas/Canvas";
import { Terminal }           from "./components/Terminal/Terminal";
import { RouterCLI }          from "./components/RouterCLI/RouterCLI";
import { useBoardStore }      from "./store/useBoardStore";
import { usePing }            from "./hooks/usePing";
import { useTopoMonitor }     from "./hooks/useTopoMonitor";
import "./styles/global.css";

export default function NetworkingBoard() {
  const {
    devices, links, leds,
    addDevice, updateDevice, updateInterface,
    removeDevice, moveDevice,
    addLink, removeLink,
    setLed,
  } = useBoardStore();

  const { logs, monitorRef, emit, clearMonitor } = useTopoMonitor();
  const { running, packet, run } = usePing({ devices, onLed: setLed });
  const [cliOpen, setCliOpen] = useState(null);

  // ── Handlers device ────────────────────────────────────────────────────
  const handleAddDevice = useCallback((type, x, y) => {
    const device = addDevice(type, x, y);
    emit({ type: "device:add", device });
    return device;
  }, [addDevice, emit]);

  const handleMoveDevice = useCallback((id, x, y) => {
    moveDevice(id, x, y);
    emit({ type: "device:move", device: { ...devices[id], x, y } });
  }, [moveDevice, devices, emit]);

  const handleDevicePress = useCallback(id => {
    if (id.startsWith("__delete__")) {
      const realId = id.replace("__delete__", "");
      const device = devices[realId];
      removeDevice(realId);
      if (device) emit({ type: "device:remove", device });
      return;
    }
    setCliOpen(id);
  }, [removeDevice, devices, emit]);

  // ── Handler update (depuis RouterCLI) ─────────────────────────────────
  const handleUpdate = useCallback((id, patch) => {
    const device = devices[id];
    if (!device) return;

    if (patch.interfaces) {
      const oldIfaces = device.interfaces ?? [];
      patch.interfaces.forEach(newIf => {
        const oldIf = oldIfaces.find(i => i.name === newIf.name);
        if (!oldIf) return;
        if (oldIf.status !== newIf.status) {
          emit({ type: newIf.status === "up" ? "iface:up" : "iface:down", device, iface: newIf.name });
        }
        if (oldIf.ip !== newIf.ip) {
          if (newIf.ip) emit({ type: "iface:ip", device, iface: newIf.name, ip: newIf.ip, prefix: newIf.prefix });
          else emit({ type: "iface:ip:remove", device, iface: newIf.name });
        }
      });
      updateDevice(id, { interfaces: patch.interfaces });
    } else {
      if (patch.status && patch.status !== device.status)
        emit({ type: "device:status", device, old: device.status, status: patch.status });
      if (patch.name && patch.name !== device.name)
        emit({ type: "device:rename", device, old: device.name, name: patch.name });
      updateDevice(id, patch);
    }
  }, [updateDevice, devices, emit]);

  // ── Handler lien ──────────────────────────────────────────────────────
  const handleAddLink = useCallback((fromDevId, fromIface, toDevId, toIface) => {
    const result  = addLink(fromDevId, fromIface, toDevId, toIface);
    const fromDev = devices[fromDevId];
    const toDev   = devices[toDevId];
    if (result.ok) {
      emit({ type: "link:add", fromDev, toDev, fromIface, toIface });
    } else {
      emit({ type: "link:reject", fromDev, fromIface, toDev, toIface, reason: result.error });
    }
    return result;
  }, [addLink, devices, emit]);

  const handleRemoveLink = useCallback((linkId) => {
    const link    = links[linkId];
    const fromDev = link ? devices[link.from.deviceId] : null;
    const toDev   = link ? devices[link.to.deviceId]   : null;
    removeLink(linkId);
    if (link) emit({ type: "link:remove", link, fromDev, toDev });
  }, [removeLink, links, devices, emit]);

  // ── Ping depuis RouterCLI ─────────────────────────────────────────────
  const handleCliPing = useCallback(({ srcId, dstIp, count, ttl, onLog }) => {
    run({ srcId, dstIp, count, ttl, onLog });
  }, [run]);

  const dc = Object.keys(devices).length;
  const lc = Object.keys(links).length;
  const oc = Object.values(devices).filter(d => d.status === "online").length;

  return (
    <div className="app">
      <header className="app__topbar">
        <div className="app__topbar-dot"/>
        <span className="app__topbar-title">Networking Board</span>
        <span className="app__topbar-sep">|</span>
        <span style={{ fontSize:10, color:"#2a4a60", fontFamily:"JetBrains Mono,monospace" }}>
          Simulation ICMP · Multi-interface
        </span>
        <div className="app__topbar-right">
          <span className="app__topbar-badge">{dc} devices</span>
          <span className="app__topbar-badge">{lc} liens</span>
          <span className="app__topbar-badge" style={{ color: oc===dc&&dc>0?"#1D9E75":"#3a5060" }}>
            {oc}/{dc} online
          </span>
        </div>
      </header>

      <div className="app__body">
        <Sidebar devices={devices} onDevicePress={handleDevicePress}/>
        <div className="app__center">
          <Canvas
            devices={devices} links={links} leds={leds} packet={packet}
            onAddDevice={handleAddDevice}
            onMoveDevice={handleMoveDevice}
            onAddLink={handleAddLink}
            onRemoveLink={handleRemoveLink}
            onDevicePress={handleDevicePress}
          />

          <div className="app__terminal">
            <div className="app__terminal-header">
              <span className="app__terminal-title">◈ Topology Monitor</span>
              <span style={{ fontSize:9, color:"#2a4a60", fontFamily:"JetBrains Mono,monospace", marginLeft:8 }}>
                live — câbles · interfaces · pings · statuts
              </span>
              {running && (
                <span style={{ fontSize:9, color:"#378ADD", fontFamily:"JetBrains Mono,monospace", animation:"pulse 1s infinite", marginLeft:"auto", marginRight:8 }}>
                  ● ping en cours
                </span>
              )}
              <button className="app__terminal-clear" onClick={clearMonitor}>effacer</button>
            </div>
            <Terminal logs={logs} running={false} termRef={monitorRef}/>
          </div>
        </div>
      </div>

      {cliOpen && devices[cliOpen] && (
        <RouterCLI
          device={devices[cliOpen]}
          devices={devices}
          onUpdate={handleUpdate}
          onPing={handleCliPing}
          onClose={() => setCliOpen(null)}
        />
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
