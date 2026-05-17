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
type Attendance = { avg: number; max: number; min: number; total: number; home_games: number };

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
  };
};

type AnalyticsTab = 'season' | 'splits' | 'players';

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

export default function AnalyticsTabs() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AnalyticsTab>('season');

  useEffect(() => {
    fetch(`${API_URL}/api/v1/analytics`)
      .then(r => r.json())
      .then(d => { if (d.status === 'ok') setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: chartTheme.text }}>Laddar analys...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: RED }}>Kunde inte ladda analysdata</div>;

  const m = data.modules;
  const tabs: { key: AnalyticsTab; label: string; icon: string }[] = [
    { key: 'season', label: 'Säsong', icon: '📈' },
    { key: 'splits', label: 'Splits', icon: '🏠' },
    { key: 'players', label: 'Impact', icon: '⭐' },
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
      {tab === 'splits' && <SplitsTab splits={m.splits} periods={m.periods} h2h={m.h2h} />}
      {tab === 'players' && <PlayersTab players={m.player_impact} goalies={m.goalie_radar} />}
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
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TAB 2: SPLITS
   ════════════════════════════════════════════════════════ */
function SplitsTab({ splits, periods, h2h }: { splits: { home: Split; away: Split }; periods: PeriodStat[]; h2h: H2H[] }) {
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
      <div style={{ background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
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
    </div>
  );
}
