/**
 * Icônes custom — style dark tech / glowing
 * Chaque icône reflète l'état de ses interfaces individuelles.
 *
 * Props communes:
 *   interfaces  [] — tableau d'interfaces du device
 *   led         "idle"|"tx"|"rx"
 *   offline     bool
 */

// ── Filtre glow global (injecté une fois dans le SVG) ─────────────────────────
export function GlowDefs() {
  return (
    <defs>
      <filter id="glow-b" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glow-s" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  );
}

const LED_COLOR = { idle: "#1D9E75", tx: "#E8593C", rx: "#1D9E75" };
const PORT_UP   = "#378ADD";
const PORT_DOWN = "#1a2d3a";
const SERIAL_UP = "#d2a8ff";

// ── Helpers ────────────────────────────────────────────────────────────────────
function ifaceColor(iface) {
  if (!iface) return PORT_DOWN;
  if (iface.status !== "up") return PORT_DOWN;
  if (iface.type === "serial") return iface.ip ? SERIAL_UP : PORT_DOWN;
  return iface.ip ? PORT_UP : "#0d2030";
}

function ifaceGlow(iface) {
  return iface?.status === "up" && iface?.ip ? "url(#glow-s)" : undefined;
}

// ── ROUTEUR ────────────────────────────────────────────────────────────────────
// Forme: châssis rack horizontal + 3 ports Gi + 1 port Serial + LEDs

export function RouterIcon({ interfaces = [], led = "idle", offline = false }) {
  const gi  = interfaces.filter(i => i.type === "gigabit");
  const se  = interfaces.filter(i => i.type === "serial");
  const ledColor = offline ? "#111" : (LED_COLOR[led] ?? "#1D9E75");
  const chassis  = offline ? "#0a0a0a" : "#0b1520";
  const border   = offline ? "#1a1a1a" : led !== "idle" ? "#378ADD" : "#1e3a50";

  return (
    <svg width="80" height="58" viewBox="0 0 80 58" overflow="visible">
      <GlowDefs/>

      {/* Châssis principal */}
      <rect x="2" y="10" width="76" height="36" rx="5"
        fill={chassis} stroke={border} strokeWidth="1.2"/>

      {/* Bande top accent */}
      <rect x="2" y="10" width="76" height="5" rx="4"
        fill={offline ? "#0d0d0d" : "#0d2035"}/>

      {/* Ligne de séparation port area */}
      <line x1="60" y1="15" x2="60" y2="46" stroke="#0d1e2e" strokeWidth="1"/>

      {/* Ports Gi — 3 slots */}
      {[0,1,2].map(i => {
        const iface = gi[i];
        const c = ifaceColor(iface);
        const gf = ifaceGlow(iface);
        return (
          <g key={i}>
            {/* Port body */}
            <rect x={8 + i*16} y="19" width="12" height="16" rx="2"
              fill="#060e18" stroke={c} strokeWidth="1"/>
            {/* Port LED */}
            <circle cx={14 + i*16} cy="40" r="2.5"
              fill={c} filter={gf}/>
            {/* Label */}
            <text x={14 + i*16} y="49" textAnchor="middle"
              fontSize="4.5" fill={c} fontFamily="monospace" opacity=".8">
              {iface ? iface.name.replace("Gi0/","G") : `G${i}`}
            </text>
          </g>
        );
      })}

      {/* Port Serial */}
      {(() => {
        const iface = se[0];
        const c = ifaceColor(iface);
        const gf = ifaceGlow(iface);
        return (
          <g>
            {/* Port trapezoidal serial */}
            <rect x="62" y="19" width="13" height="10" rx="1"
              fill="#060e18" stroke={c} strokeWidth="1"/>
            {/* Connecteur serial (D-sub style) */}
            {[0,1,2,3,4].map(j => (
              <circle key={j} cx={64.5+j*2} cy="24" r=".7" fill={c} opacity=".7"/>
            ))}
            <circle cx="68" cy="36" r="2.5" fill={c} filter={gf}/>
            <text x="68.5" y="49" textAnchor="middle"
              fontSize="4.5" fill={c} fontFamily="monospace" opacity=".8">
              {iface ? "Se" : "Se"}
            </text>
          </g>
        );
      })()}

      {/* LED status device */}
      <circle cx="72" cy="14" r="2.5"
        fill={ledColor} filter={led !== "idle" ? "url(#glow-s)" : undefined}/>

      {/* Antenne gauche */}
      <line x1="12" y1="10" x2="8" y2="2"
        stroke={offline ? "#111" : "#1e3a50"} strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="8" cy="2" r="1.5" fill={offline ? "#0a0a0a" : "#0d2035"}
        stroke={offline ? "#111" : "#1e3a50"} strokeWidth="1"/>
      {/* Antenne droite */}
      <line x1="52" y1="10" x2="56" y2="2"
        stroke={offline ? "#111" : "#1e3a50"} strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="56" cy="2" r="1.5" fill={offline ? "#0a0a0a" : "#0d2035"}
        stroke={offline ? "#111" : "#1e3a50"} strokeWidth="1"/>

      {offline && (
        <text x="40" y="32" textAnchor="middle" fontSize="7"
          fill="#f85149" fontWeight="700" fontFamily="monospace">OFFLINE</text>
      )}
    </svg>
  );
}

// ── SWITCH L2 ─────────────────────────────────────────────────────────────────
// Forme: barrette rack 1U avec 8 ports Fa + 1 uplink + LEDs individuelles

export function SwitchIcon({ interfaces = [], led = "idle", offline = false }) {
  const ports   = interfaces.filter(i => i.type === "fastethernet");
  const mgmt    = interfaces.find(i => i.type === "management");
  const ledColor = offline ? "#111" : (LED_COLOR[led] ?? "#1D9E75");
  const chassis  = offline ? "#0a0a0a" : "#0a1a12";
  const border   = offline ? "#1a1a1a" : led !== "idle" ? "#1D9E75" : "#0f2e1e";

  return (
    <svg width="80" height="44" viewBox="0 0 80 44" overflow="visible">
      <GlowDefs/>

      {/* Châssis 1U */}
      <rect x="2" y="6" width="76" height="30" rx="4"
        fill={chassis} stroke={border} strokeWidth="1.2"/>
      <rect x="2" y="6" width="76" height="4" rx="3"
        fill={offline ? "#0a0a0a" : "#0d2018"}/>

      {/* 8 ports Fa */}
      {[0,1,2,3,4,5,6,7].map(i => {
        const iface = ports[i];
        const linked = iface?.linked;
        const c = linked ? PORT_UP : (offline ? "#0d0d0d" : "#0a1e14");
        const gf = linked ? "url(#glow-s)" : undefined;
        return (
          <g key={i}>
            <rect x={5 + i*8} y="13" width="6" height="10" rx="1"
              fill="#060e10" stroke={c} strokeWidth=".8"/>
            {/* LED port */}
            <circle cx={8 + i*8} cy="27" r="1.8"
              fill={c} filter={gf} opacity={offline ? .3 : 1}/>
          </g>
        );
      })}

      {/* Uplink port */}
      <rect x="69" y="11" width="8" height="12" rx="1.5"
        fill="#060e18" stroke={mgmt?.ip ? "#378ADD" : "#0d1e2e"} strokeWidth="1"/>
      <text x="73" y="28" textAnchor="middle"
        fontSize="4" fill="#1a3a50" fontFamily="monospace">UP</text>

      {/* LED status */}
      <circle cx="73" cy="10" r="2.2"
        fill={ledColor} filter={led !== "idle" ? "url(#glow-s)" : undefined}/>

      {/* Port labels */}
      <text x="37" y="38" textAnchor="middle"
        fontSize="4" fill="#0d2018" fontFamily="monospace">
        {ports.filter(p=>p.linked).length}/{ports.length} ports actifs
      </text>

      {offline && (
        <text x="40" y="24" textAnchor="middle" fontSize="7"
          fill="#f85149" fontWeight="700" fontFamily="monospace">OFFLINE</text>
      )}
    </svg>
  );
}

// ── PC ─────────────────────────────────────────────────────────────────────────
// Forme: écran + base + NIC LED

export function PCIcon({ interfaces = [], led = "idle", offline = false }) {
  const nic      = interfaces.find(i => i.type === "fastethernet");
  const ledColor = offline ? "#111" : (LED_COLOR[led] ?? "#1D9E75");
  const nicColor = nic?.ip && nic?.status === "up" ? PORT_UP : PORT_DOWN;
  const monitor  = offline ? "#0a0a0a" : "#0b1520";
  const border   = offline ? "#1a1a1a" : led !== "idle" ? "#378ADD" : "#1e3a50";
  const screen   = offline ? "#060606" : "#080f18";

  return (
    <svg width="68" height="58" viewBox="0 0 68 58" overflow="visible">
      <GlowDefs/>

      {/* Écran */}
      <rect x="4" y="2" width="48" height="36" rx="4"
        fill={monitor} stroke={border} strokeWidth="1.2"/>
      {/* Zone écran */}
      <rect x="8" y="6" width="40" height="26" rx="2" fill={screen}/>

      {/* Contenu écran — prompt CLI glowing si online */}
      {!offline && (
        <>
          <rect x="11" y="10" width="22" height="1.5" rx=".5" fill="#378ADD" opacity=".4"/>
          <rect x="11" y="14" width="30" height="1.5" rx=".5" fill="#378ADD" opacity=".25"/>
          <rect x="11" y="18" width="18" height="1.5" rx=".5" fill="#1D9E75" opacity=".4"/>
          <text x="10" y="27" fontSize="6" fill="#378ADD" opacity=".6" fontFamily="monospace">&gt;_</text>
          {nic?.ip && (
            <text x="10" y="30" fontSize="4.5" fill="#1D9E75" opacity=".5" fontFamily="monospace">
              {nic.ip}
            </text>
          )}
        </>
      )}

      {/* Pied */}
      <rect x="22" y="38" width="12" height="8" rx="1"
        fill={offline ? "#0a0a0a" : "#0d1e2e"}/>
      <rect x="14" y="46" width="28" height="4" rx="2"
        fill={offline ? "#0a0a0a" : "#0d1e2e"}/>

      {/* NIC — à droite de l'écran */}
      <rect x="54" y="10" width="10" height="16" rx="2"
        fill="#060e18" stroke={nicColor} strokeWidth="1"/>
      {/* Pins RJ45 */}
      {[0,1,2,3,4,5,6,7].map(j => (
        <rect key={j} x={55+j*1.1} y="14" width=".8" height="5" rx=".3"
          fill={nicColor} opacity=".6"/>
      ))}
      <text x="59" y="32" textAnchor="middle"
        fontSize="4" fill={nicColor} fontFamily="monospace" opacity=".8">
        {nic ? nic.name : "NIC"}
      </text>

      {/* LED status */}
      <circle cx="52" cy="6" r="2.2"
        fill={ledColor} filter={led !== "idle" ? "url(#glow-s)" : undefined}/>

      {offline && (
        <text x="28" y="22" textAnchor="middle" fontSize="7"
          fill="#f85149" fontWeight="700" fontFamily="monospace">OFFLINE</text>
      )}
    </svg>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
export function DeviceIcon({ type, interfaces, led, offline }) {
  if (type === "router") return <RouterIcon interfaces={interfaces} led={led} offline={offline}/>;
  if (type === "switch") return <SwitchIcon interfaces={interfaces} led={led} offline={offline}/>;
  if (type === "pc")     return <PCIcon     interfaces={interfaces} led={led} offline={offline}/>;
  return null;
}
