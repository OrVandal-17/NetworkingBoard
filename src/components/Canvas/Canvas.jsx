import { useRef, useState, useCallback, useEffect } from "react";
import "./Canvas.css";
import { DeviceNode }      from "../DeviceNode/DeviceNode";
import { LinkLine }        from "../Link/LinkLine";
import { Packet }          from "../Packet/Packet";
import { InterfacePicker } from "./InterfacePicker";

export function Canvas({
  devices, links, leds, packet,
  onAddDevice, onMoveDevice, onAddLink, onRemoveLink, onDevicePress,
}) {
  const canvasRef = useRef(null);
  const [mode, setMode]             = useState("select");
  const [dragId, setDragId]         = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 });
  const [selectedLink, setSelectedLink] = useState(null);

  // Link drawing: two-step — pick source interface then dest interface
  const [linkStep, setLinkStep] = useState(null);
  // linkStep: null | { fromId, fromIface } | { fromId, fromIface, toId (pending dest picker) }
  const [picker, setPicker]     = useState(null);
  // picker: null | { deviceId, step: "from"|"to" }

  const toCanvas = useCallback((clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  // ── Sidebar drop ──────────────────────────────────────────────────────
  const handleDragOver  = useCallback(e => { e.preventDefault(); setIsDropTarget(true); }, []);
  const handleDragLeave = useCallback(() => setIsDropTarget(false), []);
  const handleDrop      = useCallback(e => {
    e.preventDefault(); setIsDropTarget(false);
    const type = e.dataTransfer.getData("device-type");
    if (!type) return;
    const { x, y } = toCanvas(e.clientX, e.clientY);
    onAddDevice(type, x, y);
  }, [toCanvas, onAddDevice]);

  // ── Device drag (move) ────────────────────────────────────────────────
  const handleDeviceDragStart = useCallback((e, id) => {
    if (mode !== "select") return;
    const dev = devices[id];
    const { x, y } = toCanvas(e.clientX, e.clientY);
    setDragId(id);
    setDragOffset({ x: x - dev.x, y: y - dev.y });
    e.preventDefault();
  }, [mode, devices, toCanvas]);

  const handleMouseMove = useCallback(e => {
    const pos = toCanvas(e.clientX, e.clientY);
    setMousePos(pos);
    if (dragId) onMoveDevice(dragId, pos.x - dragOffset.x, pos.y - dragOffset.y);
  }, [dragId, dragOffset, toCanvas, onMoveDevice]);

  const handleMouseUp = useCallback(() => setDragId(null), []);

  // ── Device click ──────────────────────────────────────────────────────
  const handleDevicePress = useCallback(id => {
    if (mode === "delete") { onDevicePress?.(`__delete__${id}`); return; }

    if (mode === "link") {
      if (!linkStep) {
        // Étape 1 : choisir l'interface source
        setPicker({ deviceId: id, step: "from" });
      } else if (linkStep.fromId !== id) {
        // Étape 2 : choisir l'interface dest
        setPicker({ deviceId: id, step: "to" });
      } else {
        // Clic sur le même device → annuler
        setLinkStep(null); setPicker(null);
      }
      return;
    }

    onDevicePress?.(id);
  }, [mode, linkStep, onDevicePress]);

  // ── Interface picker callbacks ────────────────────────────────────────
  const handlePickerPick = useCallback((deviceId, ifaceName) => {
    if (!picker) return;

    if (picker.step === "from") {
      setLinkStep({ fromId: deviceId, fromIface: ifaceName });
      setPicker(null);
    } else if (picker.step === "to" && linkStep) {
      const result = onAddLink(linkStep.fromId, linkStep.fromIface, deviceId, ifaceName);
      // Que la connexion réussisse ou non, on reset (le monitor affiche l'erreur)
      setLinkStep(null);
      setPicker(null);
    }
  }, [picker, linkStep, onAddLink]);

  const handlePickerCancel = useCallback(() => {
    setPicker(null);
    if (picker?.step === "to") { /* keep linkStep so user can retry */ }
    else setLinkStep(null);
  }, [picker]);

  // ── Link click ────────────────────────────────────────────────────────
  const handleLinkPress = useCallback(linkId => {
    if (mode === "delete") { onRemoveLink(linkId); setSelectedLink(null); return; }
    setSelectedLink(prev => prev === linkId ? null : linkId);
  }, [mode, onRemoveLink]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (e.key === "Escape") {
        setLinkStep(null); setPicker(null); setSelectedLink(null);
        if (mode !== "select") setMode("select");
      }
      if (e.key === "Delete" && selectedLink) { onRemoveLink(selectedLink); setSelectedLink(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mode, selectedLink, onRemoveLink]);

  const deviceList = Object.values(devices);
  const linkList   = Object.values(links);
  const linkFromDev = linkStep ? devices[linkStep.fromId] : null;

  return (
    <div
      ref={canvasRef}
      className={`canvas${isDropTarget ? " canvas--drop-target" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => { setSelectedLink(null); }}
    >
      {deviceList.length === 0 && (
        <div className="canvas__empty">
          <div className="canvas__empty-icon">⬡</div>
          <div className="canvas__empty-text">Glissez des équipements depuis la barre latérale</div>
        </div>
      )}

      {/* SVG layer — links + packet */}
      <svg style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none", overflow:"visible" }}>
        {linkList.map(link => (
          <LinkLine key={link.id} link={link} devices={devices}
            selected={link.id === selectedLink} onPress={handleLinkPress}/>
        ))}
        {/* Ghost line while drawing */}
        {linkFromDev && !picker && (
          <line className="canvas__link-ghost"
            x1={linkFromDev.x} y1={linkFromDev.y}
            x2={mousePos.x}    y2={mousePos.y}/>
        )}
        <Packet x={packet.x} y={packet.y} type={packet.type} visible={packet.visible}/>
      </svg>

      {/* SVG hit areas for links */}
      <svg style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none", overflow:"visible" }}>
        {linkList.map(link => {
          const from = devices[link.from?.deviceId ?? link.from];
          const to   = devices[link.to?.deviceId   ?? link.to];
          if (!from || !to) return null;
          return (
            <line key={link.id+"-hit"}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="transparent" strokeWidth="14"
              style={{ pointerEvents:"all", cursor:"pointer" }}
              onClick={e => { e.stopPropagation(); handleLinkPress(link.id); }}
            />
          );
        })}
      </svg>

      {/* Device nodes */}
      {deviceList.map(dev => (
        <DeviceNode key={dev.id} device={dev}
          led={leds[dev.id] ?? "idle"}
          selected={linkStep?.fromId === dev.id}
          onDragStart={handleDeviceDragStart}
          onPress={handleDevicePress}/>
      ))}

      {/* Interface picker popup */}
      {picker && devices[picker.deviceId] && (
        <InterfacePicker
          device={devices[picker.deviceId]}
          x={devices[picker.deviceId].x}
          y={devices[picker.deviceId].y}
          onPick={handlePickerPick}
          onCancel={handlePickerCancel}
          excludeLinked={true}
          links={links}
          filterCompatibleWith={
            picker.step === "to" && linkStep
              ? (devices[linkStep.fromId]?.interfaces ?? []).find(i => i.name === linkStep.fromIface)?.type ?? null
              : null
          }
        />
      )}

      {/* Toolbar */}
      <div className="canvas__toolbar">
        <button className={`canvas__tool-btn${mode==="select"?" canvas__tool-btn--active":""}`}
          onClick={e => { e.stopPropagation(); setMode("select"); setLinkStep(null); setPicker(null); }}>
          ↖ Select
        </button>
        <button className={`canvas__tool-btn${mode==="link"?" canvas__tool-btn--active":""}`}
          onClick={e => { e.stopPropagation(); setMode(m => m==="link"?"select":"link"); setLinkStep(null); setPicker(null); }}>
          ─ Câble
        </button>
        <button className={`canvas__tool-btn canvas__tool-btn--danger${mode==="delete"?" canvas__tool-btn--active":""}`}
          onClick={e => { e.stopPropagation(); setMode(m => m==="delete"?"select":"delete"); setLinkStep(null); setPicker(null); }}>
          ✕ Suppr
        </button>
      </div>

      {/* Status bar */}
      {mode === "link" && (
        <div style={{
          position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
          fontFamily:"JetBrains Mono,monospace", fontSize:11,
          padding:"5px 14px", borderRadius:6,
          background:"rgba(10,14,18,0.92)", border:"1px solid #378ADD",
          color:"#79c0ff", pointerEvents:"none", whiteSpace:"nowrap",
        }}>
          {!linkStep
            ? "Cliquez sur le device source"
            : `Source: ${devices[linkStep.fromId]?.name} [${linkStep.fromIface}] — cliquez sur la destination`}
          {" · Échap pour annuler"}
        </div>
      )}
      {mode === "delete" && (
        <div style={{
          position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
          fontFamily:"JetBrains Mono,monospace", fontSize:11,
          padding:"5px 14px", borderRadius:6,
          background:"rgba(10,14,18,0.92)", border:"1px solid #5a1a1a",
          color:"#f85149", pointerEvents:"none",
        }}>
          Cliquez sur un device ou un câble · Échap pour annuler
        </div>
      )}
    </div>
  );
}
