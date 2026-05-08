import "./BoardCanvas.css";
import { RouterNode }  from "../Router/RouterNode";
import { RouterLabel } from "../Router/RouterLabel";
import { Packet }      from "../Packet/Packet";
import { LINK_AB }     from "../../data/routers";

export function BoardCanvas({ routers, leds = {}, packet, onRouterPress }) {
  const rA = routers["A"];
  const rB = routers["B"];

  return (
    <div className="board-canvas">
      <svg className="board-canvas__svg" viewBox="0 0 680 260">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9"
              fill="none" stroke="#2a3540"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        {/* ── Link cable ── */}
        <line
          className="board-link"
          x1={rA.x + 58} y1={rA.y}
          x2={rB.x - 58} y2={rB.y}
        />
        <text className="board-link__label" x="340" y={rA.y - 8} textAnchor="middle">
          {LINK_AB.label}
        </text>

        {/* ── Router A ── */}
        <foreignObject x={rA.x - 55} y={rA.y - 42} width="110" height="84">
          <RouterNode
            router={rA}
            led={leds[rA.id] ?? "idle"}
            onPress={onRouterPress}
          />
        </foreignObject>
        <RouterLabel router={rA} x={rA.x} y={rA.y + 58} />

        {/* ── Router B ── */}
        <foreignObject x={rB.x - 55} y={rB.y - 42} width="110" height="84">
          <RouterNode
            router={rB}
            led={leds[rB.id] ?? "idle"}
            onPress={onRouterPress}
          />
        </foreignObject>
        <RouterLabel router={rB} x={rB.x} y={rB.y + 58} />

        {/* ── "Click to configure" hint text under each router ── */}
        <text
          x={rA.x} y={rA.y + 75}
          textAnchor="middle"
          fontSize="8.5"
          fill="#1a3a55"
          fontFamily="'JetBrains Mono', monospace"
          className="board-canvas__hint"
        >
          cliquer pour configurer
        </text>
        <text
          x={rB.x} y={rB.y + 75}
          textAnchor="middle"
          fontSize="8.5"
          fill="#1a3a55"
          fontFamily="'JetBrains Mono', monospace"
          className="board-canvas__hint"
        >
          cliquer pour configurer
        </text>

        {/* ── Animated packet ── */}
        <Packet
          x={packet.x}
          y={packet.y}
          type={packet.type}
          visible={packet.visible}
        />
      </svg>
    </div>
  );
}
