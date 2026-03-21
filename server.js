const express = require('express');
const cors = require('cors');
const path = require('path');
const { loadAllMatches, loadMatch, removeMatch, clearAll } = require('./db');
const { startWatcher } = require('./etl');
const analytics = require('./analytics');

const app = express();
const PORT = process.env.PORT || 3456;
const EXCEL_DIR = process.env.EXCEL_DIR || path.join(__dirname, 'excel_data');

app.use(cors());
app.use(express.json());

// ===== STATIC FILES =====
app.use(express.static(__dirname, {
    index: 'index.html',
    extensions: ['html']
}));

// ===== API ROUTES =====

// Get all matches (full detail for frontend to compute analytics)
app.get('/api/matches', (req, res) => {
    try {
        const matches = loadAllMatches();

        // Calculate team averages for goalie normalization
        const globalSvPcts = matches.map(m => teamTotals(m.bjorkloven.skaters, m.bjorkloven.goalies).svsPct).filter(p => p > 0);
        const avgSvsPct = globalSvPcts.length ? (globalSvPcts.reduce((a, b) => a + b, 0) / globalSvPcts.length) : 90;

        // Compute totals, lines, and advanced analytics for each match
        const enriched = matches.map(m => {
            m.bjorkloven.skaters = m.bjorkloven.skaters.map(analytics.enrichSkaterMatch);
            m.bjorkloven.goalies = m.bjorkloven.goalies.map(g => analytics.enrichGoalieMatch(g, avgSvsPct));

            m.opponentTeam.skaters = m.opponentTeam.skaters.map(analytics.enrichSkaterMatch);
            m.opponentTeam.goalies = m.opponentTeam.goalies.map(g => analytics.enrichGoalieMatch(g, avgSvsPct));

            const oppSog = m.opponentTeam.skaters.reduce((s, x) => s + x.sog, 0);
            const bjSog = m.bjorkloven.skaters.reduce((s, x) => s + x.sog, 0);

            m.bjorkloven.totals = analytics.calcTeamTactical(
                { totals: teamTotals(m.bjorkloven.skaters, m.bjorkloven.goalies) },
                oppSog
            );
            m.opponentTeam.totals = analytics.calcTeamTactical(
                { totals: teamTotals(m.opponentTeam.skaters, m.opponentTeam.goalies) },
                bjSog
            );

            m.bjorkloven.lines = groupLines(m.bjorkloven.skaters);
            m.opponentTeam.lines = groupLines(m.opponentTeam.skaters);
            return m;
        });
        res.json(enriched);
    } catch (e) {
        console.error('[API] Error loading matches:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Get single match
app.get('/api/matches/:id', (req, res) => {
    try {
        const match = loadMatch(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        match.bjorkloven.skaters = match.bjorkloven.skaters.map(analytics.enrichSkaterMatch);
        match.bjorkloven.goalies = match.bjorkloven.goalies.map(g => analytics.enrichGoalieMatch(g, 90));

        match.opponentTeam.skaters = match.opponentTeam.skaters.map(analytics.enrichSkaterMatch);
        match.opponentTeam.goalies = match.opponentTeam.goalies.map(g => analytics.enrichGoalieMatch(g, 90));

        const oppSog = match.opponentTeam.skaters.reduce((s, x) => s + x.sog, 0);
        const bjSog = match.bjorkloven.skaters.reduce((s, x) => s + x.sog, 0);

        match.bjorkloven.totals = analytics.calcTeamTactical(
            { totals: teamTotals(match.bjorkloven.skaters, match.bjorkloven.goalies) }, oppSog
        );
        match.opponentTeam.totals = analytics.calcTeamTactical(
            { totals: teamTotals(match.opponentTeam.skaters, match.opponentTeam.goalies) }, bjSog
        );

        match.bjorkloven.lines = groupLines(match.bjorkloven.skaters);
        match.opponentTeam.lines = groupLines(match.opponentTeam.skaters);

        res.json(match);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get all players (season aggregates)
app.get('/api/players', (req, res) => {
    try {
        const matches = loadAllMatches();
        let players = buildPlayerSeasons(matches);
        players = players.map(p => analytics.enrichPlayerSeason(p));
        res.json(players);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete a match
app.delete('/api/matches/:id', (req, res) => {
    try {
        removeMatch(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Clear all data
app.post('/api/clear', (req, res) => {
    try {
        clearAll();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ===== SERVER-SIDE UTILITY FUNCTIONS =====
function pct(a, b) { return b > 0 ? (a / b * 100) : 0; }

function teamTotals(sk, gk) {
    const t = { sog: 0, pim: 0, hits: 0, fow: 0, fol: 0, ppg: 0, goals: 0, assists: 0, points: 0, shotsWide: 0, ppsog: 0 };
    sk.forEach(s => {
        t.sog += s.sog; t.pim += s.pim; t.hits += s.hits; t.fow += s.fow; t.fol += s.fol;
        t.ppg += s.ppg; t.goals += s.goals; t.assists += s.assists; t.points += s.points;
        t.shotsWide += s.shotsWide || 0; t.ppsog += s.ppsog || 0;
    });
    t.foPct = pct(t.fow, t.fow + t.fol);
    t.ga = gk.reduce((s, g) => s + g.ga, 0);
    t.svs = gk.reduce((s, g) => s + g.svs, 0);
    t.soga = gk.reduce((s, g) => s + g.soga, 0);
    t.svsPct = pct(t.svs, t.soga);
    return t;
}

function groupLines(sk) {
    const lines = {};
    sk.forEach(s => { if (!lines[s.line]) lines[s.line] = []; lines[s.line].push(s); });
    return Object.entries(lines).sort((a, b) => a[0] - b[0]).map(([n, p]) => {
        const lineData = {
            line: Number(n),
            forwards: p.filter(x => ['LW', 'CE', 'RW'].includes(x.pos)),
            defense: p.filter(x => ['LD', 'RD'].includes(x.pos)),
            all: p,
            totals: {
                plusMinus: p.reduce((s, x) => s + x.plusMinus, 0),
                sog: p.reduce((s, x) => s + x.sog, 0),
                pim: p.reduce((s, x) => s + x.pim, 0),
                goals: p.reduce((s, x) => s + x.goals, 0),
                hits: p.reduce((s, x) => s + x.hits, 0),
                toi: (() => {
                    const avg = p.reduce((s, x) => s + x.toiSeconds, 0) / Math.max(p.length, 1);
                    const m = Math.floor(avg / 60), ss = Math.round(avg % 60);
                    return `${m}:${ss < 10 ? '0' : ''}${ss}`;
                })()
            }
        };
        // Add v2 Chemistry Score
        lineData.chemistry = analytics.calcLineChemistry(p);
        return lineData;
    });
}

function buildPlayerSeasons(matches) {
    const map = {};
    matches.forEach(m => {
        m.bjorkloven.skaters.forEach(s => {
            const id = `${s.number}_${s.name.replace(/\s/g, '')}`;
            if (!map[id]) map[id] = {
                playerId: id, name: s.name, number: s.number, pos: s.pos, gamesPlayed: 0,
                totals: { goals: 0, assists: 0, points: 0, ppg: 0, pim: 0, sog: 0, plusMinus: 0, hits: 0, fow: 0, fol: 0, toiSeconds: 0, shotsWide: 0, ppsog: 0 },
                trend: [], bestMatch: null, bestPts: 0
            };
            const p = map[id]; p.gamesPlayed++; p.pos = s.pos;
            Object.keys(p.totals).forEach(k => { if (k in s) p.totals[k] += s[k]; });
            p.totals.points = p.totals.goals + p.totals.assists;
            p.trend.push({ matchId: m.id, date: m.date, opponent: m.opponent, ...s });
            if (s.points > p.bestPts) { p.bestPts = s.points; p.bestMatch = m.id; }
        });
        m.bjorkloven.goalies.forEach(g => {
            const id = `${g.number}_${g.name.replace(/\s/g, '')}_GK`;
            if (!map[id]) map[id] = {
                playerId: id, name: g.name, number: g.number, pos: 'GK', gamesPlayed: 0,
                totals: { ga: 0, soga: 0, spga: 0, svs: 0 }, trend: [], bestMatch: null, bestSvs: 0
            };
            const p = map[id]; p.gamesPlayed++;
            p.totals.ga += g.ga; p.totals.soga += g.soga; p.totals.spga += g.spga; p.totals.svs += g.svs;
            p.trend.push({ matchId: m.id, date: m.date, opponent: m.opponent, ...g });
            if (g.svs > p.bestSvs) { p.bestSvs = g.svs; p.bestMatch = m.id; }
        });
    });
    return Object.values(map);
}

// ===== STARTUP =====
// Start ETL watcher
startWatcher(EXCEL_DIR);

app.listen(PORT, () => {
    console.log(`\n🏒 Björklöven Stats Hub`);
    console.log(`   Server:  http://localhost:${PORT}`);
    console.log(`   API:     http://localhost:${PORT}/api/matches`);
    console.log(`   Excel:   ${EXCEL_DIR}`);
    console.log(`   DB:      ./data/stats.db\n`);
});
