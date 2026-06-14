/**
 * Step 2 — Copy article URLs to clipboard one by one.
 * For each book, the user copies the URL, then opens NotebookLM in a new tab
 * to add it as a source.
 */
import clipboard from "clipboardy";
import { expand } from "@inquirer/prompts";
import { books } from "../books.js";
import { getChapter, buildArticleUrl } from "../content.js";
import { printStep, ok, warn, info, clipboardNotice, divider, C } from "../ui.js";
import { logStep, log } from "../logger.js";
import { findJsonFile } from "../filesystem.js";
import type { SessionState } from "../types.js";

const NOTEBOOKLM_URL = "https://notebooklm.google.com";

export async function runStep2(session: SessionState): Promise<void> {
  printStep(2, "Copy Article URLs → NotebookLM");
  info("For each book: the URL will be copied to your clipboard.");
  info("Open NotebookLM in a new tab and add it as a notebook source.");
  divider();

  const sortedBooks = [...books].sort((a, b) => a.order - b.order);

  let i = 0;
  while (i < sortedBooks.length) {
    const book = sortedBooks[i];
    const target = session.targets.find((t) => t.alias === book.alias);
    if (!target) {
      i++;
      continue;
    }
    
    if (!findJsonFile(book.alias)) {
      i++;
      continue;
    }

    const chapter = getChapter(book, target.episodeNumber);
    if (!chapter) {
      warn(`[${book.alias}] Chapter ${target.episodeNumber} not found — skipping.`);
      i++;
      continue;
    }

    const url = buildArticleUrl(book, chapter);
    await clipboard.write(url);
    clipboardNotice(book.alias, url);
    info(`  ${C.muted("Episode:")} ${target.episodeNumber} — ${chapter.title}`);

    const action = await expand({
      message: C.white(`Open NotebookLM in browser and paste the URL`),
      default: "y",
      expanded: true,
      choices: [
        { key: "y", name: "yes (next item)", value: "y" as const },
        { key: "n", name: "no (cancel & return to menu)", value: "n" as const },
        { key: "a", name: "again (repeat current item)", value: "a" as const },
      ],
    });

    if (action === "n") {
      log("INFO", `[${book.alias}] URL copy loop cancelled by user.`);
      info("Cancelled. Returning to main menu...");
      return;
    }

    if (action === "a") {
      log("INFO", `[${book.alias}] Repeating URL copy for episode ${target.episodeNumber}`);
      divider();
      continue;
    }

    log("INFO", `[${book.alias}] URL copied: ${url}`);
    divider();
    i++;
  }

  logStep(2, "All article URLs processed.");
  ok("All URLs have been copied. Continue pasting them into their NotebookLM notebooks.");
}
