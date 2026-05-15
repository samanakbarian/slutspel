import type { CurrentState } from '../../hooks/useCurrentState';

const LABELS = ['Hype', 'Oro', 'Irritation', 'Plus'];

export function Supportersnacket({ snack }: { snack: CurrentState['supporter_snack'] }) {
  if (!snack || snack.length === 0) return null;

  return (
    <section className="signal-card" style={{ padding: '0.8rem' }}>
      <p className="card-kicker">💬 Supportersnacket</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
        {snack.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '26px auto 1fr',
              alignItems: 'start',
              gap: '0.45rem',
              padding: '0.45rem 0.55rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
            }}
          >
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{s.emoji}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.18rem' }}>
              {LABELS[i] || 'Signal'}
            </span>
            <span
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.3,
                fontWeight: 500,
              }}
            >
              {s.text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
