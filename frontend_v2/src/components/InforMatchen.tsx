import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/api';
import { humanName, ordinal, resultat } from '../lib/match';
import { MINSTA_MATCHER, useLeague } from '../lib/serien';
import { Delningsbild } from './share/Delningsbild';
import { drawForeMatchCard } from './share/foreMatchCard';
import type { ForeModel } from './share/foreMatchCard';

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
  // Fälten nedan kan saknas. Netlify bygger frontend direkt vid push medan
  // backend deployas för hand, så en ny klient möter regelbundet ett äldre
  // svar. Läses de utan skydd kraschar hela sidan — vilket de gjorde.
  us_season?: TeamSeason;
  them_season?: TeamSeason;
  us_form?: FormGame[];
  them_form?: FormGame[];
  meetings?: { date: string; is_home: boolean; goals_for: number; goals_against: number }[];
  upcoming?: { date: string; time: string | null; opponent: string; is_home: boolean }[];
  venue_average: number | null;
  venue_games: number;
  previous: { season?: string; teams?: number; opponent?: PrevRow; us?: PrevRow } | null;
  them_players?: {
    players: {
      name: string; number: number | null; position: string | null;
      games_played: number; goals: number; assists: number; points: number;
      points_last5: number;
      /** Poäng per match, äldst först; null = spelade inte. Saknas i äldre API. */
      last?: (number | null)[];
      hot?: boolean;
    }[];
    goalie: {
      name: string; games_played: number; save_pct: number | null; gaa: number | null;
      started_last?: boolean | null;
      /** Startade i respektive match; null = okänt. */
      starts?: (boolean | null)[];
      save_pct_last?: number | null;
    } | null;
    games_last: number;
    last_dates?: string[];
    first_unit?: {
      date: string | null;
      forwards: Plats[];
      defense: Plats[];
    } | null;
  } | null;
};

type Plats = { name: string; number: number | null; position: string | null };

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
        <span className="du-us">IF Björklöven</span>
        <span className="du-them">{opponent}</span>
      </div>
      {rows.map(r => {
        const max = Math.max(Math.abs(r.us), Math.abs(r.them), 1);
        const fmt = r.format || ((v: number) => String(v));
        // Insläppta mål är bättre lågt. Utan det pekades motståndaren ut som
        // ledande på att släppa in flest.
        const lead = r.lowerIsBetter ? r.us < r.them : r.us > r.them;
        // Lika är ingen ledning åt något håll.
        const tie = r.us === r.them;
        return (
          <div className="du-row" key={r.label}>
            <span className={`du-val${lead && !tie ? ' du-lead' : ''}`}>{fmt(r.us)}</span>
            <span className="du-track">
              <span className="du-half du-left">
                <i style={{ width: `${(Math.abs(r.us) / max) * 100}%` }} />
              </span>
              <span className="du-label">{r.label}</span>
              <span className="du-half du-right">
                <i style={{ width: `${(Math.abs(r.them) / max) * 100}%` }} />
              </span>
            </span>
            <span className={`du-val du-valr${!lead && !tie ? ' du-lead' : ''}`}>{fmt(r.them)}</span>
          </div>
        );
      })}
    </div>
  );
}

type Specialrad = { etikett: string; a: number; ap: number | null; b: number; bp: number | null; motEtikett: string };

/**
 * Poäng match för match som rutor, äldst till vänster. Tom ram: spelade
 * inte. Ljus ruta: spelade utan poäng. Fylld: poäng, med antalet i rutan.
 * Rutorna säger på en blick det som "5 p senaste 5" bara påstår: om det
 * kom jämnt eller i en enda match.
 */
function Rutor({ last, dates }: { last: (number | null)[]; dates: string[] }) {
  return (
    <span className="im-rutor" aria-hidden="true">
      {last.map((v, i) => (
        <i
          key={i}
          className={`im-ruta${v == null ? ' im-ruta-ej' : v === 0 ? ' im-ruta-0' : v === 1 ? ' im-ruta-1' : ' im-ruta-2'}`}
          title={`${dates[i] ? shortDate(dates[i]) : ''}: ${v == null ? 'spelade inte' : `${v} p`}`}
        >
          {v ? v : ''}
        </i>
      ))}
    </span>
  );
}

/**
 * Motståndarens poängbästa, den som är het just nu och den troliga
 * startmålvakten. Rutorna visar de senaste matcherna. Säsongens siffror står
 * till höger, eftersom det är dem Swehockey räknar som facit.
 */
function Nyckelspelare({ data, opponent }: { data: NextMatch['them_players'] | null; opponent: string }) {
  if (!data || (data.players.length === 0 && !data.goalie)) return null;
  const komma = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
  const dates = data.last_dates ?? [];
  const n = data.games_last;
  // Rutorna behövs bara när de säger något utöver säsongen: från två matcher.
  const visaRutor = n >= 2 && data.players.some(p => p.last && p.last.length === n);
  const g = data.goalie;
  const aria = (p: NonNullable<NextMatch['them_players']>['players'][number]) =>
    p.last ? `, ${p.last.map(v => (v == null ? 'spelade inte' : `${v} p`)).join(', ')} i de senaste ${n} matcherna` : '';
  return (
    <div className="im-ns">
      <div className="im-nshead">
        <span className="im-h2hlabel">Att hålla koll på · {opponent}</span>
        {visaRutor && <span className="im-nsfonster">senaste {n} →</span>}
      </div>
      {data.players.map(p => (
        <div className="im-nsrad" key={p.name}
          aria-label={`${humanName(p.name)}, ${p.goals} mål och ${p.assists} assist på ${p.games_played} matcher${aria(p)}`}>
          <span className="im-nsnr">{p.number ?? ''}</span>
          <span className="im-nsnamn">
            {humanName(p.name)}
            {p.hot && <em>Het · {p.points_last5} p senaste {n}</em>}
            {p.hot == null && p.games_played > n && p.points_last5 >= Math.max(3, n - 1) && (
              <em>{p.points_last5} p senaste {n}</em>
            )}
          </span>
          <span className="im-nspos">{p.position ?? ''}</span>
          {visaRutor && (p.last ? <Rutor last={p.last} dates={dates} /> : <span />)}
          <span className="im-nstal">{p.goals}+{p.assists}</span>
        </div>
      ))}
      {g && g.save_pct != null && (
        <div className="im-nsrad" aria-label={`Målvakt ${humanName(g.name)}, ${komma(g.save_pct)} procent räddningar`}>
          <span className="im-nsnr" />
          <span className="im-nsnamn">
            {humanName(g.name)}
            {g.started_last && <em className="im-nsstart">Startade senast</em>}
            {/* Senaste matcherna bara när säsongen är längre än så; annars
                är det samma matcher, och protokollen och Swehockeys
                målvaktsstatistik skiljer sig ibland åt. */}
            {g.save_pct_last != null && g.games_played > n && (
              <em className="im-nsstart">{komma(g.save_pct_last)} % senaste {n}</em>
            )}
          </span>
          <span className="im-nspos">GK</span>
          {visaRutor && (g.starts && g.starts.length === n ? (
            <span className="im-rutor" aria-hidden="true">
              {g.starts.map((st, i) => (
                <i key={i}
                  className={`im-ruta${st ? ' im-ruta-start' : ' im-ruta-ej'}`}
                  title={`${dates[i] ? shortDate(dates[i]) : ''}: ${st ? 'startade' : st === false ? 'startade inte' : 'okänt'}`} />
              ))}
            </span>
          ) : <span />)}
          <span className="im-nstal">{komma(g.save_pct)} %</span>
        </div>
      )}
      {/* Rutorna är inte självklara: en rad förklarar dem. */}
      {visaRutor && (
        <p className="mr-note im-nsforklaring">
          Rutorna är de senaste {n} matcherna, äldst till vänster: siffran är poäng, tom ruta spelade inte.
          {g?.starts && g.starts.length === n ? ' För målvakten: fylld ruta startade.' : ''}
        </p>
      )}
      <Femma unit={data.first_unit ?? null} />
    </div>
  );
}

/**
 * Motståndarens förstafemma i senaste matchen, uppställd som på isen:
 * forwards överst, backparet under. Uppställningen säger bara kedja, så
 * forward eller back kommer ur spelarens position i statistiken.
 */
function Femma({ unit }: { unit: NonNullable<NextMatch['them_players']>['first_unit'] | null }) {
  if (!unit || unit.forwards.length === 0) return null;
  const chip = (p: Plats) => (
    <span className="im-femchip" key={p.name} title={humanName(p.name)}>
      <b>{p.number ?? ''}</b>{p.name.split(',')[0].trim()}
    </span>
  );
  return (
    <div className="im-femma" aria-label={`Förstafemman senast: ${[...unit.forwards, ...unit.defense].map(p => humanName(p.name)).join(', ')}`}>
      <span className="im-h2hlabel">Förstafemman{unit.date ? ` · ${shortDate(unit.date)}` : ''}</span>
      <div className="im-femrad">{unit.forwards.map(chip)}</div>
      {unit.defense.length > 0 && <div className="im-femrad">{unit.defense.map(chip)}</div>}
    </div>
  );
}

type Prognos = {
  date: string;
  home_team: string;
  away_team: string;
  home_games: number;
  away_games: number;
  p_home_regulation: number;
  p_overtime: number;
  p_away_regulation: number;
  /** Vinst totalt, förlängning och straffar inräknade. Saknas i äldre API. */
  p_home_win?: number;
  p_away_win?: number;
};

/**
 * Matchmodellens bild av matchen, som en stapel.
 *
 * Björklöven till vänster oavsett hemma eller borta, som i jämförelsen
 * ovanför. Tre fält: vinst i ordinarie tid, förlängning, förlust i
 * ordinarie tid. Procenten står i fälten; en mening under hade upprepat dem.
 */
function Prognosstapel({ p, opponent }: { p: Prognos; opponent: string }) {
  const hemma = BJK_RE.test(p.home_team);
  const vi = hemma ? p.p_home_regulation : p.p_away_regulation;
  const de = hemma ? p.p_away_regulation : p.p_home_regulation;
  const ot = p.p_overtime;
  const vinst = (hemma ? p.p_home_win : p.p_away_win) ?? vi + ot / 2;
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  return (
    <div className="pg">
      <div className="pg-head">
        <span className="pg-vi">IF Björklöven</span>
        <span className="pg-mitt">Förlängning</span>
        <span className="pg-de">{opponent}</span>
      </div>
      <div className="pg-bar" role="img"
        aria-label={`Prognos: Björklöven vinner i ordinarie tid ${pct(vi)}, förlängning ${pct(ot)}, ${opponent} vinner i ordinarie tid ${pct(de)}.`}>
        <span className="pg-f pg-f-vi" style={{ flexGrow: vi }}>{pct(vi)}</span>
        <span className="pg-f pg-f-ot" style={{ flexGrow: ot }}>{pct(ot)}</span>
        <span className="pg-f pg-f-de" style={{ flexGrow: de }}>{pct(de)}</span>
      </div>
      {/* Stapeln gäller full tid. Förlängningen räknad till hela matchen
          står här, så att den inte läses som ett annat svar. */}
      <p className="mc-note">
        Efter full tid. Med förlängningen är sannolikheten för vinst {pct(vinst)}.{' '}
        <Link className="md-lank" to="/metod#forlangning">Så räknas det</Link>
      </p>
    </div>
  );
}

const BJK_RE = /bj[oö]rkl[oö]ven/i;

const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `\u2212${Math.abs(v)}` : '0');
const decimal = (v: number) => v.toFixed(2).replace('.', ',');

const WEEKDAYS = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];

/** Kortet inför matchen byggs ur samma svar som rutan visar, inget annat. */
function foreModel(data: NextMatch, p: Prognos | null): ForeModel {
  const { game } = data;
  const opponent = game.opponent;
  const d = new Date(`${String(game.date).slice(0, 10)}T00:00:00`);
  const days = daysUntil(game.date);

  let prognos: ForeModel['prognos'] = null;
  let big = days <= 0 ? 'I dag' : days === 1 ? 'I morgon' : `Om ${days} dagar`;
  let bigLabel = 'Nedsläpp';
  if (p) {
    const hemma = BJK_RE.test(p.home_team);
    const vi = hemma ? p.p_home_regulation : p.p_away_regulation;
    const de = hemma ? p.p_away_regulation : p.p_home_regulation;
    prognos = { vi, ot: p.p_overtime, de };
    const vinst = (hemma ? p.p_home_win : p.p_away_win) ?? vi + p.p_overtime / 2;
    big = `${Math.round(vinst * 100)} %`;
    bigLabel = 'Sannolikhet för vinst';
  }

  const tp = data.them_players;
  const topp = tp?.players[0];
  const hero = topp
    ? { label: 'Deras poängbästa', name: topp.name.split(',')[0].trim(),
        detail: `${topp.goals}+${topp.assists} på ${topp.games_played} ${topp.games_played === 1 ? 'match' : 'matcher'}` }
    : null;

  const stats: ForeModel['stats'] = [];
  if (data.us && data.them && data.us.games_played > 0 && data.them.games_played > 0) {
    stats.push({ label: 'Tabellen', value: `${ordinal(data.us.rank)} – ${ordinal(data.them.rank)}` });
  }
  const us = data.us_season;
  const them = data.them_season;
  if (us && them && us.games > 0 && them.games > 0) {
    const fmt = (v: number) => v.toFixed(1).replace('.', ',');
    stats.push({ label: 'Mål per match', value: `${fmt(us.goals_for_avg)} – ${fmt(them.goals_for_avg)}` });
  }
  if (tp?.goalie?.save_pct != null) {
    stats.push({ label: 'Deras målvakt', value: `${tp.goalie.save_pct.toFixed(1).replace('.', ',')} %` });
  }
  const meetings = data.meetings ?? [];
  if (meetings.length > 0) {
    const w = meetings.filter(m => m.goals_for > m.goals_against).length;
    stats.push({ label: 'Inbördes', value: `${w}–${meetings.length - w}` });
  } else if (data.previous?.opponent?.rank && stats.length < 4 && data.us && data.us.games_played === 0) {
    stats.push({ label: `${opponent} i fjol`, value: ordinal(data.previous.opponent.rank) });
  }

  const form = [
    { team: 'IF Björklöven', games: (data.us_form ?? []).map(g => ({ won: g.won, ot: g.beyond_regulation })) },
    { team: opponent, games: (data.them_form ?? []).map(g => ({ won: g.won, ot: g.beyond_regulation })) },
  ].filter(f => f.games.length > 0);

  return {
    when: [
      `${WEEKDAYS[d.getDay()]} ${shortDate(game.date)}${game.time ? ` ${game.time}` : ''}`,
      game.venue || '',
    ].filter(Boolean),
    eyebrow: data.is_premiere ? 'Premiär' : `Inför omgång ${data.round} av ${data.total_rounds}`,
    big,
    bigLabel,
    usLabel: 'IF Björklöven',
    themLabel: `${game.is_home ? 'hemma' : 'borta'} mot ${opponent}`,
    opponent,
    hero,
    prognos,
    form,
    stats,
  };
}

export function InforMatchen({ season }: { season: string | null }) {
  const [data, setData] = useState<NextMatch | null>(null);
  const [prognos, setPrognos] = useState<Prognos | null>(null);
  const [dela, setDela] = useState(false);
  const league = useLeague(season || '');

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

  // Matchmodellen. Får saknas: ett äldre API har inte endpointen, och kortet
  // ska fungera utan den.
  useEffect(() => {
    const ctrl = new AbortController();
    const q = season ? `?season=${encodeURIComponent(season)}` : '';
    fetch(`${API_URL}/api/v1/prediction${q}`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(j => setPrognos(j?.status === 'ok' && j.next ? j.next : null))
      .catch(() => {});
    return () => ctrl.abort();
  }, [season]);

  if (!data) return null;

  const { game, previous } = data;
  const days = daysUntil(game.date);
  const opponent = game.opponent;
  const meetings = data.meetings ?? [];
  const upcoming = data.upcoming ?? [];
  const usForm = data.us_form ?? [];
  const themForm = data.them_form ?? [];
  const usSeason = data.us_season ?? null;
  const themSeason = data.them_season ?? null;
  const record = meetings.reduce(
    (a, m) => (m.goals_for > m.goals_against ? { ...a, w: a.w + 1 } : { ...a, l: a.l + 1 }),
    { w: 0, l: 0 },
  );

  // Under säsong jämförs årets siffror. Före första omgången finns inga, och
  // då får förra säsongen stå för jämförelsen — annars vore kortet tomt i
  // just den vecka det behövs mest.
  const duels: Duel[] = [];
  let duelNote = '';
  let specialteam: Specialrad[] = [];
  if (data.us && data.them && usSeason && themSeason) {
    duels.push(
      { label: 'Poäng', us: data.us.points, them: data.them.points },
      { label: 'Målskillnad', us: usSeason.goals_for - usSeason.goals_against,
        them: themSeason.goals_for - themSeason.goals_against, format: signed },
      { label: 'Mål per match', us: usSeason.goals_for_avg, them: themSeason.goals_for_avg, format: decimal },
      { label: 'Insläppta per match', us: usSeason.goals_against_avg,
        them: themSeason.goals_against_avg, format: decimal, lowerIsBetter: true },
    );
    duelNote = `Efter ${data.us.games_played} respektive ${data.them.games_played} matcher i år.`;

    // Seriens lagstatistik: hur lagen spelar, inte bara vad det gav.
    const oss = league?.teams.find(t => t.is_ours);
    const dem = league?.teams.find(t => t.team === game.opponent);
    // Värdena visas från första matchen, som mål per match ovanför. Gränsen
    // gäller bara placeringarna i specialteamen längre ned.
    if (oss && dem && oss.gp > 0 && dem.gp > 0) {
      const procent = (v: number) => `${Math.round(v)} %`;
      const enDecimal = (v: number) => v.toFixed(1).replace('.', ',');
      for (const [key, label, format, lowerIsBetter] of [
        ['sf_pg', 'Skott per match', enDecimal, false],
        ['shot_share', 'Andel av skotten', procent, false],
        ['sh_pct', 'Skottprocent', (v: number) => `${enDecimal(v)} %`, false],
        ['sv_pct', 'Räddningsprocent', procent, false],
        ['fo_pct', 'Tekningar', procent, false],
        ['pim_pg', 'Utvisningsmin per match', enDecimal, true],
      ] as const) {
        const a = oss.values[key];
        const b = dem.values[key];
        // Hela procent där det går: kolumnen rymmer inte "100,0 %" på en
        // telefon. Skottprocenten får en decimal, den ligger oftast kring tio.
        if (a != null && b != null) duels.push({ label, us: a, them: b, format, lowerIsBetter });
      }
    }
    if (oss && dem && oss.gp >= MINSTA_MATCHER && dem.gp >= MINSTA_MATCHER) {
      // Powerplay möter boxplay, inte powerplay. Placeringen i serien säger
      // om talet är bra; 20 % i powerplay och 80 % i boxplay går inte att
      // ställa mot varandra som staplar.
      const plats = (key: 'pp_pct' | 'pk_pct', v: number | null | undefined) =>
        v == null || !league ? null
          : 1 + league.teams.filter(t => t.gp >= MINSTA_MATCHER && (t.values[key] ?? -1) > v).length;
      const rad = (etikett: string, a: number | null | undefined, ak: 'pp_pct' | 'pk_pct',
                   b: number | null | undefined, bk: 'pp_pct' | 'pk_pct', motEtikett: string) =>
        a != null && b != null
          ? { etikett, a: Math.round(a), ap: plats(ak, a), b: Math.round(b), bp: plats(bk, b), motEtikett }
          : null;
      specialteam = [
        rad('Vårt powerplay', oss.values.pp_pct, 'pp_pct', dem.values.pk_pct, 'pk_pct', 'deras boxplay'),
        rad('Deras powerplay', dem.values.pp_pct, 'pp_pct', oss.values.pk_pct, 'pk_pct', 'vårt boxplay'),
      ].filter(x => x != null);
    }
  }
  // Före omgång 1 finns inga siffror att ställa mot varandra. Att jämföra
  // 119 poäng i Allsvenskan med 73 i SHL vore att låtsas att talen betyder
  // samma sak; de gör de inte. Då säger kortet vad motståndaren gjorde i sin
  // egen serie, och visar inledningen — det enda som faktiskt är färskt.

  const visaPrognos = !!prognos && prognos.date === String(game.date).slice(0, 10)
    && (BJK_RE.test(prognos.home_team) ? prognos.home_games : prognos.away_games) >= MINSTA_MATCHER;

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

      {/* Samma gräns som seriekorten: efter en match vet modellen för lite om
          ett lag den inte sett förra säsongen. Prognosen gäller nästa match
          och bara om den är densamma som kortet handlar om. */}
      {visaPrognos && <Prognosstapel p={prognos!} opponent={opponent} />}

      <Duels rows={duels} opponent={opponent} />
      {duelNote && <p className="mr-note im-duelnote">{duelNote}</p>}

      {duels.length === 0 && previous?.opponent && previous.season && (
        <p className="im-fact">
          <b>{opponent}</b> slutade {ordinal(previous.opponent.rank)}
          {previous.teams ? ` av ${previous.teams}` : ''} i {previous.season}.
        </p>
      )}

      {duels.length === 0 && upcoming.length > 1 && (
        <p className="im-fact im-next-after">
          Därefter: {upcoming[1].opponent} {upcoming[1].is_home ? 'hemma' : 'borta'}
        </p>
      )}

      {specialteam.length > 0 && (
        <div className="im-st">
          <span className="im-h2hlabel">Specialteam</span>
          {specialteam.map(r => (
            <div className="im-strad" key={r.etikett}>
              <span className="im-stnamn">{r.etikett}</span>
              <span className="im-sttal">{r.a} %{r.ap && <i>{ordinal(r.ap)}</i>}</span>
              <span className="im-stmot">mot</span>
              <span className="im-sttal">{r.b} %{r.bp && <i>{ordinal(r.bp)}</i>}</span>
              <span className="im-stnamn im-stnamnr">{r.motEtikett}</span>
            </div>
          ))}
        </div>
      )}

      <Nyckelspelare data={data.them_players ?? null} opponent={opponent} />

      <Form games={usForm} label="Form · IF Björklöven" />
      <Form games={themForm} label={`Form · ${opponent}`} />

      {(streakText(usSeason) || streakText(themSeason)) && (
        <div className="im-streaks">
          {streakText(usSeason) && <span><b>IF Björklöven</b> {streakText(usSeason)}</span>}
          {streakText(themSeason) && <span><b>{opponent}</b> {streakText(themSeason)}</span>}
        </div>
      )}

      {meetings.length > 0 && (
        <div className="im-h2h">
          <span className="im-h2hlabel">Inbördes i år · {record.w}–{record.l}</span>
          <span className="im-h2hchips">
            {meetings.map((m, i) => (
              <span
                key={i}
                className={`im-h2hchip${m.goals_for > m.goals_against ? ' im-h2hwin' : ' im-h2hloss'}`}
                title={`${shortDate(m.date)} ${m.is_home ? 'hemma' : 'borta'}`}
              >
                {m.is_home ? 'H' : 'B'} {resultat(m.goals_for, m.goals_against, m.is_home)}
              </span>
            ))}
          </span>
        </div>
      )}

      {dela ? (
        <div className="im-dela">
          <Delningsbild
            draw={ctx => drawForeMatchCard(ctx, foreModel(data, visaPrognos ? prognos : null))}
            filnamn={`infor-${game.date}-${opponent.replace(/\s+/g, '-').toLowerCase()}.png`}
            titel={`Björklöven ${game.is_home ? 'hemma' : 'borta'} mot ${opponent}`}
            rubrik="Inför matchen"
            beskrivning={`Delbart kort inför matchen mot ${opponent}`}
            nyckel={`${game.date}|${game.opponent}|${visaPrognos ? prognos!.p_home_regulation : ''}|${data.them_players?.players.length ?? 0}`}
          />
        </div>
      ) : (
        <button type="button" className="share-btn im-delaknapp" onClick={() => setDela(true)}>
          Dela som bild
        </button>
      )}

      {data.venue_average != null && (
        <p className="mr-note">
          Arenan drar {data.venue_average.toLocaleString('sv-SE')} i snitt över{' '}
          {data.venue_games} {data.venue_games === 1 ? 'hemmamatch' : 'hemmamatcher'} i år.
        </p>
      )}
    </section>
  );
}
