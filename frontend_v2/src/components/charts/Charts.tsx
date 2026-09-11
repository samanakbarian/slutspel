/**
 * Små diagram för statistikvyerna.
 *
 * Handritad SVG i stället för Recharts: de här är statiska och små, och
 * Recharts är en stor del av att huvudbundlen ligger över 500 kB. Alla
 * färger kommer från temats tokens, aldrig hårdkodade värden.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';

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
export type JamforelseRad = {
  label: string;
  vanster: number;
  hoger: number;
  format?: (v: number) => string;
  /** Sant för mått där ett lägre tal är bättre, som insläppta mål. */
  lagreArBattre?: boolean;
};

/**
 * Två storheter ställda mot varandra, med sidorna utskrivna.
 *
 * `PairedBar` nedan bär ingen uppgift om vad vänster och höger är — den
 * informationen låg i en not flera rader bort, och samma stapel användes på
 * ett ställe för hemma mot borta och på ett annat för egna skott mot
 * motståndarnas. Ingen kunde läsa det. Här står rubrikerna över staplarna,
 * en gång per grupp.
 *
 * Båda halvorna skalas mot radens största värde, så längden går att jämföra
 * rakt över. Färgen följer sidan, inte vem som leder: att färga den vinnande
 * stapeln gjorde att motståndarens orange lästes som "dåligt" även när det
 * betydde att de var bättre.
 */
export function Jamforelse({
  vanster, hoger, rader,
}: {
  vanster: string;
  hoger: string;
  rader: JamforelseRad[];
}) {
  if (rader.length === 0) return null;
  return (
    <div className="du">
      <div className="du-head">
        <span className="du-us">{vanster}</span>
        <span className="du-them">{hoger}</span>
      </div>
      {rader.map(r => {
        const max = Math.max(Math.abs(r.vanster), Math.abs(r.hoger), 1);
        const fmt = r.format || ((v: number) => String(v));
        const leder = r.lagreArBattre ? r.vanster < r.hoger : r.vanster > r.hoger;
        return (
          <div className="du-row" key={r.label}>
            <span className={`du-val${leder ? ' du-lead' : ''}`}>{fmt(r.vanster)}</span>
            <span className="du-track">
              <span className="du-half du-left">
                <i style={{ width: `${(Math.abs(r.vanster) / max) * 100}%` }} />
              </span>
              <span className="du-label">{r.label}</span>
              <span className="du-half du-right">
                <i style={{ width: `${(Math.abs(r.hoger) / max) * 100}%` }} />
              </span>
            </span>
            <span className={`du-val du-valr${!leder ? ' du-lead' : ''}`}>{fmt(r.hoger)}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * En andel med 50-procentsmarkering.
 *
 * Ett procenttal ensamt säger inte om det är bra. Med strecket vid jämnt
 * syns det direkt åt vilket håll laget ligger, och hur mycket.
 */
export function Andel({ pct, label }: { pct: number; label: string }) {
  const klamd = Math.max(0, Math.min(100, pct));
  return (
    <div className="an">
      <div className="an-head">
        <span>{label}</span>
        <b className={pct >= 50 ? 'an-over' : 'an-under'}>
          {pct.toFixed(1).replace('.', ',')} %
        </b>
      </div>
      <div className="an-track">
        <span className="an-fill" style={{ width: `${klamd}%` }} />
        <span className="an-mid" aria-hidden="true" />
      </div>
      <div className="an-axel"><span>0</span><span>50</span><span>100</span></div>
    </div>
  );
}

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
const FD_LABELS: Record<string, string> = { W: 'Vinst', L: 'Förlust', OTW: 'ÖT-vinst', OTL: 'ÖT-förlust', D: 'Oavgjort' };

export function FormDots({ results }: { results: string[] }) {
  if (results.length === 0) return null;
  const w = results.filter(r => r === 'W').length;
  const otw = results.filter(r => r === 'OTW').length;
  const otl = results.filter(r => r === 'OTL').length;
  const l = results.filter(r => r === 'L').length;
  return (
    <div className="fd-wrap">
      {results.map((r, i) => <span key={i} className={`fd-dot fd-${r.toLowerCase()}`} aria-label={FD_LABELS[r] ?? r} title={FD_LABELS[r] ?? r} />)}
      <span className="fd-text">{w} V · {otw} ÖV · {otl} ÖF · {l} F</span>
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
  wideLabels = false,
}: {
  rows: { key: string; label: string; sub?: ReactNode; left: number; right: number }[];
  leftLabel: string;
  rightLabel: string;
  /** Bredare etikettkolumn. Personnamn ryms inte i den som räcker för "Femma 1". */
  wideLabels?: boolean;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(1, ...rows.flatMap(r => [r.left, r.right]));
  return (
    <div className={`tor${wideLabels ? ' tor-wide' : ''}`}>
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
          {/* Noll får inget plustecken — "+0" är inte ett tal någon skriver. */}
          <div className="tor-diff">{r.right - r.left > 0 ? '+' : ''}{r.right - r.left}</div>
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
  height = 210,
}: {
  rounds: number[];
  teams: { team: string; ranks: (number | null)[]; short: string; finalRank: number; ours: boolean }[];
  teamCount?: number;
  height?: number;
}) {
  // Hovrad omgång, eller null för "ingen". Krysshåret är det enda sättet att
  // läsa av en enskild omgång i en kurva med 52 punkter.
  const [vald, setVald] = useState<number | null>(null);

  if (rounds.length < 2 || teams.length === 0) return null;

  // Smal viewBox med flit: samma textstorlek i SVG-enheter blir fler faktiska
  // pixlar när bilden skalas till ~340 px på en telefon.
  const W = 360;
  const L = 22, R = 74, T = 12, B = 30;
  const plotW = W - L - R;
  const plotH = height - T - B;

  // Skalan sätts av var lagen ligger när tabellen börjat betyda något, inte av
  // de två första omgångarna. Ett lag som spelat EN match kan stå på plats 12
  // utan att det säger något, och den enda punkten tvingade annars ner axeln
  // till 12 — varpå halva ytan stod tom. Punkten ritas ändå: kurvan går ur bild
  // i underkanten och tillbaka, vilket är sant och syns.
  const SATTNING = 2;
  const efter = teams.flatMap(t => t.ranks.slice(SATTNING).filter((r): r is number => r != null));
  const alla = teams.flatMap(t => t.ranks.filter((r): r is number => r != null));
  const max = Math.min(teamCount, Math.max(4, ...(efter.length ? efter : alla)));

  const x = (n: number) => L + (n / (rounds.length - 1)) * plotW;
  const y = (rank: number) => T + ((rank - 1) / Math.max(1, max - 1)) * plotH;

  // Rutnätet ska gå att räkna, inte läsas av.
  const guides = Array.from(new Set([1, Math.round((1 + max) / 2), max]));
  const ticks = Array.from(new Set([0, Math.floor((rounds.length - 1) / 3),
    Math.floor(((rounds.length - 1) * 2) / 3), rounds.length - 1]));

  // Etiketterna får inte lägga sig på varandra när två lag slutar intill
  // varandra. De hålls isär med minsta radavstånd, i slutplaceringens ordning.
  const sorterade = [...teams].sort((a, b) => a.finalRank - b.finalRank);
  const LINJE = 11;
  const etiketter: { t: (typeof teams)[number]; y: number }[] = [];
  for (const t of sorterade) {
    const onskad = y(t.finalRank);
    const forra = etiketter[etiketter.length - 1];
    etiketter.push({ t, y: forra ? Math.max(onskad, forra.y + LINJE) : onskad });
  }

  const las = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const enhet = ((e.clientX - box.left) / box.width) * W;
    const n = Math.round(((enhet - L) / plotW) * (rounds.length - 1));
    setVald(n >= 0 && n < rounds.length ? n : null);
  };

  return (
    <>
      <svg
        className="rl"
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        onPointerMove={las}
        onPointerDown={las}
        onPointerLeave={() => setVald(null)}
        aria-label={`Tabellplacering per omgång. ${teams
          .map(t => `${t.team} slutade ${t.finalRank}:a`)
          .join('. ')}.`}
      >
        <defs>
          <clipPath id="rl-yta">
            <rect x={L} y={T - 2} width={plotW} height={plotH + 4} />
          </clipPath>
        </defs>
        {guides.map(g => (
          <line key={g} className="rl-grid" x1={L} y1={y(g)} x2={L + plotW} y2={y(g)} />
        ))}
        {guides.map(g => (
          <text key={`t${g}`} className="rl-tick" x={L - 5} y={y(g) + 3} textAnchor="end">{g}</text>
        ))}
        {ticks.map(n => (
          <text key={`x${n}`} className="rl-tick" x={x(n)} y={T + plotH + 13} textAnchor="middle">
            {rounds[n]}
          </text>
        ))}
        <text className="rl-tick" x={L + plotW / 2} y={T + plotH + 25} textAnchor="middle">Omgång</text>

        {vald != null && (
          <line className="rl-kryss" x1={x(vald)} y1={T} x2={x(vald)} y2={T + plotH} />
        )}

        {/* Kontexten först, vårt lag sist: accenten ska ligga överst där de korsar. */}
        <g clipPath="url(#rl-yta)">
        {[...teams].sort((a, b) => Number(a.ours) - Number(b.ours)).map(t => {
          const pts = t.ranks
            .map((r, n) => (r == null ? null : `${x(n).toFixed(1)},${y(r).toFixed(1)}`))
            .filter(Boolean)
            .join(' ');
          return (
            <polyline
              key={t.team}
              className={t.ours ? 'rl-series rl-ours' : 'rl-series rl-context'}
              points={pts}
            />
          );
        })}
        </g>

        {vald != null && sorterade.map(t => {
          const r = t.ranks[vald];
          if (r == null || r > max) return null;
          return (
            <circle
              key={`p${t.team}`}
              className={t.ours ? 'rl-dot rl-dot-ours' : 'rl-dot'}
              cx={x(vald)}
              cy={y(r)}
              r={t.ours ? 3.4 : 2.4}
            />
          );
        })}

        {/* Direktetiketter i textfärg, med en prick som bär identiteten. */}
        {etiketter.map(({ t, y: ly }) => (
          <g key={`l${t.team}`}>
            <circle
              className={t.ours ? 'rl-dot rl-dot-ours' : 'rl-dot'}
              cx={L + plotW + 7}
              cy={ly - 2.5}
              r={2.6}
            />
            <text
              className={t.ours ? 'rl-end rl-end-ours' : 'rl-end'}
              x={L + plotW + 13}
              y={ly + 1}
            >
              {t.finalRank} {t.short}
            </text>
          </g>
        ))}
      </svg>

      {/* Avläsningen ligger i en fast rad under diagrammet i stället för i en
          svävande ruta. På en telefon hamnar en tooltip antingen under fingret
          eller utanför kortet; den här raden gör varken. */}
      <div className="rl-avlas" aria-live="polite">
        {vald == null ? (
          <span className="rl-avlas-tom">Dra för att läsa av en omgång.</span>
        ) : (
          <>
            <b>Omgång {rounds[vald]}</b>
            {sorterade.map(t => (
              <span key={`a${t.team}`} className={t.ours ? 'rl-avlas-ours' : undefined}>
                <i className={t.ours ? 'rl-swatch rl-swatch-ours' : 'rl-swatch'} />
                {t.short} {t.ranks[vald] ?? '–'}
              </span>
            ))}
          </>
        )}
      </div>
    </>
  );
}
