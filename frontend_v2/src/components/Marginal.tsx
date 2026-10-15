import { useState } from 'react';

/**
 * Lövens poäng omgång för omgång mot laget på en viss placering — som
 * standard kvalplatsen. Ytan mellan linjerna är marginalen, och den är det
 * man faktiskt följer: "åtta poäng ner till strecket".
 *
 * Linjen för placeringen följer platsen, inte ett lag: efter omgång tre kan
 * det vara Timrå som står trettonde, efter omgång fyra Linköping.
 */
type Lag = { team: string; is_bjk: boolean; ranks: (number | null)[]; points_by_round?: (number | null)[] };

const PLATSER = [
  { plats: 13, namn: 'Kvalplatsen', kort: '13:e' },
  { plats: 10, namn: 'Sista play in-platsen', kort: '10:e' },
  { plats: 6, namn: 'Sista kvartsfinalplatsen', kort: '6:e' },
];

export function Marginal({ rounds, teams }: { rounds: number[]; teams: Lag[] }) {
  const [plats, setPlats] = useState(13);
  const vi = teams.find(t => t.is_bjk);
  if (!vi?.points_by_round || rounds.length < 2 || teams.length < plats) return null;

  const vara = rounds.map((_, i) => vi.points_by_round![i] ?? null);
  const deras = rounds.map((_, i) => {
    const t = teams.find(x => x.ranks[i] === plats);
    return t?.points_by_round?.[i] ?? null;
  });
  if (vara.some(v => v === null) || deras.some(v => v === null)) return null;
  const v = vara as number[], d = deras as number[];

  // Ritytan. Smal viewBox, så texten blir stor nog när bilden skalas till en telefon.
  const W = 340, H = 190, L = 26, R = 30, T = 14, B = 26;
  const max = Math.max(3, ...v, ...d);
  const x = (i: number) => L + (rounds.length === 1 ? 0 : (i / (rounds.length - 1)) * (W - L - R));
  const y = (p: number) => T + (1 - p / max) * (H - T - B);
  const linje = (s: number[]) => s.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  // Ytan mellan linjerna: fram längs vår, tillbaka längs deras.
  const yta = `${linje(v)} ${[...d].reverse().map((p, i) => `L${x(d.length - 1 - i).toFixed(1)},${y(p).toFixed(1)}`).join(' ')} Z`;
  const steg = max <= 12 ? 3 : max <= 30 ? 5 : 10;
  const nu = v[v.length - 1] - d[d.length - 1];
  const vald = PLATSER.find(p => p.plats === plats)!;

  return (
    <section className="mc-card">
      <p className="mc-kicker">Marginalen</p>
      <h2 className="mc-title">
        {nu > 0 ? `${nu} poäng över ${vald.namn.toLowerCase()}` : nu < 0 ? `${-nu} poäng under ${vald.namn.toLowerCase()}` : `Lika med ${vald.namn.toLowerCase()}`}
      </h2>
      <div className="mg-val" role="group" aria-label="Jämför med placering">
        {PLATSER.map(p => (
          <button key={p.plats} type="button" className="opp-chip" aria-pressed={plats === p.plats} onClick={() => setPlats(p.plats)}>
            {p.kort}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mg-svg" role="img"
        aria-label={`Björklöven ${v[v.length - 1]} poäng, ${vald.namn.toLowerCase()} ${d[d.length - 1]} poäng efter ${rounds.length} omgångar`}>
        {Array.from({ length: Math.floor(max / steg) + 1 }, (_, k) => k * steg).map(p => (
          <g key={p}>
            <line x1={L} x2={W - R} y1={y(p)} y2={y(p)} className="mg-grid" />
            <text x={L - 6} y={y(p) + 3} className="mg-axel" textAnchor="end">{p}</text>
          </g>
        ))}
        <path d={yta} className={nu >= 0 ? 'mg-yta' : 'mg-yta mg-yta-neg'} />
        <path d={linje(d)} className="mg-deras" />
        <path d={linje(v)} className="mg-vara" />
        {v.map((p, i) => <circle key={`v${i}`} cx={x(i)} cy={y(p)} r={2.6} className="mg-punkt" />)}
        {/* Marginalen skrivs ut vid varannan omgång och den sista, och bara där det
            finns plats mellan linjerna — annars hamnar siffran på punkten. */}
        {v.map((p, i) => (i % 2 === (v.length - 1) % 2 || i === v.length - 1) && Math.abs(y(p) - y(d[i])) >= 12 && (
          <text key={`m${i}`} x={x(i)} y={(y(p) + y(d[i])) / 2 + 3} className="mg-diff" textAnchor="middle">
            {p - d[i] > 0 ? '+' : ''}{p - d[i]}
          </text>
        ))}
        <text x={x(v.length - 1) + 5} y={y(v[v.length - 1]) + 3} className="mg-slut mg-slut-vara">{v[v.length - 1]}</text>
        <text x={x(d.length - 1) + 5} y={y(d[d.length - 1]) + 3} className="mg-slut">{d[d.length - 1]}</text>
        {rounds.map((r, i) => (rounds.length <= 12 || i % 2 === 0) && (
          <text key={r} x={x(i)} y={H - 8} className="mg-axel" textAnchor="middle">{r}</text>
        ))}
      </svg>
      <div className="mg-forklaring">
        <span><i className="mg-f-vara" />Björklöven</span>
        <span><i className="mg-f-deras" />{vald.namn}</span>
      </div>
      <p className="mc-note">Poäng efter varje omgång. Linjen för placeringen följer platsen, inte ett lag.</p>
    </section>
  );
}
