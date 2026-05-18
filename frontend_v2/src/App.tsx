import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, Newspaper, ShieldAlert, Users, MessageSquare, LineChart, Trophy } from 'lucide-react';
import { SillySeason } from './pages/SillySeason';
import { Roster } from './pages/Roster';
import { EkonomiPage } from './pages/Ekonomi';
import { XFeedPage } from './pages/XFeed';
import { StatisticsPage } from './pages/Statistics';
import { PreseasonShlPage } from './pages/PreseasonShl';
import { useLageStore } from './store/useLageStore';
import { useCurrentState } from './hooks/useCurrentState';
import { HeroCard } from './components/lage/HeroCard';
import { Supportersnacket } from './components/lage/Supportersnacket';
import { NastaSnackis } from './components/lage/NastaSnackis';
import { VagenTillShl } from './components/lage/VagenTillShl';
import type { LageSnapshot } from './types/lage';
import { API_URL } from './config/api';

type LagePageProps = {
  isLoading: boolean;
  error: string | null;
  data: LageSnapshot | null;
};

function LagePage({ isLoading, data }: LagePageProps) {
  const [results, setResults] = useState<any>(null);
  const currentState = useCurrentState();

  useEffect(() => {
    fetch(`${API_URL}/api/v1/sportradar/results`).then((r) => r.json()).then(setResults).catch(() => {});
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
  const pulse24h = data?.meta?.last_24h;

  return (
    <div className="page page-laget animate-fade-up">
      {cs && <HeroCard data={cs} />}
      {!cs && currentState.error && (
        <section className="signal-card signal-card-warning" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">Läget Just Nu</p>
          <p className="card-text">Signalmotorn laddas... {currentState.error}</p>
        </section>
      )}

      {cs?.supporter_snack && <Supportersnacket snack={cs.supporter_snack} />}

      {pulse24h ? (
        <section className="signal-card signal-card-warning" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">Lövenpulsen 24h</p>
          <p className="card-text" style={{ marginBottom: '0.45rem' }}>
            {pulse24h.new_signals > 0 ? `+${pulse24h.new_signals} nya signaler senaste dygnet.` : 'Lugnt dygn i flödet.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', marginTop: '0.3rem' }}>
            <div>
              <p className="compact-line">+{pulse24h.new_signals}</p>
              <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>nya signaler</p>
            </div>
            <div>
              <p className="compact-line">{pulse24h.articles_24h}</p>
              <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>artiklar</p>
            </div>
            <div>
              <p className="compact-line">{pulse24h.critical_open}</p>
              <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>kritiska luckor</p>
            </div>
          </div>
          <p style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Nyförvärv {pulse24h.signings} · Lämnar {pulse24h.departures} · Förlängningar {pulse24h.extensions} · Rykten {pulse24h.rumors}
          </p>
        </section>
      ) : (
        <section className="signal-card signal-card-warning" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">Lövenpulsen 24h</p>
          <p className="card-text">24h-data är tillfälligt inte tillgänglig i detta API-svar.</p>
        </section>
      )}

      {data && (
        <section className="signal-card signal-card-critical">
          <p className="card-kicker">Att lösa härnäst</p>
          <ul className="critical-list">
            {data.critical_now.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {data && (
        <section className="signal-card signal-card-warning">
          <p className="card-kicker">Senaste impact</p>
          <h2 className="card-title">{data.latest_impact.title}</h2>
          <p className="card-text">{data.latest_impact.meaning}</p>
        </section>
      )}

      {data && (
        <section className="signal-card signal-card-ok" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">Truppbygget</p>
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

      {cs?.next_watch && <NastaSnackis watchList={cs.next_watch} />}
      {cs?.milestones && <VagenTillShl milestones={cs.milestones} />}

      {last5.length > 0 && (
        <section className="signal-card" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">Senaste matcherna</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.4rem' }}>
            {last5.map((m: any, i: number) => {
              const isWin = m.result === 'W';
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr auto',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.35rem 0.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${isWin ? 'var(--impact-positive)' : 'var(--impact-negative)'}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      color: isWin ? 'var(--impact-positive)' : 'var(--impact-negative)',
                      textAlign: 'center',
                    }}
                  >
                    {m.result}
                  </span>
                  <div style={{ fontSize: '0.78rem' }}>
                    <span style={{ fontWeight: m.isHome ? 700 : 400 }}>{m.home}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 0.3rem' }}>vs</span>
                    <span style={{ fontWeight: !m.isHome ? 700 : 400 }}>{m.away}</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                    {m.homeScore}-{m.awayScore}
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

      {data && (
        <section className="signal-card signal-card-warning" style={{ padding: '0.8rem' }}>
          <p className="card-kicker">Ekonomikollen</p>
          <p className="compact-line">Risknivå: {data.economy_status.risk_level}</p>
          <p className="compact-line" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {data.economy_status.budget_pressure}
          </p>
          <p className="compact-line" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.3rem' }}>
            {data.economy_status.next_question}
          </p>
        </section>
      )}
    </div>
  );
}

function MerPage() {
  return (
    <div className="page animate-fade-up">
      <section className="signal-card">
        <p className="card-kicker">Om projektet</p>
        <h2 className="card-title">Teamet bakom Lövenläget</h2>
        <p className="card-text">
          Lövenläget byggs av ett litet team med tydlig ansvarsfördelning: mänsklig styrning och
          AI-stöd i genomförandet. Målet är enkelhet, transparens och snabb förbättringstakt.
        </p>
        <div style={{ marginTop: '0.6rem', display: 'grid', gap: '0.35rem' }}>
          <p className="compact-line">
            <strong>Huvudarkitekt:</strong>{' '}
            <a href="mailto:saman.akbarian@gmail.com">Saman Akbarian</a>
          </p>
          <p className="compact-line"><strong>AI-utvecklingsagenter:</strong> GPT-5.3 Codex, Claude Opus 4.6, Gemini 3.1 Pro</p>
          <p className="compact-line"><strong>Så jobbar vi:</strong> Saman sätter riktning, prioriterar och kvalitetssäkrar. AI-agenterna hjälper till att bygga, testa och iterera snabbt.</p>
        </div>
      </section>
    </div>
  );
}

const navItems = [
  { to: '/', label: 'Läget', icon: Activity },
  { to: '/preseason-shl', label: 'Preseason', icon: Trophy },
  { to: '/trupp', label: 'Trupp', icon: Users },
  { to: '/silly', label: 'Silly', icon: Newspaper },
  { to: '/statistik', label: 'Statistik', icon: LineChart },
  { to: '/ekonomi', label: 'Ekonomi', icon: BarChart3 },
  { to: '/x', label: 'X-flöde', icon: MessageSquare },
  { to: '/mer', label: 'Om', icon: ShieldAlert },
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
            <Route path="/preseason-shl" element={<PreseasonShlPage />} />
            <Route path="/trupp" element={<Roster />} />
            <Route path="/silly" element={<SillySeason />} />
            <Route path="/statistik" element={<StatisticsPage />} />
            <Route path="/ekonomi" element={<EkonomiPage />} />
            <Route path="/x" element={<XFeedPage />} />
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
