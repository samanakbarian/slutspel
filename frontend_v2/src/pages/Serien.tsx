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
};
type LagSpelare = {
  name: string; number: number | null; position: string | null; games_played: number;
  goals: number; assists: number; points: number; plus_minus: number | null; pim: number;
  shots: number | null; faceoffs: number; fo_pct: number | null; games_with_report: number;
};
type LagMalvakt = { name: string; games_played: number; save_pct: number | null; gaa: number | null; shots_against: number | null };
type Lag = { status: string; team: string; games: LagMatch[]; players: LagSpelare[]; goalies: LagMalvakt[] };

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
  const [params, setParams] = useSearchParams();
  const valjare = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/v1/standings`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => { if (Array.isArray(d?.standings)) setTabell(d.standings); })
      .catch(() => { /* väljaren faller tillbaka på bokstavsordning */ });
    fetch(`${API_URL}/api/v1/league-trend`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => { if (d?.status === 'ok') setTrend(d); })
      .catch(() => { /* utvecklingen syns inte */ });
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
  }, [kod, lag]);

  if (!liga) {
    return <div className="page"><section className="mc-card"><p className="mc-kicker">Serien</p><p className="mc-text">Laddar seriens lag …</p></section></div>;
  }
  const vald = lag.find(t => t.code === kod) ?? lag.find(t => !t.is_ours) ?? lag[0];
  const valj = (t: LeagueTeam) => {
    setParams({ lag: t.code }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page sr-sida">
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

      <Oversikt liga={liga} t={vald} rad={tabell.find(x => x.team_name === vald.team)} />
      {trend && <Utveckling trend={trend} lag={vald.team} />}
      <LagDetaljer key={vald.team} team={vald.team} snittRadd={liga.league.sv_pct ?? null} />
      <AllaLag liga={liga} tabell={tabell} vald={vald.team} valj={valj} />
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
  { key: 'ga_pg', kort: 'Få\ninsläppta' },
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
function LagRadar({ liga, t, vi }: { liga: LeagueData; t: LeagueTeam; vi?: LeagueTeam }) {
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
      {vi && <polygon points={form(profil(liga, vi))} className="sr-radar-vi" />}
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

function Utveckling({ trend, lag }: { trend: Trend; lag: string }) {
  const [matt, setMatt] = useState<(typeof TRENDMATT)[number]['key']>('shot_share');
  const m = TRENDMATT.find(x => x.key === matt)!;
  const vald = trend.teams.find(t => t.team === lag);
  const vi = trend.teams.find(t => /bj[oö]rkl[oö]ven/i.test(t.team));
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
        {b.length > 0 && <path d={linje(b)} className="sr-l-vi" />}
        <path d={linje(a)} className="sr-l-vald" />
        {sista != null && <text x={x(a.length - 1) + 5} y={y(sista) + 3} className="sr-l-etikett">{m.fmt(sista)}</text>}
        <text x={L} y={H - 4} className="mg-axel">match 1</text>
        <text x={x(n - 1)} y={H - 4} textAnchor="end" className="mg-axel">{n}</text>
      </svg>
      <div className="sr-leg">
        <span><i className="sr-leg-vald" />{kortLag(lag)}</span>
        {b.length > 0 && <span><i className="sr-leg-vi" />Björklöven</span>}
        <span><i className="sr-leg-snitt" />serien</span>
      </div>
    </section>
  );
}

function LagDetaljer({ team, snittRadd }: { team: string; snittRadd: number | null }) {
  const [data, setData] = useState<Lag | null | 'fel'>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/v1/lag?team=${encodeURIComponent(team)}`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => setData(d?.status === 'ok' ? d : 'fel'))
      .catch(() => { if (!ctrl.signal.aborted) setData('fel'); });
    return () => ctrl.abort();
  }, [team]);
  if (data === 'fel') return null;
  if (!data) return <section className="mc-card"><p className="mc-kicker">Matcher och spelare</p><p className="mc-text">Laddar …</p></section>;
  return (
    <>
      <Sasongen games={data.games} />
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

function AllaLag({ liga, tabell, vald, valj }: { liga: LeagueData; tabell: Tabellrad[]; vald: string; valj: (t: LeagueTeam) => void }) {
  const [visaTabell, setVisaTabell] = useState(false);
  const lagen = liga.teams.filter(t => t.values.shot_share != null && t.values.pdo != null);
  const W = 340, H = 260, L = 30, R = 10, T = 12, B = 30;
  const xs = lagen.map(t => t.values.shot_share as number), ys = lagen.map(t => t.values.pdo as number);
  const dx = Math.max(3, ...xs.map(v => Math.abs(v - 50))) + 1.5;
  const dy = Math.max(2, ...ys.map(v => Math.abs(v - 100))) + 1;
  const x = (v: number) => L + ((v - (50 - dx)) / (2 * dx)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - (100 - dy)) / (2 * dy)) * (H - T - B);
  const ordning = [...lagen].sort((a, b) => Number(a.team === vald) - Number(b.team === vald) || Number(a.is_ours) - Number(b.is_ours));
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
            const ar = t.team === vald;
            return (
              <g key={t.code} className="sr-punkt" onClick={() => valj(t)}>
                <title>{`${t.team}: ${komma(t.values.shot_share as number)} % av skotten, PDO ${komma(t.values.pdo as number)}`}</title>
                <circle cx={cx} cy={cy} r={12} fill="transparent" />
                <circle cx={cx} cy={cy} r={ar ? 6.5 : t.is_ours ? 5 : 4} className={ar ? 'sr-p-vald' : t.is_ours ? 'sr-p-vi' : 'sr-p'} />
                {etikett.has(t.code) && (
                  <text x={etikett.get(t.code)!.ax} y={cy + 3} textAnchor={etikett.get(t.code)!.anchor}
                    className={`sr-pkod${ar ? ' sr-pkod-vald' : t.is_ours ? ' sr-pkod-vi' : ''}`}>{t.code}</text>
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
