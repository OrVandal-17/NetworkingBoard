import "./Board.css";
import { BoardCanvas } from "./BoardCanvas";
import { Terminal }   from "../Terminal/Terminal";
import { Controls }   from "../Controls/Controls";

/**
 * Board
 * Top-level layout: header → canvas → terminal → controls → legend.
 *
 * Props — all driven by NetworkingBoard (parent orchestrator):
 *   routers, leds, packet
 *   logs, running, termRef
 *   src, dst, count, ttl
 *   onSrc, onDst, onCount, onTtl, onSwap
 *   onPing, onClear
 *   onRouterPress
 */
export function Board({
  routers, leds, packet,
  logs, running, termRef,
  src, dst, count, ttl,
  onSrc, onDst, onCount, onTtl, onSwap,
  onPing, onClear,
  onRouterPress,
}) {
  return (
    <div className="board">
      {/* Header */}
      <div className="board__header">
        <div className="board__header-dot" />
        <span className="board__header-title">Networking Board</span>
        <span className="board__header-sep">──</span>
        <span className="board__header-sub">Simulation ICMP</span>
      </div>

      {/* Canvas */}
      <BoardCanvas
        routers={routers}
        leds={leds}
        packet={packet}
        onRouterPress={onRouterPress}
      />

      {/* Terminal */}
      <Terminal logs={logs} running={running} termRef={termRef} />

      {/* Controls */}
      <Controls
        routers={routers}
        src={src} dst={dst}
        count={count} ttl={ttl}
        running={running}
        onSrc={onSrc} onDst={onDst}
        onCount={onCount} onTtl={onTtl}
        onSwap={onSwap}
        onPing={onPing} onClear={onClear}
      />

      {/* Legend */}
      <div className="board__footer">
        <span className="board__legend-item">
          <span className="board__legend-dot" style={{ color: "#378ADD" }}>■</span>
          PING (ICMP Request)
        </span>
        <span className="board__legend-item">
          <span className="board__legend-dot" style={{ color: "#1D9E75" }}>■</span>
          ECHO (ICMP Reply)
        </span>
        <span className="board__legend-item">
          <span className="board__legend-dot" style={{ color: "#E8593C" }}>■</span>
          LED active
        </span>
        <span className="board__footer-note">7% packet loss simulated</span>
      </div>
    </div>
  );
}
