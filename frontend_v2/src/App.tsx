import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Newspaper, Activity, Calendar, Users, History } from 'lucide-react';
import { SillySeason } from './pages/SillySeason';
import { Matchcenter } from './pages/Matchcenter';
import { Roster } from './pages/Roster';

function Dashboard() {
  return (
    <div className="dashboard animate-fade-up">
      <h1 className="dashboard-title">Välkommen till Löven Hub 2.0</h1>
      <p className="dashboard-subtitle">Dashboard under konstruktion...</p>
      
      <div className="glass-panel dashboard-kpi-panel">
        <h2 className="dashboard-kpi-title">Trupp-KPI:er</h2>
        <div className="dashboard-kpi-grid">
          <div>
            <div className="dashboard-kpi-value">2/2</div>
            <div className="dashboard-kpi-label">Målvakter</div>
          </div>
          <div>
            <div className="dashboard-kpi-value">7/8</div>
            <div className="dashboard-kpi-label">Backar</div>
          </div>
          <div>
            <div className="dashboard-kpi-value">11/14</div>
            <div className="dashboard-kpi-label">Forwards</div>
          </div>
        </div>
      </div>
    </div>
  );
}



function App() {
  return (
    <Router>
      <div className="app-shell">
        <aside className="app-sidebar" aria-label="Primär navigation">
          <div>
            <h1 className="app-title">Löven Stats</h1>
            <p className="app-subtitle">FRONTEND 2.0</p>
          </div>
          
          <nav className="app-nav">
            <Link to="/" className="app-nav-link">
              <Home size={20} /> Dashboard
            </Link>
            <Link to="/silly" className="app-nav-link">
              <Newspaper size={20} /> Silly Season
            </Link>
            <Link to="/matchcenter" className="app-nav-link">
              <Activity size={20} /> Matchcenter
            </Link>
            <Link to="/standings" className="app-nav-link app-nav-link-muted">
              <Calendar size={20} /> Spelschema
            </Link>
            <Link to="/roster" className="app-nav-link app-nav-link-muted">
              <Users size={20} /> Truppen
            </Link>
            <Link to="/history" className="app-nav-link app-nav-link-muted">
              <History size={20} /> Historik
            </Link>
          </nav>

          <div className="app-sponsor">
            <p className="app-sponsor-caption">Presenteras av</p>
            <div className="app-sponsor-name">LOKAL SPONSOR</div>
          </div>
        </aside>

        <main className="app-main">
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
