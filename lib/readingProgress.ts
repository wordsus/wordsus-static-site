/**
 * Reading progress utilities.
 * All data is stored locally in localStorage — no remote session required.
 *
 * Storage keys:
 *   wordsus-chapter-{locale}-{slug}   → last visited chapter slug (string)
 *   wordsus-scroll-{locale}-{slug}    → scroll positions JSON (ScrollPositions)
 */

export const STORAGE_PREFIX = "wordsus-chapter";
export const SCROLL_PREFIX = "wordsus-scroll";

/** Returns the localStorage key for a given book's last chapter. */
export function chapterKey(locale: string, slug: string): string {
  return `${STORAGE_PREFIX}-${locale}-${slug}`;
}

/** Returns the localStorage key for a given book's scroll positions. */
export function scrollKey(locale: string, slug: string): string {
  return `${SCROLL_PREFIX}-${locale}-${slug}`;
}

export interface ScrollPositions {
  /** window.scrollY of the main content area */
  content: number;
  /** scrollTop of the left sidebar element */
  leftSidebar: number;
  /** scrollTop of the right sidebar element */
  rightSidebar: number;
}

/** Reads persisted scroll positions for a book. Returns null on failure or if absent. */
export function getScrollPositions(
  locale: string,
  slug: string
): ScrollPositions | null {
  try {
    const raw = localStorage.getItem(scrollKey(locale, slug));
    if (!raw) return null;
    return JSON.parse(raw) as ScrollPositions;
  } catch {
    return null;
  }
}

/** Persists scroll positions for a book to localStorage. */
export function saveScrollPositions(
  locale: string,
  slug: string,
  positions: ScrollPositions
): void {
  try {
    localStorage.setItem(scrollKey(locale, slug), JSON.stringify(positions));
  } catch {
    // ignore write errors (e.g. private mode quota)
  }
}

/** Removes persisted scroll positions for a book. */
export function clearScrollPositions(locale: string, slug: string): void {
  try {
    localStorage.removeItem(scrollKey(locale, slug));
  } catch { }
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
