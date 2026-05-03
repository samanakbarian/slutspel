import { create } from 'zustand';
import type { LiveMatchData } from '../types/match';

const INITIAL_MOCK_DATA: LiveMatchData = {
    matchId: 'mock-1',
    status: 'LIVE',
    period: 2,
    clock: '14:23',
    homeTeam: {
        id: 'bif',
        name: 'IF Björklöven',
        abbreviation: 'IFB',
        color: '#16a34a', // brand-green for high contrast
        score: 3,
        shotsOnGoal: 24,
        faceoffWinPct: 56,
        powerplayPct: 33.3
    },
    awayTeam: {
        id: 'bryn',
        name: 'Brynäs IF',
        abbreviation: 'BIF',
        color: '#ef4444', // red
        score: 1,
        shotsOnGoal: 18,
        faceoffWinPct: 44,
        powerplayPct: 0
    },
    events: [
        { id: 'e1', type: 'PERIOD_START', period: 1, clock: '20:00', description: 'Period 1 startar' },
        { id: 'e2', type: 'GOAL', period: 1, clock: '12:45', teamId: 'bif', description: 'MÅL!', player: 'Lucas Wallmark', assist1: 'Oscar Tellström' },
        { id: 'e3', type: 'PENALTY', period: 1, clock: '05:22', teamId: 'bryn', description: 'Utvisning 2 min Tripping', player: 'Anton Rödin', penaltyMinutes: 2 },
        { id: 'e4', type: 'GOAL', period: 1, clock: '04:10', teamId: 'bif', description: 'MÅL! (PP1)', player: 'Axel Ottosson', assist1: 'Christian Djoos' },
        { id: 'e5', type: 'PERIOD_END', period: 1, clock: '00:00', description: 'Period 1 slut' },
        { id: 'e6', type: 'PERIOD_START', period: 2, clock: '20:00', description: 'Period 2 startar' },
        { id: 'e7', type: 'GOAL', period: 2, clock: '18:10', teamId: 'bryn', description: 'MÅL!', player: 'Jack Kopacka' },
        { id: 'e8', type: 'GOAL', period: 2, clock: '15:05', teamId: 'bif', description: 'MÅL!', player: 'Marcus Nilsson', assist1: 'Lucas Wallmark' },
    ]
};

interface MatchStore {
    data: LiveMatchData | null;
    isLoading: boolean;
    error: string | null;
    fetchLiveMatch: () => Promise<void>;
    simulateTick: () => void;
}

export const useMatchStore = create<MatchStore>((set, get) => ({
    data: INITIAL_MOCK_DATA,
    isLoading: false,
    error: null,
    fetchLiveMatch: async () => {
        set({ isLoading: true });
        setTimeout(() => {
            set({ data: INITIAL_MOCK_DATA, isLoading: false });
        }, 500);
    },
    simulateTick: () => {
        const { data } = get();
        if (!data || data.status !== 'LIVE') return;
        
        let [mins, secs] = data.clock.split(':').map(Number);
        if (mins === 0 && secs === 0) return;
        
        secs--;
        if (secs < 0) {
            secs = 59;
            mins--;
        }
        
        const newClock = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        set({ data: { ...data, clock: newClock } });
    }
}));
