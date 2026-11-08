import { useSettings } from "@/providers/SettingsProvider";
import { Brand } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/Spinner";

export function LoadingScreen({ compact = false }: { compact?: boolean }) {
  const { t } = useSettings();
  return (
    <div
      className={
        compact
          ? "flex min-h-[50vh] flex-col items-center justify-center gap-4"
          : "flex min-h-dvh flex-col items-center justify-center gap-4 px-6"
      }
      role="status"
      aria-live="polite"
    >
      <Brand />
      <Spinner className="h-6 w-6" />
      <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
    </div>
  );
}
