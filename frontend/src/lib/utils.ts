import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Today's date as `YYYY-MM-DD` for native `<input type="date">` fields. */
export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Extract up-to-`maxLength` uppercase initials from a person's name. If the
 * name only has one word the first `maxLength` characters of that word are
 * returned. Falls back to `fallback` when the input is empty.
 */
export function getInitials(
  name: string | null | undefined,
  fallback = "?",
  maxLength = 2,
): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) {
    return parts[0]!.slice(0, maxLength).toUpperCase();
  }
  return parts
    .slice(0, maxLength)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
