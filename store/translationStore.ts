import { create } from "zustand";

export enum TranslationUiState {
  IDLE = "IDLE",
  SPEAKING = "SPEAKING",
  RESPONDING = "RESPONDING",
}

export enum TranslationUiSection {
  TOP = "top",
  BOTTOM = "bottom",
}

export interface TranslationState {
  uiState: TranslationUiState;
  topText: string;
  bottomText: string;
  inputSection: TranslationUiSection;
  setTopText: (text: string) => void;
  setBottomText: (text: string) => void;
  setInputSection: (section: TranslationUiSection) => void;
  setUiState: (state: TranslationUiState) => void;
}

export const useTranslationStore = create<TranslationState>((set) => ({
  uiState: TranslationUiState.IDLE,
  topText: "",
  bottomText: "",
  inputSection: TranslationUiSection.TOP,
  setTopText: (text: string) => set({ topText: text }),
  setBottomText: (text: string) => set({ bottomText: text }),
  setInputSection: (section: TranslationUiSection) =>
    set({ inputSection: section }),
  setUiState: (state: TranslationUiState) => set({ uiState: state }),
}));
