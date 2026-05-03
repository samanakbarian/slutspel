import { create } from 'zustand';
import type { SillySeasonData, NewsTag } from '../types/silly';

interface SillyStore {
    data: SillySeasonData | null;
    isLoading: boolean;
    error: string | null;
    newsFilter: NewsTag | 'ALL_SILLY';
    setNewsFilter: (filter: NewsTag | 'ALL_SILLY') => void;
    fetchData: () => Promise<void>;
}

export const useSillyStore = create<SillyStore>((set) => ({
    data: null,
    isLoading: false,
    error: null,
    newsFilter: 'ALL_SILLY',
    setNewsFilter: (filter) => set({ newsFilter: filter }),
    fetchData: async () => {
        set({ isLoading: true, error: null });
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/silly-season`);
            
            if (!response.ok) {
                throw new Error(`API svarade med status ${response.status}`);
            }
            
            const data: SillySeasonData = await response.json();
            set({ data, isLoading: false });
        } catch (error: any) {
            console.error('Kunde inte hämta Silly Season data:', error);
            set({ 
                error: 'Kunde inte hämta senaste datan. Vänligen försök igen senare.', 
                isLoading: false 
            });
        }
    }
}));
