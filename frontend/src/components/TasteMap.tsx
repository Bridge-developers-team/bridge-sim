import { QUADRANT_LABEL, type Quadrant, type RankedTaste } from "../lib/tasting";

const W = 360;
const H = 300;
const PAD = { left: 30, right: 12, top: 12, bottom: 30 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

/** Where each tasted career lands: skill (rubric share) across, energy up.
 * Quadrant lines sit at the thresholds lib/tasting.ts uses, so the picture
 * and the recommendation can never disagree. */
export function TasteMap({ tastes, skillHigh, energyHigh }: { tastes: RankedTaste[]; skillHigh: number; energyHigh: number }) {
  // Points use the inner 84% of each axis, so a perfect score or a 5 never
  // sits on the frame or under a corner label. Thresholds use the same scale.
  const INSET = 0.08;
  const x = (skill: number) => PAD.left + (INSET + skill * (1 - 2 * INSET)) * plotW;
  const y = (energy: number) => PAD.top + (1 - (INSET + ((energy - 1) / 4) * (1 - 2 * INSET))) * plotH;
  const midX = x(skillHigh);
  const midY = y(energyHigh - 0.5); // between "It's fine" and "I'd like it"
  const corner = (q: Quadrant, anchor: "start" | "end", tx: number, ty: number) => (
    <text x={tx} y={ty} className={`tm-q tm-q--${q}`} textAnchor={anchor}>
      {QUADRANT_LABEL[q].toUpperCase()}
    </text>
  );

  return (
    <svg className="taste-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="taste-map-title">
      <title id="taste-map-title">
        {`Taste Map: ${tastes.map((t) => `${t.title} in ${QUADRANT_LABEL[t.quadrant]}`).join(", ")}`}
      </title>
      <rect className="tm-zone tm-zone--grow" x={PAD.left} y={PAD.top} width={midX - PAD.left} height={midY - PAD.top} />
      <rect className="tm-zone tm-zone--thrive" x={midX} y={PAD.top} width={PAD.left + plotW - midX} height={midY - PAD.top} />
      <rect className="tm-zone tm-zone--skip" x={PAD.left} y={midY} width={midX - PAD.left} height={PAD.top + plotH - midY} />
      <rect className="tm-zone tm-zone--trap" x={midX} y={midY} width={PAD.left + plotW - midX} height={PAD.top + plotH - midY} />
      <rect className="tm-frame" x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
      <line className="tm-mid" x1={midX} y1={PAD.top} x2={midX} y2={PAD.top + plotH} />
      <line className="tm-mid" x1={PAD.left} y1={midY} x2={PAD.left + plotW} y2={midY} />
      {corner("grow", "start", PAD.left + 8, PAD.top + 18)}
      {corner("thrive", "end", PAD.left + plotW - 8, PAD.top + 18)}
      {corner("skip", "start", PAD.left + 8, PAD.top + plotH - 8)}
      {corner("trap", "end", PAD.left + plotW - 8, PAD.top + plotH - 8)}
      {tastes.map((t, i) => {
        const cx = x(t.skill);
        // Nudge points that share a spot so every dot and label stays readable.
        const cy = y(t.energy) + (tastes.slice(0, i).filter((o) => o.energy === t.energy && Math.abs(o.skill - t.skill) < 0.12).length * 22);
        const anchor = cx > PAD.left + plotW * 0.62 ? "end" : cx < PAD.left + plotW * 0.38 ? "start" : "middle";
        return (
          <g key={t.careerId}>
            <circle className={`tm-dot tm-dot--${t.quadrant}`} cx={cx} cy={cy} r={7} />
            <text className="tm-label" x={cx} y={cy - 12 < PAD.top + 26 ? cy + 22 : cy - 12} textAnchor={anchor}>
              {t.title}
            </text>
          </g>
        );
      })}
      <text className="tm-axis" x={PAD.left + plotW / 2} y={H - 8} textAnchor="middle">
        Skill: rubric score
      </text>
      <text className="tm-axis" x={12} y={PAD.top + plotH / 2} textAnchor="middle" transform={`rotate(-90 12 ${PAD.top + plotH / 2})`}>
        Energy: on a Tuesday?
      </text>
    </svg>
  );
}
