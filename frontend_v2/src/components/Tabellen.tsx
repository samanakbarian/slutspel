import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { SIDA, TextTvSida, TextTvVaxel, ttLag, useTextTv } from './texttv';

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

/** En av lagets matcher, som spelprogrammet redan har dem. */
export type Mote = {
  gameId: number | null;
  date: string;
  time: string;
  opponent: string;
  isHome: boolean;
  played: boolean;
  gf: number;
  ga: number;
};

const BJK = /bj[oö]rkl[oö]ven/i;
const MANADER = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const kortDatum = (d: string) => {
  const m = d.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${Number(m[2])} ${MANADER[Number(m[1]) - 1]}` : d;
};

/**
 * Strecken i SHL, samma tre som slutplaceringen räknar sannolikheter för.
 * Strecket ligger under den sista platsen på den övre sidan.
 */
const STRECK = [
  { plats: 6, namn: 'Topp 6' },
  { plats: 10, namn: 'Topp 10' },
  { plats: 12, namn: 'Botten 2' },
];
/** Riktigt minustecken; ett bindestreck sitter för högt bland tabellsiffror. */
const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');

/* ── klassiska läget ─────────────────────────────────────────────────── */

/**
 * Våra möten med ett lag, under dess rad.
 *
 * En tabellrad säger var laget ligger men inte hur det gått mot oss. Spelade
 * möten leder till rapporten, kommande visar avslaget.
 */
function Moten({ moten }: { moten: Mote[] }) {
  if (moten.length === 0) return <div className="st-moten"><span className="st-mote">Inga möten i spelprogrammet.</span></div>;
  return (
    <div className="st-moten">
      {moten.map((m, i) => {
        const inner = (
          <>
            <span className="st-mote-datum">{kortDatum(m.date)}</span>
            <span className={`mc-ha${m.isHome ? ' mc-ha-home' : ''}`}>{m.isHome ? 'H' : 'B'}</span>
            {m.played
              ? <span className={`st-mote-res${m.gf > m.ga ? ' st-difftext-pos' : m.gf < m.ga ? ' st-difftext-neg' : ''}`}>{m.gf}–{m.ga}</span>
              : <span className="st-mote-tid">{m.time.replace(':', '.')}</span>}
          </>
        );
        return m.played && m.gameId !== null
          ? <Link key={i} to={`/matcher/${m.gameId}`} className="st-mote st-mote-lank">{inner}<span aria-hidden="true">›</span></Link>
          : <span key={i} className="st-mote">{inner}</span>;
      })}
    </div>
  );
}

function Klassisk({ rows, streck, moten }: {
  rows: Standing[]; streck: boolean; moten?: Mote[];
}) {
  const [oppen, setOppen] = useState<string | null>(null);
  return (
    <div className="st-scroll">
      <div className="st-rows">
        <div className="st-kol">
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
          const lag = r.team_name || '';
          const klickbar = Boolean(moten) && !ours && lag !== '';
          const visar = klickbar && oppen === lag;
          const plats = r.rank ?? i + 1;
          const streckEfter = streck ? STRECK.find(x => x.plats === plats) : undefined;
          const cells = (
            <>
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
            </>
          );
          const klass = `st-row${ours ? ' st-row-ours' : ''}`;
          return (
            <Fragment key={i}>
              {klickbar
                ? (
                  <button
                    type="button"
                    className={`${klass} st-row-knapp${visar ? ' st-row-oppen' : ''}`}
                   
                    aria-expanded={visar}
                    onClick={() => setOppen(visar ? null : lag)}
                  >
                    {cells}
                  </button>
                )
                : <div className={klass}>{cells}</div>}
              {visar && <Moten moten={(moten || []).filter(m => m.opponent === lag).sort((a, b) => a.date.localeCompare(b.date))} />}
              {streckEfter && <div className="st-streck" aria-hidden="true" />}
            </Fragment>
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
  const namn = ttLag(r.team_name);
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
    <TextTvSida sida={SIDA.tabell} rubrik="TABELL" info={season}>
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
    </TextTvSida>
  );
}

/* ── kortet ──────────────────────────────────────────────────────────── */

export function Tabellen({ rows, season, moten }: { rows: Standing[]; season?: string; moten?: Mote[] }) {
  const [texttv, vaxla] = useTextTv('tabell');
  const [expanderad, setExpanderad] = useState(false);

  if (rows.length < 2) return null;

  const sorted = [...rows].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const started = sorted.some(r => (r.games_played ?? 0) > 0);
  // Strecken gäller SHL:s fjorton lag. Allsvenskan har andra gränser, och de
  // ritas hellre inte alls än fel.
  const streck = /SHL/.test(season || '') && sorted.length === 14;

  if (!started && !expanderad) {
    return (
      <section className="mc-card">
        <p className="mc-kicker">Tabellen</p>
        <p className="mc-text">Serien har inte startat.</p>
        <button className="mc-visa-alla" onClick={() => setExpanderad(true)}>
          Visa starttabellen
        </button>
      </section>
    );
  }

  return (
    <section className={`mc-card${texttv ? ' mc-card-tt' : ''}`}>
      <div className="tab-huvud">
        {texttv ? <span /> : <p className="mc-kicker">Tabellen</p>}
        <TextTvVaxel sida={SIDA.tabell} pa={texttv} onClick={vaxla} />
      </div>

      {texttv
        ? <TextTv rows={sorted} season={season || ''} />
        : <Klassisk rows={sorted} streck={streck} moten={moten} />}


      {!started && (
        <p className="mc-note">
          Serien har inte startat. Placeringen är preliminär tills omgång 1 är spelad.
        </p>
      )}
    </section>
  );
}
