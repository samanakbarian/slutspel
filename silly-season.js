// ============================================================
// SILLY SEASON COMPONENTS — BJÖRKLÖVEN SHL 2026/2027
// ============================================================

const { useEffect, useCallback, useRef } = React;

// ===== CONSTANTS =====
const TAG_COLORS = {
    BEKRÄFTAT_NYFÖRVÄRV: '#34d399',
    BEKRÄFTAD_FÖRLUST: '#f87171',
    HETT_RYKTE: '#fb923c',
    KONTRAKTSFÖRLÄNGNING: '#60a5fa',
    FORUM_RYKTE: '#a78bfa',
    ÖVRIGT: '#64748b'
};
const TAG_LABELS = {
    BEKRÄFTAT_NYFÖRVÄRV: 'BEKRÄFTAT NYFÖRVÄRV',
    BEKRÄFTAD_FÖRLUST: 'BEKRÄFTAD FÖRLUST',
    HETT_RYKTE: 'HETT RYKTE',
    KONTRAKTSFÖRLÄNGNING: 'KONTRAKTSFÖRLÄNGNING',
    ÖVRIGT: 'ÖVRIGA NYHETER',
};

const h = React.createElement;
const OPS_DEBUG_ENABLED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ops') === '1';

// ===== 1. LIVE NEWS FEED =====
function LiveFeed({ news }) {
    const [filter, setFilter] = useState('ALL_SILLY');
    const noForum = news.filter(n => n.tag !== 'FORUM_RYKTE');
    const filtered = noForum.filter(n => {
        if (filter === 'ALL_SILLY') return n.tag !== 'ÖVRIGT';
        if (filter === 'ÖVRIGT') return n.tag === 'ÖVRIGT';
        return n.tag === filter;
    });

    return h('div', { className: 'card' },
        h('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 16 } }, '📰 Realtidsflödet'),
        // Filter pills
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
            h('button', {
                onClick: () => setFilter('ALL_SILLY'),
                style: {
                    padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700,
                    background: filter === 'ALL_SILLY' ? '#d4a843' : 'rgba(255,255,255,.06)',
                    color: filter === 'ALL_SILLY' ? '#111' : '#94a3b8', transition: 'all .2s'
                }
            }, 'Silly Season'),
            Object.entries(TAG_LABELS).map(([key, label]) =>
                h('button', {
                    key, onClick: () => setFilter(key),
                    style: {
                        padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700,
                        background: filter === key ? TAG_COLORS[key] : 'rgba(255,255,255,.06)',
                        color: filter === key ? '#111' : TAG_COLORS[key],
                        transition: 'all .2s'
                    }
                }, label)
            )
        ),
        // Feed items
        h('div', { className: 'feed-container' },
            filtered.map((item, i) =>
                h('div', {
                    key: item.id || i,
                    className: `feed-item ${item.priority === 'breaking' ? 'breaking' : ''}`,
                    style: { animationDelay: `${i * 60}ms` }
                },
                    h('div', { className: 'feed-dot', style: { background: TAG_COLORS[item.tag] || '#94a3b8' } }),
                    h('div', { style: { flex: 1 } },
                        h('div', { className: 'feed-meta' },
                            h('span', { className: `tag tag-${item.tag}`, style: { background: TAG_COLORS[item.tag] + '33', color: TAG_COLORS[item.tag] } }, TAG_LABELS[item.tag] || item.tag),
                            h('span', null, item.date ? item.date.replace('T', ' ').substring(0, 16) : ''),
                        ),
                        // Clickable title if URL exists
                        item.url
                            ? h('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer', className: 'feed-title feed-title-link' }, item.title, h('span', { className: 'feed-link-icon' }, ' ↗'))
                            : h('div', { className: 'feed-title' }, item.title),
                        h('div', { className: 'feed-body' }, item.body),
                        // Impact card
                        item.impact && h('div', { style: { marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6, borderLeft: item.impact.type === 'positive' ? '3px solid #34d399' : '3px solid #f87171' } },
                            h('div', { style: { fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 } }, 'Estimerad impact'),
                            h('div', { style: { display: 'flex', gap: 12 } },
                                item.impact.impact_toi && h('div', null,
                                    h('span', { style: { color: item.impact.type === 'positive' ? '#34d399' : '#f87171', fontWeight: 'bold' } }, item.impact.type === 'positive' ? '+' : '-'),
                                    h('span', { style: { color: '#e2e8f0', fontSize: 13, marginLeft: 4 } }, item.impact.impact_toi + ' TOI')
                                ),
                                item.impact.impact_points && h('div', null,
                                    h('span', { style: { color: item.impact.type === 'positive' ? '#34d399' : '#f87171', fontWeight: 'bold' } }, item.impact.type === 'positive' ? '+' : '-'),
                                    h('span', { style: { color: '#e2e8f0', fontSize: 13, marginLeft: 4 } }, item.impact.impact_points + ' Poäng')
                                )
                            )
                        ),
                        // Sentiment bar (if ai_analysis exists from backend)
                        item.ai_analysis && item.ai_analysis.sentiment_pct != null && h('div', { className: 'feed-sentiment' },
                            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 } },
                                h('span', null, '🤖 Sentiment'),
                                h('span', { style: { color: item.ai_analysis.sentiment_pct > 50 ? '#34d399' : '#f87171', fontWeight: 700 } }, item.ai_analysis.sentiment_pct + '%')
                            ),
                            h('div', { style: { height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' } },
                                h('div', { style: { height: '100%', width: item.ai_analysis.sentiment_pct + '%', background: item.ai_analysis.sentiment_pct > 50 ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#dc2626,#f87171)', transition: 'width .8s ease' } })
                            ),
                            (item.ai_analysis.pros || item.ai_analysis.cons) && h('div', { style: { marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' } },
                                ...(item.ai_analysis.pros || []).map((pro, idx) => h('span', { key: 'p'+idx, style: { fontSize: 10, color: '#34d399' } }, '✓ ' + pro)),
                                ...(item.ai_analysis.cons || []).map((con, idx) => h('span', { key: 'c'+idx, style: { fontSize: 10, color: '#f87171' } }, '✗ ' + con))
                            )
                        ),
                        // Source with link
                        h('div', { className: 'feed-source', style: { color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 } },
                            h('span', null, `Källa: `),
                            item.url
                                ? h('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer', className: 'feed-source-link' }, item.source || 'Okänd')
                                : h('span', null, item.source || 'Okänd')
                        ),
                    )
                )
            ),
            filtered.length === 0 && h('div', { style: { textAlign: 'center', padding: 32, color: '#64748b' } }, 'Inga nyheter med detta filter.')
        )
    );
}

// ===== 2. INTERACTIVE RINK =====
function RinkPlayer({ player, x, y, onClick }) {
    const status = player.status?.toLowerCase().replace('ö', 'o').replace('ä', 'a') || 'signerad';
    const isVakant = !player.player && player.status === 'VAKANT';
    const circle_cls = isVakant ? 'vakant' :
        status.includes('nyfö') || status.includes('nyfo') ? 'nyforvärv' :
            status.includes('förl') || status.includes('forl') ? 'forlangd' :
                status.includes('lämn') || status.includes('lamn') ? 'lamnar' :
                    status.includes('utgå') || status.includes('utga') ? 'utgaende' :
                        'signerad';

    return h('div', {
        className: 'rink-player',
        style: { left: `${x}%`, top: `${y}%` },
        onClick: isVakant ? onClick : undefined,
    },
        h('div', { className: `rink-player-circle ${circle_cls}` },
            isVakant ? '?' : (player.number || '★')
        ),
        h('div', { className: 'rink-player-name' },
            isVakant ? 'VAKANT' : (player.player ? player.player.split(' ').pop() : '')
        ),
        !isVakant && h('div', {
            className: 'rink-player-status',
            style: {
                color: circle_cls === 'nyforvärv' ? '#d4a843' :
                    circle_cls === 'forlangd' ? '#60a5fa' :
                        circle_cls === 'lamnar' ? '#f87171' :
                            circle_cls === 'utgaende' ? '#fb923c' : '#34d399'
            }
        }, player.status)
    );
}

function InteractiveRink({ positions }) {
    const [popup, setPopup] = useState(null);

    const rinkW = 700, rinkH = 400;

    // Positions on rink (percentage-based)
    // GK at bottom
    const gkPositions = [
        { x: 50, y: 90 }, // GK1
        { x: 65, y: 90 }, // GK2
    ];
    // Defense pairs
    const defPositions = [
        [{ x: 30, y: 72 }, { x: 70, y: 72 }],
        [{ x: 20, y: 60 }, { x: 80, y: 60 }],
        [{ x: 30, y: 48 }, { x: 70, y: 48 }],
    ];
    // Forward lines
    const fwdPositions = [
        [{ x: 20, y: 15 }, { x: 50, y: 10 }, { x: 80, y: 15 }],
        [{ x: 20, y: 26 }, { x: 50, y: 22 }, { x: 80, y: 26 }],
        [{ x: 20, y: 36 }, { x: 50, y: 33 }, { x: 80, y: 36 }],
        [{ x: 20, y: 86 }, { x: 50, y: 82 }, { x: 80, y: 86 }], // 4th line near bench
    ];

    return h('div', { className: 'card' },
        h('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 8 } }, '🏒 Truppbygget 2026/2027'),
        h('div', { style: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' } },
            ...[
                { cls: 'signerad', label: 'Signerad' },
                { cls: 'forlangd', label: 'Förlängd' },
                { cls: 'nyforvärv', label: 'Nyförvärv' },
                { cls: 'utgaende', label: 'Utgående' },
                { cls: 'lamnar', label: 'Lämnar' },
                { cls: 'vakant', label: 'Vakant' },
            ].map(l => h('div', { key: l.cls, style: { display: 'flex', alignItems: 'center', gap: 4 } },
                h('div', { className: `rink-player-circle ${l.cls}`, style: { width: 16, height: 16, fontSize: 8, minWidth: 16 } }),
                h('span', { style: { fontSize: 10, color: '#94a3b8' } }, l.label)
            ))
        ),
        h('div', { className: 'rink-container', style: { height: 420 } },
            // SVG Rink background
            h('svg', { viewBox: '0 0 700 400', className: 'rink-svg', style: { position: 'absolute', inset: 0, width: '100%', height: '100%' } },
                // Ice
                h('rect', { x: 5, y: 5, width: 690, height: 390, rx: 80, fill: '#0f1729', stroke: '#1e293b', strokeWidth: 2 }),
                // Center line
                h('line', { x1: 5, y1: 200, x2: 695, y2: 200, stroke: '#dc2626', strokeWidth: 2, opacity: .3 }),
                // Center circle
                h('circle', { cx: 350, cy: 200, r: 50, fill: 'none', stroke: '#3b82f6', strokeWidth: 1.5, opacity: .2 }),
                h('circle', { cx: 350, cy: 200, r: 4, fill: '#3b82f6', opacity: .3 }),
                // Blue lines
                h('line', { x1: 5, y1: 130, x2: 695, y2: 130, stroke: '#3b82f6', strokeWidth: 2, opacity: .2 }),
                h('line', { x1: 5, y1: 270, x2: 695, y2: 270, stroke: '#3b82f6', strokeWidth: 2, opacity: .2 }),
                // Goal crease
                h('path', { d: 'M 320 385 Q 350 365 380 385', fill: 'none', stroke: '#dc2626', strokeWidth: 1.5, opacity: .3 }),
                // Faceoff circles
                ...[{ x: 200, y: 80 }, { x: 500, y: 80 }, { x: 200, y: 320 }, { x: 500, y: 320 }].map((c, i) =>
                    h('circle', { key: i, cx: c.x, cy: c.y, r: 30, fill: 'none', stroke: '#dc2626', strokeWidth: 1, opacity: .15 })
                ),
                // Labels
                h('text', { x: 350, y: 60, textAnchor: 'middle', fill: '#d4a843', fontSize: 11, fontFamily: 'Outfit', opacity: .5 }, 'FORWARDS'),
                h('text', { x: 350, y: 255, textAnchor: 'middle', fill: '#3b82f6', fontSize: 11, fontFamily: 'Outfit', opacity: .5 }, 'BACKAR'),
                h('text', { x: 350, y: 370, textAnchor: 'middle', fill: '#a78bfa', fontSize: 11, fontFamily: 'Outfit', opacity: .5 }, 'MÅLVAKT'),
            ),

            // Goalies
            positions.goalies.map((g, i) =>
                h(RinkPlayer, { key: 'gk' + i, player: g, x: gkPositions[i].x, y: gkPositions[i].y, onClick: () => g.rumors && setPopup({ x: gkPositions[i].x, y: gkPositions[i].y - 15, rumors: g.rumors, slot: g.slot }) })
            ),

            // Defense
            positions.defense_pairs.map((pair, pi) => [
                h(RinkPlayer, { key: 'dld' + pi, player: pair.ld, x: defPositions[pi][0].x, y: defPositions[pi][0].y, onClick: () => pair.ld.rumors && setPopup({ x: defPositions[pi][0].x, y: defPositions[pi][0].y - 15, rumors: pair.ld.rumors, slot: 'LD' }) }),
                h(RinkPlayer, { key: 'drd' + pi, player: pair.rd, x: defPositions[pi][1].x, y: defPositions[pi][1].y, onClick: () => pair.rd.rumors && setPopup({ x: defPositions[pi][1].x, y: defPositions[pi][1].y - 15, rumors: pair.rd.rumors, slot: 'RD' }) }),
            ]),

            // Forwards
            positions.forward_lines.map((line, li) => {
                if (li === 3) return null; // skip 4th line on rink for space
                return [
                    h(RinkPlayer, { key: 'flw' + li, player: line.lw, x: fwdPositions[li][0].x, y: fwdPositions[li][0].y, onClick: () => line.lw.rumors && setPopup({ x: fwdPositions[li][0].x, y: fwdPositions[li][0].y - 12, rumors: line.lw.rumors, slot: 'LW' }) }),
                    h(RinkPlayer, { key: 'fce' + li, player: line.ce, x: fwdPositions[li][1].x, y: fwdPositions[li][1].y, onClick: () => line.ce.rumors && setPopup({ x: fwdPositions[li][1].x, y: fwdPositions[li][1].y - 12, rumors: line.ce.rumors, slot: 'CE' }) }),
                    h(RinkPlayer, { key: 'frw' + li, player: line.rw, x: fwdPositions[li][2].x, y: fwdPositions[li][2].y, onClick: () => line.rw.rumors && setPopup({ x: fwdPositions[li][2].x, y: fwdPositions[li][2].y - 12, rumors: line.rw.rumors, slot: 'RW' }) }),
                ];
            }),

            // Popup
            popup && h('div', {
                className: 'rink-popup',
                style: { left: `${popup.x}%`, top: `${popup.y}%`, transform: 'translate(-50%,-100%)' }
            },
                h('button', { className: 'rink-popup-close', onClick: () => setPopup(null) }, '×'),
                h('div', { className: 'rink-popup-title' }, `Vakant ${popup.slot}`),
                popup.rumors.map((r, i) =>
                    h('div', { key: i, className: 'rink-popup-item' },
                        h('span', { style: { color: '#e2e8f0' } }, '• '),
                        r
                    )
                )
            ),
        ),

        // 4th line separate
        h('div', { style: { marginTop: 16, background: 'rgba(255,255,255,.02)', borderRadius: 12, padding: 16 } },
            h('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#64748b', marginBottom: 8 } }, 'Fjärde kedjan'),
            h('div', { style: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' } },
                ...[positions.forward_lines[3]?.lw, positions.forward_lines[3]?.ce, positions.forward_lines[3]?.rw].filter(Boolean).map((p, i) => {
                    const isVakant = !p.player && p.status === 'VAKANT';
                    const statusColor = isVakant ? '#f87171' :
                        p.status === 'SIGNERAD' ? '#34d399' :
                            p.status === 'FÖRLÄNGD' ? '#60a5fa' :
                                p.status === 'UTGÅENDE' ? '#fb923c' :
                                    p.status === 'LÄMNAR' ? '#f87171' : '#94a3b8';
                    return h('div', { key: i, className: 'player-tile', style: { borderColor: `${statusColor}33`, minWidth: 100 } },
                        h('div', { className: 'player-num', style: { color: statusColor } }, isVakant ? '?' : (p.number || '★')),
                        h('div', { className: 'player-name' }, isVakant ? 'Vakant' : p.player),
                        h('div', { className: 'player-pos', style: { color: statusColor } }, p.status),
                    );
                })
            )
        ),
    );
}

// ===== 3. BREAKING NEWS TOAST =====
function BreakingToast({ show, news }) {
    if (!show || !news) return null;
    return h('div', { className: 'breaking-overlay' },
        h('div', { className: 'breaking-toast' },
            h('div', { className: 'breaking-label' }, '⚡ BREAKING NEWS ⚡'),
            h('div', { className: 'breaking-title' }, news.title),
            h('div', { className: 'breaking-sub' }, news.body),
        )
    );
}

// ===== 4. SOURCES OVERVIEW =====
const SILLY_SOURCES = [
    { name: 'Björklöven.com', url: 'https://www.bjorkloven.com/nyheter', icon: '🟢', desc: 'Officiella nyheter' },
    { name: 'HockeySverige', url: 'https://www.hockeysverige.se', icon: '🏒', desc: 'Hockeynyheter & transfers' },
    { name: 'HockeyNews', url: 'https://www.hockeynews.se', icon: '📰', desc: 'Nyheter & rykten' },
    { name: 'Dagens Hockey', url: 'https://www.dagenshockey.se', icon: '📋', desc: 'Hockeynyheter' },
    { name: 'Expressen (MrMadhawk)', url: 'https://www.expressen.se/sport/hockey/', icon: '📺', desc: 'Johan Svensson rapporterar' },
    { name: 'SvenskaFans (Gröngult)', url: 'https://www.svenskafans.com/hockeyzon/bjorkloven/forum', icon: '💬', desc: 'Fansforum & rykten' },
    { name: 'VK.se', url: 'https://www.vk.se/sport/hockey', icon: '🗞️', desc: 'Västerbottens-Kuriren' },
    { name: 'SHL.se', url: 'https://www.shl.se/lag/bjorkloven', icon: '🏆', desc: 'Officiell SHL-sida' },
];

function SourcesOverview({ meta }) {
    return h('div', { className: 'card' },
        h('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 8 } }, '🔗 Källor & Direktlänkar'),
        h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 16 } }, 'Klicka för att gå direkt till respektive källa.'),
        h('div', { className: 'sources-grid' },
            SILLY_SOURCES.map((src, i) => {
                const scraperStatus = meta?.sources?.[src.name.toLowerCase().replace(/[^a-zåäö.]/g, '')] ?? null;
                return h('a', {
                    key: i,
                    href: src.url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'source-card',
                },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                        h('span', { style: { fontSize: 22 } }, src.icon),
                        h('div', { style: { flex: 1 } },
                            h('div', { className: 'source-name' }, src.name),
                            h('div', { className: 'source-desc' }, src.desc),
                        ),
                        h('span', { className: 'source-arrow' }, '→'),
                    ),
                );
            })
        ),
        meta?.lastRefresh && h('div', { style: { marginTop: 12, fontSize: 10, color: '#64748b', textAlign: 'center' } },
            `Senast skrapad: ${new Date(meta.lastRefresh).toLocaleString('sv-SE')}`
        ),
    );
}

function OpsPanel() {
    const [ops, setOps] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!OPS_DEBUG_ENABLED) return;
        const load = async () => {
            try {
                const res = await fetch(`https://loven-stats-api-324947473206.europe-west1.run.app/api/silly-season/ops?ts=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setOps(await res.json());
            } catch (e) {
                setError(e?.message || String(e));
            }
        };
        load();
    }, []);

    if (!OPS_DEBUG_ENABLED) return null;

    return h('div', { className: 'card', style: { borderLeft: '4px solid #38bdf8' } },
        h('h3', { className: 'font-display', style: { color: '#38bdf8', marginBottom: 8 } }, 'Ops: Silly driftpanel'),
        error && h('div', { style: { color: '#f87171', fontSize: 12, marginBottom: 8 } }, `Fel: ${error}`),
        ops && h('div', null,
            h('div', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 10 } },
                `Freshness: ${ops.freshness_status || 'unknown'} | Senast: ${ops.latest_updated_at ? new Date(ops.latest_updated_at).toLocaleString('sv-SE') : 'okänt'}`
            ),
            h('div', { style: { display: 'grid', gap: 8 } },
                ...(ops.runs || []).map((run, idx) => {
                    const topSources = Object.entries(run.source_counts || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([name, count]) => `${name}: ${count}`)
                        .join(' | ');
                    return h('div', {
                        key: run.blob || idx,
                        style: {
                            fontSize: 12,
                            color: '#cbd5e1',
                            background: 'rgba(15,23,42,.45)',
                            border: '1px solid rgba(148,163,184,.2)',
                            borderRadius: 8,
                            padding: 10
                        }
                    },
                        h('div', { style: { fontWeight: 700, marginBottom: 4 } }, run.updated_at ? new Date(run.updated_at).toLocaleString('sv-SE') : run.blob),
                        h('div', { style: { color: '#94a3b8' } }, `Artiklar: ${run.articles ?? 'okänt'}`),
                        topSources && h('div', { style: { color: '#94a3b8', marginTop: 4 } }, topSources),
                        run.error && h('div', { style: { color: '#f87171', marginTop: 4 } }, `Fel: ${run.error}`)
                    );
                })
            )
        ),
        !ops && !error && h('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'Laddar driftdata...')
    );
}

// ===== MAIN: SILLY SEASON VIEW =====
function SillySeasonView() {
    const [data, setData] = useState(typeof SILLY_SEASON_BASELINE !== 'undefined' ? SILLY_SEASON_BASELINE : null);
    const [showBreaking, setShowBreaking] = useState(false);
    const [breakingNews, setBreakingNews] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
    const breakingShown = useRef(false);
    const POLL_INTERVAL = 60 * 1000; // 1 min

    // Fetch data from API
    const fetchData = useCallback(async () => {
        try {
            const requestUrl = `https://loven-stats-api-324947473206.europe-west1.run.app/api/silly-season?ts=${Date.now()}`;
            const res = await fetch(requestUrl, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                },
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setLastRefresh(json._meta?.lastRefresh ? new Date(json._meta.lastRefresh) : new Date());
            }
        } catch (e) { console.warn('[SillySeason] fetch error:', e); }
    }, []);

    // Initial fetch + polling + refresh on focus/visibility
    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, POLL_INTERVAL);
        const onFocus = () => fetchData();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') fetchData();
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('online', onFocus);
        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('online', onFocus);
        };
    }, [fetchData]);

    // Breaking news trigger
    useEffect(() => {
        if (!data || breakingShown.current) return;
        const item = data.news_feed?.find(n => n.priority === 'breaking');
        if (item) {
            const t = setTimeout(() => {
                breakingShown.current = true;
                setBreakingNews(item);
                setShowBreaking(true);
                setTimeout(() => setShowBreaking(false), 8000);
            }, 5000);
            return () => clearTimeout(t);
        }
    }, [data]);

    if (!data) return h('div', { className: 'card', style: { textAlign: 'center', padding: 48 } },
        h('div', { style: { fontSize: 32 } }, '⏳'),
        h('div', { style: { color: '#94a3b8', marginTop: 12 } }, 'Laddar silly season-data...')
    );

    return h('div', { className: 'silly-season animate-fade' },
        h(BreakingToast, { show: showBreaking, news: breakingNews }),

        // Header + refresh status
        h('div', { className: 'silly-header' },
            h('div', { className: 'silly-badge' }, 'SILLY SEASON 2026'),
            h('h2', null, data.headline),
            h('p', null, `Björklöven bygger trupp för ${data.league} ${data.season}`),
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 } },
                h('span', { style: { fontSize: 11, color: '#64748b' } },
                    lastRefresh ? `Senast uppdaterad: ${lastRefresh.toLocaleTimeString('sv-SE')}` : ''),
                data._meta?.scrapedArticles != null && h('span', {
                    style: { fontSize: 10, color: '#34d399', background: 'rgba(52,211,153,.1)', padding: '2px 8px', borderRadius: 10 }
                }, `${data._meta.newArticles || 0} nya`),
            ),
        ),

        h(LiveFeed, { news: data.news_feed || [] }),
        h(SourcesOverview, { meta: data._meta }),
        h(OpsPanel),
    );
}


