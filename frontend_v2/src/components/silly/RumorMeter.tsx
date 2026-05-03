import { useSillyStore } from '../../store/useSillyStore';
import type { Player } from '../../types/silly';

export function RumorMeter() {
    const { data } = useSillyStore();

    if (!data) return null;

    const allRumors = [...data.hot_rumors_in, ...data.hot_rumors_out].sort((a, b) => (b.rumor_pct || 0) - (a.rumor_pct || 0));

    if (allRumors.length === 0) return null;

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--brand-gold)', marginBottom: '1rem' }}>🔥 Ryktesbarometern</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                AI-baserad bedömning av hur nära en övergång är baserat på källornas trovärdighet och signalord.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allRumors.map((player: Player, idx: number) => {
                    const isOut = !!player.to || data.hot_rumors_out.some(p => p.name === player.name);
                    const pct = player.rumor_pct || 0;
                    
                    return (
                        <div key={idx} style={{ 
                            background: 'var(--sponsor-bg)', 
                            border: '1px solid var(--sponsor-border)', 
                            padding: '1rem', 
                            borderRadius: '8px' 
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>{player.name}</h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {player.pos} • {isOut ? `Ryktas till ${player.to || 'SHL/KHL'}` : `Från ${player.from || 'Okänt'}`}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ 
                                        display: 'inline-block', 
                                        padding: '2px 8px', 
                                        borderRadius: '4px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 800,
                                        background: isOut ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                        color: isOut ? 'var(--impact-negative)' : 'var(--impact-positive)'
                                    }}>
                                        {isOut ? 'LÄMNAR?' : 'NYFÖRVÄRV?'}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                                <div style={{ flex: 1, height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        width: `${pct}%`, 
                                        height: '100%', 
                                        background: pct > 80 ? 'var(--impact-positive)' : pct > 40 ? 'var(--brand-gold)' : 'var(--impact-neutral)',
                                        transition: 'width 1s ease-out'
                                    }}></div>
                                </div>
                                <span style={{ fontWeight: 800, color: 'var(--text-primary)', width: '40px', textAlign: 'right' }}>{pct}%</span>
                            </div>
                            
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                                "{player.note}" — Källor: {player.source}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
