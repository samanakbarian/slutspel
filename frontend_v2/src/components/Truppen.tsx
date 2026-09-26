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

// Etikettens verkliga bredd i sidans typsnitt. En uppskattning per tecken
// var för snål: "Björk" och "Alba" trodde att de fick plats bredvid varandra.
let matare: CanvasRenderingContext2D | null = null;
function textbredd(text: string): number {
  if (typeof document !== 'undefined') {
    matare ??= document.createElement('canvas').getContext('2d');
    if (matare) {
      matare.font = `600 9.5px ${getComputedStyle(document.body).fontFamily}`;
      return matare.measureText(text).width + 2;
    }
  }
  return text.length * 6 + 2;
}

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
  // Noll poäng hamnar en bit ovanför axeln, inte på den.
  const ymin = -ymax * 0.06;
  const x = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B);
  const snitt = med.reduce((a, s) => a + s.y, 0) / med.length;

  // Tidigt på säsongen har flera spelare exakt samma värden, och prickarna
  // låg då ovanpå varandra med ett enda namn. De blir en prick med alla namn.
  const grupper = new Map<string, typeof med>();
  for (const s of med) {
    const k = `${Math.round(x(s.x))}:${Math.round(y(s.y))}`;
    grupper.set(k, [...(grupper.get(k) || []), s]);
  }
  const prickar = [...grupper.values()].map(g => ({
    ...g[0],
    alla: g,
    // Forwards och backar i samma prick ritas som forward med ring runt.
    back: g.every(s => s.back),
  }));

  // Etiketter bara där de får plats; pricken bär namnen när man trycker.
  type Ruta = { x0: number; x1: number; y0: number; y1: number };
  const upptagna: Ruta[] = [
    ...prickar.map(s => ({ x0: x(s.x) - 5, x1: x(s.x) + 5, y0: y(s.y) - 5, y1: y(s.y) + 5 })),
    // Axeltexterna: "50 %" under strecket och snittet till vänster.
    { x0: x(50) - 12, x1: x(50) + 12, y0: H - B + 3, y1: H - B + 14 },
  ];
  const krockar = (b: Ruta) =>
    b.x0 < L || b.x1 > W - R || b.y0 < T - 4 || b.y1 > H - B + 16
    || upptagna.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const etiketter = [...prickar].sort((a, b) => b.y - a.y).map(s => {
    const namn = s.alla.map(p => efternamn(p.namn));
    // Två namn får plats, fler blir "Robins +2".
    const forslag = namn.length === 1 ? [namn[0]]
      : namn.length === 2 ? [namn.join(', '), `${namn[0]} +1`]
      : [`${namn[0]} +${namn.length - 1}`];
    const cx = x(s.x), cy = y(s.y);
    for (const text of forslag) {
      const bredd = textbredd(text);
      // Höger, vänster, ovanför, under.
      const lagen: [number, number, 'start' | 'end' | 'middle'][] = [
        [cx + 7, cy, 'start'], [cx - 7, cy, 'end'], [cx, cy - 10, 'middle'], [cx, cy + 11, 'middle'],
      ];
      for (const [ax, ay, anchor] of lagen) {
        const bx = anchor === 'start' ? ax : anchor === 'end' ? ax - bredd : ax - bredd / 2;
        const box = { x0: bx, x1: bx + bredd, y0: ay - 5, y1: ay + 5 };
        if (!krockar(box)) { upptagna.push(box); return { s, text, ax, anchor, cy: ay }; }
      }
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
        {prickar.map(s => (
          <g key={s.namn} className="tr-prick" onClick={() => ga(s)} role="link" tabIndex={0}
             onKeyDown={e => { if (e.key === 'Enter') ga(s); }}>
            <circle cx={x(s.x)} cy={y(s.y)} r={11} fill="transparent" />
            <circle className={s.back ? 'tr-back' : 'tr-fwd'} cx={x(s.x)} cy={y(s.y)} r={s.alla.length > 1 ? 5.5 : 4.5} />
            {s.alla.length > 1 && !s.back && s.alla.some(p => p.back) && (
              <circle className="tr-back" cx={x(s.x)} cy={y(s.y)} r={8} style={{ fill: 'none' }} />
            )}
            <title>{`${s.alla.map(p => efternamn(p.namn)).join(', ')}: ${komma(s.y)} poäng per match, ${Math.round(s.x)} % av målen på isen (${s.gfPa}–${s.gaPa}), ${s.matcher} matcher`}</title>
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
        Mål i lika styrka och underläge. Linjen är truppens snitt.
      </p>
    </section>
  );
}
