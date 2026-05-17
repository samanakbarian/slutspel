import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

interface RosterPlayer {
  name: string;
  number: number | null;
  pos: string;
  status: string;
  contractUntil?: string;
  note?: string;
}

interface RosterData {
  roster: RosterPlayer[];
  confirmed_extensions: { name: string; pos: string; contractUntil: string; date: string; note: string }[];
  confirmed_signings: { name: string; pos: string; from: string; contractUntil: string; date: string; note: string }[];
  confirmed_departures: { name: string; pos: string; to: string; date: string; note: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  'SIGNERAD': 'var(--impact-positive)',
  'FÖRLÄNGD': 'var(--impact-neutral)',
  'NYFÖRVÄRV': 'var(--brand-gold)',
  'UTGÅENDE': 'var(--impact-warning)',
};

const STATUS_LABELS: Record<string, string> = {
  'SIGNERAD': 'Kontrakterad',
  'FÖRLÄNGD': 'Förlängd',
  'NYFÖRVÄRV': 'Nyförvärv',
  'UTGÅENDE': 'Utgående',
};

const POS_ORDER: Record<string, number> = { 'GK': 0, 'LD': 1, 'RD': 2, 'CE': 3, 'LW': 4, 'RW': 5 };

function groupByPosition(roster: RosterPlayer[]) {
  const groups: Record<string, RosterPlayer[]> = {
    'Målvakter': [],
    'Backar': [],
    'Forwards': [],
  };
  roster.forEach(p => {
    if (p.pos === 'GK') groups['Målvakter'].push(p);
    else if (['LD', 'RD'].includes(p.pos)) groups['Backar'].push(p);
    else groups['Forwards'].push(p);
  });
  // Sort within groups
  Object.values(groups).forEach(g =>
    g.sort((a, b) => (POS_ORDER[a.pos] ?? 99) - (POS_ORDER[b.pos] ?? 99))
  );
  return groups;
}

export function Roster() {
  const [data, setData] = useState<RosterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/silly-season?ts=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Okänt fel');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="page animate-fade-up">
        <section className="signal-card">
          <p className="card-kicker">Trupp</p>
          <h2 className="card-title">Laddar truppdata...</h2>
        </section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page animate-fade-up">
        <section className="signal-card signal-card-critical">
          <p className="card-kicker">Trupp</p>
          <h2 className="card-title">Kunde inte hämta truppen</h2>
          <p className="card-text">{error}</p>
        </section>
      </div>
    );
  }

  const roster = data.roster || [];
  const signed = roster.filter(p => ['SIGNERAD', 'FÖRLÄNGD', 'NYFÖRVÄRV'].includes(p.status));
  const expiring = roster.filter(p => p.status === 'UTGÅENDE');
  const groups = groupByPosition(roster);

  return (
    <div className="page animate-fade-up">
      {/* KPI row */}
      <section className="signal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
        <div className="signal-card" style={{ textAlign: 'center', padding: '0.65rem', borderLeftColor: 'var(--impact-positive)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--impact-positive)' }}>{signed.length}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Kontrakterade</div>
        </div>
        <div className="signal-card" style={{ textAlign: 'center', padding: '0.65rem', borderLeftColor: 'var(--impact-warning)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--impact-warning)' }}>{expiring.length}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Utgående</div>
        </div>
        <div className="signal-card" style={{ textAlign: 'center', padding: '0.65rem', borderLeftColor: 'var(--brand-gold)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--brand-gold)' }}>{roster.length}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Totalt</div>
        </div>
      </section>

      {/* Position groups */}
      {Object.entries(groups).map(([groupName, players]) => (
        <section key={groupName} className="signal-card" style={{ padding: '0.9rem' }}>
          <p className="card-kicker">{groupName} ({players.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
            {players.map((p, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '30px 1fr auto auto',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.45rem 0.55rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                borderLeft: `3px solid ${STATUS_COLORS[p.status] || 'var(--text-muted)'}`,
              }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}>
                  {p.number || '—'}
                </span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {p.pos} {p.contractUntil && `• Kontrakt t.o.m. ${p.contractUntil}`}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: `${STATUS_COLORS[p.status] || 'var(--text-muted)'}22`,
                  color: STATUS_COLORS[p.status] || 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {STATUS_LABELS[p.status] || p.status}
                </span>
                {p.note && (
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Departures */}
      {data.confirmed_departures && data.confirmed_departures.length > 0 && (
        <section className="signal-card signal-card-critical" style={{ padding: '0.9rem' }}>
          <p className="card-kicker">Lämnar ({data.confirmed_departures.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
            {data.confirmed_departures.map((d, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.4rem 0.55rem',
                background: 'rgba(248,113,113,0.05)',
                borderRadius: '6px',
                fontSize: '0.82rem',
              }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{d.name}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{d.pos}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--impact-negative)' }}>→ {d.to || 'Okänt'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
