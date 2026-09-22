import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { ordinal } from './match';

/**
 * Seriens lagstatistik ur /api/v1/league, och hur den skrivs ut.
 *
 * Källan är Swehockeys egen lagstatistik för alla fjorton lag. Placeringen
 * delas vid lika värde i stället för att skiljas på namn.
 */

export type LeagueTeam = {
  team: string;
  code: string;
  is_ours: boolean;
  gp: number;
  values: Record<string, number | null>;
  ranks: Record<string, number | null>;
  tied: Record<string, number>;
  counts: Record<string, number | null>;
  form: { date: string; gf: number; ga: number; is_home: boolean; ot: boolean; opponent: string }[];
};

export type LeagueData = {
  status: string;
  season: string;
  season_key: string;
  teams: LeagueTeam[];
  league: Record<string, number | null>;
  higher_is_better: Record<string, boolean>;
};

/**
 * Placeringar efter en omgång är brus: sex lag delade förstaplatsen i
 * powerplay efter premiären. Tre matcher är det minsta där en placering
 * börjar säga något om laget snarare än om en kväll.
 */
export const MINSTA_MATCHER = 3;

// Delas mellan statistiksidan och Inför matchen, så samma svar inte hämtas
// två gånger när man går mellan dem.
const cache = new Map<string, Promise<LeagueData | null>>();

function hamta(season: string): Promise<LeagueData | null> {
  const key = season || '__aktiv__';
  let p = cache.get(key);
  if (!p) {
    const q = season ? `?season=${encodeURIComponent(season)}` : '';
    p = fetch(`${API_URL}/api/v1/league${q}`)
      .then(r => (r.ok ? r.json() : null))
      .then((j: LeagueData | null) => (j && j.status === 'ok' && j.teams.length > 0 ? j : null))
      // Endpointen är ny. Ett äldre API svarar 404, och då faller korten bort.
      .catch(() => null);
    p.then(v => { if (!v) cache.delete(key); });
    cache.set(key, p);
  }
  return p;
}

export function useLeague(season: string): LeagueData | null {
  const [data, setData] = useState<{ key: string; value: LeagueData | null } | null>(null);
  useEffect(() => {
    let aktiv = true;
    hamta(season).then(v => { if (aktiv) setData({ key: season, value: v }); });
    return () => { aktiv = false; };
  }, [season]);
  return data && data.key === season ? data.value : null;
}

/** Måtten som visas, i ordning. `d` är antal decimaler, `enhet` efter talet. */
export const MATT: { key: string; label: string; d: number; enhet: string; fler?: boolean }[] = [
  { key: 'gf_pg', label: 'Mål per match', d: 2, enhet: '' },
  { key: 'ga_pg', label: 'Insläppta per match', d: 2, enhet: '' },
  { key: 'shot_share', label: 'Andel av skotten', d: 1, enhet: ' %' },
  { key: 'sv_pct', label: 'Räddningsprocent', d: 1, enhet: ' %' },
  { key: 'pp_pct', label: 'Powerplay', d: 1, enhet: ' %' },
  { key: 'pk_pct', label: 'Boxplay', d: 1, enhet: ' %' },
  { key: 'fo_pct', label: 'Tekningar', d: 1, enhet: ' %' },
  { key: 'pim_pg', label: 'Utvisningsminuter per match', d: 1, enhet: '' },
  { key: 'ev_share', label: 'Andel av målen i 5 mot 5', d: 1, enhet: ' %', fler: true },
  { key: 'sh_pct', label: 'Skjutprocent', d: 1, enhet: ' %', fler: true },
  { key: 'sf_pg', label: 'Skott per match', d: 1, enhet: '', fler: true },
  { key: 'sa_pg', label: 'Skott emot per match', d: 1, enhet: '', fler: true },
];

export function formatMatt(key: string, v: number | null | undefined): string {
  const m = MATT.find(x => x.key === key);
  if (v == null || !m) return '–';
  return `${komma(v, m.d)}${m.enhet}`;
}

export function placering(t: LeagueTeam, key: string): string {
  const r = t.ranks[key];
  if (r == null) return '';
  return (t.tied[key] ?? 1) > 1 ? `delad ${ordinal(r)}` : ordinal(r);
}

export const komma = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/** Om SpelOchTur har något att visa, så en växel inte erbjuder en tom flik. */
export function harSpelOchTur(data: LeagueData): boolean {
  const oss = data.teams.find(t => t.is_ours);
  const lag = data.teams.filter(t => t.values.shot_share != null && t.values.pdo != null);
  return !!oss && oss.gp >= MINSTA_MATCHER && lag.length >= 4;
}
