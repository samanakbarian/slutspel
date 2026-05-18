import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

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
}

function num(v: number | undefined | null): number {
  return typeof v === 'number' && !isNaN(v) ? v : 0;
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
  const isPos = !!delta && !delta.startsWith('-');
  return (
    <div className="signal-card" style={{ padding: '0.7rem', borderLeftColor: color }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', color }}>{value}</div>
      {delta && <div style={{ fontSize: '0.7rem', color: isPos ? 'var(--impact-positive)' : 'var(--impact-negative)', marginTop: '0.15rem' }}>{isPos ? '↑' : '↓'} {delta}</div>}
    </div>
  );
}

function HealthMeter({ score }: { score: number }) {
  const labels = ['', 'Kritisk', 'Svag', 'Stabil', 'Stark', 'Utmärkt'];
  return (
    <div className="signal-card signal-card-primary" style={{ textAlign: 'center', padding: '1rem' }}>
      <p className="card-kicker">Ekonomiskt hälsobetyg</p>
      <div style={{ fontSize: '2rem', margin: '0.4rem 0' }}>{'🍃'.repeat(score)}{'🍂'.repeat(5 - score)}</div>
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
        <div style={{ height: '100%', width: `${pct}%`, background: passes ? 'linear-gradient(90deg, var(--impact-positive), var(--brand-gold))' : 'linear-gradient(90deg, var(--impact-negative), var(--impact-warning))', borderRadius: '999px', transition: 'width 0.6s ease' }} />
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
        let hasApiData = false;
        const apiRes = await fetch(`${API_URL}/api/v1/financials`, { cache: 'no-store' }).catch(() => null);
        if (apiRes?.ok) {
          const apiJson = await apiRes.json();
          const apiItems: FinancialYear[] = Array.isArray(apiJson?.items) ? apiJson.items : [];
          const validYears = apiItems.filter((y) => y?.financial_year && y?.entity);
          if (validYears.length > 0) {
            const model = {
              years: validYears,
              shl_requirements: { min_equity_shl: 10000000, min_equity_ha: 3000000 },
              metadata: { source: String(apiJson?.table || 'api_v1_financials'), last_updated: new Date().toISOString().slice(0, 10) },
            };
            setRaw(model);
            const periods = [...new Set<string>(model.years.map((y) => y.financial_year))].sort().reverse();
            setSelectedPeriod(periods[0] || '');
            hasApiData = true;
          }
        }

        const [rawRes, aiRes] = await Promise.all([
          fetch('/data/financials/bjorkloven_financials_raw.json', { cache: 'no-store' }),
          fetch('/data/financials/bjorkloven_financials_ai.json', { cache: 'no-store' }).catch(() => null),
        ]);

        if (rawRes.ok && !hasApiData) {
          const rawData = await rawRes.json();
          setRaw(rawData);
          const periods = [...new Set<string>(rawData.years.map((y: FinancialYear) => y.financial_year))].sort().reverse();
          setSelectedPeriod(periods[0] || '');
        }

        if (aiRes?.ok) {
          const aiJson = await aiRes.json();
          setAiData(aiJson.periods || {});
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) return <div className="page animate-fade-up"><section className="signal-card"><p className="card-kicker">Ekonomi</p><h2 className="card-title">Laddar ekonomisk data...</h2></section></div>;
  if (!raw || !raw.years.length) return <div className="page animate-fade-up"><section className="signal-card signal-card-critical"><p className="card-kicker">Ekonomi</p><h2 className="card-title">Ingen ekonomisk data tillgänglig</h2></section></div>;

  const periods = [...new Set(raw.years.map((y) => y.financial_year))].sort().reverse();
  const getEntity = (period: string) => raw.years.find((y) => y.financial_year === period && y.entity === 'bjorkloven_ab');
  const getGroup = (period: string) => raw.years.find((y) => y.financial_year === period && y.entity === 'if_bjorkloven_koncern');

  const curr = getEntity(selectedPeriod);
  const currG = getGroup(selectedPeriod);
  const prevPeriod = periods[periods.indexOf(selectedPeriod) + 1];
  const prev = prevPeriod ? getEntity(prevPeriod) : null;
  const prevG = prevPeriod ? getGroup(prevPeriod) : null;
  const shl = raw.shl_requirements || { min_equity_shl: 10000000, min_equity_ha: 3000000 };

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

  const history = periods.slice().reverse().map((period) => {
    const e = getEntity(period);
    const g = getGroup(period);
    const rev = num(e?.revenue_total);
    const op = num(e?.operating_result);
    const eq = num(g?.equity);
    return {
      period,
      revenueM: Number((rev / 1000000).toFixed(2)),
      opM: Number((op / 1000000).toFixed(2)),
      cashM: Number((num(g?.cash) / 1000000).toFixed(2)),
      marginPct: rev > 0 ? Number(((op / rev) * 100).toFixed(1)) : 0,
      equityRatioPct: rev > 0 ? Number(((eq / rev) * 100).toFixed(1)) : 0,
    };
  });

  const monthlyBurn = Math.max(0, -num(curr?.operating_result) / 12);
  const runwayMonths = monthlyBurn > 0 ? Math.floor(num(currG?.cash) / monthlyBurn) : null;
  const targetDate = runwayMonths != null ? new Date(Date.now() + runwayMonths * 30 * 24 * 3600 * 1000) : null;
  const yearlyGapCloseRate = prevG && currG ? Math.max(0, num(currG.equity) - num(prevG.equity)) : 0;
  const yearsToShl = shlGap > 0 && yearlyGapCloseRate > 0 ? (shlGap / yearlyGapCloseRate) : null;

  const aiPeriod = aiData[selectedPeriod] || null;

  return (
    <div className="page animate-fade-up">
      <section className="signal-card" style={{ padding: '0.7rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="card-kicker">Ekonomisk intelligens</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Bokslut {selectedPeriod} • {curr?.entity_label || 'A-lag'}</p>
          </div>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={{ padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 700 }}>
            {periods.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </section>

      <HealthMeter score={healthScore} />

      <section className="signal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <KPICard label="Omsättning (A-lag)" value={formatSEK(curr?.revenue_total ?? null)} delta={revYoY != null ? formatPct(revYoY) : undefined} color="var(--impact-positive)" />
        <KPICard label="Rörelseresultat" value={formatSEK(curr?.operating_result ?? null)} delta={resultYoY != null ? formatPct(resultYoY) : undefined} color="var(--impact-neutral)" />
        <KPICard label="Eget kapital (A-lag)" value={formatSEK(curr?.equity ?? null)} color="var(--brand-gold)" />
        <KPICard label="Kassa (koncern)" value={formatSEK(currG?.cash ?? null)} delta={cashYoY != null ? formatPct(cashYoY) : undefined} color="#a78bfa" />
      </section>

      <section className="signal-card" style={{ padding: '0.9rem' }}>
        <p className="card-kicker">SHL-mätaren</p>
        <div style={{ marginTop: '0.5rem' }}>
          <ShlMeter label="Eget kapital (koncern)" current={currG?.equity ?? 0} threshold={shl.min_equity_shl} passes={(currG?.equity ?? 0) >= shl.min_equity_shl} />
          <ShlMeter label="Eget kapital (A-lag)" current={curr?.equity ?? 0} threshold={shl.min_equity_ha} passes={(curr?.equity ?? 0) >= shl.min_equity_ha} />
        </div>
        {shlGap > 0 && <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(251,191,36,0.08)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--impact-warning)' }}><strong>Gap-analys:</strong> Saknar {formatSEK(shlGap)} i eget kapital för uppskattad SHL-nivå.</div>}
      </section>

      <section className="signal-card" style={{ padding: '0.9rem' }}>
        <p className="card-kicker">Finansiell cockpit</p>
        <div style={{ height: 290, marginTop: '0.4rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'rgba(16,24,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(value: any, name: any) => [`${value} MSEK`, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="revenueM" name="Omsättning" fill="rgba(66,216,131,0.55)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="opM" name="Rörelseresultat" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="cashM" name="Kassa" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="signal-card" style={{ padding: '0.9rem' }}>
        <p className="card-kicker">Lönsamhet och bärkraft</p>
        <div style={{ height: 250, marginTop: '0.4rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'rgba(16,24,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(value: any, name: any) => [`${value}%`, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="marginPct" name="Rörelsemarginal" stroke="#38bdf8" fill="url(#marginGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="equityRatioPct" name="Soliditet vs omsättning" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="signal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <section className="signal-card" style={{ padding: '0.9rem' }}>
          <p className="card-kicker">Likviditets-runway</p>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--brand-gold)', fontFamily: 'var(--font-display)' }}>{runwayMonths == null ? 'Stabil' : `${runwayMonths} mån`}</div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{runwayMonths == null ? 'Nuvarande resultat antyder ingen negativ burn-rate.' : `Vid nuvarande burn-rate räcker kassan ungefär till ${targetDate?.toLocaleDateString('sv-SE')}.`}</p>
        </section>
        <section className="signal-card" style={{ padding: '0.9rem' }}>
          <p className="card-kicker">SHL-gap takt</p>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--impact-neutral)', fontFamily: 'var(--font-display)' }}>{yearsToShl == null ? 'Ingen prognos' : `${yearsToShl.toFixed(1)} år`}</div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{yearsToShl == null ? 'Behöver positiv årlig kapitalökning för att stänga gapet.' : `Om kapitalökningen fortsätter i samma takt stängs SHL-gapet på cirka ${yearsToShl.toFixed(1)} år.`}</p>
        </section>
      </section>

      {aiPeriod && (
        <section className="signal-card" style={{ padding: '0.9rem', borderLeftColor: 'var(--impact-neutral)' }}>
          <p className="card-kicker">AI-kommentar — {selectedPeriod}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.5rem' }}>{aiPeriod.summary}</p>
        </section>
      )}

      {!aiPeriod && (
        <section className="signal-card" style={{ padding: '0.9rem' }}>
          <p className="card-kicker">AI-analys</p>
          <p className="card-text">Ingen förberäknad AI-analys för {selectedPeriod}. Grundanalys visas ovan.</p>
        </section>
      )}

      <div style={{ textAlign: 'center', padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.6rem' }}>
        Data från årsredovisningar • AI-analysen är förberäknad (ingen runtime-kostnad)
      </div>
    </div>
  );
}
