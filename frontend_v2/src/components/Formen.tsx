import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

/**
 * Formen just nu: de senaste matcherna mot resten av säsongen.
 *
 * Kortet ska visa vad som ändrats, inte bara att det gått sämre. Tre delar:
 *  - match för match: skotten för och emot, och resultatet, med de senaste
 *    matcherna markerade
 *  - före mot nu: skottandel, skott som blir mål, räddningar, mål i lika
 *    styrka och 1–0, som två punkter på samma skala
 *  - poängen: vilka spelare som producerat före och nu
 *
 * Räddningsprocenten räknas utan mål i tom bur, så att en sen tommålsförlust
 * inte belastar målvakten.
 */
type Match = {
  game_id: number; date: string; opponent: string; is_home: boolean;
  goals_for: number; goals_against: number; shots_for: number; shots_against: number;
  ev_goals_for: number; ev_goals_against: number; empty_net_against: number;
  first_goal: 'us' | 'them' | null;
};
type Spelare = { name: string; points: Record<string, number> };
type Svar = { status: string; games: Match[]; players: Spelare[] };

const FORM = /^(if|ik|hc|bk|hk|hf|aik)$/i;
const kort = (n: string) => {
  const d = n.replace('Djurgårdens', 'Djurgården').split(/\s+/).filter(x => !FORM.test(x));
  return (d.length > 1 && /lakers|redhawks/i.test(d[d.length - 1]) ? d.slice(0, -1) : d).join(' ');
};
const komma = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const efternamn = (n: string) => n.split(',')[0].trim();

function summera(ms: Match[]) {
  const s = (k: keyof Match) => ms.reduce((a, m) => a + (m[k] as number), 0);
  const sf = s('shots_for'), sa = s('shots_against');
  const ga = s('goals_against'), tom = s('empty_net_against');
  return {
    n: ms.length,
    andel: sf + sa ? (100 * sf) / (sf + sa) : 0,
    skjut: sf ? (100 * s('goals_for')) / sf : 0,
    radd: sa ? (100 * (sa - (ga - tom))) / sa : 0,
    evFor: ms.length ? s('ev_goals_for') / ms.length : 0,
    evEmot: ms.length ? s('ev_goals_against') / ms.length : 0,
    forsta: ms.length ? (100 * ms.filter(m => m.first_goal === 'us').length) / ms.length : 0,
    forstaAntal: ms.filter(m => m.first_goal === 'us').length,
    malFor: ms.length ? s('goals_for') / ms.length : 0,
    malEmot: ms.length ? ga / ms.length : 0,
  };
}

/** Rubriken: det som ändrats mest, i en mening. */
function rubrik(fore: ReturnType<typeof summera>, nu: ReturnType<typeof summera>): string {
  const dAndel = nu.andel - fore.andel, dSkjut = nu.skjut - fore.skjut, dRadd = nu.radd - fore.radd;
  if (Math.abs(dAndel) < 3) {
    if (dSkjut <= -4 && dRadd <= -3) return 'Samma skottandel, färre mål och fler insläppta';
    if (dSkjut <= -4) return 'Samma skottandel, färre skott går in';
    if (dRadd <= -3) return 'Samma skottandel, färre räddningar';
    if (dSkjut >= 4) return 'Samma skottandel, fler skott går in';
    if (dRadd >= 3) return 'Samma skottandel, fler räddningar';
    return 'Formen håller i sig';
  }
  return dAndel < 0 ? 'Laget har tappat skotten' : 'Laget har tagit över skotten';
}

export function Formen({ season }: { season: string }) {
  const [data, setData] = useState<Svar | null>(null);
  const [n, setN] = useState(5);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/v1/formen${season ? `?season=${season}` : ''}`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setData(d?.status === 'ok' ? d : null))
      .catch(() => { /* kortet syns inte */ });
    return () => ctrl.abort();
  }, [season]);

  const games = data?.games ?? [];
  // Jämförelsen kräver minst tre matcher på var sida.
  const val = [3, 5, 8].filter(k => games.length - k >= 3);
  if (!data || val.length === 0) return null;
  const k = val.includes(n) ? n : val[val.length - 1];
  const fore = summera(games.slice(0, -k)), nu = summera(games.slice(-k));

  return (
    <section className="mc-card fm-kort">
      <p className="mc-kicker">Formen just nu</p>
      <h2 className="mc-title">{rubrik(fore, nu)}</h2>
      <div className="mg-val" role="group" aria-label="Antal senaste matcher">
        {val.map(v => (
          <button key={v} type="button" className="opp-chip" aria-pressed={k === v} onClick={() => setN(v)}>
            Senaste {v}
          </button>
        ))}
      </div>

      <div className="fm-forklaring">
        <span><i className="fm-f-for" />Lövens skott</span>
        <span><i className="fm-f-emot" />Motståndarnas</span>
        {games.length > MAX_MATCHER && <span className="fm-fonster">senaste {MAX_MATCHER} matcherna</span>}
      </div>
      <MatchForMatch games={games} k={k} />

      <p className="mc-kicker st-sub fm-sub">Före mot nu</p>
      <div className="fm-forklaring">
        <span><i className="fm-p-fore" />Matcherna före ({fore.n})</span>
        <span><i className="fm-p-nu" />Senaste {k}</span>
      </div>
      <Hantel namn="Andel av skotten" fore={fore.andel} nu={nu.andel} min={25} max={60} text={v => `${komma(v)} %`} mitt={50} />
      <Hantel namn="Skott som blir mål" fore={fore.skjut} nu={nu.skjut} min={0} max={20} text={v => `${komma(v)} %`} />
      <Hantel namn="Räddningsprocent" fore={fore.radd} nu={nu.radd} min={80} max={100} text={v => `${komma(v)} %`} />
      <Hantel namn="Mål i lika styrka per match" fore={fore.evFor} nu={nu.evFor} min={0} max={4} text={v => komma(v, 2)} />
      <Hantel namn="Insläppta i lika styrka per match" fore={fore.evEmot} nu={nu.evEmot} min={0} max={4} text={v => komma(v, 2)} lagreBattre />
      <Hantel namn="Gjorde 1–0" fore={fore.forsta} nu={nu.forsta} min={0} max={100}
        text={v => `${Math.round(v)} %`} textFore={`${Math.round(fore.forsta)} % (${fore.forstaAntal} av ${fore.n})`}
        textNu={`${Math.round(nu.forsta)} % (${nu.forstaAntal} av ${nu.n})`} />

      <Poangen spelare={data.players} games={games} k={k} />

      <p className="mc-note">
        Räddningsprocenten räknas utan mål i tom bur. Mål i lika styrka är fem
        mot fem och fyra mot fyra. {k} matcher är ett litet urval: ett par
        matcher åt något håll flyttar talen mycket.
      </p>
    </section>
  );
}

/**
 * Skotten match för match: Lövens uppåt, motståndarnas nedåt, resultatet
 * överst. De senaste k matcherna ligger på en ljusare bakgrund.
 */
// Fler staplar än så blir för smala på en telefon, och resultaten krockar.
const MAX_MATCHER = 15;

function MatchForMatch({ games: alla, k }: { games: Match[]; k: number }) {
  const games = alla.slice(-MAX_MATCHER);
  const W = 340, H = 190, L = 4, R = 4, MITT = 98;
  // Skalan växer inte förbi ytan: 1,55 punkter per skott, mindre om någon
  // match haft fler än runt 55 skott åt något håll.
  const SKALA = Math.min(1.55, 80 / Math.max(1, ...games.map(g => Math.max(g.shots_for, g.shots_against))));
  const steg = (W - L - R) / games.length;
  const bredd = Math.max(6, Math.min(14, steg - 8));
  const fran = games.length - k;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fm-svg" role="img"
      aria-label={`Skott för och emot i varje match. ${games.map(g => `${kort(g.opponent)} ${g.goals_for}–${g.goals_against}, skott ${g.shots_for}–${g.shots_against}`).join('. ')}`}>
      <rect x={L + fran * steg} y={0} width={k * steg} height={H - 4} rx={6} className="fm-nu-yta" />
      <text x={L + fran * steg + (k * steg) / 2} y={H - 8} textAnchor="middle" className="fm-axel">senaste {k}</text>
      <line x1={L} x2={W - R} y1={MITT} y2={MITT} className="fm-noll" />
      {games.map((g, i) => {
        const x = L + i * steg + (steg - bredd) / 2;
        const upp = g.shots_for * SKALA, ner = g.shots_against * SKALA;
        const vann = g.goals_for > g.goals_against;
        return (
          <g key={g.game_id}>
            <title>{`${g.date.slice(8, 10).replace(/^0/, '')}/${g.date.slice(5, 7).replace(/^0/, '')} ${g.is_home ? 'mot' : 'borta mot'} ${kort(g.opponent)}: ${g.goals_for}–${g.goals_against}. Skott ${g.shots_for}–${g.shots_against}.`}</title>
            {/* Större yta än stapeln, så att det går att peka på en match. */}
            <rect x={L + i * steg} y={0} width={steg} height={H} fill="transparent" />
            <rect x={x} y={MITT - 1 - upp} width={bredd} height={upp} rx={3} className="fm-for" />
            <rect x={x} y={MITT + 1} width={bredd} height={ner} rx={3} className="fm-emot" />
            <text x={x + bredd / 2} y={MITT - upp - 5} textAnchor="middle" className={vann ? 'fm-res fm-res-v' : 'fm-res'}>
              {g.goals_for}–{g.goals_against}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Två punkter på samma skala: före (ihålig) och nu (fylld), med pil. */
function Hantel({ namn, fore, nu, min, max, text, mitt, lagreBattre, textFore, textNu }: {
  namn: string; fore: number; nu: number; min: number; max: number; text: (v: number) => string;
  mitt?: number; lagreBattre?: boolean; textFore?: string; textNu?: string;
}) {
  const x = (v: number) => 6 + (Math.max(min, Math.min(max, v)) - min) / (max - min) * 228;
  const battre = lagreBattre ? nu < fore : nu > fore;
  const lika = Math.abs(nu - fore) < (max - min) * 0.01;
  return (
    <div className="fm-rad">
      <div className="fm-radtopp">
        <span className="fm-namn">{namn}</span>
        <span className="fm-tal">
          <span className="fm-tal-fore">{textFore ?? text(fore)}</span>
          <span aria-hidden="true"> → </span>
          <b className={lika ? '' : battre ? 'fm-battre' : 'fm-samre'}>{textNu ?? text(nu)}</b>
        </span>
      </div>
      <svg viewBox="0 0 240 18" className="fm-hantel" aria-hidden="true">
        <line x1={6} x2={234} y1={9} y2={9} className="fm-skala" />
        {mitt !== undefined && <line x1={x(mitt)} x2={x(mitt)} y1={3} y2={15} className="fm-mitt" />}
        <line x1={x(fore)} x2={x(nu)} y1={9} y2={9} className={lika ? 'fm-stang' : battre ? 'fm-stang fm-stang-b' : 'fm-stang fm-stang-s'} />
        <circle cx={x(fore)} cy={9} r={4.5} className="fm-p-fore-c" />
        <circle cx={x(nu)} cy={9} r={5} className={lika ? 'fm-p-nu-c' : battre ? 'fm-p-nu-c fm-p-b' : 'fm-p-nu-c fm-p-s'} />
      </svg>
    </div>
  );
}

/**
 * Poäng per match före och nu, för de spelare som gjort flest poäng i år.
 * En spelare som inte varit med i de senaste matcherna står som "ej med".
 */
function Poangen({ spelare, games, k }: { spelare: Spelare[]; games: Match[]; k: number }) {
  const foreIds = games.slice(0, -k).map(g => String(g.game_id));
  const nuIds = games.slice(-k).map(g => String(g.game_id));
  const rader = spelare.slice(0, 10).map(p => {
    const fm = foreIds.filter(id => id in p.points), nm = nuIds.filter(id => id in p.points);
    const fp = fm.reduce((a, id) => a + p.points[id], 0), np = nm.reduce((a, id) => a + p.points[id], 0);
    return { namn: efternamn(p.name), fp, fm: fm.length, np, nm: nm.length };
  });
  const max = Math.max(1, ...rader.map(r => Math.max(r.fm ? r.fp / r.fm : 0, r.nm ? r.np / r.nm : 0)));
  return (
    <>
      <p className="mc-kicker st-sub fm-sub">Poäng per match</p>
      <div className="fm-poang">
        <div className="fm-prad fm-phuvud">
          <span />
          <span>före</span>
          <span>senaste {k}</span>
        </div>
        {rader.map(r => (
          <div key={r.namn} className="fm-prad">
            <span className="fm-pnamn">{r.namn}</span>
            <Stapel v={r.fm ? r.fp / r.fm : 0} max={max} text={`${r.fp} på ${r.fm}`} klass="fm-pst-fore" />
            {r.nm === 0
              ? <span className="fm-ejmed">ej med</span>
              : <Stapel v={r.np / r.nm} max={max} text={`${r.np} på ${r.nm}`} klass={r.np === 0 ? 'fm-pst-noll' : 'fm-pst-nu'} />}
          </div>
        ))}
      </div>
    </>
  );
}

function Stapel({ v, max, text, klass }: { v: number; max: number; text: string; klass: string }) {
  return (
    <span className="fm-pcell">
      <span className={`fm-pst ${klass}`} style={{ width: `${Math.max(2, (v / max) * 100) * 0.55}%` }} />
      <span className="fm-ptext">{text}</span>
    </span>
  );
}
