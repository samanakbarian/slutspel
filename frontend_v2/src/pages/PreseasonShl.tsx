import { Suspense, lazy } from 'react';

const AnalyticsTabs = lazy(() => import('../components/AnalyticsTabs'));

export function PreseasonShlPage() {
  return (
    <div className="page animate-fade-up">
      <section className="signal-card">
        <p className="card-kicker">Preseason SHL</p>
        <h2 className="card-title" style={{ marginBottom: 6 }}>Framåtblickande SHL-prognos</h2>
        <p className="card-text" style={{ marginBottom: 12 }}>
          Prognos, readiness och truppprofil inför SHL 2026/27.
        </p>
        <Suspense fallback={<p className="card-text">Laddar analysmodul...</p>}>
          <AnalyticsTabs season="ha_2526" mode="shl_only" />
        </Suspense>
      </section>
    </div>
  );
}
