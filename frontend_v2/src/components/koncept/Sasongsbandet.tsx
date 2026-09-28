import { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Hela säsongen på en skärm: en ruta per match i spelschemats ordning.
 * Spelade matcher bär resultatets färg, nästa match lyser gult och
 * bortamatcher har bara kant. En tryckning visar matchen under rutnätet.
 */

export type BandMatch = {
  gameId: number | null;
  date: string;
  time: string;
  opponent: string;
  isHome: boolean;
  played: boolean;
  gf: number;
  ga: number;
  ot: boolean;
};

const MAN = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const datum = (d: string) => {
  const m = d.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${Number(m[2])} ${MAN[Number(m[1]) - 1]}` : d;
};
const kort = (lag: string) => lag.replace(/^IF\s+/, '').replace(/\s+(HC|BK|IF|HF|AIK|IK)$/, '').replace(' Lakers', '').replace(' Redhawks', '');

export function Sasongsbandet({ games, season }: { games: BandMatch[]; season: string }) {
  const lista = [...games].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const nasta = lista.findIndex(g => !g.played);
  const [vald, setVald] = useState(nasta >= 0 ? nasta : lista.length - 1);
  if (lista.length === 0) return null;
  const spelade = lista.filter(g => g.played).length;
  const g = lista[Math.min(vald, lista.length - 1)];

  const klass = (m: BandMatch, i: number) => {
    if (!m.played) return i === nasta ? 'sb-nasta' : '';
    const vann = m.gf > m.ga;
    return `sb-${vann ? 'v' : 'f'}${m.ot ? ' sb-ot' : ''}`;
  };
  const utfall = g.played
    ? `${g.gf > g.ga ? 'Vinst' : 'Förlust'}${g.ot ? ' efter förlängning' : ''} ${g.isHome ? `${g.gf}–${g.ga}` : `${g.ga}–${g.gf}`}`
    : Math.min(vald, lista.length - 1) === nasta ? `Nästa match · ${g.time.replace(':', '.')}` : g.time.replace(':', '.');

  return (
    <section className="mc-card sb">
      <p className="mc-kicker">{season} · {spelade} av {lista.length} spelade</p>
      <h2 className="mc-title">Säsongen</h2>
      <div className="sb-rutnat">
        {lista.map((m, i) => (
          <button
            key={i}
            type="button"
            className={`sb-cell${m.isHome ? '' : ' sb-borta'} ${klass(m, i)}`}
            aria-pressed={i === vald}
            aria-label={`Match ${i + 1}, ${m.isHome ? 'hemma' : 'borta'} mot ${m.opponent}, ${datum(m.date)}`}
            onClick={() => setVald(i)}
          >
            {kort(m.opponent).slice(0, 3).toUpperCase()}
          </button>
        ))}
      </div>
      <div className="sb-detalj" aria-live="polite">
        <b>{g.isHome ? 'Hemma' : 'Borta'} mot {kort(g.opponent)}</b>
        <span>Match {Math.min(vald, lista.length - 1) + 1} · {datum(g.date)} · {utfall}</span>
        {g.played && g.gameId !== null && <Link to={`/matcher/${g.gameId}`} className="sb-lank">Matchrapporten →</Link>}
      </div>
      <div className="sb-legend">
        <span><i className="sb-v" />Vinst</span>
        <span><i className="sb-v sb-ot" />Vinst ÖT</span>
        <span><i className="sb-f sb-ot" />Förlust ÖT</span>
        <span><i className="sb-f" />Förlust</span>
        <span><i className="sb-nasta" />Nästa</span>
        <span><i />Hemma</span>
        <span><i className="sb-borta" />Borta</span>
      </div>
    </section>
  );
}
