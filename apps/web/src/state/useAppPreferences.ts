import { useCallback } from "react";
import { useSettings } from "@/providers/SettingsProvider";
import { useProgress } from "@/state/ProgressProvider";
import type { ThemeMode, UiLanguage } from "@/types/domain";

/**
 * Interface preferences live in SettingsProvider for instant application, and
 * are mirrored into progress so an account can restore them on another device.
 */
export function useAppPreferences() {
  const settings = useSettings();
  const { progress, updateProfile } = useProgress();
  const hasProfile = Boolean(progress);

  const setLanguage = useCallback(
    (language: UiLanguage) => {
      settings.setLanguage(language);
      if (hasProfile) updateProfile({ uiLanguage: language });
    },
    [settings, hasProfile, updateProfile],
  );

  const setTheme = useCallback(
    (theme: ThemeMode) => {
      settings.setTheme(theme);
      if (hasProfile) updateProfile({ theme });
    },
    [settings, hasProfile, updateProfile],
  );

  const toggleLanguage = useCallback(() => {
    setLanguage(settings.language === "ar" ? "en" : "ar");
  }, [setLanguage, settings.language]);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode =
      settings.theme === "system"
        ? "light"
        : settings.theme === "light"
          ? "dark"
          : "system";
    setTheme(next);
  }, [setTheme, settings.theme]);

  return {
    language: settings.language,
    theme: settings.theme,
    resolvedTheme: settings.resolvedTheme,
    isRtl: settings.isRtl,
    t: settings.t,
    setLanguage,
    setTheme,
    toggleLanguage,
    toggleTheme,
  };
}
