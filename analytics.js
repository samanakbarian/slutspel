const { db, loadAllMatches } = require('./db');

function pct(a, b) { return b > 0 ? (a / b * 100) : 0; }
function safeNum(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

/**
 * Normalizes a value per 60 minutes.
 */
function per60(val, toiSeconds) {
    if (!toiSeconds || toiSeconds === 0) return 0;
    return (val / (toiSeconds / 3600));
}

/**
 * Standard deviation
 */
function stdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
}

/**
 * Calculates F-LINE1: Linjekemi-score
 * 35% +/- | 30% SOG/min | 20% EV Goals | 15% Discipline (inv PIM)
 */
function calcLineChemistry(linePlayers) {
    if (!linePlayers || !linePlayers.length) return 0;

    const totalPM = linePlayers.reduce((s, p) => s + p.plusMinus, 0);
    const totalSOG = linePlayers.reduce((s, p) => s + p.sog, 0);
    const totalTOISeconds = linePlayers.reduce((s, p) => s + p.toiSeconds, 0);
    const totalGoals = linePlayers.reduce((s, p) => s + p.goals, 0);
    const totalPPG = linePlayers.reduce((s, p) => s + p.ppg, 0);
    const evGoals = totalGoals - totalPPG;
    const totalPIM = linePlayers.reduce((s, p) => s + p.pim, 0);

    // Normalization approximations
    // PM per player (good is > 0)
    const pmScore = Math.min(Math.max((totalPM / linePlayers.length) * 10 + 50, 0), 100);

    // SOG per minute (good is > 0.5)
    const sogPerMin = totalTOISeconds > 0 ? (totalSOG / (totalTOISeconds / 60)) : 0;
    const sogScore = Math.min((sogPerMin / 1.0) * 100, 100);

    // EV Goals (good is > 0 per match for a line)
    const evGoalScore = Math.min(evGoals * 25 + 25, 100); // 0 goals = 25, 1 = 50, 2 = 75, 3+ = 100

    // Discipline (inv PIM, less is better)
    const pimScore = Math.max(100 - (totalPIM * 10), 0);

    return (pmScore * 0.35) + (sogScore * 0.30) + (evGoalScore * 0.20) + (pimScore * 0.15);
}

/**
 * Calculates advanced metrics for a single player match record
 */
function enrichSkaterMatch(s) {
    s.pts = s.goals + s.assists;

    // Per 60
    s.g60 = per60(s.goals, s.toiSeconds);
    s.a60 = per60(s.assists, s.toiSeconds);
    s.pts60 = per60(s.pts, s.toiSeconds);
    s.sog60 = per60(s.sog, s.toiSeconds);
    s.hits60 = per60(s.hits, s.toiSeconds);
    s.pim60 = per60(s.pim, s.toiSeconds);

    // Efficiencies
    s.shPct = pct(s.goals, s.sog);
    s.shotAccuracy = pct(s.sog, s.sog + s.shotsWide);
    s.ppShPct = s.ppsog > 0 ? pct(s.ppg, s.ppsog) : 0;
    s.scoreEff = pct(s.pts, s.sog + s.shotsWide);
    s.offRating = s.g60 * 2 + s.a60 * 1;
    return s;
}

/**
 * Calculates goalie stress index and GAA
 */
function enrichGoalieMatch(g, teamSvsPctAvg = 90) {
    // Approximate GAA if TOI is not present, assume 60 mins per game 
    // Custom formula from spec: GA / (SOGA / lagets SVS% antagande)
    g.gaa = g.ga / (g.soga > 0 ? (g.soga / (teamSvsPctAvg / 100)) / (g.ga + g.svs > 0 ? 1 : 1) : 1);
    g.gaa = isNaN(g.gaa) || !isFinite(g.gaa) ? g.ga * 1.0 : g.gaa; // Fallback

    g.spgaRatio = pct(g.spga, g.ga);

    // Stressindex: SOGA x (1 - SVS% / 100) x SPGA-vikt
    // SPGA-vikt: if SPGA > 0 then slightly higher stress weight
    const spgaWeight = 1 + (g.spga / Math.max(g.ga, 1) * 0.2);
    g.stressIndex = g.soga * (1 - (g.svsPct / 100)) * spgaWeight;

    return g;
}

/**
 * Calculates team tactical stats for a match
 */
function calcTeamTactical(team, oppSogTotal) {
    const t = team.totals;
    const bjSogSw = t.sog + t.shotsWide;

    t.corsiLite = pct(bjSogSw, bjSogSw + oppSogTotal); // Appx, opp shots wide ignored if we lack data
    t.shotDiff = t.sog - oppSogTotal;
    t.ppEff = t.ppg > 0 ? (t.ppg) : 0; // Requires full PP occurrences to be accurate
    t.physicalDom = t.hits;
    return t;
}

/**
 * Enriches the entire player career/season object with Form, Consistency, Role
 */
function enrichPlayerSeason(p, teamAverages = null) {
    const gp = Math.max(p.gamesPlayed, 1);
    const t = p.totals;

    if (p.pos === 'GK') {
        p.svsPct = pct(t.svs, t.soga);
        return p;
    }

    p.pts = t.goals + t.assists;
    p.gpg = t.goals / gp;
    p.apg = t.assists / gp;
    p.ptspg = p.pts / gp;
    p.shPct = pct(t.goals, t.sog);

    // Consistency
    if (p.trend.length >= 2) {
        const ptsTrend = p.trend.map(g => g.goals + g.assists);
        const sd = stdDev(ptsTrend);
        const mean = p.ptspg;
        p.consistencyObj = {
            score: mean > 0 ? 1 - (sd / mean) : 0,
            sd: sd,
            rating: sd <= 0.5 ? 'Hög' : (sd <= 1.0 ? 'Medel' : 'Låg')
        };
    } else {
        p.consistencyObj = { score: 0, sd: 0, rating: '—' };
    }

    // Form Index (0.5 * last + 0.3 * prev + 0.2 * oldest)
    const T = p.trend;
    if (T.length > 0) {
        const sorted = [...T].sort((a, b) => b.matchId.localeCompare(a.matchId)); // newest first
        const pts1 = sorted[0] ? (sorted[0].goals + sorted[0].assists) : 0;
        const pts2 = sorted[1] ? (sorted[1].goals + sorted[1].assists) : 0;
        const pts3 = sorted[2] ? (sorted[2].goals + sorted[2].assists) : 0;

        let formIdx = 0;
        if (sorted.length >= 3) formIdx = (pts1 * 0.5) + (pts2 * 0.3) + (pts3 * 0.2);
        else if (sorted.length === 2) formIdx = (pts1 * 0.6) + (pts2 * 0.4);
        else formIdx = pts1;

        p.formIndex = parseFloat(formIdx.toFixed(2));

        // Trend icon logic
        const ratio = p.ptspg > 0 ? formIdx / p.ptspg : formIdx;
        if (ratio >= 1.5 || formIdx >= 1.5) p.formLabel = '🔥';
        else if (ratio >= 1.0 || formIdx >= 0.8) p.formLabel = '📈';
        else if (ratio >= 0.5) p.formLabel = '📉';
        else p.formLabel = '🧊';
    }

    // Role classification based on v2 spec
    const classify = () => {
        const isDef = ['LD', 'RD'].includes(p.pos);
        const hpg = t.hits / gp;
        const pimpg = t.pim / gp;

        if (isDef) {
            if (p.gpg >= 0.3 || p.ptspg >= 0.6) return { role: 'Offensiv Back', css: 'role-offD' };
            return { role: 'Defensiv Back', css: 'role-stayD' };
        }

        // Sniper: High Sh% and High SOG
        if (p.shPct >= 15 && (t.sog / gp) >= 2.0) return { role: 'Sniper', css: 'role-sniper' };

        // Playmaker: Assits > Goals * 1.5
        if (p.apg >= 0.6 && p.apg > p.gpg * 1.5) return { role: 'Playmaker', css: 'role-playmaker' };

        // Enforcer: Hits or PIM high
        if (hpg >= 3 || pimpg >= 3) return { role: 'Enforcer', css: 'role-enforcer' };

        // Power Forward: Hits and Med Points
        if (hpg >= 1.5 && (t.plusMinus / gp) >= 0 && p.ptspg >= 0.4) return { role: 'Power Forward', css: 'role-power' };

        // Twoway
        if ((t.plusMinus / gp) >= 0.3 && hpg >= 1) return { role: 'Tvåvägsforward', css: 'role-twoway' };

        // Defensiv
        if ((t.plusMinus / gp) >= 0 && p.gpg < 0.3) return { role: 'Defensiv Forward', css: 'role-defensive' };

        return { role: 'Forward', css: 'role-twoway' };
    };

    const roleObj = classify();
    p.role = roleObj.role;
    p.css = roleObj.css;

    return p;
}

module.exports = {
    enrichSkaterMatch,
    enrichGoalieMatch,
    calcTeamTactical,
    enrichPlayerSeason,
    calcLineChemistry,
    per60
};
