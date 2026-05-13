import "./DeviceNode.css";
import { DeviceIcon } from "./icons";
import { primaryIp }  from "../../data/devices";

export function DeviceNode({ device, led = "idle", selected, onDragStart, onPress }) {
  const offline = device.status !== "online";
  const primary = primaryIp(device);

  const handleMouseDown = e => {
    if (e.button === 0) { e.stopPropagation(); onDragStart?.(e, device.id); }
  };

  // Sublabel: IP primaire ou nombre de ports
  const subLabel = device.type === "switch"
    ? `${(device.interfaces ?? []).filter(i => i.linked).length}/${(device.interfaces ?? []).filter(i=>i.type==="fastethernet").length} ports`
    : primary ? `${primary.ip}/${primary.prefix}` : "non configuré";

  return (
    <div
      className={`device-node${offline ? " device-node--offline" : ""}`}
      style={{ left: device.x, top: device.y }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`device-node__icon${selected ? " device-node__icon--selected" : ""}`}
        onClick={e => { e.stopPropagation(); onPress?.(device.id); }}
        title={`Configurer ${device.name}`}
      >
        <DeviceIcon
          type={device.type}
          interfaces={device.interfaces ?? []}
          offline={offline}
          led={led}
        />
        <span className="device-node__hint">&gt;_</span>
      </div>
      <span className="device-node__label">{device.name}</span>
      <span className="device-node__sublabel">{subLabel}</span>
    </div>
  );
}
