/**
 * Små diagram för statistikvyerna.
 *
 * Handritad SVG i stället för Recharts: de här är statiska och små, och
 * Recharts är en stor del av att huvudbundlen ligger över 500 kB. Alla
 * färger kommer från temats tokens, aldrig hårdkodade värden.
 */

type Point = { label: string; value: number };

/** Linje med ytfyllnad och markerad slutpunkt. */
export function Sparkline({
  points,
  height = 64,
  colour = 'var(--brand-green-light)',
  fill = 'rgba(66, 216, 131, 0.14)',
  format = (v: number) => String(v),
}: {
  points: Point[];
  height?: number;
  colour?: string;
  fill?: string;
  format?: (v: number) => string;
}) {
  if (points.length < 2) return null;

  const W = 280;
  const PAD = 6;
  const TOP = 8;
  const BOTTOM = height - 16;

  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => BOTTOM - ((v - min) / span) * (BOTTOM - TOP);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${BOTTOM} L${x(0).toFixed(1)},${BOTTOM} Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img"
      aria-label={`Utveckling från ${format(points[0].value)} till ${format(last.value)}`}>
      <line x1={PAD} y1={BOTTOM} x2={W - PAD} y2={BOTTOM} stroke="rgba(150,185,168,0.16)" strokeWidth="1" />
      <path d={area} fill={fill} stroke="none" />
      <path d={line} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill={colour} />
      <text x={PAD} y={height - 2} fill="var(--text-muted)" fontSize="8" fontFamily="monospace">{points[0].label}</text>
      <text x={W - PAD} y={height - 2} fill="var(--text-muted)" fontSize="8" fontFamily="monospace" textAnchor="end">{last.label}</text>
    </svg>
  );
}

/** Percentilstapel — var spelaren står mot ligan. */
export function PercentileBar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const tone =
    value >= 75 ? 'var(--impact-positive)'
      : value >= 45 ? 'var(--brand-gold)'
        : 'var(--impact-negative)';
  return (
    <div className="pc-row">
      <span className="pc-label">{label}</span>
      <span className="pc-track" role="img" aria-label={`${label}: percentil ${value} av 100`}>
        <span className="pc-fill" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: tone }} />
      </span>
      <span className="pc-value" style={{ color: tone }}>{value}</span>
      {hint && <span className="pc-hint">{hint}</span>}
    </div>
  );
}

/** Två värden mot varandra, t.ex. hemma mot borta. */
export function PairedBar({
  label, left, right, leftLabel, rightLabel,
}: { label: string; left: number; right: number; leftLabel?: string; rightLabel?: string }) {
  const total = Math.max(left + right, 1);
  return (
    <div className="pb-row">
      <div className="pb-head">
        <b>{leftLabel ?? left}</b>
        <span>{label}</span>
        <b>{rightLabel ?? right}</b>
      </div>
      <div className="pb-track">
        <span style={{ flex: Math.max(left, 0.04 * total), background: 'var(--brand-green)' }} />
        <span style={{ flex: Math.max(right, 0.04 * total), background: 'rgba(255,255,255,0.14)' }} />
      </div>
    </div>
  );
}

/**
 * Mål för och mot per period eller intervall.
 *
 * Siffrorna står under staplarna i stället för i en title: på en telefon
 * finns ingen hovring, och en stapel utan tal går inte att läsa av.
 */
export function PeriodBars({ periods }: { periods: { label: string; gf: number; ga: number }[] }) {
  if (periods.length === 0) return null;
  const max = Math.max(1, ...periods.flatMap(p => [p.gf, p.ga]));
  return (
    <div className="pd-wrap">
      {periods.map(p => {
        const diff = p.gf - p.ga;
        return (
          <div key={p.label} className="pd-col">
            <span
              className="pd-bars"
              role="img"
              aria-label={`${p.label}: ${p.gf} gjorda mål, ${p.ga} insläppta`}
            >
              <span className="pd-bar pd-gf" style={{ height: `${(p.gf / max) * 100}%` }} />
              <span className="pd-bar pd-ga" style={{ height: `${(p.ga / max) * 100}%` }} />
            </span>
            <span className="pd-label">{p.label}</span>
            <span className="pd-nums">
              <b className="pd-numgf">{p.gf}</b>
              <b className="pd-numga">{p.ga}</b>
            </span>
            <span className={`pd-diff${diff > 0 ? ' pd-plus' : diff < 0 ? ' pd-minus' : ''}`}>
              {diff > 0 ? `+${diff}` : diff}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Formprickar: senaste matcherna som färgade punkter. */
export function FormDots({ results }: { results: string[] }) {
  if (results.length === 0) return null;
  const w = results.filter(r => r === 'W').length;
  const l = results.filter(r => r === 'L').length;
  const o = results.filter(r => r === 'OTL' || r === 'OTW').length;
  return (
    <div className="fd-wrap">
      {results.map((r, i) => <span key={i} className={`fd-dot fd-${r.toLowerCase()}`} title={r} />)}
      <span className="fd-text">{w}V–{l}F{o > 0 ? `–${o}ÖT` : ''}</span>
    </div>
  );
}
