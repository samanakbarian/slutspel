import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resultat } from '../../lib/match';

/**
 * Spelarens säsong match för match, som en story. Första sidan är
 * säsongen hittills, sedan en sida per match med den senaste sist.
 * Matcher med poäng får klubbens grönt, övriga svart.
 */

export type ReelMatch = {
  game_number: number;
  game_id: number | null;
  date: string;
  opponent: string;
  is_home: boolean;
  goals_for: number | null;
  goals_against: number | null;
  result: 'W' | 'L';
  beyond_regulation: boolean;
  goals: number;
  assists: number;
  points: number;
  shots: number | null;
  official_plus_minus: number | null;
};

const MAN = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const datum = (d: string) => {
  const m = d.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${Number(m[2])} ${MAN[Number(m[1]) - 1]}` : d;
};
const kort = (lag: string) => lag.replace(/^IF\s+/, '');
const pm = (v: number) => (v > 0 ? `+${v}` : String(v));

export function Spelarreel({ namn, log, poang, matcher }: { namn: string; log: ReelMatch[]; poang: number; matcher: number }) {
  const [i, setI] = useState(0);
  if (log.length === 0) return null;
  const efternamn = namn.split(' ').slice(-1)[0];

  type Sida = { tid: string; stor: string; text: React.ReactNode; gron: boolean; lank?: string };
  const sidor: Sida[] = [{
    tid: 'Säsongen hittills',
    stor: `${poang} p`,
    text: <><b>{efternamn}</b> på {matcher} {matcher === 1 ? 'match' : 'matcher'}. Tryck för att gå match för match.</>,
    gron: true,
  }];
  for (const g of log) {
    const res = g.goals_for != null && g.goals_against != null ? resultat(g.goals_for, g.goals_against, g.is_home) : '';
    const detaljer = [
      `${g.result === 'W' ? 'Vinst' : 'Förlust'}${g.beyond_regulation ? ' ÖT' : ''} ${res}`,
      g.shots != null ? `${g.shots} skott` : '',
      g.official_plus_minus != null ? `${pm(g.official_plus_minus)}` : '',
    ].filter(Boolean).join(' · ');
    sidor.push({
      tid: `Match ${g.game_number} · ${datum(g.date)} · ${g.is_home ? 'hemma' : 'borta'}`,
      stor: g.points > 0 ? `${g.goals}+${g.assists}` : '0',
      text: <>mot <b>{kort(g.opponent)}</b><br />{detaljer}</>,
      gron: g.points > 0,
      lank: g.game_id ? `/matcher/${g.game_id}` : undefined,
    });
  }
  const s = sidor[Math.min(i, sidor.length - 1)];
  const bladdra = (steg: number) => setI(n => Math.max(0, Math.min(sidor.length - 1, n + steg)));

  return (
    <section className={`ks ks-reel${s.gron ? '' : ' ks-dem'}`} aria-label={`${namn}, säsongen match för match`}>
      <div className="ks-prog" aria-hidden="true">
        {sidor.map((_, n) => <i key={n} className={n < i ? 'ks-klar' : n === i ? 'ks-nu' : ''} />)}
      </div>
      <div className="ks-huvud"><span>{namn}</span><span>{i + 1}/{sidor.length}</span></div>
      <div className="ks-sida" aria-live="polite">
        <span className="ks-tid">{s.tid}</span>
        <span className="ks-stor">{s.stor}</span>
        <p className="ks-text">{s.text}</p>
      </div>
      <button type="button" className="ks-zon ks-bak" aria-label="Föregående" onClick={() => bladdra(-1)} disabled={i === 0} />
      <button type="button" className="ks-zon ks-fram" aria-label="Nästa" onClick={() => bladdra(1)} disabled={i === sidor.length - 1} />
      {s.lank && <Link to={s.lank} className="ks-lank">Matchen →</Link>}
    </section>
  );
}
