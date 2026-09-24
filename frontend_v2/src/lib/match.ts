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

/** Lagets utespelare, en rad per match. */
export type Skater = {
  name: string;
  number: number | null;
  line: number | null;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  /** Alla mål med spelaren på isen, oavsett spelform. */
  gf_on: number;
  ga_on: number;
  /** Bara de som ger plus/minus: lika styrka och underläge. */
  gf_on_ev: number;
  ga_on_ev: number;
  plus_minus: number;
  /** Swehockeys eget tal, när matchrapporten finns. */
  official_plus_minus: number | null;
  shots: number | null;
  faceoffs_won: number | null;
  faceoffs_lost: number | null;
  faceoff_pct: number | null;
  has_report: boolean;
  in_lineup: boolean;
};

/** En rad ur uppställningen: en femma, målvakterna eller extraspelarna. */
export type LineupBlock = {
  block: string;
  line: number | null;
  players: { number: number | null; name: string }[];
};

export type Placing = { rank: number; points: number; games_played: number };

/** Ett av matchens tal mot seriens alla matcher i år, se /api/v1/match. */
export type LeagueCompare = {
  key: 'shots_for' | 'shots_against' | 'save_pct' | 'pim' | 'goals_for' | 'spectators';
  label: string;
  value: number;
  n: number;
  below: number;
  above: number;
  max: boolean;
  min: boolean;
};

const MOT_SERIEN_ORD: Record<LeagueCompare['key'], { enhet: (v: number) => string; mer: string; mindre: string; mest: string; minst: string }> = {
  shots_for: { enhet: v => `${v} skott`, mer: 'fler', mindre: 'färre', mest: 'flest', minst: 'minst' },
  shots_against: { enhet: v => `${v} skott emot`, mer: 'fler', mindre: 'färre', mest: 'flest', minst: 'minst' },
  save_pct: { enhet: v => `${v.toFixed(1).replace('.', ',')} % räddningar`, mer: 'högre', mindre: 'lägre', mest: 'högst', minst: 'lägst' },
  pim: { enhet: v => `${v} utvisningsminuter`, mer: 'fler', mindre: 'färre', mest: 'flest', minst: 'minst' },
  goals_for: { enhet: v => `${v} mål`, mer: 'fler', mindre: 'färre', mest: 'flest', minst: 'minst' },
  spectators: { enhet: v => `${v.toLocaleString('sv-SE')} i publiken`, mer: 'fler', mindre: 'färre', mest: 'flest', minst: 'minst' },
};

/**
 * Matchens tal som sticker ut mot serien, som korta meningar.
 *
 * Bara det som ligger i seriens yttersta femtedel tas med. "Fler skott än i
 * sex av tio matcher" säger ingenting, och tre rader räcker.
 */
export function motSerien(rows: LeagueCompare[] | undefined, liga = 'SHL'): { key: string; varde: string; text: string }[] {
  const ut: { key: string; varde: string; text: string; vikt: number }[] = [];
  for (const r of rows ?? []) {
    const o = MOT_SERIEN_ORD[r.key];
    if (!o) continue;
    const varde = o.enhet(r.value);
    if (r.max) ut.push({ key: r.key, varde, text: `${o.mest} i en ${liga}-match i år`, vikt: 2 });
    else if (r.min) ut.push({ key: r.key, varde, text: `${o.minst} i en ${liga}-match i år`, vikt: 2 });
    else if (r.below >= 0.8) ut.push({ key: r.key, varde, text: `${o.mer} än i ${Math.round(r.below * 10)} av 10 matcher i år`, vikt: r.below });
    else if (r.above >= 0.8) ut.push({ key: r.key, varde, text: `${o.mindre} än i ${Math.round(r.above * 10)} av 10 matcher i år`, vikt: r.above });
  }
  return ut.sort((a, b) => b.vikt - a.vikt).slice(0, 3).map(({ key, varde, text }) => ({ key, varde, text }));
}

export type MatchContext = {
  /** Saknas i äldre API och tidigt på säsongen. */
  league_compare?: LeagueCompare[];
  before: Placing | null;
  after: Placing | null;
  opponent_before: Placing | null;
  form: { game_id: number; won: boolean; beyond_regulation: boolean; opponent: string }[];
  meetings: { game_id: number; date: string; is_home: boolean; goals_for: number; goals_against: number }[];
  venue_average: number | null;
  venue_games: number;
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
  skaters?: Skater[];
  lineup?: LineupBlock[];
  context?: MatchContext | null;
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

/**
 * Svenskt ordningstal: 1:a, 2:a, 3:e, 9:e, 11:e, 21:a.
 *
 * Bara tal som slutar på ett eller två tar ":a", och undantaget är elva och
 * tolv. Att hårdkoda ":a" gav "9:a" och "3:a", vilket ingen skriver.
 */
export function ordinal(n: number): string {
  const last = n % 10;
  const two = n % 100;
  const suffix = (last === 1 || last === 2) && two !== 11 && two !== 12 ? ':a' : ':e';
  return `${n}${suffix}`;
}

/** Ordningstalets ändelse ensam, när siffran sätts separat. */
export function ordinalSuffix(n: number): string {
  return ordinal(n).replace(String(n), '');
}

/** Namnet utan Swehockeys markörer, som uppslagsnyckel. */
function nameKey(n: string | null | undefined): string {
  return String(n || '').replace(/[*†‡]+/g, '').trim().replace(/,$/, '').toLowerCase();
}

/**
 * Spelarens position, slagen upp på namn i första hand.
 *
 * Truppen är nycklad på tröjnummer, men spelare byter nummer under säsongen:
 * Oliwer Sjöström bar 26 mot Almtuna och står som 5 i säsongstabellen. Slås
 * positionen upp på numret missar den honom helt, och en back visas som
 * forward. Namnet är det som håller.
 */
export function positionOf(
  squad: Record<string, { name: string; position: string | null }> | undefined,
  name: string,
  number: number | null,
): string {
  if (!squad) return '';
  const key = nameKey(name);
  for (const entry of Object.values(squad)) {
    if (nameKey(entry.name) === key) return String(entry.position || '');
  }
  return String(squad[String(number ?? '')]?.position || '');
}

/** Sant för backar: LD, RD och D. */
export function isDefence(position: string): boolean {
  return /D$/.test(position.toUpperCase().replace(/\d+$/, ''));
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
