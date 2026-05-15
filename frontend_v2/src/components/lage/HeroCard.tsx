import type { CurrentState } from '../../hooks/useCurrentState';

const statusColors: Record<string, string> = {
    green: 'var(--impact-positive)',
    yellow: 'var(--brand-gold)',
    orange: 'var(--impact-warning)',
    red: 'var(--impact-negative)',
};

export function HeroCard({ data }: { data: CurrentState }) {
    const borderColor = statusColors[data.status] || 'var(--brand-gold)';

    return (
        <section className="signal-card" style={{
            padding: '1.2rem',
            borderLeft: `4px solid ${borderColor}`,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(37,163,90,0.04) 100%)',
        }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                marginBottom: '0.6rem',
            }}>
                <p className="card-kicker" style={{ fontSize: '0.6rem', margin: 0 }}>LÄGET JUST NU</p>
                <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: `${borderColor}22`,
                    color: borderColor,
                    fontWeight: 800,
                }}>
                    SHL-premiär om {data.shl_days_remaining} dagar
                </span>
            </div>

            <h2 style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                fontFamily: 'var(--font-display)',
                color: borderColor,
                margin: '0.3rem 0 0.5rem',
                lineHeight: 1.1,
            }}>
                {data.mood_label}
            </h2>

            <p style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                margin: '0 0 0.8rem',
            }}>
                {data.body}
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
            }}>
                <div style={{
                    padding: '0.6rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--impact-negative)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
                        Största frågan
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                        {data.biggest_question}
                    </p>
                </div>
                <div style={{
                    padding: '0.6rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--impact-neutral)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
                        Senaste signal
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                        {data.latest_signal}
                    </p>
                </div>
            </div>

            {/* Evidence chips */}
            {data.evidence && data.evidence.length > 0 && (
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
                    {data.evidence.map((e, i) => {
                        const chipColor = e.status === 'critical' ? 'var(--impact-negative)'
                            : e.status === 'warning' ? 'var(--impact-warning)'
                            : 'var(--impact-positive)';
                        return (
                            <span key={i} style={{
                                fontSize: '0.6rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: `${chipColor}15`,
                                color: chipColor,
                                fontWeight: 700,
                                border: `1px solid ${chipColor}30`,
                            }}>
                                {e.label}: {e.status}
                            </span>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
