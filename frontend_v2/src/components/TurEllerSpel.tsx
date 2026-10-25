import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

/**
 * Tur eller spel? Lövens poäng mot de poäng skotten borde ha gett.
 *
 * Förväntade poäng: om Lövens skott och skotten emot hade gått in i seriens
 * snittakt, hur många poäng hade det gett? Varje match räknas som två
 * oberoende Poissonfördelningar med medelvärdet skott gånger seriens
 * skottprocent. Vinst ger 3, oavgjort efter full tid 1,5 (2 eller 1 efter
 * förlängning, i snitt), förlust 0.
 */
type Match = {
  game_id: number; date: string; opponent: string; is_home: boolean;
  goals_for: number; goals_against: number; shots_for: number; shots_against: number;
};
type Lag = { team: string; gp: number; counts: { gf: number; ga: number; sf: number; sa: number } };
type Tabellrad = { team_name: string; rank: number };
type Rad = Match & { xFor: number; xEmot: number; xPoang: number; poang: number | null };

const SENASTE = 5;
const komma = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const FORM = /^(if|ik|hc|bk|hk|hf|aik)$/i;
const kort = (n: string) => {
  const d = n.replace('Djurgårdens', 'Djurgården').split(/\s+/).filter(x => !FORM.test(x));
  return (d.length > 1 && /lakers|redhawks/i.test(d[d.length - 1]) ? d.slice(0, -1) : d).join(' ');
};

function poisson(lam: number, k: number): number {
  let p = Math.exp(-lam);
  for (let i = 1; i <= k; i++) p *= lam / i;
  return p;
}
function forvantadePoang(a: number, b: number): number {
  let vinst = 0, lika = 0;
  for (let i = 0; i <= 15; i++) for (let j = 0; j <= 15; j++) {
    const p = poisson(a, i) * poisson(b, j);
    if (i > j) vinst += p; else if (i === j) lika += p;
  }
  return 3 * vinst + 1.5 * lika;
}

export function TurEllerSpel({ season, poang }: { season: string; poang: { date: string; pts: number }[] }) {
  const [games, setGames] = useState<Match[] | null>(null);
  const [lag, setLag] = useState<Lag[] | null>(null);
  const [tabell, setTabell] = useState<Tabellrad[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    const q = season ? `?season=${season}` : '';
    Promise.all([
      fetch(`${API_URL}/api/v1/formen${q}`, { signal: ctrl.signal }).then(r => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/api/v1/league${q}`, { signal: ctrl.signal }).then(r => (r.ok ? r.json() : null)),
      // Tabellen bara till placeringen bredvid staplarna; saknas den syns de ändå.
      fetch(`${API_URL}/api/v1/standings${q}`, { signal: ctrl.signal }).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([f, l, t]) => {
        if (f?.status === 'ok' && l?.status === 'ok') { setGames(f.games); setLag(l.teams); }
        if (Array.isArray(t?.standings)) setTabell(t.standings);
      })
      .catch(() => { /* kortet syns inte */ });
    return () => ctrl.abort();
  }, [season]);

  if (!games || !lag || games.length < SENASTE + 3) return null;

  const allaMal = lag.reduce((a, t) => a + t.counts.gf, 0);
  const allaSkott = lag.reduce((a, t) => a + t.counts.sf, 0);
  const takt = allaSkott ? allaMal / allaSkott : 0.1;
  const poangPa = new Map(poang.map(p => [p.date.slice(0, 10), p.pts]));

  const rader: Rad[] = games.map(g => {
    const xFor = g.shots_for * takt, xEmot = g.shots_against * takt;
    return { ...g, xFor, xEmot, xPoang: forvantadePoang(xFor, xEmot), poang: poangPa.get(g.date.slice(0, 10)) ?? null };
  });

  const summa = (rs: Rad[]) => ({
    poang: rs.reduce((a, r) => a + (r.poang ?? 0), 0),
    xPoang: rs.reduce((a, r) => a + r.xPoang, 0),
    mal: rs.reduce((a, r) => a + r.goals_for, 0),
    insl: rs.reduce((a, r) => a + r.goals_against, 0),
    xMal: rs.reduce((a, r) => a + r.xFor, 0),
    xInsl: rs.reduce((a, r) => a + r.xEmot, 0),
  });
  const hela = summa(rader), nu = summa(rader.slice(-SENASTE));

  return (
    <section className="mc-card ts-kort">
      <p className="mc-kicker">Tur eller spel?</p>

      <div className="ts-tal">
        <div>
          <span className="ts-etikett">Poäng</span>
          <b>{hela.poang}</b>
          <span className="ts-x">förväntat {komma(hela.xPoang)}</span>
        </div>
        <div>
          <span className="ts-etikett">Mål</span>
          <b>{hela.mal}–{hela.insl}</b>
          <span className="ts-x">förväntat {Math.round(hela.xMal)}–{Math.round(hela.xInsl)}</span>
        </div>
        <div>
          <span className="ts-etikett">Senaste {SENASTE}</span>
          <b>{nu.poang} p</b>
          <span className="ts-x">förväntat {komma(nu.xPoang)}</span>
        </div>
      </div>

      <p className="mc-kicker st-sub ts-sub">Poäng över säsongen</p>
      <Kurvor rader={rader} />

      <p className="mc-kicker st-sub ts-sub">Förväntad målskillnad per match, hela serien</p>
      <Serien lag={lag} takt={takt} tabell={tabell} />

      <p className="mc-note">
        Förväntat är om skotten för och emot hade gått in i seriens snittakt,
        {` ${komma(takt * 100)} %`}.
      </p>
    </section>
  );
}

/** Faktiska och förväntade poäng, ackumulerade match för match. */
function Kurvor({ rader }: { rader: Rad[] }) {
  const W = 340, H = 150, L = 24, R = 40, T = 10, B = 18;
  const fakt: number[] = [], forv: number[] = [];
  rader.reduce((a, r) => { fakt.push(a + (r.poang ?? 0)); return a + (r.poang ?? 0); }, 0);
  rader.reduce((a, r) => { forv.push(a + r.xPoang); return a + r.xPoang; }, 0);
  const max = Math.max(3, ...fakt, ...forv);
  const x = (i: number) => L + (rader.length < 2 ? 0 : (i / (rader.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const linje = (s: number[]) => s.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const steg = max <= 15 ? 5 : max <= 40 ? 10 : 20;
  const sistF = fakt[fakt.length - 1], sistX = forv[forv.length - 1];
  // Etiketterna i slutet får inte krocka.
  const yF = y(sistF), yX = Math.abs(y(sistX) - yF) < 10 ? yF + (sistX < sistF ? 10 : -10) : y(sistX);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ts-svg" role="img"
      aria-label={`Faktiska poäng ${sistF}, förväntade ${komma(sistX)} efter ${rader.length} matcher`}>
      {Array.from({ length: Math.floor(max / steg) + 1 }, (_, k) => k * steg).map(v => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="mg-grid" />
          <text x={L - 5} y={y(v) + 3} textAnchor="end" className="mg-axel">{v}</text>
        </g>
      ))}
      <path d={`${linje(fakt)} ${[...forv].reverse().map((v, i) => `L${x(forv.length - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} Z`}
        className={sistF >= sistX ? 'ts-yta' : 'ts-yta ts-yta-neg'} />
      <path d={linje(forv)} className="ts-forv" />
      <path d={linje(fakt)} className="ts-fakt" />
      {rader.map((r, i) => (
        <g key={r.game_id}>
          <title>{`${kort(r.opponent)} ${r.goals_for}–${r.goals_against}: ${r.poang ?? '–'} p, förväntat ${komma(r.xPoang, 2)}`}</title>
          <circle cx={x(i)} cy={y(fakt[i])} r={2.6} className="ts-fakt-p" />
          <rect x={x(i) - 6} y={T} width={12} height={H - T - B} fill="transparent" />
        </g>
      ))}
      <text x={W - R + 5} y={yF + 3} className="ts-slut ts-slut-f">{sistF} p</text>
      <text x={W - R + 5} y={yX + 3} className="ts-slut">{komma(sistX)}</text>
      <text x={L} y={H - 4} className="mg-axel">match 1</text>
      <text x={W - R} y={H - 4} textAnchor="end" className="mg-axel">{rader.length}</text>
      <g className="ts-leg">
        <line x1={L + 4} x2={L + 18} y1={T + 4} y2={T + 4} className="ts-fakt" />
        <text x={L + 22} y={T + 7} className="mg-axel">faktiska</text>
        <line x1={L + 70} x2={L + 84} y1={T + 4} y2={T + 4} className="ts-forv" />
        <text x={L + 88} y={T + 7} className="mg-axel">förväntade</text>
      </g>
    </svg>
  );
}

/**
 * Alla lag efter förväntad målskillnad per match: skott för minus skott emot,
 * gånger seriens skottprocent. Placeringen i tabellen står bredvid, så att
 * man ser vilka som står högre eller lägre än skotten säger.
 */
function Serien({ lag, takt, tabell }: { lag: Lag[]; takt: number; tabell: Tabellrad[] }) {
  const plats = new Map(tabell.map(r => [r.team_name, r.rank]));
  const rader = lag
    .map(t => ({ team: t.team, x: t.gp ? ((t.counts.sf - t.counts.sa) * takt) / t.gp : 0, plats: plats.get(t.team) }))
    .sort((a, b) => b.x - a.x);
  const max = Math.max(0.5, ...rader.map(r => Math.abs(r.x)));
  return (
    <div className="ts-serien" role="table" aria-label="Förväntad målskillnad per match och placering i tabellen">
      <div className="ts-srad ts-shuvud" role="row">
        <span role="columnheader" />
        <span role="columnheader" />
        <span role="columnheader">per match</span>
        <span role="columnheader">tabell</span>
      </div>
      {rader.map((r, i) => {
        const vi = /bj[oö]rkl[oö]ven/i.test(r.team);
        const bredd = (Math.abs(r.x) / max) * 50;
        return (
          <div key={r.team} className={`ts-srad${vi ? ' ts-vi' : ''}`} role="row">
            <span className="ts-snr" role="cell">{i + 1}</span>
            <span className="ts-snamn" role="cell">{kort(r.team)}</span>
            <span className="ts-sbar" role="cell" aria-label={`${r.x > 0 ? '+' : ''}${komma(r.x, 2)}`}>
              <i className="ts-smitt" />
              <i className={r.x >= 0 ? 'ts-sst ts-sst-p' : 'ts-sst ts-sst-n'}
                style={r.x >= 0 ? { left: '50%', width: `${bredd}%` } : { right: '50%', width: `${bredd}%` }} />
              <em className={r.x >= 0 ? 'ts-sval ts-sval-p' : 'ts-sval ts-sval-n'}>{r.x > 0 ? '+' : ''}{komma(r.x, 2)}</em>
            </span>
            <span className="ts-splats" role="cell">{r.plats ? `${r.plats}:${r.plats === 1 || r.plats === 2 ? 'a' : 'e'}` : '–'}</span>
          </div>
        );
      })}
    </div>
  );
}
