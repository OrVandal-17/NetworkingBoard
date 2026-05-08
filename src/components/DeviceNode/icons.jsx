/** SVG icon components for each device type — used on canvas and in sidebar */

export function RouterIcon({ active = false, offline = false, led = "idle" }) {
  const bodyFill   = offline ? "#0a0a0a" : active ? "#0d1f35" : "#111518";
  const bodyStroke = offline ? "#2a2a2a" : active ? "#378ADD" : "#2a3540";
  const ledColor   = { idle: offline ? "#111" : "#1D9E75", tx: "#E8593C", rx: "#1D9E75" }[led] ?? "#1D9E75";
  return (
    <svg width="72" height="52" viewBox="0 0 72 52" overflow="visible">
      <defs>
        <filter id="rgl">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="4" y="12" width="64" height="30" rx="6" fill={bodyFill} stroke={bodyStroke} strokeWidth={active ? 1.5 : 1}/>
      <rect x="4" y="12" width="64" height="5"  rx="4" fill={offline ? "#111" : active ? "#1a4a7a" : "#1a2530"}/>
      {[0,1,2,3].map(i => (
        <rect key={i} x={14+i*12} y="22" width="8" height="8" rx="2"
          fill={i < 2 ? "#378ADD" : "#1a3050"}
          opacity={i < 2 ? (offline ? 0.15 : 0.9) : 0.4}/>
      ))}
      <rect x="12" y="34" width="48" height="3" rx="1.5" fill={offline ? "#111" : active ? "#153a5e" : "#1a2530"}/>
      <circle cx="56" cy="38" r="3.5" fill={ledColor} filter={led !== "idle" ? "url(#rgl)" : undefined}/>
      <line x1="20" y1="12" x2="16" y2="4" stroke={offline ? "#111" : "#2a3a4a"} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="3" r="2" fill={offline ? "#0a0a0a" : "#1a2d3d"} stroke={offline ? "#111" : "#2a3a4a"} strokeWidth="1"/>
      <line x1="52" y1="12" x2="56" y2="4" stroke={offline ? "#111" : "#2a3a4a"} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="56" cy="3" r="2" fill={offline ? "#0a0a0a" : "#1a2d3d"} stroke={offline ? "#111" : "#2a3a4a"} strokeWidth="1"/>
      {offline && <text x="36" y="32" textAnchor="middle" fontSize="7" fill="#f85149" fontWeight="600" fontFamily="monospace">OFFLINE</text>}
    </svg>
  );
}

export function SwitchIcon({ active = false, offline = false, led = "idle" }) {
  const bodyFill   = offline ? "#0a0a0a" : active ? "#0d2820" : "#0d1510";
  const bodyStroke = offline ? "#2a2a2a" : active ? "#1D9E75" : "#1a3028";
  const ledColor   = { idle: offline ? "#111" : "#1D9E75", tx: "#E8593C", rx: "#1D9E75" }[led] ?? "#1D9E75";
  return (
    <svg width="72" height="52" viewBox="0 0 72 52" overflow="visible">
      <defs>
        <filter id="sgl">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="4" y="14" width="64" height="24" rx="5" fill={bodyFill} stroke={bodyStroke} strokeWidth={active ? 1.5 : 1}/>
      <rect x="4" y="14" width="64" height="4"  rx="3" fill={offline ? "#0a0a0a" : active ? "#0d3a28" : "#0d2018"}/>
      {[0,1,2,3,4,5,6,7].map(i => (
        <rect key={i} x={9+i*7} y="22" width="5" height="8" rx="1"
          fill={i < 6 ? "#1D9E75" : "#0a2018"}
          opacity={i < 6 ? (offline ? 0.15 : 0.7) : 0.3}/>
      ))}
      <rect x="57" y="20" width="9" height="10" rx="2" fill="#378ADD" opacity={offline ? 0.1 : 0.5}/>
      <circle cx="60" cy="35" r="3" fill={ledColor} filter={led !== "idle" ? "url(#sgl)" : undefined}/>
      <text x="8" y="44" fontSize="6" fill={offline ? "#222" : active ? "#1a4a38" : "#1a2a20"} fontFamily="monospace">L2 SWITCH</text>
      {offline && <text x="36" y="30" textAnchor="middle" fontSize="7" fill="#f85149" fontWeight="600" fontFamily="monospace">OFFLINE</text>}
    </svg>
  );
}

export function PCIcon({ active = false, offline = false, led = "idle" }) {
  const monitorFill   = offline ? "#0a0a0a" : active ? "#0a1520" : "#0d1218";
  const monitorStroke = offline ? "#1a1a1a" : active ? "#378ADD" : "#1a2530";
  const screenFill    = offline ? "#060606" : active ? "#0d2540" : "#0a1520";
  const ledColor      = { idle: offline ? "#111" : "#1D9E75", tx: "#E8593C", rx: "#1D9E75" }[led] ?? "#1D9E75";
  return (
    <svg width="72" height="52" viewBox="0 0 72 52" overflow="visible">
      <defs>
        <filter id="pgl">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="8"  y="4"  width="44" height="32" rx="4" fill={monitorFill} stroke={monitorStroke} strokeWidth={active ? 1.5 : 1}/>
      <rect x="12" y="8"  width="36" height="22" rx="2" fill={screenFill}/>
      {active && !offline && <>
        <rect x="15" y="12" width="20" height="1.5" rx="1" fill="#378ADD" opacity=".5"/>
        <rect x="15" y="16" width="28" height="1.5" rx="1" fill="#378ADD" opacity=".3"/>
        <rect x="15" y="20" width="16" height="1.5" rx="1" fill="#1D9E75" opacity=".5"/>
        <text x="14" y="27" fontSize="5.5" fill="#378ADD" opacity=".7" fontFamily="monospace">&gt;_</text>
      </>}
      <rect x="26" y="36" width="8"  height="6"  rx="1" fill={offline ? "#111" : active ? "#1a2d40" : "#151d28"}/>
      <rect x="20" y="42" width="20" height="3"  rx="2" fill={offline ? "#111" : active ? "#1a2d40" : "#151d28"}/>
      <circle cx="49" cy="18" r="2.5" fill={ledColor} filter={led !== "idle" ? "url(#pgl)" : undefined}/>
      {offline && <text x="30" y="22" textAnchor="middle" fontSize="6" fill="#f85149" fontWeight="600" fontFamily="monospace">OFF</text>}
    </svg>
  );
}

export function DeviceIcon({ type, active, offline, led }) {
  if (type === "router") return <RouterIcon active={active} offline={offline} led={led}/>;
  if (type === "switch") return <SwitchIcon active={active} offline={offline} led={led}/>;
  if (type === "pc")     return <PCIcon     active={active} offline={offline} led={led}/>;
  return null;
}
