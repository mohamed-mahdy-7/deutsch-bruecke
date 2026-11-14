import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { useSettings } from "@/providers/SettingsProvider";
import { Button } from "@/components/ui/Button";

/**
 * Registers the service worker and surfaces a non-intrusive update prompt.
 * vite-plugin-pwa's `autoUpdate` mode still waits for the learner's cue before
 * reloading, so an active exercise is never interrupted mid-answer.
 */
export function PwaManager() {
  const { t } = useSettings();
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateRef = useRef<(reloadPage?: boolean) => Promise<void>>(
    async () => {},
  );

  useEffect(() => {
    let updateCheck: ReturnType<typeof setInterval> | null = null;

    updateRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        const check = () => void registration.update();
        updateCheck = setInterval(check, 15 * 60 * 1000);
        const onVisible = () => {
          if (document.visibilityState === "visible") check();
        };
        const onOnline = () => check();
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("online", onOnline);
        // initial check on load
        check();
        return () => {
          document.removeEventListener("visibilitychange", onVisible);
          window.removeEventListener("online", onOnline);
        };
      },
      onRegisterError(error) {
        console.warn("[pwa] Service worker registration failed:", error);
      },
    });

    return () => {
      if (updateCheck) clearInterval(updateCheck);
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-primary/25 bg-card p-3 shadow-lift animate-fade-up sm:inset-x-auto sm:end-6 lg:bottom-6"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-sm font-bold">{t("pwa.updateReady")}</p>
      <Button
        size="sm"
        onClick={() => {
          void updateRef.current(true);
        }}
      >
        {t("pwa.update")}
      </Button>
    </div>
  );
}
