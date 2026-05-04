import { create } from 'zustand';
import type { LageSnapshot } from '../types/lage';

interface LageStore {
  data: LageSnapshot | null;
  isLoading: boolean;
  error: string | null;
  fetchLage: () => Promise<void>;
}

export const useLageStore = create<LageStore>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  fetchLage: async () => {
    set({ isLoading: true, error: null });
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/lovenlaget`);
      if (!response.ok) {
        throw new Error(`API svarade med status ${response.status}`);
      }
      const data: LageSnapshot = await response.json();
      set({ data, isLoading: false });
    } catch (error) {
      console.error('Kunde inte hämta Lövenläget:', error);
      set({
        error: 'Kunde inte hämta lägesbilden just nu.',
        isLoading: false,
      });
    }
  },
}));
