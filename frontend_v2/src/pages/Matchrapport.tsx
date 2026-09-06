import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import { PairedBar, Tornado } from '../components/charts/Charts';
import { DelaMatchen } from '../components/share/DelaMatchen';
import type { Goal, MatchContext, MatchReport, Penalty, Skater } from '../lib/match';
import { BJK, humanName, isDefence, isOurs, parsePeriods, positionOf, surname } from '../lib/match';

/* ── kontext: vad matchen betydde ── */

/**
 * Var matchen stod i serien.
 *
 * En 2-1-vinst i februari kan vara en av femtiotvå eller den som tar laget
 * från andra till första plats. Utan placeringen före och efter går det inte
 * att se skillnaden. Allt räknas ur schemat, som täcker hela serien — vi
 * skördar bara våra egna matcher, men resultatet för alla.
 */
function Kontext({ ctx, opponent }: { ctx: MatchContext | null | undefined; opponent: string }) {
  if (!ctx) return null;
  const { before, after, opponent_before: theirs, form, meetings, venue_average: avg } = ctx;
  if (!before && !after && form.length === 0) return null;

  const moved = before && after ? before.rank - after.rank : 0;
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
          <span className="ctx-rankbig">{after.rank}<i>:a</i></span>
          <span className="ctx-rankbody">
            <b>{after.points} poäng</b> efter {after.games_played} matcher
            {before && (
              <span className="ctx-move">
                {moved > 0
                  ? `Klättrade ${moved} placering${moved > 1 ? 'ar' : ''} från ${before.rank}:a`
                  : moved < 0
                    ? `Tappade ${-moved} placering${-moved > 1 ? 'ar' : ''} från ${before.rank}:a`
                    : `Låg ${before.rank}:a även före`}
              </span>
            )}
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

      {theirs && (
        <div className="st-kv">
          <span className="st-kvlabel">{opponent} före matchen</span>
          <span className="st-kvvalue">{theirs.rank}:a</span>
          <span className="st-kvhint">{theirs.points} poäng</span>
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

      {avg != null && (
        <p className="mr-note">
          Arenan drar {avg.toLocaleString('sv-SE')} i snitt över {ctx.venue_games} hemmamatcher.
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

function Matchbild({ goals, penalties, totalMin }: { goals: Goal[]; penalties: Penalty[]; totalMin: number }) {
  if (goals.length === 0) return null;
  const t = timeSplit(goals, totalMin);
  const mins = (v: number) => `${Math.round(v)} min`;

  // Ett powerplay uppstår ur motståndarens utvisning. Utvisningar utan
  // minuter är straffslag och lagstraff, som inte ger något spel i numerärt
  // överläge — de ska inte räknas som tillfällen.
  const ourPpChances = penalties.filter(p => !isOurs(p.team_code) && p.minutes > 0).length;
  const theirPpChances = penalties.filter(p => isOurs(p.team_code) && p.minutes > 0).length;
  const ourPpGoals = goals.filter(g => isOurs(g.team_code) && g.is_power_play).length;
  const theirPpGoals = goals.filter(g => !isOurs(g.team_code) && g.is_power_play).length;
  const ourShort = goals.filter(g => isOurs(g.team_code) && g.is_short_handed).length;

  const pim = (ours: boolean) =>
    penalties.filter(p => isOurs(p.team_code) === ours).reduce((n, p) => n + (p.minutes || 0), 0);

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
        <p className="mr-note">
          Räknat ur måltiderna, så minuterna är spelklocka och inte effektiv tid.
          Grön stapel är tid i ledning.
        </p>
      </section>

      {(ourPpChances > 0 || theirPpChances > 0) && (
        <section className="mr-card">
          <p className="mr-kicker">Specialteam</p>
          <div className="st-kv">
            <span className="st-kvlabel">Powerplay</span>
            <span className="st-kvvalue">{ourPpGoals} / {ourPpChances}</span>
            <span className="st-kvhint">
              {ourPpChances > 0 ? `${Math.round((ourPpGoals / ourPpChances) * 100)} % utdelning` : 'Inga tillfällen'}
            </span>
          </div>
          <div className="st-kv">
            <span className="st-kvlabel">Boxplay</span>
            <span className="st-kvvalue">{theirPpChances - theirPpGoals} / {theirPpChances}</span>
            <span className="st-kvhint">
              {theirPpChances > 0 ? `${Math.round(((theirPpChances - theirPpGoals) / theirPpChances) * 100)} % räddade` : 'Inga underlägen'}
            </span>
          </div>
          {ourShort > 0 && (
            <div className="st-kv">
              <span className="st-kvlabel">Mål i underläge</span>
              <span className="st-kvvalue">{ourShort}</span>
            </div>
          )}
          <div className="st-kv">
            <span className="st-kvlabel">Utvisningsminuter</span>
            <span className="st-kvvalue">{pim(true)} mot {pim(false)}</span>
          </div>
        </section>
      )}
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
  const H = 92;
  const PAD = 8;
  const ZERO = 52;
  const STEP = 13; // px per måls skillnad
  // Minuter på x-axeln. Marginalen efter 65 finns för att avgörandet i
  // straffläggningen skrivs på 65:00 — utan den ligger steget på kanten och
  // syns inte alls.
  const LEN = 68;

  const x = (min: number) => PAD + Math.min(min, LEN) / LEN * (W - PAD * 2);

  // Bygg differensen ur måltider i stället för score_state, som bara är text.
  let diff = 0;
  const pts: { x: number; y: number }[] = [{ x: x(0), y: ZERO }];
  for (const g of goals) {
    diff += isOurs(g.team_code) ? 1 : -1;
    const px = x(g.minute);
    pts.push({ x: px, y: ZERO - diff * STEP });
  }
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
          <line key={m} x1={x(m)} y1={10} x2={x(m)} y2={H - 22} stroke="rgba(150,185,168,0.12)" strokeWidth="1" />
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
        {/* Målskyttens efternamn vid varje mål, växelvis över och under
            kurvan så namnen inte lägger sig i varandra. */}
        {goals.map((g, i) => (
          <text key={`n${i}`} x={x(g.minute)} y={pts[i + 1].y + (i % 2 ? 12 : -7)}
            fill={isOurs(g.team_code) ? 'var(--impact-positive)' : 'var(--text-muted)'}
            fontSize="7" textAnchor="middle">
            {surname(g.scorer)}
          </text>
        ))}
        {[0, 20, 40, 60].map(m => (
          <text key={m} x={x(m)} y={H - 6} fill="var(--text-muted)" fontSize="8" fontFamily="monospace"
            textAnchor={m === 0 ? 'start' : 'middle'}>{m}'</text>
        ))}
      </svg>
      <p className="mr-note">
        Över linjen betyder att Björklöven leder. Gula streck är utvisningar —
        uppåt när motståndaren satt, nedåt när vi gjorde det.
        {missing !== 0 && ' Avgörandet på straffar räknas inte som en matchhändelse och syns därför inte i kurvan.'}
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
function Boxscore({ skaters, squad }: { skaters: Skater[] | undefined; squad: MatchReport['squad'] }) {
  const [open, setOpen] = useState(false);
  const list = (skaters || []).filter(p => p.in_lineup || p.points > 0 || p.gf_on + p.ga_on > 0);
  if (list.length === 0) return null;

  const hasReport = list.some(p => p.has_report);
  const pos = (p: Skater) => positionOf(squad, p.name, p.number);
  const shown = open ? list : list.filter(p => p.plus_minus !== 0 || p.points > 0);

  return (
    <section className="mr-card">
      <p className="mr-kicker">Spelarna</p>
      <h2 className="mr-title">Vem var på isen när det small?</h2>
      {/* Båda halvorna, inte bara nettot. I en 2-1-match är alla +1 eller 0,
          och ett ensamt nettotal hade dolt om det stod 2-1 eller 1-0 på isen
          när spelaren var ute. */}
      <Tornado
        leftLabel="Mål emot"
        rightLabel="Mål för"
        wideLabels
        rows={shown.map(p => ({
          key: p.name,
          label: `${p.number != null ? `${p.number}. ` : ''}${surname(p.name)}`,
          left: p.ga_on_ev,
          right: p.gf_on_ev,
        }))}
      />

      {shown.length < list.length && (
        <button className="bx-more" onClick={() => setOpen(true)}>
          Visa alla {list.length} spelare
        </button>
      )}

      <div className="bx-tablewrap">
        <table className="bx-table">
          <thead>
            <tr>
              <th className="bx-l">Spelare</th>
              <th>M</th><th>A</th><th>P</th><th>+/−</th><th>Utv</th>
              {hasReport && <><th>Skott</th><th>Tekn.</th></>}
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.name}>
                <td className="bx-l">
                  {p.number != null && <b>{p.number}</b>} {surname(p.name)}
                  {pos(p) && <span className="bx-pos-tag">{pos(p)}</span>}
                </td>
                <td>{p.goals}</td>
                <td>{p.assists}</td>
                <td>{p.points}</td>
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

      <p className="mr-note">
        Plus/minus räknas ur vilka som stod på isen vid varje mål: mål i lika
        styrka och i underläge räknas, powerplaymål inte, och straffslag och
        straffläggning inte alls. Talet stämmer med Swehockeys officiella i
        233 av 233 spelarrader under förra säsongen.
        {!hasReport && ' Skott och tekningar saknas för den här matchen — matchrapporten fanns inte när den skördades.'}
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
function Malvakter({ goalies }: { goalies: MatchReport['goalies'] }) {
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
              {g.number != null ? `${g.number}. ` : ''}{humanName(g.name)}
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
      <p className="mr-note">Räddningsprocenten kommer ur matchprotokollets målvaktssummering.</p>
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
function Femmorna({ lineup, squad }: { lineup: MatchReport['lineup']; squad: MatchReport['squad'] }) {
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
                  <b>{p.number}</b> {surname(p.name)}
                </span>
              ))}
              {def.length > 0 && (
                <>
                  <span className="lu-sep" aria-hidden="true" />
                  {def.map(p => (
                    <span className="lu-p lu-p-d" key={p.number ?? p.name}>
                      <b>{p.number}</b> {surname(p.name)}
                    </span>
                  ))}
                </>
              )}
            </span>
          </div>
        );
      })}
      <p className="mr-note">
        Klubbens egen indelning på matchsidan. Backparet står efter avdelaren.
      </p>
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

function Goals({ goals, squad }: { goals: Goal[]; squad: MatchReport['squad'] }) {
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
      {goals.map((g, i) => (
        <div key={i} className={`mr-goal${isOurs(g.team_code) ? ' mr-goal-ours' : ''}`}>
          <span className="mr-goal-time">{g.time}</span>
          <TeamMark code={g.team_code} />
          <span className="mr-goal-body">
            <span className="mr-goal-scorer">
              {g.scorer_number ? `${g.scorer_number}. ` : ''}{humanName(g.scorer)}
              <Form goal={g} />
            </span>
            {g.assists.length > 0 && (
              <span className="mr-goal-assists">{g.assists.map(humanName).join(', ')}</span>
            )}
            <OnIce goal={g} squad={squad} />
          </span>
          <span className="mr-goal-state">{(g.score_state || '').replace(/\s*\([A-Z]+\)/, '')}</span>
        </div>
      ))}
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

/* ── sida ── */
export function Matchrapport() {
  const { gameId } = useParams<{ gameId: string }>();
  const [data, setData] = useState<MatchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <Kontext
        ctx={data.context}
        opponent={(ourSide === 'home' ? data.away_team : data.home_team).replace(/^IF\s+/, '')}
      />
      <Momentum goals={data.goals} penalties={data.penalties} netResult={ourGoals - theirGoals} />
      {/* Förlängningen är fem minuter och straffläggningen ingen speltid alls.
          Räknat som 20 minuter per period blev en straffmatch 100 minuter lång,
          och tiden i ledning därmed nästan dubbelt så lång som den var. */}
      <Matchbild
        goals={data.goals}
        penalties={data.penalties}
        totalMin={periods.length > 3 ? 65 : 60}
      />
      <Periods periods={periods} ourSide={ourSide} teams={data.teams} />
      <Boxscore skaters={data.skaters} squad={data.squad} />
      <Malvakter goalies={data.goalies} />
      <Femmorna lineup={data.lineup} squad={data.squad} />
      <Goals goals={data.goals} squad={data.squad} />
      <Penalties penalties={data.penalties} goals={data.goals} />
      <DelaMatchen data={data} />

      {data.counts.events === 0 && (
        <section className="mr-card">
          <p className="mr-text">
            Matchhändelser saknas för den här matchen. De hämtas från Swehockey när
            matchen har spelats och scrapern har körts.
          </p>
        </section>
      )}
    </div>
  );
}
