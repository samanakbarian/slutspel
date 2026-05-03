export type PositionCategory = 'GOALIE' | 'DEFENSE' | 'FORWARD';

export interface RosterPlayer {
    id: string;
    number: number;
    firstName: string;
    lastName: string;
    position: string; // e.g. 'C', 'LW', 'LD'
    category: PositionCategory;
    age: number;
    height: number; // cm
    weight: number; // kg
    shoots: 'L' | 'R';
    
    // Standard Stats
    gamesPlayed: number;
    
    // Skater Stats
    goals?: number;
    assists?: number;
    points?: number;
    plusMinus?: number;
    pim?: number;
    
    // Goalie Stats
    savePercentage?: number;
    goalsAgainstAverage?: number;
    shutouts?: number;
}
