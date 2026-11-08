import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { translate, type TranslationKey } from "@/lib/i18n";
import type { Profile, ThemeMode, UiLanguage } from "@/types/domain";

const STORAGE_KEY = "deutsch-bruecke:preferences:v1";

interface StoredPreferences {
  uiLanguage: UiLanguage;
  theme: ThemeMode;
}

interface SettingsContextValue {
  language: UiLanguage;
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  isRtl: boolean;
  setLanguage: (language: UiLanguage) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  adoptProfilePreferences: (profile: Profile) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const DEFAULT_PREFERENCES: StoredPreferences = {
  uiLanguage: "ar",
  theme: "system",
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStoredPreferences(): StoredPreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    return {
      uiLanguage: parsed.uiLanguage === "en" ? "en" : "ar",
      theme:
        parsed.theme === "light" || parsed.theme === "dark"
          ? parsed.theme
          : "system",
    };
  } catch {
    return null;
  }
}

function prefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDocumentPreferences(
  language: UiLanguage,
  resolvedTheme: "light" | "dark",
): void {
  const root = document.documentElement;
  root.lang = language;
  root.dir = language === "ar" ? "rtl" : "ltr";
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;

  const themeMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (themeMeta) {
    themeMeta.content = resolvedTheme === "dark" ? "#101b1e" : "#1f6f6d";
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const storedAtMount = useRef<StoredPreferences | null>(
    readStoredPreferences(),
  );
  const [preferences, setPreferences] = useState<StoredPreferences>(
    () => storedAtMount.current ?? DEFAULT_PREFERENCES,
  );
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark);
  const adoptedProfileRef = useRef(false);

  const resolvedTheme: "light" | "dark" =
    preferences.theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : preferences.theme;

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyDocumentPreferences(preferences.uiLanguage, resolvedTheme);
  }, [preferences.uiLanguage, resolvedTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Storage can be blocked in private webviews; the session still works.
    }
  }, [preferences]);

  // Keep two tabs of the same app in sync without fighting the user.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as Partial<StoredPreferences>;
        setPreferences({
          uiLanguage: parsed.uiLanguage === "en" ? "en" : "ar",
          theme:
            parsed.theme === "light" || parsed.theme === "dark"
              ? parsed.theme
              : "system",
        });
      } catch {
        // Ignore malformed values from other tabs.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLanguage = useCallback((uiLanguage: UiLanguage) => {
    setPreferences((current) => ({ ...current, uiLanguage }));
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setPreferences((current) => ({ ...current, theme }));
  }, []);

  const toggleLanguage = useCallback(() => {
    setPreferences((current) => ({
      ...current,
      uiLanguage: current.uiLanguage === "ar" ? "en" : "ar",
    }));
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferences((current) => ({
      ...current,
      theme:
        current.theme === "system"
          ? "light"
          : current.theme === "light"
            ? "dark"
            : "system",
    }));
  }, []);

  /**
   * Adopt language/theme saved in the learner's profile when this device has no
   * interface preferences yet (for example after signing in on a new phone).
   */
  const adoptProfilePreferences = useCallback((profile: Profile) => {
    if (storedAtMount.current || adoptedProfileRef.current) return;
    adoptedProfileRef.current = true;
    setPreferences({
      uiLanguage: profile.uiLanguage,
      theme: profile.theme,
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(preferences.uiLanguage, key, params),
    [preferences.uiLanguage],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      language: preferences.uiLanguage,
      theme: preferences.theme,
      resolvedTheme,
      isRtl: preferences.uiLanguage === "ar",
      setLanguage,
      setTheme,
      toggleLanguage,
      toggleTheme,
      adoptProfilePreferences,
      t,
    }),
    [
      preferences.uiLanguage,
      preferences.theme,
      resolvedTheme,
      setLanguage,
      setTheme,
      toggleLanguage,
      toggleTheme,
      adoptProfilePreferences,
      t,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return value;
}
