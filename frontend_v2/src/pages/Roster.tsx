import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

/** Svarsformat från /api/v1/roster — Swehockey som källa, kontrakt som berikning. */
type Player = {
  name: string;
  jersey_number: number | null;
  position: string;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  status: string | null;
  contract_until: string | null;
  age: number | null;
  note: string | null;
  has_contract_info: boolean;
};

type RosterResponse = {
  status: string;
  error?: string;
  season?: string;
  count: number;
  roster_scraped_at?: string | null;
  contract_data_updated?: string | null;
  contract_matches?: number;
  players: Player[];
};

const STATUS_COLORS: Record<string, string> = {
  SIGNERAD: 'var(--impact-positive)',
  FÖRLÄNGD: 'var(--impact-neutral)',
  NYFÖRVÄRV: 'var(--brand-gold)',
  UTGÅENDE: 'var(--impact-warning)',
};

const STATUS_LABELS: Record<string, string> = {
  SIGNERAD: 'Kontrakterad',
  FÖRLÄNGD: 'Förlängd',
  NYFÖRVÄRV: 'Nyförvärv',
  UTGÅENDE: 'Utgående',
};

const POS_ORDER: Record<string, number> = { GK: 0, LD: 1, RD: 2, CE: 3, LW: 4, RW: 5 };

/**
 * EliteProspects har ingen öppen uppslagning på namn, så vi länkar till deras
 * spelarsök. Ingen data hämtas därifrån — det är bara en utlänk.
 */
function eliteProspectsUrl(name: string): string {
  return `https://www.eliteprospects.com/search/player?name=${encodeURIComponent(name)}`;
}

function groupByPosition(players: Player[]) {
  const groups: Record<string, Player[]> = { Målvakter: [], Backar: [], Forwards: [] };
  players.forEach(p => {
    const pos = (p.position || '').toUpperCase();
    if (pos.startsWith('G')) groups['Målvakter'].push(p);
    else if (pos === 'LD' || pos === 'RD' || pos.startsWith('D')) groups['Backar'].push(p);
    else groups['Forwards'].push(p);
  });
  Object.values(groups).forEach(g =>
    g.sort(
      (a, b) =>
        (POS_ORDER[a.position] ?? 99) - (POS_ORDER[b.position] ?? 99) ||
        (a.jersey_number ?? 999) - (b.jersey_number ?? 999),
    ),
  );
  return groups;
}

function PlayerRow({ p }: { p: Player }) {
  const colour = p.status ? STATUS_COLORS[p.status] || 'var(--text-muted)' : 'var(--glass-border)';
  const meta = [
    p.position,
    p.age ? `${p.age} år` : null,
    p.contract_until ? `kontrakt t.o.m. ${p.contract_until}` : null,
    p.games_played > 0 ? `${p.games_played} matcher, ${p.points} p` : null,
  ].filter(Boolean).join(' · ');

  return (
    <a
      className="rs-player"
      href={eliteProspectsUrl(p.name)}
      target="_blank"
      rel="noreferrer"
      style={{ borderLeftColor: colour }}
      title={`Öppna ${p.name} på EliteProspects`}
    >
      <span className="rs-num">{p.jersey_number ?? '–'}</span>
      <span className="rs-body">
        <span className="rs-name">{p.name}</span>
        <span className="rs-meta">{meta}</span>
      </span>
      {p.status && (
        <span className="rs-status" style={{ background: `${colour}22`, color: colour }}>
          {STATUS_LABELS[p.status] || p.status}
        </span>
      )}
      <span className="rs-ep" aria-hidden="true">EP ↗</span>
    </a>
  );
}

export function Roster() {
  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 30000);

    fetch(`${API_URL}/api/v1/roster`, { cache: 'no-store', signal: ctrl.signal })
      .then(r => {
        // Endpointen finns först när backend är deployad.
        if (r.status === 404) throw new Error('NOT_DEPLOYED');
        if (!r.ok) throw new Error(`Servern svarade ${r.status}`);
        return r.json();
      })
      .then((j: RosterResponse) => {
        if (j.status !== 'ok') throw new Error(j.error || 'Kunde inte läsa truppen.');
        setData(j);
      })
      .catch((e: Error) => {
        setError(
          e.message === 'NOT_DEPLOYED'
            ? 'Truppen hämtas från en ny endpoint som ännu inte är driftsatt.'
            : e.name === 'AbortError'
              ? 'Tidsgränsen gick ut efter 30 sekunder.'
              : e.message,
        );
      })
      .finally(() => { window.clearTimeout(timer); setLoading(false); });

    return () => { window.clearTimeout(timer); ctrl.abort(); };
  }, []);

  if (loading) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card"><p className="mc-kicker">Trupp</p><h2 className="mc-title">Laddar truppen…</h2></section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card mc-card-error">
          <p className="mc-kicker">Trupp</p>
          <h2 className="mc-title">Kunde inte hämta truppen</h2>
          <p className="mc-text">{error}</p>
        </section>
      </div>
    );
  }

  const players = data.players || [];
  const groups = groupByPosition(players);
  const withContract = data.contract_matches ?? players.filter(p => p.has_contract_info).length;
  const missingContract = players.length - withContract;

  return (
    <div className="page animate-fade-up">
      <section className="rs-source">
        <p className="rs-source-title">{data.count} spelare · {data.season}</p>
        <p className="rs-source-text">
          Truppen hämtas från Swehockeys officiella trupplista och uppdateras automatiskt
          {data.roster_scraped_at
            ? `, senast ${new Date(data.roster_scraped_at).toLocaleDateString('sv-SE')}`
            : ''}.
          {missingContract > 0 && ` Kontraktsuppgifter saknas för ${missingContract} av dem.`}
        </p>
      </section>

      {Object.entries(groups).map(([name, list]) =>
        list.length > 0 ? (
          <section key={name} className="mc-card">
            <p className="mc-kicker">{name} ({list.length})</p>
            <div className="rs-list">
              {list.map((p, i) => <PlayerRow key={`${p.name}-${i}`} p={p} />)}
            </div>
          </section>
        ) : null,
      )}

      <p className="rs-foot">Tryck på en spelare för att öppna profilen på EliteProspects.</p>
    </div>
  );
}
