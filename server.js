const express = require('express');
const cors = require('cors');
const path = require('path');
const { loadAllMatches, loadMatch, removeMatch, clearAll } = require('./db');
const { startWatcher } = require('./etl');
const analytics = require('./analytics');
const sillyScraper = require('./silly-season-scraper');
const { generateCurrentState } = require('./services/signalEngine');
const { getCurrentStateSnapshot, invalidateCache: invalidateAiCache } = require('./services/aiRedactor');

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

// ===== SILLY SEASON API =====

// Get silly season data (auto-updated via scraper)
app.get('/api/silly-season', async (req, res) => {
    try {
        const data = await sillyScraper.getSillySeasonData();
        if (!data) return res.status(503).json({ error: 'Data not ready yet, try again soon' });
        res.json(data);
    } catch (e) {
        console.error('[API] Silly season error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Force refresh silly season data
app.post('/api/silly-season/refresh', async (req, res) => {
    try {
        const data = await sillyScraper.refreshSillySeasonData();
        res.json({ ok: true, meta: data?._meta || null });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get scraper status
app.get('/api/silly-season/status', (req, res) => {
    res.json(sillyScraper.getScraperStatus());
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

// ===== SPORTRADAR INTEGRATION =====

const SR_API_KEY = process.env.SPORTRADAR_API_KEY || '2g9qsmEhHWO7SJ7hBIMJnNIP8Bu9QZmxU0CH6zty';
const SR_BASE = 'https://api.sportradar.com/icehockey/trial/v2/en';
const SR_BJORKLOVEN = 'sr:competitor:3747';
const SR_HA_SEASON = 'sr:season:131137'; // Allsvenskan 25/26

// Simple in-memory cache (1 hour TTL)
const srCache = new Map();
const SR_CACHE_TTL = 3600000; // 1 hour

async function fetchSR(endpoint) {
    const cacheKey = endpoint;
    const cached = srCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < SR_CACHE_TTL) {
        return cached.data;
    }
    try {
        const url = `${SR_BASE}/${endpoint}.json?api_key=${SR_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`SR API ${res.status}`);
        const data = await res.json();
        srCache.set(cacheKey, { data, ts: Date.now() });
        return data;
    } catch (e) {
        console.error(`[SR] Error fetching ${endpoint}:`, e.message);
        return cached?.data || null; // Return stale cache on error
    }
}

// Standings for the season Björklöven just won
app.get('/api/v1/sportradar/standings', async (req, res) => {
    try {
        const data = await fetchSR(`seasons/${SR_HA_SEASON}/standings`);
        if (!data?.standings) return res.status(503).json({ error: 'Standings not available' });

        const group = data.standings[0]?.groups?.[0];
        const table = (group?.standings || []).map(s => ({
            rank: s.rank,
            team: s.competitor?.name,
            teamId: s.competitor?.id,
            isBjorkloven: s.competitor?.id === SR_BJORKLOVEN,
            gp: s.played || s.win + s.loss + (s.overtime_loss || 0),
            w: s.win,
            l: s.loss,
            otl: s.overtime_loss || 0,
            pts: s.points,
            gf: s.goals_for,
            ga: s.goals_against,
            diff: (s.goals_for || 0) - (s.goals_against || 0),
            form: s.form || null,
            streak: s.current_outcome ? `${s.current_outcome}${s.current_streak || ''}` : null,
        }));

        res.json({
            season: 'Allsvenskan 25/26',
            seasonId: SR_HA_SEASON,
            table,
            generated_at: data.generated_at,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Recent results
app.get('/api/v1/sportradar/results', async (req, res) => {
    try {
        const data = await fetchSR(`competitors/${SR_BJORKLOVEN}/summaries`);
        if (!data?.summaries) return res.status(503).json({ error: 'No summaries' });

        const results = data.summaries.slice(0, 20).map(s => {
            const ev = s.sport_event;
            const st = s.sport_event_status;
            const home = ev?.competitors?.find(c => c.qualifier === 'home');
            const away = ev?.competitors?.find(c => c.qualifier === 'away');
            const isHome = home?.id === SR_BJORKLOVEN;
            const bjoScore = isHome ? st?.home_score : st?.away_score;
            const oppScore = isHome ? st?.away_score : st?.home_score;
            const won = bjoScore > oppScore;

            return {
                id: ev?.id,
                date: ev?.start_time,
                home: home?.name,
                away: away?.name,
                homeScore: st?.home_score,
                awayScore: st?.away_score,
                isHome,
                result: won ? 'W' : 'L',
                competition: ev?.sport_event_context?.competition?.name,
                stage: ev?.sport_event_context?.stage?.type,
                round: ev?.sport_event_context?.round?.name,
            };
        });

        // Calculate form
        const last10 = results.slice(0, 10);
        const wins = last10.filter(r => r.result === 'W').length;
        const form = `${wins}W-${10 - wins}L`;

        res.json({ results, form, total: data.summaries.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Team profile (venue, colors)
app.get('/api/v1/sportradar/venue', async (req, res) => {
    try {
        const data = await fetchSR(`competitors/${SR_BJORKLOVEN}/profile`);
        if (!data) return res.status(503).json({ error: 'Profile not available' });

        res.json({
            team: data.competitor?.name,
            venue: data.venue?.name,
            city: data.venue?.city,
            capacity: data.venue?.capacity,
            jerseys: data.jerseys,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ===== LÖVENLÄGET API =====

// Compute LageSnapshot from live data
app.get('/api/v1/lovenlaget', async (req, res) => {
    try {
        // Get silly season data (includes scraper results + baseline roster)
        const sillyData = await sillyScraper.getSillySeasonData();

        // Load baseline for roster info
        let baseline;
        try {
            delete require.cache[require.resolve('./silly-season-data')];
            baseline = require('./silly-season-data').SILLY_SEASON_BASELINE;
        } catch (e) {
            baseline = {};
        }

        const roster = baseline.roster || [];
        const departures = baseline.confirmed_departures || [];
        const signings = baseline.confirmed_signings || [];
        const extensions = baseline.confirmed_extensions || [];
        const rink = baseline.rink_positions || {};
        const newsFeed = sillyData?.news_feed || [];

        // ── Compute squad status ──

        const signed = roster.filter(p => ['SIGNERAD', 'FÖRLÄNGD', 'NYFÖRVÄRV'].includes(p.status));
        const expiring = roster.filter(p => p.status === 'UTGÅENDE');

        const countByPos = (players, positions) => players.filter(p => positions.includes(p.pos)).length;
        const SHL_MIN = { GK: 2, D: 6, F: 12 }; // Minimum SHL roster

        const gkCount = countByPos(signed, ['GK']);
        const dCount = countByPos(signed, ['LD', 'RD']);
        const fCount = countByPos(signed, ['CE', 'LW', 'RW']);
        const ceCount = countByPos(signed, ['CE']);

        const posStatus = (have, need, label) => {
            const pct = have / need;
            if (pct >= 1) return { text: `🟢 ${label}: Stabilt (${have})`, level: 'ok' };
            if (pct >= 0.7) return { text: `🟡 ${label}: Bevaka (${have}/${need})`, level: 'warning' };
            return { text: `🔴 ${label}: Kritisk lucka (${have}/${need})`, level: 'critical' };
        };

        const gkStatus = posStatus(gkCount, SHL_MIN.GK, 'Målvakter');
        const dStatus = posStatus(dCount, SHL_MIN.D, 'Backar');
        const ceStatus = ceCount >= 4 ? { text: `🟢 Center: Stark (${ceCount})`, level: 'ok' } : posStatus(ceCount, 4, 'Center');
        const fwStatus = posStatus(fCount, SHL_MIN.F, 'Forwards');

        // ── Compute readiness score ──

        const weights = { GK: 20, D: 30, F: 30, Quality: 20 };
        const gkScore = Math.min(gkCount / SHL_MIN.GK, 1) * weights.GK;
        const dScore = Math.min(dCount / SHL_MIN.D, 1) * weights.D;
        const fScore = Math.min(fCount / SHL_MIN.F, 1) * weights.F;

        // Quality bonus: extensions + signings indicate commitment
        const qualityScore = Math.min((extensions.length + signings.length) / 5, 1) * weights.Quality;
        const readinessScore = Math.round(gkScore + dScore + fScore + qualityScore);

        // Readiness summary
        let readinessSummary;
        if (readinessScore >= 85) readinessSummary = 'Truppen tar form. Spetsvärvningar krävs fortfarande.';
        else if (readinessScore >= 65) readinessSummary = 'Nära — men luckor kan sänka bygget.';
        else if (readinessScore >= 45) readinessSummary = 'Under uppbyggnad. Flera positioner öppna.';
        else readinessSummary = 'Tidigt skede. Mycket arbete kvar.';

        // ── Critical signals ──

        const criticalNow = [];

        // Count vacant slots from rink_positions
        const vacantSlots = [];
        if (rink.goalies) {
            rink.goalies.forEach(g => { if (!g.player) vacantSlots.push('GK'); });
        }
        if (rink.defense_pairs) {
            rink.defense_pairs.forEach(pair => {
                if (pair.ld && !pair.ld.player) vacantSlots.push('LD');
                if (pair.rd && !pair.rd.player) vacantSlots.push('RD');
            });
        }
        if (rink.forward_lines) {
            rink.forward_lines.forEach(line => {
                if (line.lw && !line.lw.player) vacantSlots.push('LW');
                if (line.ce && !line.ce.player) vacantSlots.push('CE');
                if (line.rw && !line.rw.player) vacantSlots.push('RW');
            });
        }

        const vacantD = vacantSlots.filter(p => ['LD', 'RD'].includes(p)).length;
        const vacantGK = vacantSlots.filter(p => p === 'GK').length;
        const vacantF = vacantSlots.filter(p => ['CE', 'LW', 'RW'].includes(p)).length;

        if (vacantGK > 0) criticalNow.push(`Andremålvakt saknas — ${departures.filter(d => d.pos === 'GK').map(d => d.name).join(', ')} har lämnat`);
        if (vacantD >= 3) criticalNow.push(`${vacantD} backplatser vakanta — kräver spetsförstärkning`);
        else if (vacantD > 0) criticalNow.push(`${vacantD} backplats${vacantD > 1 ? 'er' : ''} att fylla`);
        if (expiring.length > 0) criticalNow.push(`${expiring.length} spelare med utgående kontrakt`);
        if (vacantF >= 3) criticalNow.push(`${vacantF} forwardsplatser vakanta`);

        if (criticalNow.length === 0) criticalNow.push('Inga kritiska luckor just nu');

        // ── Latest impact (from newest scraped article) ──

        const latestTransfer = newsFeed.find(n =>
            ['BEKRÄFTAT_NYFÖRVÄRV', 'BEKRÄFTAD_FÖRLUST', 'KONTRAKTSFÖRLÄNGNING'].includes(n.tag)
        );

        const latestImpact = latestTransfer ? {
            title: latestTransfer.title,
            impact_level: latestTransfer.tag === 'BEKRÄFTAD_FÖRLUST' ? 'high' : latestTransfer.tag === 'BEKRÄFTAT_NYFÖRVÄRV' ? 'high' : 'medium',
            meaning: latestTransfer.tag === 'BEKRÄFTAD_FÖRLUST'
                ? 'En förlust som behöver ersättas — följ truppbygget.'
                : latestTransfer.tag === 'BEKRÄFTAT_NYFÖRVÄRV'
                    ? 'Nyförvärv som stärker truppen direkt.'
                    : 'Förlängning som ger stabilitet i laget.',
        } : {
            title: 'Inga nya signaler just nu',
            impact_level: 'low',
            meaning: 'Håll utkik — transferfönstret är öppet.',
        };

        // ── Economy placeholder ──

        const economyStatus = {
            risk_level: '🟡 Medel',
            budget_pressure: 'Högt — SHL-löner kräver ökade intäkter',
            next_question: 'Har klubben råd med spetsvärvningar?',
        };

        // ── Meta ──

        const meta = {
            schema_version: '1.0',
            generated_at: new Date().toISOString(),
            source_updated_at: sillyData?._meta?.lastRefresh || null,
            freshness_status: sillyData?._meta?.lastRefresh
                ? (Date.now() - new Date(sillyData._meta.lastRefresh).getTime() < 3600000 ? 'fresh' : 'stale')
                : 'unknown',
            new_signals: newsFeed.filter(n => {
                const d = new Date(n.date);
                return (Date.now() - d.getTime()) < 86400000; // senaste 24h
            }).length,
            scraped_articles: newsFeed.length,
            expiring_contracts: expiring.length,
        };

        // ── Build response ──

        const snapshot = {
            title: 'Lövenläget',
            season: baseline.season || '2026/2027',
            league: baseline.league || 'SHL',
            readiness: {
                score: readinessScore,
                summary: readinessSummary,
            },
            critical_now: criticalNow.slice(0, 4),
            latest_impact: latestImpact,
            squad_status: {
                goalies: gkStatus.text,
                defense: dStatus.text,
                centers: ceStatus.text,
                forwards: fwStatus.text,
            },
            economy_status: economyStatus,
            meta,
        };

        res.json(snapshot);
    } catch (e) {
        console.error('[API] Lövenläget error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ===== CURRENT STATE ENGINE =====

app.get('/api/v1/current-state', async (req, res) => {
    try {
        // Load baseline data
        let baseline;
        try {
            delete require.cache[require.resolve('./silly-season-data')];
            baseline = require('./silly-season-data').SILLY_SEASON_BASELINE;
        } catch (e) {
            baseline = {};
        }

        // Get scraped news
        const sillyData = await sillyScraper.getSillySeasonData();
        const newsFeed = [
            ...(baseline.news_feed || []),
            ...(sillyData?.news_feed || []),
        ];

        // Economy data (load from static files)
        let economyData = null;
        try {
            const rawPath = path.join(__dirname, 'data', 'financials', 'bjorkloven_financials_raw.json');
            const rawJson = require('fs').readFileSync(rawPath, 'utf8');
            const rawData = JSON.parse(rawJson);
            const latestYear = rawData.years
                ?.filter(y => y.entity === 'if_bjorkloven_koncern')
                ?.sort((a, b) => b.financial_year.localeCompare(a.financial_year))[0];
            const shlMin = rawData.shl_requirements?.min_equity_shl || 10000000;
            economyData = {
                equity: latestYear?.equity || 0,
                cash: latestYear?.cash || 0,
                shlGap: Math.max(0, shlMin - (latestYear?.equity || 0)),
            };
        } catch (e) {
            // No economy data available
        }

        // Run Signal Engine
        const state = generateCurrentState(baseline, newsFeed, economyData);

        // Generate AI-powered snapshot (cached 1h)
        const snapshot = await getCurrentStateSnapshot(state.insights, state.rosterSummary);

        // Enrich with raw data for frontend flexibility
        snapshot.roster_summary = state.rosterSummary;
        snapshot.vacant_positions = state.vacantPositions;
        snapshot.shl_season = state.shlSeason;

        res.json(snapshot);
    } catch (e) {
        console.error('[API] Current State error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Force-refresh current state (bypass cache)
app.post('/api/v1/current-state/refresh', async (req, res) => {
    try {
        invalidateAiCache();
        res.json({ ok: true, message: 'Cache invalidated. Next GET will regenerate.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ===== STARTUP =====
// Start ETL watcher
startWatcher(EXCEL_DIR);

// Start silly season auto-refresh scraper
sillyScraper.startAutoRefresh();

app.listen(PORT, () => {
    console.log(`\n🏒 Björklöven Stats Hub`);
    console.log(`   Server:  http://localhost:${PORT}`);
    console.log(`   API:     http://localhost:${PORT}/api/matches`);
    console.log(`   API:     http://localhost:${PORT}/api/silly-season`);
    console.log(`   Excel:   ${EXCEL_DIR}`);
    console.log(`   DB:      ./data/stats.db\n`);
});
