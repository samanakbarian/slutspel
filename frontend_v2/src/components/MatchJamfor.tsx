import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { API_URL } from '../config/api';
import { ordinal } from '../lib/match';
import { komma } from '../lib/serien';
import { jsonEllerNull, kortLag, useLag } from '../lib/lag';
import type { Historik, LagMatch } from '../lib/lag';

/**
 * Matchrapportens jämförelser: matchen mot lagens säsong, vad den var i
 * säsongen och vad den gjorde med tabellen. Allt ur /lag och
 * /table-history, så rapporten för en äldre säsong visar inget av det här
 * i stället för fel siffror.
 */
export function MatchJamfor({ gameId, vi, de, datum }: { gameId: number; vi: string; de: string; datum: string }) {
  const A = useLag(vi), B = useLag(de);
  const a = A && A !== 'fel' ? A : null, b = B && B !== 'fel' ? B : null;
  const ga = a?.games.find(g => g.game_id === gameId);
  const gb = b?.games.find(g => g.game_id === gameId);
  return (
    <>
      {a && ga && <ISasongen games={a.games} g={ga} />}
      {a && b && ga && gb && <MotSasongen vi={{ namn: vi, games: a.games, g: ga }} de={{ namn: de, games: b.games, g: gb }} />}
      <Tabelleffekt vi={vi} de={de} datum={datum} />
    </>
  );
}

type Sida = { namn: string; games: LagMatch[]; g: LagMatch };

const MATT: { key: string; label: string; v: (g: LagMatch) => number | null; d: number; lagreBattre?: boolean }[] = [
  { key: 'gf', label: 'Mål', v: g => g.goals_for, d: 1 },
  { key: 'ga', label: 'Insläppta', v: g => g.goals_against, d: 1, lagreBattre: true },
  { key: 'sf', label: 'Skott', v: g => g.shots_for, d: 1 },
  { key: 'sa', label: 'Skott emot', v: g => g.shots_against, d: 1, lagreBattre: true },
  { key: 'andel', label: 'Andel av skotten', v: g => (g.shots_for != null && g.shots_against != null && g.shots_for + g.shots_against > 0 ? (g.shots_for / (g.shots_for + g.shots_against)) * 100 : null), d: 0 },
];

/**
 * Matchen mot lagens egna snitt: den streckade pricken är snittet i
 * övriga matcher, den fyllda matchen. Grönt är bättre än vanligt, orange
 * sämre.
 */
function MotSasongen({ vi, de }: { vi: Sida; de: Sida }) {
  const rad = (s: Sida, m: (typeof MATT)[number]) => {
    const ovriga = s.games.filter(x => x.game_id !== s.g.game_id && x.date <= s.g.date).map(m.v).filter((v): v is number => v != null);
    const nu = m.v(s.g);
    if (nu == null || ovriga.length < 2) return null;
    return { snitt: ovriga.reduce((x, y) => x + y, 0) / ovriga.length, nu };
  };
  const rader = MATT.map(m => ({ m, a: rad(vi, m), b: rad(de, m) })).filter(r => r.a && r.b);
  if (rader.length === 0) return null;
  return (
    <section className="mr-card">
      <p className="mr-kicker">Matchen mot säsongen</p>
      <div className="mj-rader">
        {rader.map(({ m, a, b }) => {
          const alla = [a!.snitt, a!.nu, b!.snitt, b!.nu];
          const lo = m.key === 'andel' ? Math.min(30, ...alla) : 0, hi = m.key === 'andel' ? Math.max(70, ...alla) : Math.max(...alla) * 1.08;
          const x = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
          return (
            <div key={m.key} className="mj-grupp">
              <span className="mj-namn">{m.label}</span>
              {([[vi, a!, 'mj-vi'], [de, b!, 'mj-de']] as const).map(([s, r, k]) => {
                const battre = m.lagreBattre ? r.nu < r.snitt : r.nu > r.snitt;
                const lika = Math.abs(r.nu - r.snitt) < 0.05;
                const fmt = (v: number) => (m.key === 'andel' ? `${Math.round(v)} %` : komma(v, Number.isInteger(v) ? 0 : m.d));
                return (
                  <div key={s.namn} className={`mj-rad ${k}`} title={`${s.namn}: ${fmt(r.nu)} i matchen, ${fmt(r.snitt)} i snitt`}>
                    <span className="mj-lag">{kortLag(s.namn)}</span>
                    <span className="mj-spar">
                      <i className={`mj-linje${lika ? '' : battre ? ' mj-battre' : ' mj-samre'}`}
                        style={{ left: `${Math.min(x(r.snitt), x(r.nu))}%`, width: `${Math.abs(x(r.nu) - x(r.snitt))}%` }} />
                      <i className="mj-snitt" style={{ left: `${x(r.snitt)}%` }} />
                      <i className={`mj-nu${lika ? '' : battre ? ' mj-battre' : ' mj-samre'}`} style={{ left: `${x(r.nu)}%` }} />
                    </span>
                    <span className="mj-tal"><b>{fmt(r.nu)}</b> <small>{fmt(r.snitt)}</small></span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="sr-leg">
        <span><i className="sr-leg-ruta mj-leg-snitt" />snitt övriga matcher</span>
        <span><i className="sr-leg-ruta mj-leg-battre" />bättre än vanligt</span>
        <span><i className="sr-leg-ruta mj-leg-samre" />sämre</span>
      </div>
    </section>
  );
}

const ORDTAL = ['', 'första', 'andra', 'tredje', 'fjärde', 'femte', 'sjätte', 'sjunde', 'åttonde', 'nionde', 'tionde'];

/** Vad matchen var i säsongen: rekord, sviter och vändningar fram till och med den. */
function ISasongen({ games, g }: { games: LagMatch[]; g: LagMatch }) {
  const hittills = games.filter(x => x.date < g.date || x.game_id === g.game_id);
  if (hittills.length < 4) return null;
  const fakta: string[] = [];
  const diff = (x: LagMatch) => x.goals_for - x.goals_against;
  const d = diff(g);
  const ovriga = hittills.filter(x => x.game_id !== g.game_id);
  if (d < 0 && ovriga.every(x => diff(x) > d)) fakta.push(`Säsongens största förlust, ${g.goals_for}–${g.goals_against}.`);
  if (d > 0 && ovriga.every(x => diff(x) < d)) fakta.push(`Säsongens största vinst, ${g.goals_for}–${g.goals_against}.`);
  const rekord = (v: (x: LagMatch) => number | null, mest: string, minst: string) => {
    const nu = v(g);
    const andra = ovriga.map(v).filter((x): x is number => x != null);
    if (nu == null || andra.length < 3) return;
    if (andra.every(x => nu > x)) fakta.push(`${mest} i år: ${nu}.`);
    else if (andra.every(x => nu < x)) fakta.push(`${minst} i år: ${nu}.`);
  };
  rekord(x => x.shots_for, 'Flest egna skott', 'Färst egna skott');
  rekord(x => x.shots_against, 'Flest skott emot', 'Färst skott emot');
  rekord(x => x.goals_for, 'Flest gjorda mål', 'Färst gjorda mål');

  // Svit: samma utfall i rad, bakåt från matchen.
  const vann = (x: LagMatch) => x.goals_for > x.goals_against;
  const ordning = [...hittills].sort((x, y) => x.date.localeCompare(y.date));
  let svit = 0;
  for (let i = ordning.length - 1; i >= 0 && vann(ordning[i]) === vann(g); i--) svit++;
  if (svit >= 3) fakta.push(`${(ORDTAL[svit] ?? `${svit}:e`).replace(/^./, c => c.toUpperCase())} raka ${vann(g) ? 'vinsten' : 'förlusten'}.`);
  else if (svit === 1 && ordning.length >= 2) {
    let fore = 0;
    for (let i = ordning.length - 2; i >= 0 && vann(ordning[i]) !== vann(g); i--) fore++;
    if (fore >= 3) fakta.push(`${vann(g) ? 'Vinst' : 'Förlust'} efter ${fore} raka ${vann(g) ? 'förluster' : 'vinster'}.`);
  }

  // Vändningar efter två perioder.
  const efter2 = (x: LagMatch) => (x.score_by_period && x.score_by_period.length >= 2 ? x.score_by_period[1] : null);
  const s2 = efter2(g);
  if (s2 && s2[0] < s2[1] && vann(g)) {
    const tidigare = ovriga.filter(x => { const s = efter2(x); return s && s[0] < s[1] && vann(x); }).length;
    fakta.push(tidigare === 0 ? 'Första vinsten i år efter underläge efter två perioder.' : `Vinst efter underläge efter två perioder, ${ORDTAL[tidigare + 1] ?? `${tidigare + 1}:e`} gången i år.`);
  }
  if (s2 && s2[0] > s2[1] && !vann(g)) {
    const tidigare = ovriga.filter(x => { const s = efter2(x); return s && s[0] > s[1] && !vann(x); }).length;
    fakta.push(tidigare === 0 ? 'Första gången i år laget tappat en ledning efter två perioder.' : 'Ännu en ledning efter två perioder som inte räckte.');
  }
  if (g.first_goal === 'for' && !vann(g)) {
    const n = ovriga.filter(x => x.first_goal === 'for' && !vann(x)).length;
    if (n === 0) fakta.push('Första förlusten i år när laget gjort första målet.');
  }

  if (fakta.length === 0) return null;
  return (
    <section className="mr-card">
      <p className="mr-kicker">Matchen i säsongen</p>
      <ul className="mj-fakta">
        {fakta.slice(0, 4).map(f => <li key={f}>{f}</li>)}
      </ul>
    </section>
  );
}

/** Placeringen före och efter omgången, för båda lagen. */
function Tabelleffekt({ vi, de, datum }: { vi: string; de: string; datum: string }) {
  const [h, setH] = useState<(Historik & { dates?: string[] }) | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/v1/table-history`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => { if (d?.status === 'ok' && Array.isArray(d.teams)) setH(d); })
      .catch(() => { /* kortet syns inte */ });
    return () => ctrl.abort();
  }, []);
  if (!h?.dates) return null;
  const dag = datum.slice(0, 10);
  const i = h.dates.findIndex(x => x.slice(0, 10) === dag);
  if (i < 1) return null;
  const rad = (lag: string) => {
    const t = h.teams.find(x => x.team === lag);
    const fore = t?.ranks[i - 1], efter = t?.ranks[i];
    return fore != null && efter != null ? { lag, fore, efter } : null;
  };
  const rader = [rad(vi), rad(de)].filter((x): x is NonNullable<typeof x> => x != null);
  if (rader.length === 0) return null;
  const pil = (f: number, e: number): ReactNode => (e < f ? <b className="mj-upp">▲ {f - e}</b> : e > f ? <b className="mj-ned">▼ {e - f}</b> : <b className="mj-still">–</b>);
  return (
    <section className="mr-card">
      <p className="mr-kicker">Tabellen efter omgången</p>
      <div className="mj-tabell">
        {rader.map(r => (
          <div key={r.lag} className={`mj-trad${r.lag === vi ? ' mj-vi' : ' mj-de'}`}>
            <span className="mj-lag">{kortLag(r.lag)}</span>
            <span className="mj-plats">{ordinal(r.fore)}</span>
            <span className="mj-pil">→</span>
            <span className="mj-plats mj-efter">{ordinal(r.efter)}</span>
            {pil(r.fore, r.efter)}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * En rubrik som fälls ut: för det som är kuriosa eller detaljer. Kortet
 * inuti ritas först när läsaren ber om det.
 */
export function Fallbar({ titel, rad, children }: { titel: string; rad?: string; children: ReactNode }) {
  const [oppen, setOppen] = useState(false);
  return (
    <>
      <button type="button" className={`mj-fall${oppen ? ' mj-fall-oppen' : ''}`} onClick={() => setOppen(v => !v)} aria-expanded={oppen}>
        <span className="mj-fall-titel">{titel}</span>
        {rad && <span className="mj-fall-rad">{rad}</span>}
        <span className="mj-fall-pil" aria-hidden="true">{oppen ? '−' : '+'}</span>
      </button>
      {oppen && children}
    </>
  );
}
