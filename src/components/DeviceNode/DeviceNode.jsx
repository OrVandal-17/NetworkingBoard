import "./DeviceNode.css";
import { DeviceIcon } from "./icons";

/**
 * DeviceNode
 * A device rendered on the canvas at absolute position (device.x, device.y).
 * Handles drag, click-to-configure, and selection.
 *
 * Props:
 *   device     - { id, type, name, ip, prefix, status, x, y }
 *   led        - "idle" | "tx" | "rx"
 *   selected   - boolean
 *   onDragStart - (e, deviceId) => void
 *   onPress     - (deviceId) => void
 */
export function DeviceNode({ device, led = "idle", selected, onDragStart, onPress }) {
  const active  = led !== "idle" || device.status === "online";
  const offline = device.status !== "online";

  const handleMouseDown = (e) => {
    // Left button drag
    if (e.button === 0) {
      e.stopPropagation();
      onDragStart?.(e, device.id);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onPress?.(device.id);
  };

  const subLabel = device.type === "switch"
    ? `${device.ports ?? 8} ports`
    : device.ip
      ? `${device.ip}/${device.prefix ?? 24}`
      : "";

  return (
    <div
      className={`device-node${offline ? " device-node--offline" : ""}`}
      style={{ left: device.x, top: device.y }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`device-node__icon${selected ? " device-node__icon--selected" : ""}`}
        onClick={handleClick}
        title={`Configurer ${device.name}`}
      >
        <DeviceIcon
          type={device.type}
          active={active}
          offline={offline}
          led={led}
        />
        <span className="device-node__hint">&gt;_</span>
      </div>

      <span className="device-node__label">{device.name}</span>
      {subLabel && <span className="device-node__sublabel">{subLabel}</span>}
    </div>
  );
}
