/**
 * LinkLine
 * SVG line connecting two devices on the canvas.
 * Rendered inside the <svg> overlay on the canvas.
 */
export function LinkLine({ link, devices, selected, onPress }) {
  const from = devices[link.from];
  const to   = devices[link.to];
  if (!from || !to) return null;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Midpoint for label
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;

  // Link type color based on connected device types
  const bothRouter = from.type === "router" && to.type === "router";
  const hasSwitch  = from.type === "switch" || to.type === "switch";
  const strokeColor = selected
    ? "#378ADD"
    : bothRouter
    ? "#1a3d5a"
    : hasSwitch
    ? "#0d3a28"
    : "#1a2a30";

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={(e) => { e.stopPropagation(); onPress?.(link.id); }}
    >
      {/* Hit area (invisible, wider) */}
      <line
        x1={from.x} y1={from.y}
        x2={to.x}   y2={to.y}
        stroke="transparent"
        strokeWidth="12"
      />
      {/* Visible cable */}
      <line
        x1={from.x} y1={from.y}
        x2={to.x}   y2={to.y}
        stroke={strokeColor}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={bothRouter ? "7 4" : "none"}
        style={{ transition: "stroke 0.2s" }}
      />
      {/* Label at midpoint */}
      <text
        x={mx} y={my - 6}
        textAnchor="middle"
        fontSize="8"
        fill="#1a3040"
        fontFamily="'JetBrains Mono', monospace"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {from.interface ?? "ETH"} ─ {to.interface ?? "ETH"}
      </text>
    </g>
  );
}
