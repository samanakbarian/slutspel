import { useEffect } from 'react';
import { useRosterStore } from '../store/useRosterStore';
import type { RosterPlayer } from '../types/roster';

export function Roster() {
    const { players, isLoading, fetchRoster } = useRosterStore();

    useEffect(() => {
        fetchRoster();
    }, [fetchRoster]);

    if (isLoading) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <h2>Laddar truppen...</h2>
            </div>
        );
    }

    const goalies = players.filter(p => p.category === 'GOALIE');
    const defensemen = players.filter(p => p.category === 'DEFENSE');
    const forwards = players.filter(p => p.category === 'FORWARD');

    const renderSkaterTable = (title: string, skaters: RosterPlayer[]) => (
        <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--brand-gold)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                {title}
            </h2>
            <div className="glass-panel" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '1rem' }}>Nr</th>
                            <th style={{ padding: '1rem' }}>Spelare</th>
                            <th style={{ padding: '1rem' }}>Pos</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>GP</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>G</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>A</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>PTS</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>+/-</th>
                        </tr>
                    </thead>
                    <tbody>
                        {skaters.map(p => (
                            <tr key={p.id} style={{ borderTop: '1px solid var(--glass-border)', transition: 'background 0.2s', cursor: 'pointer' }} className="table-row-hover">
                                <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--brand-green-light)' }}>#{p.number}</td>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>{p.firstName} <span style={{ color: 'var(--text-primary)' }}>{p.lastName}</span></td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.position}</td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>{p.gamesPlayed}</td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>{p.goals}</td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>{p.assists}</td>
                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: 'var(--brand-gold)' }}>{p.points}</td>
                                <td style={{ padding: '1rem', textAlign: 'center', color: (p.plusMinus || 0) > 0 ? 'var(--brand-green)' : ((p.plusMinus || 0) < 0 ? 'var(--impact-negative)' : 'var(--text-muted)') }}>
                                    {(p.plusMinus || 0) > 0 ? `+${p.plusMinus}` : p.plusMinus}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <style>{`
                .table-row-hover:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
            `}</style>
        </div>
    );

    const renderGoalieTable = (goalies: RosterPlayer[]) => (
        <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--brand-gold)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                Målvakter
            </h2>
            <div className="glass-panel" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '1rem' }}>Nr</th>
                            <th style={{ padding: '1rem' }}>Spelare</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>GP</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>SV%</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>GAA</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>SO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {goalies.map(p => (
                            <tr key={p.id} style={{ borderTop: '1px solid var(--glass-border)', transition: 'background 0.2s', cursor: 'pointer' }} className="table-row-hover">
                                <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--brand-green-light)' }}>#{p.number}</td>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>{p.firstName} <span style={{ color: 'var(--text-primary)' }}>{p.lastName}</span></td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>{p.gamesPlayed}</td>
                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: 'var(--brand-gold)' }}>{p.savePercentage}%</td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>{p.goalsAgainstAverage}</td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>{p.shutouts}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-up" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '3rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-green)', letterSpacing: '0.1em' }}>
                    LAGET
                </span>
                <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Truppen 2026/2027
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Aktuell trupp och statistik för IF Björklöven. Klicka på en spelare för mer information (kommer snart).
                </p>
            </div>

            {renderGoalieTable(goalies)}
            {renderSkaterTable('Backar', defensemen)}
            {renderSkaterTable('Forwards', forwards)}
        </div>
    );
}
