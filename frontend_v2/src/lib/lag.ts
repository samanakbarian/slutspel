import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import type { LeagueData, LeagueTeam } from './serien';

/** Ett lag i serien ur /api/v1/lag, och det som delas mellan Serien, Inför matchen och matchrapporten. */
/**
 * Serien: vilket lag som helst, inte bara vårt.
 *
 * Lagväljaren överst i tabellordning. Under den laget i siffror mot de
 * andra, utvecklingen match för match, matcherna, spelarna och målvakterna,
 * och sist alla lag sida vid sida. Laget står i adressen (?lag=FBK) så att
 * en vy går att länka.
 */
export type Tabellrad = { team_name: string; rank: number; points: number; games_played: number; goal_diff: number };

export type LagMatch = {
  game_id: number; date: string; opponent: string; is_home: boolean;
  goals_for: number; goals_against: number; beyond_regulation: boolean; points: number;
  shots_for: number | null; shots_against: number | null;
  score_by_period?: [number, number][]; first_goal?: 'for' | 'against' | null;
};

export type Historik = { rounds: number[]; teams: { team: string; ranks: (number | null)[] }[] };

export type LagSpelare = {
  name: string; number: number | null; position: string | null; games_played: number;
  goals: number; assists: number; points: number; plus_minus: number | null; pim: number;
  shots: number | null; faceoffs: number; fo_pct: number | null; games_with_report: number;
};

export type LagMalvakt = { name: string; games_played: number; save_pct: number | null; gaa: number | null; shots_against: number | null };

export type Period = { period: number; gf: number; ga: number; gf_pp: number; ga_pp: number; gf_sh: number; ga_sh: number; gf_en: number; ga_en: number };

export type Lag = { status: string; team: string; games: LagMatch[]; players: LagSpelare[]; goalies: LagMalvakt[]; periods?: Period[] };

export const FORM = /^(if|ik|hc|bk|hk|hf|aik)$/i;

export const kortLag = (n: string) => {
  const d = n.replace('Djurgårdens', 'Djurgården').split(/\s+/).filter(x => !FORM.test(x));
  return (d.length > 1 && /lakers|redhawks/i.test(d[d.length - 1]) ? d.slice(0, -1) : d).join(' ');
};

export const fornamnEfternamn = (n: string) => {
  const [e, f] = n.split(',').map(s => s.trim());
  return f ? `${f} ${e}` : n;
};

export const jsonEllerNull = (r: Response) => (r.ok ? r.json() : null);

/**
 * Lagprofilens axlar. Värdet är placeringen i serien omräknad till 0–100:
 * bäst är 100, sämst 0. Placeringen tar redan hänsyn till att färre
 * insläppta och färre utvisningar är bättre.
 */
export const PROFIL: { key: string; kort: string }[] = [
  { key: 'gf_pg', kort: 'Mål' },
  { key: 'shot_share', kort: 'Skott-\nandel' },
  { key: 'sh_pct', kort: 'Skott-\nprocent' },
  { key: 'pp_pct', kort: 'Power-\nplay' },
  { key: 'pim_pg', kort: 'Disciplin' },
  { key: 'pk_pct', kort: 'Box-\nplay' },
  { key: 'sv_pct', kort: 'Rädd-\nningar' },
  { key: 'ga_pg', kort: 'Insläppta' },
];

export const profil = (liga: LeagueData, t: LeagueTeam) => PROFIL.map(a => {
  const r = t.ranks[a.key];
  const n = liga.teams.length;
  return r == null || n < 2 ? 50 : Math.round(((n - r) / (n - 1)) * 100);
});

export function useLag(team: string): Lag | null | 'fel' {
  const [data, setData] = useState<{ team: string; v: Lag | 'fel' } | null>(null);
  useEffect(() => {
    if (!team) return;
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/v1/lag?team=${encodeURIComponent(team)}`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => setData({ team, v: d?.status === 'ok' ? d : 'fel' }))
      .catch(() => { if (!ctrl.signal.aborted) setData({ team, v: 'fel' }); });
    return () => ctrl.abort();
  }, [team]);
  return data && data.team === team ? data.v : null;
}

export type Serie = { namn: string; games: LagMatch[]; klass: string };

export type Utfall = { v: number; vo: number; fo: number; f: number };

export const utfall = (gs: LagMatch[]): Utfall => gs.reduce((u, g) => {
  const vann = g.goals_for > g.goals_against;
  if (vann) { if (g.beyond_regulation) u.vo++; else u.v++; } else if (g.beyond_regulation) u.fo++; else u.f++;
  return u;
}, { v: 0, vo: 0, fo: 0, f: 0 });
