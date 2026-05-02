/**
 * Step 1 — Create metadata JSON files in sources_today/.
 * Writes <alias>.json for every configured book, derived from book.json chapters.
 */
import fs from "fs";
import { books } from "../books.js";
import { getChapter, buildArticleUrl, readBookJson } from "../content.js";
import { getJsonSourcePath, ensureWorkingDirs } from "../filesystem.js";
import { printStep, ok, warn, err, info } from "../ui.js";
import { logStep, log } from "../logger.js";
import type { SessionState, EpisodeMetadata } from "../types.js";

export async function runStep1(session: SessionState): Promise<void> {
  printStep(1, "Create Episode JSON Files");
  ensureWorkingDirs();

  const sortedBooks = [...books].sort((a, b) => a.order - b.order);

  for (const book of sortedBooks) {
    const target = session.targets.find((t) => t.alias === book.alias);
    if (!target) continue;

    const { episodeNumber } = target;
    const chapter = getChapter(book, episodeNumber);

    if (!chapter) {
      err(`[${book.alias}] Chapter order=${episodeNumber} not found in book.json`);
      log("ERROR", `[${book.alias}] No chapter with order=${episodeNumber}`);
      continue;
    }

    const bookJson = readBookJson(book);
    const articleUrl = buildArticleUrl(book, chapter);

    const metadata: EpisodeMetadata = {
      episode: String(episodeNumber),
      title: chapter.title,
      description: chapter.description ?? bookJson.description,
      locale: book.locale,
      source: articleUrl,
      podcast: book.podcast,
    };

    const outPath = getJsonSourcePath(book.alias);
    fs.writeFileSync(outPath, JSON.stringify(metadata, null, 2), "utf-8");
    ok(`[${book.alias}] Written → ${outPath}`);
    info(`     Title: ${chapter.title}`);
    info(`     URL:   ${articleUrl}`);
    log("INFO", `[${book.alias}] JSON written: ${outPath}`);
  }

  logStep(1, "Episode JSON files created.");
}
