/**
 * Content helpers — reads book.json and chats.txt from the content directory.
 */
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import type { BookJson, Chapter } from "./types.js";
import type { BookConfig } from "./books.js";

export function readBookJson(book: BookConfig): BookJson {
  const jsonPath = path.join(
    config.contentDir,
    book.locale,
    "books",
    book.slug,
    "book.json"
  );
  const raw = fs.readFileSync(jsonPath, "utf-8");
  return JSON.parse(raw) as BookJson;
}

export function getChapter(book: BookConfig, episodeNumber: number): Chapter | undefined {
  const bookJson = readBookJson(book);
  return bookJson.chapters.find((ch) => ch.order === episodeNumber);
}

/**
 * Reads the optional chats.txt file next to book.json.
 * Each line is a Gemini chat URL; line N corresponds to chapter order N.
 * Returns null if the file does not exist.
 */
export function getChatUrl(book: BookConfig, episodeNumber: number): string | null {
  const chatsPath = path.join(
    config.contentDir,
    book.locale,
    "books",
    book.slug,
    "chats.txt"
  );
  if (!fs.existsSync(chatsPath)) return null;
  const lines = fs.readFileSync(chatsPath, "utf-8").split("\n");
  // Line numbers are 1-indexed; episode N → lines[N-1]
  const url = lines[episodeNumber - 1]?.trim();
  return url || null;
}

/**
 * Constructs the public URL of an article on the website.
 */
export function buildArticleUrl(book: BookConfig, chapter: Chapter): string {
  return `${config.siteBaseUrl}/${book.locale}/${book.slug}/${chapter.slug}`;
}

/**
 * Splits a chapter title into title and subtitle at the first ": " or " — ".
 * Used to fill image-prompt templates.
 */
export function splitTitle(fullTitle: string): { title: string; subtitle: string } {
  const separators = [": ", " — ", " - ", " | "];
  for (const sep of separators) {
    const idx = fullTitle.indexOf(sep);
    if (idx !== -1) {
      const title = fullTitle.slice(0, idx);
      let subtitle = fullTitle.slice(idx + sep.length);

      // Capitalize first letter of subtitle
      if (subtitle.length > 0) {
        subtitle = subtitle.charAt(0).toUpperCase() + subtitle.slice(1);
      }

      return { title, subtitle };
    }
  }
  return { title: fullTitle, subtitle: "" };
}
