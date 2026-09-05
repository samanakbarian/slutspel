import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';
import { EmptySeason } from '../components/EmptySeason';
import { FormDots, PairedBar, PeriodBars, Sparkline } from '../components/charts/Charts';

/**
 * Statistiken i tre ytor i stället för fem flikar:
 *
 *   Laget       — säsongen i ett svep: facit, form, hemma/borta, perioder,
 *                 specialteam, matchlägen.
 *   Spelare     — poängliga och målvakter, växlingsbart mellan Löven och
 *                 hela serien. Varje Lövenrad leder till spelarens profil.
 *   Utveckling  — allt som rör sig över tid: poängkurva, form, Elo, när
 *                 målen faller, publik, utvisningar.
 *
 * Tidigare låg en hel analysmodul (Recharts, ~1000 rader) nästlad i en
 * underflik här. Den ligger kvar för /preseason-shl men laddas inte längre
 * på statistiksidan — diagrammen nedan är handritad SVG.
 */

/* ── Typer ── */
type Season = { key: string; name?: string; league?: string; has_team_data?: boolean | null };

type Standing = {
  rank?: number; games_played?: number; wins?: number; ot_wins?: number;
  ot_losses?: number; losses?: number; points?: number; goal_diff?: number;
};

type RawGame = {
  game_id?: number | null; match_date?: string; date?: string; home_team?: string;
  away_team?: string; result?: string; bjk_is_home?: boolean; bjk_result?: string;
  home_goals?: number; away_goals?: number;
};

type Game = {
  gameId: number | null; date: string; home: string; away: string;
  hg: number; ag: number; isHome: boolean; res: string; played: boolean;
};

type Skater = {
  name: string; team: string; pos: string; num: number; gp: number;
  g: number; a: number; p: number; ppg: string; pim: number; pm: string;
  isBjk: boolean;
};

type Goalie = {
  name: string; team: string; gp: number; ga: number; gaa: string;
  svp: string; so: number; w: number; l: number; isBjk: boolean;
};

type ApiPlayer = {
  name: string; jersey_number: number | null; position: string; games_played: number;
  goals: number; assists: number; points: number; pim: number; plus_minus: number;
  points_per_game: number; percentiles: Record<string, number> | null;
};

type OnIcePlayer = {
  jersey_number: number; name: string; position: string | null; is_goalie: boolean;
  gf_on: number; ga_on: number; gf_on_ev: number; ga_on_ev: number;
  diff: number; diff_ev: number; gf_share_pct: number;
  official_plus_minus: number | null;
};

type OnIce = {
  status: string;
  games_with_events: number;
  team_goals_for: number;
  team_goals_against: number;
  players: OnIcePlayer[];
  top_pairs: { numbers: number[]; names: (string | null)[]; goals_for: number }[];
};

type GoalieSide = { games: number; shots_against: number; saves: number; goals_against: number; save_pct: number | null };

type GoalieGame = {
  game_id: number | null; date: string; is_home: boolean; opponent: string;
  save_pct: number | null; saves: number; shots_against: number; goals_against: number;
};

type GoalieFull = {
  name: string; jersey_number: number | null; games_played: number;
  wins: number; losses: number; shutouts: number;
  goals_against: number; shots_against: number; saves: number;
  save_pct: number | null; gaa: number | null;
  home: GoalieSide; away: GoalieSide; game_log: GoalieGame[];
};

type GoalieData = { status: string; games_with_log: number; goalies: GoalieFull[] };

type Split = { gp: number; w: number; l: number; otw: number; otl: number; gf: number; ga: number; pts: number };
type StateRecord = { w: number; l: number; otl?: number };

type Modules = {
  timeline?: { date: string; opponent: string; result: string; score: string; cumPts: number; isHome: boolean; gf: number; ga: number }[];
  splits?: { home: Split; away: Split };
  periods?: { period: number; label: string; gf: number; ga: number; games: number }[];
  form?: { date: string; matchNum: number; pts: number; gf_avg: number; ga_avg: number; window: number }[];
  streaks?: {
    longest_win: { length: number; start: string; end: string } | null;
    longest_loss: { length: number; start: string; end: string } | null;
    current: { type: string; length: number } | null;
  };
  special_teams?: { pp_goals: number; pp_opportunities: number; pp_pct: number; pk_goals_against: number; pk_times: number; pk_pct: number; total_pim: number; avg_pim_per_game: number; special_teams_index: number };
  attendance?: { avg: number; max: number; min: number; home_games: number; trend?: { date: string; opponent: string; spectators: number }[] };
  penalty_breakdown?: { by_period: { period: number; count: number }[]; most_penalized: { name: string; count: number; minutes: number }[] };
  game_state?: {
    lead_after_1: StateRecord; trail_after_1: StateRecord; tied_after_1: StateRecord;
    lead_after_2: StateRecord; trail_after_2: StateRecord; tied_after_2: StateRecord;
    game_types?: { one_goal: StateRecord; two_goals: StateRecord; three_plus_goals: StateRecord };
  };
  predictions?: { elo_history?: { date: string; elo: number }[]; scoring_timeline?: { interval: string; gf: number; ga: number }[] };
};

type Segment = 'laget' | 'spelare' | 'utveckling';
type Scope = 'loven' | 'serien';

const BJK = /bj[oö]rkl[oö]ven|ifb/i;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function shortDate(d: string): string {
  const x = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  return Number.isNaN(x.getTime()) ? d : `${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

/**
 * "Efternamn, Förnamn" → "Förnamn Efternamn".
 * Swehockey markerar vissa spelare med asterisker; de hör inte till namnet.
 */
function humanName(n: string): string {
  const clean = String(n || '').replace(/[*†‡]+/g, '').trim();
  const p = clean.split(',').map(s => s.trim());
  return p.length === 2 && p[1] ? `${p[1]} ${p[0]}` : clean;
}

const shortTeam = (t: string) => String(t || '').replace(/^(IF|IK|HC|BIK)\s+/, '');

/**
 * Efternamnet ur "Efternamn, Förnamn". Två fulla namn på samma rad ryms inte
 * på en telefon, och efternamnet är det som skiljer spelarna åt.
 */
function surname(n: string | null): string {
  const clean = String(n || '').replace(/[*†‡]+/g, '').trim();
  return clean.includes(',') ? clean.split(',')[0].trim() : clean.split(' ').slice(-1)[0];
}

/* ── Normalisering: API:t levererar flera generationers fältnamn ── */
function normGame(g: RawGame): Game {
  const date = String(g.match_date || g.date || '').slice(0, 10);
  const home = g.home_team || '';
  const away = g.away_team || '';
  const isHome = g.bjk_is_home ?? BJK.test(home);
  const m = String(g.result || '').replace(/ /g, ' ').match(/(\d+)\s*-\s*(\d+)/);
  const hg = g.home_goals ?? (m ? Number(m[1]) : 0);
  const ag = g.away_goals ?? (m ? Number(m[2]) : 0);
  let res = g.bjk_result || '';
  if (!res && m) {
    const ours = isHome ? hg : ag;
    const theirs = isHome ? ag : hg;
    res = ours > theirs ? 'W' : ours < theirs ? 'L' : 'D';
  }
  // En match räknas som spelad först när den har ett faktiskt resultat.
  return { gameId: g.game_id ?? null, date, home, away, hg, ag, isHome, res, played: Boolean(m) };
}

function normSkater(p: Record<string, unknown>): Skater {
  const num = (p.jersey_number ?? p.number ?? 0) as number;
  const gp = (p.games_played ?? p.gp ?? 0) as number;
  const pts = (p.points ?? 0) as number;
  const team = String(p.team_code || p.team || '');
  return {
    name: String(p.player_name || p.name || ''),
    team, pos: String(p.position || ''), num: Number(num) || 0,
    gp: Number(gp) || 0,
    g: Number(p.goals ?? 0), a: Number(p.assists ?? 0), p: Number(pts) || 0,
    ppg: gp ? (Number(pts) / Number(gp)).toFixed(2) : '–',
    pim: Number(p.pim ?? 0), pm: String(p.plus_minus ?? ''),
    isBjk: BJK.test(team),
  };
}

function normGoalie(g: Record<string, unknown>): Goalie {
  const team = String(g.team_code || g.team || '');
  const svp = g.svs_pct ?? g.save_pct ?? '';
  return {
    name: String(g.goalie_name || g.name || ''), team,
    gp: Number(g.games_played ?? g.gp ?? 0),
    ga: Number(g.goals_against ?? g.ga ?? 0),
    gaa: g.gaa != null && g.gaa !== '' ? Number(g.gaa).toFixed(2) : '–',
    svp: svp !== '' && svp != null ? Number(svp).toFixed(2) : '–',
    so: Number(g.shutouts ?? g.so ?? 0),
    w: Number(g.wins ?? 0), l: Number(g.losses ?? 0),
    isBjk: BJK.test(team),
  };
}

function apiPlayerToSkater(p: ApiPlayer): Skater {
  return {
    name: p.name, team: 'IF Björklöven', pos: p.position, num: p.jersey_number ?? 0,
    gp: p.games_played, g: p.goals, a: p.assists, p: p.points,
    ppg: p.points_per_game.toFixed(2), pim: p.pim,
    pm: p.plus_minus > 0 ? `+${p.plus_minus}` : String(p.plus_minus),
    isBjk: true,
  };
}

/**
 * Hämtning med tidsgräns och ett automatiskt omtag.
 *
 * Cloud Run skalar ner till noll mellan besöken, så det första anropet betalar
 * både kallstart och en okachad BigQuery-fråga och kan gå över tidsgränsen.
 * Andra försöket möter en varm instans och svarar på någon sekund. Utan
 * omtaget möttes förstabesökaren av "tidsgränsen gick ut" trots att sidan
 * hade fungerat direkt om den laddats om.
 */
async function fetchJson(
  url: string,
  outer: AbortSignal,
  timeoutMs: number,
  attempts = 2,
): Promise<any> {
  let last: Error = new Error('Okänt fel');
  for (let i = 0; i < attempts; i += 1) {
    const ctrl = new AbortController();
    const relay = () => ctrl.abort();
    outer.addEventListener('abort', relay);
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
      if (!r.ok) throw new Error(`Servern svarade ${r.status}`);
      return await r.json();
    } catch (e) {
      last = e as Error;
      // Sidan lämnades eller säsongen byttes — då ska inget nytt försök göras.
      if (outer.aborted) throw last;
    } finally {
      window.clearTimeout(timer);
      outer.removeEventListener('abort', relay);
    }
  }
  throw last;
}

/* ── Byggstenar ── */
function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="st-stat">
      <span className="st-statval" style={tone ? { color: tone } : undefined}>{value}</span>
      <span className="st-statlbl">{label}</span>
    </div>
  );
}

function KV({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="st-kv">
      <span className="st-kvlabel">{label}</span>
      <span className="st-kvvalue">{value}</span>
      {hint && <span className="st-kvhint">{hint}</span>}
    </div>
  );
}

const rec = (r: StateRecord | undefined) =>
  r ? `${r.w}–${r.l}${r.otl ? `–${r.otl}` : ''}` : '–';

type SortKey = 'num' | 'name' | 'gp' | 'g' | 'a' | 'p' | 'ppg' | 'pm' | 'onice' | 'share';

/** Kolumner som går att sortera på, med riktning som känns naturlig först. */
const SKATER_COLUMNS: { key: SortKey; label: string; left?: boolean; desc: boolean; title: string }[] = [
  { key: 'num', label: '#', desc: false, title: 'Tröjnummer' },
  { key: 'name', label: 'Spelare', left: true, desc: false, title: 'Namn' },
  { key: 'gp', label: 'GP', desc: true, title: 'Spelade matcher' },
  { key: 'g', label: 'M', desc: true, title: 'Mål' },
  { key: 'a', label: 'A', desc: true, title: 'Assist' },
  { key: 'p', label: 'P', desc: true, title: 'Poäng' },
  { key: 'ppg', label: 'P/M', desc: true, title: 'Poäng per match' },
  { key: 'pm', label: '+/-', desc: true, title: 'Plus/minus enligt tabellen' },
  { key: 'onice', label: 'På is', desc: true, title: 'Mål för minus mål emot medan spelaren stod på isen' },
  { key: 'share', label: 'Andel', desc: true, title: 'Andel av lagets mål spelaren var med på' },
];

function SkaterTable({
  rows, showTeam, season, onIceByNumber,
}: {
  rows: Skater[];
  showTeam: boolean;
  season: string;
  onIceByNumber?: Map<number, OnIcePlayer>;
}) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'p', desc: true });
  const hasOnIce = Boolean(onIceByNumber && onIceByNumber.size > 0);

  const to = (s: Skater) => `/statistik/spelare/${encodeURIComponent(s.name)}${season ? `?season=${season}` : ''}`;

  const columns = SKATER_COLUMNS.filter(c => (c.key === 'onice' || c.key === 'share' ? hasOnIce : true));

  const value = (s: Skater, key: SortKey): number | string => {
    const oi = onIceByNumber?.get(s.num);
    switch (key) {
      case 'num': return s.num;
      case 'name': return humanName(s.name);
      case 'gp': return s.gp;
      case 'g': return s.g;
      case 'a': return s.a;
      case 'p': return s.p;
      case 'ppg': return s.gp ? s.p / s.gp : -1;
      // Tomt värde ska alltid hamna sist, oavsett riktning.
      case 'pm': return Number(String(s.pm).replace('+', '')) || (s.pm ? 0 : -999);
      case 'onice': return oi ? oi.diff : -999;
      case 'share': return oi ? oi.gf_share_pct : -1;
    }
  };

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const x = value(a, sort.key);
      const y = value(b, sort.key);
      const cmp = typeof x === 'string' && typeof y === 'string'
        ? x.localeCompare(y, 'sv')
        : Number(x) - Number(y);
      return sort.desc ? -cmp : cmp;
    });
    return list;
  }, [rows, sort, onIceByNumber]);

  const toggle = (c: typeof SKATER_COLUMNS[number]) =>
    setSort(prev => (prev.key === c.key ? { key: c.key, desc: !prev.desc } : { key: c.key, desc: c.desc }));

  return (
    <div className="mc-tablewrap">
      <table className="mc-table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className={c.left ? 'mc-left' : undefined}
                  aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
                <button type="button" className="st-sort" onClick={() => toggle(c)} title={c.title}>
                  {c.label}
                  {sort.key === c.key && <span aria-hidden="true">{sort.desc ? '▾' : '▴'}</span>}
                </button>
              </th>
            ))}
            {showTeam && <th>Lag</th>}
            <th>Pos</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => {
            const oi = onIceByNumber?.get(s.num);
            return (
              <tr
                key={`${s.name}-${i}`}
                className={`${showTeam && s.isBjk ? 'mc-hl ' : ''}${s.isBjk ? 'st-click' : ''}`}
                onClick={s.isBjk ? () => navigate(to(s)) : undefined}
              >
                <td>{s.num || '–'}</td>
                <td className="mc-left st-pname">
                  {s.isBjk
                    ? (
                      <Link className="st-plink" to={to(s)} onClick={e => e.stopPropagation()}>
                        {humanName(s.name)}
                        <span className="st-plink-arrow" aria-hidden="true">›</span>
                      </Link>
                    )
                    : humanName(s.name)}
                </td>
                <td>{s.gp}</td>
                <td>{s.g}</td>
                <td>{s.a}</td>
                <td className="mc-pts">{s.p}</td>
                <td>{s.ppg}</td>
                <td>{s.pm || '–'}</td>
                {hasOnIce && <td>{oi ? (oi.diff > 0 ? `+${oi.diff}` : oi.diff) : '–'}</td>}
                {hasOnIce && <td>{oi ? `${oi.gf_share_pct}%` : '–'}</td>}
                {showTeam && <td>{shortTeam(s.team)}</td>}
                <td>{s.pos || '–'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GoalieTable({ rows, showTeam }: { rows: Goalie[]; showTeam: boolean }) {
  return (
    <div className="mc-tablewrap">
      <table className="mc-table">
        <thead>
          <tr>
            <th className="mc-left">Målvakt</th>
            {showTeam && <th>Lag</th>}
            <th>GP</th>
            <th>IM</th>
            <th>GAA</th>
            <th>Rp%</th>
            <th>NC</th>
            <th>V</th>
            <th>F</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g, i) => (
            <tr key={`${g.name}-${i}`} className={showTeam && g.isBjk ? 'mc-hl' : ''}>
              <td className="mc-left st-pname">{humanName(g.name)}</td>
              {showTeam && <td>{shortTeam(g.team)}</td>}
              <td>{g.gp}</td>
              <td>{g.ga}</td>
              <td>{g.gaa}</td>
              <td className="mc-pts">{g.svp}</td>
              <td>{g.so}</td>
              <td>{g.w}</td>
              <td>{g.l}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export function StatisticsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [season, setSeason] = useState('');
  const [segment, setSegment] = useState<Segment>('laget');
  const [scope, setScope] = useState<Scope>('loven');

  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  // Bumpas av "Försök igen" och tvingar om alla hämtningar för säsongen.
  const [reloadKey, setReloadKey] = useState(0);
  // En kall server tar tiotals sekunder. Utan besked ser sidan hängd ut.
  const [slow, setSlow] = useState(false);
  // Utan den här hämtas statistik och analys en gång utan säsong och en gång
  // till så snart säsongslistan svarat — två dyra frågor per besök, där den
  // första ändå kastas bort.
  const [seasonsReady, setSeasonsReady] = useState(false);

  const [modules, setModules] = useState<Modules | null>(null);
  const [analyticsState, setAnalyticsState] = useState<'idle' | 'loading' | 'error'>('idle');

  const [players, setPlayers] = useState<ApiPlayer[] | null>(null);
  const [playersState, setPlayersState] = useState<'idle' | 'loading' | 'missing'>('idle');
  const [onIce, setOnIce] = useState<OnIce | null>(null);
  const [onIceState, setOnIceState] = useState<'idle' | 'loading' | 'missing'>('idle');
  const [keepers, setKeepers] = useState<GoalieData | null>(null);
  const [keepersState, setKeepersState] = useState<'idle' | 'loading' | 'missing'>('idle');

  /* Säsonger */
  useEffect(() => {
    fetch(`${API_URL}/api/v1/seasons`)
      .then(r => r.json())
      .then(d => {
        const all: Season[] = Array.isArray(d.seasons) ? d.seasons : [];
        // Flera säsonger finns bara som jämförelsedata för prognosmodellen och
        // innehåller inga Björklöven-matcher. Backend flaggar dem med
        // has_team_data; saknas flaggan (äldre API) visas allt.
        const known = all.filter(s => s.has_team_data === true);
        const list = known.length > 0 ? known : all;
        setSeasons(list);
        if (d.active && list.some(s => s.key === d.active)) setSeason(d.active);
        else if (list.length > 0) setSeason(list[0].key);
      })
      // Svarar säsongslistan inte alls hämtar vi ändå: utan säsongsparameter
      // väljer API:t den aktiva säsongen själv.
      .catch(() => {})
      .finally(() => setSeasonsReady(true));
  }, []);

  useEffect(() => {
    if (!statsLoading) { setSlow(false); return; }
    const t = window.setTimeout(() => setSlow(true), 6000);
    return () => window.clearTimeout(t);
  }, [statsLoading]);

  /* Säsongsstatistik — blockerande, allt annat hänger på den */
  useEffect(() => {
    if (!seasonsReady) return;
    setStatsLoading(true);
    setStatsError(null);
    setSlow(false);
    const ctrl = new AbortController();
    fetchJson(`${API_URL}/api/v1/statistics${season ? `?season=${season}` : ''}`, ctrl.signal, 45000)
      .then(setStats)
      .catch((e: Error) => {
        if (ctrl.signal.aborted) return;
        setStatsError(e.name === 'AbortError' ? 'TIMEOUT' : e.message);
      })
      .finally(() => { if (!ctrl.signal.aborted) setStatsLoading(false); });
    return () => ctrl.abort();
  }, [season, reloadKey, seasonsReady]);

  /* Analys — laddas parallellt så sidan inte väntar på den */
  useEffect(() => {
    if (!seasonsReady) return;
    setModules(null);
    setAnalyticsState('loading');
    const ctrl = new AbortController();
    fetchJson(`${API_URL}/api/v1/analytics${season ? `?season=${season}` : ''}`, ctrl.signal, 60000)
      .then(d => {
        if (d.status === 'error') throw new Error(d.error || 'fel');
        setModules(d.modules || {});
        setAnalyticsState('idle');
      })
      .catch(() => { if (!ctrl.signal.aborted) setAnalyticsState('error'); });
    return () => ctrl.abort();
  }, [season, reloadKey, seasonsReady]);

  /* Spelare med percentil — hämtas först när fliken öppnas */
  const loadPlayers = useCallback(() => {
    setPlayers(null);
    setPlayersState('loading');
    fetch(`${API_URL}/api/v1/players${season ? `?season=${season}` : ''}`, { cache: 'no-store' })
      .then(r => {
        // Endpointen är ny; en äldre driftsatt API-version svarar 404 och då
        // faller vi tillbaka på poängligan från /statistics.
        if (r.status === 404) throw new Error('MISSING');
        return r.json();
      })
      .then(d => {
        if (d.status !== 'ok') throw new Error('MISSING');
        setPlayers(d.players || []);
        setPlayersState('idle');
      })
      .catch(() => setPlayersState('missing'));
  }, [season]);

  /* På isen — hämtas när fliken öppnas, som spelarlistan */
  const loadOnIce = useCallback(() => {
    setOnIce(null);
    setOnIceState('loading');
    fetch(`${API_URL}/api/v1/onice${season ? `?season=${season}` : ''}`, { cache: 'no-store' })
      .then(r => (r.status === 404 ? Promise.reject(new Error('MISSING')) : r.json()))
      .then(d => {
        if (d.status !== 'ok' || !(d.players || []).length) throw new Error('MISSING');
        setOnIce(d);
        setOnIceState('idle');
      })
      .catch(() => setOnIceState('missing'));
  }, [season]);

  /* Målvakter — egen endpoint med matchlogg och hemma/borta */
  const loadKeepers = useCallback(() => {
    setKeepers(null);
    setKeepersState('loading');
    fetch(`${API_URL}/api/v1/goalies${season ? `?season=${season}` : ''}`, { cache: 'no-store' })
      .then(r => (r.status === 404 ? Promise.reject(new Error('MISSING')) : r.json()))
      .then(d => {
        if (d.status !== 'ok' || !(d.goalies || []).length) throw new Error('MISSING');
        setKeepers(d);
        setKeepersState('idle');
      })
      .catch(() => setKeepersState('missing'));
  }, [season]);

  useEffect(() => {
    if (segment === 'spelare' && playersState === 'idle' && players === null) loadPlayers();
    if (segment === 'spelare' && onIceState === 'idle' && onIce === null) loadOnIce();
    if (segment === 'spelare' && keepersState === 'idle' && keepers === null) loadKeepers();
  }, [segment, playersState, players, loadPlayers, onIceState, onIce, loadOnIce,
      keepersState, keepers, loadKeepers]);

  useEffect(() => {
    setPlayers(null); setPlayersState('idle');
    setOnIce(null); setOnIceState('idle');
    setKeepers(null); setKeepersState('idle');
  }, [season]);

  /* ── Härledda värden ── */
  const standing: Standing = stats?.team_standing || {};
  const record = useMemo(() => ({
    gp: standing.games_played ?? stats?.record?.gp ?? 0,
    w: standing.wins ?? stats?.record?.wins ?? 0,
    otw: standing.ot_wins ?? stats?.record?.otw ?? 0,
    otl: standing.ot_losses ?? stats?.record?.otl ?? 0,
    l: standing.losses ?? stats?.record?.losses ?? 0,
    pts: standing.points ?? stats?.record?.points ?? 0,
    diff: standing.goal_diff ?? 0,
    rank: standing.rank ?? 0,
  }), [stats, standing]);

  const allGames = useMemo<Game[]>(
    () => ((stats?.games || stats?.upcoming_or_recent_games || []) as RawGame[]).map(normGame),
    [stats],
  );
  const upcoming = useMemo(
    () => allGames.filter(g => !g.played).sort((a, b) => a.date.localeCompare(b.date)),
    [allGames],
  );

  const bjkSkaters = useMemo<Skater[]>(() => {
    if (players && players.length > 0) return players.map(apiPlayerToSkater);
    return ((stats?.bjorkloven_skaters?.regular || []) as Record<string, unknown>[]).map(normSkater);
  }, [players, stats]);
  const bjkGoalies = useMemo<Goalie[]>(
    () => ((stats?.bjorkloven_goalies?.regular || []) as Record<string, unknown>[]).map(normGoalie),
    [stats],
  );
  const leagueSkaters = useMemo<Skater[]>(
    () => ((stats?.top_scorers || []) as Record<string, unknown>[]).map(normSkater),
    [stats],
  );
  const leagueGoalies = useMemo<Goalie[]>(
    () => ((stats?.top_goalies || []) as Record<string, unknown>[]).map(normGoalie),
    [stats],
  );

  const seasonLabel: string = stats?.season || seasons.find(s => s.key === season)?.name || 'Säsongen';
  const leagueName = seasonLabel.replace(/\s*\d{4}\/\d{2}\s*$/, '').trim() || 'serien';
  const hasPlayed = record.gp > 0 || allGames.some(g => g.played);
  const fallbackSeason = seasons.find(s => s.key !== season && s.has_team_data === true && /2025\/26/.test(s.name || '')) || null;
  const timeline = modules?.timeline || [];

  const seasonSelect = (
    <select
      className="st-season"
      value={season}
      onChange={e => setSeason(e.target.value)}
      aria-label="Välj säsong"
    >
      {Object.entries(
        seasons.reduce<Record<string, Season[]>>((acc, s) => {
          const league = s.league === 'HA' ? 'HockeyAllsvenskan' : s.league || (s.key.startsWith('shl') ? 'SHL' : 'HockeyAllsvenskan');
          (acc[league] ||= []).push(s);
          return acc;
        }, {}),
      ).map(([league, items]) => (
        <optgroup key={league} label={league}>
          {items.map(s => (
            <option key={s.key} value={s.key}>{(s.name || s.key).replace(/^(SHL|HockeyAllsvenskan)\s*/i, '')}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  if (statsLoading) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card">
          <p className="mc-kicker">Statistik</p>
          <h2 className="mc-title">Hämtar säsongen…</h2>
          <div className="st-skeleton" />
          <div className="st-skeleton" />
          <div className="st-skeleton" />
          {slow && (
            <p className="mc-note">
              Servern startar från vila när ingen varit inne på ett tag. Det
              här tar en stund första gången, sedan går det direkt.
            </p>
          )}
        </section>
      </div>
    );
  }

  if (statsError || stats?.status === 'error') {
    const timedOut = statsError === 'TIMEOUT';
    return (
      <div className="page animate-fade-up">
        <section className="mc-card mc-card-error">
          <p className="mc-kicker">Statistik</p>
          <h2 className="mc-title">
            {timedOut ? 'Servern svarade inte i tid' : 'Kunde inte ladda statistiken'}
          </h2>
          <p className="mc-text">
            {timedOut
              ? 'Statistiken räknas fram ur hela seriens matcher, och servern startar från vila när ingen varit inne på ett tag. Ett nytt försök brukar gå på någon sekund.'
              : statsError || stats?.error}
          </p>
          <button className="empty-season-btn" onClick={() => setReloadKey(k => k + 1)}>
            Försök igen
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page animate-fade-up">
      <section className="mc-card">
        <div className="st-head">
          <div>
            <p className="mc-kicker">Statistik</p>
            <h2 className="mc-title">{seasonLabel}</h2>
          </div>
          {seasonSelect}
        </div>
        {hasPlayed && record.rank > 0 && (
          <p className="mc-note">
            Placering {record.rank} i {leagueName}
            {stats?.snapshot_scraped_at && (
              <> · <span className="st-nowrap">uppdaterad {new Date(stats.snapshot_scraped_at).toLocaleDateString('sv-SE')}</span></>
            )}
          </p>
        )}
      </section>

      <div className="mc-seg" role="tablist" aria-label="Statistikvyer">
        {([
          ['laget', 'Laget'],
          ['spelare', 'Spelare'],
          ['utveckling', 'Utveckling'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={segment === key}
            className={`mc-segbtn${segment === key ? ' mc-on' : ''}`}
            onClick={() => setSegment(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {!hasPlayed && (
        <>
          <EmptySeason
            seasonName={seasonLabel}
            fallback={fallbackSeason ? { key: fallbackSeason.key, name: fallbackSeason.name || fallbackSeason.key } : null}
            onSelectFallback={setSeason}
          />
          {upcoming.length > 0 && (
            <section className="mc-card">
              <p className="mc-kicker">Närmast i spelprogrammet</p>
              {upcoming.slice(0, 5).map((g, i) => (
                <div key={i} className="mc-row">
                  <span className="mc-date">{shortDate(g.date)}</span>
                  <span className={`mc-ha${g.isHome ? ' mc-ha-home' : ''}`}>{g.isHome ? 'H' : 'B'}</span>
                  <span className="mc-opponent">{shortTeam(g.isHome ? g.away : g.home)}</span>
                </div>
              ))}
              <p className="mc-note">Hela programmet finns under <Link to="/matcher">Matcher</Link>.</p>
            </section>
          )}
        </>
      )}

      {hasPlayed && segment === 'laget' && (
        <Laget record={record} timeline={timeline} modules={modules} analyticsState={analyticsState} />
      )}

      {hasPlayed && segment === 'spelare' && (
        <Spelare
          scope={scope}
          setScope={setScope}
          season={season}
          leagueName={leagueName}
          bjkSkaters={bjkSkaters}
          bjkGoalies={bjkGoalies}
          leagueSkaters={leagueSkaters}
          leagueGoalies={leagueGoalies}
          playersState={playersState}
          onIce={onIce}
          keepers={keepers}
        />
      )}

      {hasPlayed && segment === 'utveckling' && (
        <Utveckling timeline={timeline} modules={modules} analyticsState={analyticsState} />
      )}
    </div>
  );
}

/* ── Laget ── */
function Laget({
  record, timeline, modules, analyticsState,
}: {
  record: { gp: number; w: number; otw: number; otl: number; l: number; pts: number; diff: number; rank: number };
  timeline: NonNullable<Modules['timeline']>;
  modules: Modules | null;
  analyticsState: 'idle' | 'loading' | 'error';
}) {
  const last10 = timeline.slice(-10).map(t => t.result);
  const splits = modules?.splits;
  const st = modules?.special_teams;
  const gs = modules?.game_state;
  const att = modules?.attendance;
  const periods = (modules?.periods || []).map(p => ({ label: p.label, gf: p.gf, ga: p.ga }));

  return (
    <>
      <section className="mc-card">
        <p className="mc-kicker">Facit</p>
        <div className="st-stats">
          <Stat label="Matcher" value={record.gp} />
          <Stat label="Vinster" value={record.w} tone="var(--impact-positive)" />
          {record.otw > 0 && <Stat label="ÖT-vinst" value={record.otw} tone="var(--impact-warning)" />}
          {record.otl > 0 && <Stat label="ÖT-förlust" value={record.otl} tone="var(--impact-warning)" />}
          <Stat label="Förluster" value={record.l} tone="var(--impact-negative)" />
          <Stat label="Poäng" value={record.pts} tone="var(--brand-gold)" />
          <Stat label="Målskillnad" value={record.diff > 0 ? `+${record.diff}` : record.diff} />
          <Stat label="P/match" value={record.gp ? (record.pts / record.gp).toFixed(2) : '–'} tone="var(--brand-green-light)" />
        </div>
        {last10.length > 0 && (
          <>
            <p className="mc-kicker st-sub">Senaste {last10.length}</p>
            <FormDots results={last10} />
          </>
        )}
      </section>

      {analyticsState === 'loading' && (
        <section className="mc-card">
          <p className="mc-kicker">Analys</p>
          <div className="st-skeleton" />
          <div className="st-skeleton" />
          <p className="mc-note">Räknar fram splittar, perioder och specialteam ur matchhändelserna.</p>
        </section>
      )}

      {analyticsState === 'error' && (
        <section className="mc-card">
          <p className="mc-kicker">Analys</p>
          <p className="mc-text">Analysdata kunde inte hämtas just nu. Facit ovan kommer direkt från serietabellen och påverkas inte.</p>
        </section>
      )}

      {splits && (splits.home.gp > 0 || splits.away.gp > 0) && (
        <section className="mc-card">
          <p className="mc-kicker">Hemma mot borta</p>
          <PairedBar label="Poäng" left={splits.home.pts} right={splits.away.pts} />
          <PairedBar label="Gjorda mål" left={splits.home.gf} right={splits.away.gf} />
          <PairedBar label="Insläppta mål" left={splits.home.ga} right={splits.away.ga} />
          <p className="mc-note">
            Hemma {splits.home.gp} matcher ({splits.home.w}–{splits.home.l}), borta {splits.away.gp} ({splits.away.w}–{splits.away.l}).
            Grön stapel är hemma.
          </p>
        </section>
      )}

      {periods.length > 0 && (
        <section className="mc-card">
          <p className="mc-kicker">Mål per period</p>
          <PeriodBars periods={periods} />
          <p className="mc-note">Grön stapel gjorda mål, röd insläppta. Siffran under är skillnaden.</p>
        </section>
      )}

      {st && st.pp_opportunities > 0 && (
        <section className="mc-card">
          <p className="mc-kicker">Specialteam</p>
          <KV label="Powerplay" value={`${st.pp_pct} %`} hint={`${st.pp_goals} mål på ${st.pp_opportunities} spel`} />
          <KV label="Boxplay" value={`${st.pk_pct} %`} hint={`${st.pk_goals_against} insläppta på ${st.pk_times} underlägen`} />
          <KV label="Index" value={String(st.special_teams_index)} hint="PP% + PK%. Över 100 räknas som starkt." />
          <KV label="Utvisningar" value={`${st.avg_pim_per_game} min/match`} hint={`${st.total_pim} minuter totalt`} />
        </section>
      )}

      {gs && (
        <section className="mc-card">
          <p className="mc-kicker">Matchlägen</p>
          <KV label="Ledning efter period 1" value={rec(gs.lead_after_1)} />
          <KV label="Oavgjort efter period 1" value={rec(gs.tied_after_1)} />
          <KV label="Underläge efter period 1" value={rec(gs.trail_after_1)} />
          <KV label="Ledning efter period 2" value={rec(gs.lead_after_2)} />
          <KV label="Underläge efter period 2" value={rec(gs.trail_after_2)} />
          {gs.game_types && (
            <>
              <p className="mc-kicker st-sub">Marginal</p>
              <KV label="Enmålsmatcher" value={rec(gs.game_types.one_goal)} />
              <KV label="Tvåmålsmatcher" value={rec(gs.game_types.two_goals)} />
              <KV label="Tre mål eller mer" value={rec(gs.game_types.three_plus_goals)} />
            </>
          )}
          <p className="mc-note">Läses vinster–förluster–övertidsförluster.</p>
        </section>
      )}

      {att && att.home_games > 0 && (
        <section className="mc-card">
          <p className="mc-kicker">Publik</p>
          <div className="st-stats">
            <Stat label="Snitt" value={att.avg.toLocaleString('sv-SE')} tone="var(--brand-gold)" />
            <Stat label="Högst" value={att.max.toLocaleString('sv-SE')} />
            <Stat label="Lägst" value={att.min.toLocaleString('sv-SE')} />
            <Stat label="Hemmamatcher" value={att.home_games} />
          </div>
        </section>
      )}
    </>
  );
}

/* ── Spelare ── */
function Spelare({
  scope, setScope, season, leagueName, bjkSkaters, bjkGoalies, leagueSkaters, leagueGoalies, playersState, onIce, keepers,
}: {
  scope: Scope;
  setScope: (s: Scope) => void;
  season: string;
  leagueName: string;
  bjkSkaters: Skater[];
  bjkGoalies: Goalie[];
  leagueSkaters: Skater[];
  leagueGoalies: Goalie[];
  playersState: 'idle' | 'loading' | 'missing';
  onIce: OnIce | null;
  keepers: GoalieData | null;
}) {
  const loven = scope === 'loven';
  // Malvakter star i poangligan hos Swehockey men hor hemma i sin egen tabell:
  // sex av lagets 33 rader var malvakter, fyra av dem utan en enda poang.
  const isSkater = (p: Skater) => !String(p.pos || '').toUpperCase().startsWith('G');
  const skaters = (loven ? bjkSkaters : leagueSkaters).filter(isSkater);
  const goalies = loven ? bjkGoalies : leagueGoalies;

  const onIceByNumber = useMemo(() => {
    const m = new Map<number, OnIcePlayer>();
    for (const p of onIce?.players || []) {
      if (!p.is_goalie) m.set(p.jersey_number, p);
    }
    return m;
  }, [onIce]);

  return (
    <>
      <div className="mc-seg" role="tablist" aria-label="Urval">
        <button role="tab" aria-selected={loven} className={`mc-segbtn${loven ? ' mc-on' : ''}`} onClick={() => setScope('loven')}>Björklöven</button>
        <button role="tab" aria-selected={!loven} className={`mc-segbtn${!loven ? ' mc-on' : ''}`} onClick={() => setScope('serien')}>Hela {leagueName}</button>
      </div>

      <section className="mc-card">
        <p className="mc-kicker">{loven ? `Poängliga (${skaters.length})` : `Poängtoppen — topp ${skaters.length}`}</p>
        {playersState === 'loading' && loven && <div className="st-skeleton" />}
        {skaters.length === 0
          ? <p className="mc-text">Ingen poängstatistik för säsongen ännu.</p>
          : (
            <SkaterTable
              rows={skaters}
              showTeam={!loven}
              season={season}
              onIceByNumber={loven ? onIceByNumber : undefined}
            />
          )}
        <p className="mc-note">
          Tryck på en rubrik för att sortera. {loven
            ? 'Tryck på en spelare för profil med percentil mot serien och poäng match för match.'
            : `Lövenspelare är markerade och går att trycka på. Poängtoppen är serieledande spelare, inte hela ${leagueName}.`}
        </p>
        {loven && onIce && (
          <p className="mc-note">
            <b>På is</b> är mål för minus mål emot medan spelaren stod på isen, över
            {' '}{onIce.games_with_events} matcher, och <b>Andel</b> hur stor del av lagets
            {' '}{onIce.team_goals_for} mål hen var med på. Räknat ur Swehockeys uppgift om
            vilka som stod på isen — det sammanfaller inte alltid med tabellens
            plus/minus, som står i egen kolumn.
          </p>
        )}
      </section>

      {loven && onIce && (
        <>
          {onIce.top_pairs.length > 0 && (
            <section className="mc-card">
              <p className="mc-kicker">Oftast på isen tillsammans vid mål</p>
              {onIce.top_pairs.slice(0, 8).map((pair, i) => {
                const max = onIce.top_pairs[0]?.goals_for || 1;
                return (
                  <div key={i} className="st-barrow">
                    <span className="st-pairnames">
                      {surname(pair.names[0])} + {surname(pair.names[1])}
                    </span>
                    <span className="st-bartrack">
                      <span className="st-barfill" style={{ width: `${(pair.goals_for / max) * 100}%` }} />
                    </span>
                    <span className="st-barvalue">{pair.goals_for}</span>
                  </div>
                );
              })}
              <p className="mc-note">Antal mål laget gjort med båda på isen. Målvakter är inte medräknade.</p>
            </section>
          )}
        </>
      )}

      {loven && keepers ? (
        keepers.goalies.filter(g => g.games_played > 0).map(g => <GoalieCard key={g.name} g={g} />)
      ) : (
        <section className="mc-card">
          <p className="mc-kicker">Målvakter ({goalies.length})</p>
          {goalies.length === 0
            ? <p className="mc-text">Ingen målvaktsstatistik för säsongen ännu.</p>
            : <GoalieTable rows={goalies} showTeam={!loven} />}
          <p className="mc-note">IM insläppta mål, Rp% räddningsprocent, NC nollor.</p>
        </section>
      )}
    </>
  );
}


/**
 * En målvakt: säsongstotaler, hemma mot borta, och räddningsprocenten match
 * för match.
 *
 * Tabellen ger bara totaler. Kurvan är det som säger något om formen, och
 * hemma/borta-delningen finns inte i källan utan räknas ur matchloggen.
 */
function GoalieCard({ g }: { g: GoalieFull }) {
  // Hela loggen gjorde sidan orimligt lang — tva malvakter med 30 respektive
  // 25 matcher lade till narmare 4000 px. De senaste racker som overblick.
  const [showAll, setShowAll] = useState(false);
  const log = g.game_log || [];
  const curve = log
    .filter(x => x.save_pct !== null)
    .map(x => ({ label: shortDate(x.date), value: x.save_pct as number }));
  const best = log.reduce<GoalieGame | null>(
    (acc, x) => (x.save_pct !== null && (!acc || (acc.save_pct ?? 0) < x.save_pct) ? x : acc),
    null,
  );

  return (
    <section className="mc-card">
      <div className="st-head">
        <div>
          <p className="mc-kicker">Målvakt</p>
          <h3 className="gk-name">
            {g.jersey_number ? <span className="gk-num">{g.jersey_number}</span> : null}
            {humanName(g.name)}
          </h3>
        </div>
      </div>

      <div className="st-stats">
        <Stat label="Matcher" value={g.games_played} />
        <Stat label="Rp%" value={g.save_pct ?? '–'} tone="var(--brand-gold)" />
        <Stat label="GAA" value={g.gaa ?? '–'} tone="var(--brand-green-light)" />
        <Stat label="Nollor" value={g.shutouts} />
        <Stat label="V–F" value={`${g.wins}–${g.losses}`} />
        <Stat label="Räddningar" value={g.saves} />
      </div>

      {curve.length > 1 && (
        <>
          <p className="mc-kicker st-sub">Räddningsprocent match för match</p>
          <Sparkline points={curve} height={64} format={v => `${v.toFixed(1)} %`} />
        </>
      )}

      {(g.home.games > 0 || g.away.games > 0) && (
        <>
          <p className="mc-kicker st-sub">Hemma mot borta</p>
          <PairedBar
            label="Räddningsprocent"
            left={g.home.save_pct ?? 0}
            right={g.away.save_pct ?? 0}
            leftLabel={g.home.save_pct !== null ? `${g.home.save_pct} %` : '–'}
            rightLabel={g.away.save_pct !== null ? `${g.away.save_pct} %` : '–'}
          />
          <p className="mc-note">
            Hemma {g.home.games} matcher, {g.home.goals_against} insläppta på {g.home.shots_against} skott.
            Borta {g.away.games}, {g.away.goals_against} på {g.away.shots_against}. Grön stapel är hemma.
          </p>
        </>
      )}

      {log.length > 0 && (
        <>
          <p className="mc-kicker st-sub">
            {showAll ? `Matcher (${log.length})` : `Senaste ${Math.min(5, log.length)} av ${log.length}`}
          </p>
          <div className="mc-tablewrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th />
                  <th className="mc-left">Motståndare</th>
                  <th>Skott</th>
                  <th>IM</th>
                  <th>Rp%</th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? log.slice().reverse() : log.slice(-5).reverse()).map((x, i) => (
                  <tr key={i}>
                    <td>{shortDate(x.date)}</td>
                    <td><span className={`mc-ha${x.is_home ? ' mc-ha-home' : ''}`}>{x.is_home ? 'H' : 'B'}</span></td>
                    <td className="mc-left st-pname">{shortTeam(x.opponent)}</td>
                    <td>{x.shots_against}</td>
                    <td>{x.goals_against}</td>
                    <td className="mc-pts">{x.save_pct ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {log.length > 5 && (
            <button className="st-more" onClick={() => setShowAll(v => !v)}>
              {showAll ? 'Visa färre' : `Visa alla ${log.length} matcher`}
            </button>
          )}
          {best && (
            <p className="mc-note">
              Bästa matchen: {best.save_pct} % mot {shortTeam(best.opponent)} den {shortDate(best.date)},
              {' '}{best.saves} räddningar på {best.shots_against} skott.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ── Utveckling ── */
function Utveckling({
  timeline, modules, analyticsState,
}: {
  timeline: NonNullable<Modules['timeline']>;
  modules: Modules | null;
  analyticsState: 'idle' | 'loading' | 'error';
}) {
  const form = modules?.form || [];
  const elo = modules?.predictions?.elo_history || [];
  const scoring = modules?.predictions?.scoring_timeline || [];
  const streaks = modules?.streaks;
  const trend = modules?.attendance?.trend || [];
  const pen = modules?.penalty_breakdown;

  if (analyticsState === 'loading') {
    return (
      <section className="mc-card">
        <p className="mc-kicker">Utveckling</p>
        <h2 className="mc-title">Räknar…</h2>
        <div className="st-skeleton" />
        <div className="st-skeleton" />
        <p className="mc-note">Kurvorna byggs ur varje spelad match, så första hämtningen tar några sekunder.</p>
      </section>
    );
  }

  if (analyticsState === 'error' || timeline.length === 0) {
    return (
      <section className="mc-card">
        <p className="mc-kicker">Utveckling</p>
        <p className="mc-text">
          {analyticsState === 'error'
            ? 'Analysdata kunde inte hämtas just nu.'
            : 'Utvecklingen kräver spelade matcher med registrerade händelser.'}
        </p>
      </section>
    );
  }

  const pointCurve = timeline.map(t => ({ label: shortDate(t.date), value: t.cumPts }));
  const rolling = form.filter(f => f.window >= 5);

  return (
    <>
      <section className="mc-card">
        <p className="mc-kicker">Poäng ackumulerat</p>
        <Sparkline points={pointCurve} height={72} />
        <p className="mc-note">
          {timeline.length} matcher, {pointCurve[pointCurve.length - 1]?.value ?? 0} poäng.
          En brantare kurva betyder fler poäng per match.
        </p>
      </section>

      {rolling.length > 1 && (
        <section className="mc-card">
          <p className="mc-kicker">Form — poäng på rullande {rolling[rolling.length - 1].window} matcher</p>
          <Sparkline points={rolling.map(f => ({ label: shortDate(f.date), value: f.pts }))} height={64} colour="var(--brand-gold)" fill="rgba(245,192,69,0.12)" />
          <div className="st-twin">
            <div>
              <p className="st-minilbl">Gjorda mål per match</p>
              <Sparkline points={rolling.map(f => ({ label: shortDate(f.date), value: f.gf_avg }))} height={54} />
            </div>
            <div>
              <p className="st-minilbl st-minilbl-bad">Insläppta mål per match</p>
              <Sparkline points={rolling.map(f => ({ label: shortDate(f.date), value: f.ga_avg }))} height={54} colour="var(--impact-negative)" fill="rgba(255,77,77,0.10)" />
            </div>
          </div>
          <p className="mc-note">
            Den guldfärgade kurvan är poängskörden i fönstret.
          </p>
        </section>
      )}

      {elo.length > 1 && (
        <section className="mc-card">
          <p className="mc-kicker">Styrketal över säsongen</p>
          <Sparkline points={elo.map(e => ({ label: shortDate(e.date), value: Math.round(e.elo) }))} height={64} colour="var(--impact-neutral)" fill="rgba(119,181,255,0.10)" />
          <p className="mc-note">
            Elo startar på 1500 och rör sig efter varje resultat, viktat mot motståndets styrka.
            Nu {Math.round(elo[elo.length - 1].elo)}.
          </p>
        </section>
      )}

      {scoring.length > 0 && (
        <section className="mc-card">
          <p className="mc-kicker">När målen faller</p>
          <PeriodBars periods={scoring.map(s => ({ label: s.interval, gf: s.gf, ga: s.ga }))} />
          <p className="mc-note">Tiominutersintervall över matchen. Grön gjorda, röd insläppta.</p>
        </section>
      )}

      {streaks && (streaks.longest_win || streaks.current) && (
        <section className="mc-card">
          <p className="mc-kicker">Sviter</p>
          {streaks.current && (
            <KV label="Just nu" value={`${streaks.current.length} ${streaks.current.type === 'W' ? 'raka vinster' : 'raka förluster'}`} />
          )}
          {streaks.longest_win && (
            <KV label="Längsta segersvit" value={`${streaks.longest_win.length} matcher`} hint={`${shortDate(streaks.longest_win.start)} – ${shortDate(streaks.longest_win.end)}`} />
          )}
          {streaks.longest_loss && (
            <KV label="Längsta förlustsvit" value={`${streaks.longest_loss.length} matcher`} hint={`${shortDate(streaks.longest_loss.start)} – ${shortDate(streaks.longest_loss.end)}`} />
          )}
        </section>
      )}

      {trend.length > 1 && (
        <section className="mc-card">
          <p className="mc-kicker">Publik per hemmamatch</p>
          <Sparkline points={trend.map(t => ({ label: shortDate(t.date), value: t.spectators }))} height={60} colour="var(--brand-gold)" fill="rgba(245,192,69,0.12)" />
          <p className="mc-note">{trend.length} hemmamatcher med registrerad publiksiffra.</p>
        </section>
      )}

      {pen && (pen.by_period?.length > 0 || pen.most_penalized?.length > 0) && (
        <section className="mc-card">
          <p className="mc-kicker">Utvisningar</p>
          {pen.by_period?.length > 0 && (
            <div className="st-bars">
              {pen.by_period.map(p => {
                const max = Math.max(...pen.by_period.map(x => x.count), 1);
                return (
                  <div key={p.period} className="st-barrow">
                    <span className="st-barlabel">{p.period > 3 ? 'ÖT' : `P${p.period}`}</span>
                    <span className="st-bartrack"><span className="st-barfill" style={{ width: `${(p.count / max) * 100}%` }} /></span>
                    <span className="st-barvalue">{p.count}</span>
                  </div>
                );
              })}
            </div>
          )}
          {pen.most_penalized?.length > 0 && (
            <>
              <p className="mc-kicker st-sub">Mest utvisade</p>
              {pen.most_penalized.slice(0, 5).map(p => (
                <KV key={p.name} label={humanName(p.name)} value={`${p.minutes} min`} hint={`${p.count} utvisningar`} />
              ))}
            </>
          )}
        </section>
      )}
    </>
  );
}
