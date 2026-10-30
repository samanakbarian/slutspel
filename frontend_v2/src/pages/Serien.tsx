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
      <LagDetaljer key={vald.team} team={vald.team} />
      <AllaLag liga={liga} tabell={tabell} vald={vald.team} valj={valj} />
    </div>
  );
}

/** Måtten i översikten, i ordning. */
const OVERSIKT: { key: string; label: string; d: number; enhet: string }[] = [
  { key: 'gf_pg', label: 'Mål per match', d: 2, enhet: '' },
  { key: 'ga_pg', label: 'Insläppta per match', d: 2, enhet: '' },
  { key: 'shot_share', label: 'Andel av skotten', d: 1, enhet: ' %' },
  { key: 'sv_pct', label: 'Räddningsprocent', d: 1, enhet: ' %' },
  { key: 'pp_pct', label: 'Powerplay', d: 1, enhet: ' %' },
  { key: 'pk_pct', label: 'Boxplay', d: 1, enhet: ' %' },
];

function Oversikt({ liga, t, rad }: { liga: LeagueData; t: LeagueTeam; rad?: Tabellrad }) {
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
      <div className="sr-matt">
        {OVERSIKT.map(m => {
          const v = t.values[m.key];
          const r = t.ranks[m.key];
          return (
            <div key={m.key} className="sr-mrad">
              <span className="sr-mnamn">{m.label}</span>
              <b className="sr-mvarde">{v == null ? '–' : `${komma(v, m.d)}${m.enhet}`}</b>
              <span className={`sr-mplats${r != null && r <= 3 ? ' sr-topp' : r != null && r >= liga.teams.length - 2 ? ' sr-botten' : ''}`}>
                {r == null ? '' : (t.tied[m.key] ?? 1) > 1 ? `delad ${ordinal(r)}` : ordinal(r)}
              </span>
              <Prickar liga={liga} k={m.key} vald={t.team} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Alla lag på en linje, höger är bättre. Valt lag guld, Björklöven grönt. */
function Prickar({ liga, k, vald }: { liga: LeagueData; k: string; vald: string }) {
  const hogre = liga.higher_is_better[k] !== false;
  const lagen = liga.teams.filter(t => t.values[k] != null);
  if (lagen.length < 2) return <span />;
  const vals = lagen.map(t => t.values[k] as number);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const W = 120, P = 5;
  const x = (v: number) => P + (hi === lo ? 0.5 : (hogre ? (v - lo) : (hi - v)) / (hi - lo)) * (W - 2 * P);
  const ordning = [...lagen].sort((a, b) => Number(a.team === vald) - Number(b.team === vald) || Number(a.is_ours) - Number(b.is_ours));
  return (
    <svg className="sr-prickar" viewBox={`0 0 ${W} 14`} aria-hidden="true">
      <line x1={P} x2={W - P} y1={7} y2={7} className="se-spar" />
      {ordning.map(t => (
        <circle key={t.code} cx={x(t.values[k] as number)} cy={7}
          r={t.team === vald ? 4.5 : t.is_ours ? 3.4 : 2.6}
          className={t.team === vald ? 'sr-p-vald' : t.is_ours ? 'sr-p-vi' : 'sr-p'} />
      ))}
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

function LagDetaljer({ team }: { team: string }) {
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
      <Matcher games={data.games} />
      <Spelare players={data.players} />
      {data.goalies.length > 0 && <Malvakter goalies={data.goalies} />}
    </>
  );
}

function Matcher({ games }: { games: LagMatch[] }) {
  const [alla, setAlla] = useState(false);
  const lista = [...games].reverse();
  const visas = alla ? lista : lista.slice(0, 6);
  return (
    <section className="mc-card">
      <p className="mc-kicker">Matcher</p>
      <div className="sr-matcher">
        <div className="sr-match sr-mhuvud" aria-hidden="true"><span /><span /><span>Resultat</span><span>Skott</span><span /></div>
        {visas.map(g => {
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
      {lista.length > 6 && <button className="st-more" onClick={() => setAlla(v => !v)}>{alla ? 'Färre matcher' : `Alla ${lista.length} matcher`}</button>}
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
  const [sort, setSort] = useState<(typeof KOLUMNER)[number]['key']>('points');
  const [alla, setAlla] = useState(false);
  const sorterade = [...players].sort((a, b) => varde(b, sort) - varde(a, sort) || b.points - a.points);
  const visas = alla ? sorterade : sorterade.slice(0, 12);
  return (
    <section className="mc-card">
      <p className="mc-kicker">Spelare</p>
      <div className="mc-tablewrap">
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
            {visas.map(p => (
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
      {sorterade.length > 12 && <button className="st-more" onClick={() => setAlla(v => !v)}>{alla ? 'Färre spelare' : `Alla ${sorterade.length} spelare`}</button>}
    </section>
  );
}

function Malvakter({ goalies }: { goalies: LagMalvakt[] }) {
  return (
    <section className="mc-card">
      <p className="mc-kicker">Målvakter</p>
      <div className="mc-tablewrap">
        <table className="mc-table">
          <thead><tr><th className="mc-left">Målvakt</th><th>GP</th><th>Rädd%</th><th>Insl/match</th><th>Skott emot</th></tr></thead>
          <tbody>
            {goalies.map(g => (
              <tr key={g.name}>
                <td className="mc-left">{fornamnEfternamn(g.name)}</td>
                <td>{g.games_played}</td>
                <td className="mc-pts">{g.save_pct == null ? '–' : komma(g.save_pct)}</td>
                <td>{g.gaa == null ? '–' : komma(g.gaa, 2)}</td>
                <td>{g.shots_against ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const [sort, setSort] = useState('p');
  const rad = new Map(tabell.map(r => [r.team_name, r]));
  const v = (t: LeagueTeam, k: string): number | null => {
    if (k === 'p') return rad.get(t.team)?.points ?? null;
    if (k === 'ms') return rad.get(t.team)?.goal_diff ?? null;
    return t.values[k] ?? null;
  };
  const sorterade = [...liga.teams].sort((a, b) => (v(b, sort) ?? -999) - (v(a, sort) ?? -999));
  return (
    <section className="mc-card">
      <p className="mc-kicker">Alla lag</p>
      <div className="mc-tablewrap">
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
      <p className="mc-note">Tryck på ett lag för att visa det.</p>
    </section>
  );
}
