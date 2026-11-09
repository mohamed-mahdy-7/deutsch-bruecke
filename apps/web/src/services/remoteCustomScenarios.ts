import type { CustomScenario } from "@/types/domain";
import { supabase } from "@/services/supabaseClient";
import { parseCustomScenario } from "@/services/customScenarioStore";

interface CustomScenarioRow {
  id: string;
  data: unknown;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Supabase stores the full validated scenario in `data`; the separate
 * `updated_at` column makes conflict resolution and ordering cheap.
 */
export async function loadRemoteCustomScenarios(
  userId: string,
): Promise<CustomScenario[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("custom_scenarios")
    .select("id, data, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const scenarios: CustomScenario[] = [];
  for (const row of (data ?? []) as unknown as CustomScenarioRow[]) {
    const payload =
      row.data && typeof row.data === "object"
        ? (row.data as Record<string, unknown>)
        : {};
    const parsed = parseCustomScenario({
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
      ...payload,
      id: row.id,
    });
    if (parsed) scenarios.push(parsed);
  }
  return scenarios;
}

export async function saveRemoteCustomScenario(
  userId: string,
  scenario: CustomScenario,
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("custom_scenarios").upsert(
    {
      user_id: userId,
      id: scenario.id,
      data: scenario,
      created_at: scenario.createdAt,
      updated_at: scenario.updatedAt,
    },
    { onConflict: "user_id,id" },
  );

  if (error) throw error;
}

export async function deleteRemoteCustomScenario(
  userId: string,
  scenarioId: string,
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("custom_scenarios")
    .delete()
    .eq("user_id", userId)
    .eq("id", scenarioId);

  if (error) throw error;
}
