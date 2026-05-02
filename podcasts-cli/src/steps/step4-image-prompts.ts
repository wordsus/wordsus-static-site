/**
 * Step 4 — Copy image prompts to clipboard and open the Gemini chat.
 * For each book/episode:
 *   1. Copies the image-prompt template (rendered) to the clipboard.
 *   2. Opens the Gemini chat URL (from chats.txt) in the browser so the user
 *      can paste the prompt and obtain a descriptive image-generation prompt.
 */
import clipboard from "clipboardy";
import open from "open";
import { confirm } from "@inquirer/prompts";
import { books } from "../books.js";
import { getChapter, getChatUrl } from "../content.js";
import { renderTemplate } from "../templates.js";
import { printStep, ok, warn, info, clipboardNotice, divider, C } from "../ui.js";
import { logStep, log } from "../logger.js";
import type { SessionState } from "../types.js";

export async function runStep4(session: SessionState): Promise<void> {
  printStep(4, "Copy Image Prompts + Open Gemini Chats");
  info("The image prompt will be copied to your clipboard and the Gemini chat");
  info("will open in a new browser tab. Paste the prompt there to get the");
  info("descriptive image-generation prompt, then generate the image externally.");
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

    // ── Render image prompt ──────────────────────────────────────────────
    let prompt: string;
    try {
      prompt = renderTemplate(book, chapter, "image-prompt");
      if (book.locale === "es") {
        prompt += "\n\nThe prompt must be in English and the texts in Spanish.";
      }
    } catch (e) {
      warn(`[${book.alias}] ${(e as Error).message}`);
      continue;
    }

    await clipboard.write(prompt);
    clipboardNotice(`${book.alias} — image prompt`, chapter.title);

    // ── Open Gemini chat ─────────────────────────────────────────────────
    const chatUrl = getChatUrl(book, target.episodeNumber);
    if (chatUrl) {
      info(`  ${C.muted("Chat URL:")} ${chatUrl}`);
      await open(chatUrl);
      ok(`Opened Gemini chat for ${book.alias} in browser.`);
      log("INFO", `[${book.alias}] Opened chat: ${chatUrl}`);
    } else {
      warn(
        `[${book.alias}] No chat URL found in chats.txt for episode ${target.episodeNumber}. ` +
        `Add the Gemini chat URL at line ${target.episodeNumber} of:\n` +
        `  content/${book.locale}/books/${book.slug}/chats.txt`
      );
    }

    await confirm({
      message: C.white(`Paste the image prompt in Gemini and generate the image, then press Enter`),
      default: true,
    });

    log("INFO", `[${book.alias}] Image prompt copied for episode ${target.episodeNumber}`);
    divider();
  }

  logStep(4, "All image prompts copied and chats opened.");
  ok("While the audio generates, create all background images and save them as:");
  for (const book of sortedBooks.filter((b) => session.targets.find((t) => t.alias === b.alias))) {
    info(`  ${C.primary(book.alias + ".png")}  →  Drop into sources_today/`);
  }
}
