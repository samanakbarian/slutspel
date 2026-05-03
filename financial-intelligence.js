// ============================================================
// EKONOMISK INTELLIGENS — BJÖRKLÖVEN
// ============================================================
// PoC: Visar riktig data från årsredovisning 2022/2023
// Källa: bjorkloven.com bokslutskommunikéer
// ============================================================

const FINANCIAL_DATA = {
    current: {
        year: '2022/2023',
        entity: 'Björklöven AB (A-lag)',
        revenue: 57_300_000,
        operatingResult: 2_300_000,
        equity: 5_700_000,
    },
    previous: {
        year: '2021/2022',
        revenue: 49_100_000,
        operatingResult: 900_000,
        equity: 3_400_000,
    },
    koncern: {
        year: '2022/2023',
        entity: 'IF Björklöven (koncern)',
        revenue: 71_500_000,
        resultAfterTax: 100_000,
        equity: 13_900_000,
        cash: 10_100_000,
    },
    koncernPrev: {
        year: '2021/2022',
        revenue: 69_800_000,
        resultAfterTax: 8_700_000,
        equity: 13_800_000,
        cash: 7_300_000,
    },
    shlRequirements: {
        minEquity: 10_000_000,
        minEquityHA: 3_000_000,
    }
};

// ===== BERÄKNINGAR =====
function calcYoY(current, previous) {
    if (!previous || previous === 0) return null;
    return ((current - previous) / Math.abs(previous) * 100).toFixed(1);
}

function formatSEK(val) {
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' MSEK';
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + ' TSEK';
    return val + ' SEK';
}

// ===== AI-ANALYS (beräknad lokalt, ej API-beroende) =====
function generateInsights(data) {
    const insights = [];
    const d = data.current;
    const p = data.previous;
    const k = data.koncern;
    const kp = data.koncernPrev;
    const shl = data.shlRequirements;

    // Intäktstillväxt
    const revGrowth = calcYoY(d.revenue, p.revenue);
    if (revGrowth > 10) {
        insights.push({ type: 'positive', icon: '📈', text: `Intäkterna växte med ${revGrowth}% (${formatSEK(p.revenue)} → ${formatSEK(d.revenue)}). Starkaste tillväxten sedan covid.` });
    }

    // Rörelseresultat
    const resultGrowth = calcYoY(d.operatingResult, p.operatingResult);
    if (d.operatingResult > 0) {
        insights.push({ type: 'positive', icon: '✅', text: `Positivt rörelseresultat: ${formatSEK(d.operatingResult)} (+${resultGrowth}%). Klubben går med vinst.` });
    }

    // Eget kapital vs SHL-krav
    const equityGap = shl.minEquity - k.equity;
    if (equityGap > 0) {
        insights.push({ type: 'warning', icon: '⚠️', text: `Koncernens eget kapital (${formatSEK(k.equity)}) ligger ${formatSEK(equityGap)} under SHL-kravet (${formatSEK(shl.minEquity)}). Måste stärkas inför SHL.` });
    } else {
        insights.push({ type: 'positive', icon: '🟢', text: `Koncernens eget kapital (${formatSEK(k.equity)}) klarar SHL-kravet (${formatSEK(shl.minEquity)}).` });
    }

    // Eget kapital vs HA-krav
    if (d.equity > shl.minEquityHA) {
        insights.push({ type: 'positive', icon: '🏒', text: `A-lagets eget kapital (${formatSEK(d.equity)}) ligger ${formatSEK(d.equity - shl.minEquityHA)} över HA-kravet. God marginal.` });
    }

    // Kassaflöde
    const cashGrowth = calcYoY(k.cash, kp.cash);
    if (cashGrowth > 0) {
        insights.push({ type: 'positive', icon: '💰', text: `Kassan stärktes med ${cashGrowth}% till ${formatSEK(k.cash)}. Bra likviditet.` });
    }

    // Koncernresultat-varning
    const koncernDrop = calcYoY(k.resultAfterTax, kp.resultAfterTax);
    if (koncernDrop < -50) {
        insights.push({ type: 'warning', icon: '📉', text: `Koncernresultatet sjönk kraftigt (${formatSEK(kp.resultAfterTax)} → ${formatSEK(k.resultAfterTax)}). Ökade kostnader i moderföreningen.` });
    }

    // AI-rekommendationer
    const recommendations = [];
    if (equityGap > 0) {
        recommendations.push(`Prioritera att stärka eget kapital med minst ${formatSEK(equityGap)} inför SHL-ansökan. Möjliga åtgärder: nyemission, sponsoravtal med engångsbelopp, eller försäljning av tillgångar.`);
    }
    if (koncernDrop < -50) {
        recommendations.push(`Moderföreningens kostnader för J20 och damlaget behöver ses över. En tydligare budgetfördelning mellan verksamheterna rekommenderas.`);
    }
    if (revGrowth > 10) {
        recommendations.push(`Intäktstillväxten är stark men beroende av slutspelsintäkter. Diversifiera med fleråriga sponsoravtal och digitala intäktsströmmar för att säkra basintäkter.`);
    }

    return { insights, recommendations };
}

// ===== HEALTH SCORE (1-5 löv) =====
function calcHealthScore(data) {
    let score = 3; // Bas
    const d = data.current;
    const k = data.koncern;
    const shl = data.shlRequirements;

    if (d.operatingResult > 0) score += 0.5;
    if (d.operatingResult > 1_000_000) score += 0.5;
    if (k.equity >= shl.minEquity) score += 0.5;
    if (k.cash > 5_000_000) score += 0.5;
    if (k.resultAfterTax < 500_000) score -= 0.5;
    if (k.equity < shl.minEquity) score -= 0.5;

    return Math.max(1, Math.min(5, Math.round(score)));
}

// ===== RENDER =====
function FinancialDashboard() {
    const analysis = generateInsights(FINANCIAL_DATA);
    const healthScore = calcHealthScore(FINANCIAL_DATA);
    const d = FINANCIAL_DATA.current;
    const p = FINANCIAL_DATA.previous;
    const k = FINANCIAL_DATA.koncern;
    const shl = FINANCIAL_DATA.shlRequirements;

    return h('div', { className: 'financial-dashboard' },

        // Header
        h('div', { className: 'card', style: { borderLeft: '4px solid #d4a843' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 } },
                h('div', null,
                    h('h2', { className: 'font-display', style: { color: '#d4a843', margin: 0 } }, '💰 Ekonomisk Intelligens'),
                    h('p', { style: { color: '#94a3b8', fontSize: 12, margin: '4px 0 0' } }, `Bokslut ${d.year} | ${d.entity} | Källa: bjorkloven.com`)
                ),
                h('div', { style: { textAlign: 'center' } },
                    h('div', { style: { fontSize: 28 } }, '🍃'.repeat(healthScore) + '🍂'.repeat(5 - healthScore)),
                    h('div', { style: { fontSize: 11, color: '#94a3b8' } }, `Ekonomiskt hälsobetyg: ${healthScore}/5`)
                )
            )
        ),

        // KPI-kort
        h('div', { className: 'financial-kpi-grid' },
            renderKPI('Omsättning (A-lag)', d.revenue, p.revenue, '#34d399'),
            renderKPI('Rörelseresultat', d.operatingResult, p.operatingResult, '#60a5fa'),
            renderKPI('Eget kapital (A-lag)', d.equity, p.equity, '#d4a843'),
            renderKPI('Kassa (koncern)', k.cash, FINANCIAL_DATA.koncernPrev.cash, '#a78bfa'),
        ),

        // SHL-Mätaren
        h('div', { className: 'card' },
            h('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 12 } }, '📊 SHL-Mätaren'),
            h('div', { className: 'shl-meter-container' },
                renderShlBar('Eget kapital (koncern)', k.equity, shl.minEquity, k.equity >= shl.minEquity),
                renderShlBar('Eget kapital (A-lag)', d.equity, shl.minEquityHA, d.equity >= shl.minEquityHA),
            ),
            k.equity < shl.minEquity && h('div', { className: 'shl-gap-alert' },
                h('span', { style: { color: '#fbbf24', fontWeight: 700 } }, '⚠️ Gap-analys: '),
                h('span', { style: { color: '#e2e8f0' } }, `Saknar ${formatSEK(shl.minEquity - k.equity)} i eget kapital för SHL-licens.`),
            )
        ),

        // AI-insikter
        h('div', { className: 'card' },
            h('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 12 } }, '🤖 AI-analys'),
            h('div', { className: 'insights-list' },
                analysis.insights.map((ins, i) =>
                    h('div', { key: i, className: `insight-item insight-${ins.type}` },
                        h('span', { className: 'insight-icon' }, ins.icon),
                        h('span', null, ins.text)
                    )
                )
            )
        ),

        // Rekommendationer
        analysis.recommendations.length > 0 && h('div', { className: 'card', style: { borderLeft: '4px solid #fbbf24' } },
            h('h3', { className: 'font-display', style: { color: '#fbbf24', marginBottom: 12 } }, '💡 AI-rekommendationer'),
            h('ol', { className: 'recommendations-list' },
                analysis.recommendations.map((rec, i) =>
                    h('li', { key: i }, rec)
                )
            )
        ),

        // Källa
        h('div', { style: { textAlign: 'center', padding: 16, color: '#64748b', fontSize: 10 } },
            'Data från IF Björklövens officiella bokslutskommuniké 2022/2023. ',
            h('a', { href: 'https://www.bjorkloven.com', target: '_blank', rel: 'noopener', style: { color: '#94a3b8' } }, 'bjorkloven.com')
        ),
    );
}

function renderKPI(label, current, previous, color) {
    const yoy = calcYoY(current, previous);
    const isPositive = current >= previous;
    return h('div', { className: 'financial-kpi-card' },
        h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, label),
        h('div', { style: { fontSize: 22, fontWeight: 700, color: color, fontFamily: 'Outfit' } }, formatSEK(current)),
        h('div', { style: { fontSize: 11, color: isPositive ? '#34d399' : '#f87171', marginTop: 4 } },
            `${isPositive ? '↑' : '↓'} ${yoy}% vs ${formatSEK(previous)}`
        ),
    );
}

function renderShlBar(label, current, threshold, passes) {
    const pct = Math.min((current / threshold) * 100, 120);
    return h('div', { style: { marginBottom: 16 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 } },
            h('span', { style: { color: '#e2e8f0' } }, label),
            h('span', { style: { color: passes ? '#34d399' : '#fbbf24', fontWeight: 700 } },
                `${formatSEK(current)} / ${formatSEK(threshold)} ${passes ? '🟢' : '🟡'}`
            )
        ),
        h('div', { style: { height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden', position: 'relative' } },
            h('div', { style: {
                height: '100%',
                width: Math.min(pct, 100) + '%',
                background: passes
                    ? 'linear-gradient(90deg, #059669, #34d399)'
                    : 'linear-gradient(90deg, #d97706, #fbbf24)',
                borderRadius: 4,
                transition: 'width 1.2s ease',
            }}),
            // SHL-krav markör
            h('div', { style: {
                position: 'absolute', top: 0, bottom: 0,
                left: '100%', transform: 'translateX(-2px)',
                width: 2, background: '#ef4444',
            }}),
        ),
    );
}
