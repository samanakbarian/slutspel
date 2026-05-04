import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, Newspaper, ShieldAlert, Users } from 'lucide-react';
import { SillySeason } from './pages/SillySeason';
import { Roster } from './pages/Roster';
import { useLageStore } from './store/useLageStore';
import type { LageSnapshot } from './types/lage';

type LagePageProps = {
  isLoading: boolean;
  error: string | null;
  data: LageSnapshot | null;
};

function LagePage({ isLoading, error, data }: LagePageProps) {
  if (isLoading) {
    return (
      <div className="page animate-fade-up">
        <section className="signal-card">
          <p className="card-kicker">Lövenläget</p>
          <h2 className="card-title">Laddar lägesbild...</h2>
        </section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page animate-fade-up">
        <section className="signal-card signal-card-critical">
          <p className="card-kicker">Lövenläget</p>
          <h2 className="card-title">Kunde inte hämta lägesbild just nu</h2>
          <p className="card-text">{error || 'Försök igen om en stund.'}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page page-laget animate-fade-up">
      <section className="signal-card signal-card-primary">
        <p className="card-kicker">SHL Readiness</p>
        <div className="readiness-row">
          <div className="readiness-value">{data.readiness.score}</div>
          <div className="readiness-meta">/100</div>
        </div>
        <div className="readiness-bar" aria-label={`SHL Readiness ${data.readiness.score} av 100`}>
          <span className="readiness-fill" style={{ width: `${data.readiness.score}%` }} />
        </div>
        <p className="card-text">{data.readiness.summary}</p>
      </section>

      <section className="signal-card signal-card-critical">
        <p className="card-kicker">Kritiskt just nu</p>
        <ul className="critical-list">
          {data.critical_now.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="signal-card signal-card-warning">
        <p className="card-kicker">Senaste impact</p>
        <h2 className="card-title">{data.latest_impact.title}</h2>
        <p className="card-text">{data.latest_impact.meaning}</p>
      </section>

      <section className="signal-grid">
        <div className="signal-card signal-card-ok">
          <p className="card-kicker">Truppbygget</p>
          <p className="compact-line">MV: {data.squad_status.goalies}</p>
          <p className="compact-line">Backar: {data.squad_status.defense}</p>
          <p className="compact-line">Center: {data.squad_status.centers}</p>
          <p className="compact-line">FW: {data.squad_status.forwards}</p>
        </div>
        <div className="signal-card signal-card-warning">
          <p className="card-kicker">Ekonomikollen</p>
          <p className="compact-line">Risknivå: {data.economy_status.risk_level}</p>
          <p className="compact-line">Budgettryck: {data.economy_status.budget_pressure}</p>
          <p className="compact-line">Fråga: {data.economy_status.next_question}</p>
        </div>
      </section>
    </div>
  );
}

function EkonomiPage() {
  return (
    <div className="page animate-fade-up">
      <section className="signal-card signal-card-warning">
        <p className="card-kicker">Ekonomi</p>
        <h2 className="card-title">Ekonomikollen flyttas hit i nästa block</h2>
        <p className="card-text">Fokus nu är ny app shell, signalhierarki och backend-koppling.</p>
      </section>
    </div>
  );
}

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
  { to: '/rykten', label: 'Rykten', icon: Newspaper },
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
            <Route path="/rykten" element={<SillySeason />} />
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
