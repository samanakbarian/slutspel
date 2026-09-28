import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/api';
import { spelarsida } from '../lib/lankar';
import { humanName } from '../lib/match';
import { matcher } from '../lib/sprak';

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
  eliteprospects?: { url: string; confidence: string } | null;
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
 * Direktlänk till spelarens EliteProspects-sida.
 *
 * En EP-adress kräver spelarens id, som API:t slår upp och skickar med.
 * Saknas det — namnet stavas annorlunda där, eller spelaren finns inte —
 * faller vi tillbaka på deras spelarsök i stället för att gissa en adress
 * som leder fel.
 */
function eliteProspectsUrl(p: Player): string {
  return p.eliteprospects?.url
    || `https://www.eliteprospects.com/search/player?name=${encodeURIComponent(p.name)}`;
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

/**
 * En spelare i truppen.
 *
 * Raden leder till spelarens säsong här på sajten; EliteProspects ligger kvar
 * som en egen länk i kanten. Den som inte spelat ännu har ingen säsong att
 * visa, och då är raden ingen länk.
 */
/**
 * Spelaren som en tröja: numret stort, efternamnet på ryggen, och under den
 * det man vill veta i truppen. Nyförvärv får gul tröja, så de nya syns
 * direkt i en vägg av grönt.
 */
function Troja({ p, namn }: { p: Player; namn: string }) {
  const efternamn = p.name.split(' ').slice(1).join(' ') || p.name;
  const ny = p.status === 'NYFÖRVÄRV';
  const inner = (
    <>
      <span className={`tv-troja${ny ? ' tv-ny' : ''}${p.position === 'GK' ? ' tv-gk' : ''}`} aria-hidden="true">
        <span className="tv-rygg">{efternamn.toUpperCase()}</span>
        <span className="tv-nr">{p.jersey_number ?? '–'}</span>
      </span>
      <span className="tv-namn">{p.name}</span>
      <span className="tv-meta">{[p.position, p.age ? `${p.age} år` : null].filter(Boolean).join(' · ')}</span>
      <span className="tv-meta">
        {p.games_played > 0 && <b>{p.points} p</b>}
        {p.games_played > 0 && p.contract_until ? ' · ' : ''}
        {p.contract_until ? `till ${p.contract_until}` : ''}
      </span>
      {p.status && <span className={`tv-status${ny ? " tv-status-ny" : ""}`}>{STATUS_LABELS[p.status] || p.status}</span>}
    </>
  );
  return p.games_played > 0
    ? <Link className="tv-kort" to={spelarsida(namn)} aria-label={`${p.name}, nummer ${p.jersey_number ?? ''}`}>{inner}</Link>
    : <div className="tv-kort">{inner}</div>;
}

// Listraden ligger kvar för jämförelse med tröjväggen.
export function PlayerRow({ p, namn }: { p: Player; namn: string }) {
  const colour = p.status ? STATUS_COLORS[p.status] || 'var(--text-muted)' : 'var(--glass-border)';
  const meta = [
    p.position,
    p.age ? `${p.age} år` : null,
    p.contract_until ? `kontrakt t.o.m. ${p.contract_until}` : null,
    p.games_played > 0 ? `${matcher(p.games_played)}, ${p.points} p` : null,
  ].filter(Boolean).join(' · ');

  const inner = (
    <>
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
    </>
  );

  return (
    <div className="rs-player" style={{ borderLeftColor: colour }}>
      {p.games_played > 0
        ? <Link className="rs-main" to={spelarsida(namn)}>{inner}</Link>
        : <div className="rs-main">{inner}</div>}
      <a
        className="rs-ep"
        href={eliteProspectsUrl(p)}
        target="_blank"
        rel="noreferrer"
        aria-label={`${p.name} på EliteProspects`}
      >
        EP ↗
      </a>
    </div>
  );
}

export function Roster() {
  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Poängligans namnform, "Efternamn, Förnamn", nycklad på truppens
  // "Förnamn Efternamn". Spelarsidan tar båda, men resten av sajten länkar med
  // poängligans — samma spelare ska inte ha två adresser.
  const [namnform, setNamnform] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetch(`${API_URL}/api/v1/players`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const namn = ((d?.players || []) as { name: string }[]).map(x => x.name);
        setNamnform(new Map(namn.map(n => [humanName(n).toLowerCase(), n])));
      })
      .catch(() => { /* länkarna får truppens namnform */ });
  }, []);

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
          Källa: Swehockey
          {data.roster_scraped_at
            ? `, senast ${new Date(data.roster_scraped_at).toLocaleDateString('sv-SE')}`
            : ''}.
          {missingContract > 0 && ` Kontrakt saknas för ${missingContract}.`}
        </p>
      </section>

      {Object.entries(groups).map(([name, list]) =>
        list.length > 0 ? (
          <section key={name} className="mc-card">
            <p className="mc-kicker">{name} ({list.length})</p>
            <div className="tv-vagg">
              {list.map((p, i) => (
                <Troja key={`${p.name}-${i}`} p={p} namn={namnform.get(p.name.toLowerCase()) || p.name} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      <p className="rs-foot">Tryck på en spelare för säsongens siffror. EP ↗ öppnar EliteProspects.</p>
    </div>
  );
}
