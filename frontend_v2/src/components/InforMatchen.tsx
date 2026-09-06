import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { ordinal } from '../lib/match';

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

type TeamSeason = {
  games: number;
  goals_for: number; goals_against: number;
  goals_for_avg: number; goals_against_avg: number;
  wins: number; ot_wins: number; ot_losses: number; losses: number;
  home_points: number; home_games: number;
  away_points: number; away_games: number;
  streak: { won: boolean; length: number };
} | null;

type PrevRow = {
  season?: string;
  rank: number; points: number; games_played: number; goal_diff: number;
  wins?: number; ot_wins?: number; ot_losses?: number; losses?: number;
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
  us_season: TeamSeason;
  them_season: TeamSeason;
  us_form: FormGame[];
  them_form: FormGame[];
  meetings: { date: string; is_home: boolean; goals_for: number; goals_against: number }[];
  upcoming: { date: string; time: string | null; opponent: string; is_home: boolean }[];
  venue_average: number | null;
  venue_games: number;
  previous: { season?: string; teams?: number; opponent?: PrevRow; us?: PrevRow } | null;
};

/** Ett mått ställt mellan lagen. `better` säger vilket håll som är bra. */
type Duel = {
  label: string;
  us: number;
  them: number;
  format?: (v: number) => string;
  /** Sant för mått där ett lägre tal är bättre, som insläppta mål. */
  lowerIsBetter?: boolean;
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

/**
 * Måtten ställda mot varandra, som speglade staplar.
 *
 * Två tal i löptext säger ingenting om avståndet mellan dem. Speglade från
 * mitten syns det direkt vem som är bäst på vad, och hur mycket. Båda
 * staplarna skalas mot det största värdet i raden, så längden går att
 * jämföra rakt över.
 */
function Duels({ rows, opponent }: { rows: Duel[]; opponent: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="du">
      <div className="du-head">
        <span className="du-us">Björklöven</span>
        <span className="du-them">{opponent}</span>
      </div>
      {rows.map(r => {
        const max = Math.max(Math.abs(r.us), Math.abs(r.them), 1);
        const fmt = r.format || ((v: number) => String(v));
        // Insläppta mål är bättre lågt. Utan det pekades motståndaren ut som
        // ledande på att släppa in flest.
        const lead = r.lowerIsBetter ? r.us < r.them : r.us > r.them;
        return (
          <div className="du-row" key={r.label}>
            <span className={`du-val${lead ? ' du-lead' : ''}`}>{fmt(r.us)}</span>
            <span className="du-track">
              <span className="du-half du-left">
                <i style={{ width: `${(Math.abs(r.us) / max) * 100}%` }} />
              </span>
              <span className="du-label">{r.label}</span>
              <span className="du-half du-right">
                <i style={{ width: `${(Math.abs(r.them) / max) * 100}%` }} />
              </span>
            </span>
            <span className={`du-val du-valr${!lead ? ' du-lead' : ''}`}>{fmt(r.them)}</span>
          </div>
        );
      })}
    </div>
  );
}

const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `\u2212${Math.abs(v)}` : '0');
const decimal = (v: number) => v.toFixed(2).replace('.', ',');

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

  // Under säsong jämförs årets siffror. Före första omgången finns inga, och
  // då får förra säsongen stå för jämförelsen — annars vore kortet tomt i
  // just den vecka det behövs mest.
  const duels: Duel[] = [];
  let duelNote = '';
  if (data.us && data.them && data.us_season && data.them_season) {
    duels.push(
      { label: 'Poäng', us: data.us.points, them: data.them.points },
      { label: 'Målskillnad', us: data.us_season.goals_for - data.us_season.goals_against,
        them: data.them_season.goals_for - data.them_season.goals_against, format: signed },
      { label: 'Mål per match', us: data.us_season.goals_for_avg, them: data.them_season.goals_for_avg, format: decimal },
      { label: 'Insläppta per match', us: data.us_season.goals_against_avg,
        them: data.them_season.goals_against_avg, format: decimal, lowerIsBetter: true },
    );
    duelNote = `Efter ${data.us.games_played} respektive ${data.them.games_played} matcher i år.`;
  }
  // Före omgång 1 finns inga siffror att ställa mot varandra. Att jämföra
  // 119 poäng i Allsvenskan med 73 i SHL vore att låtsas att talen betyder
  // samma sak; de gör de inte. Då säger kortet vad motståndaren gjorde i sin
  // egen serie, och visar inledningen — det enda som faktiskt är färskt.

  const streakText = (t: TeamSeason) =>
    t && t.streak.length > 1 ? `${t.streak.length} raka ${t.streak.won ? 'vinster' : 'förluster'}` : null;

  return (
    <section className={`im-card${data.is_premiere ? ' im-premiere' : ''}`}>
      <p className="mc-kicker">
        {data.is_premiere ? `Premiär · ${data.season}` : `Inför omgång ${data.round} av ${data.total_rounds}`}
      </p>

      {/* Nedräkningen är hjälten: det är den man öppnar appen för de dagar
          det inte spelas. Motståndaren står bredvid, inte under. */}
      <div className="im-hero">
        {/* Ett negativt tal betyder att matchen spelats men resultatet inte
            skördats än. Vi vet inte om den pågår, så rutan påstår det inte. */}
        <span className={`im-count${days < 0 ? ' im-count-wait' : ''}`}>
          {days < 0 ? (
            <b className="im-waittext">Väntar på resultat</b>
          ) : (
            <>
              <b>{days === 0 ? 'I DAG' : days}</b>
              {days > 0 && <i>{days === 1 ? 'dag' : 'dagar'}</i>}
            </>
          )}
        </span>
        <span className="im-meta">
          <span className="im-ha">{game.is_home ? 'Hemma mot' : 'Borta mot'}</span>
          <span className="im-opponent">{opponent}</span>
          <span className="im-when">
            {shortDate(game.date)}{game.time ? ` ${game.time}` : ''}
            {game.venue ? ` · ${game.venue}` : ''}
          </span>
        </span>
      </div>

      <Duels rows={duels} opponent={opponent} />
      {duelNote && <p className="mr-note im-duelnote">{duelNote}</p>}

      {duels.length === 0 && previous?.opponent && previous.season && (
        <p className="im-fact">
          <b>{opponent}</b> slutade {ordinal(previous.opponent.rank)}
          {previous.teams ? ` av ${previous.teams}` : ''} i {previous.season}.
        </p>
      )}

      {duels.length === 0 && data.upcoming.length > 1 && (
        <div className="im-start">
          <span className="im-startlabel">Inledningen</span>
          <div className="im-startrows">
            {data.upcoming.map((g, i) => (
              <div className={`im-startrow${i === 0 ? ' im-startnext' : ''}`} key={i}>
                <span className="im-startdate">{shortDate(g.date)}</span>
                <span className={`im-startha${g.is_home ? ' im-startha-h' : ''}`}>
                  {g.is_home ? 'H' : 'B'}
                </span>
                <span className="im-startopp">{g.opponent.replace(/^IF\s+/, '')}</span>
                <span className="im-starttime">{g.time || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Form games={data.us_form} label="Form · Björklöven" />
      <Form games={data.them_form} label={`Form · ${opponent}`} />

      {(streakText(data.us_season) || streakText(data.them_season)) && (
        <div className="im-streaks">
          {streakText(data.us_season) && <span><b>Björklöven</b> {streakText(data.us_season)}</span>}
          {streakText(data.them_season) && <span><b>{opponent}</b> {streakText(data.them_season)}</span>}
        </div>
      )}

      {data.meetings.length > 0 && (
        <div className="im-h2h">
          <span className="im-h2hlabel">Inbördes i år · {record.w}–{record.l}</span>
          <span className="im-h2hchips">
            {data.meetings.map((m, i) => (
              <span
                key={i}
                className={`im-h2hchip${m.goals_for > m.goals_against ? ' im-h2hwin' : ' im-h2hloss'}`}
                title={`${shortDate(m.date)} ${m.is_home ? 'hemma' : 'borta'}`}
              >
                {m.is_home ? 'H' : 'B'} {m.goals_for}–{m.goals_against}
              </span>
            ))}
          </span>
        </div>
      )}

      {data.venue_average != null && (
        <p className="mr-note">
          Arenan drar {data.venue_average.toLocaleString('sv-SE')} i snitt över{' '}
          {data.venue_games} hemmamatcher i år.
        </p>
      )}
    </section>
  );
}
