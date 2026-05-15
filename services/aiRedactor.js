/**
 * AI Redactor — Gemini-powered text generation with aggressive caching
 * 
 * Takes structured insights from Signal Engine and generates
 * supporter-friendly text. Results are cached as snapshots.
 * 
 * Cost control: max 1 Gemini call per hour, ~$0.01/call.
 * Frontend reads only cached snapshots — zero runtime AI cost per page view.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

// In-memory snapshot cache
let cachedSnapshot = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600000; // 1 hour

// Snapshot history (last 24 entries ≈ 24 hours)
const snapshotHistory = [];
const MAX_HISTORY = 24;

/**
 * Build the AI prompt from structured insights
 */
function buildPrompt(insights, rosterSummary) {
    const concerns = insights.topConcerns.map(c =>
        `- ${c.label}: ${c.status} — ${c.reason}`
    ).join('\n');

    const positives = insights.topPositives.map(p =>
        `- ${p.label}: ${p.reason}${p.latest ? ` (Senast: "${p.latest}")` : ''}`
    ).join('\n') || '- Inga starka positiva signaler just nu.';

    return `Du är sportredaktör för Björklöven-fansen. Skriv en kort, intensiv nulägesanalys.

KONTEXT:
- Björklöven har precis vunnit HockeyAllsvenskan och ska upp i SHL 2026/2027.
- SHL-premiär om ${insights.daysRemaining} dagar.
- Nuvarande trupp: ${rosterSummary.signed} signerade spelare
- Nyförvärv: ${rosterSummary.signings}, Förlängningar: ${rosterSummary.extensions}, Tapp: ${rosterSummary.departures}
- Utgående kontrakt: ${rosterSummary.expiring}

NEGATIVA SIGNALER (sorterade efter allvar):
${concerns || '- Inga allvarliga negativa signaler.'}

POSITIVA SIGNALER:
${positives}

REGLER:
1. Skriv på svenska, supporterspråk — kort, direkt, inte corporate.
2. INGET HÅRDKODAT — allt ska baseras på ovan data.
3. Max 2 meningar per fält.
4. Var ärlig men inte domedagspredikande.
5. "biggest_question" ska formuleras som en direkt fråga.

Svara EXAKT i detta JSON-format (inget annat):
{
  "headline": "En intensiv rubrik (max 10 ord)",
  "body": "2-3 meningar som sammanfattar läget. Supporterspråk.",
  "biggest_question": "Den viktigaste frågan just nu, formulerad som en fråga",
  "latest_signal": "En mening om den senaste signalen/händelsen",
  "supporter_snack": [
    {"emoji": "🔥", "text": "Kort hype-punkt"},
    {"emoji": "😬", "text": "Kort oro-punkt"},
    {"emoji": "🧨", "text": "Kort irritation-punkt"},
    {"emoji": "💚", "text": "Kort hopp-punkt"}
  ],
  "next_watch": ["Nästa snackis 1", "Nästa snackis 2", "Nästa snackis 3", "Nästa snackis 4"]
}`;
}

/**
 * Call Gemini API
 */
async function callGemini(prompt) {
    if (!GEMINI_API_KEY) {
        console.warn('[AI Redactor] No GEMINI_API_KEY — using fallback');
        return null;
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800,
                    responseMimeType: 'application/json',
                },
            }),
        });

        if (!response.ok) {
            console.error(`[AI Redactor] Gemini API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;

        return JSON.parse(text);
    } catch (e) {
        console.error('[AI Redactor] Gemini call failed:', e.message);
        return null;
    }
}

/**
 * Generate deterministic fallback when AI is unavailable
 */
function generateFallback(insights, rosterSummary) {
    const topConcern = insights.topConcerns[0];
    const topPositive = insights.topPositives[0];

    const headline = insights.criticalCount >= 2
        ? 'Flera luckor att täppa till innan SHL-start.'
        : insights.criticalCount === 1
            ? `${topConcern?.label || 'Truppen'} kräver akut förstärkning.`
            : 'Bygget rullar vidare — men jobbet är inte klart.';

    const bodyParts = [];
    if (topPositive) bodyParts.push(`${topPositive.label} ger energi i bygget.`);
    if (topConcern) bodyParts.push(`Men ${topConcern.label.toLowerCase()} är fortfarande den stora frågan.`);
    if (rosterSummary.expiring > 0) bodyParts.push(`${rosterSummary.expiring} spelare har utgående kontrakt.`);

    return {
        headline,
        body: bodyParts.join(' '),
        biggest_question: topConcern
            ? `Hur löser Löven ${topConcern.label.toLowerCase()}?`
            : 'Vad blir nästa drag i truppbygget?',
        latest_signal: topPositive?.latest
            ? `Senaste beskedet: "${topPositive.latest}"`
            : 'Inga nya signaler de senaste dagarna.',
        supporter_snack: [
            { emoji: '🔥', text: topPositive ? `${topPositive.label} stärker bygget` : 'Truppen tar form' },
            { emoji: '😬', text: topConcern ? `${topConcern.label} oroar` : 'Inget akut — men bevaka' },
            { emoji: '🧨', text: rosterSummary.expiring > 0 ? 'Kontraktsbesked dröjer' : 'Tyst på transferfronten' },
            { emoji: '💚', text: `${rosterSummary.signed} spelare klara för SHL` },
        ],
        next_watch: insights.watchList.length > 0
            ? insights.watchList.map(w => `Lösa ${w.toLowerCase()}`)
            : ['Nästa nyförvärv', 'Kontraktsbesked', 'Försäsongsschema'],
    };
}

/**
 * Generate or retrieve cached current state snapshot
 */
async function getCurrentStateSnapshot(insights, rosterSummary) {
    const now = Date.now();

    // Return cache if fresh
    if (cachedSnapshot && (now - cacheTimestamp) < CACHE_TTL) {
        return { ...cachedSnapshot, _cached: true };
    }

    // Build prompt and call AI
    const prompt = buildPrompt(insights, rosterSummary);
    let aiOutput = await callGemini(prompt);

    // Use fallback if AI unavailable
    if (!aiOutput) {
        aiOutput = generateFallback(insights, rosterSummary);
        aiOutput._fallback = true;
    }

    // Build complete snapshot
    const snapshot = {
        status: insights.mood.color,
        mood_label: insights.mood.label,
        headline: aiOutput.headline,
        body: aiOutput.body,
        biggest_question: aiOutput.biggest_question,
        latest_signal: aiOutput.latest_signal,
        supporter_snack: aiOutput.supporter_snack,
        next_watch: aiOutput.next_watch,
        shl_days_remaining: insights.daysRemaining,
        evidence: insights.topConcerns,
        milestones: insights.milestones,
        meta: {
            generated_at: new Date().toISOString(),
            signal_count: insights.totalSignals,
            critical_count: insights.criticalCount,
            ai_generated: !aiOutput._fallback,
            cached: false,
        },
    };

    // Cache and store in history
    cachedSnapshot = snapshot;
    cacheTimestamp = now;
    snapshotHistory.unshift({ ...snapshot, _historyTimestamp: new Date().toISOString() });
    if (snapshotHistory.length > MAX_HISTORY) snapshotHistory.pop();

    return snapshot;
}

/**
 * Get snapshot history for trend display
 */
function getSnapshotHistory() {
    return snapshotHistory.slice(0, 10);
}

/**
 * Force refresh (bypass cache)
 */
function invalidateCache() {
    cacheTimestamp = 0;
}

module.exports = { getCurrentStateSnapshot, getSnapshotHistory, invalidateCache };
