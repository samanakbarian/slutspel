// ============================================================
// EKONOMISK INTELLIGENS - BJORKLOVEN
// ============================================================

const { useEffect: useFinancialEffect, useState: useFinancialState } = React;
const financialH = React.createElement;
const {
    ResponsiveContainer: FinancialResponsiveContainer,
    LineChart: FinancialLineChart,
    Line: FinancialLine,
    XAxis: FinancialXAxis,
    YAxis: FinancialYAxis,
    CartesianGrid: FinancialCartesianGrid,
    Tooltip: FinancialTooltip,
    Legend: FinancialLegend,
    RadarChart: FinancialRadarChart,
    Radar: FinancialRadar,
    PolarGrid: FinancialPolarGrid,
    PolarAngleAxis: FinancialPolarAngleAxis,
    PolarRadiusAxis: FinancialPolarRadiusAxis
} = Recharts;

const FINANCIALS_JSON_PATH = 'data/financials/bjorkloven_financials_raw.json';
const FINANCIAL_AI_STATIC_PATH = 'data/financials/bjorkloven_financials_ai.json';

const FALLBACK_RAW = {
    metadata: {
        description: 'IF Björklöven - Ekonomisk data (lokal fallback)',
        source: 'Björklöven bokslutskommuniké (lokal fallback)',
        last_updated: '2026-05-03',
        notes: 'Fallback-data används när JSON-filen inte kan laddas.'
    },
    years: [
        { financial_year: '2022/2023', entity: 'bjorkloven_ab', entity_label: 'Björklöven AB (A-lag herr)', revenue_total: 57300000, operating_result: 2300000, equity: 5700000, notes: '' },
        { financial_year: '2022/2023', entity: 'if_bjorkloven_koncern', entity_label: 'IF Björklöven (koncern)', revenue_total: 71500000, result_after_tax: 100000, equity: 13900000, cash: 10100000, notes: '' },
        { financial_year: '2021/2022', entity: 'bjorkloven_ab', entity_label: 'Björklöven AB (A-lag herr)', revenue_total: 49100000, operating_result: 900000, equity: 3400000, notes: '' },
        { financial_year: '2021/2022', entity: 'if_bjorkloven_koncern', entity_label: 'IF Björklöven (koncern)', revenue_total: 69800000, result_after_tax: 8700000, equity: 13800000, cash: 7300000, notes: '' }
    ],
    shl_requirements: { min_equity_shl: 10000000, min_equity_ha: 3000000, notes: 'Offentligt uppskattade licensnivåer.' }
};

const FALLBACK_AI_RAW = {
    metadata: {
        description: 'Förberäknad ekonomisk analys saknas i fallback-läget.',
        mode: 'none'
    },
    periods: {}
};

function calcYoY(current, previous) {
    if (current == null || previous == null || previous === 0) return null;
    return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

function formatSEK(val) {
    if (val == null || Number.isNaN(Number(val))) return '-';
    if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + ' MSEK';
    if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + ' TSEK';
    return val + ' SEK';
}

function formatPct(val) {
    if (val == null || Number.isNaN(Number(val))) return '-';
    return `${val >= 0 ? '+' : ''}${Number(val).toFixed(1)}%`;
}

function getDataUrl(relativePath) {
    return new URL(relativePath, document.baseURI).toString();
}

function mapRecord(record) {
    if (!record) return null;
    return {
        year: record.financial_year,
        entity: record.entity_label,
        revenue: record.revenue_total ?? null,
        operatingResult: record.operating_result ?? null,
        resultAfterTax: record.result_after_tax ?? null,
        equity: record.equity ?? null,
        cash: record.cash ?? null,
        notes: record.notes || '',
        sourceUrl: record.source_url || '',
        sourcePublishedAt: record.source_published_at || null,
        verificationStatus: record.verification_status || ''
    };
}

function sortPeriodsDesc(periods) {
    return [...periods].sort((a, b) => Number(b.split('/')[0]) - Number(a.split('/')[0]));
}

function normalizeFinancials(raw) {
    const rows = Array.isArray(raw?.years) ? raw.years : [];
    const byPeriod = {};
    rows.forEach((row) => {
        if (!byPeriod[row.financial_year]) byPeriod[row.financial_year] = {};
        if (row.entity === 'bjorkloven_ab') byPeriod[row.financial_year].entity = mapRecord(row);
        if (row.entity === 'if_bjorkloven_koncern') byPeriod[row.financial_year].group = mapRecord(row);
    });
    const periods = sortPeriodsDesc(Object.keys(byPeriod).filter((period) => byPeriod[period].entity && byPeriod[period].group));
    if (!periods.length) throw new Error('Financial JSON saknar giltiga perioder.');

    const snapshots = periods.map((period, index) => {
        const prev = periods[index + 1] || null;
        return {
            period,
            current: byPeriod[period].entity,
            previous: prev ? byPeriod[prev].entity : null,
            koncern: byPeriod[period].group,
            koncernPrev: prev ? byPeriod[prev].group : null
        };
    });

    return {
        metadata: {
            source: raw?.metadata?.source || 'Okänd källa',
            last_updated: raw?.metadata?.last_updated || null,
            notes: raw?.metadata?.notes || '',
            description: raw?.metadata?.description || ''
        },
        periods,
        snapshots,
        shlRequirements: {
            minEquity: raw?.shl_requirements?.min_equity_shl ?? FALLBACK_RAW.shl_requirements.min_equity_shl,
            minEquityHA: raw?.shl_requirements?.min_equity_ha ?? FALLBACK_RAW.shl_requirements.min_equity_ha,
            notes: raw?.shl_requirements?.notes || ''
        }
    };
}

function getSnapshot(financials, period) {
    return financials.snapshots.find((snapshot) => snapshot.period === period) || financials.snapshots[0];
}

function normalizeAiArchive(raw) {
    const periods = raw && typeof raw === 'object' && raw.periods && typeof raw.periods === 'object' ? raw.periods : {};
    const normalizedPeriods = {};
    Object.keys(periods).forEach((period) => {
        const safe = sanitizeAiResponse(periods[period]);
        if (safe) normalizedPeriods[period] = safe;
    });
    return {
        metadata: {
            description: raw?.metadata?.description || '',
            generated_at: raw?.metadata?.generated_at || null,
            mode: raw?.metadata?.mode || 'static'
        },
        periods: normalizedPeriods
    };
}

function buildTrendRows(financials) {
    return financials.snapshots.map((snapshot) => ({
        period: snapshot.period,
        revenue: snapshot.current.revenue,
        operatingResult: snapshot.current.operatingResult,
        cash: snapshot.koncern.cash,
        groupEquity: snapshot.koncern.equity,
        revenueYoY: calcYoY(snapshot.current.revenue, snapshot.previous?.revenue),
        resultYoY: calcYoY(snapshot.current.operatingResult, snapshot.previous?.operatingResult),
        cashYoY: calcYoY(snapshot.koncern.cash, snapshot.koncernPrev?.cash)
    })).reverse();
}

function computeProjection(financials, latest, shlRequirements) {
    if (!latest || financials.snapshots.length < 2) return null;
    const nextStart = Number(latest.period.split('/')[1]);
    const nextPeriod = `${nextStart}/${nextStart + 1}`;
    const averageDelta = (picker) => {
        const deltas = [];
        financials.snapshots.forEach((snapshot) => {
            const current = picker(snapshot);
            const prev = snapshot.previous && snapshot.koncernPrev
                ? picker({
                    current: snapshot.previous,
                    koncern: snapshot.koncernPrev
                })
                : null;
            if (current != null && prev != null) deltas.push(current - prev);
        });
        if (!deltas.length) return null;
        return deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
    };
    const project = (current, delta) => (current == null || delta == null ? null : Math.round(current + delta));
    const revenueDelta = averageDelta((snapshot) => snapshot.current.revenue);
    const operatingDelta = averageDelta((snapshot) => snapshot.current.operatingResult);
    const cashDelta = averageDelta((snapshot) => snapshot.koncern.cash);
    const equityDelta = averageDelta((snapshot) => snapshot.koncern.equity);
    const groupEquity = project(latest.koncern.equity, equityDelta);
    return {
        period: nextPeriod,
        revenue: project(latest.current.revenue, revenueDelta),
        operatingResult: project(latest.current.operatingResult, operatingDelta),
        cash: project(latest.koncern.cash, cashDelta),
        groupEquity,
        shlGap: groupEquity == null ? null : shlRequirements.minEquity - groupEquity,
        confidence: `Lag till medel - enkel trendlinje baserad pa ${financials.snapshots.length} bokslutsar.`
    };
}

function buildProjectionScenarios(financials, latest, shlRequirements) {
    const base = computeProjection(financials, latest, shlRequirements);
    if (!base) return null;
    const scale = (value, factor) => (value == null ? null : Math.round(value * factor));
    const withGap = (equity) => (equity == null ? null : shlRequirements.minEquity - equity);
    return {
        cautious: {
            label: 'Pressad',
            revenue: scale(base.revenue, 0.96),
            operatingResult: scale(base.operatingResult, 0.7),
            cash: scale(base.cash, 0.8),
            groupEquity: scale(base.groupEquity, 0.9)
        },
        base: {
            label: 'Bas',
            revenue: base.revenue,
            operatingResult: base.operatingResult,
            cash: base.cash,
            groupEquity: base.groupEquity
        },
        optimistic: {
            label: 'Optimistisk',
            revenue: scale(base.revenue, 1.05),
            operatingResult: scale(base.operatingResult, 1.25),
            cash: scale(base.cash, 1.2),
            groupEquity: scale(base.groupEquity, 1.08)
        },
        period: base.period,
        confidence: base.confidence,
        shlGapBase: withGap(base.groupEquity)
    };
}

function sanitizeAiResponse(parsed) {
    if (!parsed || typeof parsed !== 'object' || typeof parsed.summary !== 'string') return null;
    const asStringArray = (value) => Array.isArray(value)
        ? value.filter((item) => typeof item === 'string' && item.trim()).slice(0, 6)
        : [];
    const asOptionalString = (value) => typeof value === 'string' && value.trim() ? value : '';
    const scenarioAnalysis = Array.isArray(parsed.scenario_analysis)
        ? parsed.scenario_analysis
            .filter((item) => item && typeof item === 'object')
            .map((item) => ({
                label: asOptionalString(item.label) || 'Scenario',
                analysis: asOptionalString(item.analysis)
            }))
            .filter((item) => item.analysis)
            .slice(0, 3)
        : [];
    const riskRadar = parsed.risk_radar && typeof parsed.risk_radar === 'object'
        ? {
            axes: Array.isArray(parsed.risk_radar.axes)
                ? parsed.risk_radar.axes
                    .filter((item) => item && typeof item === 'object')
                    .map((item) => ({
                        label: asOptionalString(item.label),
                        score: Math.max(0, Math.min(100, Number(item.score) || 0)),
                        detail: asOptionalString(item.detail)
                    }))
                    .filter((item) => item.label)
                    .slice(0, 5)
                : [],
            highest_risk_label: asOptionalString(parsed.risk_radar.highest_risk_label),
            warning: asOptionalString(parsed.risk_radar.warning)
        }
        : null;

    return {
        summary: parsed.summary,
        key_drivers: asOptionalString(parsed.key_drivers),
        team_vs_group: asOptionalString(parsed.team_vs_group),
        trend_breaks: asOptionalString(parsed.trend_breaks),
        shl_economy_focus: asOptionalString(parsed.shl_economy_focus),
        bull_points: asStringArray(parsed.bull_points),
        risk_points: asStringArray(parsed.risk_points),
        recommendations: asStringArray(parsed.recommendations),
        scenario_analysis: scenarioAnalysis,
        risk_radar: riskRadar
    };
}

function generateInsights(snapshot, shlRequirements, projection) {
    const insights = [];
    const recommendations = [];
    const d = snapshot.current;
    const p = snapshot.previous || {};
    const k = snapshot.koncern;
    const kp = snapshot.koncernPrev || {};
    const revGrowth = calcYoY(d.revenue, p.revenue);
    const resultGrowth = calcYoY(d.operatingResult, p.operatingResult);
    const groupRevenueGrowth = calcYoY(k.revenue, kp.revenue);
    const cashGrowth = calcYoY(k.cash, kp.cash);
    const groupDrop = calcYoY(k.resultAfterTax, kp.resultAfterTax);
    const shlGap = shlRequirements.minEquity - (k.equity ?? 0);
    const haGap = (d.equity ?? 0) - shlRequirements.minEquityHA;

    if (revGrowth != null) insights.push({ type: revGrowth >= 10 ? 'positive' : 'neutral', icon: '📈', text: `Omsättningen i A-laget är ${formatSEK(d.revenue)} och förändrades ${formatPct(revGrowth)} mot ${p.year || 'föregående år'}.` });
    if (d.operatingResult != null) insights.push({ type: d.operatingResult > 0 ? 'positive' : 'warning', icon: d.operatingResult > 0 ? '✅' : '⚠️', text: `Rörelseresultatet i A-laget är ${formatSEK(d.operatingResult)}${resultGrowth != null ? ` (${formatPct(resultGrowth)} mot föregående år).` : '.'}` });
    if (groupRevenueGrowth != null) insights.push({ type: groupRevenueGrowth >= 0 ? 'positive' : 'neutral', icon: '🏟️', text: `Koncernens omsättning är ${formatSEK(k.revenue)} (${formatPct(groupRevenueGrowth)} mot ${kp.year || 'föregående år'}).` });
    insights.push({ type: shlGap > 0 ? 'warning' : 'positive', icon: shlGap > 0 ? '🟡' : '🟢', text: shlGap > 0 ? `Koncernens egna kapital är ${formatSEK(k.equity)} och ligger ${formatSEK(shlGap)} under uppskattad SHL-nivå.` : `Koncernens egna kapital är ${formatSEK(k.equity)} och klarar uppskattad SHL-nivå.` });
    if (haGap >= 0) insights.push({ type: 'positive', icon: '🏒', text: `A-lagets egna kapital är ${formatSEK(d.equity)} och ligger ${formatSEK(haGap)} över uppskattad HA-nivå.` });
    if (k.cash != null) insights.push({ type: cashGrowth != null && cashGrowth >= 0 ? 'positive' : 'neutral', icon: '💰', text: `Kassan i koncernen är ${formatSEK(k.cash)}${cashGrowth != null ? ` (${formatPct(cashGrowth)} mot föregående år).` : '.'}` });
    if (groupDrop != null && groupDrop <= -50) insights.push({ type: 'warning', icon: '📉', text: `Koncernresultatet efter skatt föll kraftigt från ${formatSEK(kp.resultAfterTax)} till ${formatSEK(k.resultAfterTax)}.` });
    if (projection?.revenue != null) insights.push({ type: 'neutral', icon: '🔭', text: `Trendprojektionen pekar mot cirka ${formatSEK(projection.revenue)} i A-lagsomsättning för ${projection.period}.` });

    if (shlGap > 0) recommendations.push(`Stärk koncernens egna kapital med minst ${formatSEK(shlGap)} om SHL-spåret ska vara ekonomiskt robust.`);
    if (groupDrop != null && groupDrop <= -50) recommendations.push('Bryt ut kostnadsdrivare i moderföreningen och följ upp dam- och juniorverksamhet separat i kommunikationen.');
    if (revGrowth != null && revGrowth >= 10) recommendations.push('Säkra intäktstillväxten med mer återkommande sponsor- och partnerintäkter, inte bara matchdagseffekt.');
    if (projection?.shlGap != null && projection.shlGap > 0) recommendations.push(`Trendmässigt återstår ett teoretiskt gap på ${formatSEK(projection.shlGap)} till uppskattad SHL-nivå nästa bokslut.`);

    return { insights: insights.slice(0, 8), recommendations: recommendations.slice(0, 4) };
}

function calcHealthScore(snapshot, shlRequirements) {
    let score = 3;
    const d = snapshot.current;
    const k = snapshot.koncern;
    if ((d.operatingResult ?? -1) > 0) score += 0.5;
    if ((d.operatingResult ?? 0) > 1000000) score += 0.5;
    if ((k.cash ?? 0) > 5000000) score += 0.5;
    if ((k.equity ?? 0) >= shlRequirements.minEquity) score += 0.5;
    if ((k.resultAfterTax ?? 0) < 500000) score -= 0.5;
    if ((k.equity ?? 0) < shlRequirements.minEquity) score -= 0.5;
    return Math.max(1, Math.min(5, Math.round(score)));
}

function calcRunwayMonths(cash, annualRevenueProxy) {
    if (cash == null || annualRevenueProxy == null || annualRevenueProxy <= 0) return null;
    const monthlyBase = annualRevenueProxy / 12;
    if (monthlyBase <= 0) return null;
    return Number((cash / monthlyBase).toFixed(1));
}

function getLiquidityRisk(runwayMonths) {
    if (runwayMonths == null) return { label: 'Okänd', color: '#94a3b8' };
    if (runwayMonths < 1) return { label: 'Kritisk', color: '#f87171' };
    if (runwayMonths < 3) return { label: 'Hög', color: '#f59e0b' };
    if (runwayMonths < 6) return { label: 'Medel', color: '#fbbf24' };
    return { label: 'Låg', color: '#34d399' };
}

function calcShlEconomyReadiness(snapshot, shlRequirements) {
    const d = snapshot?.current || {};
    const k = snapshot?.koncern || {};
    const revenue = Number(k.revenue || d.revenue || 0);
    const equity = Number(k.equity || 0);
    const cash = Number(k.cash || 0);
    const operatingResult = Number(d.operatingResult || 0);
    const minEquity = Number(shlRequirements?.minEquity || 10000000);
    const runway = calcRunwayMonths(cash, revenue);

    const revenueScore = Math.max(0, Math.min(100, Math.round((revenue / 80000000) * 100)));
    const equityScore = Math.max(0, Math.min(100, Math.round((equity / minEquity) * 100)));
    const liquidityScore = Math.max(0, Math.min(100, Math.round(((runway || 0) / 6) * 100)));
    const resultScore = operatingResult >= 0 ? 70 : Math.max(0, 60 - Math.round(Math.abs(operatingResult) / 250000));
    const score = Math.round((revenueScore * 0.2) + (equityScore * 0.3) + (liquidityScore * 0.3) + (resultScore * 0.2));

    const blockers = [
        { key: 'likviditet', score: liquidityScore, text: 'För låg kassa på kort sikt.' },
        { key: 'eget_kapital', score: equityScore, text: 'För lågt eget kapital mot uppskattad SHL-nivå.' },
        { key: 'omsättning', score: revenueScore, text: 'Omsättningen är under typisk SHL-nivå.' },
        { key: 'resultat', score: resultScore, text: 'Resultatstabiliteten är för svag.' }
    ].sort((a, b) => a.score - b.score).slice(0, 3);

    return {
        score,
        label: score >= 70 ? 'Redo' : score >= 50 ? 'Nära men sårbar' : 'Ej redo',
        blockers,
        components: { revenueScore, equityScore, liquidityScore, resultScore }
    };
}

function computeScenarioSnapshot(snapshot, attendancePct, sponsorPct, salaryDeltaMsek) {
    const d = snapshot?.current || {};
    const k = snapshot?.koncern || {};
    const revenueBase = Number(d.revenue || 0);
    const resultBase = Number(d.operatingResult || 0);
    const cashBase = Number(k.cash || 0);
    const equityBase = Number(k.equity || 0);

    const revenueDelta = revenueBase * ((Number(attendancePct || 0) + Number(sponsorPct || 0)) / 100);
    const costDelta = Number(salaryDeltaMsek || 0) * 1000000;
    const operatingResult = Math.round(resultBase + revenueDelta - costDelta);
    const cash = Math.round(cashBase + (operatingResult * 0.35));
    const groupEquity = Math.round(equityBase + operatingResult);

    return {
        revenue: Math.round(revenueBase + revenueDelta),
        operatingResult,
        cash,
        groupEquity
    };
}

function FinancialDashboard() {
    const [financials, setFinancials] = useFinancialState(normalizeFinancials(FALLBACK_RAW));
    const [financialAi, setFinancialAi] = useFinancialState(normalizeAiArchive(FALLBACK_AI_RAW));
    const [selectedPeriod, setSelectedPeriod] = useFinancialState('2022/2023');
    const [status, setStatus] = useFinancialState('loading');
    const [loadError, setLoadError] = useFinancialState('');
    const [aiStatus, setAiStatus] = useFinancialState('idle');
    const [attendancePct, setAttendancePct] = useFinancialState(0);
    const [sponsorPct, setSponsorPct] = useFinancialState(0);
    const [salaryDeltaMsek, setSalaryDeltaMsek] = useFinancialState(0);

    useFinancialEffect(() => {
        let cancelled = false;
        async function loadFinancials() {
            setStatus('loading');
            setLoadError('');
            try {
                const res = await fetch(getDataUrl(FINANCIALS_JSON_PATH), { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const normalized = normalizeFinancials(await res.json());
                let aiArchive = normalizeAiArchive(FALLBACK_AI_RAW);
                let nextAiStatus = 'missing';
                try {
                    const aiRes = await fetch(getDataUrl(FINANCIAL_AI_STATIC_PATH), { cache: 'no-store' });
                    if (aiRes.ok) {
                        aiArchive = normalizeAiArchive(await aiRes.json());
                        nextAiStatus = Object.keys(aiArchive.periods).length ? 'ready' : 'missing';
                    }
                } catch {
                    nextAiStatus = 'missing';
                }
                if (!cancelled) {
                    setFinancials(normalized);
                    setFinancialAi(aiArchive);
                    setSelectedPeriod(normalized.periods[0]);
                    setStatus('ready');
                    setAiStatus(nextAiStatus);
                }
            } catch (err) {
                if (!cancelled) {
                    const fallback = normalizeFinancials(FALLBACK_RAW);
                    setFinancials(fallback);
                    setFinancialAi(normalizeAiArchive(FALLBACK_AI_RAW));
                    setSelectedPeriod(fallback.periods[0]);
                    setStatus('error');
                    setLoadError(err.message || 'Okant fel');
                    setAiStatus('missing');
                }
            }
        }
        loadFinancials();
        return () => { cancelled = true; };
    }, []);

    const snapshot = getSnapshot(financials, selectedPeriod);
    const latest = financials.snapshots[0];
    const trendRows = buildTrendRows(financials);
    const projection = computeProjection(financials, latest, financials.shlRequirements);
    const scenarios = buildProjectionScenarios(financials, latest, financials.shlRequirements);
    const analysis = generateInsights(snapshot, financials.shlRequirements, projection);
    const aiCommentary = financialAi.periods[snapshot.period] || null;
    const healthScore = calcHealthScore(snapshot, financials.shlRequirements);
    const d = snapshot.current;
    const p = snapshot.previous || {};
    const k = snapshot.koncern;
    const kp = snapshot.koncernPrev || {};
    const shl = financials.shlRequirements;
    const sourceText = financials.metadata?.source || 'Okand kalla';
    const lastUpdated = financials.metadata?.last_updated || 'okant datum';
    const revenueShare = d.revenue && k.revenue ? ((d.revenue / k.revenue) * 100).toFixed(1) : null;
    const cashToRevenue = k.cash && k.revenue ? ((k.cash / k.revenue) * 100).toFixed(1) : null;
    const runwayMonths = calcRunwayMonths(k.cash, k.revenue || d.revenue);
    const liquidityRisk = getLiquidityRisk(runwayMonths);
    const shlReadiness = calcShlEconomyReadiness(snapshot, financials.shlRequirements);
    const scenarioNow = computeScenarioSnapshot(snapshot, attendancePct, sponsorPct, salaryDeltaMsek);
    const scenarioShlGap = Math.max(0, (shl.minEquity || 0) - (scenarioNow.groupEquity || 0));
    const dataQuality = getDataQuality(snapshot);
    const turnaround = getTurnaroundRows(snapshot);

    return financialH('div', { className: 'financial-dashboard' },
        status === 'loading' && financialH('div', { className: 'card financial-status-card' },
            financialH('div', { className: 'financial-status-title' }, 'Laddar ekonomisk data...'),
            financialH('div', { className: 'financial-status-text' }, 'Bygger dashboard från lokal årsredovisnings-JSON.')
        ),
        status === 'error' && financialH('div', { className: 'card financial-status-card financial-status-warning' },
            financialH('div', { className: 'financial-status-title' }, 'JSON-data kunde inte laddas'),
            financialH('div', { className: 'financial-status-text' }, `Visar lokal reservdata i stället. Fel: ${loadError}`)
        ),

        financialH('div', { className: 'card', style: { borderLeft: '4px solid #d4a843' } },
            financialH('div', { className: 'financial-header-top' },
                financialH('div', null,
                    financialH('h2', { className: 'font-display', style: { color: '#d4a843', margin: 0 } }, '💰 Ekonomisk Intelligens'),
                    financialH('p', { style: { color: '#94a3b8', fontSize: 12, margin: '4px 0 0' } }, `Bokslut ${d.year} | ${d.entity}`),
                    financialH('p', { className: 'financial-meta-line' }, `Källa: ${sourceText} | Senast uppdaterad: ${lastUpdated}`),
                    financialH('div', { className: 'financial-provenance-row' },
                        financialH('span', { className: 'financial-provenance-badge' }, `Datakvalitet: ${dataQuality.label}`),
                        dataQuality.date && financialH('span', { className: 'financial-provenance-badge financial-provenance-muted' }, `Publicerad: ${dataQuality.date}`),
                        dataQuality.source && financialH('span', { className: 'financial-provenance-badge financial-provenance-muted' }, dataQuality.source)
                    )
                ),
                financialH('div', { style: { textAlign: 'center' } },
                    financialH('div', { style: { fontSize: 28 } }, '🍃'.repeat(healthScore) + '🍂'.repeat(5 - healthScore)),
                    financialH('div', { style: { fontSize: 11, color: '#94a3b8' } }, `Ekonomiskt hälsobetyg: ${healthScore}/5`)
                )
            ),
            financialH('div', { className: 'financial-controls' },
                financialH('div', { className: 'financial-control-group' },
                    financialH('label', { className: 'financial-control-label', htmlFor: 'financial-period' }, 'Visa period'),
                    financialH('select', { id: 'financial-period', className: 'financial-select', value: selectedPeriod, onChange: (e) => setSelectedPeriod(e.target.value) },
                        financials.periods.map((period) => financialH('option', { key: period, value: period }, period))
                    )
                ),
                financialH('div', { className: 'financial-period-badge' }, latest.period === snapshot.period ? 'Aktuell referensperiod' : 'Historisk referensperiod')
            )
        ),

        financialH('div', { className: 'financial-kpi-grid' },
            renderKPI('Omsättning (A-lag)', d.revenue, p.revenue, '#34d399'),
            renderKPI('Rörelseresultat', d.operatingResult, p.operatingResult, '#60a5fa'),
            renderKPI('Eget kapital (A-lag)', d.equity, p.equity, '#d4a843'),
            renderKPI('Kassa (koncern)', k.cash, kp.cash, '#a78bfa')
        ),

        financialH('div', { className: 'financial-kpi-grid financial-kpi-grid-secondary' },
            renderMetricCard('Omsättning (koncern)', formatSEK(k.revenue), formatPct(calcYoY(k.revenue, kp.revenue)), 'Koncernens topline'),
            renderMetricCard('Resultat efter skatt', formatSEK(k.resultAfterTax), formatPct(calcYoY(k.resultAfterTax, kp.resultAfterTax)), 'Koncernnivå'),
            renderMetricCard('A-lag av koncern', revenueShare == null ? '-' : `${revenueShare}%`, null, 'Andel av total omsättning'),
            renderMetricCard('Likviditet / oms.', cashToRevenue == null ? '-' : `${cashToRevenue}%`, null, 'Kassa som andel av koncernoms.')
        ),

        financialH('div', { className: 'card', style: { borderLeft: `4px solid ${liquidityRisk.color}` } },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: liquidityRisk.color, margin: 0 } }, 'Ekonomiskt nulÃ¤ge'),
                financialH('span', { className: 'financial-badge' }, `Likviditetsrisk: ${liquidityRisk.label}`)
            ),
            financialH('div', { className: 'financial-kpi-grid financial-kpi-grid-secondary' },
                renderMetricCard('Runway', runwayMonths == null ? '-' : `${runwayMonths} mÃ¥nader`, null, 'Kassa i relation till intÃ¤ktsnivÃ¥'),
                renderMetricCard('SHL-gap (EK koncern)', formatSEK(Math.max(0, shl.minEquity - (k.equity || 0))), null, 'Kvar till uppskattad SHL-nivÃ¥'),
                renderMetricCard('Trendpil', (calcYoY(d.revenue, p.revenue) || 0) >= 0 ? 'BÃ¤ttre' : 'SÃ¤mre', null, 'Mot fÃ¶regÃ¥ende Ã¥r'),
                renderMetricCard('Datakvalitet', dataQuality.label, null, dataQuality.source || '')
            ),
            financialH('p', { className: 'financial-footnote' }, `Kassa: ${formatSEK(k.cash)} | Runway: ${runwayMonths == null ? '-' : `${runwayMonths} mÃ¥nader`} | Risk: ${liquidityRisk.label}.`)
        ),

        financialH('div', { className: 'card', style: { borderLeft: '4px solid #22d3ee' } },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#22d3ee', margin: 0 } }, 'SHL-beredskap (Ekonomi)'),
                financialH('span', { className: 'financial-badge financial-badge-ai' }, `${shlReadiness.score}/100 â€” ${shlReadiness.label}`)
            ),
            financialH('div', { className: 'financial-kpi-grid financial-kpi-grid-secondary' },
                renderMetricCard('OmsÃ¤ttning', `${shlReadiness.components.revenueScore}/100`),
                renderMetricCard('Eget kapital', `${shlReadiness.components.equityScore}/100`),
                renderMetricCard('Likviditet', `${shlReadiness.components.liquidityScore}/100`),
                renderMetricCard('Resultatstabilitet', `${shlReadiness.components.resultScore}/100`)
            ),
            financialH('div', { className: 'financial-ai-followup' },
                financialH('div', { className: 'financial-followup-title' }, 'StÃ¶rsta blockerare'),
                financialH('ol', { className: 'financial-ai-recommendations' },
                    shlReadiness.blockers.map((item) => financialH('li', { key: item.key }, item.text))
                )
            )
        ),

        financialH('div', { className: 'card', style: { borderLeft: '4px solid #a78bfa' } },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#a78bfa', margin: 0 } }, 'Scenariomodul: Vad hÃ¤nder om...'),
                financialH('span', { className: 'financial-badge' }, snapshot.period)
            ),
            financialH('div', { className: 'financial-scenario-controls' },
                financialH('label', null, `PublikpÃ¥verkan: ${attendancePct >= 0 ? '+' : ''}${attendancePct}%`),
                financialH('input', { type: 'range', min: -20, max: 20, step: 1, value: attendancePct, onChange: (e) => setAttendancePct(Number(e.target.value)) }),
                financialH('label', null, `Sponsring: ${sponsorPct >= 0 ? '+' : ''}${sponsorPct}%`),
                financialH('input', { type: 'range', min: -20, max: 20, step: 1, value: sponsorPct, onChange: (e) => setSponsorPct(Number(e.target.value)) }),
                financialH('label', null, `Personalkostnad: ${salaryDeltaMsek >= 0 ? '+' : ''}${salaryDeltaMsek} MSEK`),
                financialH('input', { type: 'range', min: -10, max: 20, step: 1, value: salaryDeltaMsek, onChange: (e) => setSalaryDeltaMsek(Number(e.target.value)) })
            ),
            financialH('div', { className: 'financial-kpi-grid financial-kpi-grid-secondary' },
                renderMetricCard('Scenario omsÃ¤ttning', formatSEK(scenarioNow.revenue)),
                renderMetricCard('Scenario resultat', formatSEK(scenarioNow.operatingResult)),
                renderMetricCard('Scenario koncernkassa', formatSEK(scenarioNow.cash)),
                renderMetricCard('Scenario SHL-gap', formatSEK(scenarioShlGap))
            ),
            financialH('p', { className: 'financial-footnote' }, 'FÃ¶renklad simulering fÃ¶r riktning, inte en full bokslutsprognos.')
        ),

        financialH('div', { className: 'card' },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#d4a843', margin: 0 } }, '📌 Turnaround Tracker'),
                financialH('span', { className: 'financial-badge' }, 'År mot år')
            ),
            financialH('div', { className: 'financial-turnaround-grid' },
                turnaround.map((item) =>
                    financialH('div', { key: item.label, className: 'financial-turnaround-card' },
                        financialH('div', { className: 'financial-turnaround-label' }, item.label),
                        financialH('div', { className: 'financial-turnaround-values' },
                            financialH('span', null, item.current),
                            financialH('span', null, 'vs'),
                            financialH('span', null, item.previous)
                        ),
                        financialH('div', { className: `financial-turnaround-delta ${item.deltaClass}` }, item.deltaLabel)
                    )
                )
            )
        ),

        financialH('div', { className: 'card' },
            financialH('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 12 } }, '📊 SHL-mataren'),
            financialH('div', { className: 'shl-meter-container' },
                renderShlBar('Eget kapital (koncern)', k.equity, shl.minEquity, (k.equity ?? 0) >= shl.minEquity),
                renderShlBar('Eget kapital (A-lag)', d.equity, shl.minEquityHA, (d.equity ?? 0) >= shl.minEquityHA)
            ),
            (k.equity ?? 0) < shl.minEquity && financialH('div', { className: 'shl-gap-alert' },
                financialH('span', { style: { color: '#fbbf24', fontWeight: 700 } }, 'Gap-analys: '),
                financialH('span', { style: { color: '#e2e8f0' } }, `Saknar ${formatSEK(shl.minEquity - (k.equity ?? 0))} i eget kapital for uppskattad SHL-niva.`)
            ),
            shl.notes && financialH('div', { className: 'financial-footnote' }, shl.notes)
        ),

        financialH('div', { className: 'card' },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#d4a843', margin: 0 } }, 'Utveckling över tid'),
                financialH('span', { className: 'financial-badge' }, `${financials.periods.length} bokslutsperioder`)
            ),
            financialH('div', { className: 'financial-chart-wrap' },
                financialH(FinancialResponsiveContainer, { width: '100%', height: 280 },
                    financialH(FinancialLineChart, { data: trendRows },
                        financialH(FinancialCartesianGrid, { stroke: 'rgba(255,255,255,.06)', strokeDasharray: '3 3' }),
                        financialH(FinancialXAxis, { dataKey: 'period', stroke: '#94a3b8', tick: { fill: '#94a3b8', fontSize: 11 } }),
                        financialH(FinancialYAxis, { stroke: '#94a3b8', tick: { fill: '#94a3b8', fontSize: 11 }, tickFormatter: (val) => `${Math.round(val / 1000000)}M` }),
                        financialH(FinancialTooltip, {
                            contentStyle: { background: '#0f172a', border: '1px solid rgba(212,168,67,.2)', borderRadius: 8, color: '#e2e8f0' },
                            formatter: (value) => formatSEK(value)
                        }),
                        financialH(FinancialLegend, { wrapperStyle: { fontSize: 12 } }),
                        financialH(FinancialLine, { type: 'monotone', dataKey: 'revenue', name: 'A-lag oms.', stroke: '#34d399', strokeWidth: 3, dot: { r: 3 } }),
                        financialH(FinancialLine, { type: 'monotone', dataKey: 'cash', name: 'Koncernkassa', stroke: '#60a5fa', strokeWidth: 3, dot: { r: 3 } }),
                        financialH(FinancialLine, { type: 'monotone', dataKey: 'groupEquity', name: 'Koncern EK', stroke: '#d4a843', strokeWidth: 3, dot: { r: 3 } })
                    )
                )
            ),
            financialH('div', { className: 'financial-timeline' },
                trendRows.map((row) =>
                    financialH('div', { key: row.period, className: 'financial-timeline-row' },
                        financialH('div', { className: 'financial-timeline-period' }, row.period),
                        financialH('div', { className: 'financial-timeline-metrics' },
                            renderTimelineStat('A-lag oms.', formatSEK(row.revenue), row.revenueYoY),
                            renderTimelineStat('Rörelseres.', formatSEK(row.operatingResult), row.resultYoY),
                            renderTimelineStat('Koncernkassa', formatSEK(row.cash), row.cashYoY),
                            renderTimelineStat('Koncern EK', formatSEK(row.groupEquity), null)
                        )
                    )
                )
            )
        ),

        projection && financialH('div', { className: 'card', style: { borderLeft: '4px solid #38bdf8' } },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#38bdf8', margin: 0 } }, '🔭 Trendprojektion'),
                financialH('span', { className: 'financial-badge financial-badge-ai' }, 'Enkel modell')
            ),
            financialH('p', { className: 'financial-footnote', style: { marginTop: 8 } }, `Projektion för ${projection.period}. ${projection.confidence}`),
            financialH('div', { className: 'financial-kpi-grid financial-kpi-grid-secondary' },
                renderMetricCard('Proj. A-lagsoms.', formatSEK(projection.revenue), null, projection.period),
                renderMetricCard('Proj. rörelseres.', formatSEK(projection.operatingResult), null, projection.period),
                renderMetricCard('Proj. koncernkassa', formatSEK(projection.cash), null, projection.period),
                renderMetricCard('Proj. SHL-gap', projection.shlGap == null ? '-' : formatSEK(Math.max(projection.shlGap, 0)), null, projection.shlGap != null && projection.shlGap <= 0 ? 'Över uppskattad nivå' : 'Kvar till uppskattad nivå')
            )
        ),

        scenarios && financialH('div', { className: 'card' },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#d4a843', margin: 0 } }, 'Scenarier'),
                financialH('span', { className: 'financial-badge' }, scenarios.period)
            ),
            financialH('div', { className: 'financial-scenario-grid' },
                ['cautious', 'base', 'optimistic'].map((key) => {
                    const item = scenarios[key];
                    return financialH('div', { key, className: 'financial-scenario-card' },
                        financialH('div', { className: 'financial-followup-title' }, item.label),
                        financialH('div', { className: 'financial-scenario-line' }, `Omsättning: ${formatSEK(item.revenue)}`),
                        financialH('div', { className: 'financial-scenario-line' }, `Resultat: ${formatSEK(item.operatingResult)}`),
                        financialH('div', { className: 'financial-scenario-line' }, `Kassa: ${formatSEK(item.cash)}`),
                        financialH('div', { className: 'financial-scenario-line' }, `Koncern EK: ${formatSEK(item.groupEquity)}`)
                    );
                })
            )
        ),

        financialH('div', { className: 'card' },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#d4a843', margin: 0 } }, 'Analys'),
                financialH('span', { className: 'financial-badge' }, 'Regelbaserad fallback')
            ),
            financialH('p', { className: 'financial-footnote', style: { marginTop: 8 } }, 'Analysen bygger på nyckeltal, jämförelseår och enkel trendprojektion.'),
            financialH('div', { className: 'insights-list' },
                analysis.insights.map((ins, i) =>
                    financialH('div', { key: i, className: `insight-item insight-${ins.type || 'neutral'}` },
                        financialH('span', { className: 'insight-icon' }, ins.icon),
                        financialH('span', null, ins.text)
                    )
                )
            ),
            financialH('p', { className: 'financial-footnote', style: { marginTop: 10 } }, 'AI-delen är nu förberäknad per bokslutsperiod och laddas som statisk JSON, utan runtime-kostnad per besökare.')
        ),

        aiStatus === 'ready' && aiCommentary && financialH('div', { className: 'card', style: { borderLeft: '4px solid #60a5fa' } },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#60a5fa', margin: 0 } }, 'AI-kommentar'),
                financialH('span', { className: 'financial-badge financial-badge-ai' }, 'Förberäknad analys')
            ),
            financialH('p', { className: 'financial-ai-summary' }, aiCommentary.summary),
            renderRiskRadar(aiCommentary),
            renderAiNarrativeGrid(aiCommentary),
            renderAiScenarioSection(aiCommentary),
            renderShlAction(aiCommentary),
            Array.isArray(aiCommentary.bull_points) && aiCommentary.bull_points.length > 0 && financialH('div', { className: 'financial-ai-grid' },
                renderAiList('Styrkor', aiCommentary.bull_points, 'positive'),
                renderAiList('Risker', aiCommentary.risk_points || [], 'warning')
            )
        ),

        aiStatus === 'missing' && financialH('div', { className: 'card financial-status-card financial-status-subtle' },
            financialH('div', { className: 'financial-status-title' }, 'Ingen förberäknad AI-analys för vald period'),
            financialH('div', { className: 'financial-status-text' }, 'Basanalysen och nyckeltalen visas fortfarande, men den statiska AI-kommentaren saknas för just den här perioden.')
        ),

        analysis.recommendations.length > 0 && financialH('div', { className: 'card', style: { borderLeft: '4px solid #fbbf24' } },
            financialH('h3', { className: 'font-display', style: { color: '#fbbf24', marginBottom: 12 } }, 'Rekommendationer'),
            financialH('ol', { className: 'recommendations-list' }, analysis.recommendations.map((rec, i) => financialH('li', { key: i }, rec))),
            aiStatus === 'ready' && Array.isArray(aiCommentary?.recommendations) && aiCommentary.recommendations.length > 0 &&
                financialH('div', { className: 'financial-ai-followup' },
                    financialH('div', { className: 'financial-followup-title' }, 'AI-förslag'),
                    financialH('ul', { className: 'financial-ai-recommendations' }, aiCommentary.recommendations.map((rec, i) => financialH('li', { key: i }, rec)))
                )
        ),

        (d.notes || k.notes || financials.metadata?.notes) && financialH('div', { className: 'card' },
            financialH('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 12 } }, 'Kontext'),
            financialH('div', { className: 'financial-context-grid' },
                d.notes && renderContextCard('A-lag', d.notes),
                k.notes && renderContextCard('Koncern', k.notes),
                financials.metadata?.notes && renderContextCard('Metanotering', financials.metadata.notes)
            )
        ),

        financialH('div', { style: { textAlign: 'center', padding: 16, color: '#64748b', fontSize: 10 } },
            `Data från lokal JSON: ${FINANCIALS_JSON_PATH}. `,
            financialH('span', null, 'AI-analysen är förberäknad i statisk JSON för att undvika dyra runtime-anrop.')
        )
    );
}

function getDataQuality(snapshot) {
    const status = snapshot.current?.verificationStatus || '';
    const sourceUrl = snapshot.current?.sourceUrl || '';
    const published = snapshot.current?.sourcePublishedAt || null;
    if (status.includes('official_pdf')) return { label: 'Verifierad årsredovisning (PDF)', source: hostFromUrl(sourceUrl), date: published };
    if (status.includes('official_bjorkloven')) return { label: 'Officiell klubbkommuniké', source: hostFromUrl(sourceUrl), date: published };
    if (status.includes('verified_hitta')) return { label: 'Verifierad bolagskälla', source: hostFromUrl(sourceUrl), date: published };
    return { label: 'Kuraterad PoC-data', source: hostFromUrl(sourceUrl), date: published };
}

function getTurnaroundRows(snapshot) {
    const d = snapshot.current || {};
    const p = snapshot.previous || {};
    return [
        buildTurnaroundRow('A-lag omsättning', d.revenue, p.revenue),
        buildTurnaroundRow('Rörelseresultat', d.operatingResult, p.operatingResult),
        buildTurnaroundRow('A-lag eget kapital', d.equity, p.equity),
        buildTurnaroundRow('Koncernkassa', snapshot.koncern?.cash, snapshot.koncernPrev?.cash),
    ];
}

function buildTurnaroundRow(label, current, previous) {
    const delta = calcYoY(current, previous);
    const positive = delta != null && delta >= 0;
    return {
        label,
        current: formatSEK(current),
        previous: formatSEK(previous),
        deltaLabel: delta == null ? 'Ingen jämförelsedata' : `${positive ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}%`,
        deltaClass: delta == null ? 'neutral' : (positive ? 'positive' : 'negative')
    };
}

function hostFromUrl(url) {
    if (!url) return null;
    try {
        return new URL(url).hostname;
    } catch (_e) {
        return url;
    }
}

function renderContextCard(label, text) {
    return financialH('div', { className: 'financial-context-card' },
        financialH('div', { className: 'financial-context-label' }, label),
        financialH('div', { className: 'financial-context-text' }, text)
    );
}

function renderAiList(title, items, tone) {
    if (!Array.isArray(items) || !items.length) return null;
    return financialH('div', { className: `financial-ai-list financial-ai-${tone}` },
        financialH('div', { className: 'financial-followup-title' }, title),
        financialH('ul', null, items.map((item, index) => financialH('li', { key: index }, item)))
    );
}

function renderAiNarrativeGrid(aiCommentary) {
    const cards = [
        { title: 'Viktigaste drivare', text: aiCommentary.key_drivers },
        { title: 'A-lag vs koncern', text: aiCommentary.team_vs_group },
        { title: 'Trendbrott', text: aiCommentary.trend_breaks }
    ].filter((item) => typeof item.text === 'string' && item.text.trim());

    if (!cards.length) return null;

    return financialH('div', { className: 'financial-ai-grid financial-ai-narrative-grid' },
        cards.map((card) =>
            financialH('div', { key: card.title, className: 'financial-ai-panel' },
                financialH('div', { className: 'financial-followup-title' }, card.title),
                financialH('p', { className: 'financial-ai-panel-text' }, card.text)
            )
        )
    );
}

function renderRiskRadar(aiCommentary) {
    const radar = aiCommentary?.risk_radar;
    if (!radar || !Array.isArray(radar.axes) || !radar.axes.length) return null;
    const highlighted = radar.highest_risk_label || (radar.axes[0] && radar.axes[0].label) || '';
    const chartData = radar.axes.map((axis) => ({
        axis: axis.label,
        risk: axis.score,
        fullMark: 100
    }));

    return financialH('div', { className: 'financial-risk-radar' },
        financialH('div', { className: 'financial-section-head' },
            financialH('h4', { className: 'font-display', style: { color: '#f87171', margin: 0 } }, 'Risk-Radarn'),
            financialH('span', { className: 'financial-badge financial-badge-risk' }, 'AI:ns varningssystem')
        ),
        typeof radar.warning === 'string' && radar.warning && financialH('div', { className: 'financial-risk-warning' },
            financialH('span', { className: 'financial-risk-warning-icon' }, '!'),
            financialH('span', null, radar.warning)
        ),
        financialH('div', { className: 'financial-risk-layout' },
            financialH('div', { className: 'financial-risk-chart' },
                financialH(FinancialResponsiveContainer, { width: '100%', height: 320 },
                    financialH(FinancialRadarChart, { data: chartData, outerRadius: '72%' },
                        financialH(FinancialPolarGrid, { stroke: 'rgba(255,255,255,.12)' }),
                        financialH(FinancialPolarAngleAxis, { dataKey: 'axis', tick: { fill: '#cbd5e1', fontSize: 11 } }),
                        financialH(FinancialPolarRadiusAxis, { angle: 90, domain: [0, 100], tick: false, axisLine: false }),
                        financialH(FinancialRadar, {
                            name: 'Risk',
                            dataKey: 'risk',
                            stroke: '#f87171',
                            fill: 'rgba(248,113,113,.28)',
                            fillOpacity: 1
                        })
                    )
                )
            ),
            financialH('div', { className: 'financial-risk-list' },
                radar.axes.map((axis) =>
                    financialH('div', {
                        key: axis.label,
                        className: `financial-risk-item ${axis.label === highlighted ? 'is-critical' : ''}`
                    },
                        financialH('div', { className: 'financial-risk-item-top' },
                            financialH('span', { className: 'financial-risk-item-label' }, axis.label),
                            financialH('span', { className: 'financial-risk-item-score' }, `${axis.score}/100`)
                        ),
                        axis.label === highlighted && financialH('div', { className: 'financial-risk-critical' }, 'Hogst risk just nu'),
                        axis.detail && financialH('div', { className: 'financial-risk-item-detail' }, axis.detail)
                    )
                )
            )
        )
    );
}

function renderAiScenarioSection(aiCommentary) {
    if (!Array.isArray(aiCommentary?.scenario_analysis) || !aiCommentary.scenario_analysis.length) return null;
    return financialH('div', { className: 'financial-ai-scenario-section' },
        financialH('div', { className: 'financial-followup-title' }, 'AI-scenarier'),
        financialH('div', { className: 'financial-ai-scenario-grid' },
            aiCommentary.scenario_analysis.map((scenario, index) =>
                financialH('div', { key: `${scenario.label || 'scenario'}-${index}`, className: 'financial-ai-panel financial-ai-scenario-panel' },
                    financialH('div', { className: 'financial-ai-scenario-label' }, scenario.label || `Scenario ${index + 1}`),
                    financialH('p', { className: 'financial-ai-panel-text' }, scenario.analysis || '')
                )
            )
        )
    );
}

function renderShlAction(aiCommentary) {
    if (typeof aiCommentary?.shl_economy_focus !== 'string' || !aiCommentary.shl_economy_focus.trim()) return null;
    return financialH('div', { className: 'financial-ai-shl-focus' },
        financialH('div', { className: 'financial-followup-title' }, 'Vad måste förbättras för SHL-ekonomi'),
        financialH('p', { className: 'financial-ai-panel-text' }, aiCommentary.shl_economy_focus)
    );
}

function renderMetricCard(label, value, delta, sublabel) {
    return financialH('div', { className: 'financial-kpi-card financial-kpi-card-secondary' },
        financialH('div', { className: 'financial-metric-label' }, label),
        financialH('div', { className: 'financial-metric-value' }, value),
        delta != null && financialH('div', { className: `financial-metric-delta ${String(delta).startsWith('-') ? 'negative' : 'positive'}` }, delta),
        sublabel && financialH('div', { className: 'financial-metric-sublabel' }, sublabel)
    );
}

function renderTimelineStat(label, value, delta) {
    return financialH('div', { className: 'financial-timeline-stat' },
        financialH('div', { className: 'financial-timeline-label' }, label),
        financialH('div', { className: 'financial-timeline-value' }, value),
        delta != null && financialH('div', { className: `financial-timeline-delta ${delta >= 0 ? 'positive' : 'negative'}` }, formatPct(delta))
    );
}

function renderKPI(label, current, previous, color) {
    const yoy = calcYoY(current, previous);
    const isPositive = previous == null ? current >= 0 : current >= previous;
    return financialH('div', { className: 'financial-kpi-card' },
        financialH('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, label),
        financialH('div', { style: { fontSize: 22, fontWeight: 700, color, fontFamily: 'Outfit' } }, formatSEK(current)),
        financialH('div', { style: { fontSize: 11, color: isPositive ? '#34d399' : '#f87171', marginTop: 4 } },
            yoy == null ? 'Ingen jämförelsedata ännu' : `${isPositive ? '↑' : '↓'} ${Math.abs(yoy).toFixed(1)}% vs ${formatSEK(previous)}`
        )
    );
}

function renderShlBar(label, current, threshold, passes) {
    const safeCurrent = current ?? 0;
    const safeThreshold = threshold || 1;
    const pct = Math.min((safeCurrent / safeThreshold) * 100, 120);
    return financialH('div', { style: { marginBottom: 16 } },
        financialH('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 } },
            financialH('span', { style: { color: '#e2e8f0' } }, label),
            financialH('span', { style: { color: passes ? '#34d399' : '#fbbf24', fontWeight: 700 } }, `${formatSEK(safeCurrent)} / ${formatSEK(safeThreshold)} ${passes ? '🟢' : '🟡'}`)
        ),
        financialH('div', { style: { height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden', position: 'relative' } },
            financialH('div', { style: { height: '100%', width: Math.min(pct, 100) + '%', background: passes ? 'linear-gradient(90deg, #059669, #34d399)' : 'linear-gradient(90deg, #d97706, #fbbf24)', borderRadius: 4, transition: 'width 1.2s ease' } }),
            financialH('div', { style: { position: 'absolute', top: 0, bottom: 0, left: '100%', transform: 'translateX(-2px)', width: 2, background: '#ef4444' } })
        )
    );
}
