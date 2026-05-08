import "./RouterNode.css";

export function RouterNode({ router, led = "idle", onPress }) {
  const active  = led !== "idle" || router.status === "online";
  const offline = router.status !== "online";
  const clickable = !!onPress;

  const ledColor = {
    idle:  offline ? "#1a1a1a" : "#1D9E75",
    tx:    "#E8593C",
    rx:    "#1D9E75",
    error: "#f85149",
  }[led] ?? "#1D9E75";

  const bodyStroke = offline ? "#2a2a2a" : active ? "#378ADD" : "#2a3540";
  const bodyFill   = offline ? "#0a0a0a" : active ? "#0d1f35" : "#111518";

  return (
    <svg
      width="110"
      height="72"
      viewBox="0 0 110 72"
      className={`router-node${clickable ? " router-node--clickable" : ""}`}
      onClick={clickable ? () => onPress(router.id) : undefined}
      role={clickable ? "button" : undefined}
      aria-label={clickable ? `Configurer ${router.name}` : undefined}
    >
      <defs>
        <filter id={`glow-${router.id}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hover ring — visible via CSS on .router-node--clickable:hover */}
      {clickable && (
        <rect
          x="4" y="14" width="102" height="50" rx="11"
          fill="none"
          stroke="#378ADD"
          strokeWidth="1"
          opacity="0"
          className="router-node__hover-ring"
        />
      )}

      {/* Body */}
      <rect
        x="8" y="18" width="94" height="42" rx="8"
        className="router-body"
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth={active ? 1.5 : 1}
      />

      {/* Top accent strip */}
      <rect
        x="8" y="18" width="94" height="6" rx="4"
        fill={offline ? "#1a1a1a" : active ? "#1a4a7a" : "#1a2530"}
      />

      {/* Ports */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={22 + i * 16} y="32" width="10" height="10" rx="2"
          className="router-port"
          fill={i < 2 ? "#378ADD" : "#1a3050"}
          opacity={i < 2 ? (offline ? 0.2 : 0.9) : 0.4}
        />
      ))}

      {/* Brand stripe */}
      <rect
        x="18" y="46" width="74" height="3" rx="1.5"
        fill={offline ? "#1a1a1a" : active ? "#153a5e" : "#1a2530"}
      />

      {/* Status LED */}
      <circle
        cx="87" cy="52" r="4"
        className={`router-led${led !== "idle" ? " router-led--active" : ""}`}
        fill={ledColor}
        filter={led !== "idle" ? `url(#glow-${router.id})` : undefined}
      />

      {/* Antennae */}
      <line x1="30" y1="18" x2="24" y2="6"
        stroke={offline ? "#1a1a1a" : "#2a3a4a"}
        strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="5" r="2.5"
        fill={offline ? "#0a0a0a" : "#1a2d3d"}
        stroke={offline ? "#1a1a1a" : "#2a3a4a"} strokeWidth="1" />
      <line x1="80" y1="18" x2="86" y2="6"
        stroke={offline ? "#1a1a1a" : "#2a3a4a"}
        strokeWidth="2" strokeLinecap="round" />
      <circle cx="86" cy="5" r="2.5"
        fill={offline ? "#0a0a0a" : "#1a2d3d"}
        stroke={offline ? "#1a1a1a" : "#2a3a4a"} strokeWidth="1" />

      {/* Offline badge */}
      {offline && (
        <text x="55" y="42" textAnchor="middle"
          fontSize="8" fill="#f85149" fontWeight="600"
          fontFamily="'JetBrains Mono', monospace">
          OFFLINE
        </text>
      )}

      {/* Click hint icon (terminal ">_") */}
      {clickable && !offline && (
        <text
          x="21" y="54"
          fontSize="7"
          fill="#1a3a55"
          fontFamily="'JetBrains Mono', monospace"
          className="router-node__cli-hint"
        >
          &gt;_
        </text>
      )}
    </svg>
  );
}
