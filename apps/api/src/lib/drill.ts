/**
 * Shared text normalisation for drill validation and cache keys. It is
 * deliberately provider-agnostic so Anthropic, Gemini, the demo bank and the
 * web client all apply the same notion of "same question" and "same option".
 */
export function normalizeDrillText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function drillPromptKey(
  promptBefore: string,
  promptAfter: string,
): string {
  return normalizeDrillText(`${promptBefore} ${promptAfter}`);
}

export function normalizeDrillOption(value: string): string {
  return normalizeDrillText(value);
}

export function slugifyDrillPattern(value: string): string {
  const slug = normalizeDrillText(value).replace(/\s+/g, "-").slice(0, 80);
  return slug.replace(/^-+|-+$/g, "") || "general";
}
