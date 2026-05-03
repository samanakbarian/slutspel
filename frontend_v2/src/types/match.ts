export type MatchStatus = 'NOT_STARTED' | 'LIVE' | 'INTERMISSION' | 'ENDED';
export type Period = 1 | 2 | 3 | 4 | 'SO'; // 4 = OT

export interface Team {
    id: string;
    name: string;
    abbreviation: string;
    color: string;
    logo_url?: string;
    score: number;
    shotsOnGoal: number;
    faceoffWinPct: number;
    powerplayPct: number;
}

export type EventType = 'GOAL' | 'PENALTY' | 'SHOT' | 'PERIOD_START' | 'PERIOD_END';

export interface MatchEvent {
    id: string;
    type: EventType;
    period: Period;
    clock: string;
    teamId?: string;
    description: string;
    player?: string;
    assist1?: string;
    assist2?: string;
    penaltyMinutes?: number;
}

export interface LiveMatchData {
    matchId: string;
    status: MatchStatus;
    period: Period;
    clock: string; // e.g. "14:23"
    homeTeam: Team;
    awayTeam: Team;
    events: MatchEvent[];
}
