/**
 * Step 5 — Verify that all sources are ready in sources_today/.
 * Displays a table showing the presence of audio, image, and JSON files
 * for each targeted book. Only proceeds when all are ready.
 */
import { confirm } from "@inquirer/prompts";
import { books } from "../books.js";
import { checkReadiness } from "../filesystem.js";
import { printStep, printReadinessTable, ok, warn, C } from "../ui.js";
import { logStep, log } from "../logger.js";
import type { SessionState } from "../types.js";

export async function runStep5(session: SessionState): Promise<void> {
  printStep(5, "Verify Source Files");
  
  const targetAliases = session.targets.map((t) => t.alias);

  while (true) {
    const results = checkReadiness(targetAliases);
    printReadinessTable(results);

    const allReady = results.every((r) => r.ready);
    
    if (allReady) {
      ok("All source files are present in sources_today/.");
      logStep(5, "Readiness check passed. All files present.");
      break;
    } else {
      warn("Some source files are missing.");
      console.log(C.white("  Please make sure you have downloaded all Audio Overviews and Images"));
      console.log(C.white("  and placed them in the sources_today/ directory with the correct alias as filename."));
      
      const retry = await confirm({
        message: C.white("Press Enter to re-check the directory"),
        default: true,
      });
      
      if (!retry) {
        log("WARN", "User cancelled readiness check.");
        return;
      }
    }
  }
}
