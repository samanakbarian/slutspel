import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

/**
 * Inför debutsäsongen.
 *
 * Två kort som kräver båda halvorna av lagret för att gå att räkna, och som
 * därför inte finns någon annanstans: uppflyttningssäsongens spelarstatistik
 * korsad med den nuvarande truppen, och SHL:s sluttabell från i fjol korsad
 * med hela spelprogrammet för i år.
 *
 * Truppkortet är premiärinnehåll och försvinner när säsongen börjat — då är
 * frågan "vad tog vi med oss upp" besvarad av matcherna själva. Schemakortet
 * står kvar hela säsongen; det pekar bara framåt i stället för in.
 *
 * Båda gäller SHL 2026/27 och ingenting annat. Väljer läsaren en spelad
 * säsong försvinner de helt — ett kort som beskriver ett annat år än det
 * sidan visar är värre än inget kort.
 */

type Spelare = {
  name: string;
  number?: number | null;
  position?: string | null;
  games_played?: number;
  goals?: number;
  assists?: number;
  points?: number;
};

type Match = {
  date: string;
  opponent: string;
  is_home: boolean;
  opponent_rank?: number | null;
  opponent_points?: number | null;
};

type Svar = {
  status?: string;
  squad?: {
    season_from?: string;
    squad_size?: number;
    returning?: number;
    new?: number;
    returning_goals_pct?: number | null;
    returning_points_pct?: number | null;
    returning_players?: Spelare[];
    new_players?: Spelare[];
    error?: string;
  };
  schedule?: {
    reference_season?: string;
    opening?: Match[];
    opening_average_rank?: number | null;
    opening_top4?: number;
    average_rank?: number | null;
    hardest_stretch?: { from: string; to: string; average_rank?: number | null; games: Match[] } | null;
    error?: string;
  };
};

/** Svensk decimalkomma. Punkt är engelska och syns direkt i en svensk mening. */
function komma(n: number | null | undefined): string {
  return n == null ? '–' : String(n).replace('.', ',');
}

const MANADER = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function datum(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : `${d.getDate()} ${MANADER[d.getMonth()]}`;
}

/** Efternamnet räcker i en lista där laget är givet. */
function kort(namn: string): string {
  const rensat = namn.replace(/[*†‡]/g, '').trim();
  if (rensat.includes(',')) return rensat.split(',')[0].trim();
  const delar = rensat.split(/\s+/);
  return delar.length > 1 ? delar.slice(1).join(' ') : rensat;
}

/**
 * Motståndarens placering i fjol, som en bricka.
 *
 * Färgen bär svårighet, inte utfall — ett topplag är inte "dåligt". Därför
 * intensitet i en och samma kulör i stället för grönt mot rött, och siffran
 * står alltid utskriven så att brickan aldrig är enda bäraren.
 */
function Placering({ rank }: { rank?: number | null }) {
  if (!rank) return <span className="is-plats is-plats-tom">–</span>;
  const niva = rank <= 4 ? 'hog' : rank <= 9 ? 'mellan' : 'lag';
  return (
    <span className={`is-plats is-plats-${niva}`} title={`Placering i fjol: ${rank}`}>
      {rank}
    </span>
  );
}

function Rad({ m }: { m: Match }) {
  return (
    <div className="is-rad">
      <span className="is-datum">{datum(m.date)}</span>
      <span className={`is-ha${m.is_home ? ' is-ha-h' : ''}`}>{m.is_home ? 'H' : 'B'}</span>
      <span className="is-mot">{m.opponent.replace(/^IF\s+/, '')}</span>
      {/* Prickarna binder ihop lagnamn och placering. På en telefon är gapet
          några millimeter; på en skrivbordsskärm blev det fyra centimeter, och
          då tappar ögat raden på vägen. Samma grepp som Text-TV-läget. */}
      <span className="is-prickar" aria-hidden="true" />
      <Placering rank={m.opponent_rank} />
    </div>
  );
}

export function InforSasongen({
  sasongenBorjat, aktuellSasong,
}: {
  sasongenBorjat: boolean;
  /** Korten handlar om SHL 26/27. Väljer man en gammal säsong hör de inte hemma. */
  aktuellSasong: boolean;
}) {
  const [data, setData] = useState<Svar | null>(null);

  useEffect(() => {
    if (!aktuellSasong) return;
    let avbruten = false;
    fetch(`${API_URL}/api/v1/season-preview`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!avbruten && d?.status === 'ok') setData(d); })
      .catch(() => { /* korten är komplement och får utebli tyst */ });
    return () => { avbruten = true; };
  }, [aktuellSasong]);

  // Byter man till en spelad säsong beskriver korten fel år: "Vägen in" är
  // 26/27:s spelprogram och truppkortet 26/27:s trupp. De hörde tidigare bara
  // ihop med sidan, inte med säsongsvalet, och följde därför med.
  if (!aktuellSasong) return null;

  const trupp = data?.squad;
  const schema = data?.schedule;
  const visaTrupp = !sasongenBorjat && trupp && !trupp.error && (trupp.returning ?? 0) > 0;
  const visaSchema = schema && !schema.error && (schema.opening?.length ?? 0) > 0;

  if (!visaTrupp && !visaSchema) return null;

  return (
    <>
      {visaTrupp && (
        <section className="mc-card">
          <p className="mc-kicker">Vad som följde med upp</p>
          <p className="is-tal">
            <b>{trupp.returning}</b> av {trupp.squad_size}
          </p>
          <p className="mc-text">
            spelare är kvar från laget som vann {trupp.season_from}.
            {trupp.returning_goals_pct != null && (
              <> De gjorde <b>{trupp.returning_goals_pct} %</b> av lagets mål den säsongen.</>
            )}
          </p>

          <div className="is-lista">
            {(trupp.returning_players || []).slice(0, 6).map(p => (
              <div key={p.name} className="is-sp">
                <span className="is-sp-namn">{kort(p.name)}</span>
                <span className="is-sp-tal">{p.points} p</span>
                <span className="is-sp-mal">{p.goals} mål</span>
              </div>
            ))}
          </div>

          {(trupp.new_players?.length ?? 0) > 0 && (
            <p className="mc-note">
              <b>{trupp.new}</b> är nya inför SHL: {(trupp.new_players || []).map(p => kort(p.name)).join(', ')}.
            </p>
          )}
        </section>
      )}

      {visaSchema && (
        <section className="mc-card">
          <p className="mc-kicker">Vägen in · placering i {schema.reference_season}</p>
          <div className="is-schema">
            {(schema.opening || []).map(m => <Rad key={m.date} m={m} />)}
          </div>
          <p className="mc-note">
            De tio första möter ett motstånd som i fjol slutade på plats{' '}
            {komma(schema.opening_average_rank)} i snitt
            {schema.opening_top4 ? <>, varav {schema.opening_top4} mot fjolårets topp fyra</> : null}.
          </p>

          {schema.hardest_stretch && (
            <>
              <p className="mc-kicker" style={{ marginTop: '0.9rem' }}>
                Tuffaste perioden · {datum(schema.hardest_stretch.from)}–{datum(schema.hardest_stretch.to)}
              </p>
              <div className="is-schema">
                {schema.hardest_stretch.games.map(m => <Rad key={`t${m.date}`} m={m} />)}
              </div>
              <p className="mc-note">
                Åtta matcher mot ett snitt på plats {komma(schema.hardest_stretch.average_rank)}, mot{' '}
                {komma(schema.average_rank)} för säsongen som helhet.
              </p>
            </>
          )}
        </section>
      )}
    </>
  );
}
