import "./Controls.css";

export function Controls({
  routers,
  src, dst,
  count, ttl,
  running,
  onSrc, onDst,
  onCount, onTtl,
  onSwap,
  onPing, onClear,
}) {
  const routerOptions = Object.values(routers);

  const routerLabel = (r) =>
    r.status !== "online" ? `${r.name} [offline]` : r.name;

  return (
    <div className="controls">
      <label className="controls__label">src</label>
      <select
        className="controls__select"
        value={src}
        disabled={running}
        onChange={(e) => onSrc(e.target.value)}
      >
        {routerOptions.map((r) => (
          <option key={r.id} value={r.id}>{routerLabel(r)}</option>
        ))}
      </select>

      <button
        className="controls__swap"
        disabled={running}
        title="Inverser src / dst"
        onClick={onSwap}
      >
        ⇄
      </button>

      <label className="controls__label">dst</label>
      <select
        className="controls__select"
        value={dst}
        disabled={running}
        onChange={(e) => onDst(e.target.value)}
      >
        {routerOptions.map((r) => (
          <option key={r.id} value={r.id}>{routerLabel(r)}</option>
        ))}
      </select>

      <div className="controls__divider" />

      <label className="controls__label">count</label>
      <input
        className="controls__input"
        type="number"
        value={count}
        min={1} max={10}
        disabled={running}
        onChange={(e) => onCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
      />

      <label className="controls__label">ttl</label>
      <input
        className="controls__input"
        type="number"
        value={ttl}
        min={1} max={255}
        disabled={running}
        onChange={(e) => onTtl(Math.max(1, Math.min(255, parseInt(e.target.value) || 1)))}
      />

      <div className="controls__actions">
        <button
          className="controls__btn-clear"
          disabled={running}
          onClick={onClear}
        >
          effacer
        </button>
        <button
          className={`controls__btn-ping${running ? " controls__btn-ping--running" : ""}`}
          disabled={running}
          onClick={onPing}
        >
          {running ? "▶ running…" : "▶ Ping"}
        </button>
      </div>
    </div>
  );
}
