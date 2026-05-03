import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Newspaper, Activity, Calendar, Users, History } from 'lucide-react';
import { SillySeason } from './pages/SillySeason';
import { Matchcenter } from './pages/Matchcenter';
import { Roster } from './pages/Roster';

function Dashboard() {
  return (
    <div className="animate-fade-up" style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Välkommen till Löven Hub 2.0</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Dashboard under konstruktion...</p>
      
      <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--brand-gold)' }}>Trupp-KPI:er</h2>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>2/2</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Målvakter</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>7/8</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Backar</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>11/14</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Forwards</div>
          </div>
        </div>
      </div>
    </div>
  );
}



function App() {
  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{
          width: '260px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderRight: '1px solid var(--glass-border)',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--brand-gold)' }}>Löven Stats</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--brand-green-light)', fontWeight: 600, letterSpacing: '0.05em' }}>FRONTEND 2.0</p>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-primary)' }}>
              <Home size={20} /> Dashboard
            </Link>
            <Link to="/silly" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-primary)' }}>
              <Newspaper size={20} /> Silly Season
            </Link>
            <Link to="/matchcenter" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-primary)' }}>
              <Activity size={20} /> Matchcenter
            </Link>
            <Link to="/standings" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              <Calendar size={20} /> Spelschema
            </Link>
            <Link to="/roster" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              <Users size={20} /> Truppen
            </Link>
            <Link to="/history" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              <History size={20} /> Historik
            </Link>
          </nav>

          <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'var(--sponsor-bg)', border: '1px solid var(--sponsor-border)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Presenteras av</p>
            <div style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>LOKAL SPONSOR</div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/silly" element={<SillySeason />} />
            <Route path="/matchcenter" element={<Matchcenter />} />
            <Route path="/roster" element={<Roster />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
