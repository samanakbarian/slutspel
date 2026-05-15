import type { CurrentState } from '../../hooks/useCurrentState';

export function Supportersnacket({ snack }: { snack: CurrentState['supporter_snack'] }) {
    if (!snack || snack.length === 0) return null;

    return (
        <section className="signal-card" style={{ padding: '0.8rem' }}>
            <p className="card-kicker">💬 Supportersnacket</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
                {snack.map((s, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        padding: '0.4rem 0.5rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                    }}>
                        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{s.emoji}</span>
                        <span style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.3,
                            fontWeight: 500,
                        }}>
                            {s.text}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
