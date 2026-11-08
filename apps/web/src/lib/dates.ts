/** Local-time date helpers. All keys use YYYY-MM-DD without UTC drift. */

export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year = 1970, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function diffCalendarDays(later: Date, earlier: Date): number {
  const ms = startOfDay(later).getTime() - startOfDay(earlier).getTime();
  return Math.round(ms / 86_400_000);
}

export function isYesterday(key: string | null, now: Date = new Date()): boolean {
  if (!key) return false;
  return key === dateKey(addDays(now, -1));
}

export function isToday(value: string | null | undefined, now: Date = new Date()): boolean {
  if (!value) return false;
  return value.slice(0, 10) === dateKey(now);
}

export function lastNDays(count: number, now: Date = new Date()): string[] {
  return Array.from({ length: count }, (_value, index) =>
    dateKey(addDays(now, index - (count - 1))),
  );
}

export function daysAgoLabel(key: string, language: "ar" | "en"): string {
  const locale = language === "ar" ? "ar-EG" : "en-GB";
  const date = parseDateKey(key);
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatFullDate(
  value: string | Date,
  language: "ar" | "en",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const locale = language === "ar" ? "ar-EG" : "en-GB";
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(
  value: string | Date,
  language: "ar" | "en",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const locale = language === "ar" ? "ar-EG" : "en-GB";
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function formatTime(
  value: string | Date,
  language: "ar" | "en",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const locale = language === "ar" ? "ar-EG" : "en-GB";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function formatMinutes(totalSeconds: number): number {
  return Math.floor(totalSeconds / 60);
}

export function relativeDueLabel(
  dueDate: string,
  language: "ar" | "en",
  dueNowLabel: string,
): string {
  const due = new Date(dueDate);
  const today = endOfDay();
  if (due.getTime() <= today.getTime()) return dueNowLabel;
  const diff = diffCalendarDays(due, new Date());
  if (language === "ar") {
    if (diff === 1) return "بكرة";
    return `بعد ${diff} أيام`;
  }
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}
