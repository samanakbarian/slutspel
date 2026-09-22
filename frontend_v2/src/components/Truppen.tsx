import { useNavigate } from 'react-router-dom';
import { spelarsida } from '../lib/lankar';

/**
 * Truppen i en bild: vem producerar, och vem vinner sina byten.
 *
 * Uppåt är poäng per match. Åt höger är andelen av målen i lika styrka och
 * underläge som laget gjorde med spelaren på isen — samma tal som +/−, men
 * som andel, så en spelare med få mål runt sig inte ser ut att stå still.
 * En back hamnar lägre än en forward av naturliga skäl, därför skiljs de åt
 * med formen på pricken.
 *
 * Med för få matcher säger en prick ingenting, så gränsen är densamma som
 * för percentilen: fyra av tio omgångar, minst tre matcher.
 */

export type TruppSpelare = {
  namn: string;
  nummer: number;
  position: string;
  matcher: number;
  poang: number;
  gfPa: number;
  gaPa: number;
};

const BACK = /^(ld|rd|d)$/i;
const efternamn = (n: string) => (n.includes(',') ? n.split(',')[0].trim() : n.split(' ').slice(-1)[0]);
const komma = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

export function Truppen({ spelare, season }: { spelare: TruppSpelare[]; season: string }) {
  const navigate = useNavigate();
  const maxGp = Math.max(0, ...spelare.map(s => s.matcher));
  const grans = Math.max(3, Math.round(maxGp * 0.4));
  const med = spelare
    .filter(s => s.matcher >= grans && s.gfPa + s.gaPa > 0)
    .map(s => ({ ...s, x: (s.gfPa / (s.gfPa + s.gaPa)) * 100, y: s.poang / s.matcher, back: BACK.test(s.position) }));
  if (med.length < 5) return null;

  const W = 340, H = 260, L = 30, R = 10, T = 14, B = 30;
  // Skalan följer spelarna, med 50 % alltid med. Ett lag som vunnit
  // säsongen har alla till höger om strecket, och en centrerad skala lämnade
  // då halva ytan tom.
  const xs = med.map(s => s.x);
  const x0 = Math.min(50, ...xs) - 3;
  const x1 = Math.max(50, ...xs) + 3;
  const ymax = Math.max(0.5, ...med.map(s => s.y)) * 1.08;
  const x = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const y = (v: number) => T + (1 - v / ymax) * (H - T - B);
  const snitt = med.reduce((a, s) => a + s.y, 0) / med.length;

  // Etiketter bara där de får plats; pricken bär namnet när man trycker.
  const upptagna = med.map(s => ({ x0: x(s.x) - 5, x1: x(s.x) + 5, y0: y(s.y) - 5, y1: y(s.y) + 5 }));
  const krockar = (b: { x0: number; x1: number; y0: number; y1: number }) =>
    b.x0 < L || b.x1 > W - R || b.y0 < T - 4 || upptagna.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const etiketter = [...med].sort((a, b) => b.y - a.y).map(s => {
    const text = efternamn(s.namn);
    const bredd = text.length * 5.2 + 2;
    const cx = x(s.x), cy = y(s.y);
    for (const [ax, anchor] of [[cx + 7, 'start'], [cx - 7, 'end']] as const) {
      const x0 = anchor === 'start' ? ax : ax - bredd;
      const box = { x0, x1: x0 + bredd, y0: cy - 5, y1: cy + 5 };
      if (!krockar(box)) { upptagna.push(box); return { s, text, ax, anchor, cy }; }
    }
    return null;
  });

  const ga = (s: TruppSpelare) => navigate(spelarsida(s.namn, season || null));

  return (
    <section className="mc-card">
      <p className="mc-kicker">Truppen · poäng och byten</p>
      <svg className="rl se-spridning" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Poäng per match mot andel av målen på isen för ${med.length} spelare.`}>
        <line className="rl-grid" x1={x(50)} x2={x(50)} y1={T} y2={H - B} />
        <line className="rl-grid" x1={L} x2={W - R} y1={y(snitt)} y2={y(snitt)} />
        <text className="rl-tick" x={x(50)} y={H - B + 12} textAnchor="middle">50 %</text>
        <text className="rl-tick" x={L - 4} y={y(snitt) + 3} textAnchor="end">{komma(snitt, 2)}</text>
        <text className="rl-tick" x={W - R} y={H - 4} textAnchor="end">Andel av målen på isen →</text>
        <text className="rl-tick" x={L} y={T - 4} textAnchor="start">↑ Poäng per match</text>
        {med.map(s => (
          <g key={s.namn} className="tr-prick" onClick={() => ga(s)} role="link" tabIndex={0}
             onKeyDown={e => { if (e.key === 'Enter') ga(s); }}>
            <circle cx={x(s.x)} cy={y(s.y)} r={11} fill="transparent" />
            <circle className={s.back ? 'tr-back' : 'tr-fwd'} cx={x(s.x)} cy={y(s.y)} r={4.5} />
            <title>{`${efternamn(s.namn)}: ${komma(s.y)} poäng per match, ${Math.round(s.x)} % av målen på isen (${s.gfPa}–${s.gaPa}), ${s.matcher} matcher`}</title>
          </g>
        ))}
        {etiketter.map(e => e && (
          <text key={e.s.namn} className="rl-end" x={e.ax} y={e.cy + 3} textAnchor={e.anchor}>{e.text}</text>
        ))}
      </svg>
      <div className="tr-legend">
        <span><i className="tr-fwd-i" />Forward</span>
        <span><i className="tr-back-i" />Back</span>
      </div>
      <p className="mc-note">
        Mål i lika styrka och underläge, som +/−. Den vågräta linjen är truppens snitt. Tryck på en prick för spelaren.
      </p>
    </section>
  );
}
