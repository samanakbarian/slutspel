// ============================================================
// EKONOMISK INTELLIGENS - BJORKLOVEN
// ============================================================
// Publik v1:
// - Laser strukturerad lokal JSON som source of truth
// - Har regelbaserad analys som alltid fallback
// - Kan visa valfri AI-kommentar via serverless/backend
// ============================================================

const { useEffect, useState: useFinancialState } = React;
const financialH = React.createElement;

const FINANCIALS_JSON_PATH = 'data/financials/bjorkloven_financials_raw.json';
const FINANCIAL_AI_ENDPOINT = '/.netlify/functions/financial-ai';

const FALLBACK_FINANCIAL_DATA = {
    metadata: {
        source: 'Björklöven bokslutskommuniké (lokal fallback)',
        last_updated: '2026-05-03',
        notes: 'Fallback-data används när JSON-filen inte kan laddas.',
    },
    current: {
        year: '2022/2023',
        entity: 'Björklöven AB (A-lag herr)',
        revenue: 57_300_000,
        operatingResult: 2_300_000,
        equity: 5_700_000,
        notes: '',
    },
    previous: {
        year: '2021/2022',
        entity: 'Björklöven AB (A-lag herr)',
        revenue: 49_100_000,
        operatingResult: 900_000,
        equity: 3_400_000,
        notes: '',
    },
    koncern: {
        year: '2022/2023',
        entity: 'IF Björklöven (koncern)',
        revenue: 71_500_000,
        resultAfterTax: 100_000,
        equity: 13_900_000,
        cash: 10_100_000,
        notes: '',
    },
    koncernPrev: {
        year: '2021/2022',
        entity: 'IF Björklöven (koncern)',
        revenue: 69_800_000,
        resultAfterTax: 8_700_000,
        equity: 13_800_000,
        cash: 7_300_000,
        notes: '',
    },
    shlRequirements: {
        minEquity: 10_000_000,
        minEquityHA: 3_000_000,
        notes: 'Offentligt uppskattade licensnivaer.',
    }
};

function calcYoY(current, previous) {
    if (current == null || previous == null || previous === 0) return null;
    return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

function formatSEK(val) {
    if (val == null || Number.isNaN(Number(val))) return '—';
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' MSEK';
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + ' TSEK';
    return val + ' SEK';
}

function getTrendLabel(value) {
    if (value == null) return 'Ingen jamforelse';
    return `${value >= 0 ? '↑' : '↓'} ${Math.abs(value).toFixed(1)}%`;
}

function getDataUrl(relativePath) {
    return new URL(relativePath, document.baseURI).toString();
}

function mapFinancialRecord(record) {
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
    };
}

function normalizeFinancials(raw) {
    const years = Array.isArray(raw?.years) ? raw.years : [];
    const currentEntity = years.find((row) => row.financial_year === '2022/2023' && row.entity === 'bjorkloven_ab');
    const previousEntity = years.find((row) => row.financial_year === '2021/2022' && row.entity === 'bjorkloven_ab');
    const currentGroup = years.find((row) => row.financial_year === '2022/2023' && row.entity === 'if_bjorkloven_koncern');
    const previousGroup = years.find((row) => row.financial_year === '2021/2022' && row.entity === 'if_bjorkloven_koncern');
    const shlRequirements = raw?.shl_requirements || {};

    if (!currentEntity || !currentGroup) {
        throw new Error('Financial JSON saknar aktuell period för A-lag eller koncern.');
    }

    return {
        metadata: {
            source: raw?.metadata?.source || 'Okand kalla',
            last_updated: raw?.metadata?.last_updated || null,
            notes: raw?.metadata?.notes || '',
            description: raw?.metadata?.description || '',
        },
        current: mapFinancialRecord(currentEntity),
        previous: mapFinancialRecord(previousEntity),
        koncern: mapFinancialRecord(currentGroup),
        koncernPrev: mapFinancialRecord(previousGroup),
        shlRequirements: {
            minEquity: shlRequirements.min_equity_shl ?? FALLBACK_FINANCIAL_DATA.shlRequirements.minEquity,
            minEquityHA: shlRequirements.min_equity_ha ?? FALLBACK_FINANCIAL_DATA.shlRequirements.minEquityHA,
            notes: shlRequirements.notes || '',
        }
    };
}

function buildAiPayload(data) {
    const revGrowth = calcYoY(data.current.revenue, data.previous?.revenue);
    const resultGrowth = calcYoY(data.current.operatingResult, data.previous?.operatingResult);
    const equityGrowth = calcYoY(data.koncern.equity, data.koncernPrev?.equity);
    const cashGrowth = calcYoY(data.koncern.cash, data.koncernPrev?.cash);

    return {
        metadata: data.metadata,
        current: data.current,
        previous: data.previous,
        koncern: data.koncern,
        koncernPrev: data.koncernPrev,
        thresholds: data.shlRequirements,
        deltas: {
            revenue_yoy_pct: revGrowth,
            operating_result_yoy_pct: resultGrowth,
            group_equity_yoy_pct: equityGrowth,
            cash_yoy_pct: cashGrowth,
            shl_equity_gap_sek: data.shlRequirements.minEquity - (data.koncern.equity ?? 0),
            ha_equity_gap_sek: data.shlRequirements.minEquityHA - (data.current.equity ?? 0),
        }
    };
}

function generateInsights(data) {
    const insights = [];
    const recommendations = [];
    const d = data.current;
    const p = data.previous || {};
    const k = data.koncern;
    const kp = data.koncernPrev || {};
    const shl = data.shlRequirements;

    const revGrowth = calcYoY(d.revenue, p.revenue);
    if (revGrowth != null) {
        insights.push({
            type: revGrowth >= 10 ? 'positive' : 'neutral',
            icon: revGrowth >= 10 ? '📈' : '📊',
            text: `Omsättningen i A-laget är ${formatSEK(d.revenue)} och förändrades ${revGrowth >= 0 ? 'uppåt' : 'nedåt'} med ${Math.abs(revGrowth).toFixed(1)}% mot ${p.year || 'föregående år'}.`
        });
    }

    const resultGrowth = calcYoY(d.operatingResult, p.operatingResult);
    if (d.operatingResult != null) {
        const profitable = d.operatingResult > 0;
        insights.push({
            type: profitable ? 'positive' : 'warning',
            icon: profitable ? '✅' : '⚠️',
            text: `${profitable ? 'Positivt' : 'Svagt'} rörelseresultat i A-laget: ${formatSEK(d.operatingResult)}${resultGrowth != null ? ` (${getTrendLabel(resultGrowth)} mot föregående år).` : '.'}`
        });
    }

    const shlGap = shl.minEquity - (k.equity ?? 0);
    insights.push({
        type: shlGap > 0 ? 'warning' : 'positive',
        icon: shlGap > 0 ? '🟡' : '🟢',
        text: shlGap > 0
            ? `Koncernens egna kapital är ${formatSEK(k.equity)} och ligger ${formatSEK(shlGap)} under den uppskattade SHL-nivån.`
            : `Koncernens egna kapital är ${formatSEK(k.equity)} och klarar den uppskattade SHL-nivån.`
    });

    const haGap = (d.equity ?? 0) - shl.minEquityHA;
    if (haGap >= 0) {
        insights.push({
            type: 'positive',
            icon: '🏒',
            text: `A-lagets egna kapital är ${formatSEK(d.equity)} och ligger ${formatSEK(haGap)} över den uppskattade HockeyAllsvenskan-nivån.`
        });
    }

    const cashGrowth = calcYoY(k.cash, kp.cash);
    if (k.cash != null) {
        insights.push({
            type: cashGrowth != null && cashGrowth >= 0 ? 'positive' : 'neutral',
            icon: '💰',
            text: `Kassan i koncernen uppgår till ${formatSEK(k.cash)}${cashGrowth != null ? ` (${getTrendLabel(cashGrowth)} mot ${kp.year || 'föregående år'}).` : '.'}`
        });
    }

    const groupDrop = calcYoY(k.resultAfterTax, kp.resultAfterTax);
    if (groupDrop != null && groupDrop <= -50) {
        insights.push({
            type: 'warning',
            icon: '📉',
            text: `Koncernresultatet efter skatt föll kraftigt från ${formatSEK(kp.resultAfterTax)} till ${formatSEK(k.resultAfterTax)}.`
        });
    }

    if (shlGap > 0) {
        recommendations.push(`Stärk koncernens egna kapital med minst ${formatSEK(shlGap)} om SHL-spåret ska vara ekonomiskt robust.`);
    }
    if (groupDrop != null && groupDrop <= -50) {
        recommendations.push('Bryt ut kostnadsdrivare i moderföreningen och följ upp dam- och juniorverksamhet separat i kommunikationen.');
    }
    if (revGrowth != null && revGrowth >= 10) {
        recommendations.push('Stark intäktstillväxt bör säkras med mer återkommande sponsor- och partnerintäkter, inte bara matchdagseffekt.');
    }

    return {
        insights: insights.slice(0, 6),
        recommendations: recommendations.slice(0, 3),
    };
}

function calcHealthScore(data) {
    let score = 3;
    const d = data.current;
    const k = data.koncern;
    const shl = data.shlRequirements;

    if ((d.operatingResult ?? -1) > 0) score += 0.5;
    if ((d.operatingResult ?? 0) > 1_000_000) score += 0.5;
    if ((k.cash ?? 0) > 5_000_000) score += 0.5;
    if ((k.equity ?? 0) >= shl.minEquity) score += 0.5;
    if ((k.resultAfterTax ?? 0) < 500_000) score -= 0.5;
    if ((k.equity ?? 0) < shl.minEquity) score -= 0.5;

    return Math.max(1, Math.min(5, Math.round(score)));
}

function FinancialDashboard() {
    const [financialData, setFinancialData] = useFinancialState(FALLBACK_FINANCIAL_DATA);
    const [status, setStatus] = useFinancialState('loading');
    const [loadError, setLoadError] = useFinancialState('');
    const [aiStatus, setAiStatus] = useFinancialState('idle');
    const [aiCommentary, setAiCommentary] = useFinancialState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadFinancials() {
            setStatus('loading');
            setLoadError('');

            try {
                const res = await fetch(getDataUrl(FINANCIALS_JSON_PATH), { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const raw = await res.json();
                const normalized = normalizeFinancials(raw);
                if (!cancelled) {
                    setFinancialData(normalized);
                    setStatus('ready');
                }
            } catch (err) {
                if (!cancelled) {
                    setFinancialData(FALLBACK_FINANCIAL_DATA);
                    setStatus('error');
                    setLoadError(err.message || 'Okänt fel');
                }
            }
        }

        loadFinancials();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const payload = buildAiPayload(financialData);

        if (status === 'loading') {
            setAiStatus('idle');
            setAiCommentary(null);
            return () => {
                cancelled = true;
            };
        }

        async function loadAiCommentary() {
            setAiStatus('loading');
            try {
                const res = await fetch(FINANCIAL_AI_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error(`AI endpoint unavailable (${res.status})`);
                const parsed = await res.json();
                if (!parsed || typeof parsed.summary !== 'string') {
                    throw new Error('AI-response saknar summary.');
                }
                if (!cancelled) {
                    setAiCommentary(parsed);
                    setAiStatus('ready');
                }
            } catch (err) {
                if (!cancelled) {
                    setAiCommentary(null);
                    setAiStatus('error');
                }
            }
        }

        loadAiCommentary();
        return () => {
            cancelled = true;
        };
    }, [financialData, status]);

    const analysis = generateInsights(financialData);
    const healthScore = calcHealthScore(financialData);
    const d = financialData.current;
    const p = financialData.previous || {};
    const k = financialData.koncern;
    const kp = financialData.koncernPrev || {};
    const shl = financialData.shlRequirements;
    const sourceText = financialData.metadata?.source || 'Okänd källa';
    const lastUpdated = financialData.metadata?.last_updated || 'okänt datum';

    return financialH('div', { className: 'financial-dashboard' },
        status === 'loading' && financialH('div', { className: 'card financial-status-card' },
            financialH('div', { className: 'financial-status-title' }, 'Laddar ekonomisk data...'),
            financialH('div', { className: 'financial-status-text' }, 'Bygger dashboard från lokal årsredovisnings-JSON.')
        ),

        status === 'error' && financialH('div', { className: 'card financial-status-card financial-status-warning' },
            financialH('div', { className: 'financial-status-title' }, 'JSON-data kunde inte laddas'),
            financialH('div', { className: 'financial-status-text' }, `Visar lokal reservdata i stället. Fel: ${loadError}`),
        ),

        financialH('div', { className: 'card', style: { borderLeft: '4px solid #d4a843' } },
            financialH('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 } },
                financialH('div', null,
                    financialH('h2', { className: 'font-display', style: { color: '#d4a843', margin: 0 } }, '💰 Ekonomisk Intelligens'),
                    financialH('p', { style: { color: '#94a3b8', fontSize: 12, margin: '4px 0 0' } }, `Bokslut ${d.year} | ${d.entity}`),
                    financialH('p', { className: 'financial-meta-line' }, `Källa: ${sourceText} | Senast uppdaterad: ${lastUpdated}`)
                ),
                financialH('div', { style: { textAlign: 'center' } },
                    financialH('div', { style: { fontSize: 28 } }, '🍃'.repeat(healthScore) + '🍂'.repeat(5 - healthScore)),
                    financialH('div', { style: { fontSize: 11, color: '#94a3b8' } }, `Ekonomiskt hälsobetyg: ${healthScore}/5`)
                )
            )
        ),

        financialH('div', { className: 'financial-kpi-grid' },
            renderKPI('Omsättning (A-lag)', d.revenue, p.revenue, '#34d399'),
            renderKPI('Rörelseresultat', d.operatingResult, p.operatingResult, '#60a5fa'),
            renderKPI('Eget kapital (A-lag)', d.equity, p.equity, '#d4a843'),
            renderKPI('Kassa (koncern)', k.cash, kp.cash, '#a78bfa'),
        ),

        financialH('div', { className: 'card' },
            financialH('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 12 } }, '📊 SHL-mätaren'),
            financialH('div', { className: 'shl-meter-container' },
                renderShlBar('Eget kapital (koncern)', k.equity, shl.minEquity, (k.equity ?? 0) >= shl.minEquity),
                renderShlBar('Eget kapital (A-lag)', d.equity, shl.minEquityHA, (d.equity ?? 0) >= shl.minEquityHA),
            ),
            (k.equity ?? 0) < shl.minEquity && financialH('div', { className: 'shl-gap-alert' },
                financialH('span', { style: { color: '#fbbf24', fontWeight: 700 } }, 'Gap-analys: '),
                financialH('span', { style: { color: '#e2e8f0' } }, `Saknar ${formatSEK(shl.minEquity - (k.equity ?? 0))} i eget kapital för uppskattad SHL-nivå.`),
            ),
            shl.notes && financialH('div', { className: 'financial-footnote' }, shl.notes)
        ),

        financialH('div', { className: 'card' },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#d4a843', margin: 0 } }, 'Analys'),
                financialH('span', { className: 'financial-badge' }, 'Regelbaserad fallback')
            ),
            financialH('p', { className: 'financial-footnote', style: { marginTop: 8 } }, 'Analysen nedan bygger på finansiella nyckeltal, jämförelseår och licensnivåer.'),
            financialH('div', { className: 'insights-list' },
                analysis.insights.map((ins, i) =>
                    financialH('div', { key: i, className: `insight-item insight-${ins.type || 'neutral'}` },
                        financialH('span', { className: 'insight-icon' }, ins.icon),
                        financialH('span', null, ins.text)
                    )
                )
            )
        ),

        aiStatus === 'ready' && aiCommentary && financialH('div', { className: 'card', style: { borderLeft: '4px solid #60a5fa' } },
            financialH('div', { className: 'financial-section-head' },
                financialH('h3', { className: 'font-display', style: { color: '#60a5fa', margin: 0 } }, 'AI-kommentar'),
                financialH('span', { className: 'financial-badge financial-badge-ai' }, 'Valfri enhancement')
            ),
            financialH('p', { className: 'financial-ai-summary' }, aiCommentary.summary),
            Array.isArray(aiCommentary.bull_points) && aiCommentary.bull_points.length > 0 && financialH('div', { className: 'financial-ai-grid' },
                renderAiList('Styrkor', aiCommentary.bull_points, 'positive'),
                renderAiList('Risker', aiCommentary.risk_points || [], 'warning')
            )
        ),

        aiStatus === 'loading' && financialH('div', { className: 'card financial-status-card financial-status-subtle' },
            financialH('div', { className: 'financial-status-title' }, 'Hämtar AI-kommentar...'),
            financialH('div', { className: 'financial-status-text' }, 'Den lokala analysen visas redan oavsett om AI-svaret lyckas eller inte.')
        ),

        analysis.recommendations.length > 0 && financialH('div', { className: 'card', style: { borderLeft: '4px solid #fbbf24' } },
            financialH('h3', { className: 'font-display', style: { color: '#fbbf24', marginBottom: 12 } }, 'Rekommendationer'),
            financialH('ol', { className: 'recommendations-list' },
                analysis.recommendations.map((rec, i) =>
                    financialH('li', { key: i }, rec)
                )
            ),
            aiStatus === 'ready' && Array.isArray(aiCommentary?.recommendations) && aiCommentary.recommendations.length > 0 &&
                financialH('div', { className: 'financial-ai-followup' },
                    financialH('div', { className: 'financial-followup-title' }, 'AI-förslag'),
                    financialH('ul', { className: 'financial-ai-recommendations' },
                        aiCommentary.recommendations.map((rec, i) => financialH('li', { key: i }, rec))
                    )
                )
        ),

        (d.notes || k.notes || financialData.metadata?.notes) && financialH('div', { className: 'card' },
            financialH('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 12 } }, 'Kontext'),
            financialH('div', { className: 'financial-context-grid' },
                d.notes && renderContextCard('A-lag', d.notes),
                k.notes && renderContextCard('Koncern', k.notes),
                financialData.metadata?.notes && renderContextCard('Metanotering', financialData.metadata.notes),
            )
        ),

        financialH('div', { style: { textAlign: 'center', padding: 16, color: '#64748b', fontSize: 10 } },
            `Data från lokal JSON: ${FINANCIALS_JSON_PATH}. `,
            financialH('span', null, 'Ekonomivyn fungerar även utan AI-endpoint.')
        )
    );
}

function renderContextCard(label, text) {
    return financialH('div', { className: 'financial-context-card' },
        financialH('div', { className: 'financial-context-label' }, label),
        financialH('div', { className: 'financial-context-text' }, text)
    );
}

function renderAiList(title, items, tone) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return financialH('div', { className: `financial-ai-list financial-ai-${tone}` },
        financialH('div', { className: 'financial-followup-title' }, title),
        financialH('ul', null, items.map((item, index) => financialH('li', { key: index }, item)))
    );
}

function renderKPI(label, current, previous, color) {
    const yoy = calcYoY(current, previous);
    const isPositive = previous == null ? current >= 0 : current >= previous;
    return financialH('div', { className: 'financial-kpi-card' },
        financialH('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, label),
        financialH('div', { style: { fontSize: 22, fontWeight: 700, color: color, fontFamily: 'Outfit' } }, formatSEK(current)),
        financialH('div', { style: { fontSize: 11, color: isPositive ? '#34d399' : '#f87171', marginTop: 4 } },
            yoy == null ? 'Ingen jämförelsedata ännu' : `${isPositive ? '↑' : '↓'} ${Math.abs(yoy).toFixed(1)}% vs ${formatSEK(previous)}`
        ),
    );
}

function renderShlBar(label, current, threshold, passes) {
    const safeCurrent = current ?? 0;
    const safeThreshold = threshold || 1;
    const pct = Math.min((safeCurrent / safeThreshold) * 100, 120);
    return financialH('div', { style: { marginBottom: 16 } },
        financialH('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 } },
            financialH('span', { style: { color: '#e2e8f0' } }, label),
            financialH('span', { style: { color: passes ? '#34d399' : '#fbbf24', fontWeight: 700 } },
                `${formatSEK(safeCurrent)} / ${formatSEK(safeThreshold)} ${passes ? '🟢' : '🟡'}`
            )
        ),
        financialH('div', { style: { height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden', position: 'relative' } },
            financialH('div', { style: {
                height: '100%',
                width: Math.min(pct, 100) + '%',
                background: passes
                    ? 'linear-gradient(90deg, #059669, #34d399)'
                    : 'linear-gradient(90deg, #d97706, #fbbf24)',
                borderRadius: 4,
                transition: 'width 1.2s ease',
            }}),
            financialH('div', { style: {
                position: 'absolute', top: 0, bottom: 0,
                left: '100%', transform: 'translateX(-2px)',
                width: 2, background: '#ef4444',
            }}),
        ),
    );
}
