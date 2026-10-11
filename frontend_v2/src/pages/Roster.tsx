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
  /** Skadad och därför inte i Swehockeys trupp just nu. Saknas i äldre API. */
  injured?: boolean;
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
  /** Kontrakterade som inte står i Swehockeys trupp, t.ex. långtidsskadade. */
  outside_roster?: { name: string; position: string; status: string | null; contract_until: string | null; absent: string | null }[];
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
 * Kontraktsläget: vilka som går ut efter säsongen och vilka som har år kvar.
 *
 * "2027" i kontraktsdatan betyder säsongen som slutar våren 2027. Grupperna
 * räknas mot säsongens slutår, så kortet stämmer även nästa säsong. Spelare
 * utan uppgift står i en egen grupp — hellre en synlig lucka än en gissning.
 */
function Kontraktslaget({ players: trupp, utanfor = [], season, updated }: {
  players: Player[]; utanfor?: NonNullable<RosterResponse['outside_roster']>; season?: string; updated?: string | null;
}) {
  // De utanför truppen hör till kontraktsläget men har ingen rad i listan nedan.
  const borta = new Map(utanfor.map(u => [u.name, u.absent || 'ej i truppen']));
  const players: Player[] = [
    ...trupp,
    ...utanfor.map(u => ({
      name: u.name, jersey_number: null, position: u.position, games_played: 0, goals: 0, assists: 0, points: 0,
      status: u.status, contract_until: u.contract_until, age: null, note: null, has_contract_info: true,
    })),
  ];
  const slut = Number((season || '').match(/\/(\d{2})\b/)?.[1]);
  if (!slut) return null;
  const slutar = 2000 + slut;
  const grupper = [
    { key: 'ut', rubrik: 'Går ut efter säsongen', hint: `t.o.m. våren ${slutar}`, farg: 'var(--impact-warning)', test: (y: number) => y <= slutar },
    { key: 'ett', rubrik: 'Ett år till', hint: `t.o.m. ${slutar + 1}`, farg: 'var(--impact-neutral)', test: (y: number) => y === slutar + 1 },
    { key: 'fler', rubrik: 'Två år eller mer', hint: `t.o.m. ${slutar + 2} eller längre`, farg: 'var(--impact-positive)', test: (y: number) => y >= slutar + 2 },
  ];
  const ar = (p: Player) => Number(p.contract_until) || null;
  const iGrupp = grupper.map(g => ({ ...g, spelare: players.filter(p => ar(p) !== null && g.test(ar(p)!)) }));
  const okanda = players.filter(p => ar(p) === null);
  const alla = [...iGrupp.map(g => ({ key: g.key, n: g.spelare.length, farg: g.farg })), { key: 'okand', n: okanda.length, farg: 'var(--glass-border)' }];
  const posKort = (pos: string) => (pos.startsWith('G') ? 'MV' : /D$/.test(pos) ? 'B' : 'F');
  const sortera = (a: Player, b: Player) => (ar(a) ?? 9999) - (ar(b) ?? 9999) || (POS_ORDER[a.position] ?? 99) - (POS_ORDER[b.position] ?? 99) || (a.jersey_number ?? 999) - (b.jersey_number ?? 999);
  const chip = (p: Player) => (
    <span key={p.name} className="kl-chip">
      {p.jersey_number != null && <i>{p.jersey_number}</i>}
      {p.name}
      <small>{posKort((p.position || '').toUpperCase())}</small>
      {p.status === 'NYFÖRVÄRV' && <em>ny</em>}
      {p.injured && <em className="kl-borta">skadad</em>}
      {borta.has(p.name) && <em className="kl-borta">{borta.get(p.name)}</em>}
    </span>
  );
  return (
    <section className="mc-card">
      <p className="mc-kicker">Kontrakten</p>
      <h2 className="mc-title">Vem har år kvar</h2>
      <div className="kl-stapel" role="img" aria-label={alla.map(a => `${a.n}`).join(', ')}>
        {alla.filter(a => a.n > 0).map(a => (
          <span key={a.key} style={{ flex: a.n, background: a.farg }}>{a.n}</span>
        ))}
      </div>
      {iGrupp.map(g => g.spelare.length > 0 && (
        <div key={g.key} className="kl-grupp">
          <p className="kl-rubrik"><span className="kl-prick" style={{ background: g.farg }} />{g.rubrik} <b>{g.spelare.length}</b><small>{g.hint}</small></p>
          <div className="kl-chips">{[...g.spelare].sort(sortera).map(chip)}</div>
        </div>
      ))}
      {okanda.length > 0 && (
        <div className="kl-grupp">
          <p className="kl-rubrik"><span className="kl-prick" style={{ background: 'var(--glass-border)' }} />Uppgift saknas <b>{okanda.length}</b></p>
          <div className="kl-chips kl-svag">{[...okanda].sort(sortera).map(chip)}</div>
        </div>
      )}
      <p className="mc-note">
        MV målvakt, B back, F forward.
        {updated && ` Kontraktsuppgifterna är från ${new Date(updated).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
      </p>
    </section>
  );
}

/**
 * En spelare i truppen.
 *
 * Raden leder till spelarens säsong här på sajten; EliteProspects ligger kvar
 * som en egen länk i kanten. Den som inte spelat ännu har ingen säsong att
 * visa, och då är raden ingen länk.
 */
function PlayerRow({ p, namn }: { p: Player; namn: string }) {
  const colour = p.status ? STATUS_COLORS[p.status] || 'var(--text-muted)' : 'var(--glass-border)';
  const meta = [
    p.injured ? 'skadad' : null,
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

      <Kontraktslaget players={players} utanfor={data.outside_roster} season={data.season} updated={data.contract_data_updated} />

      {Object.entries(groups).map(([name, list]) =>
        list.length > 0 ? (
          <section key={name} className="mc-card">
            <p className="mc-kicker">{name} ({list.length})</p>
            <div className="rs-list">
              {list.map((p, i) => (
                <PlayerRow key={`${p.name}-${i}`} p={p} namn={namnform.get(p.name.toLowerCase()) || p.name} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      <p className="rs-foot">Tryck på en spelare för säsongens siffror. EP ↗ öppnar EliteProspects.</p>
    </div>
  );
}
