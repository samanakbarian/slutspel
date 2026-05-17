import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import AnalyticsTabs from '../components/AnalyticsTabs';

/* ── types ── */
type PlayerStat = { rank?: number; number?: number; jersey_number?: number; name?: string; player_name?: string; team?: string; team_code?: string; position?: string; gp?: number; games_played?: number; goals?: number; assists?: number; points?: number; avg?: string; avg_ppg?: number; pim?: number; plus_minus?: string | number };
type GoalieStat = { rank?: number; number?: number; jersey_number?: number; name?: string; goalie_name?: string; team?: string; team_code?: string; gp?: number; games_played?: number; ga?: number; goals_against?: number; gaa?: string | number; svs?: number; svs_pct?: string | number; save_pct?: string | number; so?: number; shutouts?: number; wins?: number; losses?: number; win_pct?: number; toi_minutes?: string; shots_against?: number; saves?: number };
type GameResult = { game_id?: number; date?: string; match_date?: string; match_time?: string; home_team?: string; away_team?: string; result?: string; period_results?: string; spectators?: number | null; venue?: string; bjk_is_home?: boolean; bjk_result?: string; home_goals?: number; away_goals?: number; status?: string };
type Standing = { team_name?: string; games_played?: number; wins?: number; losses?: number; ot_wins?: number; ot_losses?: number; points?: number; goal_diff?: number; rank?: number };
type NormGame = { _date: string; _home: string; _away: string; _result: string; _hg: number; _ag: number; _bjkHome: boolean; _bjkRes: string } & GameResult;
type Tab = 'overview' | 'scorers' | 'goalies' | 'results' | 'analys';

/* normalizers — handle both local server.js and production BQ API response shapes */
function normPlayer(p: any): PlayerStat & { _name: string; _team: string; _pos: string; _num: number; _gp: number; _g: number; _a: number; _p: number; _ppg: string; _pim: number; _pm: string } {
  const gp = p.gp ?? p.games_played ?? 0;
  const pts = p.points ?? 0;
  const ppg = p.avg_ppg ?? p.avg ?? (gp > 0 ? (pts / gp).toFixed(2) : '0.00');
  return { ...p, _name: p.name || p.player_name || '', _team: p.team || p.team_code || '', _pos: p.position || '', _num: p.jersey_number ?? p.number ?? 0, _gp: gp, _g: p.goals ?? 0, _a: p.assists ?? 0, _p: pts, _ppg: String(ppg), _pim: p.pim ?? 0, _pm: String(p.plus_minus ?? '') };
}
function normGoalie(g: any): GoalieStat & { _name: string; _team: string; _gp: number; _ga: number; _gaa: string; _svp: string; _so: number; _w: number; _l: number; _wpct: string; _svs: number; _toi: string } {
  return { ...g, _name: g.name || g.goalie_name || '', _team: g.team || g.team_code || '', _gp: g.gp ?? g.games_played ?? 0, _ga: g.ga ?? g.goals_against ?? 0, _gaa: String(g.gaa ?? ''), _svp: String(g.svs_pct ?? g.save_pct ?? ''), _so: g.so ?? g.shutouts ?? 0, _w: g.wins ?? 0, _l: g.losses ?? 0, _wpct: g.win_pct ? String(Number(g.win_pct).toFixed(1)) : '', _svs: g.svs ?? g.saves ?? 0, _toi: g.toi_minutes ?? g.mip ?? '' };
}
function normGame(g: any): NormGame {
  const d = g.date || g.match_date || '';
  const h = g.home_team || '';
  const a = g.away_team || '';
  const isBjk = h.toLowerCase().includes('björklöven') || h.toLowerCase().includes('bjorkloven');
  const r = (g.result || '').replace(/\xa0/g, ' ').trim();
  const m = r.match(/(\d+)\s*-\s*(\d+)/);
  const hg = g.home_goals ?? (m ? parseInt(m[1]) : 0);
  const ag = g.away_goals ?? (m ? parseInt(m[2]) : 0);
  let res = g.bjk_result || '';
  if (!res && m) {
    const bjkG = isBjk ? hg : ag; const oppG = isBjk ? ag : hg;
    res = bjkG > oppG ? 'W' : bjkG < oppG ? 'L' : 'D';
  }
  return { ...g, _date: d, _home: h, _away: a, _result: r, _hg: hg, _ag: ag, _bjkHome: g.bjk_is_home ?? isBjk, _bjkRes: res };
}

/* ── small helpers ── */
const resultColor: Record<string, string> = { W: '#25c06d', L: '#ff4d4d', OTL: '#ffc247', D: '#77b5ff' };
function Badge({ r }: { r: string }) {
  const c = resultColor[r] || '#6f857c';
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 22, fontSize: '.7rem', fontWeight: 800, color: c, border: `1.5px solid ${c}`, borderRadius: 5 }}>{r}</span>;
}
function Shimmer() { return <div style={{ height: 18, borderRadius: 6, background: 'linear-gradient(90deg, rgba(255,255,255,.03) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />; }
function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (<div style={{ textAlign: 'center', padding: '12px 4px', minWidth: 64 }}>
    <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: accent || 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>{label}</div>
  </div>);
}
function FormStreak({ games }: { games: ReturnType<typeof normGame>[] }) {
  const last10 = games.slice(0, 10);
  return (<div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
    {last10.map((g, i) => (<div key={i} title={`${g._date}: ${g._home} ${g._hg}-${g._ag} ${g._away}`}
      style={{ width: 10, height: 10, borderRadius: '50%', background: resultColor[g._bjkRes] || '#444', opacity: 1 - i * 0.05, transition: 'transform .2s', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.6)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />))}
    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>
      Senaste 10: {last10.filter(g => g._bjkRes === 'W').length}V-{last10.filter(g => g._bjkRes === 'L').length}F
    </span>
  </div>);
}
function Card({ children, kicker, glow, style }: { children: React.ReactNode; kicker?: string; glow?: string; style?: React.CSSProperties }) {
  return (<section style={{ background: 'rgba(14,24,20,.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(172,199,186,.12)', borderRadius: 14, padding: '18px 20px', marginBottom: 14, borderLeft: glow ? `3px solid ${glow}` : undefined, boxShadow: glow ? `0 0 20px ${glow}22` : '0 8px 24px rgba(0,0,0,.3)', ...style }}>
    {kicker && <p style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--brand-green)', marginBottom: 8 }}>{kicker}</p>}
    {children}
  </section>);
}
function StatsTable({ columns, rows, highlightTeam }: { columns: { key: string; label: string; align?: string; accent?: boolean; width?: number }[]; rows: Record<string, any>[]; highlightTeam?: string }) {
  return (<div style={{ overflowX: 'auto', margin: '0 -8px' }}>
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 2px', fontSize: '.8rem' }}>
      <thead><tr>{columns.map(c => (<th key={c.key} style={{ textAlign: (c.align || 'center') as any, padding: '8px 6px', fontSize: '.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: c.accent ? 'var(--brand-gold)' : 'var(--text-muted)', borderBottom: '1px solid rgba(172,199,186,.1)', position: 'sticky', top: 0, background: 'rgba(14,24,20,.95)', width: c.width }}>{c.label}</th>))}</tr></thead>
      <tbody>{rows.map((row, i) => {
        const hl = highlightTeam && (row._team || row.team || '').toLowerCase() === highlightTeam.toLowerCase();
        return (<tr key={i} style={{ background: hl ? 'rgba(37,163,90,.08)' : i % 2 === 0 ? 'rgba(255,255,255,.01)' : 'transparent', transition: 'background .15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = hl ? 'rgba(37,163,90,.08)' : i % 2 === 0 ? 'rgba(255,255,255,.01)' : 'transparent')}>
          {columns.map(c => (<td key={c.key} style={{ textAlign: (c.align || 'center') as any, padding: '7px 6px', fontWeight: c.accent ? 700 : (c.key === '_name' && hl) ? 700 : 400, color: c.accent ? 'var(--brand-gold)' : (c.key === '_name' && hl) ? 'var(--brand-green-light)' : 'var(--text-primary)', borderBottom: '1px solid rgba(172,199,186,.05)' }}>{row[c.key] ?? ''}</td>))}
        </tr>);
      })}</tbody>
    </table>
  </div>);
}

/* ══════════════════════════════════════════ */
export function StatisticsPage() {
  const [raw, setRaw] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [seasons, setSeasons] = useState<{key: string; name: string; is_active: boolean}[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');

  useEffect(() => {
    fetch(`${API_URL}/api/v1/seasons`)
      .then(r => r.json())
      .then(d => {
        if (d.seasons) setSeasons(d.seasons);
        if (d.active) setSelectedSeason(d.active);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/v1/statistics${selectedSeason ? `?season=${selectedSeason}` : ''}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => setRaw(j))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedSeason]);

  if (loading) return (<div className="page animate-fade-up"><Card kicker="Statistik"><h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--brand-green-light)' }}>Laddar Swehockey-data...</h2><div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>{[0,1,2,3].map(i => <Shimmer key={i} />)}</div></Card></div>);
  if (error || raw?.status === 'error') return (<div className="page animate-fade-up"><Card kicker="Statistik" glow="var(--impact-negative)"><h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Kunde inte ladda statistik</h2><p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{error || raw?.error}</p></Card></div>);

  // Normalize — handles both local server.js shape and production BQ API shape
  const standing: Standing = raw.team_standing || raw.record || {};
  const rec = {
    gp: standing.games_played ?? (raw.record?.gp ?? 0),
    wins: standing.wins ?? (raw.record?.wins ?? 0),
    losses: standing.losses ?? (raw.record?.losses ?? 0),
    otl: standing.ot_losses ?? (raw.record?.otl ?? 0),
    otw: standing.ot_wins ?? 0,
    gf: raw.record?.gf ?? 0,
    ga: raw.record?.ga ?? 0,
    points: standing.points ?? (raw.record?.points ?? 0),
    goalDiff: standing.goal_diff ?? 0,
    rank: standing.rank ?? 0,
  };

  const scorers = (raw.top_scorers || []).map(normPlayer);
  const goalies = (raw.top_goalies || []).map(normGoalie);
  const games = (raw.games || raw.upcoming_or_recent_games || []).map(normGame);
  const bjkReg = (raw.bjorkloven_skaters?.regular || []).map(normPlayer);
  const bjkPlay = (raw.bjorkloven_skaters?.playoff || []).map(normPlayer);
  const bjkGReg = (raw.bjorkloven_goalies?.regular || []).map(normGoalie);

  const season = raw.season || raw.league || 'HockeyAllsvenskan 2025/26';
  const scrapedAt = raw.snapshot_scraped_at;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Översikt', icon: '📊' },
    { key: 'scorers', label: 'Poängliga', icon: '🏅' },
    { key: 'goalies', label: 'Målvakter', icon: '🧤' },
    { key: 'results', label: 'Matcher', icon: '📅' },
    { key: 'analys', label: 'Analys', icon: '📈' },
  ];

  const skaterCols = [
    { key: '_num', label: '#', width: 32 },
    { key: '_name', label: 'Spelare', align: 'left' },
    { key: '_team', label: 'Lag', width: 48 },
    { key: '_pos', label: 'Pos', width: 38 },
    { key: '_gp', label: 'GP', width: 36 },
    { key: '_g', label: 'G', width: 34 },
    { key: '_a', label: 'A', width: 34 },
    { key: '_p', label: 'P', width: 34, accent: true },
    { key: '_ppg', label: 'PPG', width: 42 },
    { key: '_pim', label: 'PIM', width: 38 },
    { key: '_pm', label: '+/-', width: 42 },
  ];
  const bjkCols = skaterCols.filter(c => c.key !== '_team');
  const goalieCols = [
    { key: '_name', label: 'Målvakt', align: 'left' },
    { key: '_team', label: 'Lag', width: 44 },
    { key: '_gp', label: 'GP', width: 36 },
    { key: '_ga', label: 'GA', width: 36 },
    { key: '_gaa', label: 'GAA', width: 44 },
    { key: '_svp', label: 'SV%', width: 48, accent: true },
    { key: '_svs', label: 'SVS', width: 40 },
    { key: '_so', label: 'SO', width: 32 },
    { key: '_w', label: 'V', width: 32 },
    { key: '_l', label: 'F', width: 32 },
    { key: '_wpct', label: 'V%', width: 40 },
  ];

  const winPct = rec.gp > 0 ? ((rec.wins / rec.gp) * 100).toFixed(0) : '–';

  return (
    <div className="page animate-fade-up">
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .stat-tab{flex:1;padding:9px 10px;border:none;border-radius:9px;cursor:pointer;font-family:var(--font-sans);font-weight:600;font-size:.78rem;transition:all .25s cubic-bezier(.4,0,.2,1);background:transparent;color:var(--text-muted)}
        .stat-tab:hover{background:rgba(255,255,255,.04);color:var(--text-secondary)}
        .stat-tab.active{background:linear-gradient(135deg,var(--brand-green),#1a8a4a);color:#fff;box-shadow:0 4px 16px rgba(37,163,90,.25)}
        .game-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(172,199,186,.06);font-size:.82rem;transition:background .15s}
        .game-row:hover{background:rgba(255,255,255,.03);border-radius:6px}
      `}</style>

      <Card glow="var(--brand-green)">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--brand-green)', marginBottom: 4 }}>{season}</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: 0, background: 'linear-gradient(135deg, var(--text-primary), var(--brand-green-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Säsongsstatistik</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {seasons.length > 1 && (
              <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}
                style={{ background: 'rgba(15,23,42,0.8)', color: '#e2e8f0', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
                {seasons.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
              </select>
            )}
            {scrapedAt && <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(37,163,90,.1)', border: '1px solid rgba(37,163,90,.2)', fontSize: '.68rem', color: 'var(--brand-green-light)' }}>{new Date(scrapedAt).toLocaleDateString('sv-SE')}</div>}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(14,24,20,.7)', borderRadius: 12, border: '1px solid rgba(172,199,186,.08)', marginBottom: 14 }}>
        {tabs.map(t => (<button key={t.key} className={`stat-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}><span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}</button>))}
      </div>

      {tab === 'overview' && (<>
        <Card kicker={rec.rank ? `#${rec.rank} i tabellen` : 'Grundserie'} glow="var(--brand-gold)" style={{ background: 'linear-gradient(135deg, rgba(14,24,20,.9), rgba(20,30,26,.9))' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: 4 }}>
            <StatPill label="GP" value={rec.gp} />
            <StatPill label="Vinster" value={rec.wins} accent="var(--impact-positive)" />
            <StatPill label="Förluster" value={rec.losses} accent="var(--impact-negative)" />
            <StatPill label="ÖT" value={rec.otl} accent="var(--impact-warning)" />
            {rec.gf > 0 && <StatPill label="GF" value={rec.gf} />}
            {rec.ga > 0 && <StatPill label="GA" value={rec.ga} />}
            <StatPill label="Poäng" value={rec.points} accent="var(--brand-gold)" />
            <StatPill label="V%" value={`${winPct}%`} accent="var(--brand-green-light)" />
          </div>
          {games.length > 0 && <FormStreak games={games} />}
        </Card>

        {bjkReg.length > 0 && <Card kicker="Björklöven — Poängtoppen (Grundserie)"><StatsTable columns={bjkCols} rows={bjkReg} /></Card>}
        {bjkPlay.length > 0 && <Card kicker="Björklöven — Slutspel"><StatsTable columns={bjkCols} rows={bjkPlay} /></Card>}

        {/* If no bjk-specific data, show top scorers inline */}
        {bjkReg.length === 0 && scorers.length > 0 && <Card kicker="Poängtoppen"><StatsTable columns={skaterCols} rows={scorers.slice(0, 10)} highlightTeam="ifb" /></Card>}

        {bjkGReg.length > 0 && <Card kicker="Målvakter (Grundserie)"><StatsTable columns={goalieCols.filter(c => c.key !== '_team')} rows={bjkGReg} /></Card>}
        {bjkGReg.length === 0 && goalies.length > 0 && <Card kicker="Målvakter"><StatsTable columns={goalieCols} rows={goalies} highlightTeam="ifb" /></Card>}

        {games.length > 0 && <Card kicker="Senaste matcherna">
          {games.slice(0, 6).map((g: NormGame, i: number) => (<div key={i} className="game-row">
            <span style={{ color: 'var(--text-muted)', fontSize: '.7rem', minWidth: 68, fontVariantNumeric: 'tabular-nums' }}>{g._date}</span>
            <Badge r={g._bjkRes} />
            <span style={{ flex: 1 }}>
              <span style={{ fontWeight: g._bjkHome ? 700 : 400 }}>{g._home}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 6px', fontWeight: 600 }}>{g._hg}–{g._ag}</span>
              <span style={{ fontWeight: !g._bjkHome ? 700 : 400 }}>{g._away}</span>
            </span>
          </div>))}
        </Card>}
      </>)}

      {tab === 'scorers' && <Card kicker="Poängliga — Hela HockeyAllsvenskan"><StatsTable columns={skaterCols} rows={scorers} highlightTeam="ifb" /></Card>}
      {tab === 'goalies' && <Card kicker="Målvaktsstatistik — Hela HockeyAllsvenskan"><StatsTable columns={goalieCols} rows={goalies} highlightTeam="ifb" /></Card>}
      {tab === 'results' && <Card kicker={`Alla Björklöven-matcher (${games.length})`}>
        {games.map((g: NormGame, i: number) => (<div key={i} className="game-row">
          <span style={{ color: 'var(--text-muted)', fontSize: '.7rem', minWidth: 68, fontVariantNumeric: 'tabular-nums' }}>{g._date}</span>
          <Badge r={g._bjkRes} />
          <span style={{ flex: 1 }}>
            <span style={{ fontWeight: g._bjkHome ? 700 : 400 }}>{g._home}</span>
            <span style={{ color: 'var(--text-muted)', margin: '0 6px', fontWeight: 600 }}>{g._hg}–{g._ag}</span>
            <span style={{ fontWeight: !g._bjkHome ? 700 : 400 }}>{g._away}</span>
          </span>
        </div>))}
      </Card>}
      {tab === 'analys' && <Card kicker="Avancerad analys — Björklöven"><AnalyticsTabs season={selectedSeason} /></Card>}
    </div>
  );
}
