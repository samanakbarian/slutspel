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
};
const TAG_LABELS = {
    BEKRÄFTAT_NYFÖRVÄRV: 'BEKRÄFTAT NYFÖRVÄRV',
    BEKRÄFTAD_FÖRLUST: 'BEKRÄFTAD FÖRLUST',
    HETT_RYKTE: 'HETT RYKTE',
    KONTRAKTSFÖRLÄNGNING: 'KONTRAKTSFÖRLÄNGNING',
    // FORUM_RYKTE: 'FORUMRYKTE', // Dold tillsvidare
};

const h = React.createElement;

// ===== 1. LIVE NEWS FEED =====
function LiveFeed({ news }) {
    const [filter, setFilter] = useState(null);
    const noForum = news.filter(n => n.tag !== 'FORUM_RYKTE');
    const filtered = filter ? noForum.filter(n => n.tag === filter) : noForum;

    return h('div', { className: 'card' },
        h('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 16 } }, '📰 Realtidsflödet'),
        // Filter pills
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
            h('button', {
                onClick: () => setFilter(null),
                style: {
                    padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700,
                    background: !filter ? '#d4a843' : 'rgba(255,255,255,.06)',
                    color: !filter ? '#111' : '#94a3b8', transition: 'all .2s'
                }
            }, 'Alla'),
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
                    key: item.id,
                    className: `feed-item ${item.priority === 'breaking' ? 'breaking' : ''}`,
                    style: { animationDelay: `${i * 60}ms` }
                },
                    h('div', { className: 'feed-dot', style: { background: TAG_COLORS[item.tag] || '#94a3b8' } }),
                    h('div', { style: { flex: 1 } },
                        h('div', { className: 'feed-meta' },
                            h('span', { className: `tag tag-${item.tag}` }, TAG_LABELS[item.tag] || item.tag),
                            h('span', null, `${item.date} ${item.time}`),
                        ),
                        h('div', { className: 'feed-title' }, item.title),
                        h('div', { className: 'feed-body' }, item.body),
                        h('div', { className: 'feed-source', style: { color: '#94a3b8' } }, `Källa: ${item.source || 'Okänd'}`),
                    )
                )
            ),
            filtered.length === 0 && h('div', { style: { textAlign: 'center', padding: 32, color: '#64748b' } }, 'Inga nyheter med detta filter.')
        )
    );
}

// ===== 2. RUMOR METER =====
function RumorGauge({ pct, size = 120 }) {
    const w = size, ht = size * 0.6;
    const r = w * 0.35;
    const cx = w / 2, cy = ht - 5;
    const arcLength = Math.PI * r;
    const dashOffset = arcLength * (1 - pct / 100);
    const getColor = (p) => {
        if (p >= 80) return '#34d399';
        if (p >= 50) return '#d4a843';
        if (p >= 30) return '#fb923c';
        return '#f87171';
    };
    return h('div', { className: 'rumor-gauge', style: { width: w, height: ht } },
        h('svg', { viewBox: `0 0 ${w} ${ht}`, style: { width: w, height: ht } },
            // Bg arc
            h('path', {
                d: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`,
                fill: 'none', stroke: '#1e293b', strokeWidth: 10, strokeLinecap: 'round'
            }),
            // Fill arc
            h('path', {
                d: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`,
                fill: 'none', stroke: getColor(pct), strokeWidth: 10, strokeLinecap: 'round',
                strokeDasharray: arcLength, strokeDashoffset: dashOffset,
                style: { transition: 'stroke-dashoffset .8s ease, stroke .3s' }
            }),
        ),
        h('div', { style: { position: 'absolute', bottom: 0, width: '100%', textAlign: 'center' } },
            h('div', { className: 'rumor-pct', style: { color: getColor(pct) } }, pct + '%'),
            h('div', { className: 'rumor-label' }, 'Sannolikhet')
        )
    );
}

function RumorMeter({ rumors }) {
    return h('div', { className: 'card' },
        h('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 16 } }, '🌡️ Ryktesbarometern'),
        h('div', { className: 'rumor-grid' },
            rumors.map((r, i) =>
                h('div', { key: i, className: 'rumor-card' },
                    h('div', { className: 'rumor-name' }, r.name),
                    h('div', { className: 'rumor-dest' },
                        r.to ? `→ ${r.to}` : `← ${r.from}`,
                    ),
                    h(RumorGauge, { pct: r.rumor_pct }),
                    h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 6 } }, r.note),
                    h('div', { className: 'rumor-source' },
                        h('span', { style: { color: r.rumor_pct >= 80 ? '#34d399' : r.rumor_pct >= 50 ? '#d4a843' : '#fb923c' } }, r.credibility),
                        ' · ', r.source
                    ),
                )
            )
        )
    );
}

// ===== 3. INTERACTIVE RINK =====
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

// ===== 4. FAN VOTE =====
function FanVoteCard({ player }) {
    const [votes, setVotes] = useState(() => VoteManager.getVotes(player.name));
    const [hasVoted, setHasVoted] = useState(() => VoteManager.hasVoted(player.name));

    const handleVote = (choice) => {
        if (hasVoted) return;
        const updated = VoteManager.vote(player.name, choice);
        setVotes(updated);
        setHasVoted(true);
    };

    const total = votes.extend + votes.release;
    const extPct = total > 0 ? Math.round(votes.extend / total * 100) : 50;
    const relPct = 100 - extPct;

    return h('div', { className: 'vote-card' },
        h('div', { className: 'vote-player-name' }, `#${player.number || '?'} ${player.name}`),
        h('div', { className: 'vote-player-info' }, `${player.pos} · Kontrakt t.o.m ${player.contractUntil}`),
        player.note && h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 12, fontStyle: 'italic' } }, player.note),

        // Buttons
        h('div', { className: 'vote-buttons' },
            h('button', {
                className: 'vote-btn extend', disabled: hasVoted,
                onClick: () => handleVote('extend')
            }, '✅ Förläng'),
            h('button', {
                className: 'vote-btn release', disabled: hasVoted,
                onClick: () => handleVote('release')
            }, '👋 Tack för allt'),
        ),

        // Result bar
        h('div', { className: 'vote-result-bar' },
            h('div', { className: 'vote-result-fill', style: { width: `${extPct}%`, background: 'linear-gradient(90deg,#059669,#34d399)', color: '#fff' } },
                extPct > 15 ? `${extPct}%` : ''),
            h('div', { className: 'vote-result-fill', style: { width: `${relPct}%`, background: 'linear-gradient(90deg,#f87171,#dc2626)', color: '#fff' } },
                relPct > 15 ? `${relPct}%` : ''),
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 6 } },
            h('span', { style: { fontSize: 10, color: '#34d399' } }, `${votes.extend} röster`),
            h('span', { style: { fontSize: 10, color: '#f87171' } }, `${votes.release} röster`),
        ),
        hasVoted && h('div', { style: { fontSize: 10, color: '#64748b', marginTop: 8 } }, '✓ Du har röstat'),
    );
}

function FanVote({ players }) {
    const votePlayers = players.filter(p => p.status === 'UTGÅENDE');
    return h('div', { className: 'card' },
        h('h3', { className: 'font-display', style: { color: '#d4a843', marginBottom: 16 } }, '🗳️ Förläng eller Släpp'),
        h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 16 } }, 'Rösta på vilka spelare med utgående kontrakt som borde stanna i Löven!'),
        h('div', { className: 'vote-grid' },
            votePlayers.map(p => h(FanVoteCard, { key: p.name, player: p }))
        ),
    );
}

// ===== 5. BREAKING NEWS TOAST =====
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

// ===== MAIN: SILLY SEASON VIEW =====
function SillySeasonView() {
    const [data, setData] = useState(typeof SILLY_SEASON_BASELINE !== 'undefined' ? SILLY_SEASON_BASELINE : null);
    const [showBreaking, setShowBreaking] = useState(false);
    const [breakingNews, setBreakingNews] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const breakingShown = useRef(false);
    const POLL_INTERVAL = 5 * 60 * 1000; // 5 min

    // Fetch data from API
    const fetchData = useCallback(async (manual) => {
        try {
            if (manual) setIsRefreshing(true);
            const res = await fetch('/api/silly-season');
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setLastRefresh(json._meta?.lastRefresh ? new Date(json._meta.lastRefresh) : new Date());
            }
        } catch (e) { console.warn('[SillySeason] fetch error:', e); }
        finally { if (manual) setIsRefreshing(false); }
    }, []);

    // Manual refresh via POST
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await fetch('/api/silly-season/refresh', { method: 'POST' });
            await fetchData(false);
        } catch (e) { console.warn('[SillySeason] refresh error:', e); }
        finally { setIsRefreshing(false); }
    }, [fetchData]);

    // Initial fetch + polling
    useEffect(() => {
        fetchData(false);
        const timer = setInterval(() => fetchData(false), POLL_INTERVAL);
        return () => clearInterval(timer);
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

    const signerade = data.roster.filter(p => p.status === 'SIGNERAD' || p.status === 'FÖRLÄNGD').length;
    const utgaende = data.roster.filter(p => p.status === 'UTGÅENDE').length;
    const lamnar = data.confirmed_departures.length;
    const nyforvarv = data.confirmed_signings.length;
    const allRumors = [...(data.hot_rumors_out||[]), ...(data.hot_rumors_in||[])].sort((a, b) => b.rumor_pct - a.rumor_pct);

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
                h('button', {
                    onClick: handleRefresh, disabled: isRefreshing,
                    style: {
                        background: 'rgba(212,168,67,.15)', border: '1px solid rgba(212,168,67,.3)',
                        color: '#d4a843', padding: '4px 12px', borderRadius: 12, cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, transition: 'all .2s',
                        opacity: isRefreshing ? .5 : 1,
                    }
                }, isRefreshing ? '⟳ Hämtar...' : '⟳ Uppdatera nu'),
            ),
        ),

        h('div', { className: 'silly-summary' },
            h('div', { className: 'silly-count-card' },
                h('div', { className: 'silly-count', style: { color: '#34d399' } }, signerade),
                h('div', { className: 'silly-count-label' }, 'Kontrakterade')),
            h('div', { className: 'silly-count-card' },
                h('div', { className: 'silly-count', style: { color: '#d4a843' } }, nyforvarv),
                h('div', { className: 'silly-count-label' }, 'Nyförvärv')),
            h('div', { className: 'silly-count-card' },
                h('div', { className: 'silly-count', style: { color: '#fb923c' } }, utgaende),
                h('div', { className: 'silly-count-label' }, 'Utgående')),
            h('div', { className: 'silly-count-card' },
                h('div', { className: 'silly-count', style: { color: '#f87171' } }, lamnar),
                h('div', { className: 'silly-count-label' }, 'Lämnar')),
        ),

        h(LiveFeed, { news: data.news_feed || [] }),
        h(RumorMeter, { rumors: allRumors }),
        h(InteractiveRink, { positions: data.rink_positions }),
        h(FanVote, { players: data.roster }),
    );
}
