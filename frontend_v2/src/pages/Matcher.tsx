import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

/* ── typer ── */
type RawGame = {
  game_id?: number | null;
  match_date?: string;
  date?: string;
  match_time?: string;
  home_team?: string;
  away_team?: string;
  result?: string;
  period_results?: string | null;
  venue?: string | null;
  spectators?: number | null;
};

type Standing = {
  team_name?: string;
  rank?: number;
  games_played?: number;
  wins?: number;
  losses?: number;
  ot_wins?: number;
  ot_losses?: number;
  points?: number;
  goal_diff?: number;
};

type Game = {
  date: string;
  time: string;
  home: string;
  away: string;
  opponent: string;
  isHome: boolean;
  played: boolean;
  gf: number;
  ga: number;
  result: 'W' | 'L' | 'OTL' | 'D' | '';
  venue: string;
};

const BJK = /bj[oö]rkl[oö]ven/i;

function normalise(g: RawGame): Game {
  const home = (g.home_team || '').trim();
  const away = (g.away_team || '').trim();
  const isHome = BJK.test(home);
  const raw = (g.result || '').replace(/ /g, ' ').trim();
  const m = raw.match(/(\d+)\s*-\s*(\d+)/);
  const played = Boolean(m);
  const hg = m ? parseInt(m[1], 10) : 0;
  const ag = m ? parseInt(m[2], 10) : 0;
  const gf = isHome ? hg : ag;
  const ga = isHome ? ag : hg;
  // Fler än tre perioder i periodresultatet betyder förlängning.
  const periods = (g.period_results || '').split(',').filter(x => /\d/.test(x)).length;
  const ot = periods > 3;

  let result: Game['result'] = '';
  if (played) result = gf > ga ? 'W' : gf < ga ? (ot ? 'OTL' : 'L') : 'D';

  return {
    date: g.match_date || g.date || '',
    time: g.match_time || '',
    home,
    away,
    opponent: isHome ? away : home,
    isHome,
    played,
    gf,
    ga,
    result,
    venue: g.venue || '',
  };
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const then = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((then.getTime() - today.getTime()) / 86400000);
}

function countdownLabel(days: number | null): string {
  if (days === null) return '';
  if (days < 0) return 'Spelad';
  if (days === 0) return 'I dag';
  if (days === 1) return 'I morgon';
  return `om ${days} dagar`;
}

const WEEKDAYS = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Kompakt variant för listrader, där bredden är knapp. */
function formatDateShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/* ── delkomponenter ── */
function TeamBadge({ name, home }: { name: string; home: boolean }) {
  const initials = name.replace(/^(IF|BIK|HC|IK)\s+/i, '').slice(0, 3).toUpperCase();
  return (
    <div className="mc-team">
      <span className={`mc-badge${home ? ' mc-badge-own' : ''}`}>{initials}</span>
      <span className="mc-teamname">{name.replace(/^IF\s+/, '')}</span>
    </div>
  );
}

function NextMatch({ game }: { game: Game }) {
  const days = daysUntil(game.date);
  return (
    <section className="mc-hero">
      <p className="mc-kicker">Nästa match</p>
      <div className="mc-matchup">
        <TeamBadge name={game.home} home={BJK.test(game.home)} />
        <span className="mc-vs">mot</span>
        <TeamBadge name={game.away} home={BJK.test(game.away)} />
      </div>
      <p className="mc-countdown">{countdownLabel(days)}</p>
      <p className="mc-when">
        {formatDate(game.date)}
        {game.time ? ` · ${game.time}` : ''} · {game.isHome ? 'Hemma' : 'Borta'}
        {game.venue ? ` · ${game.venue}` : ''}
      </p>
    </section>
  );
}

function FormDots({ games }: { games: Game[] }) {
  const last = games.slice(0, 10);
  if (last.length === 0) return null;
  const w = last.filter(g => g.result === 'W').length;
  const l = last.filter(g => g.result === 'L').length;
  const o = last.filter(g => g.result === 'OTL').length;
  return (
    <div className="mc-form">
      {last.map((g, i) => (
        <span
          key={i}
          className={`mc-dot mc-dot-${g.result.toLowerCase() || 'none'}`}
          title={`${g.date}: ${g.home} ${g.gf}–${g.ga} ${g.away}`}
        />
      ))}
      <span className="mc-formtext">{w}V–{l}F{o > 0 ? `–${o}ÖT` : ''}</span>
    </div>
  );
}

/**
 * Björklöven är alltid ett av lagen, så att skriva ut båda på varje rad
 * upprepar samma ord och äter upp bredden — långa möten som
 * "Björklöven mot Växjö Lakers HC" bröt till två rader på 360 px.
 * Raden visar därför motståndaren, med H/B för hemma eller borta.
 */
function GameRow({ game }: { game: Game }) {
  return (
    <div className="mc-row">
      <span className="mc-date">{formatDateShort(game.date)}</span>
      <span className={`mc-ha${game.isHome ? ' mc-ha-home' : ''}`} title={game.isHome ? 'Hemma' : 'Borta'}>
        {game.isHome ? 'H' : 'B'}
      </span>
      <span className="mc-opponent">{game.opponent.replace(/^IF\s+/, '')}</span>
      {game.played ? (
        <>
          <span className="mc-score">{game.gf}–{game.ga}</span>
          <span className={`mc-res mc-res-${game.result.toLowerCase()}`}>
            {game.result === 'OTL' ? 'ÖT' : game.result}
          </span>
        </>
      ) : (
        <span className="mc-time">{game.time}</span>
      )}
    </div>
  );
}

function StandingsTable({ rows }: { rows: Standing[] }) {
  // En ensam rad är ingen tabell. Så länge backend bara exponerar lagets egen
  // rad blir "#1 av 1" mer vilseledande än upplysande — visa den inte då.
  if (rows.length < 2) return null;
  const sorted = [...rows].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const started = sorted.some(r => (r.games_played ?? 0) > 0);
  return (
    <section className="mc-card">
      <p className="mc-kicker">Tabellen</p>
      <div className="mc-tablewrap">
        <table className="mc-table">
          <thead>
            <tr><th>#</th><th className="mc-left">Lag</th><th>M</th><th>MSK</th><th>P</th></tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className={BJK.test(r.team_name || '') ? 'mc-hl' : ''}>
                <td>{r.rank ?? i + 1}</td>
                <td className="mc-left">{(r.team_name || '').replace(/^IF\s+/, '')}</td>
                <td>{r.games_played ?? 0}</td>
                <td>{(r.goal_diff ?? 0) > 0 ? `+${r.goal_diff}` : (r.goal_diff ?? 0)}</td>
                <td className="mc-pts">{r.points ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!started && <p className="mc-note">Serien har inte startat — placeringen är preliminär tills omgång 1 är spelad.</p>}
    </section>
  );
}

/* ── sida ── */
export function Matcher() {
  const [games, setGames] = useState<Game[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [seasonName, setSeasonName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'kommande' | 'spelade'>('kommande');

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 30000);

    // Två säsonger är aktiva samtidigt (SHL och HA 26/27) och API:ts default
    // landar på HockeyAllsvenskan, som saknar matcher. Fråga därför efter den
    // säsong /api/v1/seasons själv pekar ut som aktiv.
    fetch(`${API_URL}/api/v1/seasons`, { cache: 'no-store', signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(s => (s?.active ? `?season=${encodeURIComponent(s.active)}` : ''))
      .catch(() => '')
      .then(q => fetch(`${API_URL}/api/v1/statistics${q}`, { cache: 'no-store', signal: ctrl.signal }))
      .then(r => { if (!r.ok) throw new Error(`Servern svarade ${r.status}`); return r.json(); })
      .then(j => {
        if (j?.status === 'error') throw new Error(j.error || 'Okänt fel från API:t');
        const all: Game[] = (j.games || []).map(normalise).filter((g: Game) => g.date);
        setGames(all);
        setSeasonName(j.season || '');
        // Hela tabellen kommer från /api/v1/standings när den finns. Tills
        // backend har den endpointen exponerar statistics bara lagets egen
        // rad, och då visar vi den ensam hellre än ingenting.
        const inline = j.standings || (j.team_standing ? [j.team_standing] : []);
        setStandings(Array.isArray(inline) ? inline : []);
        fetch(`${API_URL}/api/v1/standings`, { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            const rows = d?.standings ?? d;
            if (Array.isArray(rows) && rows.length > 1) setStandings(rows);
          })
          .catch(() => { /* endpointen finns inte än — behåll inline-raden */ });
        // Har säsongen börjat visar vi spelade matcher först.
        if (all.some(g => g.played)) setView('spelade');
      })
      .catch((e: Error) => setError(e.name === 'AbortError' ? 'Tidsgränsen gick ut efter 30 sekunder.' : e.message))
      .finally(() => { window.clearTimeout(timer); setLoading(false); });

    return () => { window.clearTimeout(timer); ctrl.abort(); };
  }, []);

  if (loading) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card"><p className="mc-kicker">Matcher</p><h2 className="mc-title">Laddar spelprogram…</h2></section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card mc-card-error">
          <p className="mc-kicker">Matcher</p>
          <h2 className="mc-title">Kunde inte hämta matcherna</h2>
          <p className="mc-text">{error}</p>
        </section>
      </div>
    );
  }

  const played = games.filter(g => g.played).sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = games.filter(g => !g.played).sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0];
  const shown = view === 'spelade' ? played : upcoming;

  return (
    <div className="page animate-fade-up">
      {next && <NextMatch game={next} />}

      {played.length > 0 && (
        <section className="mc-card">
          <p className="mc-kicker">Form · senaste {Math.min(played.length, 10)}</p>
          <FormDots games={played} />
        </section>
      )}

      <StandingsTable rows={standings} />

      <div className="mc-seg" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'spelade'}
          className={`mc-segbtn${view === 'spelade' ? ' mc-on' : ''}`}
          onClick={() => setView('spelade')}
        >
          Spelade ({played.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'kommande'}
          className={`mc-segbtn${view === 'kommande' ? ' mc-on' : ''}`}
          onClick={() => setView('kommande')}
        >
          Kommande ({upcoming.length})
        </button>
      </div>

      <section className="mc-card">
        <p className="mc-kicker">{seasonName || 'Spelprogram'}</p>
        {shown.length === 0
          ? <p className="mc-text">{view === 'spelade' ? 'Inga matcher spelade än.' : 'Inga fler matcher inlagda.'}</p>
          : shown.map((g, i) => <GameRow key={`${g.date}-${i}`} game={g} />)}
      </section>
    </div>
  );
}
