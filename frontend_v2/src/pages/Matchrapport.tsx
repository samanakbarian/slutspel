import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import { PairedBar } from '../components/charts/Charts';
import { DelaMatchen } from '../components/share/DelaMatchen';
import { Guard } from '../components/Guard';
import type { Goal, MatchContext, MatchReport, Penalty, Skater } from '../lib/match';
import { BJK, humanName, isDefence, isOurs, motSerien, parsePeriods, positionOf, surname } from '../lib/match';
import { sasongForDatum, spelarsida } from '../lib/lankar';
import { skrivSidhuvud } from '../lib/sidhuvud';
import { matcher } from '../lib/sprak';

/* ── kontext: vad matchen betydde ── */

/**
 * Vad matchen gav: poängen den tog och säsongen efter den.
 *
 * Här stod tidigare placeringen före och efter, räknad ur vår egen tabell.
 * Vid lika poäng skiljer sig ordningen från den officiella — rapporten sa
 * 1:a när tabellen sa 2:a — och placeringen hör hemma i tabellen, inte i
 * en matchrapport. Poängen är exakta och säger vad matchen var värd.
 */
function Kontext({ ctx, liga, vann, forlangning }: {
  ctx: MatchContext | null | undefined; liga: string; vann: boolean; forlangning: boolean;
}) {
  if (!ctx) return null;
  const { after, form, meetings, venue_average: avg } = ctx;
  if (!after && form.length === 0) return null;
  const sticker = motSerien(ctx.league_compare, liga);
  const poang = vann ? (forlangning ? 2 : 3) : (forlangning ? 1 : 0);
  const record = meetings.reduce(
    (acc, m) => {
      if (m.goals_for > m.goals_against) acc.w += 1;
      else if (m.goals_for < m.goals_against) acc.l += 1;
      return acc;
    },
    { w: 0, l: 0 },
  );

  return (
    <section className="mr-card">
      <p className="mr-kicker">Sammanhang</p>
      {after && (
        <div className="ctx-rank">
          <span className="ctx-rankbig">{poang}<i>p</i></span>
          <span className="ctx-rankbody">
            <b>{after.points} poäng</b>
            efter {matcher(after.games_played)}
          </span>
        </div>
      )}

      {form.length > 0 && (
        <div className="st-kv">
          <span className="st-kvlabel">Form in i matchen</span>
          <span className="ctx-form">
            {form.map((f, i) => (
              <i
                key={i}
                className={`ctx-dot ctx-dot-${f.won ? 'w' : 'l'}${f.beyond_regulation ? ' ctx-dot-ot' : ''}`}
                title={`${f.won ? 'Vinst' : 'Förlust'}${f.beyond_regulation ? ' efter förlängning' : ''} mot ${f.opponent}`}
              />
            ))}
          </span>
        </div>
      )}

      {meetings.length > 1 && (
        <div className="st-kv">
          <span className="st-kvlabel">Inbördes i år</span>
          <span className="st-kvvalue">{record.w}–{record.l}</span>
          <span className="st-kvhint">
            {meetings.map(m => `${m.goals_for}–${m.goals_against}`).join(', ')}
          </span>
        </div>
      )}

      {sticker.length > 0 && (
        <div className="ctx-serien">
          <span className="im-h2hlabel">Mot serien</span>
          {sticker.map(r => (
            <p key={r.key} className="ctx-serienrad"><b>{r.varde}</b> – {r.text}</p>
          ))}
        </div>
      )}

      {avg != null && (
        <p className="mr-note">
          {/* Ett snitt över en match är ingen snittsiffra, det är matchens
              publik. "1 hemmamatcher" stod här dessförinnan — plural-
              genomgången missade raden, som bygger sitt substantiv själv. */}
          {ctx.venue_games === 1
            ? <>Arenan tog {avg.toLocaleString('sv-SE')}.</>
            : <>Arenan drar {avg.toLocaleString('sv-SE')} i snitt över {ctx.venue_games} hemmamatcher.</>}
        </p>
      )}
    </section>
  );
}

/* ── matchbild: vad siffrorna säger utöver resultatet ── */

/** Minuter i ledning, oavgjort och underläge, ur måltiderna. */
function timeSplit(goals: Goal[], totalMin: number) {
  const acc = { lead: 0, tied: 0, trail: 0 };
  const add = (from: number, to: number, diff: number) => {
    const dur = Math.max(0, to - from);
    if (diff > 0) acc.lead += dur;
    else if (diff < 0) acc.trail += dur;
    else acc.tied += dur;
  };
  let diff = 0;
  let prev = 0;
  let biggest = 0;
  for (const g of [...goals].sort((a, b) => a.minute - b.minute)) {
    add(prev, g.minute, diff);
    diff += isOurs(g.team_code) ? 1 : -1;
    biggest = Math.max(biggest, diff);
    prev = g.minute;
  }
  add(prev, totalMin, diff);
  return { ...acc, biggest };
}

function Matchbild({ goals, totalMin }: { goals: Goal[]; totalMin: number }) {
  if (goals.length === 0) return null;
  const t = timeSplit(goals, totalMin);
  const mins = (v: number) => `${Math.round(v)} min`;

  return (
    <>
      <section className="mr-card">
        <p className="mr-kicker">Matchbild</p>
        <PairedBar
          label="Tid i ledning / underläge"
          left={t.lead}
          right={t.trail}
          leftLabel={mins(t.lead)}
          rightLabel={mins(t.trail)}
        />
        <div className="st-kv">
          <span className="st-kvlabel">Oavgjort</span>
          <span className="st-kvvalue">{mins(t.tied)}</span>
        </div>
        <div className="st-kv">
          <span className="st-kvlabel">Största ledning</span>
          <span className="st-kvvalue">{t.biggest > 0 ? `+${t.biggest}` : '–'}</span>
        </div>
        <p className="mr-note">Spelklocka, räknad ur måltiderna.</p>
      </section>

    </>
  );
}

/* ── momentumkurva ── */
function Momentum({
  goals, penalties, netResult,
}: {
  goals: Goal[];
  penalties: Penalty[];
  netResult: number;
}) {
  if (goals.length === 0) return null;

  const W = 280;
  const PLOT_T = 10;   // diagrammets överkant
  const PLOT_H = 66;   // dess höjd
  const H = 96;        // plus en rad för minuterna, under diagrammet
  const PAD = 8;
  // Minuter på x-axeln. Marginalen efter 65 finns för att avgörandet i
  // straffläggningen skrivs på 65:00 — utan den ligger steget på kanten och
  // syns inte alls.
  const LEN = 68;

  const x = (min: number) => PAD + Math.min(min, LEN) / LEN * (W - PAD * 2);

  // Bygg differensen ur måltider i stället för score_state, som bara är text.
  let diff = 0;
  const diffs: number[] = [];
  for (const g of goals) {
    diff += isOurs(g.team_code) ? 1 : -1;
    diffs.push(diff);
  }

  // Y-axeln följer matchen i stället för en fast skala. Med 13 px per mål och
  // nollinjen låst till mitten hamnade en 3–6-match tre steg under diagrammets
  // botten, tvärs över minutsiffrorna. Marginalen på 0,8 mål i var ände ger
  // också plats åt utvisningsstrecken utan att de går utanför.
  const lo = Math.min(0, ...diffs);
  const hi = Math.max(0, ...diffs);
  const span = hi - lo + 1.6;
  const y = (d: number) => PLOT_T + ((hi + 0.8 - d) / span) * PLOT_H;
  const ZERO = y(0);

  const pts = [{ x: x(0), y: ZERO }, ...diffs.map((d, i) => ({ x: x(goals[i].minute), y: y(d) }))];
  pts.push({ x: x(LEN), y: pts[pts.length - 1].y });

  // Trappstegslinje: håll nivån till nästa mål, hoppa sedan.
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` H${pts[i].x} V${pts[i].y}`;
  const area = `${d} V${ZERO} H${pts[0].x} Z`;

  // Färgen följer matchens faktiska utgång, inte kurvans slutvärde. Swehockey
  // listar inte straffläggning som händelse, så en match avgjord på straffar
  // slutar på noll i eventdatan trots att den vanns.
  const stroke = netResult === 0
    ? 'var(--impact-neutral)'
    : netResult > 0 ? 'var(--impact-positive)' : 'var(--impact-negative)';
  const missing = netResult - diff;

  return (
    <section className="mr-card">
      <p className="mr-kicker">Momentum · måldifferens</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
        aria-label={`Måldifferens över matchen, slutar på ${diff > 0 ? '+' : ''}${diff}`}>
        <line x1={PAD} y1={ZERO} x2={W - PAD} y2={ZERO} stroke="rgba(150,185,168,0.28)" strokeWidth="1" strokeDasharray="2 3" />
        {[20, 40, 60].map(m => (
          <line key={m} x1={x(m)} y1={PLOT_T} x2={x(m)} y2={PLOT_T + PLOT_H} stroke="rgba(150,185,168,0.12)" strokeWidth="1" />
        ))}
        <path d={area} fill={diff >= 0 ? 'rgba(37,192,109,0.14)' : 'rgba(255,77,77,0.14)'} stroke="none" />
        <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        {/* Utvisningar som korta streck längs nollinjen: uppåt när
            motståndaren satt, nedåt när vi gjorde det. Utan dem visar kurvan
            bara vad som hände, aldrig varför. */}
        {penalties.filter(p => p.minutes > 0).map((p, i) => (
          <line key={`p${i}`}
            x1={x(p.minute)} y1={ZERO + (isOurs(p.team_code) ? 1 : -1)}
            x2={x(p.minute)} y2={ZERO + (isOurs(p.team_code) ? 7 : -7)}
            stroke="var(--impact-warning)" strokeWidth="1.5" strokeLinecap="round" opacity="0.75">
            <title>{`${p.time} ${p.minutes}′ ${humanName(p.player)}${p.type ? ` — ${p.type}` : ''}`}</title>
          </line>
        ))}
        {/* Målskyttarnas namn stod tidigare vid varje prick, växelvis över och
            under kurvan. Två mål med en minuts mellanrum lade namnen i
            varandra — "Semjonov" och "Sandgren" gick inte att skilja åt. De
            står i mållistan nedanför och i prickens etikett; kurvan visar
            förloppet. */}
        {goals.map((g, i) => (
          <g key={i}>
            <circle cx={x(g.minute)} cy={pts[i + 1].y} r="3"
              fill={isOurs(g.team_code) ? 'var(--impact-positive)' : 'var(--impact-negative)'} />
            {/* Träffytan är större än pricken: tre pixlar går inte att träffa
                med ett finger. */}
            <circle cx={x(g.minute)} cy={pts[i + 1].y} r="11" fill="transparent">
              <title>
                {`${g.time} ${humanName(g.scorer)}${g.is_power_play ? ' (PP)' : g.is_short_handed ? ' (BP)' : ''} — ${g.score_state || ''}`}
              </title>
            </circle>
          </g>
        ))}
        {[0, 20, 40, 60].map(m => (
          <text key={m} x={x(m)} y={H - 4} fill="var(--text-muted)" fontSize="8" fontFamily="monospace"
            textAnchor={m === 0 ? 'start' : 'middle'}>{m}'</text>
        ))}
      </svg>
      <p className="mr-note">
        Över linjen leder Björklöven. Gula streck är utvisningar, uppåt deras och nedåt våra.
        {missing !== 0 && ' Straffavgörandet syns inte i kurvan.'}
      </p>
    </section>
  );
}

/* ── periodsplit ── */
/** "12,9,9" → [12, 9, 9]. Tom sträng ger tom lista. */
function byPeriod(text: string | null | undefined): number[] {
  return String(text || '')
    .split(',')
    .map(x => parseInt(x.trim(), 10))
    .filter(n => Number.isFinite(n));
}

function Periods({
  periods, ourSide, teams,
}: {
  periods: [number, number][];
  ourSide: 'home' | 'away';
  teams: MatchReport['teams'];
}) {
  if (periods.length === 0) return null;
  const label = (i: number) => (i < 3 ? `${i + 1}:a perioden` : i === 3 ? 'Förlängning' : 'Straffar');
  // Skotten per period ligger i matchprotokollet, inte i händelserna. De
  // säger om resultatet i perioden speglade spelet eller gick emot det.
  const ourShots = byPeriod(teams?.ours.shots_by_period);
  const theirShots = byPeriod(teams?.theirs.shots_by_period);
  return (
    <section className="mr-card">
      <p className="mr-kicker">Period för period</p>
      <div className="mr-periods">
        {periods.map(([h, a], i) => {
          const ours = ourSide === 'home' ? h : a;
          const theirs = ourSide === 'home' ? a : h;
          const tone = ours > theirs ? 'win' : ours < theirs ? 'loss' : 'draw';
          const sf = ourShots[i];
          const sa = theirShots[i];
          return (
            <div key={i} className={`mr-period mr-period-${tone}`}>
              <span className="mr-period-label">{label(i)}</span>
              <span className="mr-period-score">{ours}–{theirs}</span>
              {sf != null && sa != null && (
                <span className="mr-period-shots">{sf}–{sa} skott</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Lagets spelare, sorterade på plus/minus.
 *
 * Stapeln är den snabba läsningen: vem som var på isen när det gick åt rätt
 * håll. Tabellen under bär resten — mål, assist, utvisningsminuter, skott och
 * tekningar. Skott och tekningar finns bara för matcher med rapport, och
 * skrivs som tankstreck i stället för noll när den saknas.
 *
 * Plus/minus räknas ur on-ice-listorna enligt regelboken: mål i lika styrka
 * och i underläge räknas, powerplaymål inte, och straffslag och avgörandet i
 * straffläggningen inte alls. Talet stämmer med Swehockeys officiella i 233
 * av 233 spelarrader under HockeyAllsvenskan 2025/26.
 */
/** Bygger adressen till spelarsidan, eller saknas när säsongen inte är känd. */
type TillSpelare = ((namn: string) => string) | null;

/**
 * Ett namn i rapporten som leder till spelarens säsong.
 *
 * Efter en match är nästa fråga ofta hur det går för spelaren i stort, och
 * svaret låg en sida bort utan väg dit. Bara våra spelare får länk: vi har
 * ingen sida för motståndarna.
 */
function Namn({ namn, till, children }: { namn: string | null; till: TillSpelare; children: ReactNode }) {
  if (!till || !namn) return <>{children}</>;
  return <Link to={till(namn)} className="mr-namnlank">{children}</Link>;
}

function Boxscore({ skaters, squad, till }: { skaters: Skater[] | undefined; squad: MatchReport['squad']; till: TillSpelare }) {
  const [open, setOpen] = useState(false);
  const list = (skaters || []).filter(p => p.in_lineup || p.points > 0 || p.gf_on + p.ga_on > 0);
  if (list.length === 0) return null;

  const hasReport = list.some(p => p.has_report);
  const pos = (p: Skater) => positionOf(squad, p.name, p.number);

  // En rad per +/--värde, bäst överst, tomma mellansteg inräknade så skalan
  // inte hoppar över ett värde. Radens längd är stapeln.
  const lo = Math.min(0, ...list.map(p => p.plus_minus));
  const hi = Math.max(0, ...list.map(p => p.plus_minus));
  const rows = [];
  for (let v = hi; v >= lo; v--) {
    rows.push({
      value: v,
      players: list
        .filter(p => p.plus_minus === v)
        .sort((a, b) => b.points - a.points || b.gf_on_ev - a.gf_on_ev || a.name.localeCompare(b.name, 'sv')),
    });
  }

  return (
    <section className="mr-card">
      <p className="mr-kicker">Spelarna</p>
      <h2 className="mr-title">Plus/minus</h2>

      {/* En rad per +/--värde, namnen som brickor. Tröjnummer ensamt gick
          inte att läsa utan att kunna truppen utantill, och en stapel per
          spelare gav tjugo rader där tolv var tomma. Här är radens längd
          stapeln, och varje spelare står med namn. */}
      <div className="pm-rows">
        {rows.map(r => (
          <div className={`pm-row${r.value > 0 ? ' pm-row-pos' : r.value < 0 ? ' pm-row-neg' : ''}`} key={r.value}>
            <span className="pm-value">{r.value > 0 ? '+' : ''}{r.value}</span>
            <span className="pm-chips">
              {r.players.length === 0 && <span className="pm-empty">ingen</span>}
              {r.players.map(p => {
                const inner = (
                  <>
                    <b>{p.number ?? '–'}</b> {surname(p.name)}
                    {p.points > 0 && <i>{p.points}p</i>}
                  </>
                );
                const title = `${humanName(p.name)} — ${p.gf_on_ev} mål för, ${p.ga_on_ev} emot på isen`;
                return till
                  ? <Link className="pm-chip pm-chip-lank" key={p.name} to={till(p.name)} title={title}>{inner}</Link>
                  : <span className="pm-chip" key={p.name} title={title}>{inner}</span>;
              })}
            </span>
          </div>
        ))}
      </div>

      <details className="bx-details" open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="bx-summary">Hela tabellen · {list.length} spelare</summary>
      <div className="bx-tablewrap">
        <table className="bx-table">
          <thead>
            <tr>
              <th className="bx-l">Spelare</th>
              <th>M</th><th>A</th><th>P</th><th>På isen</th><th>+/−</th><th>Utv</th>
              {hasReport && <><th>Skott</th><th>Tekn.</th></>}
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.name}>
                <td className="bx-l">
                  {p.number != null && <b>{p.number}</b>} <Namn namn={p.name} till={till}>{surname(p.name)}</Namn>
                  {pos(p) && <span className="bx-pos-tag">{pos(p)}</span>}
                </td>
                <td>{p.goals}</td>
                <td>{p.assists}</td>
                <td>{p.points}</td>
                {/* Båda halvorna: två spelare på -1 kan ha stått för 2-1
                    respektive 0-1, och nettot ensamt döljer skillnaden. */}
                <td className="bx-onice">{p.gf_on_ev}–{p.ga_on_ev}</td>
                <td className={p.plus_minus > 0 ? 'bx-val-pos' : p.plus_minus < 0 ? 'bx-val-neg' : ''}>
                  {p.plus_minus > 0 ? '+' : ''}{p.plus_minus}
                </td>
                <td>{p.pim}</td>
                {hasReport && (
                  <>
                    <td>{p.shots ?? '–'}</td>
                    <td>
                      {p.faceoffs_won != null && p.faceoffs_won + (p.faceoffs_lost || 0) > 0
                        ? `${p.faceoffs_won}/${p.faceoffs_won + (p.faceoffs_lost || 0)}`
                        : '–'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </details>

      <p className="mr-note">
        Powerplaymål räknas inte, som hos Swehockey.
        {!hasReport && ' Skott och tekningar saknas i protokollet.'}
      </p>
    </section>
  );
}

/**
 * Målvakterna, båda lagens.
 *
 * En förlust med 0–4 och 35 räddningar är en annan match än en förlust med
 * 0–4 och 15. Utan de här raderna gick det inte att se skillnaden.
 */
function Malvakter({ goalies, till }: { goalies: MatchReport['goalies']; till: TillSpelare }) {
  const list = (goalies || []).filter(g => g.shots_against != null);
  if (list.length === 0) return null;
  return (
    <section className="mr-card">
      <p className="mr-kicker">Målvakter</p>
      {list.map((g, i) => {
        const pct = g.save_pct ?? (g.shots_against ? (g.saves! / g.shots_against) * 100 : null);
        return (
          <div key={i} className={`mr-gk${g.is_ours ? ' mr-gk-ours' : ''}`}>
            <span className="mr-gk-name">
              {g.number != null ? `${g.number}. ` : ''}
              <Namn namn={g.name} till={g.is_ours ? till : null}>{humanName(g.name)}</Namn>
              {!g.is_ours && <span className="mr-gk-team">{g.team || 'motståndaren'}</span>}
            </span>
            <span className="mr-gk-line">
              {g.saves} av {g.shots_against} räddningar
              {g.time_on_ice ? ` · ${g.time_on_ice}` : ''}
            </span>
            <span className="mr-gk-pct">{pct != null ? `${pct.toFixed(1).replace('.', ',')} %` : '—'}</span>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Femmorna som klubben registrerade inför matchen.
 *
 * Swehockey skriver "1st Line" över en rad som rymmer hela femman — tre
 * forwards och backparet — så raden är inte en kedja i ordets vanliga mening.
 * Positionerna kommer ur truppen, så de går att skilja åt.
 */
function Femmorna({ lineup, squad, till }: { lineup: MatchReport['lineup']; squad: MatchReport['squad']; till: TillSpelare }) {
  const blocks = (lineup || []).filter(b => b.players.length > 0);
  if (blocks.length === 0) return null;
  const isBack = (p: { number: number | null; name: string }) =>
    isDefence(positionOf(squad, p.name, p.number));
  const label = (b: { block: string; line: number | null }) =>
    b.block === 'line' ? `Femma ${b.line}` : b.block === 'goalie' ? 'Målvakter' : 'Extra';

  return (
    <section className="mr-card">
      <p className="mr-kicker">Uppställning</p>
      {blocks.map((b, i) => {
        const fwd = b.block === 'line' ? b.players.filter(p => !isBack(p)) : b.players;
        const def = b.block === 'line' ? b.players.filter(p => isBack(p)) : [];
        return (
          <div className="lu-row" key={i}>
            <span className="lu-label">{label(b)}</span>
            <span className="lu-players">
              {fwd.map(p => (
                <span className="lu-p" key={p.number ?? p.name}>
                  <b>{p.number}</b> <Namn namn={p.name} till={till}>{surname(p.name)}</Namn>
                </span>
              ))}
              {def.length > 0 && (
                <>
                  <span className="lu-sep" aria-hidden="true" />
                  {def.map(p => (
                    <span className="lu-p lu-p-d" key={p.number ?? p.name}>
                      <b>{p.number}</b> <Namn namn={p.name} till={till}>{surname(p.name)}</Namn>
                    </span>
                  ))}
                </>
              )}
            </span>
          </div>
        );
      })}
      <p className="mr-note">Klubbens egen indelning. Backparet efter avdelaren.</p>
    </section>
  );
}

/* ── målkronologi ── */

/**
 * Spelformen målet gjordes i, som utskriven tagg.
 *
 * Swehockey skriver den i score_state: EQ, PP1, SH1, PS och GWS, och lägger
 * ENG efter när buren var tom. Taggen står med bokstäver, inte bara färg.
 */
function Form({ goal }: { goal: Goal }) {
  const raw = String(goal.score_state || '').toUpperCase();
  const tags: { text: string; kind: string }[] = [];
  if (goal.is_power_play) tags.push({ text: 'PP', kind: 'pp' });
  else if (goal.is_short_handed) tags.push({ text: 'BP', kind: 'sh' });
  else if (raw.includes('(PS)')) tags.push({ text: 'Straff', kind: 'ps' });
  else if (raw.includes('(GWS)')) tags.push({ text: 'Straffar', kind: 'ps' });
  else tags.push({ text: '5v5', kind: 'eq' });
  if (raw.includes('ENG')) tags.push({ text: 'Tom bur', kind: 'en' });
  return (
    <>
      {tags.map(t => (
        <span key={t.text} className={`mr-tag mr-tag-${t.kind}`}>{t.text}</span>
      ))}
    </>
  );
}

/**
 * Björklövens spelare på isen vid ett mål.
 *
 * `on_ice_for` hör till det görande laget, `on_ice_against` till det
 * släppande — vilken av dem som är vår beror alltså på vem som gjorde målet.
 * Motståndarnas nummer utelämnas: vi har inga namn till dem, och en rad
 * siffror säger ingenting.
 */
function OnIce({ goal, squad }: { goal: Goal; squad: MatchReport['squad'] }) {
  const ours = isOurs(goal.team_code) ? goal.on_ice_for : goal.on_ice_against;
  if (!ours || ours.length === 0 || !squad) return null;

  // Malvakten star pa isen vid nastan varje mal och hor inte hemma har. Ett
  // nummer utan namntraff visas som siffra: att tyst utelamna det gor listan
  // for kort, och da ser ett fem mot fem ut som fyra mot fem.
  const named = ours
    .map(n => ({ num: n, entry: squad[String(n)] }))
    .filter(x => !String(x.entry?.position || '').toUpperCase().startsWith('G'));
  if (named.length === 0) return null;

  // Hopfalld som standard: listan tog en stor del av sidans hojd och lastes
  // sallan. Insikten "vem stod pa isen for flest mal emot" bor i boxscoren.
  return (
    <details className="mr-onice">
      <summary className="mr-onice-label">
        {isOurs(goal.team_code) ? 'På isen' : 'Ute vid målet'} · {named.length}
      </summary>
      <span className="mr-onice-list">
        {named.map(x => (
          <span key={x.num} className="mr-onice-name">
            <b>{x.num}</b> {x.entry ? surname(x.entry.name) : ''}
          </span>
        ))}
      </span>
    </details>
  );
}

/**
 * Vilket lag raden hör till, utskrivet.
 *
 * Tidigare skildes lagen bara av en grön eller röd prick på målen och av
 * fetstil på utvisningarna. Fem utvisningar i rad läste därför som fem
 * Björklövenutvisningar, oavsett vem som satt. Lagkoden står ur Swehockeys
 * egen händelse, så den stämmer även när motståndaren delar tröjnummer med
 * oss — och den funkar i gråskala, till skillnad från prickens färg.
 */
function TeamMark({ code }: { code: string | null }) {
  const ours = isOurs(code);
  return (
    <span className={`mr-team${ours ? ' mr-team-ours' : ''}`}>
      {(code || '?').toUpperCase()}
    </span>
  );
}

function Goals({ goals, squad, till }: { goals: Goal[]; squad: MatchReport['squad']; till: TillSpelare }) {
  if (goals.length === 0) {
    return (
      <section className="mr-card">
        <p className="mr-kicker">Målkronologi</p>
        <p className="mr-text">Inga mål registrerade för den här matchen.</p>
      </section>
    );
  }
  return (
    <section className="mr-card">
      <p className="mr-kicker">Målkronologi</p>
      {goals.map((g, i) => {
        const vara = isOurs(g.team_code) ? till : null;
        return (
        <div key={i} className={`mr-goal${isOurs(g.team_code) ? ' mr-goal-ours' : ''}`}>
          <span className="mr-goal-time">{g.time}</span>
          <TeamMark code={g.team_code} />
          <span className="mr-goal-body">
            <span className="mr-goal-scorer">
              {g.scorer_number ? `${g.scorer_number}. ` : ''}
              <Namn namn={g.scorer} till={vara}>{humanName(g.scorer)}</Namn>
              <Form goal={g} />
            </span>
            {g.assists.length > 0 && (
              <span className="mr-goal-assists">
                {g.assists.map((a, j) => (
                  <span key={a}>{j > 0 && ', '}<Namn namn={a} till={vara}>{humanName(a)}</Namn></span>
                ))}
              </span>
            )}
            <OnIce goal={g} squad={squad} />
          </span>
          <span className="mr-goal-state">{(g.score_state || '').replace(/\s*\([A-Z]+\)/, '')}</span>
        </div>
        );
      })}
    </section>
  );
}

/* ── utvisningar ── */
/**
 * Vad utvisningen ledde till.
 *
 * Ett powerplay börjar när utvisningen döms och tar slut när tiden går ut
 * eller ett mål faller. Ett mål inom utvisningens minuter, gjort av det lag
 * som hade övertaget, är alltså utfallet av just den här utvisningen.
 * Lagstraff och straffslag har noll minuter och ger inget spel i numerärt
 * överläge — de får ingen rad.
 */
function outcome(
  pen: Penalty,
  goals: Goal[],
  penalties: Penalty[],
): { text: string; scored: boolean; even?: boolean } | null {
  if (!pen.minutes) return null;
  // Sammanfallande utvisningar: får båda lagen en vid samma tid spelas det
  // fyra mot fyra, och ingen har övertaget. Att skriva "Powerplay: inget mål"
  // hade påstått ett numerärt läge som aldrig fanns.
  const coincidental = penalties.some(
    o => o !== pen && o.time === pen.time && o.minutes === pen.minutes
      && isOurs(o.team_code) !== isOurs(pen.team_code),
  );
  if (coincidental) return { text: 'Fyra mot fyra', scored: false, even: true };
  const hit = goals.find(
    g =>
      isOurs(g.team_code) !== isOurs(pen.team_code) &&
      g.is_power_play &&
      g.minute >= pen.minute &&
      g.minute <= pen.minute + pen.minutes,
  );
  if (!hit) return { text: 'Inget mål', scored: false };
  return { text: `${hit.time} ${humanName(hit.scorer)}`, scored: true };
}

function Penalties({ penalties, goals }: { penalties: Penalty[]; goals: Goal[] }) {
  if (penalties.length === 0) return null;
  const ours = penalties.filter(p => isOurs(p.team_code));
  const theirs = penalties.filter(p => !isOurs(p.team_code));
  const pim = (list: Penalty[]) => list.reduce((s, p) => s + (p.minutes || 0), 0);

  return (
    <section className="mr-card">
      <p className="mr-kicker">Utvisningar</p>
      <div className="mr-pimbar">
        <div className="mr-pimlabels">
          <b>{pim(ours)} min</b><span>Utvisningsminuter</span><b>{pim(theirs)} min</b>
        </div>
        <div className="mr-pimtrack">
          <span style={{ flex: Math.max(pim(ours), 0.4), background: 'var(--impact-warning)' }} />
          <span style={{ flex: Math.max(pim(theirs), 0.4), background: 'rgba(255,255,255,.12)' }} />
        </div>
      </div>
      {penalties.map((p, i) => (
        <div key={i} className={`mr-pen${isOurs(p.team_code) ? ' mr-pen-ours' : ''}`}>
          <span className="mr-goal-time">{p.time}</span>
          <TeamMark code={p.team_code} />
          <span className="mr-pen-min">{p.minutes}′</span>
          <span className="mr-pen-body">
            <span className="mr-pen-player">
              {p.player_number ? `${p.player_number}. ` : ''}{humanName(p.player)}
            </span>
            {p.type && <span className="mr-pen-type">{p.type}</span>}
            {(() => {
              const o = outcome(p, goals, penalties);
              if (!o) return null;
              return (
                <span className={`mr-pen-out${o.scored ? ' mr-pen-out-goal' : ''}`}>
                  {o.even ? o.text : `${isOurs(p.team_code) ? 'Boxplay' : 'Powerplay'}: ${o.text}`}
                </span>
              );
            })()}
          </span>
        </div>
      ))}
    </section>
  );
}

const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

/** "2026-03-06" → "6 mars 2026". ISO-datum läser sig illa i en beskrivningstext. */
function svenskDatum(iso?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  return `${Number(m[3])} ${MANADER[Number(m[2]) - 1]} ${m[1]}`;
}

/* ── sida ── */
/**
 * Lag mot lag i en vy.
 *
 * Rapporten har fjorton sektioner och svarar bra pa "vad hande", men daligt pa
 * "hur gick det". Talen har lag redan i svaret, utspridda over perioder,
 * specialteam, malvakter och spelartabellen. Har star de bredvid varandra.
 *
 * Motstandarnas spelare finns inte i `skaters`, sa deras tekningar harleds ur
 * vara: det vi forlorade vann de.
 */
function LagMotLag({
  teams, skaters, goals, penalties,
}: {
  teams: MatchReport['teams']; skaters: Skater[]; goals: Goal[]; penalties: Penalty[];
}) {
  if (!teams?.ours || !teams?.theirs) return null;
  const v = teams.ours, m = teams.theirs;

  // Ett powerplay for oss ar en utvisning pa dem, och tvartom. Bada lagens
  // boxplay ar alltsa den andres powerplay speglat, sa raderna raknas ur
  // samma tva tal.
  //
  // Utvisningar utan minuter ar straffslag och lagstraff. De ger inget spel i
  // numerart overlage och far darfor inte raknas som tillfallen.
  const vartPp = penalties.filter(p => !isOurs(p.team_code) && p.minutes > 0).length;
  const derasPp = penalties.filter(p => isOurs(p.team_code) && p.minutes > 0).length;
  const vartPpMal = goals.filter(g => isOurs(g.team_code) && g.is_power_play).length;
  const derasPpMal = goals.filter(g => !isOurs(g.team_code) && g.is_power_play).length;
  const vartUnderlagsmal = goals.filter(g => isOurs(g.team_code) && g.is_short_handed).length;
  const derasUnderlagsmal = goals.filter(g => !isOurs(g.team_code) && g.is_short_handed).length;
  const specialteam = vartPp > 0 || derasPp > 0;
  const underlagsmal = vartUnderlagsmal > 0 || derasUnderlagsmal > 0;

  const vunna = skaters.reduce((n, s) => n + (s.faceoffs_won || 0), 0);
  const forlorade = skaters.reduce((n, s) => n + (s.faceoffs_lost || 0), 0);
  const tekningar = vunna + forlorade > 0;

  const pct = (x: number | null) => (x == null ? '–' : `${String(x.toFixed(1)).replace('.', ',')} %`);
  const tal = (x: number | null) => (x == null ? '–' : String(x));
  const namn = (x: string | null) => (x || '').replace(/^IF\s+/, '');

  // Rubriken ovanför kortet skriver hemmalaget först. Gjorde inte det här
  // kortet samma sak stod lagen i omvänd ordning två kort i rad, vilket är
  // precis så fel det låter. Grönt följer laget i stället för positionen.
  const viHemma = !!v.is_home;
  const rad = (
    etikett: string, vart: number, deras: number, vartText: string, derasText: string,
  ) => (
    <PairedBar
      key={etikett}
      label={etikett}
      left={viHemma ? vart : deras}
      right={viHemma ? deras : vart}
      leftLabel={viHemma ? vartText : derasText}
      rightLabel={viHemma ? derasText : vartText}
      gronSida={viHemma ? 'vanster' : 'hoger'}
    />
  );

  return (
    <section className="mr-card">
      <p className="mr-kicker">Lag mot lag</p>
      <div className="lml-lag">
        <b className={viHemma ? 'lml-vart' : undefined}>{namn(viHemma ? v.team_name : m.team_name)}</b>
        <b className={viHemma ? undefined : 'lml-vart'}>{namn(viHemma ? m.team_name : v.team_name)}</b>
      </div>
      {rad('Skott på mål', v.shots ?? 0, m.shots ?? 0, tal(v.shots), tal(m.shots))}
      {rad('Skott som blev mål', v.shooting_pct ?? 0, m.shooting_pct ?? 0, pct(v.shooting_pct), pct(m.shooting_pct))}
      {rad('Räddningar', v.saves ?? 0, m.saves ?? 0, tal(v.saves), tal(m.saves))}
      {rad('Räddningsprocent', v.save_pct ?? 0, m.save_pct ?? 0, pct(v.save_pct), pct(m.save_pct))}
      {tekningar && rad('Tekningar', vunna, forlorade, String(vunna), String(forlorade))}
      {rad('Utvisningsminuter', v.pim ?? 0, m.pim ?? 0, tal(v.pim), tal(m.pim))}
      {specialteam && (
        <>
          {rad('Powerplay', vartPp > 0 ? vartPpMal / vartPp : 0, derasPp > 0 ? derasPpMal / derasPp : 0,
            `${vartPpMal} / ${vartPp}`, `${derasPpMal} / ${derasPp}`)}
          {rad('Boxplay', derasPp > 0 ? (derasPp - derasPpMal) / derasPp : 0,
            vartPp > 0 ? (vartPp - vartPpMal) / vartPp : 0,
            `${derasPp - derasPpMal} / ${derasPp}`, `${vartPp - vartPpMal} / ${vartPp}`)}
        </>
      )}
      {underlagsmal && rad('Mål i underläge', vartUnderlagsmal, derasUnderlagsmal,
        String(vartUnderlagsmal), String(derasUnderlagsmal))}
    </section>
  );
}

export function Matchrapport() {
  const { gameId } = useParams<{ gameId: string }>();
  const [data, setData] = useState<MatchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Säsongslistan, för att spelarlänkarna ska peka på matchens säsong och inte
  // bara den aktiva. Saknas den blir namnen vanlig text.
  const [sasonger, setSasonger] = useState<{ list: { key: string; has_team_data?: boolean | null }[]; active: string } | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/seasons`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && Array.isArray(d.seasons)) setSasonger({ list: d.seasons, active: d.active || '' }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 30000);

    fetch(`${API_URL}/api/v1/match/${encodeURIComponent(gameId)}`, { cache: 'no-store', signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`Servern svarade ${r.status}`); return r.json(); })
      .then((j: MatchReport) => {
        if (j.status === 'not_found') throw new Error('Matchrapporten finns inte i datalagret än.');
        if (j.status !== 'ok') throw new Error(j.error || 'Kunde inte läsa matchrapporten.');
        setData(j);
      })
      .catch((e: Error) => setError(e.name === 'AbortError' ? 'Tidsgränsen gick ut efter 30 sekunder.' : e.message))
      .finally(() => { window.clearTimeout(timer); setLoading(false); });

    return () => { window.clearTimeout(timer); ctrl.abort(); };
  }, [gameId]);

  // Rapporterna är ett femtiotal sidor och Sidhuvud kan bara ge dem alla samma
  // titel — den vet inget om matchen förrän den hämtats. "Björklöven Västerås
  // resultat" är sökningen som ska hitta hit, alltså måste lagen och siffrorna
  // stå i titeln. Effekten ligger efter Sidhuvuds och skriver därför över den.
  useEffect(() => {
    if (!data) return;
    const mote = `${data.home_team} – ${data.away_team}`;
    const siffror = String(data.result || '').replace(/\s*-\s*/, '–').trim();
    const rubrik = [mote, siffror].filter(Boolean).join(' ');
    const datum = svenskDatum(data.date);
    skrivSidhuvud(
      `${rubrik} · Matchrapport — Sida 377`,
      `Matchrapport ${rubrik}${datum ? `, ${datum}` : ''}. `
        + 'Mål, utvisningar, målvakter och spelarnas siffror, händelse för händelse.',
      `/matcher/${gameId}`,
    );
  }, [data, gameId]);

  if (loading) {
    return (
      <div className="page animate-fade-up">
        <section className="mr-card"><p className="mr-kicker">Matchrapport</p><h2 className="mr-title">Laddar…</h2></section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page animate-fade-up">
        <section className="mr-card mr-card-error">
          <p className="mr-kicker">Matchrapport</p>
          <h2 className="mr-title">Kunde inte visa matchen</h2>
          <p className="mr-text">{error}</p>
          <Link to="/matcher" className="mr-back">← Tillbaka till matcher</Link>
        </section>
      </div>
    );
  }

  const ourSide: 'home' | 'away' = BJK.test(data.home_team) ? 'home' : 'away';
  const periods = parsePeriods(data.period_results);
  const m = (data.result || '').match(/(\d+)\s*-\s*(\d+)/);
  const hg = m ? parseInt(m[1], 10) : 0;
  const ag = m ? parseInt(m[2], 10) : 0;
  const ourGoals = ourSide === 'home' ? hg : ag;
  const theirGoals = ourSide === 'home' ? ag : hg;
  const outcome = ourGoals > theirGoals ? 'Vinst' : ourGoals < theirGoals ? 'Förlust' : 'Oavgjort';
  const extra = periods.length > 3;
  const sasong = sasonger ? sasongForDatum(data.date, sasonger.list, sasonger.active) : null;
  const till: TillSpelare = sasong === null ? null : (namn: string) => spelarsida(namn, sasong);

  return (
    <div className="page animate-fade-up">
      <Link to="/matcher" className="mr-back">← Matcher</Link>

      <section className="mr-hero">
        <p className="mr-kicker">{data.date}{data.venue ? ` · ${data.venue}` : ''}</p>
        <div className="mr-score">
          <span className={`mr-side${ourSide === 'home' ? ' mr-side-ours' : ''}`}>
            {data.home_team.replace(/^IF\s+/, '')}
          </span>
          <span className="mr-scorenum">{hg}–{ag}</span>
          <span className={`mr-side${ourSide === 'away' ? ' mr-side-ours' : ''}`}>
            {data.away_team.replace(/^IF\s+/, '')}
          </span>
        </div>
        <p className={`mr-outcome mr-outcome-${outcome.toLowerCase()}`}>
          {outcome}{extra ? (periods.length > 4 ? ' efter straffar' : ' efter förlängning') : ''}
          {data.spectators ? ` · ${data.spectators.toLocaleString('sv-SE')} åskådare` : ''}
        </p>
      </section>

      <Guard name="Lag mot lag"><LagMotLag teams={data.teams} skaters={data.skaters || []}
        goals={data.goals || []} penalties={data.penalties || []} /></Guard>
      <Guard name="Sammanhang"><Kontext
        ctx={data.context}
        vann={ourGoals > theirGoals}
        forlangning={extra}
        // Björklöven gick upp inför 2026/27. Säsongsnyckeln avgör när den
        // finns; annars datumet.
        liga={(sasong ?? '').startsWith('ha') || (!sasong && data.date < '2026-07') ? 'HA' : 'SHL'}
      /></Guard>
      <Momentum goals={data.goals} penalties={data.penalties} netResult={ourGoals - theirGoals} />
      {/* Förlängningen är fem minuter och straffläggningen ingen speltid alls.
          Räknat som 20 minuter per period blev en straffmatch 100 minuter lång,
          och tiden i ledning därmed nästan dubbelt så lång som den var. */}
      <Matchbild goals={data.goals} totalMin={periods.length > 3 ? 65 : 60} />
      <Periods periods={periods} ourSide={ourSide} teams={data.teams} />
      <Guard name="Spelarna"><Boxscore skaters={data.skaters} squad={data.squad} till={till} /></Guard>
      <Guard name="Målvakter"><Malvakter goalies={data.goalies} till={till} /></Guard>
      <Guard name="Uppställning"><Femmorna lineup={data.lineup} squad={data.squad} till={till} /></Guard>
      <Goals goals={data.goals} squad={data.squad} till={till} />
      <Penalties penalties={data.penalties} goals={data.goals} />
      <Guard name="Dela matchen"><DelaMatchen data={data} /></Guard>

      {data.counts.events === 0 && (
        <section className="mr-card">
          <p className="mr-text">Matchhändelser saknas. De kommer med nästa skörd.</p>
        </section>
      )}
    </div>
  );
}
