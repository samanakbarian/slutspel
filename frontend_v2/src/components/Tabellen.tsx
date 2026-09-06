import { useEffect, useState } from 'react';

/**
 * Serietabellen i två lägen.
 *
 * Text-TV-läget är ett försök, inte ett beslut. Sidnumret är inte påhittat:
 * SVT Text lägger SHL-tabellen på 358, och 377 är målservicen där resultaten
 * tickar in medan matcherna pågår. Varje vy bär alltså sitt eget nummer —
 * tabellen 358, och live-läget 377 den dagen det finns.
 *
 * Disciplinen är hela poängen: åtta färger, ett rutnät, en typstorlek plus
 * dubbelhöjd. Det är precis vad appen saknar. Men versaler och fast
 * teckenbredd sliter över tid, och det går inte att avgöra från en
 * skärmbild — därför en växel som minns sitt val. Slå på den, lev med den en
 * vecka, slå av om den inte håller.
 *
 * Färgerna är luminansjusterade. Äkta Text-TV-blått är #0000FF och är
 * oläsligt på en telefon.
 */

export type Standing = {
  team_name?: string;
  rank?: number;
  games_played?: number;
  wins?: number;
  losses?: number;
  ot_wins?: number;
  ot_losses?: number;
  points?: number;
  goal_diff?: number;
  goals_for?: number | null;
  goals_against?: number | null;
};

const BJK = /bj[oö]rkl[oö]ven/i;
const LAGE_KEY = 'lovenlaget:tabell-lage';
/** SVT Text lägger SHL-tabellen på 358; 377 är målservicen. */
const SIDA = '358';

/**
 * Lagnamnet kortat som Text-TV gjorde det.
 *
 * Bolagsformen bär ingen information i en tabell — "BIK Karlskoga" och
 * "Kalmar HC" är Karlskoga och Kalmar. Utan den här kapades var tredje namn
 * mitt i ordet. Ordet stryks bara när något återstår, så AIK förblir AIK och
 * inte tomt.
 */
const FORM = /^(if|ik|hc|bk|sk|hk|hf|is|aik|hockey)$/i;

export function kortnamn(name: string | undefined): string {
  const delar = String(name || '').trim().split(/\s+/);
  const kvar = delar.filter(d => !FORM.test(d));
  return (kvar.length > 0 ? kvar : delar).join(' ').toUpperCase();
}

/** Riktigt minustecken; ett bindestreck sitter för högt bland tabellsiffror. */
const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');

/* ── klassiska läget ─────────────────────────────────────────────────── */

function Klassisk({ rows, started, lead }: { rows: Standing[]; started: boolean; lead: number }) {
  return (
    <div className="st-scroll">
      <div className="st-rows">
        <div className="st-head">
          <span /><span>Lag</span>
          <span title="Spelade matcher">M</span>
          <span title="Vinster i ordinarie tid">V</span>
          <span title="Vinster efter förlängning eller straffar">ÖV</span>
          <span title="Förluster efter förlängning eller straffar">ÖF</span>
          <span title="Förluster i ordinarie tid">F</span>
          <span title="Gjorda–insläppta mål">Mål</span>
          <span title="Målskillnad">+/−</span>
          <span>P</span>
        </div>
        {rows.map((r, i) => {
          const pts = r.points ?? 0;
          const diff = r.goal_diff ?? 0;
          const ours = BJK.test(r.team_name || '');
          return (
            <div
              key={i}
              className={`st-row${ours ? ' st-row-ours' : ''}`}
              style={{ ['--st-fill' as string]: `${started ? (pts / lead) * 100 : 0}%` }}
            >
              <span className="st-rank">{r.rank ?? i + 1}</span>
              <span className="st-team">{(r.team_name || '').replace(/^IF\s+/, '')}</span>
              <span className="st-n">{r.games_played ?? 0}</span>
              <span className="st-n">{r.wins ?? 0}</span>
              <span className="st-n st-dim">{r.ot_wins ?? 0}</span>
              <span className="st-n st-dim">{r.ot_losses ?? 0}</span>
              <span className="st-n">{r.losses ?? 0}</span>
              <span className="st-goals">
                {r.goals_for != null && r.goals_against != null
                  ? `${r.goals_for}–${r.goals_against}`
                  : '–'}
              </span>
              <span className={`st-n st-diffnum${diff > 0 ? ' st-difftext-pos' : diff < 0 ? ' st-difftext-neg' : ''}`}>
                {signed(diff)}
              </span>
              <span className="st-points">{pts}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 377 ─────────────────────────────────────────────────────────────── */

/**
 * Prickraden mellan lagnamn och siffra är inte dekor. Den är det som gör att
 * ögat hittar rätt kolumn utan linjer — Text-TV löste tabeller på
 * telefonbredd innan telefoner fanns.
 */
function Rad({ r, index }: { r: Standing; index: number }) {
  const ours = BJK.test(r.team_name || '');
  const namn = kortnamn(r.team_name);
  return (
    <div className={`tt-rad${ours ? ' tt-vi' : ''}`}>
      <span className="tt-plats">{r.rank ?? index + 1}</span>
      <span className="tt-lag">{namn}</span>
      <span className="tt-prickar" aria-hidden="true" />
      <span className="tt-tal">{r.games_played ?? 0}</span>
      <span className="tt-tal tt-svag">{r.wins ?? 0}</span>
      <span className="tt-tal tt-svag">{(r.ot_wins ?? 0) + (r.ot_losses ?? 0)}</span>
      <span className="tt-tal tt-svag">{r.losses ?? 0}</span>
      <span className="tt-mal">
        {r.goals_for != null && r.goals_against != null ? `${r.goals_for}-${r.goals_against}` : '–'}
      </span>
      <span className="tt-poang">{r.points ?? 0}</span>
    </div>
  );
}

function TextTv({ rows, season }: { rows: Standing[]; season: string }) {
  return (
    <div className="tt-sida">
      <div className="tt-topp">
        <span>TABELL</span>
        <span>{SIDA}&nbsp;&nbsp;{season.toUpperCase()}</span>
      </div>
      <div className="tt-scroll">
        <div className="tt-rutnat">
          <div className="tt-rad tt-rubrik">
            <span className="tt-plats" />
            <span className="tt-lag">LAG</span>
            <span className="tt-prickar" />
            <span className="tt-tal">M</span>
            <span className="tt-tal">V</span>
            <span className="tt-tal" title="Vinster och förluster efter förlängning">Ö</span>
            <span className="tt-tal">F</span>
            <span className="tt-mal">MÅL</span>
            <span className="tt-poang">P</span>
          </div>
          {rows.map((r, i) => <Rad key={i} r={r} index={i} />)}
        </div>
      </div>
    </div>
  );
}

/* ── kortet ──────────────────────────────────────────────────────────── */

export function Tabellen({ rows, season }: { rows: Standing[]; season?: string }) {
  // Valet minns sig själv. En växel man måste hitta varje gång går inte att
  // leva med, och det är just levandet som är testet.
  const [lage, setLage] = useState<'klassisk' | 'texttv'>('klassisk');

  useEffect(() => {
    try {
      if (localStorage.getItem(LAGE_KEY) === 'texttv') setLage('texttv');
    } catch {
      // Privat läge och blockerade kakor kastar här. Standardläget duger.
    }
  }, []);

  const vaxla = () => {
    const nytt = lage === 'texttv' ? 'klassisk' : 'texttv';
    setLage(nytt);
    try { localStorage.setItem(LAGE_KEY, nytt); } catch { /* se ovan */ }
  };

  // En ensam rad är ingen tabell. Så länge backend bara exponerar lagets egen
  // rad blir "#1 av 1" mer vilseledande än upplysande — visa den inte då.
  if (rows.length < 2) return null;

  const sorted = [...rows].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const started = sorted.some(r => (r.games_played ?? 0) > 0);
  const lead = Math.max(1, ...sorted.map(r => r.points ?? 0));

  return (
    <section className={`mc-card${lage === 'texttv' ? ' mc-card-tt' : ''}`}>
      <div className="tab-huvud">
        {lage === 'texttv' ? <span /> : <p className="mc-kicker">Tabellen</p>}
        <button
          type="button"
          className={`tab-vaxel${lage === 'texttv' ? ' tab-vaxel-pa' : ''}`}
          onClick={vaxla}
          aria-pressed={lage === 'texttv'}
          title="Visa tabellen som SVT Text sida 358"
        >
          {SIDA}
        </button>
      </div>

      {lage === 'texttv'
        ? <TextTv rows={sorted} season={season || ''} />
        : <Klassisk rows={sorted} started={started} lead={lead} />}

      {!started && (
        <p className="mc-note">
          Serien har inte startat — placeringen är preliminär tills omgång 1 är spelad.
        </p>
      )}
    </section>
  );
}
