import type { CurrentState } from '../../hooks/useCurrentState';

const statusStyle: Record<string, { color: string; bg: string; icon: string }> = {
    done: { color: 'var(--impact-positive)', bg: 'rgba(37,163,90,0.08)', icon: '✅' },
    critical: { color: 'var(--impact-negative)', bg: 'rgba(239,68,68,0.08)', icon: '🔴' },
    warning: { color: 'var(--impact-warning)', bg: 'rgba(251,191,36,0.08)', icon: '🟡' },
    pending: { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.02)', icon: '⏳' },
};

export function VagenTillShl({ milestones }: { milestones: CurrentState['milestones'] }) {
    if (!milestones || milestones.length === 0) return null;

    return (
        <section className="signal-card" style={{ padding: '0.8rem' }}>
            <p className="card-kicker">🛣️ Vägen till SHL</p>
            <div style={{ position: 'relative', marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
                {/* Timeline line */}
                <div style={{
                    position: 'absolute',
                    left: '7px',
                    top: '8px',
                    bottom: '8px',
                    width: '2px',
                    background: 'linear-gradient(180deg, var(--impact-positive) 0%, var(--brand-gold) 50%, var(--impact-negative) 100%)',
                    opacity: 0.3,
                }} />

                {milestones.map((m, i) => {
                    const style = statusStyle[m.status] || statusStyle.pending;
                    return (
                        <div key={m.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.4rem 0.5rem',
                            marginBottom: i < milestones.length - 1 ? '0.3rem' : 0,
                            background: style.bg,
                            borderRadius: '6px',
                            border: `1px solid ${style.color}30`,
                            position: 'relative',
                        }}>
                            {/* Timeline dot */}
                            <div style={{
                                position: 'absolute',
                                left: '-1.2rem',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: style.color,
                                border: '2px solid var(--bg-dark)',
                            }} />

                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, minWidth: '45px' }}>
                                {m.period}
                            </span>
                            <span style={{ fontSize: '0.8rem' }}>{style.icon}</span>
                            <span style={{
                                fontSize: '0.8rem',
                                color: style.color,
                                fontWeight: m.status === 'critical' ? 800 : 500,
                            }}>
                                {m.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
