import { useState, useRef, useCallback } from "react";
import { sleep, rand, ease, formatRtt } from "../utils/ping";
import { validateRoute } from "../utils/network";

const INITIAL_PACKET = { x: 0, y: 0, visible: false, type: "ping" };

export function usePing({ devices, onLed }) {
  const [running, setRunning] = useState(false);
  const [packet,  setPacket]  = useState(INITIAL_PACKET);
  const rafRef = useRef(null);

  const animatePacket = useCallback(
    (fromId, toId, type) =>
      new Promise((resolve) => {
        const from = devices[fromId];
        const to   = devices[toId];
        if (!from || !to) { resolve(); return; }
        const duration = 700;
        const start    = performance.now();
        onLed(fromId, "tx");
        const step = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const e = ease(t);
          const x = from.x + (to.x - from.x) * e;
          const y = from.y + (to.y - from.y) * e + Math.sin(Math.PI * e) * -28;
          setPacket({ x, y, visible: true, type });
          if (t < 1) {
            rafRef.current = requestAnimationFrame(step);
          } else {
            setPacket((p) => ({ ...p, visible: false }));
            onLed(fromId, "idle");
            onLed(toId, "rx");
            setTimeout(() => { onLed(toId, "idle"); resolve(); }, 150);
          }
        };
        rafRef.current = requestAnimationFrame(step);
      }),
    [devices, onLed]
  );

  const run = useCallback(
    async ({ srcId, dstIp, count, ttl, onLog }) => {
      if (running) return;
      const src = devices[srcId];
      if (!src) { onLog("Device source introuvable.", "err"); return; }

      const dst = Object.values(devices).find(
        (d) => d.ip === dstIp?.trim() || d.id === dstIp?.trim()
      );

      const target = dst ?? {
        id: null, name: dstIp, ip: dstIp?.trim(),
        status: "online", prefix: src.prefix ?? 24,
      };

      const { ok, reason } = validateRoute(src, target);
      if (!ok) { onLog(`ping: ${reason}`, "err"); return; }
      if (!dst) { onLog(`ping: Hôte ${dstIp} inaccessible (inconnu sur le board)`, "err"); return; }
      if (dst.id === srcId) { onLog("ping: source et destination identiques.", "err"); return; }

      setRunning(true);
      const n = Math.min(count, 10);
      onLog("", "");
      onLog(`PING ${target.ip} (${dst.name}) depuis ${src.ip}`, "cmd");
      onLog(`${n} paquets, ttl=${ttl}`, "info");
      onLog("", "");

      let received = 0;
      const times = [];

      for (let i = 1; i <= n; i++) {
        await sleep(350);
        const drop = Math.random() < 0.07;
        const ms   = rand(1, 8) + rand(0, 3);
        if (!drop) {
          await animatePacket(srcId, dst.id, "ping");
          await sleep(60);
          await animatePacket(dst.id, srcId, "echo");
          received++;
          times.push(ms);
          onLog(`64 bytes de ${target.ip}: icmp_seq=${i} ttl=${ttl} time=${ms} ms`, "ok");
        } else {
          onLed(srcId, "tx");
          await sleep(300);
          onLed(srcId, "idle");
          onLog(`Requête n°${i} — délai d'attente dépassé.`, "err");
        }
        await sleep(120);
      }

      const loss = Math.round(((n - received) / n) * 100);
      onLog("", "");
      onLog(`--- ${target.ip} ping statistiques ---`, "stat");
      onLog(`${n} paquets transmis, ${received} reçus, ${loss}% perte`, "stat");
      const rttLine = formatRtt(times);
      if (rttLine) onLog(rttLine, "stat");
      onLog("", "");
      setRunning(false);
    },
    [running, devices, animatePacket, onLed]
  );

  return { running, packet, run };
}
