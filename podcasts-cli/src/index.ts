#!/usr/bin/env node
/**
 * Entry point for the Podcasts CLI.
 */
import { select } from "@inquirer/prompts";
import { printBanner, ok, divider, C, info } from "./ui.js";
import { logStep, purgeOldLogs, log } from "./logger.js";
import { runStep0 } from "./steps/step0-setup.js";
import { runStep1 } from "./steps/step1-json.js";
import { runStep2 } from "./steps/step2-urls.js";
import { runStep3 } from "./steps/step3-audio-prompts.js";
import { runStep4 } from "./steps/step4-image-prompts.js";
import { runStep5 } from "./steps/step5-verify.js";
import { runStep6 } from "./steps/step6-generate.js";
import { runStep7 } from "./steps/step7-cleanup.js";

async function main() {
  console.clear();
  printBanner();
  
  // Clean up old logs on startup
  purgeOldLogs();
  log("INFO", "=== Podcasts CLI Session Started ===");

  // Parse args
  const args = process.argv.slice(2);
  let defaultEpisodeArg: number | undefined;
  
  const epIndex = args.indexOf("--episode");
  if (epIndex !== -1 && args.length > epIndex + 1) {
    const num = parseInt(args[epIndex + 1], 10);
    if (!isNaN(num)) {
      defaultEpisodeArg = num;
    }
  }

  try {
    // Step 0: Session Setup (Always runs first)
    const session = await runStep0(defaultEpisodeArg);
    
    let exitRequested = false;

    while (!exitRequested) {
      console.log();
      const choice = await select({
        message: C.primary.bold("Main Menu: Choose the next step to execute"),
        choices: [
          { name: "1. Create JSON Metadata files", value: 1 },
          { name: "2. Copy Article URLs (NotebookLM)", value: 2 },
          { name: "3. Copy Audio Prompts (NotebookLM)", value: 3 },
          { name: "4. Copy Image Prompts (Gemini)", value: 4 },
          { name: "5. Verify Source Files readiness", value: 5 },
          { name: "6. Generate Videos (Python Script)", value: 6 },
          { name: "7. Backup & Cleanup", value: 7 },
          { name: C.danger("0. Exit program"), value: 0 },
        ],
      });

      try {
        switch (choice) {
          case 1:
            await runStep1(session);
            break;
          case 2:
            await runStep2(session);
            break;
          case 3:
            await runStep3(session);
            break;
          case 4:
            await runStep4(session);
            break;
          case 5:
            await runStep5(session);
            break;
          case 6:
            await runStep6(session);
            break;
          case 7:
            await runStep7();
            break;
          case 0:
            exitRequested = true;
            break;
        }
      } catch (error) {
        if (error instanceof Error && (error.message.includes("cancelled") || error.message.includes("User force closed"))) {
          log("WARN", `Step ${choice} cancelled by user.`);
        } else {
          const msg = error instanceof Error ? error.message : String(error);
          log("ERROR", `Step ${choice} failed: ${msg}`);
        }
      }
      
      if (!exitRequested) {
        divider();
        info(`Finished Step ${choice}. Returning to menu...`);
      }
    }

    divider();
    ok("Exiting CLI. Have a great day!");
    log("INFO", "=== Podcasts CLI Session Ended ===");
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("cancelled") || error.message.includes("User force closed")) {
         console.log("\nProcess cancelled.");
         log("WARN", "Session cancelled by user.");
      } else {
        console.error("\nAn unexpected error occurred:");
        console.error(error.message);
        log("ERROR", `Unhandled exception: ${error.stack || error.message}`);
      }
    }
    process.exit(1);
  }
}

main();
