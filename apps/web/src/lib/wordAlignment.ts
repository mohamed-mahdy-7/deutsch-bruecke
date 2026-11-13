import type { DictationWordDiff } from "@/types/domain";

/**
 * German dictation and pronunciation both need the same token alignment. The
 * comparison is deliberately forgiving about case, punctuation, and the way
 * umlauts are typed (ä = ae), but strict about the actual letters and word
 * order. That is the difference between a helpful spelling coach and a
 * frustrating string comparison.
 */
export function normalizeGermanWord(word: string): string {
  return word
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[^a-z0-9]/g, "");
}

export function splitGermanWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => normalizeGermanWord(word).length > 0);
}

export interface WordAlignment {
  diff: DictationWordDiff[];
  correctWords: number;
  totalWords: number;
  accuracy: number;
}

/**
 * Wagner–Fischer alignment. Substitutions are reported as "wrong" with both
 * the expected and the heard word, so the UI can show exactly what changed
 * instead of a vague red sentence.
 */
export function alignGermanWords(
  expectedText: string,
  actualText: string,
): WordAlignment {
  const expected = splitGermanWords(expectedText);
  const actual = splitGermanWords(actualText);
  const expectedNorm = expected.map(normalizeGermanWord);
  const actualNorm = actual.map(normalizeGermanWord);
  const rows = expected.length;
  const columns = actual.length;

  const cost: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(columns + 1).fill(0),
  );
  for (let row = 0; row <= rows; row += 1) cost[row]![0] = row;
  for (let column = 0; column <= columns; column += 1) {
    cost[0]![column] = column;
  }

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      const substitution =
        expectedNorm[row - 1] === actualNorm[column - 1] ? 0 : 1;
      cost[row]![column] = Math.min(
        cost[row - 1]![column]! + 1,
        cost[row]![column - 1]! + 1,
        cost[row - 1]![column - 1]! + substitution,
      );
    }
  }

  const diff: DictationWordDiff[] = [];
  let row = rows;
  let column = columns;

  while (row > 0 || column > 0) {
    const current = cost[row]![column]!;
    if (
      row > 0 &&
      column > 0 &&
      expectedNorm[row - 1] === actualNorm[column - 1]
    ) {
      diff.push({
        expected: expected[row - 1] ?? null,
        actual: actual[column - 1] ?? null,
        status: "correct",
      });
      row -= 1;
      column -= 1;
      continue;
    }

    if (row > 0 && column > 0 && current === cost[row - 1]![column - 1]! + 1) {
      diff.push({
        expected: expected[row - 1] ?? null,
        actual: actual[column - 1] ?? null,
        status: "wrong",
      });
      row -= 1;
      column -= 1;
      continue;
    }

    if (row > 0 && current === cost[row - 1]![column]! + 1) {
      diff.push({
        expected: expected[row - 1] ?? null,
        actual: null,
        status: "missing",
      });
      row -= 1;
      continue;
    }

    diff.push({
      expected: null,
      actual: actual[column - 1] ?? null,
      status: "extra",
    });
    column -= 1;
  }

  diff.reverse();
  const correctWords = diff.filter((word) => word.status === "correct").length;
  const totalWords = expected.length;
  return {
    diff,
    correctWords,
    totalWords,
    accuracy:
      totalWords === 0
        ? 0
        : Math.round((correctWords / totalWords) * 100),
  };
}

/** A gentle first-letter hint that never reveals the full word. */
export function buildFirstLetterHint(text: string): string {
  return splitGermanWords(text)
    .map((word) => {
      const letters = word.replace(/[^\p{L}\p{N}]/gu, "");
      const first = letters.slice(0, 1);
      if (!first) return "";
      return `${first}${"·".repeat(Math.max(letters.length - 1, 0))}`;
    })
    .filter(Boolean)
    .join(" ");
}
