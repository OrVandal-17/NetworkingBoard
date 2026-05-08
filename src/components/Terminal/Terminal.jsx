import "./Terminal.css";

/**
 * Terminal
 * Scrollable CLI output pane.
 *
 * Props:
 *   logs    - [{ text: string, cls: string }]
 *   running - boolean (shows blinking cursor when true)
 *   termRef - ref forwarded from useTerminal (for auto-scroll)
 */
export function Terminal({ logs, running, termRef }) {
  return (
    <div className="terminal" ref={termRef}>
      {logs.map((log, i) => (
        <div
          key={i}
          className={`terminal__line${log.cls ? ` terminal__line--${log.cls}` : ""}`}
        >
          {log.text || "\u00a0"}
        </div>
      ))}

      {running && (
        <div className="terminal__cursor">
          <span className="terminal__cursor-blink">▌</span>
          <span>en cours…</span>
        </div>
      )}
    </div>
  );
}
