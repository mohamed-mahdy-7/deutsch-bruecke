import type { CefrLevel, WordDetails } from "@/types/domain";
import { lookupLocalWord } from "@/services/dictionary";
import { requestWord } from "@/services/ai";

const remoteCache = new Map<string, WordDetails>();

export type WordLookupSource = "local" | "ai";

export interface WordLookupResult {
  details: WordDetails;
  source: WordLookupSource;
}

/**
 * Looks in the curated 100-card dictionary first so vocabulary taps work
 * offline and instantly. Only unknown or inflected forms hit the AI dictionary.
 */
export async function lookupWord(
  rawWord: string,
  context: string,
  level: CefrLevel,
): Promise<WordLookupResult> {
  const local = lookupLocalWord(rawWord);
  if (local) return { details: local, source: "local" };

  const cacheKey = `${rawWord.toLowerCase()}::${context.slice(0, 80)}`;
  const cached = remoteCache.get(cacheKey);
  if (cached) return { details: cached, source: "ai" };

  const { data } = await requestWord({ word: rawWord, context, level });
  remoteCache.set(cacheKey, data);
  return { details: data, source: "ai" };
}
