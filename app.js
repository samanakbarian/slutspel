const { useState, useMemo } = React;
const { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter } = Recharts;

// ===== CONSTANTS =====
const GOLD = '#d4a843', GOLD_L = '#e8c56a', BLUE = '#3b82f6', GREEN = '#34d399', RED = '#f87171',
    MUTED = '#94a3b8', SURFACE = '#111827', SURF_L = '#1e293b';
const COLORS = [GOLD, BLUE, GREEN, '#a78bfa', '#fb923c', '#f472b6'];
const TT = { contentStyle: { background: SURFACE, border: `1px solid ${GOLD}`, borderRadius: 8, fontSize: 12 }, labelStyle: { color: GOLD } };

// ===== UTILITY FUNCTIONS =====
function pct(a, b) { return b > 0 ? (a / b * 100) : 0; }
function secToToi(s) { const m = Math.floor(s / 60), ss = Math.round(s % 60); return `${m}:${ss < 10 ? '0' : ''}${ss}`; }

function calcTeamTotals(skaters, goalies) {
    const t = { sog: 0, pim: 0, hits: 0, fow: 0, fol: 0, ppg: 0, goals: 0, assists: 0, points: 0, shotsWide: 0, ppsog: 0 };
    skaters.forEach(s => {
        t.sog += s.sog; t.pim += s.pim; t.hits += s.hits; t.fow += s.fow; t.fol += s.fol;
        t.ppg += s.ppg; t.goals += s.goals; t.assists += s.assists; t.points += s.goals + s.assists;
        t.shotsWide += s.shotsWide; t.ppsog += s.ppsog;
    });
    t.foPct = pct(t.fow, t.fow + t.fol);
    t.ga = goalies.reduce((s, g) => s + g.ga, 0);
    t.svs = goalies.reduce((s, g) => s + g.svs, 0);
    t.soga = goalies.reduce((s, g) => s + g.soga, 0);
    t.svsPct = pct(t.svs, t.soga);
    return t;
}

function groupByLine(skaters) {
    const lines = {};
    skaters.forEach(s => { if (!lines[s.line]) lines[s.line] = []; lines[s.line].push(s); });
    return Object.entries(lines).sort((a, b) => a[0] - b[0]).map(([n, p]) => ({
        line: Number(n),
        forwards: p.filter(x => ['LW', 'CE', 'RW'].includes(x.pos)).sort((a, b) => ['LW', 'CE', 'RW'].indexOf(a.pos) - ['LW', 'CE', 'RW'].indexOf(b.pos)),
        defense: p.filter(x => ['LD', 'RD'].includes(x.pos)).sort((a, b) => a.pos === 'LD' ? -1 : 1),
        all: p,
        totals: {
            goals: p.reduce((s, x) => s + x.goals, 0), plusMinus: p.reduce((s, x) => s + x.plusMinus, 0),
            sog: p.reduce((s, x) => s + x.sog, 0), hits: p.reduce((s, x) => s + x.hits, 0),
            pim: p.reduce((s, x) => s + x.pim, 0),
            toi: secToToi(p.reduce((s, x) => s + x.toiSeconds, 0) / Math.max(p.length, 1))
        }
    }));
}

function buildSeasonStats(matches, side) {
    const map = {};
    matches.forEach(m => {
        m[side].skaters.forEach(s => {
            const id = `${s.number}_${s.name}`;
            if (!map[id]) map[id] = {
                name: s.name, number: s.number, pos: s.pos, gp: 0,
                totals: { goals: 0, assists: 0, points: 0, sog: 0, pim: 0, hits: 0, plusMinus: 0, fow: 0, fol: 0, ppg: 0, toiSeconds: 0 },
                perMatch: []
            };
            const p = map[id]; p.gp++;
            Object.keys(p.totals).forEach(k => { if (k in s) p.totals[k] += s[k]; });
            p.totals.points = p.totals.goals + p.totals.assists;
            p.perMatch.push({ matchNum: m.matchNumber, ...s });
        });
    });
    return Object.values(map).sort((a, b) => b.totals.points - a.totals.points);
}

function getSeriesScore(matches) {
    let home = 0, away = 0;
    matches.forEach(m => { if (m.result.home > m.result.away) home++; else away++; });
    return { home, away };
}

// ===== SMALL COMPONENTS =====
function HeatVal({ val }) {
    if (val > 0) return React.createElement('span', { className: 'heat-pos' }, '+' + val);
    if (val < 0) return React.createElement('span', { className: 'heat-neg' }, val);
    return React.createElement('span', { className: 'heat-zero' }, '0');
}

function StatCard({ label, value, sub }) {
    return React.createElement('div', { className: 'stat-card animate-scale' },
        React.createElement('div', { className: 'stat-label' }, label),
        React.createElement('div', { className: 'stat-value' }, value),
        sub && React.createElement('div', { className: 'stat-sub' }, sub)
    );
}

// ===== SERIES PROGRESS BAR =====
function SeriesProgress({ matches, bestOf }) {
    const score = getSeriesScore(matches);
    const dots = [];
    for (let i = 1; i <= bestOf; i++) {
        const m = matches.find(x => x.matchNumber === i);
        let cls = 'series-dot ';
        let label = i;
        if (m) {
            cls += m.result.home > m.result.away ? 'won-home' : 'won-away';
            label = `${m.result.home}-${m.result.away}`;
        } else { cls += 'upcoming'; }
        dots.push(React.createElement('div', { key: i, className: cls, title: `Match ${i}` }, label));
    }
    return React.createElement('div', { className: 'series-bar' },
        React.createElement('span', { style: { fontWeight: 700, color: GOLD, fontSize: 13 } }, SERIES_INFO.teamHomeShort),
        React.createElement('span', { style: { fontFamily: 'Outfit', fontSize: 20, fontWeight: 900, color: '#fff' } },
            `${score.home} – ${score.away}`),
        React.createElement('span', { style: { fontWeight: 700, color: BLUE, fontSize: 13 } }, SERIES_INFO.teamAwayShort),
        React.createElement('div', { style: { display: 'flex', gap: 6, marginLeft: 12 } }, dots)
    );
}

// ===== RESULT BANNER =====
function ResultBanner({ match, teamLabel }) {
    const won = match.result.home > match.result.away;
    const isHome = teamLabel === 'home';
    return React.createElement('div', { className: `result-banner ${won === isHome ? 'win' : 'loss'} animate-fade` },
        React.createElement('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: MUTED } },
            `Match ${match.matchNumber} · ${match.date}`),
        React.createElement('div', { className: 'result-score' },
            React.createElement('div', null,
                React.createElement('div', { className: 'result-team', style: { color: GOLD } }, SERIES_INFO.teamHomeShort),
            ),
            React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12 } },
                React.createElement('span', { className: 'score-num', style: { color: won ? GREEN : '#cbd5e1' } }, match.result.home),
                React.createElement('span', { style: { color: MUTED, fontSize: 24 } }, '-'),
                React.createElement('span', { className: 'score-num', style: { color: !won ? RED : '#cbd5e1' } }, match.result.away),
            ),
            React.createElement('div', null,
                React.createElement('div', { className: 'result-team', style: { color: BLUE } }, SERIES_INFO.teamAwayShort),
            ),
        ),
        React.createElement('div', { style: { marginTop: 12 } },
            React.createElement('span', {
                style: {
                    display: 'inline-block', padding: '4px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: won === isHome ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)',
                    color: won === isHome ? GREEN : RED
                }
            }, won === isHome ? 'VINST' : 'FÖRLUST')
        )
    );
}

// ===== MOMENTUM BAR =====
function MomentumBar({ homeVal, awayVal, label, homeLabel, awayLabel }) {
    const total = Math.max(homeVal + awayVal, 1);
    const homePct = (homeVal / total * 100);
    return React.createElement('div', { style: { marginBottom: 12 } },
        label && React.createElement('div', { style: { fontSize: 10, color: MUTED, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 } }, label),
        React.createElement('div', { className: 'momentum-bar' },
            React.createElement('div', { className: 'momentum-fill', style: { width: `${homePct}%`, background: GOLD, justifyContent: 'flex-start', color: '#111' } },
                homeVal > 0 ? `${homeLabel || SERIES_INFO.teamHomeShort} ${homeVal}` : ''
            ),
            React.createElement('div', { className: 'momentum-fill', style: { width: `${100 - homePct}%`, background: BLUE, justifyContent: 'flex-end', color: '#fff' } },
                awayVal > 0 ? `${awayVal} ${awayLabel || SERIES_INFO.teamAwayShort}` : ''
            ),
        )
    );
}

// ===== MATCH VIEW =====
function MatchView({ match, teamLabel }) {
    const team = match[teamLabel];
    const opp = match[teamLabel === 'home' ? 'away' : 'home'];
    const teamName = teamLabel === 'home' ? SERIES_INFO.teamHomeShort : SERIES_INFO.teamAwayShort;
    const oppName = teamLabel === 'home' ? SERIES_INFO.teamAwayShort : SERIES_INFO.teamHomeShort;
    const tT = calcTeamTotals(team.skaters, team.goalies);
    const oT = calcTeamTotals(opp.skaters, opp.goalies);
    const lines = groupByLine(team.skaters);

    // Top performers
    const sorted = [...team.skaters].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists));
    const topScorers = sorted.slice(0, 3);
    const topHitter = [...team.skaters].sort((a, b) => b.hits - a.hits)[0];
    const topShooter = [...team.skaters].sort((a, b) => b.sog - a.sog)[0];
    const bestGk = team.goalies.filter(g => g.soga > 0).sort((a, b) => b.svsPct - a.svsPct)[0];

    // Comparison data
    const compData = [
        { name: 'SOG', [teamName]: tT.sog, [oppName]: oT.sog },
        { name: 'Hits', [teamName]: tT.hits, [oppName]: oT.hits },
        { name: 'PIM', [teamName]: tT.pim, [oppName]: oT.pim },
        { name: 'PPG', [teamName]: tT.ppg, [oppName]: oT.ppg },
        { name: 'FOW', [teamName]: tT.fow, [oppName]: oT.fow },
    ];
    const teamColor = teamLabel === 'home' ? GOLD : BLUE;
    const oppColor = teamLabel === 'home' ? BLUE : GOLD;

    return React.createElement('div', { className: 'animate-fade', style: { display: 'flex', flexDirection: 'column', gap: 20 } },
        // Result
        React.createElement(ResultBanner, { match, teamLabel }),

        // Quick Stats
        React.createElement('div', { className: 'grid-4' },
            React.createElement(StatCard, {
                label: 'Poängtoppen', value: topScorers[0] ? `${topScorers[0].name}` : '-',
                sub: topScorers[0] ? `${topScorers[0].goals}M + ${topScorers[0].assists}A` : null
            }),
            React.createElement(StatCard, {
                label: 'Målvakt SVS%', value: bestGk ? bestGk.svsPct.toFixed(1) + '%' : '-',
                sub: bestGk ? bestGk.name : null
            }),
            React.createElement(StatCard, {
                label: 'Lagskott (SOG)', value: `${tT.sog} / ${oT.sog}`,
                sub: `${teamName} vs ${oppName}`
            }),
            React.createElement(StatCard, {
                label: 'Lagdisciplin', value: `${tT.pim} PIM`,
                sub: `Totalt ${teamName}`
            }),
        ),

        // SOG Momentum
        React.createElement(MomentumBar, {
            homeVal: tT.sog, awayVal: oT.sog, label: 'Skott på mål (SOG)',
            homeLabel: teamLabel === 'home' ? SERIES_INFO.teamHomeShort : SERIES_INFO.teamAwayShort,
            awayLabel: teamLabel === 'home' ? SERIES_INFO.teamAwayShort : SERIES_INFO.teamHomeShort
        }),

        // Team Comparison Chart
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 16 } }, 'Lagjämförelse'),
            React.createElement(ResponsiveContainer, { width: '100%', height: 260 },
                React.createElement(BarChart, { data: compData, margin: { top: 5, right: 20, left: 0, bottom: 5 } },
                    React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: SURF_L }),
                    React.createElement(XAxis, { dataKey: 'name', stroke: MUTED, fontSize: 12 }),
                    React.createElement(YAxis, { stroke: MUTED, fontSize: 12 }),
                    React.createElement(Tooltip, { ...TT }),
                    React.createElement(Legend, { wrapperStyle: { fontSize: 12 } }),
                    React.createElement(Bar, { dataKey: teamName, fill: teamColor, radius: [4, 4, 0, 0] }),
                    React.createElement(Bar, { dataKey: oppName, fill: oppColor, radius: [4, 4, 0, 0] }),
                )
            ),
            React.createElement('div', { className: 'grid-4', style: { marginTop: 16 } },
                React.createElement(StatCard, { label: 'FO%', value: tT.foPct.toFixed(1) + '%', sub: `vs ${oT.foPct.toFixed(1)}%` }),
                React.createElement(StatCard, { label: 'SVS%', value: tT.svsPct.toFixed(1) + '%', sub: `vs ${oT.svsPct.toFixed(1)}%` }),
                React.createElement(StatCard, { label: 'Mål', value: tT.goals, sub: `vs ${oT.goals}` }),
                React.createElement(StatCard, { label: 'Skott', value: tT.sog, sub: `vs ${oT.sog}` }),
            ),
        ),

        // Player Lineup
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 16 } }, 'Spelaruppställning'),
            lines.map(ln =>
                React.createElement('div', { key: ln.line, style: { background: 'rgba(255,255,255,.02)', borderRadius: 12, padding: 16, marginBottom: 12 } },
                    React.createElement('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: MUTED, marginBottom: 10 } }, `Kedja ${ln.line}`),
                    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 8 } },
                        ln.forwards.map(s =>
                            React.createElement('div', { key: s.number, className: 'player-tile' },
                                React.createElement('div', { className: 'player-num', style: { color: teamColor } }, `#${s.number}`),
                                React.createElement('div', { className: 'player-name' }, s.name),
                                React.createElement('div', { className: 'player-pos' }, s.pos),
                                React.createElement('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4, fontSize: 11 } },
                                    React.createElement('span', { style: { color: GREEN } }, s.goals + 'G'),
                                    React.createElement('span', { style: { color: BLUE } }, s.assists + 'A'),
                                    React.createElement(HeatVal, { val: s.plusMinus }),
                                ),
                            )
                        )
                    ),
                    ln.defense.length > 0 && React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' } },
                        ln.defense.map(s =>
                            React.createElement('div', { key: s.number, className: 'player-tile', style: { borderColor: 'rgba(59,130,246,.2)' } },
                                React.createElement('div', { className: 'player-num', style: { color: BLUE } }, `#${s.number}`),
                                React.createElement('div', { className: 'player-name' }, s.name),
                                React.createElement('div', { className: 'player-pos' }, s.pos),
                                React.createElement('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4, fontSize: 11 } },
                                    React.createElement('span', { style: { color: GREEN } }, s.goals + 'G'),
                                    React.createElement('span', { style: { color: BLUE } }, s.assists + 'A'),
                                    React.createElement(HeatVal, { val: s.plusMinus }),
                                ),
                            )
                        )
                    ),
                )
            ),
            // Goalies
            team.goalies.filter(g => g.soga > 0).length > 0 && React.createElement('div', { style: { background: 'rgba(255,255,255,.02)', borderRadius: 12, padding: 16 } },
                React.createElement('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: MUTED, marginBottom: 10 } }, 'Målvakt'),
                React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' } },
                    team.goalies.filter(g => g.soga > 0).map(g =>
                        React.createElement('div', { key: g.number, className: 'player-tile', style: { borderColor: 'rgba(167,139,250,.2)', minWidth: 160 } },
                            React.createElement('div', { className: 'player-num', style: { color: '#a78bfa' } }, `#${g.number}`),
                            React.createElement('div', { className: 'player-name' }, g.name),
                            React.createElement('div', { style: { display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8, fontSize: 11 } },
                                React.createElement('span', null, React.createElement('span', { style: { color: MUTED } }, 'SVS% '), React.createElement('span', { style: { color: GOLD, fontWeight: 700 } }, g.svsPct.toFixed(1) + '%')),
                                React.createElement('span', null, React.createElement('span', { style: { color: MUTED } }, 'SVS '), React.createElement('span', { style: { color: GREEN } }, g.svs)),
                                React.createElement('span', null, React.createElement('span', { style: { color: MUTED } }, 'GA '), React.createElement('span', { style: { color: RED } }, g.ga)),
                            ),
                        )
                    )
                ),
            ),
        ),

        // Line Analysis
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 16 } }, 'Linjeanalys'),
            React.createElement('div', { className: 'table-wrap' },
                React.createElement('table', null,
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            ['Kedja', 'Mål', '+/-', 'SOG', 'Hits', 'PIM', 'Snitt TOI'].map(h =>
                                React.createElement('th', { key: h, style: { textAlign: h === 'Kedja' ? 'left' : 'center' } }, h)
                            )
                        )
                    ),
                    React.createElement('tbody', null,
                        lines.map(ln => {
                            const best = Math.max(...lines.map(l => l.totals.plusMinus));
                            return React.createElement('tr', { key: ln.line },
                                React.createElement('td', { style: { fontWeight: 600 } }, `Kedja ${ln.line}`),
                                React.createElement('td', { style: { textAlign: 'center', fontFamily: 'Outfit', color: GOLD } }, ln.totals.goals),
                                React.createElement('td', { style: { textAlign: 'center' } }, React.createElement(HeatVal, { val: ln.totals.plusMinus })),
                                React.createElement('td', { style: { textAlign: 'center' } }, ln.totals.sog),
                                React.createElement('td', { style: { textAlign: 'center' } }, ln.totals.hits),
                                React.createElement('td', { style: { textAlign: 'center' } }, ln.totals.pim),
                                React.createElement('td', { style: { textAlign: 'center', color: MUTED } }, ln.totals.toi),
                            );
                        })
                    ),
                )
            ),
        ),

        // TOI Distribution
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 16 } }, 'Istidsfördelning'),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' } },
                React.createElement(ResponsiveContainer, { width: 240, height: 240 },
                    React.createElement(PieChart, null,
                        React.createElement(Pie, {
                            data: lines.map(ln => ({ name: `Kedja ${ln.line}`, value: ln.all.reduce((s, x) => s + x.toiSeconds, 0) })),
                            dataKey: 'value', cx: '50%', cy: '50%', innerRadius: 50, outerRadius: 95, paddingAngle: 3,
                            label: ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`
                        },
                            lines.map((_, i) => React.createElement(Cell, { key: i, fill: COLORS[i % COLORS.length] }))
                        ),
                        React.createElement(Tooltip, { ...TT, formatter: v => secToToi(v) }),
                    )
                ),
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                    lines.map((ln, i) =>
                        React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8 } },
                            React.createElement('div', { style: { width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] } }),
                            React.createElement('span', { style: { fontSize: 13, color: '#cbd5e1' } }, `Kedja ${ln.line}`),
                            React.createElement('span', { style: { fontSize: 13, fontFamily: 'Outfit', color: MUTED } },
                                secToToi(ln.all.reduce((s, x) => s + x.toiSeconds, 0)) + ' total'),
                        )
                    )
                ),
            ),
        ),

        // Top Performers
        React.createElement('div', { className: 'grid-4' },
            topScorers[0] && React.createElement('div', { className: 'stat-card card-glow' },
                React.createElement('div', { style: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: MUTED, marginBottom: 4 } }, 'MVP'),
                React.createElement('div', { style: { color: GOLD, fontFamily: 'Outfit', fontSize: '1.1rem' } }, `#${topScorers[0].number}`),
                React.createElement('div', { style: { fontSize: 12, color: '#e2e8f0' } }, topScorers[0].name),
                React.createElement('div', { style: { fontSize: 11, color: MUTED, marginTop: 4 } }, `${topScorers[0].goals}G ${topScorers[0].assists}A`),
            ),
            topShooter && React.createElement('div', { className: 'stat-card' },
                React.createElement('div', { style: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: MUTED, marginBottom: 4 } }, 'Flest skott'),
                React.createElement('div', { style: { color: BLUE, fontFamily: 'Outfit', fontSize: '1.1rem' } }, `#${topShooter.number}`),
                React.createElement('div', { style: { fontSize: 12, color: '#e2e8f0' } }, topShooter.name),
                React.createElement('div', { style: { fontSize: 11, color: MUTED, marginTop: 4 } }, `${topShooter.sog} SOG`),
            ),
            topHitter && React.createElement('div', { className: 'stat-card' },
                React.createElement('div', { style: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: MUTED, marginBottom: 4 } }, 'Flest tacklingar'),
                React.createElement('div', { style: { color: GREEN, fontFamily: 'Outfit', fontSize: '1.1rem' } }, `#${topHitter.number}`),
                React.createElement('div', { style: { fontSize: 12, color: '#e2e8f0' } }, topHitter.name),
                React.createElement('div', { style: { fontSize: 11, color: MUTED, marginTop: 4 } }, `${topHitter.hits} Hits`),
            ),
            bestGk && React.createElement('div', { className: 'stat-card' },
                React.createElement('div', { style: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: MUTED, marginBottom: 4 } }, 'Målvakt'),
                React.createElement('div', { style: { color: '#a78bfa', fontFamily: 'Outfit', fontSize: '1.1rem' } }, `#${bestGk.number}`),
                React.createElement('div', { style: { fontSize: 12, color: '#e2e8f0' } }, bestGk.name),
                React.createElement('div', { style: { fontSize: 11, color: MUTED, marginTop: 4 } }, `${bestGk.svsPct.toFixed(1)}% SVS`),
            ),
        ),
    );
}

// ===== VISUAL LEADERBOARD BAR =====
function LeaderBar({ rank, name, number, pos, value, maxVal, label, color, accent }) {
    const barPct = maxVal > 0 ? (value / maxVal * 100) : 0;
    const medals = ['🥇', '🥈', '🥉'];
    return React.createElement('div', {
        style: {
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,.04)'
        }
    },
        React.createElement('div', { style: { width: 28, textAlign: 'center', fontSize: rank < 3 ? 18 : 13, color: rank < 3 ? '#fff' : MUTED } },
            rank < 3 ? medals[rank] : (rank + 1)),
        React.createElement('div', { style: { flex: '0 0 140px', minWidth: 0 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 4 } },
                React.createElement('span', { style: { color: accent || GOLD, fontWeight: 700, fontSize: 13 } }, `#${number}`),
                React.createElement('span', { style: { color: '#e2e8f0', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name),
            ),
            React.createElement('div', { style: { fontSize: 10, color: MUTED } }, pos),
        ),
        React.createElement('div', { style: { flex: 1, position: 'relative', height: 24, background: SURF_L, borderRadius: 6, overflow: 'hidden' } },
            React.createElement('div', {
                style: {
                    position: 'absolute', left: 0, top: 0, height: '100%', width: `${barPct}%`,
                    background: `linear-gradient(90deg,${color || GOLD},${accent || GOLD_L})`, borderRadius: 6,
                    transition: 'width .6s ease'
                }
            }),
            React.createElement('div', {
                style: {
                    position: 'absolute', right: 8, top: 0, height: '100%', display: 'flex', alignItems: 'center',
                    fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.5)'
                }
            },
                typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value,
                label ? ' ' + label : ''),
        ),
    );
}

// ===== SEASON VIEW =====
function SeasonView({ matches, teamLabel }) {
    const [activeCategory, setActiveCategory] = useState('points');
    const side = teamLabel;
    const teamName = side === 'home' ? SERIES_INFO.teamHomeShort : SERIES_INFO.teamAwayShort;

    const players = useMemo(() => buildSeasonStats(matches, side), [matches, side]);

    const categories = [
        { k: 'points', l: 'Poäng', icon: '⭐', color: GOLD, accent: GOLD_L },
        { k: 'goals', l: 'Mål', icon: '🥅', color: '#f97316', accent: '#fb923c' },
        { k: 'assists', l: 'Assist', icon: '🤝', color: BLUE, accent: '#93c5fd' },
        { k: 'sog', l: 'Skott', icon: '🎯', color: '#8b5cf6', accent: '#a78bfa' },
        { k: 'plusMinus', l: '+/-', icon: '📊', color: GREEN, accent: '#6ee7b7' },
        { k: 'hits', l: 'Hits', icon: '💪', color: '#ef4444', accent: '#f87171' },
    ];

    const getSorted = (key) => [...players].sort((a, b) => b.totals[key] - a.totals[key]);
    const activeCat = categories.find(c => c.k === activeCategory);
    const activeSorted = getSorted(activeCategory);
    const maxVal = activeSorted.length > 0 ? Math.max(activeSorted[0].totals[activeCategory], 1) : 1;

    // Streak
    let streak = 0, streakType = '';
    for (let i = matches.length - 1; i >= 0; i--) {
        const w = matches[i].result.home > matches[i].result.away;
        const isWin = side === 'home' ? w : !w;
        if (i === matches.length - 1) { streakType = isWin ? 'W' : 'L'; streak = 1; }
        else if ((isWin && streakType === 'W') || (!isWin && streakType === 'L')) streak++;
        else break;
    }

    // Match timeline
    const timeline = matches.map(m => {
        const homeGoals = m.result.home, awayGoals = m.result.away;
        const teamGoals = side === 'home' ? homeGoals : awayGoals;
        const oppGoals = side === 'home' ? awayGoals : homeGoals;
        return { name: `M${m.matchNumber}`, diff: teamGoals - oppGoals, won: teamGoals > oppGoals, team: teamGoals, opp: oppGoals };
    });

    // Top 3 podium
    const top3 = getSorted('points').slice(0, 3);

    // Category leaders data for bar chart
    const catLeaderData = categories.filter(c => c.k !== 'plusMinus').map(c => {
        const top = getSorted(c.k)[0];
        return top ? { name: c.l, [teamName]: top.totals[c.k], player: `#${top.number} ${top.name}` } : null;
    }).filter(Boolean);

    return React.createElement('div', { className: 'animate-fade', style: { display: 'flex', flexDirection: 'column', gap: 20 } },
        // Streak + Timeline
        React.createElement('div', { className: 'grid-2', style: { gap: 20 } },
            React.createElement('div', { className: 'card', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                React.createElement('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: MUTED, marginBottom: 8 } }, 'Aktuell svit'),
                React.createElement('div', {
                    style: {
                        fontFamily: 'Outfit', fontSize: '3rem', fontWeight: 900,
                        color: streakType === 'W' ? GREEN : RED,
                        textShadow: streakType === 'W' ? '0 0 20px rgba(52,211,153,.4)' : '0 0 20px rgba(248,113,113,.4)'
                    }
                },
                    streak + streakType),
            ),
            React.createElement('div', { className: 'card' },
                React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 12 } }, 'Matchresultat'),
                React.createElement(ResponsiveContainer, { width: '100%', height: 180 },
                    React.createElement(BarChart, { data: timeline },
                        React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: SURF_L }),
                        React.createElement(XAxis, { dataKey: 'name', stroke: MUTED, fontSize: 11 }),
                        React.createElement(YAxis, { stroke: MUTED, fontSize: 11 }),
                        React.createElement(Tooltip, { ...TT }),
                        React.createElement(Bar, { dataKey: 'diff', radius: [4, 4, 0, 0] },
                            timeline.map((e, i) => React.createElement(Cell, { key: i, fill: e.won ? GREEN : RED }))
                        ),
                    )
                ),
                React.createElement('div', { style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' } },
                    timeline.map((e, i) => React.createElement('span', {
                        key: i, style: {
                            fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 600,
                            background: e.won ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
                            color: e.won ? GREEN : RED
                        }
                    }, `${e.team}-${e.opp}`))
                ),
            ),
        ),

        // === PODIUM ===
        top3.length >= 3 && React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 20, textAlign: 'center' } },
                `🏆 Topp 3 Poängplockare — ${teamName}`),
            React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, flexWrap: 'wrap' } },
                // 2nd place
                ...[1, 0, 2].map(idx => {
                    const p = top3[idx]; if (!p) return null;
                    const heights = [200, 160, 130]; const sizes = [56, 44, 40]; const fontsz = ['2.2rem', '1.6rem', '1.4rem'];
                    const medals = ['🥇', '🥈', '🥉']; const glows = ['0 0 30px rgba(212,168,67,.4)', '0 0 20px rgba(192,192,192,.3)', '0 0 15px rgba(205,127,50,.3)'];
                    const bgColors = ['linear-gradient(180deg,rgba(212,168,67,.15),rgba(212,168,67,.03))', 'linear-gradient(180deg,rgba(192,192,192,.1),rgba(192,192,192,.02))', 'linear-gradient(180deg,rgba(205,127,50,.1),rgba(205,127,50,.02))'];
                    return React.createElement('div', {
                        key: idx, style: {
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            width: idx === 0 ? 180 : 140,
                            background: bgColors[idx],
                            border: `1px solid ${idx === 0 ? 'rgba(212,168,67,.25)' : idx === 1 ? 'rgba(192,192,192,.2)' : 'rgba(205,127,50,.2)'}`,
                            borderRadius: 16, padding: '20px 12px',
                            boxShadow: glows[idx],
                            transition: 'transform .2s',
                        }
                    },
                        React.createElement('div', { style: { fontSize: sizes[idx], marginBottom: 8 } }, medals[idx]),
                        React.createElement('div', {
                            style: {
                                fontFamily: 'Outfit', fontSize: fontsz[idx], fontWeight: 900,
                                color: idx === 0 ? GOLD : idx === 1 ? '#c0c0c0' : '#cd7f32'
                            }
                        }, `#${p.number}`),
                        React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginTop: 4, textAlign: 'center' } }, p.name),
                        React.createElement('div', { style: { fontSize: 11, color: MUTED, marginTop: 2 } }, p.pos),
                        React.createElement('div', { style: { display: 'flex', gap: 12, marginTop: 12 } },
                            React.createElement('div', { style: { textAlign: 'center' } },
                                React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 800, color: GREEN } }, p.totals.goals),
                                React.createElement('div', { style: { fontSize: 9, color: MUTED } }, 'MÅL')),
                            React.createElement('div', { style: { textAlign: 'center' } },
                                React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 800, color: BLUE } }, p.totals.assists),
                                React.createElement('div', { style: { fontSize: 9, color: MUTED } }, 'ASSIST')),
                            React.createElement('div', { style: { textAlign: 'center' } },
                                React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 800, color: GOLD } }, p.totals.points),
                                React.createElement('div', { style: { fontSize: 9, color: MUTED } }, 'PTS')),
                        ),
                        React.createElement('div', { style: { marginTop: 8 } }, React.createElement(HeatVal, { val: p.totals.plusMinus })),
                    );
                })
            ),
        ),

        // === CATEGORY SELECTOR + VISUAL LEADERBOARD ===
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 16 } },
                `${activeCat.icon} ${activeCat.l}liga — ${teamName}`),
            // Category pills
            React.createElement('div', { style: { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' } },
                categories.map(c =>
                    React.createElement('button', {
                        key: c.k, onClick: () => setActiveCategory(c.k), style: {
                            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: activeCategory === c.k ? c.color : 'rgba(255,255,255,.06)',
                            color: activeCategory === c.k ? '#111' : '#94a3b8',
                            transition: 'all .2s',
                        }
                    }, c.icon + ' ' + c.l)
                )
            ),
            // Leaderboard bars
            activeSorted.filter(p => p.totals[activeCategory] !== 0 || activeCategory === 'plusMinus').slice(0, 10).map((p, i) =>
                React.createElement(LeaderBar, {
                    key: p.number + '_' + p.name, rank: i, name: p.name, number: p.number, pos: p.pos,
                    value: p.totals[activeCategory], maxVal, color: activeCat.color, accent: activeCat.accent
                })
            ),
        ),

        // === CATEGORY LEADERS OVERVIEW ===
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 16 } }, '🏅 Kategorivinnare'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 } },
                categories.map(c => {
                    const top = getSorted(c.k)[0]; if (!top) return null;
                    return React.createElement('div', {
                        key: c.k, style: {
                            background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 16, textAlign: 'center',
                            border: `1px solid ${c.color}22`, transition: 'all .2s', cursor: 'pointer',
                        }, onClick: () => setActiveCategory(c.k)
                    },
                        React.createElement('div', { style: { fontSize: 24, marginBottom: 4 } }, c.icon),
                        React.createElement('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: MUTED, marginBottom: 4 } }, c.l),
                        React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 900, color: c.color } },
                            top.totals[c.k] > 0 ? '+' + top.totals[c.k] : top.totals[c.k]),
                        React.createElement('div', { style: { fontSize: 11, color: '#e2e8f0', marginTop: 4 } }, `#${top.number} ${top.name}`),
                    );
                })
            ),
        ),

        // Radar chart for top player
        activeSorted.length > 0 && React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 16 } },
                `Spelar-DNA: ${activeSorted[0].name}`),
            React.createElement('div', { style: { display: 'flex', justifyContent: 'center' } },
                React.createElement(ResponsiveContainer, { width: 350, height: 300 },
                    React.createElement(RadarChart, {
                        data: (() => {
                            const p = activeSorted[0], gp = Math.max(p.gp, 1), t = p.totals;
                            const maxPts = Math.max(...players.map(x => x.totals.points / Math.max(x.gp, 1)), 1);
                            const maxSog = Math.max(...players.map(x => x.totals.sog / Math.max(x.gp, 1)), 1);
                            const maxHits = Math.max(...players.map(x => x.totals.hits / Math.max(x.gp, 1)), 1);
                            const norm = (v, mx) => Math.min(Math.round(v / mx * 100), 100);
                            return [
                                { stat: 'Poäng', value: norm(t.points / gp, maxPts) },
                                { stat: 'Skott', value: norm(t.sog / gp, maxSog) },
                                { stat: 'Fysik', value: norm(t.hits / gp, Math.max(maxHits, 1)) },
                                { stat: 'Tekning', value: p.pos === 'CE' ? Math.round(pct(t.fow, t.fow + t.fol)) : 0 },
                                { stat: 'Disciplin', value: Math.max(Math.round(100 - t.pim / gp * 15), 0) },
                                { stat: '+/-', value: Math.min(Math.max(t.plusMinus / gp * 20 + 50, 0), 100) },
                            ];
                        })()
                    },
                        React.createElement(PolarGrid, { stroke: SURF_L }),
                        React.createElement(PolarAngleAxis, { dataKey: 'stat', tick: { fill: MUTED, fontSize: 11 } }),
                        React.createElement(PolarRadiusAxis, { angle: 30, domain: [0, 100], tick: false, axisLine: false }),
                        React.createElement(Radar, { dataKey: 'value', stroke: GOLD, fill: GOLD, fillOpacity: .25, strokeWidth: 2 }),
                    )
                )
            ),
        ),
    );
}

// ===== DEEP ANALYSIS VIEW =====
function CompBar({ label, homeVal, awayVal, homeColor, awayColor, format, invert }) {
    const hv = typeof homeVal === 'number' ? homeVal : 0, av = typeof awayVal === 'number' ? awayVal : 0;
    const max = Math.max(hv, av, 1);
    const fmt = v => format ? format(v) : (Number.isInteger(v) ? v : v.toFixed(1));
    let hWin = hv > av; if (invert) hWin = hv < av;
    const neutral = Math.abs(hv - av) < 0.01;
    return React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
            React.createElement('span', { style: { fontSize: 12, fontWeight: !neutral && hWin ? 700 : 400, color: !neutral && hWin ? (homeColor || GOLD) : MUTED } }, fmt(hv)),
            React.createElement('span', { style: { fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 } }, label),
            React.createElement('span', { style: { fontSize: 12, fontWeight: !neutral && !hWin ? 700 : 400, color: !neutral && !hWin ? (awayColor || BLUE) : MUTED } }, fmt(av)),
        ),
        React.createElement('div', { style: { display: 'flex', gap: 3, height: 6 } },
            React.createElement('div', { style: { flex: 1, display: 'flex', justifyContent: 'flex-end' } },
                React.createElement('div', { style: { width: `${hv / max * 100}%`, background: homeColor || GOLD, borderRadius: 3, transition: 'width .4s' } })
            ),
            React.createElement('div', { style: { flex: 1 } },
                React.createElement('div', { style: { width: `${av / max * 100}%`, background: awayColor || BLUE, borderRadius: 3, transition: 'width .4s' } })
            ),
        )
    );
}

function DeepAnalysisView({ match }) {
    const h = match.home, a = match.away;
    const hT = calcTeamTotals(h.skaters, h.goalies);
    const aT = calcTeamTotals(a.skaters, a.goalies);
    const HN = SERIES_INFO.teamHomeShort, AN = SERIES_INFO.teamAwayShort;

    // Corsi-lite: SOG + Shots Wide
    const hCorsi = hT.sog + hT.shotsWide, aCorsi = aT.sog + aT.shotsWide;
    const hCorsiPct = pct(hCorsi, hCorsi + aCorsi);
    // Sh% (Shooting percentage)
    const hShPct = pct(hT.goals, hT.sog), aShPct = pct(aT.goals, aT.sog);
    // Shot accuracy: SOG / (SOG+SW)
    const hShotAcc = pct(hT.sog, hT.sog + hT.shotsWide), aShotAcc = pct(aT.sog, aT.sog + aT.shotsWide);
    // PP efficiency
    const hPPpct = hT.ppsog > 0 ? pct(hT.ppg, hT.ppsog) : 0, aPPpct = aT.ppsog > 0 ? pct(aT.ppg, aT.ppsog) : 0;
    // PK% = 1 - opponent PP%
    const hPKpct = aT.ppsog > 0 ? 100 - pct(aT.ppg, aT.ppsog) : 100, aPKpct = hT.ppsog > 0 ? 100 - pct(hT.ppg, hT.ppsog) : 100;
    // 5v5 goals
    const hEVgoals = hT.goals - hT.ppg, aEVgoals = aT.goals - aT.ppg;
    // Physical index
    const hPhys = hT.hits, aPhys = aT.hits;

    // Faceoff centers
    const getCenters = (skaters) => skaters.filter(s => s.pos === 'CE' && (s.fow + s.fol) > 0)
        .map(s => ({ name: s.name, number: s.number, fow: s.fow, fol: s.fol, total: s.fow + s.fol, pct: pct(s.fow, s.fow + s.fol) }))
        .sort((a, b) => b.total - a.total);
    const hCenters = getCenters(h.skaters), aCenters = getCenters(a.skaters);

    // Line productivity: goals per TOI minute
    const getLineProd = (skaters) => {
        const lines = groupByLine(skaters);
        return lines.map(ln => {
            const totalToi = ln.all.reduce((s, x) => s + x.toiSeconds, 0);
            const goals = ln.totals.goals;
            const sog = ln.totals.sog;
            return {
                line: ln.line, goals, sog, toi: totalToi, goalsPerMin: totalToi > 0 ? (goals / (totalToi / 60)) : 0,
                sogPerMin: totalToi > 0 ? (sog / (totalToi / 60)) : 0, plusMinus: ln.totals.plusMinus
            };
        });
    };
    const hLines = getLineProd(h.skaters), aLines = getLineProd(a.skaters);
    const lineCompData = [];
    for (let i = 0; i < Math.max(hLines.length, aLines.length); i++) {
        lineCompData.push({
            name: `Kedja ${i + 1}`,
            [HN + ' Mål']: hLines[i] ? hLines[i].goals : 0, [AN + ' Mål']: aLines[i] ? aLines[i].goals : 0,
            [HN + ' SOG']: hLines[i] ? hLines[i].sog : 0, [AN + ' SOG']: aLines[i] ? aLines[i].sog : 0,
        });
    }

    // Goalie duel
    const hGk = h.goalies.filter(g => g.soga > 0)[0], aGk = a.goalies.filter(g => g.soga > 0)[0];

    // Player efficiency scatter: x=TOI(min), y=points
    const scatterHome = h.skaters.filter(s => s.toiSeconds > 0).map(s => ({
        x: Math.round(s.toiSeconds / 60 * 10) / 10, y: s.goals + s.assists, name: s.name, number: s.number,
        sog: s.sog, team: HN
    }));
    const scatterAway = a.skaters.filter(s => s.toiSeconds > 0).map(s => ({
        x: Math.round(s.toiSeconds / 60 * 10) / 10, y: s.goals + s.assists, name: s.name, number: s.number,
        sog: s.sog, team: AN
    }));

    const h3 = (...args) => React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 } }, ...args);
    const sub = (t) => React.createElement('span', { style: { fontSize: 11, color: MUTED, fontWeight: 400, fontFamily: 'Inter' } }, t);

    return React.createElement('div', { className: 'animate-fade', style: { display: 'flex', flexDirection: 'column', gap: 20 } },

        // === SECTION 1: Shot Dominance ===
        React.createElement('div', { className: 'card' },
            h3('🎯 Skottdominans', sub('Corsi-lite & effektivitet')),
            React.createElement('div', { className: 'grid-2', style: { gap: 24 } },
                // Left: Corsi gauge
                React.createElement('div', { style: { textAlign: 'center' } },
                    React.createElement('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: MUTED, marginBottom: 8 } }, 'Corsi-lite (CF%)'),
                    React.createElement('div', { style: { fontSize: 11, color: MUTED, marginBottom: 12 } }, 'Skottförsök: SOG + Skott utanför'),
                    React.createElement('div', { style: { position: 'relative', margin: '0 auto', width: 180, height: 100, overflow: 'hidden' } },
                        React.createElement('svg', { viewBox: '0 0 180 100', style: { width: 180, height: 100 } },
                            React.createElement('path', { d: 'M 10 90 A 80 80 0 0 1 170 90', fill: 'none', stroke: SURF_L, strokeWidth: 12, strokeLinecap: 'round' }),
                            React.createElement('path', {
                                d: 'M 10 90 A 80 80 0 0 1 170 90', fill: 'none', stroke: `url(#corsiGrad)`, strokeWidth: 12, strokeLinecap: 'round',
                                strokeDasharray: `${hCorsiPct / 100 * 251.3} 251.3`
                            }),
                            React.createElement('defs', null,
                                React.createElement('linearGradient', { id: 'corsiGrad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
                                    React.createElement('stop', { offset: '0%', stopColor: GOLD }),
                                    React.createElement('stop', { offset: '100%', stopColor: hCorsiPct > 55 ? GREEN : hCorsiPct < 45 ? RED : GOLD_L }),
                                )
                            ),
                        ),
                        React.createElement('div', { style: { position: 'absolute', bottom: 0, width: '100%', textAlign: 'center' } },
                            React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '2rem', fontWeight: 900, color: hCorsiPct > 52 ? GREEN : hCorsiPct < 48 ? RED : '#fff' } },
                                hCorsiPct.toFixed(1) + '%'),
                            React.createElement('div', { style: { fontSize: 10, color: MUTED } }, `${HN} ${hCorsi} — ${aCorsi} ${AN}`),
                        ),
                    ),
                ),
                // Right: Efficiency bars
                React.createElement('div', null,
                    React.createElement(CompBar, { label: 'Skottfrekvens (Sh%)', homeVal: hShPct, awayVal: aShPct, format: v => v.toFixed(1) + '%' }),
                    React.createElement(CompBar, { label: 'Skottnoggranhet', homeVal: hShotAcc, awayVal: aShotAcc, format: v => v.toFixed(1) + '%' }),
                    React.createElement(CompBar, { label: '5-mot-5 Mål', homeVal: hEVgoals, awayVal: aEVgoals }),
                    React.createElement(CompBar, { label: 'Skottförsök', homeVal: hCorsi, awayVal: aCorsi }),
                ),
            ),
        ),

        // === SECTION 2: Special Teams ===
        React.createElement('div', { className: 'card' },
            h3('⚡ Speciallag', sub('Powerplay & Boxplay')),
            React.createElement('div', { className: 'grid-2', style: { gap: 24 } },
                React.createElement('div', null,
                    React.createElement(CompBar, { label: 'Powerplay (PP%)', homeVal: hPPpct, awayVal: aPPpct, format: v => v.toFixed(1) + '%' }),
                    React.createElement(CompBar, { label: 'Boxplay (PK%)', homeVal: hPKpct, awayVal: aPKpct, format: v => v.toFixed(1) + '%' }),
                    React.createElement(CompBar, { label: 'PP-Mål', homeVal: hT.ppg, awayVal: aT.ppg }),
                    React.createElement(CompBar, { label: 'PP-Skott', homeVal: hT.ppsog, awayVal: aT.ppsog }),
                ),
                React.createElement('div', null,
                    React.createElement(CompBar, { label: 'Utvisningsminuter (PIM)', homeVal: hT.pim, awayVal: aT.pim, invert: true }),
                    React.createElement(CompBar, { label: 'Fysisk dominans (Hits)', homeVal: hPhys, awayVal: aPhys }),
                    React.createElement(CompBar, { label: 'Tekningar vunna', homeVal: hT.fow, awayVal: aT.fow }),
                    React.createElement(CompBar, { label: 'Tekning %', homeVal: hT.foPct, awayVal: aT.foPct, format: v => v.toFixed(1) + '%' }),
                ),
            ),
        ),

        // === SECTION 3: Faceoff Center Duel ===
        React.createElement('div', { className: 'card' },
            h3('🏒 Centerduellen', sub('Tekningsprocent per center')),
            React.createElement('div', { className: 'grid-2', style: { gap: 24 } },
                ...[{ centers: hCenters, team: HN, color: GOLD }, { centers: aCenters, team: AN, color: BLUE }].map(({ centers, team, color }) =>
                    React.createElement('div', { key: team },
                        React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 } }, team),
                        centers.length === 0
                            ? React.createElement('div', { style: { color: MUTED, fontSize: 12 } }, 'Ingen data')
                            : centers.map(c =>
                                React.createElement('div', { key: c.number, style: { marginBottom: 10 } },
                                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 3 } },
                                        React.createElement('span', { style: { fontSize: 12, color: '#e2e8f0' } }, `#${c.number} ${c.name}`),
                                        React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: c.pct >= 50 ? GREEN : RED } }, c.pct.toFixed(0) + '%'),
                                    ),
                                    React.createElement('div', { style: { height: 6, borderRadius: 3, background: SURF_L, overflow: 'hidden' } },
                                        React.createElement('div', {
                                            style: {
                                                height: '100%', width: `${c.pct}%`, borderRadius: 3,
                                                background: c.pct >= 55 ? GREEN : c.pct >= 45 ? GOLD : RED, transition: 'width .4s'
                                            }
                                        })
                                    ),
                                    React.createElement('div', { style: { fontSize: 10, color: MUTED, marginTop: 2 } },
                                        `${c.fow}W / ${c.fol}L (${c.total} totalt)`),
                                )
                            ),
                    )
                ),
            ),
        ),

        // === SECTION 4: Line vs Line ===
        React.createElement('div', { className: 'card' },
            h3('📊 Kedja mot kedja', sub('Produktivitet & skott per linje')),
            React.createElement(ResponsiveContainer, { width: '100%', height: 280 },
                React.createElement(BarChart, { data: lineCompData, margin: { top: 5, right: 20, left: 0, bottom: 5 } },
                    React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: SURF_L }),
                    React.createElement(XAxis, { dataKey: 'name', stroke: MUTED, fontSize: 12 }),
                    React.createElement(YAxis, { stroke: MUTED, fontSize: 12 }),
                    React.createElement(Tooltip, { ...TT }),
                    React.createElement(Legend, { wrapperStyle: { fontSize: 11 } }),
                    React.createElement(Bar, { dataKey: HN + ' Mål', fill: GOLD, radius: [4, 4, 0, 0] }),
                    React.createElement(Bar, { dataKey: AN + ' Mål', fill: BLUE, radius: [4, 4, 0, 0] }),
                    React.createElement(Bar, { dataKey: HN + ' SOG', fill: 'rgba(212,168,67,.35)', radius: [4, 4, 0, 0] }),
                    React.createElement(Bar, { dataKey: AN + ' SOG', fill: 'rgba(59,130,246,.35)', radius: [4, 4, 0, 0] }),
                )
            ),
        ),

        // === SECTION 5: Goalie Duel ===
        hGk && aGk && React.createElement('div', { className: 'card' },
            h3('🧤 Målvaktsduellen', sub('Head-to-head jämförelse')),
            React.createElement('div', { style: { display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 } },
                ...[{ gk: hGk, color: GOLD, team: HN }, { gk: aGk, color: BLUE, team: AN }].map(({ gk, color, team }) =>
                    React.createElement('div', { key: team, style: { flex: '1 1 200px', textAlign: 'center', padding: 20, background: 'rgba(255,255,255,.02)', borderRadius: 12, border: `1px solid ${color}22` } },
                        React.createElement('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color, marginBottom: 8 } }, team),
                        React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800, color: '#e2e8f0' } }, gk.name),
                        React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '2.5rem', fontWeight: 900, color, margin: '12px 0' } }, gk.svsPct.toFixed(1) + '%'),
                        React.createElement('div', { style: { fontSize: 10, color: MUTED } }, 'SVS%'),
                        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 } },
                            React.createElement('div', null,
                                React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 700, color: GREEN } }, gk.svs),
                                React.createElement('div', { style: { fontSize: 9, color: MUTED } }, 'Räddningar')),
                            React.createElement('div', null,
                                React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 700, color: RED } }, gk.ga),
                                React.createElement('div', { style: { fontSize: 9, color: MUTED } }, 'Insläppta')),
                            React.createElement('div', null,
                                React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 700, color: '#a78bfa' } }, gk.soga),
                                React.createElement('div', { style: { fontSize: 9, color: MUTED } }, 'Skott emot')),
                        ),
                    )
                ),
            ),
            React.createElement(CompBar, { label: 'SVS%', homeVal: hGk.svsPct, awayVal: aGk.svsPct, format: v => v.toFixed(1) + '%' }),
            React.createElement(CompBar, { label: 'Räddningar', homeVal: hGk.svs, awayVal: aGk.svs }),
            React.createElement(CompBar, { label: 'SPGA (farliga skott)', homeVal: hGk.spga, awayVal: aGk.spga, invert: true }),
        ),

        // === SECTION 6: Player Efficiency Scatter ===
        React.createElement('div', { className: 'card' },
            h3('📈 Spelareffektivitet', sub('Istid (min) vs Poäng — varje punkt = spelare')),
            React.createElement(ResponsiveContainer, { width: '100%', height: 320 },
                React.createElement(ScatterChart, { margin: { top: 10, right: 20, bottom: 10, left: 10 } },
                    React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: SURF_L }),
                    React.createElement(XAxis, {
                        dataKey: 'x', name: 'Istid', unit: ' min', stroke: MUTED, fontSize: 11,
                        label: { value: 'Istid (min)', position: 'bottom', fill: MUTED, fontSize: 11 }
                    }),
                    React.createElement(YAxis, {
                        dataKey: 'y', name: 'Poäng', stroke: MUTED, fontSize: 11,
                        label: { value: 'Poäng', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 11 }
                    }),
                    React.createElement(Tooltip, {
                        ...TT, formatter: (v, n) => [v, n === 'x' ? 'Istid' : n === 'y' ? 'Poäng' : n],
                        content: ({ payload }) => {
                            if (!payload || !payload[0]) return null;
                            const d = payload[0].payload;
                            return React.createElement('div', { style: { background: SURFACE, border: `1px solid ${GOLD}`, borderRadius: 8, padding: 10, fontSize: 12 } },
                                React.createElement('div', { style: { fontWeight: 700, color: d.team === HN ? GOLD : BLUE } }, `#${d.number} ${d.name}`),
                                React.createElement('div', { style: { color: MUTED } }, `${d.team} · ${d.x} min · ${d.y}P · ${d.sog} SOG`),
                            );
                        }
                    }),
                    React.createElement(Scatter, { data: scatterHome, fill: GOLD, name: HN, opacity: .9 },
                        scatterHome.map((s, i) => React.createElement(Cell, { key: i, r: Math.max(s.sog * 2 + 4, 5) }))
                    ),
                    React.createElement(Scatter, { data: scatterAway, fill: BLUE, name: AN, opacity: .9 },
                        scatterAway.map((s, i) => React.createElement(Cell, { key: i, r: Math.max(s.sog * 2 + 4, 5) }))
                    ),
                    React.createElement(Legend, { wrapperStyle: { fontSize: 11 } }),
                )
            ),
            React.createElement('div', { style: { fontSize: 10, color: MUTED, marginTop: 8, textAlign: 'center' } }, 'Storlek på punkt = antal skott på mål (SOG)'),
        ),
    );
}

// ===== FUN FACTS GENERATOR =====
function FunFacts({ matches }) {
    const facts = useMemo(() => {
        const allFacts = [];
        const hPlayers = buildSeasonStats(matches, 'home');
        const aPlayers = buildSeasonStats(matches, 'away');
        const HN = SERIES_INFO.teamHomeShort, AN = SERIES_INFO.teamAwayShort;
        // Total goals
        const totalGoals = matches.reduce((s, m) => s + m.result.home + m.result.away, 0);
        allFacts.push({ icon: '🏒', text: `Det har gjorts ${totalGoals} mål på ${matches.length} matcher — ${(totalGoals / matches.length).toFixed(1)} mål per match i snitt.` });
        // Biggest win
        let maxDiff = 0, maxMatch = null;
        matches.forEach(m => { const d = Math.abs(m.result.home - m.result.away); if (d > maxDiff) { maxDiff = d; maxMatch = m; } });
        if (maxMatch) allFacts.push({ icon: '💥', text: `Största segern: ${maxDiff} mål (Match ${maxMatch.matchNumber}: ${maxMatch.result.home}-${maxMatch.result.away}).` });
        // Top scorer
        const allP = [...hPlayers, ...aPlayers].sort((a, b) => b.totals.points - a.totals.points);
        if (allP[0]) allFacts.push({ icon: '⭐', text: `${allP[0].name} leder poängligan med ${allP[0].totals.points}P (${allP[0].totals.goals}M+${allP[0].totals.assists}A) bland alla spelare.` });
        // Hitman
        const hitter = [...hPlayers, ...aPlayers].sort((a, b) => b.totals.hits - a.totals.hits)[0];
        if (hitter && hitter.totals.hits > 0) allFacts.push({ icon: '💪', text: `${hitter.name} är seriens mest fysiska spelare med ${hitter.totals.hits} tacklingar totalt.` });
        // Goalie
        const gkAll = [];
        matches.forEach(m => { ['home', 'away'].forEach(s => m[s].goalies.filter(g => g.soga > 0).forEach(g => gkAll.push(g))); });
        const bestGk = gkAll.sort((a, b) => b.svsPct - a.svsPct)[0];
        if (bestGk) allFacts.push({ icon: '🧤', text: `${bestGk.name} hade seriens bästa singelmatch med ${bestGk.svsPct.toFixed(1)}% räddningsprocent (${bestGk.svs} räddningar).` });
        // SOG dominance
        const totalHomeSog = matches.reduce((s, m) => s + calcTeamTotals(m.home.skaters, m.home.goalies).sog, 0);
        const totalAwaySog = matches.reduce((s, m) => s + calcTeamTotals(m.away.skaters, m.away.goalies).sog, 0);
        allFacts.push({ icon: '🎯', text: `${HN} har skjutit ${totalHomeSog} skott mot ${AN}:s ${totalAwaySog} — ${totalHomeSog > totalAwaySog ? HN + ' dominerar skottstatistiken' : 'jämnt skottläge'}!` });
        // Faceoff king
        const centers = [...hPlayers, ...aPlayers].filter(p => p.pos === 'CE' && (p.totals.fow + p.totals.fol) > 5);
        const foKing = centers.sort((a, b) => pct(b.totals.fow, b.totals.fow + b.totals.fol) - pct(a.totals.fow, a.totals.fow + a.totals.fol))[0];
        if (foKing) allFacts.push({ icon: '🏆', text: `Tekningskungen: ${foKing.name} med ${pct(foKing.totals.fow, foKing.totals.fow + foKing.totals.fol).toFixed(0)}% vunna tekningar (${foKing.totals.fow}/${foKing.totals.fow + foKing.totals.fol}).` });
        // Depth scoring
        const line4Goals = hPlayers.filter(p => matches.some(m => m.home.skaters.find(s => s.number === p.number && s.line === 4))).reduce((s, p) => s + p.totals.goals, 0);
        if (line4Goals > 0) allFacts.push({ icon: '🔥', text: `${HN}:s fjärdekedja har bidragit med ${line4Goals} mål — djupet levererar!` });
        return allFacts;
    }, [matches]);
    return React.createElement('div', { className: 'card' },
        React.createElement('h3', { className: 'font-display', style: { color: GOLD, marginBottom: 16 } }, '💡 Visste du att...'),
        React.createElement('div', { style: { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' } },
            facts.map((f, i) =>
                React.createElement('div', {
                    key: i, style: {
                        display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14,
                        background: 'rgba(255,255,255,.03)', borderRadius: 12,
                        border: '1px solid rgba(212,168,67,.08)',
                    }
                },
                    React.createElement('span', { style: { fontSize: 24, flexShrink: 0 } }, f.icon),
                    React.createElement('span', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 } }, f.text),
                )
            )
        ),
    );
}

// ===== COUNTDOWN =====
function NextMatchCountdown() {
    const nextMatch = MATCHES.length + 1;
    const dates = ['2026-04-15', '2026-04-17', '2026-04-20', '2026-04-22', '2026-04-25', '2026-04-27', '2026-04-29'];
    const nextDateStr = dates[MATCHES.length];
    if (!nextDateStr || MATCHES.length >= 7) return null;
    const score = getSeriesScore(MATCHES);
    if (score.home >= 4 || score.away >= 4) return null; // Series over
    const nextDate = new Date(nextDateStr + 'T19:00:00+02:00');
    const [timeLeft, setTimeLeft] = useState('');
    React.useEffect(() => {
        const tick = () => {
            const now = new Date();
            const diff = nextDate - now;
            if (diff <= 0) { setTimeLeft('JUST NU!'); return; }
            const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000),
                m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${d > 0 ? d + 'd ' : ''}${h}t ${m}m ${s}s`);
        };
        tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
    }, []);
    const arena = MATCHES.length < 2 ? 'A3 Arena' : 'Nobelhallen';
    return React.createElement('div', {
        style: {
            background: 'linear-gradient(135deg,rgba(212,168,67,.08),rgba(59,130,246,.08))',
            border: '1px solid rgba(212,168,67,.2)', borderRadius: 16, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }
    },
        React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: MUTED } }, 'Nästa match'),
            React.createElement('div', { style: { fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginTop: 4 } },
                `Match ${nextMatch} · ${nextDateStr} · ${arena}`),
        ),
        React.createElement('div', { style: { textAlign: 'right' } },
            React.createElement('div', {
                style: {
                    fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 900, color: GOLD,
                    textShadow: '0 0 20px rgba(212,168,67,.3)'
                }
            }, timeLeft),
            React.createElement('div', { style: { fontSize: 10, color: MUTED } }, 'Nedräkning'),
        ),
    );
}

// ===== HOT / COLD TREND =====
function HotColdView({ matches }) {
    if (matches.length < 2) return React.createElement('div', { className: 'card', style: { textAlign: 'center', color: MUTED, padding: 40 } }, 'Minst 2 matcher krävs för trendanalys');
    const HN = SERIES_INFO.teamHomeShort, AN = SERIES_INFO.teamAwayShort;
    const calcTrends = (side) => {
        const last = matches[matches.length - 1][side].skaters;
        const prev = matches[matches.length - 2][side].skaters;
        return last.map(s => {
            const p = prev.find(x => x.number === s.number);
            if (!p) return null;
            const ptsDiff = (s.goals + s.assists) - (p.goals + p.assists);
            const sogDiff = s.sog - p.sog;
            const pmDiff = s.plusMinus - p.plusMinus;
            const hitsDiff = s.hits - p.hits;
            const score = ptsDiff * 3 + sogDiff + pmDiff * 2 + hitsDiff;
            return {
                name: s.name, number: s.number, pos: s.pos, score,
                prevPts: p.goals + p.assists, curPts: s.goals + s.assists,
                prevPM: p.plusMinus, curPM: s.plusMinus,
                prevSog: p.sog, curSog: s.sog
            };
        }).filter(Boolean).sort((a, b) => b.score - a.score);
    };
    const hTrends = calcTrends('home'), aTrends = calcTrends('away');
    const hot = (trends) => trends.slice(0, 3);
    const cold = (trends) => [...trends].sort((a, b) => a.score - b.score).slice(0, 3);
    const lastNum = matches[matches.length - 1].matchNumber;
    const prevNum = matches[matches.length - 2].matchNumber;

    const TrendCard = ({ player, isHot, color }) => {
        return React.createElement('div', {
            style: {
                display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                background: isHot ? 'rgba(52,211,153,.06)' : 'rgba(248,113,113,.06)',
                border: `1px solid ${isHot ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)'}`,
                borderRadius: 12,
            }
        },
            React.createElement('div', { style: { fontSize: 24 } }, isHot ? '🔥' : '🥶'),
            React.createElement('div', { style: { flex: 1 } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 4 } },
                    React.createElement('span', { style: { color, fontWeight: 700, fontSize: 13 } }, `#${player.number}`),
                    React.createElement('span', { style: { color: '#e2e8f0', fontSize: 13 } }, player.name),
                ),
                React.createElement('div', { style: { fontSize: 10, color: MUTED } }, player.pos),
            ),
            React.createElement('div', { style: { textAlign: 'right', fontSize: 11 } },
                React.createElement('div', null,
                    React.createElement('span', { style: { color: MUTED } }, `M${prevNum}: `),
                    React.createElement('span', { style: { color: '#e2e8f0' } }, `${player.prevPts}P ${player.prevSog}S`),
                ),
                React.createElement('div', null,
                    React.createElement('span', { style: { color: MUTED } }, `M${lastNum}: `),
                    React.createElement('span', { style: { color: isHot ? GREEN : RED, fontWeight: 700 } }, `${player.curPts}P ${player.curSog}S`),
                ),
            ),
            React.createElement('div', {
                style: {
                    fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 900,
                    color: isHot ? GREEN : RED, minWidth: 40, textAlign: 'right'
                }
            },
                (player.score > 0 ? '+' : '') + player.score),
        );
    };

    return React.createElement('div', { className: 'animate-fade', style: { display: 'flex', flexDirection: 'column', gap: 20 } },
        React.createElement(FunFacts, { matches }),
        React.createElement(NextMatchCountdown),
        // Hot / Cold for both teams
        ...[{ trends: hTrends, team: HN, color: GOLD }, { trends: aTrends, team: AN, color: BLUE }].map(({ trends, team, color }) =>
            React.createElement('div', { key: team, className: 'card' },
                React.createElement('h3', { className: 'font-display', style: { color, marginBottom: 16 } },
                    `${team} — Trend (M${prevNum} → M${lastNum})`),
                React.createElement('div', { className: 'grid-2', style: { gap: 16 } },
                    React.createElement('div', null,
                        React.createElement('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: GREEN, marginBottom: 8, fontWeight: 700 } }, '🔥 Hetast'),
                        ...hot(trends).map((p, i) => React.createElement(TrendCard, { key: i, player: p, isHot: true, color })),
                    ),
                    React.createElement('div', null,
                        React.createElement('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: RED, marginBottom: 8, fontWeight: 700 } }, '🥶 Kallast'),
                        ...cold(trends).map((p, i) => React.createElement(TrendCard, { key: i, player: p, isHot: false, color })),
                    ),
                ),
            )
        ),
    );
}

// ===== MAIN APP =====
function App() {
    const [selectedMatch, setSelectedMatch] = useState('all');
    const [activeTab, setActiveTab] = useState('match');
    const [teamView, setTeamView] = useState('home');

    const matchOptions = [
        { value: 'all', label: 'Totalt Slutspel' },
        ...MATCHES.map(m => ({ value: m.id, label: `Match ${m.matchNumber} — ${m.date}` }))
    ];

    const currentMatch = selectedMatch === 'all' ? null : MATCHES.find(m => m.id === selectedMatch);
    const displayMatches = selectedMatch === 'all' ? MATCHES : [currentMatch].filter(Boolean);
    const seriesScore = getSeriesScore(MATCHES);
    const otherTeam = teamView === 'home' ? 'away' : 'home';
    const teamName = teamView === 'home' ? SERIES_INFO.teamHomeShort : SERIES_INFO.teamAwayShort;
    const otherName = teamView === 'home' ? SERIES_INFO.teamAwayShort : SERIES_INFO.teamHomeShort;

    // Aggregate match for "Totalt"
    const aggregatedMatch = useMemo(() => {
        if (selectedMatch !== 'all') return null;
        const agg = {
            id: 'total', matchNumber: 0, date: 'Slutspel 2026', arena: '',
            result: { home: MATCHES.reduce((s, m) => s + m.result.home, 0), away: MATCHES.reduce((s, m) => s + m.result.away, 0) },
            home: { goalies: [], skaters: [] }, away: { goalies: [], skaters: [] }
        };
        ['home', 'away'].forEach(side => {
            // Aggregate skaters
            const map = {};
            MATCHES.forEach(m => m[side].skaters.forEach(s => {
                const id = s.number + '_' + s.name;
                if (!map[id]) map[id] = { ...s, toiSeconds: 0 };
                else {
                    ['goals', 'assists', 'ppg', 'shotsWide', 'pim', 'sog', 'ppsog', 'plusMinus', 'hits', 'fow', 'fol'].forEach(k => map[id][k] += s[k]);
                    map[id].toiSeconds += s.toiSeconds;
                }
            }));
            agg[side].skaters = Object.values(map).map(s => ({ ...s, points: s.goals + s.assists, toi: secToToi(s.toiSeconds), foPct: pct(s.fow, s.fow + s.fol) }));
            // Aggregate goalies
            const gkMap = {};
            MATCHES.forEach(m => m[side].goalies.forEach(g => {
                const id = g.number + '_' + g.name;
                if (!gkMap[id]) gkMap[id] = { ...g };
                else { ['ga', 'soga', 'spga', 'svs'].forEach(k => gkMap[id][k] += g[k]); }
            }));
            agg[side].goalies = Object.values(gkMap).map(g => ({ ...g, svsPct: pct(g.svs, g.soga) }));
        });
        return agg;
    }, []);

    const viewMatch = currentMatch || aggregatedMatch;

    return React.createElement('div', null,
        // Header
        React.createElement('header', { className: 'header' },
            React.createElement('div', { className: 'container' },
                React.createElement('div', { className: 'header-inner' },
                    React.createElement('div', { className: 'logo' },
                        React.createElement('div', { className: 'logo-icon' }, 'IFB'),
                        React.createElement('div', { className: 'logo-text' }, 'LÖVEN ', React.createElement('span', null, 'STATS HUB')),
                    ),
                    React.createElement('div', { className: 'header-controls' },
                        React.createElement('select', {
                            className: 'select', value: selectedMatch,
                            onChange: e => { setSelectedMatch(e.target.value); setActiveTab('match'); }
                        },
                            matchOptions.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label))
                        ),
                        React.createElement('button', {
                            className: teamView === 'home' ? 'btn btn-gold' : 'btn btn-outline',
                            style: teamView === 'away' ? { borderColor: BLUE, color: BLUE } : {},
                            onClick: () => setTeamView(v => v === 'home' ? 'away' : 'home')
                        },
                            teamView === 'home' ? `Visa ${SERIES_INFO.teamAwayShort}` : `Visa ${SERIES_INFO.teamHomeShort}`
                        ),
                    ),
                ),
            ),
        ),

        // Main
        React.createElement('main', { className: 'container', style: { paddingTop: 24, paddingBottom: 24 } },
            // Series Progress
            React.createElement(SeriesProgress, { matches: MATCHES, bestOf: SERIES_INFO.bestOf }),

            // Tabs
            React.createElement('div', { className: 'tabs', style: { marginTop: 24 } },
                React.createElement('button', { className: `tab ${activeTab === 'match' ? 'active' : ''}`, onClick: () => setActiveTab('match') },
                    selectedMatch === 'all' ? '📊 Översikt' : '📊 Matchanalys'),
                React.createElement('button', { className: `tab ${activeTab === 'season' ? 'active' : ''}`, onClick: () => setActiveTab('season') }, '📈 Poängliga'),
                React.createElement('button', { className: `tab ${activeTab === 'deep' ? 'active' : ''}`, onClick: () => setActiveTab('deep') }, '🔬 Djupanalys'),
                React.createElement('button', { className: `tab ${activeTab === 'insights' ? 'active' : ''}`, onClick: () => setActiveTab('insights') }, '💡 Insikter'),
            ),

            // Content
            activeTab === 'match' && viewMatch && React.createElement(MatchView, { match: viewMatch, teamLabel: teamView }),
            activeTab === 'season' && React.createElement(SeasonView, { matches: MATCHES, teamLabel: teamView }),
            activeTab === 'deep' && viewMatch && React.createElement(DeepAnalysisView, { match: viewMatch }),
            activeTab === 'insights' && React.createElement(HotColdView, { matches: MATCHES }),
        ),

        // Footer
        React.createElement('footer', { className: 'footer container' },
            React.createElement('p', null, `${SERIES_INFO.teamHome} vs ${SERIES_INFO.teamAway} — ${SERIES_INFO.round} ${SERIES_INFO.season}`),
            React.createElement('p', { style: { marginTop: 4 } }, 'Data: Statnet · Byggt med ❤️ för Björklöven'),
        ),
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
