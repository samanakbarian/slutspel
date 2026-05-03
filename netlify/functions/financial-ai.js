exports.handler = async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    if (!process.env.GEMINI_API_KEY) {
        return {
            statusCode: 503,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }),
        };
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const prompt = [
            'Du ar en strikt finansiell analytiker som skriver pa svenska.',
            'Anvand endast siffror och fakta i JSON-underlaget.',
            'Hitta inte pa historik, framtidsprognoser eller externa antaganden som inte explicit framgar av underlaget.',
            'Prioritera det som ar viktigast for ekonomisk styrka, trendbrott, skillnaden mellan A-lag och koncern samt SHL-beredskap.',
            'Scenarioanalysen ska utga fran scenarierna i payloaden och beskriva ekonomisk betydelse, inte hitta pa nya siffror.',
            'Returnera ENDAST JSON med formatet:',
            '{"summary":"...", "key_drivers":"...", "team_vs_group":"...", "trend_breaks":"...", "shl_economy_focus":"...", "bull_points":["..."], "risk_points":["..."], "recommendations":["..."], "scenario_analysis":[{"label":"...", "analysis":"..."}]}',
            'Hall summary kort men konkret. Hall de narrativa falten till 2-4 meningar vardera.',
            'Scenarioanalys ska ha upp till 3 objekt och anvanda samma etiketter som i underlaget om de finns.',
            '',
            'Underlag:',
            JSON.stringify(payload)
        ].join('\n');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json',
                },
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            return {
                statusCode: 502,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Gemini request failed', details: text }),
            };
        }

        const raw = await response.json();
        const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return {
                statusCode: 502,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Gemini response missing text' }),
            };
        }

        const parsed = JSON.parse(text);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message || 'Unknown AI error' }),
        };
    }
};
