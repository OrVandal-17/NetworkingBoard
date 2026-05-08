import { useRef, useState, useCallback, useEffect } from "react";
import "./Canvas.css";
import { DeviceNode }  from "../DeviceNode/DeviceNode";
import { LinkLine }    from "../Link/LinkLine";
import { Packet }      from "../Packet/Packet";

/**
 * Canvas
 * Full-screen board. Responsibilities:
 *   - Render all devices and links
 *   - Handle drop from sidebar → addDevice
 *   - Handle device drag (move)
 *   - Handle link-drawing mode (click device A then device B)
 *   - Handle device click → open CLI
 *   - Render animated packet
 *
 * Props:
 *   devices, links, leds, packet
 *   onAddDevice(type, x, y)
 *   onMoveDevice(id, x, y)
 *   onAddLink(fromId, toId)
 *   onRemoveLink(linkId)
 *   onDevicePress(deviceId)
 */
export function Canvas({
  devices,
  links,
  leds,
  packet,
  onAddDevice,
  onMoveDevice,
  onAddLink,
  onRemoveLink,
  onDevicePress,
}) {
  const canvasRef  = useRef(null);
  const [mode, setMode]               = useState("select"); // "select" | "link" | "delete"
  const [dragId, setDragId]           = useState(null);
  const [dragOffset, setDragOffset]   = useState({ x: 0, y: 0 });
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [linkFrom, setLinkFrom]       = useState(null);   // first device in link mode
  const [mousePos, setMousePos]       = useState({ x: 0, y: 0 });
  const [selectedLink, setSelectedLink] = useState(null);

  // ── Canvas coordinate helper ───────────────────────────────────────────
  const toCanvas = useCallback((clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  // ── Drag from sidebar (HTML5 drop) ────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDropTarget(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDropTarget(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDropTarget(false);
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

  const handleMouseMove = useCallback((e) => {
    const pos = toCanvas(e.clientX, e.clientY);
    setMousePos(pos);
    if (dragId) {
      onMoveDevice(dragId, pos.x - dragOffset.x, pos.y - dragOffset.y);
    }
  }, [dragId, dragOffset, toCanvas, onMoveDevice]);

  const handleMouseUp = useCallback(() => {
    setDragId(null);
  }, []);

  // ── Device click (configure or link) ──────────────────────────────────
  const handleDevicePress = useCallback((id) => {
    if (mode === "link") {
      if (!linkFrom) {
        setLinkFrom(id);
      } else if (linkFrom !== id) {
        onAddLink(linkFrom, id);
        setLinkFrom(null);
      } else {
        setLinkFrom(null); // cancel
      }
      return;
    }
    if (mode === "delete") {
      // delete device — parent handles it
      onDevicePress?.(`__delete__${id}`);
      return;
    }
    // select mode → open CLI
    onDevicePress?.(id);
  }, [mode, linkFrom, onAddLink, onDevicePress]);

  // ── Link click ─────────────────────────────────────────────────────────
  const handleLinkPress = useCallback((linkId) => {
    if (mode === "delete") {
      onRemoveLink(linkId);
      setSelectedLink(null);
      return;
    }
    setSelectedLink((prev) => (prev === linkId ? null : linkId));
  }, [mode, onRemoveLink]);

  // ── Cancel link mode on Escape ─────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        setLinkFrom(null);
        setSelectedLink(null);
        if (mode !== "select") setMode("select");
      }
      if (e.key === "Delete" && selectedLink) {
        onRemoveLink(selectedLink);
        setSelectedLink(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mode, selectedLink, onRemoveLink]);

  const linkFromDevice = linkFrom ? devices[linkFrom] : null;
  const deviceList     = Object.values(devices);
  const linkList       = Object.values(links);

  return (
    <div
      ref={canvasRef}
      className={`canvas${isDropTarget ? " canvas--drop-target" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => { setSelectedLink(null); if (mode === "link" && linkFrom) setLinkFrom(null); }}
    >
      {/* Empty state */}
      {deviceList.length === 0 && (
        <div className="canvas__empty">
          <div className="canvas__empty-icon">⬡</div>
          <div className="canvas__empty-text">Glissez des équipements depuis la barre latérale</div>
        </div>
      )}

      {/* SVG layer — links + ghost + packet */}
      <svg
        className={`canvas__svg${mode !== "select" ? " canvas__svg--interactive" : ""}`}
        style={{ pointerEvents: "none" }}
      >
        {/* Links */}
        {linkList.map((link) => (
          <LinkLine
            key={link.id}
            link={link}
            devices={devices}
            selected={link.id === selectedLink}
            onPress={handleLinkPress}
          />
        ))}

        {/* Ghost link while drawing */}
        {linkFromDevice && (
          <line
            className="canvas__link-ghost"
            x1={linkFromDevice.x} y1={linkFromDevice.y}
            x2={mousePos.x}       y2={mousePos.y}
          />
        )}

        {/* Animated packet */}
        <Packet
          x={packet.x} y={packet.y}
          type={packet.type}
          visible={packet.visible}
        />
      </svg>

      {/* SVG layer with pointer events for link clicks */}
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        {linkList.map((link) => {
          const from = devices[link.from];
          const to   = devices[link.to];
          if (!from || !to) return null;
          return (
            <line key={link.id + "-hit"}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="transparent" strokeWidth="12"
              style={{ pointerEvents: "all", cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); handleLinkPress(link.id); }}
            />
          );
        })}
      </svg>

      {/* Device nodes */}
      {deviceList.map((dev) => (
        <DeviceNode
          key={dev.id}
          device={dev}
          led={leds[dev.id] ?? "idle"}
          selected={linkFrom === dev.id}
          onDragStart={handleDeviceDragStart}
          onPress={handleDevicePress}
        />
      ))}

      {/* Canvas toolbar */}
      <div className="canvas__toolbar">
        <button
          className={`canvas__tool-btn${mode === "select" ? " canvas__tool-btn--active" : ""}`}
          onClick={(e) => { e.stopPropagation(); setMode("select"); setLinkFrom(null); }}
          title="Mode sélection"
        >
          ↖ Select
        </button>
        <button
          className={`canvas__tool-btn${mode === "link" ? " canvas__tool-btn--active" : ""}`}
          onClick={(e) => { e.stopPropagation(); setMode(m => m === "link" ? "select" : "link"); setLinkFrom(null); }}
          title="Dessiner un câble entre deux devices"
        >
          ─ Câble
        </button>
        <button
          className={`canvas__tool-btn canvas__tool-btn--danger${mode === "delete" ? " canvas__tool-btn--active" : ""}`}
          onClick={(e) => { e.stopPropagation(); setMode(m => m === "delete" ? "select" : "delete"); setLinkFrom(null); }}
          title="Supprimer device ou câble"
        >
          ✕ Suppr
        </button>
      </div>

      {/* Link mode status bar */}
      {mode === "link" && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          fontFamily: "JetBrains Mono, monospace", fontSize: 11,
          padding: "5px 14px", borderRadius: 6,
          background: "rgba(10,14,18,0.9)", border: "1px solid #378ADD",
          color: "#79c0ff", pointerEvents: "none",
        }}>
          {linkFrom
            ? `Cliquez sur la destination pour câbler depuis ${devices[linkFrom]?.name}`
            : "Cliquez sur le device source"}
          {" · Échap pour annuler"}
        </div>
      )}
      {mode === "delete" && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          fontFamily: "JetBrains Mono, monospace", fontSize: 11,
          padding: "5px 14px", borderRadius: 6,
          background: "rgba(10,14,18,0.9)", border: "1px solid #5a1a1a",
          color: "#f85149", pointerEvents: "none",
        }}>
          Cliquez sur un device ou un câble pour le supprimer · Échap pour annuler
        </div>
      )}
    </div>
  );
}
