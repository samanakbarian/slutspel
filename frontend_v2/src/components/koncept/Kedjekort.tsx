import { useState } from 'react';
import type { MatchReport } from '../../lib/match';
import { isDefence, positionOf, surname } from '../../lib/match';

/**
 * Femman som den står på isen: center i mitten, forwards på kanterna,
 * backarna bakom. Positionen kommer ur truppen; saknas den fylls platserna
 * i uppställningens ordning.
 */

type Plats = 'lw' | 'c' | 'rw' | 'ld' | 'rd';
const XY: Record<Plats, [number, number]> = { lw: [17, 24], c: [50, 16], rw: [83, 24], ld: [31, 64], rd: [69, 64] };

export function Kedjekort({ data }: { data: MatchReport }) {
  const femmor = (data.lineup || []).filter(b => b.block === 'line' && b.players.length > 0);
  const [valt, setValt] = useState(0);
  if (femmor.length === 0) return null;
  const f = femmor[Math.min(valt, femmor.length - 1)];

  const poang = new Map((data.skaters || []).map(s => [surname(s.name), s]));
  const pos = (p: { number: number | null; name: string }) => positionOf(data.squad, p.name, p.number).toUpperCase();

  const backar = f.players.filter(p => isDefence(pos(p)));
  const forwards = f.players.filter(p => !isDefence(pos(p)));
  const platser: Partial<Record<Plats, { number: number | null; name: string }>> = {};
  const lediga = (lista: Plats[]) => lista.filter(k => !platser[k]);
  for (const p of forwards) {
    const q = pos(p);
    const k: Plats | undefined = q === 'LW' ? 'lw' : q === 'RW' ? 'rw' : q === 'CE' || q === 'C' ? 'c' : undefined;
    const valdPlats = k && !platser[k] ? k : lediga(['c', 'lw', 'rw'])[0];
    if (valdPlats) platser[valdPlats] = p;
  }
  for (const p of backar) {
    const q = pos(p);
    const k: Plats | undefined = q === 'LD' ? 'ld' : q === 'RD' ? 'rd' : undefined;
    const valdPlats = k && !platser[k] ? k : lediga(['ld', 'rd'])[0];
    if (valdPlats) platser[valdPlats] = p;
  }
  const summa = f.players.reduce((n, p) => n + (poang.get(surname(p.name))?.points ?? 0), 0);
  const malvakter = (data.lineup || []).find(b => b.block === 'goalie')?.players ?? [];

  return (
    <section className="mr-card kk">
      <p className="mr-kicker">Uppställning</p>
      <div className="kk-val" role="group" aria-label="Välj femma">
        {femmor.map((b, n) => (
          <button key={n} type="button" aria-pressed={n === valt} onClick={() => setValt(n)}>Femma {b.line}</button>
        ))}
      </div>
      <div className="kk-rink">
        {(Object.keys(XY) as Plats[]).map(k => {
          const p = platser[k];
          if (!p) return null;
          const s = poang.get(surname(p.name));
          const text = s && s.points > 0 ? `${s.goals}+${s.assists}` : '–';
          return (
            <div key={k} className={`kk-sp${k.endsWith('d') ? ' kk-back' : ''}`} style={{ left: `${XY[k][0]}%`, top: `${XY[k][1]}%` }}>
              <span className="kk-nr">{p.number}</span>
              <b>{surname(p.name)}</b>
              <span className={s && s.points > 0 ? 'kk-p' : 'kk-p kk-noll'}>{text}</span>
            </div>
          );
        })}
      </div>
      <div className="kk-summa">
        <span>Poäng i matchen</span><b>{summa}</b>
      </div>
      {malvakter.length > 0 && (
        <p className="mr-note">Målvakter: {malvakter.map(p => `${p.number} ${surname(p.name)}`).join(', ')}</p>
      )}
    </section>
  );
}
