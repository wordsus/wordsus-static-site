/**
 * Step 3 — Copy audio prompts to clipboard one by one.
 * Renders the audio-prompt template for each book/episode and copies it.
 * The user pastes it into the corresponding NotebookLM notebook to customise
 * the Audio Overview generation.
 */
import clipboard from "clipboardy";
import { confirm } from "@inquirer/prompts";
import { books } from "../books.js";
import { getChapter } from "../content.js";
import { renderTemplate } from "../templates.js";
import { printStep, ok, warn, info, clipboardNotice, divider, C } from "../ui.js";
import { logStep, log } from "../logger.js";
import type { SessionState } from "../types.js";

export async function runStep3(session: SessionState): Promise<void> {
  printStep(3, "Copy Audio Prompts → NotebookLM");
  info("Paste each prompt into the NotebookLM notebook you opened in Step 2,");
  info("in the SAME ORDER you added them. This customises the Audio Overview.");
  divider();

  const sortedBooks = [...books].sort((a, b) => a.order - b.order);

  for (const book of sortedBooks) {
    const target = session.targets.find((t) => t.alias === book.alias);
    if (!target) continue;

    const chapter = getChapter(book, target.episodeNumber);
    if (!chapter) {
      warn(`[${book.alias}] Chapter ${target.episodeNumber} not found — skipping.`);
      continue;
    }

    let prompt: string;
    try {
      prompt = renderTemplate(book, chapter, "audio-prompt");
    } catch (e) {
      warn(`[${book.alias}] ${(e as Error).message}`);
      continue;
    }

    await clipboard.write(prompt);
    clipboardNotice(`${book.alias} — audio prompt`, `[${book.podcast}] Ep. ${target.episodeNumber}: ${chapter.title}`);

    info(`  ${C.muted("Template:")} ${book.alias}/audio-prompt.md (or general)`);

    await confirm({
      message: C.white(`Paste this prompt into the ${book.alias} NotebookLM, then press Enter`),
      default: true,
    });

    log("INFO", `[${book.alias}] Audio prompt copied for episode ${target.episodeNumber}`);
    divider();
  }

  logStep(3, "All audio prompts copied.");
  ok("All audio prompts have been pasted. NotebookLM is now generating the audio.");
}
