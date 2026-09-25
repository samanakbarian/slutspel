import { Link } from 'react-router-dom';
import type { BandMatch } from './Sasongsbandet';
import type { Lage } from './lage';

const kort = (lag: string) => lag.replace(/^IF\s+/, '');

/**
 * Startsidans överdel efter var i veckan man är.
 *
 * Efter en match är resultatet det enda som räknas, fram till dagen före
 * nästa. På matchdagen är det tiden kvar. Resten av veckan tar kortet inför
 * matchen platsen, och det här kortet visas inte alls.
 */

export function Lageskort({ lage, senaste, nasta }: { lage: Lage; senaste?: BandMatch; nasta?: BandMatch }) {
  if (lage === 'efter' && senaste) {
    const vann = senaste.gf > senaste.ga;
    const hemma = senaste.isHome ? 'Björklöven' : kort(senaste.opponent);
    const borta = senaste.isHome ? kort(senaste.opponent) : 'Björklöven';
    return (
      <section className={`lk lk-efter${vann ? '' : ' lk-forlust'}`}>
        <span className="lk-rubr">Slut{senaste.ot ? ' · efter förlängning' : ''}</span>
        <span className="lk-jatte">{senaste.isHome ? `${senaste.gf}–${senaste.ga}` : `${senaste.ga}–${senaste.gf}`}</span>
        <p className="lk-text">
          {senaste.isHome ? <><b>{hemma}</b> – {borta}</> : <>{hemma} – <b>{borta}</b></>}
        </p>
        {senaste.gameId !== null && <Link className="lk-knapp" to={`/matcher/${senaste.gameId}`}>Matchrapporten →</Link>}
      </section>
    );
  }
  if (lage === 'dag' && nasta) {
    const [h, m] = (nasta.time || '00:00').split(':').map(Number);
    const start = new Date(`${nasta.date.slice(0, 10)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    const kvar = Math.max(0, Math.round((start.getTime() - Date.now()) / 60000));
    return (
      <section className="lk lk-dag">
        <span className="lk-rubr">Matchdag · nedsläpp {nasta.time.replace(':', '.')}</span>
        <span className="lk-jatte">{kvar >= 60 ? `${Math.floor(kvar / 60)} h` : `${kvar} min`}<small>kvar</small></span>
        <p className="lk-text">{nasta.isHome ? 'Hemma' : 'Borta'} mot <b>{kort(nasta.opponent)}</b></p>
      </section>
    );
  }
  return null;
}
