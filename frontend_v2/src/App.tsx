import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, Newspaper, ShieldAlert, Users } from 'lucide-react';
import { SillySeason } from './pages/SillySeason';
import { Roster } from './pages/Roster';
import { EkonomiPage } from './pages/Ekonomi';
import { useLageStore } from './store/useLageStore';
import { useCurrentState } from './hooks/useCurrentState';
import { HeroCard } from './components/lage/HeroCard';
import { Supportersnacket } from './components/lage/Supportersnacket';
import { NastaSnackis } from './components/lage/NastaSnackis';
import { VagenTillShl } from './components/lage/VagenTillShl';
import type { LageSnapshot } from './types/lage';

type LagePageProps = {
  isLoading: boolean;
  error: string | null;
  data: LageSnapshot | null;
};

function LagePage({ isLoading, data }: LagePageProps) {
  const [results, setResults] = useState<any>(null);
  const [standings, setStandings] = useState<any>(null);
  const currentState = useCurrentState();

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3456';
    fetch(`${API_URL}/api/v1/sportradar/results`).then(r => r.json()).then(setResults).catch(() => {});
    fetch(`${API_URL}/api/v1/sportradar/standings`).then(r => r.json()).then(setStandings).catch(() => {});
  }, []);

  if (isLoading && currentState.isLoading) {
    return (
      <div className="page animate-fade-up">
        <section className="signal-card">
          <p className="card-kicker">Lövenläget</p>
          <h2 className="card-title">Laddar lägesbild...</h2>
        </section>
      </div>
    );
  }

  const last5 = results?.results?.slice(0, 5) || [];
  const cs = currentState.data;

  return (
    <div className="page page-laget animate-fade-up">

      {/* 1. HERO — Läget Just Nu */}
      {cs && <HeroCard data={cs} />}
      {!cs && currentState.error && (
        <section className="signal-card signal-card-warning" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">Läget Just Nu</p>
          <p className="card-text">Signalmotorn laddas... {currentState.error}</p>
        </section>
      )}

      {/* 2. SUPPORTERSNACKET */}
      {cs?.supporter_snack && <Supportersnacket snack={cs.supporter_snack} />}

      {/* 3. ATT LÖSA HÄRNÄST */}
      {data && (
        <section className="signal-card signal-card-critical">
          <p className="card-kicker">🧭 Att lösa härnäst</p>
          <ul className="critical-list">
            {data.critical_now.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. SENASTE IMPACT */}
      {data && (
        <section className="signal-card signal-card-warning">
          <p className="card-kicker">⚡ Senaste impact</p>
          <h2 className="card-title">{data.latest_impact.title}</h2>
          <p className="card-text">{data.latest_impact.meaning}</p>
        </section>
      )}

      {/* 5. TRUPPBYGGET */}
      {data && (
        <section className="signal-card signal-card-ok" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">🏗️ Truppbygget</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.3rem' }}>
            <p className="compact-line">MV: {data.squad_status.goalies}</p>
            <p className="compact-line">Backar: {data.squad_status.defense}</p>
            <p className="compact-line">Center: {data.squad_status.centers}</p>
            <p className="compact-line">FW: {data.squad_status.forwards}</p>
          </div>
          {data.readiness && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                <span>SHL Readiness</span>
                <span style={{ fontWeight: 800, color: 'var(--brand-gold)' }}>{data.readiness.score}/100</span>
              </div>
              <div className="readiness-bar" aria-label={`SHL Readiness ${data.readiness.score} av 100`}>
                <span className="readiness-fill" style={{ width: `${data.readiness.score}%` }} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* 6. NÄSTA SNACKIS */}
      {cs?.next_watch && <NastaSnackis watchList={cs.next_watch} />}

      {/* 7. VÄGEN TILL SHL */}
      {cs?.milestones && <VagenTillShl milestones={cs.milestones} />}

      {/* 8. SENASTE MATCHER */}
      {last5.length > 0 && (
        <section className="signal-card" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">🏒 Senaste matcherna</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.4rem' }}>
            {last5.map((m: any, i: number) => {
              const isWin = m.result === 'W';
              return (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.35rem 0.5rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${isWin ? 'var(--impact-positive)' : 'var(--impact-negative)'}`,
                }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    color: isWin ? 'var(--impact-positive)' : 'var(--impact-negative)',
                    textAlign: 'center',
                  }}>{m.result}</span>
                  <div style={{ fontSize: '0.78rem' }}>
                    <span style={{ fontWeight: m.isHome ? 700 : 400 }}>{m.home}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 0.3rem' }}>vs</span>
                    <span style={{ fontWeight: !m.isHome ? 700 : 400 }}>{m.away}</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                    {m.homeScore}–{m.awayScore}
                  </span>
                </div>
              );
            })}
          </div>
          {results?.form && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Form (senaste 10): <strong style={{ color: 'var(--brand-gold)' }}>{results.form}</strong>
            </div>
          )}
        </section>
      )}

      {/* 9. EKONOMIKOLLEN */}
      {data && (
        <section className="signal-card signal-card-warning" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">💰 Ekonomikollen</p>
          <p className="compact-line">Risknivå: {data.economy_status.risk_level}</p>
          <p className="compact-line" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {data.economy_status.budget_pressure}
          </p>
          <p className="compact-line" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.3rem' }}>
            {data.economy_status.next_question}
          </p>
        </section>
      )}

      {/* 10. TABELL */}
      {standings?.table && (
        <section className="signal-card" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">🏆 {standings.season} — Slutställning</p>
          <div style={{ overflowX: 'auto', marginTop: '0.4rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.3rem 0.4rem' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.3rem 0.4rem' }}>Lag</th>
                  <th style={{ textAlign: 'center', padding: '0.3rem' }}>SM</th>
                  <th style={{ textAlign: 'center', padding: '0.3rem' }}>V</th>
                  <th style={{ textAlign: 'center', padding: '0.3rem' }}>F</th>
                  <th style={{ textAlign: 'center', padding: '0.3rem' }}>P</th>
                  <th style={{ textAlign: 'center', padding: '0.3rem' }}>+/-</th>
                </tr>
              </thead>
              <tbody>
                {standings.table.slice(0, 10).map((row: any) => (
                  <tr key={row.teamId} style={{
                    background: row.isBjorkloven ? 'rgba(37,163,90,0.1)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    fontWeight: row.isBjorkloven ? 800 : 400,
                    color: row.isBjorkloven ? 'var(--brand-gold)' : 'var(--text-secondary)',
                  }}>
                    <td style={{ padding: '0.3rem 0.4rem' }}>{row.rank}</td>
                    <td style={{ padding: '0.3rem 0.4rem' }}>{row.team}</td>
                    <td style={{ textAlign: 'center', padding: '0.3rem' }}>{row.gp}</td>
                    <td style={{ textAlign: 'center', padding: '0.3rem' }}>{row.w}</td>
                    <td style={{ textAlign: 'center', padding: '0.3rem' }}>{row.l}</td>
                    <td style={{ textAlign: 'center', padding: '0.3rem', fontWeight: 700, color: row.isBjorkloven ? 'var(--brand-gold)' : 'var(--text-primary)' }}>{row.pts}</td>
                    <td style={{ textAlign: 'center', padding: '0.3rem', color: row.diff > 0 ? 'var(--impact-positive)' : 'var(--impact-negative)' }}>
                      {row.diff > 0 ? '+' : ''}{row.diff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// EkonomiPage imported from ./pages/Ekonomi

function MerPage() {
  return (
    <div className="page animate-fade-up">
      <section className="signal-card">
        <p className="card-kicker">Mer</p>
        <h2 className="card-title">Historik, metod och inställningar</h2>
        <p className="card-text">Kommer i senare block enligt UX-backloggen.</p>
      </section>
    </div>
  );
}

const navItems = [
  { to: '/', label: 'Läget', icon: Activity },
  { to: '/trupp', label: 'Trupp', icon: Users },
  { to: '/silly', label: 'Silly', icon: Newspaper },
  { to: '/ekonomi', label: 'Ekonomi', icon: BarChart3 },
  { to: '/mer', label: 'Mer', icon: ShieldAlert },
] as const;

function App() {
  const { data, isLoading, error, fetchLage } = useLageStore();

  useEffect(() => {
    void fetchLage();
  }, [fetchLage]);

  const sourceUpdatedAt = data?.meta?.source_updated_at || null;
  const freshnessPrefix =
    data?.meta?.freshness_status === 'fresh'
      ? 'Live'
      : data?.meta?.freshness_status === 'stale'
        ? 'Fördröjd'
        : data?.meta?.freshness_status === 'critical'
          ? 'Gammal data'
          : 'Status oklar';
  const freshnessLabel = sourceUpdatedAt
    ? `${freshnessPrefix} • ${new Date(sourceUpdatedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`
    : freshnessPrefix;

  return (
    <Router>
      <div className="controlroom-shell">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">Lövenläget</p>
            <h1 className="topbar-title">SHL 26/27</h1>
          </div>
          <div className="freshness">
            <AlertTriangle size={14} />
            <span>{freshnessLabel}</span>
          </div>
        </header>

        <main className="content-area">
          <Routes>
            <Route path="/" element={<LagePage isLoading={isLoading} error={error} data={data} />} />
            <Route path="/trupp" element={<Roster />} />
            <Route path="/silly" element={<SillySeason />} />
            <Route path="/ekonomi" element={<EkonomiPage />} />
            <Route path="/mer" element={<MerPage />} />
          </Routes>
        </main>

        <nav className="bottom-nav" aria-label="Primär navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `bottom-link${isActive ? ' active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </Router>
  );
}

export default App;
