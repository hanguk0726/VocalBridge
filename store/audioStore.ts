import { create } from "zustand";

interface AudioState {
  muted: boolean;
  setMuted: (value: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  muted: true,
  setMuted: (value: boolean) => set({ muted: value }),
}));
