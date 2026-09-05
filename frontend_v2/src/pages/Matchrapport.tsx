import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import { PairedBar } from '../components/charts/Charts';

/* ── typer, speglar /api/v1/match/{game_id} ── */
type Goal = {
  time: string;
  minute: number;
  period: number | null;
  team_code: string | null;
  scorer: string | null;
  scorer_number: number | null;
  assists: string[];
  score_state: string | null;
  is_power_play: boolean;
  is_short_handed: boolean;
};

type Penalty = {
  time: string;
  minute: number;
  period: number | null;
  team_code: string | null;
  player: string | null;
  player_number: number | null;
  minutes: number;
  type: string | null;
};

type MatchReport = {
  status: string;
  error?: string;
  game_id: number;
  date: string;
  time?: string | null;
  home_team: string;
  away_team: string;
  result?: string | null;
  period_results?: string | null;
  venue?: string | null;
  spectators?: number | null;
  goals: Goal[];
  penalties: Penalty[];
  counts: { events: number; goals: number; penalties: number };
};

const BJK = /bj[oö]rkl[oö]ven/i;
const BJK_CODES = ['IFB', 'BJO', 'BJK'];

/** Swehockeys namnform är "Efternamn, Förnamn" — vänd till läsbar ordning. */
function humanName(n: string | null): string {
  if (!n) return '—';
  const m = n.split(',').map(s => s.trim());
  return m.length === 2 ? `${m[1]} ${m[0]}` : n;
}

function isOurs(teamCode: string | null): boolean {
  return BJK_CODES.includes((teamCode || '').toUpperCase());
}

/** "(0-0, 0-1, 1-0)" → [[0,0],[0,1],[1,0]] */
function parsePeriods(pr: string | null | undefined): [number, number][] {
  if (!pr) return [];
  return pr
    .replace(/[()]/g, '')
    .split(',')
    .map(s => s.trim().match(/(\d+)\s*-\s*(\d+)/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map(m => [parseInt(m[1], 10), parseInt(m[2], 10)] as [number, number]);
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
function Momentum({ goals, netResult }: { goals: Goal[]; netResult: number }) {
  if (goals.length === 0) return null;

  const W = 280;
  const H = 92;
  const PAD = 8;
  const ZERO = 52;
  const STEP = 13; // px per måls skillnad
  const LEN = 65; // minuter på x-axeln, med plats för förlängning

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
        {goals.map((g, i) => (
          <circle key={i} cx={x(g.minute)} cy={pts[i + 1].y} r="3"
            fill={isOurs(g.team_code) ? 'var(--impact-positive)' : 'var(--impact-negative)'}>
            <title>{`${g.time} ${humanName(g.scorer)}`}</title>
          </circle>
        ))}
        {[0, 20, 40, 60].map(m => (
          <text key={m} x={x(m)} y={H - 6} fill="var(--text-muted)" fontSize="8" fontFamily="monospace"
            textAnchor={m === 0 ? 'start' : 'middle'}>{m}'</text>
        ))}
      </svg>
      <p className="mr-note">
        Över linjen betyder att Björklöven leder.
        {missing !== 0 && ' Avgörandet på straffar räknas inte som en matchhändelse och syns därför inte i kurvan.'}
      </p>
    </section>
  );
}

/* ── periodsplit ── */
function Periods({ periods, ourSide }: { periods: [number, number][]; ourSide: 'home' | 'away' }) {
  if (periods.length === 0) return null;
  const label = (i: number) => (i < 3 ? `${i + 1}:a perioden` : i === 3 ? 'Förlängning' : 'Straffar');
  return (
    <section className="mr-card">
      <p className="mr-kicker">Period för period</p>
      <div className="mr-periods">
        {periods.map(([h, a], i) => {
          const ours = ourSide === 'home' ? h : a;
          const theirs = ourSide === 'home' ? a : h;
          const tone = ours > theirs ? 'win' : ours < theirs ? 'loss' : 'draw';
          return (
            <div key={i} className={`mr-period mr-period-${tone}`}>
              <span className="mr-period-label">{label(i)}</span>
              <span className="mr-period-score">{ours}–{theirs}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── målkronologi ── */
function Goals({ goals }: { goals: Goal[] }) {
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
          <span className="mr-goal-dot" />
          <span className="mr-goal-body">
            <span className="mr-goal-scorer">
              {g.scorer_number ? `${g.scorer_number}. ` : ''}{humanName(g.scorer)}
              {g.is_power_play && <span className="mr-tag mr-tag-pp">PP</span>}
              {g.is_short_handed && <span className="mr-tag mr-tag-sh">SH</span>}
            </span>
            {g.assists.length > 0 && (
              <span className="mr-goal-assists">{g.assists.map(humanName).join(', ')}</span>
            )}
          </span>
          <span className="mr-goal-state">{(g.score_state || '').replace(/\s*\([A-Z]+\)/, '')}</span>
        </div>
      ))}
    </section>
  );
}

/* ── utvisningar ── */
function Penalties({ penalties }: { penalties: Penalty[] }) {
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
          <span className="mr-pen-min">{p.minutes}′</span>
          <span className="mr-pen-body">
            <span className="mr-pen-player">
              {p.player_number ? `${p.player_number}. ` : ''}{humanName(p.player)}
            </span>
            {p.type && <span className="mr-pen-type">{p.type}</span>}
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

      <Momentum goals={data.goals} netResult={ourGoals - theirGoals} />
      <Matchbild
        goals={data.goals}
        penalties={data.penalties}
        totalMin={Math.max(60, periods.length * 20)}
      />
      <Periods periods={periods} ourSide={ourSide} />
      <Goals goals={data.goals} />
      <Penalties penalties={data.penalties} />

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
