const inflight = new Map<string, Promise<unknown>>();

/**
 * Coalesce identical in-flight AI requests so a double-click or two tabs
 * belonging to the same learner cannot trigger two provider calls.
 *
 * Keys MUST include the authenticated user id; otherwise one learner could
 * receive another learner's answer while two requests overlap.
 */
export function dedupeInFlight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const task = run().finally(() => {
    if (inflight.get(key) === task) inflight.delete(key);
  });
  inflight.set(key, task as Promise<unknown>);
  return task;
}

/** Stable, bounded key hash so large chat histories do not grow the map. */
export function hashKey(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

export function clearInFlight(): void {
  inflight.clear();
}
