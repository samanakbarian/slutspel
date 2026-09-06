import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { ordinal, ordinalSuffix } from '../lib/match';

/**
 * Vad som väntar i nästa match.
 *
 * Startsidan hade bara en nedräkning och ett arenanamn. Allt annat i appen
 * tittar bakåt — det här är det enda som tittar framåt, och därmed det enda
 * som är relevant de dagar det inte spelas match.
 *
 * I en debutsäsong säger tabellen ingenting före första omgången, så
 * motståndaren beskrivs då med förra säsongens placering i samma serie. Det
 * är hela poängen med kortet i september: en supporter känner inte SHL-lagen
 * sedan Allsvenskan.
 */

type Placing = { rank: number; points: number; games_played: number } | null;

type FormGame = {
  date: string;
  won: boolean;
  beyond_regulation: boolean;
  opponent: string;
  goals_for: number;
  goals_against: number;
};

type NextMatch = {
  status: string;
  error?: string;
  season: string;
  game: {
    game_id: number | null;
    date: string;
    time: string | null;
    opponent: string;
    is_home: boolean;
    venue: string | null;
  };
  round: number;
  total_rounds: number;
  is_premiere: boolean;
  us: Placing;
  them: Placing;
  us_form: FormGame[];
  them_form: FormGame[];
  meetings: { date: string; is_home: boolean; goals_for: number; goals_against: number }[];
  venue_average: number | null;
  venue_games: number;
  previous: {
    season?: string;
    teams?: number;
    opponent?: { rank: number; points: number; games_played: number; goal_diff: number };
    us?: { season: string; rank: number; points: number; games_played: number; goal_diff: number };
  } | null;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function shortDate(d: string): string {
  const x = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  return Number.isNaN(x.getTime()) ? d : `${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

/** Hela dygn kvar. Räknat på datum, inte klockslag — "om 2 dagar" ska inte
 *  bli "om 1 dag" bara för att det är sen kväll. */
function daysUntil(date: string): number {
  const then = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((then.getTime() - now.getTime()) / 86400000);
}

function countdown(days: number): string {
  // Ett negativt tal betyder att matchen spelats men resultatet inte skördats
  // än. Vi vet inte om den pågår, så kortet påstår det inte.
  if (days < 0) return 'Väntar på resultat';
  if (days === 0) return 'I dag';
  if (days === 1) return 'I morgon';
  return `Om ${days} dagar`;
}

function Form({ games, label }: { games: FormGame[]; label: string }) {
  if (games.length === 0) return null;
  return (
    <div className="im-form">
      <span className="im-formlabel">{label}</span>
      <span className="im-dots">
        {games.map((g, i) => (
          <i
            key={i}
            className={`ctx-dot ctx-dot-${g.won ? 'w' : 'l'}${g.beyond_regulation ? ' ctx-dot-ot' : ''}`}
            title={`${shortDate(g.date)} ${g.goals_for}–${g.goals_against} mot ${g.opponent}`}
          />
        ))}
      </span>
    </div>
  );
}

export function InforMatchen({ season }: { season: string | null }) {
  const [data, setData] = useState<NextMatch | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const q = season ? `?season=${encodeURIComponent(season)}` : '';
    fetch(`${API_URL}/api/v1/next-match${q}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((j: NextMatch) => setData(j.status === 'ok' ? j : null))
      // Kortet är en bonus på startsidan. Faller det bort ska spelprogrammet
      // och tabellen ändå visas.
      .catch(() => {});
    return () => ctrl.abort();
  }, [season]);

  if (!data) return null;

  const { game, previous } = data;
  const days = daysUntil(game.date);
  const opponent = game.opponent.replace(/^IF\s+/, '');
  const record = data.meetings.reduce(
    (a, m) => (m.goals_for > m.goals_against ? { ...a, w: a.w + 1 } : { ...a, l: a.l + 1 }),
    { w: 0, l: 0 },
  );

  return (
    <section className={`im-card${data.is_premiere ? ' im-premiere' : ''}`}>
      <p className="mc-kicker">
        {data.is_premiere ? `Premiär · ${data.season}` : `Inför omgång ${data.round} av ${data.total_rounds}`}
      </p>

      <h2 className="im-opponent">
        <span className="im-ha">{game.is_home ? 'Hemma mot' : 'Borta mot'}</span>
        {opponent}
      </h2>

      <p className="im-when">
        <b>{countdown(days)}</b>
        {' · '}{shortDate(game.date)}{game.time ? ` ${game.time}` : ''}
        {game.venue ? ` · ${game.venue}` : ''}
      </p>

      {/* Under säsong är tabellen det som gäller. Före omgång 1 finns ingen,
          och då får förra säsongen beskriva motståndaren i stället. */}
      {data.them && data.us ? (
        <div className="im-grid">
          <div className="im-side">
            <span className="im-rank">{data.us.rank}<i>{ordinalSuffix(data.us.rank)}</i></span>
            <span className="im-team">Björklöven</span>
            <span className="im-pts">{data.us.points} p · {data.us.games_played} m</span>
          </div>
          <span className="im-vs">mot</span>
          <div className="im-side">
            <span className="im-rank">{data.them.rank}<i>{ordinalSuffix(data.them.rank)}</i></span>
            <span className="im-team">{opponent}</span>
            <span className="im-pts">{data.them.points} p · {data.them.games_played} m</span>
          </div>
        </div>
      ) : previous ? (
        <div className="im-prev">
          {previous.opponent && previous.season && (
            <p className="im-prevrow">
              <b>{opponent}</b> slutade {ordinal(previous.opponent.rank)}
              {previous.teams ? ` av ${previous.teams}` : ''} i {previous.season} med{' '}
              {previous.opponent.points} poäng och {previous.opponent.goal_diff > 0 ? '+' : ''}
              {previous.opponent.goal_diff} i målskillnad.
            </p>
          )}
          {previous.us && (
            <p className="im-prevrow">
              <b>Björklöven</b> slutade {ordinal(previous.us.rank)} i {previous.us.season} med{' '}
              {previous.us.points} poäng.
            </p>
          )}
        </div>
      ) : null}

      <Form games={data.us_form} label="Form · Björklöven" />
      <Form games={data.them_form} label={`Form · ${opponent}`} />

      {data.meetings.length > 0 && (
        <div className="st-kv">
          <span className="st-kvlabel">Inbördes i år</span>
          <span className="st-kvvalue">{record.w}–{record.l}</span>
          <span className="st-kvhint">
            {data.meetings.map(m => `${m.goals_for}–${m.goals_against}`).join(', ')}
          </span>
        </div>
      )}

      {data.venue_average != null && (
        <p className="mc-note">
          Arenan drar {data.venue_average.toLocaleString('sv-SE')} i snitt över{' '}
          {data.venue_games} hemmamatcher i år.
        </p>
      )}
    </section>
  );
}
