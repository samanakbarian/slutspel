import { Link } from 'react-router-dom';

/**
 * Lagets ledare i fem kategorier, som kort man sveper mellan. Varje kort
 * leder till spelarens sida. Vid delad ledning står den med minst matcher
 * först, sedan namnet.
 */

type SkaterIn = { name: string; gp: number; g: number; a: number; p: number; pm: string; pos: string };
type GoalieIn = { name: string; gp: number; svp: string; min: number };

const namnform = (n: string) => {
  const p = n.split(',').map(s => s.trim());
  return p.length === 2 ? `${p[1]} ${p[0]}` : n;
};

export function Ledarna({ skaters, goalies, season }: { skaters: SkaterIn[]; goalies: GoalieIn[]; season: string }) {
  if (skaters.length === 0) return null;
  const till = (n: string) => `/statistik/spelare/${encodeURIComponent(n)}${season ? `?season=${season}` : ''}`;
  const basta = <T,>(lista: T[], varde: (x: T) => number, gp: (x: T) => number, namn: (x: T) => string) =>
    [...lista].sort((x, y) => varde(y) - varde(x) || gp(x) - gp(y) || namn(x).localeCompare(namn(y)))[0];

  const pmNum = (s: SkaterIn) => Number(String(s.pm).replace('−', '-').replace('+', '')) || 0;
  const kort: { etikett: string; varde: string; namn: string; not: string }[] = [];
  const p = basta(skaters, s => s.p, s => s.gp, s => s.name);
  kort.push({ etikett: 'Poäng', varde: String(p.p), namn: p.name, not: `${p.g}+${p.a} på ${p.gp} matcher` });
  const g = basta(skaters, s => s.g, s => s.gp, s => s.name);
  if (g.g > 0) kort.push({ etikett: 'Mål', varde: String(g.g), namn: g.name, not: `på ${g.gp} matcher` });
  const a = basta(skaters, s => s.a, s => s.gp, s => s.name);
  if (a.a > 0) kort.push({ etikett: 'Assist', varde: String(a.a), namn: a.name, not: `på ${a.gp} matcher` });
  const pm = basta(skaters, pmNum, s => s.gp, s => s.name);
  kort.push({ etikett: 'Plus/minus', varde: pmNum(pm) > 0 ? `+${pmNum(pm)}` : String(pmNum(pm)), namn: pm.name, not: 'Swehockeys officiella' });
  const spelat = goalies.filter(x => x.gp > 0 && x.svp);
  if (spelat.length > 0) {
    const mv = basta(spelat, x => Number(String(x.svp).replace(',', '.')) || 0, x => -x.min, x => x.name);
    kort.push({ etikett: 'Räddningsprocent', varde: String(mv.svp).replace('.', ','), namn: mv.name, not: `${mv.gp} ${mv.gp === 1 ? 'match' : 'matcher'} i mål` });
  }

  return (
    <section className="ld" aria-label="Lagets ledare">
      <div className="ld-rad">
        {kort.map((k, n) => (
          <Link key={k.etikett} to={till(k.namn)} className={`ld-kort ld-${n % 3}`}>
            <span className="ld-etikett">{k.etikett}</span>
            <span className="ld-varde">{k.varde}</span>
            <span className="ld-namn">{namnform(k.namn)}</span>
            <span className="ld-not">{k.not}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
