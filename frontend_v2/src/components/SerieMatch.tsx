import { useState } from 'react';
import { API_URL } from '../config/api';

/**
 * En av seriens övriga matcher som rad i listan under senaste matchen.
 * Trycker man på raden fälls ett sammandrag ut: periodresultat, målen,
 * skott, utvisningsminuter och målvakter. Hämtas först när man trycker, så
 * första sidan blir inte långsammare av det.
 */
export type SerieRadData = {
  game_id: number; home_team: string; away_team: string;
  home_goals: number; away_goals: number; overtime: boolean; shootout: boolean;
};

type Mal = {
  period: number; time: string; team: 'home' | 'away' | null; scorer: string; assists: string[];
  score: string; power_play: boolean; short_handed: boolean; empty_net: boolean; shootout: boolean;
};
type Detalj = {
  status: string;
  period_results: string | null;
  spectators: number | null;
  venue: string | null;
  goals: Mal[];
  teams: Partial<Record<'home' | 'away', { shots: number | null; pim: number | null }>>;
  goalies: { team: 'home' | 'away' | null; name: string; saves: number | null; shots_against: number | null; save_pct: number | null }[];
};

const efternamn = (n: string) => (n || '').split(',')[0].trim();

export function SerieRad({ g, kortLag }: { g: SerieRadData; kortLag: (n: string) => string }) {
  const [oppen, setOppen] = useState(false);
  const [data, setData] = useState<Detalj | null>(null);
  const [lage, setLage] = useState<'' | 'hamtar' | 'fel'>('');

  const vaxla = () => {
    const nu = !oppen;
    setOppen(nu);
    if (nu && !data && lage !== 'hamtar') {
      setLage('hamtar');
      fetch(`${API_URL}/api/v1/league-game/${g.game_id}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d?.status === 'ok') { setData(d); setLage(''); } else setLage('fel');
        })
        .catch(() => setLage('fel'));
    }
  };

  const hemma = kortLag(g.home_team), borta = kortLag(g.away_team);
  return (
    <div className={`mc-kvall-post${oppen ? ' mc-kvall-oppen' : ''}`}>
      <button type="button" className="mc-kvall-rad" onClick={vaxla} aria-expanded={oppen}>
        <span className={`mc-kvall-lag${g.home_goals > g.away_goals ? ' mc-kvall-vann' : ''}`}>{hemma}</span>
        <span className="mc-kvall-res">{g.home_goals}–{g.away_goals}</span>
        <span className={`mc-kvall-lag mc-kvall-borta${g.away_goals > g.home_goals ? ' mc-kvall-vann' : ''}`}>{borta}</span>
        <span className="mc-kvall-ot">{g.shootout ? 'STR' : g.overtime ? 'ÖT' : ''}</span>
        <span className="mc-kvall-pil" aria-hidden="true">{oppen ? '−' : '+'}</span>
      </button>
      {oppen && (
        <div className="mc-kvall-detalj">
          {lage === 'hamtar' && <p className="mc-note">Hämtar…</p>}
          {lage === 'fel' && <p className="mc-note">Sammandraget finns inte för den här matchen än.</p>}
          {data && <Sammandrag d={data} hemma={hemma} borta={borta} />}
        </div>
      )}
    </div>
  );
}

function Sammandrag({ d, hemma, borta }: { d: Detalj; hemma: string; borta: string }) {
  const h = d.teams.home, b = d.teams.away;
  const markering = (m: Mal) => (m.shootout ? 'straff' : m.power_play ? 'PP' : m.short_handed ? 'BP' : m.empty_net ? 'tom bur' : '');
  return (
    <>
      {d.period_results && <p className="mc-kvall-perioder">{d.period_results.replace(/[()]/g, '').replace(/-/g, '–')}</p>}
      {d.goals.length > 0 && (
        <ol className="mc-kvall-mal">
          {d.goals.map((m, i) => (
            <li key={i} className={m.team === 'away' ? 'mc-kvall-mal-borta' : ''}>
              <span className="mc-kvall-tid">{m.shootout ? 'STR' : m.time}</span>
              <span className="mc-kvall-stall">{m.score.replace('-', '–')}</span>
              <span className="mc-kvall-skytt">
                {efternamn(m.scorer)}
                <span className="mc-kvall-lagnamn"> {m.team === 'home' ? hemma : m.team === 'away' ? borta : ''}</span>
                {markering(m) && <span className="mc-kvall-tagg"> {markering(m)}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {(h || b) && (
        <div className="mc-kvall-siffror">
          {h?.shots != null && b?.shots != null && <span>Skott <b>{h.shots}–{b.shots}</b></span>}
          {h?.pim != null && b?.pim != null && <span>Utvisningar <b>{h.pim}–{b.pim}</b> min</span>}
          {d.spectators ? <span>Publik <b>{d.spectators.toLocaleString('sv-SE')}</b></span> : null}
        </div>
      )}
      {d.goalies.length > 0 && (
        <p className="mc-kvall-mv">
          Räddningar: {d.goalies
            .filter(m => m.shots_against)
            .map(m => `${efternamn(m.name)} ${m.saves}/${m.shots_against}`)
            .join(' · ')}
        </p>
      )}
    </>
  );
}
