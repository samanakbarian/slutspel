import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Cell,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';

/* ── Types ── */
type TimelinePoint = { date: string; opponent: string; result: string; score: string; pts: number; cumPts: number; isHome: boolean; gf: number; ga: number };
type Split = { gp: number; w: number; l: number; otw: number; otl: number; gf: number; ga: number; pts: number };
type PeriodStat = { period: number; label: string; gf: number; ga: number; diff: number; games: number };
type H2H = { opponent: string; gp: number; w: number; l: number; otl: number; gf: number; ga: number; pts: number };
type FormPoint = { date: string; matchNum: number; w: number; l: number; pts: number; gf_avg: number; ga_avg: number; window: number };
type StreakData = { longest_win: { type: string; length: number; start: string; end: string } | null; longest_loss: { type: string; length: number; start: string; end: string } | null; current: { type: string; length: number } | null };
type PlayerImpact = { name: string; position: string; number: number; gp: number; goals: number; assists: number; points: number; g_per_gp: number; a_per_gp: number; p_per_gp: number; pim_per_gp: number; plus_minus: string; vs_league: { ppg_diff: number; gpg_diff: number } };
type GoalieRadar = { name: string; gp: number; sv_pct: number; gaa: number; shutouts: number; wins: number; losses: number; win_pct: number; saves_per_gp: number; percentiles: { sv_pct: number; gaa: number; win_pct: number } };
type SpecialTeams = { pp_goals: number; pp_opportunities: number; pp_pct: number; pk_goals_against: number; pk_times: number; pk_pct: number; total_pim: number; avg_pim_per_game: number };
type Attendance = { avg: number; max: number; min: number; total: number; home_games: number; trend?: { date: string; opponent: string; spectators: number }[] };
type PenaltyBreakdown = {
  by_type: { type: string; count: number }[];
  by_period: { period: number; count: number }[];
  most_penalized: { name: string; count: number; minutes: number }[];
};

type EloPoint = { date: string; elo: number };
type NextGame = { opponent: string; is_home: boolean; date: string; win_prob: number; bjk_elo: number; opp_elo: number };
type ProjectedStanding = { team: string; current_points: number; projected_points: number; current_rank: number; projected_rank: number; is_bjk: boolean };
type GameStateRecord = { w: number; l: number; otl: number };
type GameState = { lead_after_1: GameStateRecord; trail_after_1: GameStateRecord; tied_after_1: GameStateRecord; lead_after_2: GameStateRecord; trail_after_2: GameStateRecord; tied_after_2: GameStateRecord };

type Predictions = {
  elo_history: EloPoint[];
  next_game: NextGame | null;
  projected_standings: ProjectedStanding[];
};

type AnalyticsData = {
  modules: {
    timeline: TimelinePoint[];
    splits: { home: Split; away: Split };
    periods: PeriodStat[];
    h2h: H2H[];
    form: FormPoint[];
    streaks: StreakData;
    player_impact: PlayerImpact[];
    goalie_radar: GoalieRadar[];
    special_teams: SpecialTeams;
    attendance: Attendance;
    penalty_breakdown: PenaltyBreakdown;
    predictions: Predictions;
    game_state: GameState;
  };
};

type AnalyticsTab = 'season' | 'splits' | 'players' | 'predictions';

const GREEN = '#22c55e';
const RED = '#ef4444';
const AMBER = '#f59e0b';
const TEAL = '#14b8a6';
const BLUE = '#3b82f6';
const PURPLE = '#a855f7';
const DIM = '#475569';

const chartTheme = {
  bg: 'rgba(15,23,42,0.6)',
  grid: 'rgba(148,163,184,0.08)',
  text: '#94a3b8',
  tooltip: 'rgba(15,23,42,0.95)',
};

/* ── Stat Card ── */
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: chartTheme.bg, borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 11, color: chartTheme.text, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent || '#e2e8f0' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: chartTheme.text, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── Custom Tooltip ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: chartTheme.tooltip, border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || chartTheme.text }}>{p.name}: <b>{p.value}</b></div>
      ))}
    </div>
  );
}

export default function AnalyticsTabs({ season }: { season?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AnalyticsTab>('season');

  useEffect(() => {
    fetch(`${API_URL}/api/v1/analytics${season ? `?season=${season}` : ''}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'ok') setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [season]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: chartTheme.text }}>Laddar analys...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: RED }}>Kunde inte ladda analysdata</div>;

  const m = data.modules;
  const tabs: { key: AnalyticsTab; label: string; icon: string }[] = [
    { key: 'season', label: 'Säsong', icon: '📈' },
    { key: 'splits', label: 'Splits', icon: '🏠' },
    { key: 'players', label: 'Impact', icon: '⭐' },
    { key: 'predictions', label: 'Prediktioner', icon: '🔮' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(15,23,42,0.4)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t.key ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'transparent',
            color: tab === t.key ? '#fff' : chartTheme.text,
            transition: 'all 0.2s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'season' && <SeasonTab timeline={m.timeline} form={m.form} streaks={m.streaks} special={m.special_teams} attendance={m.attendance} />}
      {tab === 'splits' && <SplitsTab splits={m.splits} periods={m.periods} h2h={m.h2h} penalty={m.penalty_breakdown} />}
      {tab === 'players' && <PlayersTab players={m.player_impact} goalies={m.goalie_radar} />}
      {tab === 'predictions' && <PredictionsTab predictions={m.predictions} gameState={m.game_state} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TAB 1: SEASON
   ════════════════════════════════════════════════════════ */
function SeasonTab({ timeline, form, streaks, special, attendance }: {
  timeline: TimelinePoint[]; form: FormPoint[]; streaks: StreakData; special: SpecialTeams; attendance: Attendance;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Season Timeline Chart */}
      <div style={{ background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Poängkurva — Säsongen 25/26
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={timeline} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.4} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} tickFormatter={(v: string) => v.slice(5)} interval={Math.floor(timeline.length / 8)} />
            <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="cumPts" stroke={GREEN} fill="url(#greenGrad)" strokeWidth={2} name="Poäng" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Form curve */}
      <div style={{ background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Formkurva — Rolling 10 matcher
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={form} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
            <XAxis dataKey="matchNum" tick={{ fontSize: 10, fill: chartTheme.text }} />
            <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} domain={[0, 30]} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="pts" stroke={TEAL} fill={TEAL} fillOpacity={0.15} strokeWidth={2} name="Poäng (10m)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <StatCard label="Längsta vinstsvit" value={streaks.longest_win?.length ?? 0} sub={streaks.longest_win ? `${streaks.longest_win.start} → ${streaks.longest_win.end}` : ''} accent={GREEN} />
        <StatCard label="Nuvarande svit" value={`${streaks.current?.length ?? 0}${streaks.current?.type ?? ''}`} accent={streaks.current?.type === 'W' ? GREEN : RED} />
        <StatCard label="PP%" value={`${special.pp_pct}%`} sub={`${special.pp_goals} mål / ${special.pp_opportunities} tillfällen`} accent={AMBER} />
        <StatCard label="PK%" value={`${special.pk_pct}%`} sub={`${special.pk_goals_against} insläppta / ${special.pk_times} utvisningar`} accent={BLUE} />
      </div>

      {/* Attendance */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <StatCard label="Snittpublik (hemma)" value={attendance.avg.toLocaleString()} sub={`${attendance.home_games} hemmamatcher`} accent="#e2e8f0" />
        <StatCard label="Högsta publik" value={attendance.max.toLocaleString()} accent={GREEN} />
        <StatCard label="Lägsta publik" value={attendance.min.toLocaleString()} accent={DIM} />
        <StatCard label="PIM/match" value={special.avg_pim_per_game} sub={`${special.total_pim} totalt`} accent={AMBER} />
      </div>
      {/* Attendance AreaChart */}
      {attendance.trend && attendance.trend.length > 0 && (
        <div style={{ background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Publiktrend (Hemmamatcher)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={attendance.trend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="step" dataKey="spectators" stroke="#e2e8f0" fill="#e2e8f0" fillOpacity={0.15} strokeWidth={2} name="Publik" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TAB 2: SPLITS
   ════════════════════════════════════════════════════════ */
function SplitsTab({ splits, periods, h2h, penalty }: { splits: { home: Split; away: Split }; periods: PeriodStat[]; h2h: H2H[]; penalty: PenaltyBreakdown }) {
  const splitData = [
    { label: 'Hemma', ...splits.home, ppg: splits.home.gp > 0 ? (splits.home.pts / splits.home.gp).toFixed(2) : '0' },
    { label: 'Borta', ...splits.away, ppg: splits.away.gp > 0 ? (splits.away.pts / splits.away.gp).toFixed(2) : '0' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Home vs Away cards */}
      <div style={{ display: 'flex', gap: 12 }}>
        {splitData.map(s => (
          <div key={s.label} style={{ flex: 1, background: chartTheme.bg, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: s.label === 'Hemma' ? GREEN : BLUE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              {s.label === 'Hemma' ? '🏠' : '✈️'} {s.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
              <div><div style={{ color: chartTheme.text, fontSize: 10 }}>GP</div><div style={{ fontSize: 22, fontWeight: 800 }}>{s.gp}</div></div>
              <div><div style={{ color: chartTheme.text, fontSize: 10 }}>V-F</div><div style={{ fontSize: 22, fontWeight: 800 }}>{s.w}-{s.l}</div></div>
              <div><div style={{ color: chartTheme.text, fontSize: 10 }}>PTS</div><div style={{ fontSize: 22, fontWeight: 800, color: GREEN }}>{s.pts}</div></div>
              <div><div style={{ color: chartTheme.text, fontSize: 10 }}>GF</div><div style={{ fontWeight: 700 }}>{s.gf}</div></div>
              <div><div style={{ color: chartTheme.text, fontSize: 10 }}>GA</div><div style={{ fontWeight: 700 }}>{s.ga}</div></div>
              <div><div style={{ color: chartTheme.text, fontSize: 10 }}>P/M</div><div style={{ fontWeight: 700, color: AMBER }}>{s.ppg}</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* Period Analysis */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280, background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Målfördelning per period
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={periods} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: chartTheme.text }} />
              <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="gf" name="Mål för" radius={[4, 4, 0, 0]} fill={GREEN} />
              <Bar dataKey="ga" name="Mål mot" radius={[4, 4, 0, 0]} fill={RED} fillOpacity={0.7} />
              <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.text }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Penalty Breakdown */}
        <div style={{ flex: 1, minWidth: 280, background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Vanligaste utvisningarna
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={penalty.by_type} margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: chartTheme.text }} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: chartTheme.text }} width={80} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Antal utv." radius={[0, 4, 4, 0]} fill={RED} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* H2H Table */}
      <div style={{ background: chartTheme.bg, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Head-to-Head — BJK vs alla lag
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
              {['Motståndare', 'GP', 'V', 'F', 'ÖT', 'GF', 'GA', 'Diff', 'PTS'].map(h => (
                <th key={h} style={{ padding: '8px 6px', textAlign: h === 'Motståndare' ? 'left' : 'center', color: chartTheme.text, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {h2h.map((r, i) => {
              const diff = r.gf - r.ga;
              return (
                <tr key={i} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                  <td style={{ padding: '7px 6px', fontWeight: 600 }}>{r.opponent}</td>
                  <td style={{ textAlign: 'center' }}>{r.gp}</td>
                  <td style={{ textAlign: 'center', color: GREEN, fontWeight: 700 }}>{r.w}</td>
                  <td style={{ textAlign: 'center', color: RED }}>{r.l}</td>
                  <td style={{ textAlign: 'center', color: AMBER }}>{r.otl}</td>
                  <td style={{ textAlign: 'center' }}>{r.gf}</td>
                  <td style={{ textAlign: 'center' }}>{r.ga}</td>
                  <td style={{ textAlign: 'center', color: diff > 0 ? GREEN : diff < 0 ? RED : chartTheme.text, fontWeight: 700 }}>{diff > 0 ? '+' : ''}{diff}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: GREEN }}>{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TAB 3: PLAYER IMPACT
   ════════════════════════════════════════════════════════ */
function PlayersTab({ players, goalies }: { players: PlayerImpact[]; goalies: GoalieRadar[] }) {
  // Radar data for goalies
  const radarData = goalies.map(g => ({
    name: g.name.split(',')[0],
    'SV%': g.percentiles.sv_pct,
    'GAA': g.percentiles.gaa,
    'V%': g.percentiles.win_pct,
  }));

  const RADAR_COLORS = [GREEN, BLUE, PURPLE];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Player Impact Scatter */}
      <div style={{ background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Spelar-Impact — PPG vs ligasnitt
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
            <XAxis dataKey="g_per_gp" name="Mål/match" tick={{ fontSize: 10, fill: chartTheme.text }} label={{ value: 'Mål/match', position: 'bottom', fontSize: 10, fill: chartTheme.text }} />
            <YAxis dataKey="a_per_gp" name="Assist/match" tick={{ fontSize: 10, fill: chartTheme.text }} label={{ value: 'Assist/match', angle: -90, position: 'insideLeft', fontSize: 10, fill: chartTheme.text }} />
            <ZAxis dataKey="points" range={[40, 300]} name="Poäng" />
            <Tooltip content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as PlayerImpact;
              return (
                <div style={{ background: chartTheme.tooltip, border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{p.name}</div>
                  <div style={{ color: chartTheme.text }}>Pos: {p.position} | #{p.number}</div>
                  <div style={{ color: GREEN }}>{p.goals}G {p.assists}A = {p.points}P ({p.p_per_gp} PPG)</div>
                  <div style={{ color: p.vs_league.ppg_diff > 0 ? GREEN : RED }}>vs liga: {p.vs_league.ppg_diff > 0 ? '+' : ''}{p.vs_league.ppg_diff.toFixed(3)} PPG</div>
                </div>
              );
            }} />
            <Scatter data={players} fill={GREEN}>
              {players.map((p, i) => (
                <Cell key={i} fill={p.vs_league.ppg_diff > 0 ? GREEN : p.vs_league.ppg_diff > -0.1 ? AMBER : RED} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Player impact table */}
      <div style={{ background: chartTheme.bg, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          BJK Spelare — Effektivitet per match
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
              {['Spelare', 'Pos', 'GP', 'G/GP', 'A/GP', 'P/GP', 'PIM/GP', 'vs Liga'].map(h => (
                <th key={h} style={{ padding: '8px 6px', textAlign: h === 'Spelare' ? 'left' : 'center', color: chartTheme.text, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                <td style={{ padding: '7px 6px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ textAlign: 'center', color: chartTheme.text }}>{p.position}</td>
                <td style={{ textAlign: 'center' }}>{p.gp}</td>
                <td style={{ textAlign: 'center' }}>{p.g_per_gp.toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>{p.a_per_gp.toFixed(2)}</td>
                <td style={{ textAlign: 'center', color: GREEN, fontWeight: 700 }}>{p.p_per_gp.toFixed(2)}</td>
                <td style={{ textAlign: 'center', color: AMBER }}>{p.pim_per_gp.toFixed(2)}</td>
                <td style={{ textAlign: 'center', color: p.vs_league.ppg_diff > 0 ? GREEN : RED, fontWeight: 700 }}>
                  {p.vs_league.ppg_diff > 0 ? '+' : ''}{p.vs_league.ppg_diff.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Goalie Radar */}
      {radarData.length > 0 && (
        <div style={{ background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Målvakts-Radar — Percentiler vs ligan
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {goalies.map((g, gi) => (
              <div key={gi} style={{ flex: 1, minWidth: 200 }}>
                <div style={{ textAlign: 'center', fontWeight: 700, color: RADAR_COLORS[gi % RADAR_COLORS.length], marginBottom: 8 }}>{g.name}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={[{ metric: 'SV%', value: g.percentiles.sv_pct }, { metric: 'GAA', value: g.percentiles.gaa }, { metric: 'V%', value: g.percentiles.win_pct }]}>
                    <PolarGrid stroke={chartTheme.grid} />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: chartTheme.text }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: chartTheme.text }} />
                    <Radar dataKey="value" stroke={RADAR_COLORS[gi % RADAR_COLORS.length]} fill={RADAR_COLORS[gi % RADAR_COLORS.length]} fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 11, color: chartTheme.text, marginTop: 4 }}>
                  <span>SV%: <b style={{ color: GREEN }}>{g.sv_pct}%</b></span>
                  <span>GAA: <b>{g.gaa}</b></span>
                  <span>SO: <b>{g.shutouts}</b></span>
                  <span>V%: <b style={{ color: AMBER }}>{g.win_pct}%</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sida-vid-sida Goalie Comparison */}
      {goalies.length >= 2 && (
        <div style={{ background: chartTheme.bg, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Målvaktsduell
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'center' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                <th style={{ width: '33%', padding: 8 }}>{goalies[0].name.split(',')[0]}</th>
                <th style={{ width: '33%', padding: 8, color: chartTheme.text, fontSize: 10, textTransform: 'uppercase' }}>Statistik</th>
                <th style={{ width: '33%', padding: 8 }}>{goalies[1].name.split(',')[0]}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Matcher', k: 'gp', isBetter: (a:number,b:number)=>a>b },
                { label: 'Räddningsprocent', k: 'sv_pct', isBetter: (a:number,b:number)=>a>b, fmt: (v:number)=>`${v}%` },
                { label: 'Insläppta/Match', k: 'gaa', isBetter: (a:number,b:number)=>a<b, fmt: (v:number)=>v.toFixed(2) },
                { label: 'Nollor', k: 'shutouts', isBetter: (a:number,b:number)=>a>b },
                { label: 'Vinstprocent', k: 'win_pct', isBetter: (a:number,b:number)=>a>b, fmt: (v:number)=>`${v}%` },
              ].map(stat => {
                const valA = (goalies[0] as any)[stat.k];
                const valB = (goalies[1] as any)[stat.k];
                const aIsBetter = stat.isBetter(valA, valB);
                const bIsBetter = stat.isBetter(valB, valA);
                return (
                  <tr key={stat.k} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                    <td style={{ padding: 8, color: aIsBetter ? GREEN : '#e2e8f0', fontWeight: aIsBetter ? 700 : 400 }}>{stat.fmt ? stat.fmt(valA) : valA}</td>
                    <td style={{ padding: 8, color: chartTheme.text, fontSize: 11 }}>{stat.label}</td>
                    <td style={{ padding: 8, color: bIsBetter ? GREEN : '#e2e8f0', fontWeight: bIsBetter ? 700 : 400 }}>{stat.fmt ? stat.fmt(valB) : valB}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TAB 4: PREDICTIONS
   ════════════════════════════════════════════════════════ */
function PredictionsTab({ predictions, gameState }: { predictions: Predictions; gameState: GameState }) {
  const ng = predictions.next_game;
  
  const stateData = [
    { name: 'Leder efter P1', ...gameState.lead_after_1 },
    { name: 'Lika efter P1', ...gameState.tied_after_1 },
    { name: 'Underläge P1', ...gameState.trail_after_1 },
    { name: 'Leder efter P2', ...gameState.lead_after_2 },
    { name: 'Lika efter P2', ...gameState.tied_after_2 },
    { name: 'Underläge P2', ...gameState.trail_after_2 },
  ].map(d => ({ ...d, gp: d.w + d.l + d.otl, win_pct: (d.w + d.l + d.otl) > 0 ? (d.w / (d.w + d.l + d.otl) * 100).toFixed(0) : 0 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Elo & Next Game */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 280, background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            The Prediction Engine (Elo-Rating)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={predictions.elo_history} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PURPLE} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={PURPLE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="elo" stroke={PURPLE} fill="url(#purpleGrad)" strokeWidth={2} name="Elo-rating" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {ng && (
          <div style={{ flex: 1, minWidth: 200, background: chartTheme.bg, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: chartTheme.text, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Nästa Match (Modell)</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginBottom: 24 }}>
              IFB <span style={{ color: chartTheme.text, fontWeight: 400 }}>{ng.is_home ? 'vs' : '@'}</span> {ng.opponent}
            </div>
            
            <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `conic-gradient(${GREEN} ${ng.win_prob}%, ${RED} 0)` }}>
              <div style={{ position: 'absolute', width: 106, height: 106, background: chartTheme.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: GREEN }}>{ng.win_prob}%</span>
                <span style={{ fontSize: 9, color: chartTheme.text, textTransform: 'uppercase' }}>Vinstchans</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 24, fontSize: 11, color: chartTheme.text }}>
              <span>BJK Elo: <b style={{ color: '#e2e8f0' }}>{ng.bjk_elo}</b></span>
              <span>Opp Elo: <b style={{ color: '#e2e8f0' }}>{ng.opp_elo}</b></span>
            </div>
          </div>
        )}
      </div>

      {/* Projected Standings & Clutch Factor */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280, background: chartTheme.bg, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Simulerad Sluttabell
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', color: chartTheme.text, textAlign: 'left' }}>
                <th style={{ padding: '6px 4px' }}>#</th>
                <th style={{ padding: '6px 4px' }}>Lag</th>
                <th style={{ padding: '6px 4px', textAlign: 'right' }}>Akt. PTS</th>
                <th style={{ padding: '6px 4px', textAlign: 'right', color: GREEN }}>Proj. PTS</th>
              </tr>
            </thead>
            <tbody>
              {predictions.projected_standings.map((p) => (
                <tr key={p.team} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', background: p.is_bjk ? 'rgba(34,197,94,0.1)' : 'transparent' }}>
                  <td style={{ padding: '6px 4px', fontWeight: p.is_bjk ? 700 : 400, color: p.projected_rank <= 6 ? GREEN : p.projected_rank <= 10 ? AMBER : chartTheme.text }}>{p.projected_rank}</td>
                  <td style={{ padding: '6px 4px', fontWeight: p.is_bjk ? 700 : 400, color: '#e2e8f0' }}>
                    {p.team}
                    {p.current_rank > p.projected_rank && <span style={{ color: GREEN, fontSize: 10, marginLeft: 4 }}>↑</span>}
                    {p.current_rank < p.projected_rank && <span style={{ color: RED, fontSize: 10, marginLeft: 4 }}>↓</span>}
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', color: chartTheme.text }}>{p.current_points}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: GREEN }}>{p.projected_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1, minWidth: 280, background: chartTheme.bg, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Game State / Clutch-faktor
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'center' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', color: chartTheme.text }}>
                <th style={{ padding: '6px 4px', textAlign: 'left' }}>Situation</th>
                <th style={{ padding: '6px 4px' }}>GP</th>
                <th style={{ padding: '6px 4px', color: GREEN }}>W</th>
                <th style={{ padding: '6px 4px', color: RED }}>L</th>
                <th style={{ padding: '6px 4px', color: AMBER }}>Win%</th>
              </tr>
            </thead>
            <tbody>
              {stateData.map((d, i) => (
                <tr key={d.name} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                  <td style={{ padding: '8px 4px', textAlign: 'left', color: '#e2e8f0', fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: '8px 4px', color: chartTheme.text }}>{d.gp}</td>
                  <td style={{ padding: '8px 4px', color: GREEN }}>{d.w}</td>
                  <td style={{ padding: '8px 4px', color: RED }}>{d.l}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: Number(d.win_pct) >= 50 ? GREEN : RED }}>{d.win_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 16, fontSize: 11, color: chartTheme.text, lineHeight: 1.5 }}>
            Tabellen visar lagets förmåga att hålla en ledning eller vända underläge. En hög Win% vid underläge tyder på en stark "clutch"-faktor.
          </div>
        </div>
      </div>
    </div>
  );
}
