/**
 * Små diagram för statistikvyerna.
 *
 * Handritad SVG i stället för Recharts: de här är statiska och små, och
 * Recharts är en stor del av att huvudbundlen ligger över 500 kB. Alla
 * färger kommer från temats tokens, aldrig hårdkodade värden.
 */

type Point = { label: string; value: number };

/**
 * Linjediagram med utsatta axelvärden.
 *
 * En kurva utan skala säger bara "det går uppåt". Med lägsta och högsta värde
 * på y-axeln, en mittlinje och datum i båda ändarna går det att läsa av vad
 * den faktiskt visar.
 */
export function Sparkline({
  points,
  height = 96,
  colour = 'var(--brand-green-light)',
  fill = 'rgba(66, 216, 131, 0.14)',
  format = (v: number) => String(v),
  unit = '',
  guide,
  guideLabel,
}: {
  points: Point[];
  height?: number;
  colour?: string;
  fill?: string;
  format?: (v: number) => string;
  /** Sätts ut efter sista värdet, t.ex. "%" eller "p". */
  unit?: string;
  /**
   * Streckad referenskurva på samma skala, lika lång som `points`. Används
   * för takt: en poängkurva utan referens ser alltid ut att gå uppåt.
   */
  guide?: number[];
  guideLabel?: string;
}) {
  if (points.length < 2) return null;

  const W = 300;
  // Plats åt y-värdena till vänster och åt sista värdet till höger.
  const LEFT = 34;
  const RIGHT = 8;
  const TOP = 10;
  const BOTTOM = height - 16;

  const values = points.map(p => p.value).concat(guide || []);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // En rak linje har inget spann; ge den ändå en axel att stå på.
  const min = rawMin === rawMax ? rawMin - 1 : rawMin;
  const max = rawMin === rawMax ? rawMax + 1 : rawMax;
  const span = max - min;
  const mid = (min + max) / 2;

  const x = (i: number) => LEFT + (i / (points.length - 1)) * (W - LEFT - RIGHT);
  const y = (v: number) => BOTTOM - ((v - min) / span) * (BOTTOM - TOP);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${BOTTOM} L${x(0).toFixed(1)},${BOTTOM} Z`;
  const last = points[points.length - 1];
  const middle = points[Math.floor((points.length - 1) / 2)];

  const gridlines: { v: number; label: string }[] = [
    { v: max, label: format(rawMax) },
    { v: mid, label: rawMin === rawMax ? '' : format(Number(((rawMin + rawMax) / 2).toFixed(2))) },
    { v: min, label: format(rawMin) },
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={`Från ${format(points[0].value)} den ${points[0].label} till ${format(last.value)} den ${last.label}. Lägsta ${format(rawMin)}, högsta ${format(rawMax)}.`}
    >
      {gridlines.map((g, i) => (
        <g key={i}>
          <line
            x1={LEFT} y1={y(g.v)} x2={W - RIGHT} y2={y(g.v)}
            stroke="rgba(150,185,168,0.14)"
            strokeWidth="1"
            strokeDasharray={i === 1 ? '3 3' : undefined}
          />
          {g.label && (
            <text x={LEFT - 5} y={y(g.v) + 3} fill="var(--text-muted)" fontSize="8.5"
                  fontFamily="monospace" textAnchor="end">{g.label}</text>
          )}
        </g>
      ))}

      {guide && guide.length === points.length && (
        <path
          d={guide.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
          fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeDasharray="4 3"
        />
      )}
      {guide && guideLabel && guide.length === points.length && (
        <text x={W - RIGHT} y={Math.max(y(guide[guide.length - 1]) - 4, TOP + 2)}
              fill="var(--text-muted)" fontSize="8.5" fontFamily="monospace" textAnchor="end">
          {guideLabel}
        </text>
      )}

      <path d={area} fill={fill} stroke="none" />
      <path d={line} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill={colour} />

      {/* Sista värdet skrivs ut — det är det man vill veta först. */}
      <text
        x={Math.min(x(points.length - 1) + 6, W - 2)}
        y={Math.max(y(last.value) - 6, TOP + 2)}
        fill={colour} fontSize="9.5" fontWeight="700" fontFamily="monospace" textAnchor="end"
      >
        {format(last.value)}{unit}
      </text>

      <text x={LEFT} y={height - 3} fill="var(--text-muted)" fontSize="8.5" fontFamily="monospace">{points[0].label}</text>
      {points.length > 4 && (
        <text x={x(Math.floor((points.length - 1) / 2))} y={height - 3} fill="var(--text-muted)"
              fontSize="8.5" fontFamily="monospace" textAnchor="middle">{middle.label}</text>
      )}
      <text x={W - RIGHT} y={height - 3} fill="var(--text-muted)" fontSize="8.5"
            fontFamily="monospace" textAnchor="end">{last.label}</text>
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

/**
 * Tornadostapel: två mått åt var sitt håll från en mittlinje.
 *
 * Formen bär betydelsen — sidan om axeln säger vilket mått det är — så
 * färgen är sekundär. Talen står utsatta, för på en telefon finns ingen
 * hovring att läsa av dem med.
 */
export function Tornado({
  rows,
  leftLabel,
  rightLabel,
}: {
  rows: { key: string; label: string; sub?: string; left: number; right: number }[];
  leftLabel: string;
  rightLabel: string;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(1, ...rows.flatMap(r => [r.left, r.right]));
  return (
    <div className="tor">
      <div className="tor-legend">
        <span><i style={{ background: 'var(--data-for)' }} />{rightLabel}</span>
        <span><i style={{ background: 'var(--data-against)' }} />{leftLabel}</span>
      </div>
      {rows.map(r => (
        <div className="tor-row" key={r.key}>
          <div className="tor-name"><b>{r.label}</b></div>
          <div className="tor-bars">
            <div className="tor-half tor-left">
              <span className="tor-val">{r.left}</span>
              <i style={{ width: `${(r.left / max) * 100}%`, background: 'var(--data-against)' }} />
            </div>
            <div className="tor-axis" />
            <div className="tor-half">
              <i style={{ width: `${(r.right / max) * 100}%`, background: 'var(--data-for)' }} />
              <span className="tor-val">{r.right}</span>
            </div>
          </div>
          <div className="tor-diff">{r.right - r.left >= 0 ? '+' : ''}{r.right - r.left}</div>
          {/* Namnen under staplarna i stället för bredvid: i etikettkolumnen
              tvingade de raden till tre rader och kastade staplarna ur linje. */}
          {r.sub && <div className="tor-sub">{r.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/**
 * Placering per omgång för flera lag.
 *
 * Y-axeln är vänd: plats 1 överst, som i en tabell. Varje serie får en
 * etikett vid sin högerände, så färgen aldrig är enda sättet att veta
 * vilket lag som är vilket.
 */
export function RankLines({
  rounds,
  teams,
  teamCount = 14,
  height = 200,
}: {
  rounds: number[];
  teams: { team: string; ranks: (number | null)[]; colour: string; short: string; finalRank: number }[];
  teamCount?: number;
  height?: number;
}) {
  if (rounds.length < 2 || teams.length === 0) return null;
  // Smal viewBox med flit: samma textstorlek i SVG-enheter blir fler faktiska
  // pixlar nar bilden skalas till ~340 px pa en telefon.
  const W = 360;
  const L = 26, R = 62, T = 14, B = 34;
  const plotW = W - L - R;
  const plotH = height - T - B;
  const x = (i: number) => L + (i / (rounds.length - 1)) * plotW;
  const y = (rank: number) => T + ((rank - 1) / Math.max(1, teamCount - 1)) * plotH;

  const guides = [1, 4, 8, teamCount].filter((v, i, a) => a.indexOf(v) === i);
  const ticks = [0, Math.floor(rounds.length / 4), Math.floor(rounds.length / 2),
                 Math.floor((rounds.length * 3) / 4), rounds.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg
      className="rl"
      viewBox={`0 0 ${W} ${height + 16}`}
      role="img"
      aria-label={`Tabellplacering per omgång. ${teams
        .map(t => `${t.team} slutade ${t.finalRank}:a`)
        .join('. ')}.`}
    >
      {guides.map(g => (
        <line key={g} className="rl-grid" x1={L} y1={y(g)} x2={L + plotW} y2={y(g)} />
      ))}
      <line className="rl-axis" x1={L} y1={T} x2={L} y2={T + plotH} />
      {guides.map(g => (
        <text key={`t${g}`} className="rl-tick" x={L - 5} y={y(g) + 3} textAnchor="end">{g}</text>
      ))}
      {ticks.map(i => (
        <text key={`x${i}`} className="rl-tick" x={x(i)} y={T + plotH + 14} textAnchor="middle">
          {rounds[i]}
        </text>
      ))}
      <text className="rl-tick" x={L + plotW / 2} y={T + plotH + 26} textAnchor="middle">Omgång</text>

      {teams.map(t => {
        const pts = t.ranks
          .map((r, i) => (r == null ? null : `${x(i).toFixed(1)},${y(r).toFixed(1)}`))
          .filter(Boolean)
          .join(' ');
        return <polyline key={t.team} className="rl-series" stroke={t.colour} points={pts} />;
      })}

      {teams.map(t => (
        <text
          key={`l${t.team}`}
          className="rl-end"
          x={L + plotW + 7}
          y={y(t.finalRank) + 3}
          fill={t.colour}
        >
          {t.finalRank} {t.short}
        </text>
      ))}
    </svg>
  );
}
