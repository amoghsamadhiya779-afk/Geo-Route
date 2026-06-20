import { create } from 'zustand';

export type RealityMode = 'geo' | 'network' | 'demand' | 'prediction' | 'optimization' | 'ai';

interface TrentState {
  // Global Platform State
  activeCityId: string | null;
  setActiveCity: (id: string) => void;
  
  // Intelligence Reality Engine
  currentReality: RealityMode;
  setReality: (mode: RealityMode) => void;

  // Time Engine (0 to 1 scale)
  timeIndex: number;
  setTimeIndex: (val: number) => void;

  // Command Center
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useTrentStore = create<TrentState>((set) => ({
  activeCityId: null,
  setActiveCity: (id) => set({ activeCityId: id }),
  
  currentReality: 'geo',
  setReality: (mode) => set({ currentReality: mode }),

  timeIndex: 0.5, // 0.5 = Present
  setTimeIndex: (val) => set({ timeIndex: val }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
