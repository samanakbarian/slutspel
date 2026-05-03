import { useEffect } from 'react';
import { useMatchStore } from '../store/useMatchStore';
import { LiveScoreboard } from '../components/match/LiveScoreboard';
import { PlayByPlay } from '../components/match/PlayByPlay';
import { MatchStats } from '../components/match/MatchStats';

export function Matchcenter() {
    const { fetchLiveMatch, isLoading } = useMatchStore();

    useEffect(() => {
        fetchLiveMatch();
    }, [fetchLiveMatch]);

    if (isLoading) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <h2>Laddar Matchcenter...</h2>
            </div>
        );
    }

    return (
        <div className="animate-fade-up" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-green)', letterSpacing: '0.1em' }}>
                    MATCHCENTER
                </span>
                <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Live Scoreboard
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Följ matchen i realtid. Data simuleras för att visa designen.
                </p>
            </div>

            {/* Scoreboard */}
            <LiveScoreboard />
            
            {/* Main Content Layout (2-kolumner) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                <div style={{ flex: '2 1 500px' }}>
                    <PlayByPlay />
                </div>
                <div style={{ flex: '1 1 300px' }}>
                    <MatchStats />
                </div>
            </div>
        </div>
    );
}
