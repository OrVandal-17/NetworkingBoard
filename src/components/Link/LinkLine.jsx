const TYPE_STROKE = {
  "router-router": "#1a3d5a",
  "router-switch": "#0d3a28",
  "switch-switch": "#0d3a28",
  "router-pc":     "#2a2a4a",
  "switch-pc":     "#1a2a20",
  default:         "#1a2a30",
};

function linkColor(devFrom, devTo) {
  const key = [devFrom?.type, devTo?.type].sort().join("-");
  return TYPE_STROKE[key] ?? TYPE_STROKE.default;
}

export function LinkLine({ link, devices, selected, onPress }) {
  // Support both old format (string) and new format ({deviceId, interface})
  const fromId = link.from?.deviceId ?? link.from;
  const toId   = link.to?.deviceId   ?? link.to;
  const fromIf = link.from?.interface;
  const toIf   = link.to?.interface;

  const from = devices[fromId];
  const to   = devices[toId];
  if (!from || !to) return null;

  const stroke = selected ? "#378ADD" : linkColor(from, to);
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const isDashed = from.type === "router" && to.type === "router";

  return (
    <g style={{ cursor:"pointer" }}
      onClick={e => { e.stopPropagation(); onPress?.(link.id); }}>
      {/* Hit area */}
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke="transparent" strokeWidth="14"/>
      {/* Cable */}
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke={stroke}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={isDashed ? "7 4" : "none"}
        style={{ transition:"stroke .2s" }}/>
      {/* Interface labels at midpoint */}
      {(fromIf || toIf) && (
        <g style={{ pointerEvents:"none", userSelect:"none" }}>
          <text x={mx} y={my-5} textAnchor="middle"
            fontSize="8" fill={selected?"#378ADD":"#1a3040"}
            fontFamily="'JetBrains Mono',monospace">
            {fromIf ?? "?"} ─ {toIf ?? "?"}
          </text>
        </g>
      )}
    </g>
  );
}
