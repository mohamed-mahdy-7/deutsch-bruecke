/**
 * Remove a surrounding Markdown code fence, including an optional language
 * tag. Weaker models often wrap otherwise-valid JSON in ```json ... ```.
 */
export function stripMarkdownFences(raw: string): string {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  const fenced = /```(?:json|javascript|js)?\s*([\s\S]*?)(?:```|$)/i.exec(trimmed);
  const body = fenced?.[1]?.trim();
  return body || trimmed;
}

/**
 * Extract the first complete JSON object from a model response.
 * Handles leading prose and markdown fences, while correctly skipping braces
 * that appear inside JSON strings.
 */
export function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function parseJsonObject(raw: string): unknown {
  const extracted = extractJsonObject(stripMarkdownFences(raw));
  if (!extracted) {
    throw new Error("No complete JSON object found in model response.");
  }
  return JSON.parse(extracted) as unknown;
}
