import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AlertTriangle, CalendarDays, LineChart, MessageSquare, Newspaper, Users } from 'lucide-react';
import { Matcher } from './pages/Matcher';
import { Nyheter } from './pages/Nyheter';
import { Roster } from './pages/Roster';
import { EkonomiPage } from './pages/Ekonomi';
import { XFeedPage } from './pages/XFeed';
import { StatisticsPage } from './pages/Statistics';
import { PreseasonShlPage } from './pages/PreseasonShl';
import { useLageStore } from './store/useLageStore';

/**
 * Fem flikar. Ekonomi och Preseason ligger kvar som rutter men är
 * avpublicerade från navigeringen — inga länkar dör, och de kan tas
 * tillbaka utan att byggas om.
 */
const navItems = [
  { to: '/matcher', label: 'Matcher', icon: CalendarDays },
  { to: '/statistik', label: 'Statistik', icon: LineChart },
  { to: '/trupp', label: 'Trupp', icon: Users },
  { to: '/nyheter', label: 'Nyheter', icon: Newspaper },
  { to: '/x', label: 'X-flöde', icon: MessageSquare },
] as const;

function freshnessLabel(meta: { freshness_status?: string; source_updated_at?: string | null } | undefined) {
  const updated = meta?.source_updated_at;
  const time = updated
    ? new Date(updated).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    : null;

  switch (meta?.freshness_status) {
    case 'fresh':
      return { text: time ? `Uppdaterad ${time}` : 'Uppdaterad nyss', tone: 'ok' as const };
    case 'stale':
      return { text: time ? `Fördröjd sedan ${time}` : 'Fördröjd', tone: 'warn' as const };
    case 'critical':
      return { text: time ? `Gammal data från ${time}` : 'Gammal data', tone: 'bad' as const };
    default:
      // Tidigare stod det "Status oklar", vilket inte sa en supporter någonting.
      return { text: time ? `Uppdaterad ${time}` : 'Hämtar data…', tone: 'idle' as const };
  }
}

function OmSida() {
  return (
    <div className="page animate-fade-up">
      <section className="mc-card">
        <p className="mc-kicker">Om</p>
        <h2 className="mc-title">Frågor eller synpunkter?</h2>
        <p className="mc-text" style={{ marginTop: 6 }}>
          Lövenläget samlar statistik, matcher och nyheter om IF Björklöven i SHL 2026/27.
          Data kommer från Swehockey Stats.
        </p>
        <p className="mc-text" style={{ marginTop: 10 }}>
          <a href="mailto:saman.akbarian@gmail.com">Skicka e-post</a>
        </p>
      </section>
    </div>
  );
}

function App() {
  const { data, fetchLage } = useLageStore();

  useEffect(() => {
    void fetchLage();
  }, [fetchLage]);

  const freshness = freshnessLabel(data?.meta);

  return (
    <Router>
      <div className="controlroom-shell">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">Lövenläget</p>
            <h1 className="topbar-title">SHL 26/27</h1>
          </div>
          <div className={`freshness freshness-${freshness.tone}`}>
            {freshness.tone !== 'ok' && <AlertTriangle size={14} />}
            <span>{freshness.text}</span>
          </div>
        </header>

        <main className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/matcher" replace />} />
            <Route path="/matcher" element={<Matcher />} />
            <Route path="/statistik" element={<StatisticsPage />} />
            <Route path="/trupp" element={<Roster />} />
            <Route path="/nyheter" element={<Nyheter />} />
            <Route path="/x" element={<XFeedPage />} />

            {/* Avpublicerade men fungerande rutter */}
            <Route path="/ekonomi" element={<EkonomiPage />} />
            <Route path="/preseason-shl" element={<PreseasonShlPage />} />
            <Route path="/om" element={<OmSida />} />

            {/* Gamla adresser */}
            <Route path="/silly" element={<Navigate to="/nyheter" replace />} />
            <Route path="/mer" element={<Navigate to="/om" replace />} />
            <Route path="*" element={<Navigate to="/matcher" replace />} />
          </Routes>

          <footer className="app-footer">
            <NavLink to="/om">Om Lövenläget</NavLink>
            <span aria-hidden="true">·</span>
            <span>Data från Swehockey Stats</span>
          </footer>
        </main>

        <nav className="bottom-nav" aria-label="Primär navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
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
