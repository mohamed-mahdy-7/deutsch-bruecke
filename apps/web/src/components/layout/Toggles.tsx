import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppPreferences } from "@/state/useAppPreferences";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, toggleLanguage, t } = useAppPreferences();
  // Include the visible glyph in the accessible name so screen readers hear
  // the same label sighted users see (axe: label-content-name-mismatch).
  const visible = language === "ar" ? "EN" : "ع";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      aria-label={`${visible} — ${t("aria.languageToggle")}`}
      title={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className={className}
    >
      {language === "ar" ? (
        <span className="text-[0.7rem] font-extrabold tracking-wide">EN</span>
      ) : (
        <span className="text-sm font-extrabold">ع</span>
      )}
    </Button>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, t } = useAppPreferences();
  const Icon = theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;
  const label =
    theme === "system"
      ? t("theme.system")
      : theme === "dark"
        ? t("theme.dark")
        : t("theme.light");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`${t("aria.themeToggle")} · ${label}`}
      title={`${t("theme.toggle")} · ${label}`}
      className={className}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
