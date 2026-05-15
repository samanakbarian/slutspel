import type { CurrentState } from '../../hooks/useCurrentState';

const statusColors: Record<string, string> = {
  green: 'var(--impact-positive)',
  yellow: 'var(--brand-gold)',
  orange: 'var(--impact-warning)',
  red: 'var(--impact-negative)',
};

function getStatusHeadline(criticalCount: number, warningCount: number) {
  if (criticalCount >= 2) return '🔴 SHL-bygget har två stora hål';
  if (criticalCount === 1) return '🟡 Offensiven lyfter — men tryggheten saknas';
  if (warningCount >= 2) return '🟡 Läget förbättras — men flera frågor lever';
  return '🟢 Bygget går enligt plan';
}

function summarizeSignal(raw: string) {
  if (/nyförvärv|klar för/i.test(raw)) return 'Nyförvärv stärker forwardssidan.';
  if (/förläng|förlängd|kontrakt/i.test(raw)) return 'Kontraktsläget klarnar och ger stabilitet.';
  if (/lämnar|lämnat|förlust/i.test(raw)) return 'Tappet påverkar balansen och måste ersättas.';
  return 'Ny signal in, påverkan bedöms nu.';
}

export function HeroCard({ data }: { data: CurrentState }) {
  const borderColor = statusColors[data.status] || 'var(--brand-gold)';
  const criticalCount = data.evidence.filter((e) => e.status === 'critical').length;
  const warningCount = data.evidence.filter((e) => e.status === 'warning').length;
  const statusHeadline = getStatusHeadline(criticalCount, warningCount);
  const latestSignalSummary = summarizeSignal(data.latest_signal || '');
  const latestSignalInterpretation =
    criticalCount >= 2
      ? 'Men målvakts- och backsidan är fortfarande olösta.'
      : 'Läget förbättras, men fler besked krävs.';

  return (
    <section
      className="signal-card"
      style={{
        padding: '1.2rem',
        borderLeft: `4px solid ${borderColor}`,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(37,163,90,0.04) 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.6rem',
        }}
      >
        <p className="card-kicker" style={{ fontSize: '0.6rem', margin: 0 }}>
          LÄGET JUST NU
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
          <span
            style={{
              fontSize: '0.65rem',
              padding: '2px 8px',
              borderRadius: '999px',
              background: `${borderColor}22`,
              color: borderColor,
              fontWeight: 800,
            }}
          >
            SHL-premiär om {data.shl_days_remaining} dagar
          </span>
          <span style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            {criticalCount > 0 ? `🔴 ${criticalCount} kritiska luckor kvar` : '🟢 Inga kritiska luckor just nu'}
          </span>
        </div>
      </div>

      <h2
        style={{
          fontSize: '1.6rem',
          fontWeight: 900,
          fontFamily: 'var(--font-display)',
          color: borderColor,
          margin: '0.3rem 0 0.5rem',
          lineHeight: 1.1,
        }}
      >
        {statusHeadline}
      </h2>

      <p
        style={{
          fontSize: '0.88rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: '0 0 0.8rem',
        }}
      >
        {data.body}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            padding: '0.6rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div
            style={{
              fontSize: '0.58rem',
              fontWeight: 800,
              color: 'var(--impact-negative)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.2rem',
            }}
          >
            Största frågan
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            {data.biggest_question}
          </p>
        </div>
        <div
          style={{
            padding: '0.6rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div
            style={{
              fontSize: '0.58rem',
              fontWeight: 800,
              color: 'var(--impact-neutral)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.2rem',
            }}
          >
            Senaste signal
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3, fontWeight: 700 }}>
            {latestSignalSummary}
          </p>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', lineHeight: 1.3 }}>
            {latestSignalInterpretation}
          </p>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.3rem 0 0', lineHeight: 1.2 }}>
            Källa: {data.latest_signal}
          </p>
        </div>
      </div>

      {data.evidence && data.evidence.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
          {data.evidence.map((e, i) => {
            const chipColor =
              e.status === 'critical'
                ? 'var(--impact-negative)'
                : e.status === 'warning'
                  ? 'var(--impact-warning)'
                  : 'var(--impact-positive)';
            const statusLabel = e.status === 'critical' ? 'akut' : e.status === 'warning' ? 'bevaka' : 'stabilt';
            const statusEmoji = e.status === 'critical' ? '🔴' : e.status === 'warning' ? '🟡' : '🟢';
            return (
              <span
                key={i}
                style={{
                  fontSize: '0.6rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: `${chipColor}15`,
                  color: chipColor,
                  fontWeight: 700,
                  border: `1px solid ${chipColor}30`,
                }}
              >
                {statusEmoji} {e.label}: {statusLabel}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
