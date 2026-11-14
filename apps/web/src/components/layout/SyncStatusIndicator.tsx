import { RefreshCw } from "lucide-react";
import { useProgress } from "@/state/ProgressProvider";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAppPreferences } from "@/state/useAppPreferences";
import { Button } from "@/components/ui/Button";

export function SyncStatusIndicator() {
  const { t } = useAppPreferences();
  const { syncStatus, retrySync } = useProgress();
  const online = useOnlineStatus();

  const effective = !online ? "offline" : syncStatus;
  const label =
    effective === "synced"
      ? t("sync.synced")
      : effective === "syncing"
        ? t("sync.syncing")
        : effective === "offline"
          ? t("sync.offline")
          : t("sync.error");

  const tone =
    effective === "synced"
      ? "text-success"
      : effective === "error"
        ? "text-danger"
        : "text-muted-foreground";

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[0.65rem] font-bold ${tone}`}>{label}</span>
      {effective === "error" ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void retrySync()}
          aria-label={t("sync.retry")}
          className="h-7 w-7"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}