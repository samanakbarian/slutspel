import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import { PercentileBar, Sparkline } from '../components/charts/Charts';

type Percentiles = {
  points: number;
  goals: number;
  assists: number;
  plus_minus: number;
  pim: number;
};

type PlayerStats = {
  name: string;
  jersey_number: number | null;
  position: string;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  plus_minus: number;
  points_per_game: number;
  percentiles: Percentiles | null;
  eliteprospects?: { url: string; confidence: string } | null;
};

type GameLogRow = {
  game_id: number | null;
  date: string;
  home_team: string;
  away_team: string;
  goals: number;
  assists: number;
  points: number;
  cumulative_points: number;
};

type PlayerResponse = {
  status: string;
  error?: string;
  season?: string;
  player: PlayerStats;
  games_with_points: number;
  points_from_events: number;
  game_log: GameLogRow[];
};

const BJK = /bj[oö]rkl[oö]ven/i;

/**
 * "Efternamn, Förnamn" → "Förnamn Efternamn".
 * Swehockey markerar vissa spelare med asterisker; de hör inte till namnet.
 */
function humanName(n: string): string {
  const clean = String(n || '').replace(/[*†‡]+/g, '').trim();
  const p = clean.split(',').map(s => s.trim());
  return p.length === 2 && p[1] ? `${p[1]} ${p[0]}` : clean;
}

/**
 * Direktlänk till spelarens EliteProspects-sida. Adressen kräver spelarens
 * id, som API:t slår upp; saknas det länkar vi till deras sök i stället för
 * att gissa fel.
 */
function eliteProspectsUrl(p: PlayerStats): string {
  return p.eliteprospects?.url
    || `https://www.eliteprospects.com/search/player?name=${encodeURIComponent(humanName(p.name))}`;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
function shortDate(d: string): string {
  const x = new Date(`${d}T00:00:00`);
  return Number.isNaN(x.getTime()) ? d : `${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

export function Spelare() {
  const { name } = useParams<{ name: string }>();
  // Statistiksidan skickar med vald sasong; utan den svarar API:t for den aktiva.
  const [params] = useSearchParams();
  const season = params.get('season') || '';
  const [data, setData] = useState<PlayerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 30000);

    const q = season ? `?season=${encodeURIComponent(season)}` : '';
    fetch(`${API_URL}/api/v1/player/${encodeURIComponent(name)}${q}`, { cache: 'no-store', signal: ctrl.signal })
      .then(r => {
        if (r.status === 404) throw new Error('NOT_DEPLOYED');
        if (!r.ok) throw new Error(`Servern svarade ${r.status}`);
        return r.json();
      })
      .then((j: PlayerResponse) => {
        if (j.status === 'not_found') throw new Error('Spelaren finns inte i säsongens statistik.');
        if (j.status !== 'ok') throw new Error(j.error || 'Kunde inte läsa spelaren.');
        setData(j);
      })
      .catch((e: Error) => setError(
        e.message === 'NOT_DEPLOYED'
          ? 'Spelarprofiler kräver en API-version som ännu inte är driftsatt.'
          : e.name === 'AbortError' ? 'Tidsgränsen gick ut efter 30 sekunder.' : e.message,
      ))
      .finally(() => { window.clearTimeout(timer); setLoading(false); });

    return () => { window.clearTimeout(timer); ctrl.abort(); };
  }, [name, season]);

  if (loading) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card"><p className="mc-kicker">Spelare</p><h2 className="mc-title">Laddar…</h2></section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card mc-card-error">
          <p className="mc-kicker">Spelare</p>
          <h2 className="mc-title">Kunde inte visa spelaren</h2>
          <p className="mc-text">{error}</p>
          <Link to="/statistik" className="mr-back">← Tillbaka till statistiken</Link>
        </section>
      </div>
    );
  }

  const p = data.player;
  const display = humanName(p.name);
  const log = data.game_log || [];
  const curve = log.map(g => ({ label: shortDate(g.date), value: g.cumulative_points }));

  return (
    <div className="page animate-fade-up">
      <Link to="/statistik" className="mr-back">← Statistik</Link>

      <section className="sp-hero">
        <div className="sp-head">
          <span className="sp-num">{p.jersey_number ?? '–'}</span>
          <div className="sp-ident">
            <h2 className="sp-name">{display}</h2>
            <p className="sp-meta">{p.position} · {data.season}</p>
          </div>
        </div>
        <div className="sp-totals">
          <div><span className="sp-val">{p.games_played}</span><span className="sp-lbl">Matcher</span></div>
          <div><span className="sp-val sp-gold">{p.points}</span><span className="sp-lbl">Poäng</span></div>
          <div><span className="sp-val">{p.goals}+{p.assists}</span><span className="sp-lbl">M+A</span></div>
          <div><span className="sp-val sp-green">{p.points_per_game.toFixed(2)}</span><span className="sp-lbl">P/match</span></div>
        </div>
      </section>

      {curve.length > 1 && (
        <section className="mc-card">
          <p className="mc-kicker">Poäng ackumulerat</p>
          <Sparkline points={curve} />
          <p className="mc-note">
            {data.points_from_events} poäng fördelade på {data.games_with_points} matcher.
            Förloppet härleds ur målhändelserna, så matcher utan poäng syns inte som steg.
          </p>
        </section>
      )}

      {p.percentiles ? (
        <section className="mc-card">
          <p className="mc-kicker">Percentil mot serien</p>
          <PercentileBar label="Poäng" value={p.percentiles.points} />
          <PercentileBar label="Mål" value={p.percentiles.goals} />
          <PercentileBar label="Assist" value={p.percentiles.assists} />
          <PercentileBar label="Plus/minus" value={p.percentiles.plus_minus} />
          <PercentileBar label="Utv.min" value={p.percentiles.pim} hint="Färre utvisningsminuter ger högre percentil." />
        </section>
      ) : (
        <section className="mc-card">
          <p className="mc-kicker">Percentil mot serien</p>
          <p className="mc-text">
            Percentil beräknas först vid tio spelade matcher, eftersom enstaka matcher
            ger för stort utslag.
          </p>
        </section>
      )}

      {log.length > 0 && (
        <section className="mc-card">
          <p className="mc-kicker">Matcher med poäng ({log.length})</p>
          {log.slice().reverse().map((g, i) => {
            const opponent = BJK.test(g.home_team || '') ? g.away_team : g.home_team;
            const home = BJK.test(g.home_team || '');
            return (
              <div key={i} className="sp-game">
                <span className="sp-date">{shortDate(g.date)}</span>
                <span className={`mc-ha${home ? ' mc-ha-home' : ''}`}>{home ? 'H' : 'B'}</span>
                <span className="sp-opp">{(opponent || '').replace(/^IF\s+/, '')}</span>
                <span className="sp-pts">{g.goals}+{g.assists}</span>
                {g.game_id && <Link to={`/matcher/${g.game_id}`} className="sp-link">Rapport ›</Link>}
              </div>
            );
          })}
        </section>
      )}

      <a className="sp-ep" href={eliteProspectsUrl(p)} target="_blank" rel="noreferrer">
        Öppna {display} på EliteProspects ↗
      </a>
    </div>
  );
}
