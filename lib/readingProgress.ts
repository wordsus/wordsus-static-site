/**
 * Reading progress utilities.
 * All data is stored locally in localStorage — no remote session required.
 *
 * Storage keys:
 *   wordsus-chapter-{locale}-{slug}   → last visited chapter slug (string)
 */

export const STORAGE_PREFIX = "wordsus-chapter";

/** Returns the localStorage key for a given book. */
export function chapterKey(locale: string, slug: string): string {
  return `${STORAGE_PREFIX}-${locale}-${slug}`;
}

/** Reads the last visited chapter slug from localStorage. Returns null on failure. */
export function getSavedChapter(locale: string, slug: string): string | null {
  try {
    return localStorage.getItem(chapterKey(locale, slug));
  } catch {
    return null;
  }
}

/** Persists the current chapter slug to localStorage. */
export function saveChapter(
  locale: string,
  slug: string,
  chapterSlug: string
): void {
  try {
    localStorage.setItem(chapterKey(locale, slug), chapterSlug);
  } catch {
    // ignore write errors (e.g. private mode quota)
  }
}

/**
 * Calculates a reading progress percentage (0–100) based on chapter order.
 * @param currentOrder  The `order` field of the current chapter (1-based).
 * @param totalChapters Total number of chapters in the book.
 */
export function calcProgress(
  currentOrder: number,
  totalChapters: number
): number {
  if (totalChapters <= 0) return 0;
  return Math.round((currentOrder / totalChapters) * 100);
}
