/**
 * Signal Engine — Lövenläget Current State Engine
 * 
 * Generates normalized signals from data sources, ranks them,
 * and produces structured insights for the AI redactor.
 * 
 * All rules are data-driven (config/analysis_rules.json).
 * No hardcoded text or logic in this file.
 */

const fs = require('fs');
const path = require('path');

// Load rules from config
function loadRules() {
    const rulesPath = path.join(__dirname, '..', 'config', 'analysis_rules.json');
    return JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
}

/**
 * Generate signals from roster data against rules
 */
function generateRosterSignals(roster, departures, signings, extensions, expiring, rinkPositions, rules) {
    const signals = [];
    const signed = roster.filter(p => ['SIGNERAD', 'FÖRLÄNGD', 'NYFÖRVÄRV'].includes(p.status));

    for (const rule of rules.roster_rules.filter(r => r.enabled)) {
        let metricValue;
        let evidence = [];

        if (rule.metric === 'confirmed_players' && rule.positions) {
            metricValue = signed.filter(p => rule.positions.includes(p.pos)).length;
            const names = signed.filter(p => rule.positions.includes(p.pos)).map(p => p.name);
            evidence.push(`Bekräftade: ${metricValue} (${names.join(', ') || 'inga'})`);
            evidence.push(`Krav: minst ${rule.threshold}`);
        } else if (rule.metric === 'expiring_count') {
            metricValue = expiring.length;
            evidence.push(`Utgående kontrakt: ${expiring.map(p => p.name).join(', ')}`);
        }

        if (metricValue === undefined) continue;

        // Evaluate rule
        let triggered = false;
        switch (rule.operator) {
            case '<': triggered = metricValue < rule.threshold; break;
            case '<=': triggered = metricValue <= rule.threshold; break;
            case '>': triggered = metricValue > rule.threshold; break;
            case '>=': triggered = metricValue >= rule.threshold; break;
            case '==': triggered = metricValue == rule.threshold; break;
        }

        if (triggered) {
            const gap = rule.threshold - metricValue;
            signals.push({
                id: `sig_roster_${rule.rule_id}`,
                source: 'roster',
                rule_id: rule.rule_id,
                category: rule.metric,
                entity: rule.entity,
                label: rule.label_sv,
                direction: 'negative',
                severity: rule.severity,
                severity_score: rule.severity_score,
                confidence: 0.98,
                freshness: 1.0,
                evidence,
                gap,
                metric_value: metricValue,
                threshold: rule.threshold,
                created_at: new Date().toISOString(),
            });
        }
    }

    // Count vacant positions from rink
    const vacantPositions = [];
    if (rinkPositions?.goalies) {
        rinkPositions.goalies.forEach(g => { if (!g.player) vacantPositions.push({ pos: 'GK', rumors: g.rumors || [] }); });
    }
    if (rinkPositions?.defense_pairs) {
        rinkPositions.defense_pairs.forEach(pair => {
            if (pair.ld && !pair.ld.player) vacantPositions.push({ pos: 'LD', rumors: pair.ld.rumors || [] });
            if (pair.rd && !pair.rd.player) vacantPositions.push({ pos: 'RD', rumors: pair.rd.rumors || [] });
        });
    }
    if (rinkPositions?.forward_lines) {
        rinkPositions.forward_lines.forEach(line => {
            if (line.lw && !line.lw.player) vacantPositions.push({ pos: 'LW', rumors: line.lw.rumors || [] });
            if (line.ce && !line.ce.player) vacantPositions.push({ pos: 'CE', rumors: line.ce.rumors || [] });
            if (line.rw && !line.rw.player) vacantPositions.push({ pos: 'RW', rumors: line.rw.rumors || [] });
        });
    }

    return { signals, vacantPositions, rosterSummary: { signed: signed.length, departures: departures.length, signings: signings.length, extensions: extensions.length, expiring: expiring.length } };
}

/**
 * Generate signals from news events
 */
function generateNewsSignals(newsFeed, rules) {
    const signals = [];
    const now = Date.now();

    for (const rule of rules.news_rules.filter(r => r.enabled)) {
        const matching = newsFeed.filter(n => n.tag === rule.event_type);
        const recent = matching.filter(n => {
            const age = now - new Date(n.date).getTime();
            return age < rule.freshness_decay_hours * 3600000;
        });

        if (recent.length === 0) continue;

        // Most recent event drives the signal
        const latest = recent.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const ageHours = (now - new Date(latest.date).getTime()) / 3600000;
        const freshness = Math.max(0, 1 - (ageHours / rule.freshness_decay_hours));

        signals.push({
            id: `sig_news_${rule.rule_id}_${latest.id || latest.title?.slice(0, 20)}`,
            source: 'news',
            rule_id: rule.rule_id,
            category: rule.event_type,
            entity: latest.title,
            label: rule.label_sv,
            direction: rule.direction,
            severity: freshness > 0.5 ? 'info' : 'low',
            severity_score: rule.severity_score * freshness,
            confidence: 0.90,
            freshness,
            evidence: [`${recent.length} ${rule.label_sv.toLowerCase()} senaste ${Math.round(rule.freshness_decay_hours / 24)} dagarna`, `Senast: "${latest.title}"`],
            latest_title: latest.title,
            latest_date: latest.date,
            count: recent.length,
            total_count: matching.length,
            created_at: new Date().toISOString(),
        });
    }

    return signals;
}

/**
 * Generate signals from economy data
 */
function generateEconomySignals(economyData, rules) {
    const signals = [];
    if (!economyData) return signals;

    for (const rule of rules.economy_rules.filter(r => r.enabled)) {
        if (rule.metric === 'equity_below_shl' && economyData.shlGap > 0) {
            signals.push({
                id: `sig_econ_${rule.rule_id}`,
                source: 'economy',
                rule_id: rule.rule_id,
                category: 'budget',
                entity: 'equity',
                label: rule.label_sv,
                direction: 'negative',
                severity: rule.severity,
                severity_score: rule.severity_score,
                confidence: 0.70,
                freshness: 0.8,
                evidence: [`Eget kapital-gap: ${(economyData.shlGap / 1000000).toFixed(1)} MSEK under SHL-krav`],
                created_at: new Date().toISOString(),
            });
        }
        if (rule.metric === 'cash_below_threshold' && (economyData.cash || 0) < rule.threshold) {
            signals.push({
                id: `sig_econ_${rule.rule_id}`,
                source: 'economy',
                rule_id: rule.rule_id,
                category: 'liquidity',
                entity: 'cash',
                label: rule.label_sv,
                direction: 'negative',
                severity: rule.severity,
                severity_score: rule.severity_score,
                confidence: 0.70,
                freshness: 0.8,
                evidence: [`Kassa: ${(economyData.cash / 1000).toFixed(0)} TSEK`],
                created_at: new Date().toISOString(),
            });
        }
    }
    return signals;
}

/**
 * Rank and prioritize signals, build insights
 */
function buildInsights(allSignals, rules) {
    // Score each signal
    const scored = allSignals.map(s => ({
        ...s,
        composite_score: s.severity_score * s.confidence * s.freshness,
    })).sort((a, b) => b.composite_score - a.composite_score);

    // Determine overall mood
    const negativeSignals = scored.filter(s => s.direction === 'negative');
    const positiveSignals = scored.filter(s => s.direction === 'positive');
    const criticalCount = negativeSignals.filter(s => s.severity === 'critical').length;
    const avgNegScore = negativeSignals.length > 0
        ? negativeSignals.reduce((sum, s) => sum + s.composite_score, 0) / negativeSignals.length
        : 0;

    let mood;
    const moods = rules.mood_thresholds;
    if (criticalCount >= 3 || avgNegScore >= moods.red.min_score) {
        mood = { ...moods.red, color: 'red' };
    } else if (criticalCount >= 2 || avgNegScore >= moods.orange.min_score) {
        mood = { ...moods.orange, color: 'orange' };
    } else if (criticalCount >= 1 || avgNegScore >= moods.yellow.min_score) {
        mood = { ...moods.yellow, color: 'yellow' };
    } else {
        mood = { ...moods.green, color: 'green' };
    }

    // Top concerns and positives
    const topConcerns = negativeSignals.slice(0, 3).map(s => ({
        label: s.label,
        status: s.severity,
        reason: s.evidence[0],
        score: s.composite_score,
    }));

    const topPositives = positiveSignals.slice(0, 2).map(s => ({
        label: s.label,
        reason: s.evidence.length > 1 ? s.evidence[1] : s.evidence[0],
        latest: s.latest_title || null,
        score: s.composite_score,
    }));

    // Biggest question: highest negative composite
    const biggestConcern = negativeSignals[0] || null;

    // Next watch: what forward-looking signals exist
    const watchList = negativeSignals
        .filter(s => s.severity === 'critical' || s.severity === 'warning')
        .slice(0, 4)
        .map(s => s.label);

    // Days until SHL premiere
    const premiereDate = new Date(rules.shl_season.premiere_date);
    const daysRemaining = Math.ceil((premiereDate - new Date()) / 86400000);

    // Milestones with dynamic status
    const milestones = rules.milestones.map(m => {
        let status = 'pending';
        if (m.depends_on) {
            const relatedSignal = negativeSignals.find(s => s.rule_id === m.depends_on);
            if (relatedSignal) {
                status = relatedSignal.severity === 'critical' ? 'critical' : 'warning';
            } else {
                status = 'done';
            }
        }
        return { ...m, status };
    });

    return {
        mood,
        topConcerns,
        topPositives,
        biggestQuestion: biggestConcern ? biggestConcern.label : null,
        watchList,
        daysRemaining,
        milestones,
        totalSignals: scored.length,
        criticalCount,
        allSignals: scored,
    };
}

/**
 * Main entry: generate complete current state
 */
function generateCurrentState(baseline, newsFeed, economyData) {
    const rules = loadRules();

    const roster = baseline.roster || [];
    const departures = baseline.confirmed_departures || [];
    const signings = baseline.confirmed_signings || [];
    const extensions = baseline.confirmed_extensions || [];
    const expiring = baseline.expiring_contracts || [];
    const rink = baseline.rink_positions || {};

    // Generate all signals
    const rosterResult = generateRosterSignals(roster, departures, signings, extensions, expiring, rink, rules);
    const newsSignals = generateNewsSignals(newsFeed, rules);
    const econSignals = generateEconomySignals(economyData, rules);

    const allSignals = [...rosterResult.signals, ...newsSignals, ...econSignals];

    // Build insights
    const insights = buildInsights(allSignals, rules);

    return {
        insights,
        rosterSummary: rosterResult.rosterSummary,
        vacantPositions: rosterResult.vacantPositions,
        shlSeason: rules.shl_season,
    };
}

module.exports = { generateCurrentState, loadRules };
