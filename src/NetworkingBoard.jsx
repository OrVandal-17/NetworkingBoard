import { useState, useCallback } from "react";
import { Board }          from "./components/Board";
import { RouterCLI }      from "./components/RouterCLI";
import { useRouterStore } from "./store/useRouterStore";
import { usePing }        from "./hooks/usePing";
import { useTerminal }    from "./hooks/useTerminal";
import "./styles/global.css";

export default function NetworkingBoard() {
  const [src,   setSrc]   = useState("A");
  const [dst,   setDst]   = useState("B");
  const [count, setCount] = useState(4);
  const [ttl,   setTtl]   = useState(64);

  // Per-router LED states
  const [leds, setLeds] = useState({ A: "idle", B: "idle" });

  // Which router CLI is open (null | routerId)
  const [cliOpen, setCliOpen] = useState(null);

  const setLed = useCallback((id, state) => {
    setLeds((prev) => ({ ...prev, [id]: state }));
  }, []);

  const { routers, updateRouter } = useRouterStore();
  const { logs, addLog, clear: clearLogs, termRef } = useTerminal();
  const { running, packet, run } = usePing({ routers, onLed: setLed });

  // Main board ping (from Controls toolbar)
  const handlePing = useCallback(() => {
    run({ srcId: src, dstIp: routers[dst]?.ip, count, ttl, onLog: addLog });
  }, [run, src, dst, routers, count, ttl, addLog]);

  const handleSwap = useCallback(() => {
    setSrc(dst);
    setDst(src);
  }, [src, dst]);

  // Open CLI for a given router
  const handleRouterPress = useCallback((routerId) => {
    setCliOpen(routerId);
  }, []);

  const handleCliClose = useCallback(() => {
    setCliOpen(null);
  }, []);

  // Ping launched from inside a router's CLI
  const handleCliPing = useCallback(
    ({ srcId, dstIp, count: c, ttl: t, onLog }) => {
      run({ srcId, dstIp, count: c, ttl: t, onLog });
    },
    [run]
  );

  return (
    <div className="app">
      <div className="app__inner">
        <Board
          routers={routers}
          leds={leds}
          packet={packet}
          logs={logs}
          running={running}
          termRef={termRef}
          src={src}     dst={dst}
          count={count} ttl={ttl}
          onSrc={setSrc}      onDst={setDst}
          onCount={setCount}  onTtl={setTtl}
          onSwap={handleSwap}
          onPing={handlePing}
          onClear={clearLogs}
          onRouterPress={handleRouterPress}
        />
      </div>

      {/* Per-router CLI modal */}
      {cliOpen && routers[cliOpen] && (
        <RouterCLI
          router={routers[cliOpen]}
          routers={routers}
          onUpdate={updateRouter}
          onPing={handleCliPing}
          onClose={handleCliClose}
        />
      )}
    </div>
  );
}
