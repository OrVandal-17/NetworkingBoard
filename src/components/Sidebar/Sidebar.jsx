import "./Sidebar.css";
import { DEVICE_CATALOG } from "../../data/devices";
import { DeviceIcon }     from "../DeviceNode/icons";

const TYPE_COLOR = {
  router: "#378ADD",
  switch: "#1D9E75",
  pc:     "#d2a8ff",
};

/**
 * Sidebar
 * Left panel with:
 *   1. Device catalog (drag to canvas)
 *   2. Current device list (click to select / open CLI)
 *
 * Props:
 *   devices       - map from board store
 *   onDevicePress - open CLI for a device
 */
export function Sidebar({ devices, onDevicePress }) {
  const deviceList = Object.values(devices);

  // ── HTML5 drag start ──────────────────────────────────────────────────
  const handleDragStart = (e, type) => {
    e.dataTransfer.setData("device-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const counts = { router: 0, switch: 0, pc: 0 };
  deviceList.forEach((d) => { if (counts[d.type] !== undefined) counts[d.type]++; });

  return (
    <aside className="sidebar">
      {/* ── Catalog ───────────────────────────────────────────────────── */}
      <div className="sidebar__section-title">Équipements</div>
      <div className="sidebar__catalog">
        {DEVICE_CATALOG.map((item) => (
          <div
            key={item.type}
            className="sidebar__item"
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            title={`Glisser pour ajouter un ${item.label}`}
          >
            <div className="sidebar__item__icon-wrap">
              <DeviceIcon type={item.type} active={false} offline={false} led="idle"/>
            </div>
            <span className="sidebar__item-label">{item.label}</span>
            <span className="sidebar__item-desc">{item.description}</span>
          </div>
        ))}
      </div>

      {/* ── Device list ───────────────────────────────────────────────── */}
      <div className="sidebar__section-title">Topologie ({deviceList.length})</div>
      <div className="sidebar__device-list">
        {deviceList.length === 0 && (
          <div style={{
            padding: "12px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            color: "#1a2530",
            textAlign: "center",
          }}>
            Aucun équipement
          </div>
        )}
        {deviceList.map((d) => {
          const offline = d.status !== "online";
          return (
            <div
              key={d.id}
              className="sidebar__device-entry"
              onClick={() => onDevicePress?.(d.id)}
              title={`${d.name} — cliquer pour configurer`}
            >
              <div
                className="sidebar__device-dot"
                style={{ background: offline ? "#4a1a1a" : TYPE_COLOR[d.type] ?? "#555" }}
              />
              <div className="sidebar__device-info">
                <div className="sidebar__device-name">{d.name}</div>
                <div className="sidebar__device-ip">
                  {d.type === "switch"
                    ? `L2 · ${d.ports ?? 8}p`
                    : d.ip
                      ? `${d.ip}/${d.prefix ?? 24}`
                      : d.type}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer stats ─────────────────────────────────────────────── */}
      <div className="sidebar__footer">
        <div className="sidebar__stat">Routeurs : {counts.router}</div>
        <div className="sidebar__stat">Switches : {counts.switch}</div>
        <div className="sidebar__stat">PCs      : {counts.pc}</div>
      </div>
    </aside>
  );
}
