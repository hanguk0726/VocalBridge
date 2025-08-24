// store/languageStore.ts
import { create } from "zustand";

interface LanguageState {
  topLanguage: string;
  bottomLanguage: string;
  setLanguage: (section: "top" | "bottom", code: string) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  topLanguage: "en",
  bottomLanguage: "ko",
  setLanguage: (section, code) =>
    set((state) => ({
      topLanguage: section === "top" ? code : state.topLanguage,
      bottomLanguage: section === "bottom" ? code : state.bottomLanguage,
    })),
}));
