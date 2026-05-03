import { useEffect } from 'react';
import { useMatchStore } from '../../store/useMatchStore';

export function LiveScoreboard() {
    const { data, simulateTick } = useMatchStore();

    useEffect(() => {
        // Start the simulation clock for visual effect
        const interval = setInterval(simulateTick, 1000);
        return () => clearInterval(interval);
    }, [simulateTick]);

    if (!data) return null;

    const { homeTeam, awayTeam, period, clock, status } = data;

    return (
        <div className="glass-panel" style={{ 
            padding: '2.5rem 2rem', 
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px'
        }}>
            {/* Background glowing effects for teams */}
            <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%',
                background: `linear-gradient(to right, ${homeTeam.color}33, transparent)`,
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%',
                background: `linear-gradient(to left, ${awayTeam.color}33, transparent)`,
                zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                
                {/* Home Team */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        {homeTeam.abbreviation}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.2rem' }}>{homeTeam.name}</p>
                    <div style={{ 
                        fontSize: '6rem', 
                        fontWeight: 900, 
                        lineHeight: 1,
                        background: `linear-gradient(to bottom, #ffffff, ${homeTeam.color})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))',
                        marginTop: '0.5rem'
                    }}>
                        {homeTeam.score}
                    </div>
                </div>

                {/* Clock & Status */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%' }}>
                    <div style={{ 
                        background: 'rgba(0,0,0,0.6)', 
                        padding: '0.5rem 1.5rem', 
                        borderRadius: '20px',
                        border: '1px solid var(--glass-border)',
                        color: status === 'LIVE' ? '#ef4444' : 'var(--text-muted)',
                        fontWeight: 800,
                        letterSpacing: '0.15em',
                        fontSize: '0.85rem',
                        marginBottom: '1rem',
                        animation: status === 'LIVE' ? 'pulse 2s infinite' : 'none'
                    }}>
                        {status === 'LIVE' ? 'LIVE' : status}
                    </div>
                    
                    <div style={{ 
                        fontSize: '4.5rem', 
                        fontWeight: 800, 
                        fontFamily: 'monospace', 
                        letterSpacing: '-0.05em',
                        textShadow: '0 0 20px rgba(255,255,255,0.2)'
                    }}>
                        {clock}
                    </div>
                    <div style={{ color: 'var(--brand-gold)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '1rem', marginTop: '0.5rem' }}>
                        Period {period}
                    </div>
                </div>

                {/* Away Team */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        {awayTeam.abbreviation}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.2rem' }}>{awayTeam.name}</p>
                    <div style={{ 
                        fontSize: '6rem', 
                        fontWeight: 900, 
                        lineHeight: 1,
                        background: `linear-gradient(to bottom, #ffffff, ${awayTeam.color})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))',
                        marginTop: '0.5rem'
                    }}>
                        {awayTeam.score}
                    </div>
                </div>

            </div>
            
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    50% { opacity: 0.7; box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </div>
    );
}
