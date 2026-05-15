import type { CurrentState } from '../../hooks/useCurrentState';

const watchIcons = ['🎯', '📝', '🏒', '💰', '🔍'];

export function NastaSnackis({ watchList }: { watchList: CurrentState['next_watch'] }) {
    if (!watchList || watchList.length === 0) return null;

    return (
        <section className="signal-card" style={{ padding: '0.8rem' }}>
            <p className="card-kicker">🔮 Nästa Snackis</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem' }}>
                {watchList.slice(0, 4).map((item, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.35rem 0.5rem',
                        background: i === 0 ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.2)' : 'var(--glass-border)'}`,
                        borderRadius: '6px',
                    }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', width: '18px' }}>
                            {i + 1}.
                        </span>
                        <span style={{ fontSize: '0.9rem', marginRight: '0.3rem' }}>
                            {watchIcons[i] || '📌'}
                        </span>
                        <span style={{
                            fontSize: '0.8rem',
                            color: i === 0 ? 'var(--brand-gold)' : 'var(--text-secondary)',
                            fontWeight: i === 0 ? 700 : 400,
                        }}>
                            {item}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
