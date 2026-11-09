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
import type { CustomScenario, CustomScenarioDraft } from "@/types/domain";
import { useAuth } from "@/state/AuthProvider";
import { GUEST_OWNER_ID } from "@/state/progressFactory";
import { createId } from "@/lib/utils";
import {
  clearLocalCustomScenarios,
  mergeCustomScenarios,
  readLocalCustomScenarios,
  writeLocalCustomScenarios,
} from "@/services/customScenarioStore";
import {
  deleteRemoteCustomScenario,
  loadRemoteCustomScenarios,
  saveRemoteCustomScenario,
} from "@/services/remoteCustomScenarios";
import { customScenarioToDraft } from "@/services/customScenarioMapping";

export type CustomScenarioSyncStatus = "local" | "syncing" | "synced" | "error";

export interface CustomScenariosContextValue {
  scenarios: CustomScenario[];
  loading: boolean;
  syncStatus: CustomScenarioSyncStatus;
  getScenario: (id: string) => CustomScenario | undefined;
  saveScenario: (
    draft: CustomScenarioDraft,
    existingId?: string,
  ) => Promise<CustomScenario>;
  deleteScenario: (id: string) => Promise<void>;
  duplicateScenario: (id: string) => Promise<CustomScenario | null>;
}

const CustomScenariosContext =
  createContext<CustomScenariosContextValue | null>(null);

export function CustomScenariosProvider({ children }: { children: ReactNode }) {
  const { mode, user } = useAuth();
  const ownerId =
    mode === "authenticated" && user
      ? user.id
      : mode === "guest"
        ? GUEST_OWNER_ID
        : null;

  const [scenarios, setScenarios] = useState<CustomScenario[]>([]);
  const [loading, setLoading] = useState(mode === "loading");
  const [syncStatus, setSyncStatus] =
    useState<CustomScenarioSyncStatus>("local");
  const scenariosRef = useRef<CustomScenario[]>([]);
  const initializedKeyRef = useRef<string | null>(null);

  const applyState = useCallback((next: CustomScenario[]) => {
    scenariosRef.current = next;
    setScenarios(next);
  }, []);

  useEffect(() => {
    scenariosRef.current = scenarios;
  }, [scenarios]);

  // Hydrate the right namespace whenever auth mode or account changes. Guest
  // scenarios are promoted into the account on first sign-in.
  useEffect(() => {
    if (mode === "loading") return;

    const key = ownerId ? `${mode}:${ownerId}` : "none";
    if (initializedKeyRef.current === key) return;
    initializedKeyRef.current = key;

    if (!ownerId) {
      applyState([]);
      setLoading(false);
      setSyncStatus("local");
      return;
    }

    if (mode !== "authenticated" || !user) {
      applyState(mergeCustomScenarios(readLocalCustomScenarios(ownerId)));
      setLoading(false);
      setSyncStatus("local");
      return;
    }

    let cancelled = false;
    setLoading(true);

    const hydrate = async () => {
      const local = readLocalCustomScenarios(ownerId);
      const promoted = readLocalCustomScenarios(GUEST_OWNER_ID);

      let remote: CustomScenario[] = [];
      let remoteFailed = false;
      try {
        remote = await loadRemoteCustomScenarios(user.id);
      } catch (error) {
        remoteFailed = true;
        console.warn("[custom-scenarios] Remote load failed:", error);
      }
      if (cancelled) return;

      const merged = mergeCustomScenarios(local, promoted, remote);
      applyState(merged);
      writeLocalCustomScenarios(ownerId, merged);
      if (promoted.length > 0) clearLocalCustomScenarios(GUEST_OWNER_ID);
      setLoading(false);

      if (remoteFailed) {
        setSyncStatus("error");
        return;
      }

      setSyncStatus("syncing");
      try {
        await Promise.all(
          merged.map((scenario) =>
            saveRemoteCustomScenario(user.id, scenario),
          ),
        );
        if (!cancelled) setSyncStatus("synced");
      } catch (error) {
        console.warn("[custom-scenarios] Remote save failed:", error);
        if (!cancelled) setSyncStatus("error");
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [mode, user, ownerId, applyState]);

  const persistLocal = useCallback(
    (next: CustomScenario[]) => {
      applyState(next);
      if (ownerId) writeLocalCustomScenarios(ownerId, next);
    },
    [applyState, ownerId],
  );

  const syncRemote = useCallback(
    async (operation: () => Promise<void>) => {
      if (mode !== "authenticated" || !user) return;
      setSyncStatus("syncing");
      try {
        await operation();
        setSyncStatus("synced");
      } catch (error) {
        console.warn("[custom-scenarios] Remote sync failed:", error);
        setSyncStatus("error");
      }
    },
    [mode, user],
  );

  const saveScenario = useCallback(
    async (
      draft: CustomScenarioDraft,
      existingId?: string,
    ): Promise<CustomScenario> => {
      const now = new Date().toISOString();
      const existing = existingId
        ? scenariosRef.current.find((item) => item.id === existingId)
        : undefined;
      const scenario: CustomScenario = {
        ...draft,
        id: existing?.id ?? (createId("custom") as CustomScenario["id"]),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      persistLocal(mergeCustomScenarios(scenariosRef.current, [scenario]));
      if (mode === "authenticated" && user) {
        void syncRemote(() => saveRemoteCustomScenario(user.id, scenario));
      }
      return scenario;
    },
    [mode, user, persistLocal, syncRemote],
  );

  const deleteScenario = useCallback(
    async (id: string) => {
      persistLocal(scenariosRef.current.filter((item) => item.id !== id));
      if (mode === "authenticated" && user) {
        void syncRemote(() => deleteRemoteCustomScenario(user.id, id));
      }
    },
    [mode, user, persistLocal, syncRemote],
  );

  const duplicateScenario = useCallback(
    async (id: string): Promise<CustomScenario | null> => {
      const original = scenariosRef.current.find((item) => item.id === id);
      if (!original) return null;
      return saveScenario(customScenarioToDraft(original));
    },
    [saveScenario],
  );

  const getScenario = useCallback(
    (id: string) => scenarios.find((item) => item.id === id),
    [scenarios],
  );

  const value = useMemo<CustomScenariosContextValue>(
    () => ({
      scenarios,
      loading,
      syncStatus,
      getScenario,
      saveScenario,
      deleteScenario,
      duplicateScenario,
    }),
    [
      scenarios,
      loading,
      syncStatus,
      getScenario,
      saveScenario,
      deleteScenario,
      duplicateScenario,
    ],
  );

  return (
    <CustomScenariosContext.Provider value={value}>
      {children}
    </CustomScenariosContext.Provider>
  );
}

export function useCustomScenarios(): CustomScenariosContextValue {
  const value = useContext(CustomScenariosContext);
  if (!value) {
    throw new Error(
      "useCustomScenarios must be used inside CustomScenariosProvider",
    );
  }
  return value;
}
