/**
 * Step 4 — Copy image prompts to clipboard.
 * For each book/episode, copies the image-prompt template (rendered) to the
 * clipboard so the user can paste it into Gemini and obtain a descriptive
 * image-generation prompt.
 */
import clipboard from "clipboardy";
import { expand } from "@inquirer/prompts";
import { books } from "../books.js";
import { getChapter } from "../content.js";
import { renderTemplate } from "../templates.js";
import { printStep, ok, warn, info, clipboardNotice, divider, C } from "../ui.js";
import { logStep, log } from "../logger.js";
import { findJsonFile } from "../filesystem.js";
import type { SessionState } from "../types.js";

export async function runStep4(session: SessionState): Promise<void> {
  printStep(4, "Copy Image Prompts");
  info("The image prompt will be copied to your clipboard.");
  info("Paste it into Gemini to get the descriptive image-generation prompt,");
  info("then generate the image externally.");
  divider();

  const sortedBooks = books
    .sort((a, b) => a.order - b.order);

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

    // ── Render image prompt ──────────────────────────────────────────────
    let prompt: string;
    try {
      prompt = renderTemplate(book, chapter, "image-prompt");
      if (book.locale === "es") {
        prompt += "\n\nThe prompt must be in English and the texts in Spanish.";
      }
    } catch (e) {
      warn(`[${book.alias}] ${(e as Error).message}`);
      i++;
      continue;
    }

    await clipboard.write(prompt);
    clipboardNotice(`${book.alias} — image prompt`, chapter.title);

    const action = await expand({
      message: C.white(`Paste the image prompt in Gemini and generate the image`),
      default: "y",
      expanded: true,
      choices: [
        { key: "y", name: "yes (next item)", value: "y" as const },
        { key: "n", name: "no (cancel & return to menu)", value: "n" as const },
        { key: "a", name: "again (repeat current item)", value: "a" as const },
      ],
    });

    if (action === "n") {
      log("INFO", `[${book.alias}] Image prompt copy loop cancelled by user.`);
      info("Cancelled. Returning to main menu...");
      return;
    }

    if (action === "a") {
      log("INFO", `[${book.alias}] Repeating image prompt copy for episode ${target.episodeNumber}`);
      divider();
      continue;
    }

    log("INFO", `[${book.alias}] Image prompt copied for episode ${target.episodeNumber}`);
    divider();
    i++;
  }

  logStep(4, "All image prompts copied.");
  ok("While the audio generates, create all background images and save them as:");
  for (const book of sortedBooks.filter((b) => session.targets.find((t) => t.alias === b.alias) && findJsonFile(b.alias))) {
    info(`  ${C.primary(book.alias + ".png")}  →  Drop into sources_today/`);
  }
}
