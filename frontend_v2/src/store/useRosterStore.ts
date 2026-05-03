import { create } from 'zustand';
import type { RosterPlayer } from '../types/roster';

const MOCK_ROSTER: RosterPlayer[] = [
    { id: 'p1', number: 30, firstName: 'Joona', lastName: 'Voutilainen', position: 'GK', category: 'GOALIE', age: 27, height: 188, weight: 85, shoots: 'L', gamesPlayed: 45, savePercentage: 92.4, goalsAgainstAverage: 2.1, shutouts: 4 },
    { id: 'p2', number: 35, firstName: 'Melker', lastName: 'Thelin', position: 'GK', category: 'GOALIE', age: 19, height: 186, weight: 82, shoots: 'L', gamesPlayed: 15, savePercentage: 90.1, goalsAgainstAverage: 2.5, shutouts: 1 },
    
    { id: 'p3', number: 15, firstName: 'Mattias', lastName: 'Nørstebø', position: 'LD', category: 'DEFENSE', age: 29, height: 178, weight: 82, shoots: 'L', gamesPlayed: 52, goals: 6, assists: 24, points: 30, plusMinus: 12, pim: 18 },
    { id: 'p4', number: 58, firstName: 'Linus', lastName: 'Cronholm', position: 'RD', category: 'DEFENSE', age: 24, height: 188, weight: 88, shoots: 'L', gamesPlayed: 50, goals: 2, assists: 10, points: 12, plusMinus: 15, pim: 24 },
    { id: 'p5', number: 48, firstName: 'Kalle', lastName: 'Lopes', position: 'RD', category: 'DEFENSE', age: 22, height: 185, weight: 84, shoots: 'R', gamesPlayed: 48, goals: 4, assists: 14, points: 18, plusMinus: 5, pim: 16 },
    
    { id: 'p6', number: 18, firstName: 'Axel', lastName: 'Ottosson', position: 'C', category: 'FORWARD', age: 28, height: 181, weight: 83, shoots: 'L', gamesPlayed: 52, goals: 15, assists: 35, points: 50, plusMinus: 18, pim: 20 },
    { id: 'p7', number: 91, firstName: 'Oscar', lastName: 'Tellström', position: 'LW', category: 'FORWARD', age: 22, height: 183, weight: 85, shoots: 'L', gamesPlayed: 50, goals: 22, assists: 18, points: 40, plusMinus: 14, pim: 12 },
    { id: 'p8', number: 22, firstName: 'Lucas', lastName: 'Wallmark', position: 'C', category: 'FORWARD', age: 30, height: 183, weight: 83, shoots: 'L', gamesPlayed: 0, goals: 0, assists: 0, points: 0, plusMinus: 0, pim: 0 },
    { id: 'p9', number: 11, firstName: 'Maxime', lastName: 'Fortier', position: 'RW', category: 'FORWARD', age: 26, height: 178, weight: 83, shoots: 'R', gamesPlayed: 45, goals: 18, assists: 20, points: 38, plusMinus: 10, pim: 14 },
];

interface RosterStore {
    players: RosterPlayer[];
    isLoading: boolean;
    error: string | null;
    fetchRoster: () => Promise<void>;
}

export const useRosterStore = create<RosterStore>((set) => ({
    players: MOCK_ROSTER,
    isLoading: false,
    error: null,
    fetchRoster: async () => {
        set({ isLoading: true });
        setTimeout(() => {
            set({ players: MOCK_ROSTER, isLoading: false });
        }, 600);
    }
}));
