import { useEffect, useState } from 'react';

interface FinancialYear {
  financial_year: string;
  entity: string;
  entity_label: string;
  revenue_total: number;
  operating_result?: number;
  result_after_tax?: number;
  equity?: number;
  cash?: number;
  notes?: string;
}

interface AiPeriod {
  summary: string;
  key_drivers?: string;
  bull_points?: string[];
  risk_points?: string[];
  recommendations?: string[];
  shl_economy_focus?: string;
  risk_radar?: {
    axes: { label: string; score: number; detail?: string }[];
    highest_risk_label?: string;
    warning?: string;
  };
}

function formatSEK(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—';
  if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + ' MSEK';
  if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + ' TSEK';
  return val + ' SEK';
}

function calcYoY(curr: number | undefined, prev: number | undefined): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(1));
}

function formatPct(val: number | null): string {
  if (val == null) return '—';
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

function KPICard({ label, value, delta, color }: { label: string; value: string; delta?: string | null; color: string }) {
  const isPos = delta && !delta.startsWith('-');
  return (
    <div className="signal-card" style={{ padding: '0.7rem', borderLeftColor: color }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', color }}>{value}</div>
      {delta && <div style={{ fontSize: '0.7rem', color: isPos ? 'var(--impact-positive)' : 'var(--impact-negative)', marginTop: '0.15rem' }}>{isPos ? '↑' : '↓'} {delta}</div>}
    </div>
  );
}

function HealthMeter({ score }: { score: number }) {
  const leaves = '🍃'.repeat(score) + '🍂'.repeat(5 - score);
  const labels = ['', 'Kritisk', 'Svag', 'Stabil', 'Stark', 'Utmärkt'];
  return (
    <div className="signal-card signal-card-primary" style={{ textAlign: 'center', padding: '1rem' }}>
      <p className="card-kicker">Ekonomiskt hälsobetyg</p>
      <div style={{ fontSize: '2rem', margin: '0.4rem 0' }}>{leaves}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--brand-gold)' }}>{score}/5 — {labels[score]}</div>
    </div>
  );
}

function ShlMeter({ label, current, threshold, passes }: { label: string; current: number; threshold: number; passes: boolean }) {
  const pct = Math.min((current / threshold) * 100, 100);
  return (
    <div style={{ marginBottom: '0.7rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: passes ? 'var(--impact-positive)' : 'var(--impact-negative)', fontWeight: 700 }}>
          {formatSEK(current)} / {formatSEK(threshold)}
        </span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: passes ? 'linear-gradient(90deg, var(--impact-positive), var(--brand-gold))' : 'linear-gradient(90deg, var(--impact-negative), var(--impact-warning))',
          borderRadius: '999px',
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

export function EkonomiPage() {
  const [raw, setRaw] = useState<{ years: FinancialYear[]; shl_requirements: { min_equity_shl: number; min_equity_ha: number }; metadata: Record<string, string> } | null>(null);
  const [aiData, setAiData] = useState<Record<string, AiPeriod>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const rawPath = '/data/financials/bjorkloven_financials_raw.json';
        const aiPath = '/data/financials/bjorkloven_financials_ai.json';
        const [rawRes, aiRes] = await Promise.all([
          fetch(rawPath, { cache: 'no-store' }),
          fetch(aiPath, { cache: 'no-store' }).catch(() => null),
        ]);

        if (rawRes.ok) {
          const rawData = await rawRes.json();
          setRaw(rawData);
          // Find latest period
          const periods = [...new Set<string>(rawData.years.map((y: FinancialYear) => y.financial_year))].sort().reverse();
          setSelectedPeriod(periods[0] || '');
        }

        if (aiRes?.ok) {
          const aiJson = await aiRes.json();
          setAiData(aiJson.periods || {});
        }
      } catch (e) {
        console.error('Ekonomi load error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="page animate-fade-up">
        <section className="signal-card">
          <p className="card-kicker">Ekonomi</p>
          <h2 className="card-title">Laddar ekonomisk data...</h2>
        </section>
      </div>
    );
  }

  if (!raw || !raw.years.length) {
    return (
      <div className="page animate-fade-up">
        <section className="signal-card signal-card-critical">
          <p className="card-kicker">Ekonomi</p>
          <h2 className="card-title">Ingen ekonomisk data tillgänglig</h2>
        </section>
      </div>
    );
  }

  // Build period data
  const periods = [...new Set(raw.years.map(y => y.financial_year))].sort().reverse();
  const getEntity = (period: string) => raw.years.find(y => y.financial_year === period && y.entity === 'bjorkloven_ab');
  const getGroup = (period: string) => raw.years.find(y => y.financial_year === period && y.entity === 'if_bjorkloven_koncern');

  const curr = getEntity(selectedPeriod);
  const currG = getGroup(selectedPeriod);
  const prevPeriod = periods[periods.indexOf(selectedPeriod) + 1];
  const prev = prevPeriod ? getEntity(prevPeriod) : null;
  const prevG = prevPeriod ? getGroup(prevPeriod) : null;

  const shl = raw.shl_requirements || { min_equity_shl: 10000000, min_equity_ha: 3000000 };
  const aiPeriod = aiData[selectedPeriod] || null;

  // Health score
  let healthScore = 3;
  if ((curr?.operating_result ?? -1) > 0) healthScore += 0.5;
  if ((curr?.operating_result ?? 0) > 1000000) healthScore += 0.5;
  if ((currG?.cash ?? 0) > 5000000) healthScore += 0.5;
  if ((currG?.equity ?? 0) >= shl.min_equity_shl) healthScore += 0.5;
  if ((currG?.result_after_tax ?? 0) < 500000) healthScore -= 0.5;
  if ((currG?.equity ?? 0) < shl.min_equity_shl) healthScore -= 0.5;
  healthScore = Math.max(1, Math.min(5, Math.round(healthScore)));

  const revYoY = calcYoY(curr?.revenue_total, prev?.revenue_total);
  const resultYoY = calcYoY(curr?.operating_result, prev?.operating_result);
  const cashYoY = calcYoY(currG?.cash, prevG?.cash);
  const shlGap = shl.min_equity_shl - (currG?.equity ?? 0);

  return (
    <div className="page animate-fade-up">
      {/* Period selector */}
      <section className="signal-card" style={{ padding: '0.7rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="card-kicker">💰 Ekonomisk Intelligens</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Bokslut {selectedPeriod} • {curr?.entity_label || 'A-lag'}
            </p>
          </div>
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            style={{
              padding: '0.3rem 0.6rem',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </section>

      {/* Health + KPIs */}
      <HealthMeter score={healthScore} />

      <section className="signal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <KPICard label="Omsättning (A-lag)" value={formatSEK(curr?.revenue_total ?? null)} delta={revYoY != null ? formatPct(revYoY) : undefined} color="var(--impact-positive)" />
        <KPICard label="Rörelseresultat" value={formatSEK(curr?.operating_result ?? null)} delta={resultYoY != null ? formatPct(resultYoY) : undefined} color="var(--impact-neutral)" />
        <KPICard label="Eget kapital (A-lag)" value={formatSEK(curr?.equity ?? null)} color="var(--brand-gold)" />
        <KPICard label="Kassa (koncern)" value={formatSEK(currG?.cash ?? null)} delta={cashYoY != null ? formatPct(cashYoY) : undefined} color="#a78bfa" />
      </section>

      {/* SHL meter */}
      <section className="signal-card" style={{ padding: '0.9rem' }}>
        <p className="card-kicker">📊 SHL-mätaren</p>
        <div style={{ marginTop: '0.5rem' }}>
          <ShlMeter label="Eget kapital (koncern)" current={currG?.equity ?? 0} threshold={shl.min_equity_shl} passes={(currG?.equity ?? 0) >= shl.min_equity_shl} />
          <ShlMeter label="Eget kapital (A-lag)" current={curr?.equity ?? 0} threshold={shl.min_equity_ha} passes={(curr?.equity ?? 0) >= shl.min_equity_ha} />
        </div>
        {shlGap > 0 && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(251,191,36,0.08)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--impact-warning)' }}>
            <strong>Gap-analys:</strong> Saknar {formatSEK(shlGap)} i eget kapital för uppskattad SHL-nivå.
          </div>
        )}
      </section>

      {/* Trend */}
      <section className="signal-card" style={{ padding: '0.9rem' }}>
        <p className="card-kicker">📈 Utveckling över tid</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
          {periods.slice().reverse().map(period => {
            const e = getEntity(period);
            const g = getGroup(period);
            return (
              <div key={period} style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 1fr',
                gap: '0.5rem',
                padding: '0.45rem 0.5rem',
                background: period === selectedPeriod ? 'rgba(37,163,90,0.08)' : 'rgba(255,255,255,0.02)',
                border: period === selectedPeriod ? '1px solid rgba(66,216,131,0.3)' : '1px solid var(--glass-border)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
                onClick={() => setSelectedPeriod(period)}
              >
                <span style={{ fontWeight: 800, color: 'var(--brand-gold)' }}>{period}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Oms: {formatSEK(e?.revenue_total ?? null)}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Res: {formatSEK(e?.operating_result ?? null)}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Kassa: {formatSEK(g?.cash ?? null)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI analysis */}
      {aiPeriod && (
        <section className="signal-card" style={{ padding: '0.9rem', borderLeftColor: 'var(--impact-neutral)' }}>
          <p className="card-kicker">🤖 AI-kommentar — {selectedPeriod}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.5rem' }}>
            {aiPeriod.summary}
          </p>

          {aiPeriod.key_drivers && (
            <div style={{ marginTop: '0.7rem', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--brand-gold)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Viktigaste drivare</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{aiPeriod.key_drivers}</p>
            </div>
          )}

          {/* Risk radar */}
          {aiPeriod.risk_radar && aiPeriod.risk_radar.axes.length > 0 && (
            <div style={{ marginTop: '0.7rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--impact-negative)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Risk-Radarn</div>
              {aiPeriod.risk_radar.warning && (
                <div style={{ fontSize: '0.75rem', color: 'var(--impact-warning)', marginBottom: '0.4rem', padding: '0.4rem', background: 'rgba(255,194,71,0.06)', borderRadius: '6px' }}>
                  ⚠️ {aiPeriod.risk_radar.warning}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {aiPeriod.risk_radar.axes.map((axis, i) => (
                  <div key={i} style={{
                    padding: '0.45rem 0.55rem',
                    background: axis.label === aiPeriod.risk_radar?.highest_risk_label ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{axis.label}</span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: axis.score >= 70 ? 'var(--impact-negative)' : axis.score >= 40 ? 'var(--impact-warning)' : 'var(--impact-positive)',
                      }}>{axis.score}/100</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginTop: '0.25rem', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${axis.score}%`,
                        background: axis.score >= 70 ? 'var(--impact-negative)' : axis.score >= 40 ? 'var(--impact-warning)' : 'var(--impact-positive)',
                        borderRadius: '2px',
                      }} />
                    </div>
                    {axis.detail && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{axis.detail}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bull / Risk points */}
          {((aiPeriod.bull_points?.length ?? 0) > 0 || (aiPeriod.risk_points?.length ?? 0) > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.7rem' }}>
              {(aiPeriod.bull_points?.length ?? 0) > 0 && (
                <div style={{ padding: '0.5rem', background: 'rgba(37,192,109,0.06)', borderRadius: '8px', border: '1px solid rgba(37,192,109,0.2)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--impact-positive)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Styrkor</div>
                  {aiPeriod.bull_points?.map((p, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>+ {p}</div>
                  ))}
                </div>
              )}
              {(aiPeriod.risk_points?.length ?? 0) > 0 && (
                <div style={{ padding: '0.5rem', background: 'rgba(248,113,113,0.06)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--impact-negative)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Risker</div>
                  {aiPeriod.risk_points?.map((p, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>• {p}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SHL economy focus */}
          {aiPeriod.shl_economy_focus && (
            <div style={{ marginTop: '0.7rem', padding: '0.6rem', background: 'rgba(56,189,248,0.06)', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--impact-neutral)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Vad måste förbättras för SHL-ekonomi</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{aiPeriod.shl_economy_focus}</p>
            </div>
          )}

          {/* Recommendations */}
          {(aiPeriod.recommendations?.length ?? 0) > 0 && (
            <div style={{ marginTop: '0.7rem', padding: '0.6rem', background: 'rgba(251,191,36,0.06)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--impact-warning)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>AI-rekommendationer</div>
              {aiPeriod.recommendations?.map((r, i) => (
                <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{i + 1}. {r}</div>
              ))}
            </div>
          )}
        </section>
      )}

      {!aiPeriod && (
        <section className="signal-card" style={{ padding: '0.9rem' }}>
          <p className="card-kicker">🤖 AI-analys</p>
          <p className="card-text">Ingen förberäknad AI-analys för {selectedPeriod}. Grundanalys visas ovan.</p>
        </section>
      )}

      <div style={{ textAlign: 'center', padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.6rem' }}>
        Data från årsredovisningar • AI-analysen är förberäknad (ingen runtime-kostnad)
      </div>
    </div>
  );
}
