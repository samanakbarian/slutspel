import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import { useLeague, komma } from '../lib/serien';
import type { LeagueData, LeagueTeam } from '../lib/serien';
import { ordinal } from '../lib/match';

/**
 * Serien: vilket lag som helst, inte bara vårt.
 *
 * Lagväljaren överst i tabellordning. Under den laget i siffror mot de
 * andra, utvecklingen match för match, matcherna, spelarna och målvakterna,
 * och sist alla lag sida vid sida. Laget står i adressen (?lag=FBK) så att
 * en vy går att länka.
 */
type Tabellrad = { team_name: string; rank: number; points: number; games_played: number; goal_diff: number };
type Trendpunkt = { match: number; shot_share: number | null; pdo: number | null; gf_pg: number; ga_pg: number };
type Trend = { teams: { team: string; points: Trendpunkt[] }[]; league: (Partial<Trendpunkt> & { match: number })[]; window: number };
type LagMatch = {
  game_id: number; date: string; opponent: string; is_home: boolean;
  goals_for: number; goals_against: number; beyond_regulation: boolean; points: number;
  shots_for: number | null; shots_against: number | null;
  score_by_period?: [number, number][]; first_goal?: 'for' | 'against' | null;
};
type Historik = { rounds: number[]; teams: { team: string; ranks: (number | null)[] }[] };
type LagSpelare = {
  name: string; number: number | null; position: string | null; games_played: number;
  goals: number; assists: number; points: number; plus_minus: number | null; pim: number;
  shots: number | null; faceoffs: number; fo_pct: number | null; games_with_report: number;
};
type LagMalvakt = { name: string; games_played: number; save_pct: number | null; gaa: number | null; shots_against: number | null };
type Period = { period: number; gf: number; ga: number; gf_pp: number; ga_pp: number; gf_sh: number; ga_sh: number; gf_en: number; ga_en: number };
type Lag = { status: string; team: string; games: LagMatch[]; players: LagSpelare[]; goalies: LagMalvakt[]; periods?: Period[] };

const FORM = /^(if|ik|hc|bk|hk|hf|aik)$/i;
const kortLag = (n: string) => {
  const d = n.replace('Djurgårdens', 'Djurgården').split(/\s+/).filter(x => !FORM.test(x));
  return (d.length > 1 && /lakers|redhawks/i.test(d[d.length - 1]) ? d.slice(0, -1) : d).join(' ');
};
const fornamnEfternamn = (n: string) => {
  const [e, f] = n.split(',').map(s => s.trim());
  return f ? `${f} ${e}` : n;
};
const jsonEllerNull = (r: Response) => (r.ok ? r.json() : null);

export function SerienPage() {
  const liga = useLeague('');
  const [tabell, setTabell] = useState<Tabellrad[]>([]);
  const [trend, setTrend] = useState<Trend | null>(null);
  const [historik, setHistorik] = useState<Historik | null>(null);
  const [params, setParams] = useSearchParams();
  const valjare = useRef<HTMLDivElement>(null);
  const valjareB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/v1/standings`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => { if (Array.isArray(d?.standings)) setTabell(d.standings); })
      .catch(() => { /* väljaren faller tillbaka på bokstavsordning */ });
    fetch(`${API_URL}/api/v1/league-trend`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => { if (d?.status === 'ok') setTrend(d); })
      .catch(() => { /* utvecklingen syns inte */ });
    fetch(`${API_URL}/api/v1/table-history`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => { if (d?.status === 'ok' && Array.isArray(d.teams)) setHistorik(d); })
      .catch(() => { /* tabellresan syns inte */ });
    return () => ctrl.abort();
  }, []);

  const lag = useMemo(() => {
    if (!liga) return [];
    const plats = new Map(tabell.map(r => [r.team_name, r.rank]));
    return [...liga.teams].sort((a, b) => (plats.get(a.team) ?? 99) - (plats.get(b.team) ?? 99) || a.team.localeCompare(b.team, 'sv'));
  }, [liga, tabell]);

  const kod = params.get('lag');
  // Valt lag ska synas i raden även när det står långt ned i tabellen.
  useEffect(() => {
    const rad = valjare.current;
    const knapp = rad?.querySelector<HTMLElement>('.sr-chip-on');
    if (rad && knapp) rad.scrollTo({ left: knapp.offsetLeft - rad.clientWidth / 2 + knapp.clientWidth / 2, behavior: 'smooth' });
    const radB = valjareB.current;
    const knappB = radB?.querySelector<HTMLElement>('.sr-chip-b');
    if (radB && knappB) radB.scrollTo({ left: knappB.offsetLeft - radB.clientWidth / 2 + knappB.clientWidth / 2, behavior: 'smooth' });
  }, [kod, lag, params]);

  if (!liga) {
    return <div className="page"><section className="mc-card"><p className="mc-kicker">Serien</p><p className="mc-text">Laddar seriens lag …</p></section></div>;
  }
  const vald = lag.find(t => t.code === kod) ?? lag.find(t => !t.is_ours) ?? lag[0];
  const jamfor = params.has('mot');
  const mot = jamfor
    ? (lag.find(t => t.code === params.get('mot') && t.code !== vald.code) ?? lag.find(t => t.is_ours && t.code !== vald.code) ?? lag.find(t => t.code !== vald.code)!)
    : null;
  const satt = (a: string, b: string | null, upp = true) => {
    setParams(b ? { lag: a, mot: b } : { lag: a }, { replace: true });
    if (upp) window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const valj = (t: LeagueTeam) => satt(t.code, mot && mot.code !== t.code ? mot.code : jamfor ? (lag.find(x => x.code !== t.code)?.code ?? null) : null);

  return (
    <div className="page sr-sida">
      <div className="mc-seg" role="tablist" aria-label="Vy">
        <button role="tab" aria-selected={!jamfor} className={`mc-segbtn${!jamfor ? ' mc-on' : ''}`} onClick={() => satt(vald.code, null, false)}>Ett lag</button>
        <button role="tab" aria-selected={jamfor} className={`mc-segbtn${jamfor ? ' mc-on' : ''}`}
          onClick={() => satt(vald.code, (lag.find(t => t.is_ours && t.code !== vald.code) ?? lag.find(t => t.code !== vald.code))!.code, false)}>Jämför två lag</button>
      </div>
      <div className="sr-valjare" ref={valjare} role="tablist" aria-label="Välj lag">
        {lag.map(t => {
          const r = tabell.find(x => x.team_name === t.team)?.rank;
          return (
            <button key={t.code} role="tab" aria-selected={t.code === vald.code}
              className={`sr-chip${t.code === vald.code ? ' sr-chip-on' : ''}${t.is_ours ? ' sr-chip-vi' : ''}`}
              onClick={() => valj(t)} title={t.team}>
              {r != null && <i>{r}</i>}{kortLag(t.team)}
            </button>
          );
        })}
      </div>

      {mot && (
        <div className="sr-valjare sr-valjare-b" ref={valjareB} role="tablist" aria-label="Jämför med">
          <span className="sr-mot">mot</span>
          {lag.filter(t => t.code !== vald.code).map(t => (
            <button key={t.code} role="tab" aria-selected={t.code === mot.code}
              className={`sr-chip${t.code === mot.code ? ' sr-chip-b' : ''}${t.is_ours ? ' sr-chip-vi' : ''}`}
              onClick={() => satt(vald.code, t.code, false)} title={t.team}>
              {kortLag(t.team)}
            </button>
          ))}
        </div>
      )}

      {mot ? (
        <Jamforelse liga={liga} a={vald} b={mot} tabell={tabell} trend={trend} historik={historik} />
      ) : (
        <>
          <Oversikt liga={liga} t={vald} rad={tabell.find(x => x.team_name === vald.team)} />
          {historik && <Tabellresan historik={historik} a={vald.team} />}
          {trend && <Utveckling trend={trend} lag={vald.team} />}
          <LagDetaljer key={vald.team} team={vald.team} snittRadd={liga.league.sv_pct ?? null} />
        </>
      )}
      <AllaLag liga={liga} tabell={tabell} vald={vald.team} mot={mot?.team} valj={valj} />
    </div>
  );
}

/**
 * Lagprofilens axlar. Värdet är placeringen i serien omräknad till 0–100:
 * bäst är 100, sämst 0. Placeringen tar redan hänsyn till att färre
 * insläppta och färre utvisningar är bättre.
 */
const PROFIL: { key: string; kort: string }[] = [
  { key: 'gf_pg', kort: 'Mål' },
  { key: 'shot_share', kort: 'Skott-\nandel' },
  { key: 'sh_pct', kort: 'Skott-\nprocent' },
  { key: 'pp_pct', kort: 'Power-\nplay' },
  { key: 'pim_pg', kort: 'Disciplin' },
  { key: 'pk_pct', kort: 'Box-\nplay' },
  { key: 'sv_pct', kort: 'Rädd-\nningar' },
  { key: 'ga_pg', kort: 'Insläppta' },
];

const profil = (liga: LeagueData, t: LeagueTeam) => PROFIL.map(a => {
  const r = t.ranks[a.key];
  const n = liga.teams.length;
  return r == null || n < 2 ? 50 : Math.round(((n - r) / (n - 1)) * 100);
});

function Oversikt({ liga, t, rad }: { liga: LeagueData; t: LeagueTeam; rad?: Tabellrad }) {
  const vi = liga.teams.find(x => x.is_ours);
  return (
    <section className="mc-card">
      <p className="mc-kicker">{t.team}</p>
      <div className="sr-huvud">
        {rad && <span className="sr-plats">{ordinal(rad.rank)}</span>}
        <span className="sr-poang">
          {rad ? <><b>{rad.points} p</b> på {rad.games_played} matcher · målskillnad {rad.goal_diff > 0 ? '+' : ''}{rad.goal_diff}</> : `${t.gp} matcher`}
        </span>
      </div>
      {t.form.length > 0 && (
        <div className="sr-form" aria-label="De fem senaste matcherna">
          {t.form.map((m, i) => {
            const vann = m.gf > m.ga;
            return (
              <span key={i} className={`sr-fm ${vann ? 'sr-fm-v' : 'sr-fm-f'}${m.ot ? ' sr-fm-ot' : ''}`}
                title={`${m.date.slice(0, 10)} ${m.is_home ? 'mot' : 'borta mot'} ${m.opponent} ${m.gf}–${m.ga}${m.ot ? ' efter full tid' : ''}`}>
                {m.gf}–{m.ga}
              </span>
            );
          })}
        </div>
      )}
      <LagRadar liga={liga} t={t} vi={vi && vi.team !== t.team ? vi : undefined} />
      <div className="sr-leg sr-leg-mitt">
        <span><i className="sr-leg-vald" />{kortLag(t.team)}</span>
        {vi && vi.team !== t.team && <span><i className="sr-leg-vi" />Björklöven</span>}
        <span><i className="sr-leg-snitt" />mitten av serien</span>
      </div>
    </section>
  );
}

/** Åtta axlar, bäst ytterst. Siffran under axeln är placeringen. */
function LagRadar({ liga, t, vi, jmfKlass = 'sr-radar-vi' }: { liga: LeagueData; t: LeagueTeam; vi?: LeagueTeam; jmfKlass?: string }) {
  const S = 320, C = S / 2, R = 104;
  const punkt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / PROFIL.length) * Math.PI * 2;
    return [C + Math.cos(a) * R * (v / 100), C + Math.sin(a) * R * (v / 100)];
  };
  const form = (vs: number[]) => vs.map((v, i) => punkt(i, Math.max(5, v)).map(n => n.toFixed(1)).join(',')).join(' ');
  const varden = profil(liga, t);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="pf-svg" role="img"
      aria-label={PROFIL.map((a, i) => `${a.kort.replace('\n', '')} ${ordinal(t.ranks[a.key] ?? 0)} (${varden[i]})`).join(', ')}>
      {[25, 75, 100].map(r => <circle key={r} cx={C} cy={C} r={(R * r) / 100} className="pf-ring" />)}
      <circle cx={C} cy={C} r={R / 2} className="pf-median" />
      {PROFIL.map((_, i) => { const [x, y] = punkt(i, 100); return <line key={i} x1={C} y1={C} x2={x} y2={y} className="pf-ring" />; })}
      {vi && <polygon points={form(profil(liga, vi))} className={jmfKlass} />}
      <polygon points={form(varden)} className="sr-radar-vald" />
      {varden.map((v, i) => { const [x, y] = punkt(i, Math.max(5, v)); return <circle key={i} cx={x} cy={y} r={3.2} className="sr-p-vald" />; })}
      {PROFIL.map((a, i) => {
        const [x, y] = punkt(i, 130);
        const rader = a.kort.split('\n');
        const r = t.ranks[a.key];
        return (
          <text key={a.key} x={x} y={y - (rader.length - 1) * 5.5 - 2} textAnchor="middle" className="pf-axel">
            {rader.map((rd, k) => <tspan key={k} x={x} dy={k ? 11 : 0}>{rd}</tspan>)}
            <tspan x={x} dy={12} className={`sr-radar-plats${r != null && r <= 3 ? ' sr-topp' : r != null && r >= liga.teams.length - 2 ? ' sr-botten' : ''}`}>
              {r == null ? '' : ordinal(r)}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

const TRENDMATT = [
  { key: 'shot_share', label: 'Skottandel', fmt: (v: number) => `${komma(v)} %`, axel: (v: number) => `${Math.round(v)} %`, mitt: 50 },
  { key: 'pdo', label: 'PDO', fmt: (v: number) => komma(v), axel: (v: number) => String(Math.round(v)), mitt: 100 },
  { key: 'gf_pg', label: 'Mål för', fmt: (v: number) => komma(v, 2), axel: (v: number) => komma(v), mitt: null },
  { key: 'ga_pg', label: 'Mål emot', fmt: (v: number) => komma(v, 2), axel: (v: number) => komma(v), mitt: null },
] as const;

function Utveckling({ trend, lag, jmf }: { trend: Trend; lag: string; jmf?: string }) {
  const [matt, setMatt] = useState<(typeof TRENDMATT)[number]['key']>('shot_share');
  const m = TRENDMATT.find(x => x.key === matt)!;
  const vald = trend.teams.find(t => t.team === lag);
  const vi = trend.teams.find(t => (jmf ? t.team === jmf : /bj[oö]rkl[oö]ven/i.test(t.team)));
  if (!vald || vald.points.length < 3) return null;
  const serie = (pts: Partial<Trendpunkt>[]) => pts.map(p => p[matt] as number | null | undefined).map(v => (v == null ? null : v));
  const a = serie(vald.points), b = vi && vi.team !== lag ? serie(vi.points) : [], s = serie(trend.league);
  const alla = [...a, ...b, ...s].filter((v): v is number => v != null);
  if (m.mitt != null) alla.push(m.mitt);
  const lo = Math.min(...alla), hi = Math.max(...alla);
  const pad = (hi - lo) * 0.12 || 1;
  const n = Math.max(a.length, b.length, s.length);
  const W = 340, H = 160, L = 36, R = 46, T = 10, B = 18;
  const x = (i: number) => L + (n < 2 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - T - B);
  const linje = (vs: (number | null)[]) => vs.map((v, i) => (v == null ? '' : `${i && vs[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(' ');
  const sista = a[a.length - 1];
  return (
    <section className="mc-card">
      <p className="mc-kicker">Utveckling · snitt över {trend.window} matcher</p>
      <div className="mc-seg mc-seg-liten" role="tablist" aria-label="Mått">
        {TRENDMATT.map(t => (
          <button key={t.key} role="tab" aria-selected={matt === t.key}
            className={`mc-segbtn${matt === t.key ? ' mc-on' : ''}`} onClick={() => setMatt(t.key)}>{t.label}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="ts-svg" role="img"
        aria-label={`${m.label} för ${lag} match för match${sista != null ? `, senast ${m.fmt(sista)}` : ''}`}>
        {m.mitt != null && <line x1={L} x2={W - R} y1={y(m.mitt)} y2={y(m.mitt)} className="mg-grid" />}
        <text x={L - 4} y={y(hi) + 3} textAnchor="end" className="mg-axel">{m.axel(hi)}</text>
        <text x={L - 4} y={y(lo) + 3} textAnchor="end" className="mg-axel">{m.axel(lo)}</text>
        <path d={linje(s)} className="sr-l-snitt" />
        {b.length > 0 && <path d={linje(b)} className={jmf ? 'sr-l-b' : 'sr-l-vi'} />}
        <path d={linje(a)} className="sr-l-vald" />
        {sista != null && <text x={x(a.length - 1) + 5} y={y(sista) + 3} className="sr-l-etikett">{m.fmt(sista)}</text>}
        <text x={L} y={H - 4} className="mg-axel">match 1</text>
        <text x={x(n - 1)} y={H - 4} textAnchor="end" className="mg-axel">{n}</text>
      </svg>
      <div className="sr-leg">
        <span><i className="sr-leg-vald" />{kortLag(lag)}</span>
        {b.length > 0 && <span><i className={jmf ? 'sr-leg-b' : 'sr-leg-vi'} />{jmf ? kortLag(jmf) : 'Björklöven'}</span>}
        <span><i className="sr-leg-snitt" />serien</span>
      </div>
    </section>
  );
}

function useLag(team: string): Lag | null | 'fel' {
  const [data, setData] = useState<{ team: string; v: Lag | 'fel' } | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/v1/lag?team=${encodeURIComponent(team)}`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => setData({ team, v: d?.status === 'ok' ? d : 'fel' }))
      .catch(() => { if (!ctrl.signal.aborted) setData({ team, v: 'fel' }); });
    return () => ctrl.abort();
  }, [team]);
  return data && data.team === team ? data.v : null;
}

function LagDetaljer({ team, snittRadd }: { team: string; snittRadd: number | null }) {
  const data = useLag(team);
  if (data === 'fel') return null;
  if (!data) return <section className="mc-card"><p className="mc-kicker">Matcher och spelare</p><p className="mc-text">Laddar …</p></section>;
  return (
    <>
      <Sasongen games={data.games} />
      <Matchbilden lag={[{ namn: data.team, games: data.games, klass: 'sr-ja' }]} />
      <Lagen lag={[{ namn: data.team, games: data.games, klass: 'sr-ja' }]} />
      {data.periods && data.periods.length > 0 && <NarMalen periods={data.periods} />}
      <HemmaBorta games={data.games} />
      <VemGorMalen players={data.players} />
      <Spelare players={data.players} />
      {data.goalies.length > 0 && <Malvakter goalies={data.goalies} snitt={snittRadd} />}
    </>
  );
}

/** Målskillnaden match för match: en stapel per match, vinst upp och förlust ned. */
function Sasongen({ games }: { games: LagMatch[] }) {
  const [lista, setLista] = useState(false);
  if (games.length === 0) return null;
  const W = 340, H = 150, L = 8, R = 34, T = 14, B = 22;
  const max = Math.max(3, ...games.map(g => Math.abs(g.goals_for - g.goals_against)));
  const steg = (W - L - R) / games.length;
  const mitt = T + (H - T - B) / 2;
  const y = (v: number) => mitt - (v / max) * ((H - T - B) / 2);
  const poang = games.reduce<number[]>((acc, g) => [...acc, (acc[acc.length - 1] ?? 0) + g.points], []);
  const pmax = Math.max(3, games.length * 3);
  const yp = (v: number) => T + (1 - v / pmax) * (H - T - B);
  const linje = poang.map((v, i) => `${i ? 'L' : 'M'}${(L + steg * (i + 0.5)).toFixed(1)},${yp(v).toFixed(1)}`).join(' ');
  return (
    <section className="mc-card">
      <p className="mc-kicker">Säsongen</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="ts-svg" role="img"
        aria-label={games.map(g => `${kortLag(g.opponent)} ${g.goals_for}–${g.goals_against}`).join(', ')}>
        <line x1={L} x2={W - R} y1={mitt} y2={mitt} className="mg-grid" />
        <path d={linje} className="sr-poanglinje" />
        {games.map((g, i) => {
          const d = g.goals_for - g.goals_against;
          const x = L + steg * i + steg * 0.18;
          return (
            <g key={g.game_id}>
              <title>{`${g.date} ${g.is_home ? '' : '@ '}${g.opponent} ${g.goals_for}–${g.goals_against}${g.beyond_regulation ? ' efter full tid' : ''}, ${g.points} p`}</title>
              <rect x={x} width={steg * 0.64} y={Math.min(y(d), mitt)} height={Math.max(1.5, Math.abs(y(d) - mitt))} rx={1.5}
                className={`${d > 0 ? 'sr-bar-v' : 'sr-bar-f'}${g.beyond_regulation ? ' sr-bar-ot' : ''}`} />
              <rect x={L + steg * i} width={steg} y={T} height={H - T - B} fill="transparent" />
            </g>
          );
        })}
        <text x={W - R + 4} y={yp(poang[poang.length - 1]) + 3} className="sr-l-etikett">{poang[poang.length - 1]} p</text>
        <text x={L} y={H - 6} className="mg-axel">match 1</text>
        <text x={L + steg * (games.length - 0.5)} y={H - 6} textAnchor="middle" className="mg-axel">{games.length}</text>
      </svg>
      <div className="sr-leg">
        <span><i className="sr-leg-ruta sr-bar-v" />vinst</span>
        <span><i className="sr-leg-ruta sr-bar-f" />förlust</span>
        <span><i className="sr-leg-poang" />poäng</span>
      </div>
      <button className="st-more" onClick={() => setLista(v => !v)}>{lista ? 'Dölj matcherna' : 'Visa matcherna'}</button>
      {lista && (
        <div className="sr-matcher">
          <div className="sr-match sr-mhuvud" aria-hidden="true"><span /><span /><span>Resultat</span><span>Skott</span><span /></div>
          {[...games].reverse().map(g => {
            const vann = g.goals_for > g.goals_against;
            return (
              <div key={g.game_id} className="sr-match">
                <span className="sr-mdatum">{Number(g.date.slice(8, 10))}/{Number(g.date.slice(5, 7))}</span>
                <span className="sr-mmot">{g.is_home ? '' : '@ '}{kortLag(g.opponent)}</span>
                <span className={`sr-mres ${vann ? 'sr-v' : 'sr-f'}`}>{g.goals_for}–{g.goals_against}{g.beyond_regulation ? <small> ÖT</small> : null}</span>
                <span className="sr-mskott">{g.shots_for != null && g.shots_against != null ? `${g.shots_for}–${g.shots_against}` : ''}</span>
                <span className="sr-mp">{g.points} p</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const KOLUMNER: { key: keyof LagSpelare | 'skottpct'; label: string; title: string }[] = [
  { key: 'games_played', label: 'GP', title: 'Matcher' },
  { key: 'goals', label: 'M', title: 'Mål' },
  { key: 'assists', label: 'A', title: 'Assist' },
  { key: 'points', label: 'P', title: 'Poäng' },
  { key: 'shots', label: 'Skott', title: 'Skott' },
  { key: 'skottpct', label: 'Sk%', title: 'Skottprocent' },
  { key: 'fo_pct', label: 'Tekn', title: 'Vunna tekningar, minst 20' },
  { key: 'plus_minus', label: '+/−', title: 'Plus/minus' },
];

function varde(p: LagSpelare, k: (typeof KOLUMNER)[number]['key']): number {
  if (k === 'skottpct') return p.shots ? p.goals / p.shots : -1;
  if (k === 'fo_pct') return p.faceoffs >= 20 && p.fo_pct != null ? p.fo_pct : -1;
  const v = p[k];
  return typeof v === 'number' ? v : -999;
}

function Spelare({ players }: { players: LagSpelare[] }) {
  const [tabell, setTabell] = useState(false);
  const topp = players.slice(0, 10);
  const max = Math.max(1, ...topp.map(p => p.points));
  return (
    <section className="mc-card">
      <p className="mc-kicker">Poängligan</p>
      <div className="sr-liga">
        {topp.map(p => (
          <div key={`${p.name}-${p.number}`} className="sr-lrad" title={`${fornamnEfternamn(p.name)}: ${p.goals} mål, ${p.assists} assist${p.shots != null ? `, ${p.shots} skott` : ''}`}>
            <span className="sr-lnamn">{fornamnEfternamn(p.name)}</span>
            <span className="sr-lbar">
              <i className="sr-lmal" style={{ width: `${(p.goals / max) * 100}%` }} />
              <i className="sr-lass" style={{ width: `${(p.assists / max) * 100}%` }} />
            </span>
            <span className="sr-lp"><b>{p.points}</b> <small>{p.goals}+{p.assists}</small></span>
          </div>
        ))}
      </div>
      <div className="sr-leg">
        <span><i className="sr-leg-ruta sr-lmal" />mål</span>
        <span><i className="sr-leg-ruta sr-lass" />assist</span>
      </div>
      <button className="st-more" onClick={() => setTabell(v => !v)}>{tabell ? 'Dölj tabellen' : `Alla ${players.length} spelare med skott och tekningar`}</button>
      {tabell && <SpelarTabell players={players} />}
    </section>
  );
}

function SpelarTabell({ players }: { players: LagSpelare[] }) {
  const [sort, setSort] = useState<(typeof KOLUMNER)[number]['key']>('points');
  const sorterade = [...players].sort((a, b) => varde(b, sort) - varde(a, sort) || b.points - a.points);
  return (
    <div className="mc-tablewrap sr-tabellplats">
      <table className="mc-table">
        <thead>
          <tr>
            <th className="st-fast st-fast-num">#</th>
            <th className="mc-left st-fast st-fast-namn">Spelare</th>
            {KOLUMNER.map(c => (
              <th key={c.key} aria-sort={sort === c.key ? 'descending' : 'none'}>
                <button type="button" className="st-sort" onClick={() => setSort(c.key)} title={c.title}>{c.label}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorterade.map(p => (
            <tr key={`${p.name}-${p.number}`}>
              <td className="st-fast st-fast-num">{p.number ?? '–'}</td>
              <td className="mc-left st-pname st-fast st-fast-namn" title={fornamnEfternamn(p.name)}>{fornamnEfternamn(p.name)}</td>
              <td>{p.games_played}</td>
              <td>{p.goals}</td>
              <td>{p.assists}</td>
              <td className="mc-pts">{p.points}</td>
              <td>{p.shots ?? '–'}</td>
              <td>{p.shots ? `${komma((p.goals / p.shots) * 100, 0)}` : '–'}</td>
              <td>{p.faceoffs >= 20 && p.fo_pct != null ? komma(p.fo_pct, 0) : '–'}</td>
              <td>{p.plus_minus == null ? '–' : p.plus_minus > 0 ? `+${p.plus_minus}` : p.plus_minus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Räddningsprocent som staplar från 85 %, med seriens snitt som streck. */
function Malvakter({ goalies, snitt }: { goalies: LagMalvakt[]; snitt: number | null }) {
  const LO = 85, HI = 96;
  const x = (v: number) => Math.max(0, Math.min(100, ((v - LO) / (HI - LO)) * 100));
  return (
    <section className="mc-card">
      <p className="mc-kicker">Målvakter</p>
      <div className="sr-liga">
        {goalies.map(g => (
          <div key={g.name} className="sr-lrad" title={`${fornamnEfternamn(g.name)}: ${g.games_played} matcher, ${g.shots_against ?? '–'} skott emot`}>
            <span className="sr-lnamn">{fornamnEfternamn(g.name)} <small>{g.games_played} m</small></span>
            <span className="sr-lbar sr-gbar">
              {g.save_pct != null && <i className={g.save_pct >= (snitt ?? 0) ? 'sr-gfyll' : 'sr-gfyll sr-gunder'} style={{ width: `${x(g.save_pct)}%` }} />}
              {snitt != null && <em className="sr-gsnitt" style={{ left: `${x(snitt)}%` }} />}
            </span>
            <span className="sr-lp"><b>{g.save_pct == null ? '–' : `${komma(g.save_pct)} %`}</b></span>
          </div>
        ))}
      </div>
      {snitt != null && <div className="sr-leg"><span><i className="sr-leg-snittlod" />serien {komma(snitt)} %</span></div>}
    </section>
  );
}

const JAMFOR: { key: string; label: string; d: number }[] = [
  { key: 'p', label: 'P', d: 0 },
  { key: 'ms', label: 'MS', d: 0 },
  { key: 'shot_share', label: 'Sk-andel', d: 1 },
  { key: 'pdo', label: 'PDO', d: 1 },
  { key: 'pp_pct', label: 'PP', d: 1 },
  { key: 'pk_pct', label: 'BP', d: 1 },
  { key: 'sv_pct', label: 'Rädd', d: 1 },
];

function AllaLag({ liga, tabell, vald, mot, valj }: { liga: LeagueData; tabell: Tabellrad[]; vald: string; mot?: string; valj: (t: LeagueTeam) => void }) {
  const [visaTabell, setVisaTabell] = useState(false);
  const lagen = liga.teams.filter(t => t.values.shot_share != null && t.values.pdo != null);
  const W = 340, H = 260, L = 30, R = 10, T = 12, B = 30;
  const xs = lagen.map(t => t.values.shot_share as number), ys = lagen.map(t => t.values.pdo as number);
  const dx = Math.max(3, ...xs.map(v => Math.abs(v - 50))) + 1.5;
  const dy = Math.max(2, ...ys.map(v => Math.abs(v - 100))) + 1;
  const x = (v: number) => L + ((v - (50 - dx)) / (2 * dx)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - (100 - dy)) / (2 * dy)) * (H - T - B);
  const vikt = (t: LeagueTeam) => (t.team === vald ? 3 : t.team === mot ? 2 : t.is_ours ? 1 : 0);
  const ordning = [...lagen].sort((a, b) => vikt(a) - vikt(b));
  // Etiketten till höger om pricken, annars vänster, annars ingen. Valt lag
  // och vårt placeras först så att deras alltid får plats.
  type Ruta = { x0: number; x1: number; y0: number; y1: number };
  const upptagna: Ruta[] = lagen.map(t => ({ x0: x(t.values.shot_share as number) - 5, x1: x(t.values.shot_share as number) + 5, y0: y(t.values.pdo as number) - 5, y1: y(t.values.pdo as number) + 5 }));
  const etikett = new Map<string, { ax: number; anchor: 'start' | 'end' }>();
  for (const t of [...ordning].reverse()) {
    const cx = x(t.values.shot_share as number), cy = y(t.values.pdo as number);
    const bredd = t.code.length * 6 + 2;
    for (const [ax, anchor] of [[cx + 8, 'start'], [cx - 8, 'end']] as const) {
      const x0 = anchor === 'start' ? ax : ax - bredd;
      const r = { x0, x1: x0 + bredd, y0: cy - 5, y1: cy + 5 };
      const krock = r.x0 < L || r.x1 > W - R || upptagna.some(o => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0 && !(Math.abs(o.x0 + 5 - cx) < 0.1 && Math.abs(o.y0 + 5 - cy) < 0.1));
      if (!krock) { upptagna.push(r); etikett.set(t.code, { ax, anchor }); break; }
    }
  }
  return (
    <section className="mc-card">
      <p className="mc-kicker">Alla lag · skott och tur</p>
      {lagen.length >= 4 && (
        <svg className="rl se-spridning" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Andel av skotten mot PDO, alla lag">
          <rect x={x(50)} y={T} width={W - R - x(50)} height={y(100) - T} className="sr-kvadrant" />
          <line className="rl-grid" x1={x(50)} x2={x(50)} y1={T} y2={H - B} />
          <line className="rl-grid" x1={L} x2={W - R} y1={y(100)} y2={y(100)} />
          <text className="rl-tick" x={x(50)} y={H - B + 12} textAnchor="middle">50 %</text>
          <text className="rl-tick" x={L - 4} y={y(100) + 3} textAnchor="end">100</text>
          <text className="rl-tick" x={W - R} y={H - 4} textAnchor="end">Andel av skotten →</text>
          <text className="rl-tick" x={L} y={T - 2} textAnchor="start">↑ PDO</text>
          {ordning.map(t => {
            const cx = x(t.values.shot_share as number), cy = y(t.values.pdo as number);
            const ar = t.team === vald, b = t.team === mot;
            return (
              <g key={t.code} className="sr-punkt" onClick={() => valj(t)}>
                <title>{`${t.team}: ${komma(t.values.shot_share as number)} % av skotten, PDO ${komma(t.values.pdo as number)}`}</title>
                <circle cx={cx} cy={cy} r={12} fill="transparent" />
                <circle cx={cx} cy={cy} r={ar || b ? 6.5 : t.is_ours ? 5 : 4} className={ar ? 'sr-p-vald' : b ? 'sr-p-b' : t.is_ours ? 'sr-p-vi' : 'sr-p'} />
                {etikett.has(t.code) && (
                  <text x={etikett.get(t.code)!.ax} y={cy + 3} textAnchor={etikett.get(t.code)!.anchor}
                    className={`sr-pkod${ar ? ' sr-pkod-vald' : b ? ' sr-pkod-b' : t.is_ours ? ' sr-pkod-vi' : ''}`}>{t.code}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <button className="st-more" onClick={() => setVisaTabell(v => !v)}>{visaTabell ? 'Dölj tabellen' : 'Alla lag i tabell'}</button>
      {visaTabell && <LagTabell liga={liga} tabell={tabell} vald={vald} valj={valj} />}
    </section>
  );
}

function LagTabell({ liga, tabell, vald, valj }: { liga: LeagueData; tabell: Tabellrad[]; vald: string; valj: (t: LeagueTeam) => void }) {
  const [sort, setSort] = useState('p');
  const rad = new Map(tabell.map(r => [r.team_name, r]));
  const v = (t: LeagueTeam, k: string): number | null => {
    if (k === 'p') return rad.get(t.team)?.points ?? null;
    if (k === 'ms') return rad.get(t.team)?.goal_diff ?? null;
    return t.values[k] ?? null;
  };
  const sorterade = [...liga.teams].sort((a, b) => (v(b, sort) ?? -999) - (v(a, sort) ?? -999));
  return (
    <div className="mc-tablewrap sr-tabellplats">
      <table className="mc-table">
        <thead>
          <tr>
            <th className="mc-left st-fast st-fast-namn sr-lagkol">Lag</th>
            {JAMFOR.map(c => (
              <th key={c.key} aria-sort={sort === c.key ? 'descending' : 'none'}>
                <button type="button" className="st-sort" onClick={() => setSort(c.key)}>{c.label}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorterade.map(t => (
            <tr key={t.code} className={`st-click${t.team === vald ? ' sr-rad-vald' : ''}${t.is_ours ? ' mc-hl' : ''}`} onClick={() => valj(t)}>
              <td className="mc-left st-fast st-fast-namn sr-lagkol">{kortLag(t.team)}</td>
              {JAMFOR.map(c => {
                const x = v(t, c.key);
                return <td key={c.key} className={c.key === sort ? 'mc-pts' : undefined}>
                  {x == null ? '–' : c.key === 'ms' && x > 0 ? `+${x}` : komma(x, c.d)}
                </td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Målen per period, för uppåt och emot nedåt. Powerplay mörkare i stapeln. */
function NarMalen({ periods }: { periods: Period[] }) {
  const namn = (p: number) => (p === 4 ? 'Förl.' : `${p}:a`);
  const max = Math.max(1, ...periods.flatMap(p => [p.gf, p.ga]));
  const H = 64;
  return (
    <section className="mc-card">
      <p className="mc-kicker">När målen kommer</p>
      <div className="sr-perioder">
        {periods.map(p => (
          <div key={p.period} className="sr-per" title={`${namn(p.period)} perioden: ${p.gf} gjorda (${p.gf_pp} i powerplay), ${p.ga} insläppta (${p.ga_pp} i boxplay)`}>
            <span className="sr-per-tal sr-v">{p.gf}</span>
            <div className="sr-per-upp" style={{ height: H }}>
              <i className="sr-bar-v" style={{ height: `${(p.gf / max) * 100}%` }}>
                <i className="sr-per-pp" style={{ height: `${p.gf ? (p.gf_pp / p.gf) * 100 : 0}%` }} />
              </i>
            </div>
            <div className="sr-per-ned" style={{ height: H }}>
              <i className="sr-bar-f" style={{ height: `${(p.ga / max) * 100}%` }}>
                <i className="sr-per-pp" style={{ height: `${p.ga ? (p.ga_pp / p.ga) * 100 : 0}%` }} />
              </i>
            </div>
            <span className="sr-per-tal sr-f">{p.ga}</span>
            <span className="sr-per-namn">{namn(p.period)}</span>
          </div>
        ))}
      </div>
      <div className="sr-leg">
        <span><i className="sr-leg-ruta sr-bar-v" />gjorda</span>
        <span><i className="sr-leg-ruta sr-bar-f" />insläppta</span>
        <span><i className="sr-leg-ruta sr-leg-pp" />i powerplay/boxplay</span>
      </div>
    </section>
  );
}

/** Poäng per match hemma och borta, med målskillnaden under. */
function HemmaBorta({ games }: { games: LagMatch[] }) {
  const del = (h: boolean) => {
    const g = games.filter(x => x.is_home === h);
    const p = g.reduce((a, x) => a + x.points, 0);
    const ms = g.reduce((a, x) => a + x.goals_for - x.goals_against, 0);
    return { n: g.length, ppm: g.length ? p / g.length : 0, ms };
  };
  const hemma = del(true), borta = del(false);
  if (!hemma.n || !borta.n) return null;
  return (
    <section className="mc-card">
      <p className="mc-kicker">Hemma och borta · poäng per match</p>
      <div className="sr-liga">
        {([['Hemma', hemma], ['Borta', borta]] as const).map(([namn, d]) => (
          <div key={namn} className="sr-lrad">
            <span className="sr-lnamn">{namn} <small>{d.n} m · {d.ms > 0 ? '+' : ''}{d.ms}</small></span>
            <span className="sr-lbar"><i className="sr-lmal" style={{ width: `${(d.ppm / 3) * 100}%` }} /></span>
            <span className="sr-lp"><b>{komma(d.ppm, 2)}</b></span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Två lag mot varandra. A guld, B blått. */
function Jamforelse({ liga, a, b, tabell, trend, historik }: { liga: LeagueData; a: LeagueTeam; b: LeagueTeam; tabell: Tabellrad[]; trend: Trend | null; historik: Historik | null }) {
  const da = useLag(a.team), db = useLag(b.team);
  const ra = tabell.find(x => x.team_name === a.team), rb = tabell.find(x => x.team_name === b.team);
  const A = da && da !== 'fel' ? da : null, B = db && db !== 'fel' ? db : null;
  return (
    <>
      <section className="mc-card">
        <div className="sr-jhuvud">
          {([[a, ra, 'sr-ja'], [b, rb, 'sr-jb']] as const).map(([t, r, k]) => (
            <div key={t.code} className={`sr-jlag ${k}`}>
              <span className="sr-jnamn">{kortLag(t.team)}</span>
              <span className="sr-jplats">{r ? ordinal(r.rank) : ''}</span>
              <span className="sr-jp">{r ? `${r.points} p · ${r.goal_diff > 0 ? '+' : ''}${r.goal_diff}` : ''}</span>
              <span className="sr-jform">
                {t.form.map((m, i) => <i key={i} className={m.gf > m.ga ? 'sr-bar-v' : 'sr-bar-f'} title={`${m.opponent} ${m.gf}–${m.ga}`} />)}
              </span>
            </div>
          ))}
        </div>
        <LagRadar liga={liga} t={a} vi={b} jmfKlass="sr-radar-b" />
        <div className="sr-leg sr-leg-mitt">
          <span><i className="sr-leg-vald" />{kortLag(a.team)}</span>
          <span><i className="sr-leg-b" />{kortLag(b.team)}</span>
        </div>
      </section>
      <Fjaril liga={liga} a={a} b={b} />
      {historik && <Tabellresan historik={historik} a={a.team} b={b.team} />}
      {trend && <Utveckling trend={trend} lag={a.team} jmf={b.team} />}
      {A && <Inbordes a={A} b={b.team} />}
      {A && B && <Matchbilden lag={[{ namn: A.team, games: A.games, klass: 'sr-ja' }, { namn: B.team, games: B.games, klass: 'sr-jb' }]} />}
      {A && B && <Lagen lag={[{ namn: A.team, games: A.games, klass: 'sr-ja' }, { namn: B.team, games: B.games, klass: 'sr-jb' }]} />}
      {A && B && A.periods && B.periods && <PerioderJmf a={A} b={B} />}
      {A && B && <SpelareJmf a={A} b={B} />}
    </>
  );
}

const FJARIL: { key: string; label: string; d: number; enhet: string }[] = [
  { key: 'gf_pg', label: 'Mål per match', d: 2, enhet: '' },
  { key: 'ga_pg', label: 'Insläppta per match', d: 2, enhet: '' },
  { key: 'shot_share', label: 'Andel av skotten', d: 1, enhet: ' %' },
  { key: 'sh_pct', label: 'Skottprocent', d: 1, enhet: ' %' },
  { key: 'sv_pct', label: 'Räddningsprocent', d: 1, enhet: ' %' },
  { key: 'pp_pct', label: 'Powerplay', d: 1, enhet: ' %' },
  { key: 'pk_pct', label: 'Boxplay', d: 1, enhet: ' %' },
  { key: 'fo_pct', label: 'Tekningar', d: 1, enhet: ' %' },
  { key: 'pim_pg', label: 'Utvisningsminuter', d: 1, enhet: '' },
];

/** Måtten sida vid sida. Stapelns längd är placeringen; det bättre laget i fetstil. */
function Fjaril({ liga, a, b }: { liga: LeagueData; a: LeagueTeam; b: LeagueTeam }) {
  const n = liga.teams.length;
  const len = (r: number | null | undefined) => (r == null ? 0 : 8 + ((n - r) / (n - 1)) * 92);
  return (
    <section className="mc-card">
      <p className="mc-kicker">Sida vid sida</p>
      <div className="sr-fjaril">
        {FJARIL.map(m => {
          const va = a.values[m.key], vb = b.values[m.key];
          const ra = a.ranks[m.key], rb = b.ranks[m.key];
          const aBattre = ra != null && rb != null && ra < rb, bBattre = ra != null && rb != null && rb < ra;
          const f = (v: number | null | undefined) => (v == null ? '–' : `${komma(v, m.d)}${m.enhet}`);
          return (
            <div key={m.key} className="sr-frad">
              <span className={`sr-fv${aBattre ? ' sr-fbattre' : ''}`}>{f(va)}</span>
              <span className="sr-fbar sr-fbar-a"><i style={{ width: `${len(ra)}%` }} /></span>
              <span className="sr-fnamn">{m.label}</span>
              <span className="sr-fbar sr-fbar-b"><i style={{ width: `${len(rb)}%` }} /></span>
              <span className={`sr-fv sr-fv-b${bBattre ? ' sr-fbattre' : ''}`}>{f(vb)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Lagens möten den här säsongen, ur A:s matcher. */
function Inbordes({ a, b }: { a: Lag; b: string }) {
  const moten = a.games.filter(g => g.opponent === b);
  return (
    <section className="mc-card">
      <p className="mc-kicker">Inbördes</p>
      {moten.length === 0 ? <p className="mc-text">Lagen har inte mötts än den här säsongen.</p> : (
        <div className="sr-moten">
          {moten.map(g => {
            const ah = g.is_home;
            return (
              <div key={g.game_id} className="sr-mote">
                <span className="sr-mdatum">{Number(g.date.slice(8, 10))}/{Number(g.date.slice(5, 7))}</span>
                <span className={`sr-mote-lag sr-mote-h ${ah ? 'sr-ja' : 'sr-jb'}`}>{kortLag(ah ? a.team : b)}</span>
                <b className="sr-mote-res">{ah ? g.goals_for : g.goals_against}–{ah ? g.goals_against : g.goals_for}{g.beyond_regulation ? <small> ÖT</small> : null}</b>
                <span className={`sr-mote-lag sr-mote-b ${ah ? 'sr-jb' : 'sr-ja'}`}>{kortLag(ah ? b : a.team)}</span>
                <span className="sr-mskott">{g.shots_for != null && g.shots_against != null ? `skott ${ah ? g.shots_for : g.shots_against}–${ah ? g.shots_against : g.shots_for}` : ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Mål per match och period för båda lagen: gjorda till vänster om mitten, insläppta till höger. */
function PerioderJmf({ a, b }: { a: Lag; b: Lag }) {
  const ga = a.games.length || 1, gb = b.games.length || 1;
  const per = [1, 2, 3].map(p => ({
    p,
    a: a.periods!.find(x => x.period === p), b: b.periods!.find(x => x.period === p),
  }));
  const max = Math.max(0.5, ...per.flatMap(x => [(x.a?.gf ?? 0) / ga, (x.a?.ga ?? 0) / ga, (x.b?.gf ?? 0) / gb, (x.b?.ga ?? 0) / gb]));
  const bar = (v: number, k: string) => <span className="sr-pbar"><i className={k} style={{ width: `${(v / max) * 100}%` }} /></span>;
  return (
    <section className="mc-card">
      <p className="mc-kicker">Per period · mål per match</p>
      <div className="sr-pjmf">
        <span /><span className="sr-pjh">gjorda</span><span className="sr-pjh">insläppta</span>
        {per.map(x => (
          <div key={x.p} className="sr-pjgrupp">
            <span className="sr-pjnamn">{x.p}:a</span>
            {([[x.a, ga, 'sr-ja-fyll', a.team], [x.b, gb, 'sr-jb-fyll', b.team]] as const).map(([d, g, k, t]) => (
              <div key={t} className="sr-pjrad" title={`${t}: ${komma((d?.gf ?? 0) / g, 2)} gjorda och ${komma((d?.ga ?? 0) / g, 2)} insläppta per match`}>
                {bar((d?.gf ?? 0) / g, k)}<em>{komma((d?.gf ?? 0) / g, 2)}</em>
                {bar((d?.ga ?? 0) / g, `${k} sr-pinsl`)}<em>{komma((d?.ga ?? 0) / g, 2)}</em>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/** De fem poängbästa i varje lag. */
function SpelareJmf({ a, b }: { a: Lag; b: Lag }) {
  const max = Math.max(1, ...a.players.slice(0, 5).map(p => p.points), ...b.players.slice(0, 5).map(p => p.points));
  return (
    <section className="mc-card">
      <p className="mc-kicker">Poängbästa</p>
      <div className="sr-sjmf">
        {([[a, 'sr-ja'], [b, 'sr-jb']] as const).map(([l, k]) => (
          <div key={l.team}>
            <p className={`sr-sjlag ${k}`}>{kortLag(l.team)}</p>
            {l.players.slice(0, 5).map(p => (
              <div key={p.name} className="sr-sjrad" title={`${fornamnEfternamn(p.name)}: ${p.goals}+${p.assists}`}>
                <span className="sr-sjnamn">{fornamnEfternamn(p.name).split(' ').slice(-1)[0]}</span>
                <span className="sr-lbar"><i className={`${k}-fyll`} style={{ width: `${(p.points / max) * 100}%` }} /></span>
                <b>{p.points}</b>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Tabellresan: placeringen efter varje omgång för alla lag. Valt lag guld,
 * jämförelselaget blått, Björklöven grönt, resten svagt.
 */
function Tabellresan({ historik, a, b }: { historik: Historik; a: string; b?: string }) {
  const n = historik.rounds.length;
  const lagen = historik.teams.length;
  if (n < 2) return null;
  const W = 340, H = 210, L = 22, R = 64, T = 10, B = 20;
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const y = (r: number) => T + ((r - 1) / Math.max(1, lagen - 1)) * (H - T - B);
  const vi = historik.teams.find(t => /bj[oö]rkl[oö]ven/i.test(t.team))?.team;
  const klass = (t: string) => (t === a ? 'sr-bump-a' : t === b ? 'sr-bump-b' : t === vi ? 'sr-bump-vi' : 'sr-bump');
  const vikt = (t: string) => (t === a ? 3 : t === b ? 2 : t === vi ? 1 : 0);
  const ordning = [...historik.teams].sort((p, q) => vikt(p.team) - vikt(q.team));
  const linje = (rs: (number | null)[]) => rs.map((r, i) => (r == null ? '' : `${i && rs[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(r).toFixed(1)}`)).join(' ');
  return (
    <section className="mc-card">
      <p className="mc-kicker">Tabellresan</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="ts-svg" role="img" aria-label={`Placering omgång för omgång för ${a}${b ? ` och ${b}` : ''}`}>
        {[1, Math.ceil(lagen / 2), lagen].map(r => (
          <text key={r} x={L - 6} y={y(r) + 3} textAnchor="end" className="mg-axel">{r}</text>
        ))}
        {ordning.map(t => {
          const sist = [...t.ranks].reverse().find(r => r != null);
          const v = vikt(t.team);
          return (
            <g key={t.team}>
              <path d={linje(t.ranks)} className={klass(t.team)}><title>{t.team}</title></path>
              {v > 0 && sist != null && (
                <>
                  <circle cx={x(t.ranks.length - 1)} cy={y(sist)} r={v >= 2 ? 3.6 : 2.8} className={`${klass(t.team)}-p`} />
                  <text x={x(n - 1) + 7} y={y(sist) + 3} className={`sr-bump-namn ${klass(t.team)}-t`}>{kortLag(t.team)}</text>
                </>
              )}
            </g>
          );
        })}
        <text x={L} y={H - 4} className="mg-axel">omgång 1</text>
        <text x={x(n - 1)} y={H - 4} textAnchor="end" className="mg-axel">{historik.rounds[n - 1]}</text>
      </svg>
    </section>
  );
}

type Serie = { namn: string; games: LagMatch[]; klass: string };

/**
 * Matchbilden: varje match som en prick, skott för åt höger och skott emot
 * nedåt. Uppe till höger styrde laget matchen. Fylld prick är vinst.
 */
function Matchbilden({ lag }: { lag: Serie[] }) {
  const alla = lag.flatMap(l => l.games.filter(g => g.shots_for != null && g.shots_against != null).map(g => ({ g, l })));
  if (alla.length < 3) return null;
  const v = alla.flatMap(({ g }) => [g.shots_for as number, g.shots_against as number]);
  const lo = Math.max(0, Math.min(...v) - 3), hi = Math.max(...v) + 3;
  const W = 340, H = 260, L = 30, R = 10, T = 12, B = 30;
  const x = (s: number) => L + ((s - lo) / (hi - lo)) * (W - L - R);
  const y = (s: number) => T + ((s - lo) / (hi - lo)) * (H - T - B);
  const ett = lag.length === 1;
  return (
    <section className="mc-card">
      <p className="mc-kicker">Matchbilden · skott per match</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="ts-svg" role="img" aria-label="Skott för och emot i varje match">
        <polygon points={`${x(lo)},${y(lo)} ${x(hi)},${y(lo)} ${x(hi)},${y(hi)}`} className="sr-kvadrant" />
        <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} className="rl-grid" />
        <text className="rl-tick" x={W - R} y={H - 4} textAnchor="end">Skott för →</text>
        <text className="rl-tick" x={L} y={H - 4} textAnchor="start">↓ skott emot</text>
        <text className="rl-tick" x={x(hi) - 4} y={y(lo) + 12} textAnchor="end">laget styrde</text>
        <text className="rl-tick" x={x(lo) + 4} y={y(hi) - 6} textAnchor="start">motståndaren styrde</text>
        {[Math.ceil(lo / 10) * 10, Math.floor(hi / 10) * 10].filter((t, i, arr) => arr.indexOf(t) === i).map(t => (
          <g key={t}>
            <text className="rl-tick" x={x(t)} y={H - B + 12} textAnchor="middle">{t}</text>
            <text className="rl-tick" x={L - 4} y={y(t) + 3} textAnchor="end">{t}</text>
          </g>
        ))}
        {alla.map(({ g, l }) => {
          const vann = g.goals_for > g.goals_against;
          const k = ett ? (vann ? 'sr-mb-v' : 'sr-mb-f') : `${l.klass}-mb${vann ? '' : ' sr-mb-tom'}`;
          return (
            <circle key={`${l.namn}-${g.game_id}`} cx={x(g.shots_for as number)} cy={y(g.shots_against as number)} r={4.5}
              className={`${k}${g.beyond_regulation ? ' sr-mb-ot' : ''}`}>
              <title>{`${kortLag(l.namn)} ${g.is_home ? 'mot' : 'borta mot'} ${kortLag(g.opponent)} ${g.goals_for}–${g.goals_against}, skott ${g.shots_for}–${g.shots_against}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="sr-leg">
        {ett ? (
          <>
            <span><i className="sr-leg-ruta sr-bar-v sr-leg-rund" />vinst</span>
            <span><i className="sr-leg-ruta sr-bar-f sr-leg-rund" />förlust</span>
          </>
        ) : (
          <>
            {lag.map(l => <span key={l.namn}><i className={`sr-leg-ruta sr-leg-rund ${l.klass}-fyll`} />{kortLag(l.namn)}</span>)}
            <span><i className="sr-leg-ruta sr-leg-rund sr-leg-ring" />ofylld är förlust</span>
          </>
        )}
      </div>
    </section>
  );
}

type Utfall = { v: number; vo: number; fo: number; f: number };
const utfall = (gs: LagMatch[]): Utfall => gs.reduce((u, g) => {
  const vann = g.goals_for > g.goals_against;
  if (vann) { if (g.beyond_regulation) u.vo++; else u.v++; } else if (g.beyond_regulation) u.fo++; else u.f++;
  return u;
}, { v: 0, vo: 0, fo: 0, f: 0 });

/**
 * Lägen: hur det slutar beroende på ställningen efter två perioder och på
 * vem som gör första målet. Varje rad en stapel med vinster till vänster
 * och förluster till höger.
 */
function Lagen({ lag }: { lag: Serie[] }) {
  const lagen = (gs: LagMatch[]) => {
    const efter2 = (g: LagMatch) => g.score_by_period && g.score_by_period.length >= 2 ? g.score_by_period[1] : null;
    return [
      { namn: 'Gör första målet', gs: gs.filter(g => g.first_goal === 'for') },
      { namn: 'Släpper in första', gs: gs.filter(g => g.first_goal === 'against') },
      { namn: 'Leder efter två', gs: gs.filter(g => { const s = efter2(g); return s && s[0] > s[1]; }) },
      { namn: 'Lika efter två', gs: gs.filter(g => { const s = efter2(g); return s && s[0] === s[1]; }) },
      { namn: 'Under efter två', gs: gs.filter(g => { const s = efter2(g); return s && s[0] < s[1]; }) },
    ];
  };
  const per = lag.map(l => ({ l, rader: lagen(l.games) }));
  if (!per[0].rader.some(r => r.gs.length)) return null;
  return (
    <section className="mc-card">
      <p className="mc-kicker">Lägen · hur matcherna slutar</p>
      <div className="sr-lagen">
        {per[0].rader.map((r, i) => (
          <div key={r.namn} className="sr-lgrupp">
            <span className="sr-lgnamn">{r.namn}</span>
            {per.map(({ l, rader }) => {
              const gs = rader[i].gs;
              const u = utfall(gs);
              const n = gs.length || 1;
              const vinst = u.v + u.vo;
              return (
                <div key={l.namn} className={`sr-lgrad${per.length > 1 ? ' sr-lgrad-jmf' : ''}`} title={`${kortLag(l.namn)}: ${u.v} vinster, ${u.vo} efter full tid, ${u.fo} förluster efter full tid, ${u.f} förluster`}>
                  {per.length > 1 && <i className={`sr-lgprick ${l.klass}-fyll`} />}
                  <span className="sr-lgbar">
                    <i className="sr-bar-v" style={{ width: `${(u.v / n) * 100}%` }} />
                    <i className="sr-bar-v sr-bar-ot" style={{ width: `${(u.vo / n) * 100}%` }} />
                    <i className="sr-bar-f sr-bar-ot" style={{ width: `${(u.fo / n) * 100}%` }} />
                    <i className="sr-bar-f" style={{ width: `${(u.f / n) * 100}%` }} />
                  </span>
                  <span className="sr-lgtal">{gs.length ? <><b>{vinst}</b> av {gs.length}</> : '–'}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sr-leg">
        <span><i className="sr-leg-ruta sr-bar-v" />vinst</span>
        <span><i className="sr-leg-ruta sr-bar-v sr-bar-ot" />efter full tid</span>
        <span><i className="sr-leg-ruta sr-bar-f" />förlust</span>
      </div>
    </section>
  );
}

/** Lagets mål fördelade på målskyttarna: hur beroende laget är av några få. */
function VemGorMalen({ players }: { players: LagSpelare[] }) {
  const skyttar = players.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals);
  const totalt = skyttar.reduce((a, p) => a + p.goals, 0);
  if (totalt < 5) return null;
  const visas = skyttar.slice(0, 6);
  const ovriga = totalt - visas.reduce((a, p) => a + p.goals, 0);
  const tre = skyttar.slice(0, 3).reduce((a, p) => a + p.goals, 0);
  const farg = ['var(--data-t1)', 'var(--data-t2)', 'var(--data-t3)', 'var(--data-t4)', '#8d6fd1', '#4fb3bf'];
  const efternamn = (n: string) => n.split(',')[0];
  return (
    <section className="mc-card">
      <p className="mc-kicker">Vem gör målen</p>
      <p className="sr-vgm-rubrik"><b>{Math.round((tre / totalt) * 100)} %</b> av lagets {totalt} mål kommer från tre spelare</p>
      <div className="sr-vgm">
        {visas.map((p, i) => (
          <span key={p.name} style={{ flex: p.goals, background: farg[i] }} title={`${fornamnEfternamn(p.name)}: ${p.goals} mål`}>
            {p.goals / totalt >= 0.09 ? p.goals : ''}
          </span>
        ))}
        {ovriga > 0 && <span className="sr-vgm-ovr" style={{ flex: ovriga }} title={`Övriga: ${ovriga} mål`}>{ovriga / totalt >= 0.09 ? ovriga : ''}</span>}
      </div>
      <div className="sr-leg">
        {visas.map((p, i) => <span key={p.name}><i className="sr-leg-ruta" style={{ background: farg[i] }} />{efternamn(p.name)}</span>)}
        {ovriga > 0 && <span><i className="sr-leg-ruta sr-vgm-ovr" />övriga</span>}
      </div>
    </section>
  );
}
