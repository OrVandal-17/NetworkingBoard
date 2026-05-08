import "./Packet.css";

const COLORS = {
  ping: { bg: "#0d2d4a", border: "#378ADD", text: "#b3d4f5", label: "PING" },
  echo: { bg: "#0a2d1e", border: "#1D9E75", text: "#9fe0c8", label: "ECHO" },
};

/**
 * Packet
 * SVG packet bubble that travels between routers.
 *
 * Props:
 *   x, y    - current position (driven by usePing)
 *   type    - "ping" | "echo"
 *   visible - boolean
 */
export function Packet({ x, y, type = "ping", visible }) {
  if (!visible) return null;
  const c = COLORS[type] ?? COLORS.ping;

  return (
    <g
      className="packet"
      transform={`translate(${x},${y})`}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <rect
        x="-18" y="-11" width="36" height="22" rx="5"
        fill={c.bg}
        stroke={c.border}
        strokeWidth="1.2"
      />
      <text
        x="0" y="5"
        textAnchor="middle"
        fontSize="8"
        fill={c.text}
        fontFamily="'JetBrains Mono', 'Fira Mono', monospace"
        fontWeight="600"
      >
        {c.label}
      </text>
    </g>
  );
}
