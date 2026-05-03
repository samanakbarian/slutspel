import { useMatchStore } from '../../store/useMatchStore';
import type { MatchEvent } from '../../types/match';
import { CircleDot, AlertTriangle, Clock } from 'lucide-react';

export function PlayByPlay() {
    const { data } = useMatchStore();

    if (!data) return null;

    const { events, homeTeam, awayTeam } = data;

    // Sortera fallande: senaste händelsen överst
    // Antar id representerar ordningen, men vi kan också vända arrayen.
    const sortedEvents = [...events].reverse();

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'GOAL':
                return <CircleDot size={20} color="var(--brand-gold)" />;
            case 'PENALTY':
                return <AlertTriangle size={20} color="var(--text-muted)" />;
            case 'PERIOD_START':
            case 'PERIOD_END':
                return <Clock size={20} color="var(--brand-green-light)" />;
            default:
                return <CircleDot size={16} />;
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                Play-by-play
            </h2>

            <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
                {/* Den vertikala mittlinjen */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '50%',
                    width: '2px',
                    background: 'var(--glass-border)',
                    transform: 'translateX(-50%)',
                    zIndex: 0
                }} />

                {sortedEvents.map((event: MatchEvent, index: number) => {
                    const isHome = event.teamId === homeTeam.id;
                    const isAway = event.teamId === awayTeam.id;
                    const isNeutral = !isHome && !isAway;

                    return (
                        <div key={event.id || index} style={{
                            display: 'flex',
                            justifyContent: isNeutral ? 'center' : 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            {/* Vänster sida (Hemma-lag) */}
                            <div style={{ 
                                width: '45%', 
                                textAlign: 'right', 
                                paddingRight: '2rem',
                                opacity: isHome || isNeutral ? 1 : 0 
                            }}>
                                {isHome && (
                                    <div className="animate-fade-up">
                                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{event.clock} - {event.description}</div>
                                        {event.player && <div style={{ color: 'var(--brand-gold)', fontSize: '0.9rem' }}>{event.player}</div>}
                                        {event.assist1 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Ass: {event.assist1}{event.assist2 ? `, ${event.assist2}` : ''}</div>}
                                    </div>
                                )}
                            </div>

                            {/* Center (Ikon) */}
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--app-bg)',
                                border: '2px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 2,
                                flexShrink: 0,
                                boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                            }}>
                                {getEventIcon(event.type)}
                            </div>

                            {/* Höger sida (Borta-lag) */}
                            <div style={{ 
                                width: '45%', 
                                textAlign: 'left', 
                                paddingLeft: '2rem',
                                opacity: isAway || isNeutral ? 1 : 0 
                            }}>
                                {isAway && (
                                    <div className="animate-fade-up">
                                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{event.clock} - {event.description}</div>
                                        {event.player && <div style={{ color: 'var(--brand-gold)', fontSize: '0.9rem' }}>{event.player}</div>}
                                        {event.assist1 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Ass: {event.assist1}{event.assist2 ? `, ${event.assist2}` : ''}</div>}
                                    </div>
                                )}
                                
                                {isNeutral && (
                                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '200px', textAlign: 'center' }}>
                                        <div style={{ background: 'var(--glass-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {event.description} (Per {event.period})
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
