import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AlertTriangle, CalendarDays, LineChart, MessageSquare, Newspaper, Users } from 'lucide-react';
import { Matcher } from './pages/Matcher';
import { Matchrapport } from './pages/Matchrapport';
import { Nyheter } from './pages/Nyheter';
import { Roster } from './pages/Roster';
import { Spelare } from './pages/Spelare';
import { XFeedPage } from './pages/XFeed';
import { StatisticsPage } from './pages/Statistics';
import { useLageStore } from './store/useLageStore';
import { Sidhuvud } from './lib/sidhuvud';

// De avpublicerade sidorna är de enda som använder Recharts. Laddas de lazy
// hamnar biblioteket i en egen chunk i stället för i huvudbundlen, som alla
// besökare betalar för.
const EkonomiPage = lazy(() => import('./pages/Ekonomi').then(m => ({ default: m.EkonomiPage })));
const PreseasonShlPage = lazy(() => import('./pages/PreseasonShl').then(m => ({ default: m.PreseasonShlPage })));
const MetodSida = lazy(() => import('./pages/Metod').then(m => ({ default: m.MetodSida })));

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

/**
 * Märket i sidhuvudet. En besökare läser "Uppdaterad 22:14" som "matchsiffrorna
 * är inne", så tiden ska komma från hockeydatat. Den kom tidigare från
 * nyhetsskörden, som går sin egen takt: på en matchkväll kunde märket lysa
 * grönt för att en rubrik hämtats, medan Swehockey-skörden aldrig gått igenom.
 * stats_updated_at är när serietabellen senast skrevs om. Saknas den faller vi
 * tillbaka på den gamla tiden i stället för att visa ingenting.
 */
function freshnessLabel(meta: {
  freshness_status?: string;
  source_updated_at?: string | null;
  stats_updated_at?: string | null;
} | undefined) {
  const updated = meta?.stats_updated_at ?? meta?.source_updated_at;
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

/**
 * Kontaktsidan.
 *
 * Var tidigare en Om-sida med tre kort: vad sajten är, varifrån siffrorna
 * kommer och hur man hör av sig. De två första förklarade sådant som antingen
 * står under Metod eller som ingen frågat efter.
 *
 * Raden om att det är ett fanprojekt står kvar. Den är inte utfyllnad: en sida
 * som använder klubbens namn och någon annans data ska säga att den inte är
 * officiell, och det stod annars bara i humans.txt.
 */
function OmSida() {
  return (
    <div className="page animate-fade-up">
      <section className="mc-card">
        <p className="mc-kicker">Kontakt</p>
        <p className="mc-text">
          Hittar du en siffra som är fel vill jag gärna veta.
        </p>
        <p className="mc-text" style={{ marginTop: 10 }}>
          <a href="mailto:saman.akbarian@gmail.com">Skicka e-post</a>
        </p>
        <p className="mc-note" style={{ marginTop: 14 }}>
          Fanprojekt utan koppling till IF Björklöven, SHL eller Swehockey.
          Siffrorna kommer från Swehockey Stats.
        </p>
      </section>
    </div>
  );
}

function App() {
  const { data, fetchLage } = useLageStore();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    void fetchLage();
  }, [fetchLage]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setCompact(window.scrollY > 60);
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const freshness = freshnessLabel(data?.meta);

  return (
    <Router>
      <div className="controlroom-shell">
        <header className={`topbar${compact ? ' topbar-compact' : ''}`}>
          {/* Sidnumret först, som på Text-TV: "377 SVT TEXT" står i den
              ordningen, och det är numret som bär igenkänningen. Lövenläget är
              vad sidan heter, 377 är var den finns. */}
          <div className="topbar-brand">
            <span className="topbar-sida" aria-label="Sida 377">377</span>
            <div>
              <p className="topbar-kicker">Lövenläget</p>
              <h1 className="topbar-title">SHL 26/27</h1>
            </div>
          </div>
          <div className={`freshness freshness-${freshness.tone}`}>
            {freshness.tone !== 'ok' && <AlertTriangle size={14} />}
            <span>{freshness.text}</span>
          </div>
        </header>

        {/* Sätter titel, beskrivning och canonical efter vilken vy som visas.
            Ligger innanför routern, för den läser sökvägen. */}
        <Sidhuvud />

        <main className="content-area">
          <Suspense fallback={<div className="page"><section className="mc-card"><p className="mc-kicker">Laddar</p></section></div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/matcher" replace />} />
            <Route path="/matcher" element={<Matcher />} />
            <Route path="/matcher/:gameId" element={<Matchrapport />} />
            <Route path="/statistik" element={<StatisticsPage />} />
            <Route path="/statistik/spelare/:name" element={<Spelare />} />
            <Route path="/trupp" element={<Roster />} />
            <Route path="/nyheter" element={<Nyheter />} />
            <Route path="/x" element={<XFeedPage />} />

            {/* Avpublicerade men fungerande rutter */}
            <Route path="/ekonomi" element={<EkonomiPage />} />
            <Route path="/preseason-shl" element={<PreseasonShlPage />} />
            <Route path="/om" element={<OmSida />} />
            {/* Uppslagsverk, inte destination: ligger utanför bottenmenyn och
                nås från noterna som använder måtten, plus sidfoten. */}
            <Route path="/metod" element={<MetodSida />} />

            {/* Gamla adresser */}
            <Route path="/silly" element={<Navigate to="/nyheter" replace />} />
            <Route path="/mer" element={<Navigate to="/om" replace />} />
            <Route path="*" element={<Navigate to="/matcher" replace />} />
          </Routes>
          </Suspense>

          <footer className="app-footer">
            <NavLink to="/om">Kontakt</NavLink>
            <span aria-hidden="true">·</span>
            <NavLink to="/metod">Metod</NavLink>
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
