import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

export interface CurrentState {
    status: string;
    mood_label: string;
    headline: string;
    body: string;
    biggest_question: string;
    latest_signal: string;
    supporter_snack: { emoji: string; text: string }[];
    next_watch: string[];
    shl_days_remaining: number;
    evidence: { label: string; status: string; reason: string; score: number }[];
    milestones: { id: string; label: string; period: string; emoji: string; status: string }[];
    roster_summary: { signed: number; departures: number; signings: number; extensions: number; expiring: number };
    vacant_positions: { pos: string; rumors: string[] }[];
    shl_season: { premiere_date: string; team: string; league: string; season_label: string };
    meta: { generated_at: string; signal_count: number; critical_count: number; ai_generated: boolean; cached: boolean };
}

export function useCurrentState() {
    const [data, setData] = useState<CurrentState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const FALLBACK_CURRENT_STATE_API = 'https://loven-api-324947473206.europe-north1.run.app';
        const tryFetch = async (baseUrl: string) => {
            const r = await fetch(`${baseUrl}/api/v1/current-state`, { cache: 'no-store' });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        };

        tryFetch(API_URL)
            .catch(async (primaryError) => {
                if (String(primaryError?.message || '').includes('404')) {
                    return tryFetch(FALLBACK_CURRENT_STATE_API);
                }
                throw primaryError;
            })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setIsLoading(false));
    }, []);

    return { data, isLoading, error };
}
