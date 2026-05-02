/**
 * Step 0 — Session setup.
 * Determines the default episode number and whether to ask per-book.
 */
import { input, confirm, select } from "@inquirer/prompts";
import { books } from "../books.js";
import { printStep, info, C } from "../ui.js";
import { logStep } from "../logger.js";
import type { SessionState, EpisodeTarget } from "../types.js";

export async function runStep0(defaultEpisodeArg?: number): Promise<SessionState> {
  printStep(0, "Session Setup");

  // ── Default episode ──────────────────────────────────────────────────────
  let defaultEpisode: number;
  if (defaultEpisodeArg !== undefined) {
    defaultEpisode = defaultEpisodeArg;
    info(`Using --episode ${defaultEpisode} as default episode.`);
  } else {
    const raw = await input({
      message: C.white("Default episode number for today's batch:"),
      validate: (v) => {
        const n = parseInt(v, 10);
        return Number.isInteger(n) && n > 0 ? true : "Please enter a positive integer.";
      },
    });
    defaultEpisode = parseInt(raw, 10);
  }

  // ── Ask per book? ────────────────────────────────────────────────────────
  const askPerBook = await select({
    message: C.white("When processing each book, episode number should:"),
    choices: [
      {
        name: `Always use default (episode ${defaultEpisode}) — just press Enter`,
        value: false,
      },
      {
        name: "Ask for each book individually (to allow overrides)",
        value: true,
      },
    ],
  });

  // ── Resolve per-book episode numbers ─────────────────────────────────────
  const sortedBooks = [...books].sort((a, b) => a.order - b.order);
  const targets: EpisodeTarget[] = [];

  for (const book of sortedBooks) {
    if (askPerBook) {
      const useDefault = await confirm({
        message: C.white(`[${C.primary.bold(book.alias)}] Use episode ${defaultEpisode}?`),
        default: true,
      });
      if (useDefault) {
        targets.push({ alias: book.alias, episodeNumber: defaultEpisode });
      } else {
        const raw = await input({
          message: C.white(`  Episode number for ${book.alias}:`),
          validate: (v) => {
            const n = parseInt(v, 10);
            return Number.isInteger(n) && n > 0 ? true : "Please enter a positive integer.";
          },
        });
        targets.push({ alias: book.alias, episodeNumber: parseInt(raw, 10) });
      }
    } else {
      targets.push({ alias: book.alias, episodeNumber: defaultEpisode });
    }
  }

  logStep(0, `Session configured. Default episode: ${defaultEpisode}. Per-book ask: ${askPerBook}`);
  for (const t of targets) {
    logStep(0, `  ${t.alias} → episode ${t.episodeNumber}`);
  }

  return { defaultEpisode, askPerBook, targets };
}
