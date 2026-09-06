/**
 * Matchrapportens form och de hjälpare som läser den.
 *
 * Speglar `/api/v1/match/{game_id}`. Ligger utanför sidan därför att
 * delkortet läser samma svar: hade båda haft var sin uppsättning hjälpare
 * kunde kortet räknat fram ett annat facit än sidan det delas ifrån.
 */

export type Goal = {
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
  /** Tröjnummer på isen: för det görande laget respektive det släppande. */
  on_ice_for?: number[];
  on_ice_against?: number[];
};

export type Penalty = {
  time: string;
  minute: number;
  period: number | null;
  team_code: string | null;
  player: string | null;
  player_number: number | null;
  minutes: number;
  type: string | null;
};

/** Lagets summering ur matchprotokollet. Saknas tills matchen skördats. */
export type TeamSide = {
  team_name: string | null;
  is_home: boolean;
  shots: number | null;
  saves: number | null;
  pim: number | null;
  shots_by_period: string | null;
  saves_by_period: string | null;
  pp_pct: number | null;
  pp_time: string | null;
  shooting_pct: number | null;
  save_pct: number | null;
  pdo: number | null;
};

export type GoalieLine = {
  name: string;
  team: string | null;
  number: number | null;
  is_ours: boolean;
  shots_against: number | null;
  saves: number | null;
  goals_against: number | null;
  save_pct: number | null;
  time_on_ice: string | null;
};

export type MatchReport = {
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
  /** Lagets tröjnummer → namn, så on-ice-listorna går att läsa. */
  squad?: Record<string, { name: string; position: string | null }>;
  teams?: { ours: TeamSide; theirs: TeamSide } | null;
  goalies?: GoalieLine[];
};

export const BJK = /bj[oö]rkl[oö]ven/i;
const BJK_CODES = ['IFB', 'BJO', 'BJK'];

export function isOurs(teamCode: string | null): boolean {
  return BJK_CODES.includes((teamCode || '').toUpperCase());
}

/** Swehockeys namnform är "Efternamn, Förnamn" — vänd till läsbar ordning. */
export function humanName(n: string | null): string {
  if (!n) return '—';
  const m = n.split(',').map(s => s.trim());
  return m.length === 2 ? `${m[1]} ${m[0]}` : n;
}

/** Efternamnet räcker i en tät lista och sparar den bredd vi inte har. */
export function surname(n: string | null): string {
  const clean = String(n || '').replace(/[*†‡]+/g, '').trim();
  return clean.includes(',') ? clean.split(',')[0].trim() : clean.split(' ').slice(-1)[0];
}

/** "(0-0, 0-1, 1-0)" → [[0,0],[0,1],[1,0]] */
export function parsePeriods(pr: string | null | undefined): [number, number][] {
  if (!pr) return [];
  return pr
    .replace(/[()]/g, '')
    .split(',')
    .map(s => s.trim().match(/(\d+)\s*-\s*(\d+)/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map(m => [parseInt(m[1], 10), parseInt(m[2], 10)] as [number, number]);
}
