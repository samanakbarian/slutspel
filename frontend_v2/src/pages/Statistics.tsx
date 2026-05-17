import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

/* ── types ── */
type PlayerStat = { rank: number; number: number; name: string; team: string; position: string; gp: number; goals: number; assists: number; points: number; avg: string; pim: number; plus_minus: string };
type GoalieStat = { rank: number; number: number; name: string; team: string; gp: number; ga: number; gaa: string; svs: number; svs_pct: string; so: number; wins: number; losses: number };
type GameResult = { game_id: number; date: string; home_team: string; away_team: string; result: string; spectators: number | null; venue: string; bjk_is_home: boolean; bjk_result: string; home_goals: number; away_goals: number };
type Rec = { wins: number; losses: number; otl: number; gf: number; ga: number; gp: number; points: number };
type StatsData = { status: string; season: string; league: string; team: string; record: Rec; top_scorers: PlayerStat[]; top_goalies: GoalieStat[]; bjorkloven_skaters: { regular: PlayerStat[]; playoff: PlayerStat[] }; bjorkloven_goalies: { regular: GoalieStat[]; playoff: GoalieStat[] }; games: GameResult[]; snapshot_scraped_at: string | null; error?: string };
type Tab = 'overview' | 'scorers' | 'goalies' | 'results';

/* ── small helpers ── */
const resultColor: Record<string, string> = { W: '#25c06d', L: '#ff4d4d', OTL: '#ffc247', D: '#77b5ff' };

function Badge({ r }: { r: string }) {
  const c = resultColor[r] || '#6f857c';
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 22, fontSize: '.7rem', fontWeight: 800, color: c, border: `1.5px solid ${c}`, borderRadius: 5, letterSpacing: '.02em' }}>{r}</span>;
}

function Shimmer() {
  return <div style={{ height: 18, borderRadius: 6, background: 'linear-gradient(90deg, rgba(255,255,255,.03) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />;
}

/* ── stat pill ── */
function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 4px', minWidth: 64 }}>
      <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: accent || 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* ── form streak dots ── */
function FormStreak({ games }: { games: GameResult[] }) {
  const last10 = games.slice(0, 10);
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
      {last10.map((g, i) => (
        <div key={g.game_id} title={`${g.date}: ${g.home_team} ${g.home_goals}-${g.away_goals} ${g.away_team}`}
          style={{ width: 10, height: 10, borderRadius: '50%', background: resultColor[g.bjk_result] || '#444', opacity: 1 - i * 0.05, transition: 'transform .2s', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.6)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
      ))}
      <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>
        Senaste 10: {last10.filter(g => g.bjk_result === 'W').length}V-{last10.filter(g => g.bjk_result === 'L').length}F
      </span>
    </div>
  );
}

/* ── glass card ── */
function Card({ children, kicker, glow, style }: { children: React.ReactNode; kicker?: string; glow?: string; style?: React.CSSProperties }) {
  return (
    <section style={{
      background: 'rgba(14,24,20,.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(172,199,186,.12)',
      borderRadius: 14, padding: '18px 20px', marginBottom: 14,
      borderLeft: glow ? `3px solid ${glow}` : undefined,
      boxShadow: glow ? `0 0 20px ${glow}22` : '0 8px 24px rgba(0,0,0,.3)',
      ...style,
    }}>
      {kicker && <p style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--brand-green)', marginBottom: 8 }}>{kicker}</p>}
      {children}
    </section>
  );
}

/* ── premium table ── */
function StatsTable({ columns, rows, highlightTeam }: {
  columns: { key: string; label: string; align?: string; accent?: boolean; width?: number }[];
  rows: Record<string, any>[];
  highlightTeam?: string;
}) {
  return (
    <div style={{ overflowX: 'auto', margin: '0 -8px' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 2px', fontSize: '.8rem' }}>
        <thead>
          <tr>{columns.map(c => (
            <th key={c.key} style={{
              textAlign: (c.align || 'center') as any, padding: '8px 6px', fontSize: '.65rem',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em',
              color: c.accent ? 'var(--brand-gold)' : 'var(--text-muted)',
              borderBottom: '1px solid rgba(172,199,186,.1)', position: 'sticky', top: 0,
              background: 'rgba(14,24,20,.95)', width: c.width,
            }}>{c.label}</th>
          ))}</tr>
        </thead>
        <tbody>{rows.map((row, i) => {
          const hl = highlightTeam && (row.team || '').toLowerCase() === highlightTeam.toLowerCase();
          return (
            <tr key={i} style={{
              background: hl ? 'rgba(37,163,90,.08)' : i % 2 === 0 ? 'rgba(255,255,255,.01)' : 'transparent',
              transition: 'background .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = hl ? 'rgba(37,163,90,.08)' : i % 2 === 0 ? 'rgba(255,255,255,.01)' : 'transparent')}>
              {columns.map(c => (
                <td key={c.key} style={{
                  textAlign: (c.align || 'center') as any, padding: '7px 6px',
                  fontWeight: c.accent ? 700 : (c.key === 'name' && hl) ? 700 : 400,
                  color: c.accent ? 'var(--brand-gold)' : (c.key === 'name' && hl) ? 'var(--brand-green-light)' : 'var(--text-primary)',
                  borderBottom: '1px solid rgba(172,199,186,.05)',
                }}>{row[c.key] ?? ''}</td>
              ))}
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════ */
/*  MAIN COMPONENT                               */
/* ══════════════════════════════════════════════ */
export function StatisticsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/v1/statistics`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => setData(j))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page animate-fade-up">
      <Card kicker="Statistik"><h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--brand-green-light)' }}>Laddar Swehockey-data...</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>{[0,1,2,3].map(i => <Shimmer key={i} />)}</div>
      </Card>
    </div>
  );

  if (error || data?.status === 'error') return (
    <div className="page animate-fade-up">
      <Card kicker="Statistik" glow="var(--impact-negative)"><h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Kunde inte ladda statistik</h2><p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{error || data?.error}</p></Card>
    </div>
  );

  const rec = data!.record;
  const games = data!.games || [];
  const scorers = data!.top_scorers || [];
  const goalies = data!.top_goalies || [];
  const bjkReg = data!.bjorkloven_skaters?.regular || [];
  const bjkPlay = data!.bjorkloven_skaters?.playoff || [];
  const bjkGReg = data!.bjorkloven_goalies?.regular || [];

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Översikt', icon: '📊' },
    { key: 'scorers', label: 'Poängliga', icon: '🏅' },
    { key: 'goalies', label: 'Målvakter', icon: '🧤' },
    { key: 'results', label: 'Matcher', icon: '📅' },
  ];

  const skaterCols = [
    { key: 'rank', label: '#', width: 32 },
    { key: 'name', label: 'Spelare', align: 'left' },
    { key: 'team', label: 'Lag', width: 48 },
    { key: 'gp', label: 'GP', width: 40 },
    { key: 'goals', label: 'G', width: 36 },
    { key: 'assists', label: 'A', width: 36 },
    { key: 'points', label: 'P', width: 36, accent: true },
    { key: 'pim', label: 'PIM', width: 42 },
    { key: 'plus_minus', label: '+/-', width: 42 },
  ];

  const bjkCols = [
    { key: 'name', label: 'Spelare', align: 'left' },
    { key: 'gp', label: 'GP', width: 40 },
    { key: 'goals', label: 'G', width: 36 },
    { key: 'assists', label: 'A', width: 36 },
    { key: 'points', label: 'P', width: 36, accent: true },
    { key: 'pim', label: 'PIM', width: 42 },
  ];

  const goalieCols = [
    { key: 'rank', label: '#', width: 32 },
    { key: 'name', label: 'Målvakt', align: 'left' },
    { key: 'team', label: 'Lag', width: 48 },
    { key: 'gp', label: 'GP', width: 40 },
    { key: 'ga', label: 'GA', width: 40 },
    { key: 'gaa', label: 'GAA', width: 48 },
    { key: 'svs_pct', label: 'SV%', width: 52, accent: true },
    { key: 'so', label: 'SO', width: 36 },
    { key: 'wins', label: 'V', width: 36 },
    { key: 'losses', label: 'F', width: 36 },
  ];

  const winPct = rec.gp > 0 ? ((rec.wins / rec.gp) * 100).toFixed(0) : '0';

  return (
    <div className="page animate-fade-up">
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes countUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .stat-tab{flex:1;padding:9px 10px;border:none;border-radius:9px;cursor:pointer;font-family:var(--font-sans);font-weight:600;font-size:.78rem;transition:all .25s cubic-bezier(.4,0,.2,1);background:transparent;color:var(--text-muted)}
        .stat-tab:hover{background:rgba(255,255,255,.04);color:var(--text-secondary)}
        .stat-tab.active{background:linear-gradient(135deg,var(--brand-green),#1a8a4a);color:#fff;box-shadow:0 4px 16px rgba(37,163,90,.25)}
        .game-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(172,199,186,.06);font-size:.82rem;transition:background .15s}
        .game-row:hover{background:rgba(255,255,255,.03);border-radius:6px}
      `}</style>

      {/* ── Header ── */}
      <Card glow="var(--brand-green)">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--brand-green)', marginBottom: 4 }}>{data!.league} {data!.season}</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: 0, background: 'linear-gradient(135deg, var(--text-primary), var(--brand-green-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Säsongsstatistik
            </h2>
          </div>
          <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(37,163,90,.1)', border: '1px solid rgba(37,163,90,.2)', fontSize: '.68rem', color: 'var(--brand-green-light)' }}>
            {data!.snapshot_scraped_at ? new Date(data!.snapshot_scraped_at).toLocaleDateString('sv-SE') : '—'}
          </div>
        </div>
      </Card>

      {/* ── Tab Nav ── */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(14,24,20,.7)', borderRadius: 12, border: '1px solid rgba(172,199,186,.08)', marginBottom: 14 }}>
        {tabs.map(t => (
          <button key={t.key} className={`stat-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: OVERVIEW ══ */}
      {tab === 'overview' && (
        <>
          {/* Record hero */}
          <Card kicker="Grundserie" glow="var(--brand-gold)" style={{ background: 'linear-gradient(135deg, rgba(14,24,20,.9), rgba(20,30,26,.9))' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: 4 }}>
              <StatPill label="GP" value={rec.gp} />
              <StatPill label="Vinster" value={rec.wins} accent="var(--impact-positive)" />
              <StatPill label="Förluster" value={rec.losses} accent="var(--impact-negative)" />
              <StatPill label="ÖT" value={rec.otl} accent="var(--impact-warning)" />
              <StatPill label="GF" value={rec.gf} />
              <StatPill label="GA" value={rec.ga} />
              <StatPill label="Poäng" value={rec.points} accent="var(--brand-gold)" />
              <StatPill label="V%" value={`${winPct}%`} accent="var(--brand-green-light)" />
            </div>
            <FormStreak games={games} />
          </Card>

          {/* Björklöven top scorers */}
          {bjkReg.length > 0 && (
            <Card kicker="Björklöven — Poängtoppen (Grundserie)">
              <StatsTable columns={bjkCols} rows={bjkReg} />
            </Card>
          )}

          {bjkPlay.length > 0 && (
            <Card kicker="Björklöven — Slutspel">
              <StatsTable columns={bjkCols} rows={bjkPlay} />
            </Card>
          )}

          {/* Goalies */}
          {bjkGReg.length > 0 && (
            <Card kicker="Målvakter (Grundserie)">
              <StatsTable columns={[
                { key: 'name', label: 'Målvakt', align: 'left' },
                { key: 'gp', label: 'GP', width: 40 },
                { key: 'ga', label: 'GA', width: 40 },
                { key: 'svs_pct', label: 'SV%', width: 52, accent: true },
                { key: 'wins', label: 'V', width: 36 },
                { key: 'losses', label: 'F', width: 36 },
              ]} rows={bjkGReg} />
            </Card>
          )}

          {/* Last 5 games */}
          <Card kicker="Senaste matcherna">
            {games.slice(0, 6).map(g => (
              <div key={g.game_id} className="game-row">
                <span style={{ color: 'var(--text-muted)', fontSize: '.7rem', minWidth: 68, fontVariantNumeric: 'tabular-nums' }}>{g.date}</span>
                <Badge r={g.bjk_result} />
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: g.bjk_is_home ? 700 : 400 }}>{g.home_team}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 6px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{g.home_goals}–{g.away_goals}</span>
                  <span style={{ fontWeight: !g.bjk_is_home ? 700 : 400 }}>{g.away_team}</span>
                </span>
                {g.spectators && <span style={{ color: 'var(--text-muted)', fontSize: '.68rem', fontVariantNumeric: 'tabular-nums' }}>{g.spectators.toLocaleString('sv-SE')}</span>}
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ══ TAB: SCORERS ══ */}
      {tab === 'scorers' && (
        <Card kicker="Poängliga — Hela HockeyAllsvenskan">
          <StatsTable columns={skaterCols} rows={scorers} highlightTeam="IFB" />
        </Card>
      )}

      {/* ══ TAB: GOALIES ══ */}
      {tab === 'goalies' && (
        <Card kicker="Målvaktsstatistik — Hela HockeyAllsvenskan">
          <StatsTable columns={goalieCols} rows={goalies} highlightTeam="IFB" />
        </Card>
      )}

      {/* ══ TAB: RESULTS ══ */}
      {tab === 'results' && (
        <Card kicker={`Alla Björklöven-matcher (${games.length})`}>
          {games.map(g => (
            <div key={g.game_id} className="game-row">
              <span style={{ color: 'var(--text-muted)', fontSize: '.7rem', minWidth: 68, fontVariantNumeric: 'tabular-nums' }}>{g.date}</span>
              <Badge r={g.bjk_result} />
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: g.bjk_is_home ? 700 : 400 }}>{g.home_team}</span>
                <span style={{ color: 'var(--text-muted)', margin: '0 6px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{g.home_goals}–{g.away_goals}</span>
                <span style={{ fontWeight: !g.bjk_is_home ? 700 : 400 }}>{g.away_team}</span>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '.68rem', minWidth: 48, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{g.spectators?.toLocaleString('sv-SE') || ''}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
