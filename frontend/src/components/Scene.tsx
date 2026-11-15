/** Simple, friendly cartoon scenes for the job introduction: a big-headed
 * figure and a few props, in the brand's navy, gold and ivory. One scene
 * per slide kind, the same for every job, so they stay light and honest
 * (decoration, not facts). */
export type SceneKind = "hello" | "tasks" | "day" | "tools" | "balance" | "pay" | "start";

const NAVY = "var(--scene-ink)";
const GOLD = "var(--scene-gold)";
const SKIN = "var(--scene-skin)";
const PAPER = "var(--scene-paper)";
const SOFT = "var(--scene-soft)";

function Person({ x, y, wave = false, look = 0 }: { x: number; y: number; wave?: boolean; look?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="scene__person">
      <rect x="-26" y="34" width="52" height="58" rx="22" fill={NAVY} />
      <rect x="-26" y="34" width="52" height="16" rx="8" fill={GOLD} opacity="0.9" />
      <circle cx="0" cy="8" r="30" fill={SKIN} stroke={NAVY} strokeWidth="3" />
      <path d="M-30 2 C-26 -26 26 -30 31 -2 C18 -12 -10 -14 -30 2Z" fill={NAVY} />
      <circle cx={-10 + look} cy="10" r="3.4" fill={NAVY} />
      <circle cx={10 + look} cy="10" r="3.4" fill={NAVY} />
      <path d={`M${-8 + look} 21 Q${look} 28 ${8 + look} 21`} stroke={NAVY} strokeWidth="3" fill="none" strokeLinecap="round" />
      {wave ? (
        <path className="scene__wave" d="M24 48 L50 18" stroke={NAVY} strokeWidth="10" strokeLinecap="round" />
      ) : (
        <path d="M24 50 L40 72" stroke={NAVY} strokeWidth="10" strokeLinecap="round" />
      )}
      <path d="M-24 50 L-40 72" stroke={NAVY} strokeWidth="10" strokeLinecap="round" />
    </g>
  );
}

function Props({ kind }: { kind: SceneKind }) {
  switch (kind) {
    case "hello":
      return (
        <g>
          <rect x="150" y="96" width="120" height="70" rx="10" fill={PAPER} stroke={NAVY} strokeWidth="3" />
          <path d="M168 120h84M168 136h60M168 152h72" stroke={SOFT} strokeWidth="6" strokeLinecap="round" />
          <circle className="scene__pop" cx="250" cy="70" r="16" fill={GOLD} />
          <path d="M243 70l5 5 9-10" stroke={NAVY} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case "tasks":
      return (
        <g>
          <rect x="150" y="40" width="110" height="140" rx="12" fill={PAPER} stroke={NAVY} strokeWidth="3" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i} className="scene__pop" style={{ animationDelay: `${0.15 * i}s` }}>
              <rect x="164" y={58 + i * 30} width="16" height="16" rx="4" fill={i < 2 ? GOLD : "none"} stroke={NAVY} strokeWidth="2.5" />
              <path d={`M188 ${66 + i * 30}h56`} stroke={SOFT} strokeWidth="6" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    case "day":
      return (
        <g>
          <path d="M150 170 A70 70 0 0 1 290 170" stroke={SOFT} strokeWidth="6" fill="none" strokeDasharray="4 10" strokeLinecap="round" />
          <g className="scene__orbit">
            <circle cx="220" cy="100" r="18" fill={GOLD} />
          </g>
          <circle cx="160" cy="70" r="5" fill={GOLD} opacity="0.6" />
          <circle cx="282" cy="60" r="4" fill={GOLD} opacity="0.5" />
        </g>
      );
    case "tools":
      return (
        <g>
          <rect x="146" y="92" width="130" height="80" rx="10" fill={NAVY} />
          <rect x="154" y="100" width="114" height="60" rx="6" fill={PAPER} />
          <path className="scene__bars" d="M168 150v-16M186 150v-28M204 150v-20M222 150v-36M240 150v-24" stroke={GOLD} strokeWidth="10" strokeLinecap="round" />
          <rect x="132" y="172" width="158" height="10" rx="5" fill={NAVY} />
          <circle className="scene__pop" cx="270" cy="62" r="18" fill="none" stroke={NAVY} strokeWidth="5" />
          <path d="M283 75l14 14" stroke={NAVY} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case "balance":
      return (
        <g className="scene__tilt">
          <path d="M215 60v110M170 176h90" stroke={NAVY} strokeWidth="6" strokeLinecap="round" />
          <path d="M160 80h110" stroke={NAVY} strokeWidth="6" strokeLinecap="round" />
          <path d="M160 80l-22 44h44zM270 80l-22 44h44z" fill={PAPER} stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="160" cy="112" r="10" fill={GOLD} />
          <path d="M262 110h16" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case "pay":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} className="scene__pop" style={{ animationDelay: `${0.15 * i}s` }}>
              <ellipse cx={180 + i * 34} cy={170 - i * 22} rx="26" ry="9" fill={GOLD} stroke={NAVY} strokeWidth="3" />
              <rect x={154 + i * 34} y={150 - i * 22} width="52" height="20" fill={GOLD} />
              <ellipse cx={180 + i * 34} cy={150 - i * 22} rx="26" ry="9" fill={GOLD} stroke={NAVY} strokeWidth="3" />
            </g>
          ))}
          <path d="M150 74l40-26 30 18 46-34" stroke={NAVY} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "start":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <rect key={i} className="scene__pop" style={{ animationDelay: `${0.12 * i}s` }} x={150 + i * 42} y={150 - i * 34} width="44" height={30 + i * 34} rx="6" fill={i === 2 ? GOLD : PAPER} stroke={NAVY} strokeWidth="3" />
          ))}
          <path d="M264 66V30l22 10-22 10" fill={GOLD} stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        </g>
      );
  }
}

export function Scene({ kind }: { kind: SceneKind }) {
  return (
    <svg className="scene" viewBox="0 0 320 200" role="img" aria-hidden="true" focusable="false">
      <ellipse cx="160" cy="186" rx="150" ry="10" fill={SOFT} opacity="0.5" />
      <Props kind={kind} />
      <Person x={84} y={86} wave={kind === "hello" || kind === "start"} look={kind === "day" ? 3 : 2} />
    </svg>
  );
}
