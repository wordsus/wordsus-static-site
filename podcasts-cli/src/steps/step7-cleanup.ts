/**
 * Step 7 — Backup and cleanup.
 * Zips the sources_today and outputs_today directories into backups/,
 * then empties them for the next day.
 */
import { confirm } from "@inquirer/prompts";
import { backupAndClean } from "../filesystem.js";
import { printStep, ok, warn, info, C } from "../ui.js";
import { logStep, log } from "../logger.js";

export async function runStep7(): Promise<void> {
  printStep(7, "Backup and Cleanup");

  info("Please ensure you have uploaded all videos to YouTube and copied");
  info("the descriptions from the txt files in outputs_today/.");
  
  const proceed = await confirm({
    message: C.white("Have you finished uploading everything? Ready to clean up?"),
    default: true,
  });

  if (!proceed) {
    warn("Cleanup aborted. The directories remain intact.");
    logStep(7, "Cleanup skipped by user.");
    return;
  }

  const spinner = (await import("ora")).default({
    text: "Zipping and cleaning up...",
    color: "magenta",
  }).start();

  try {
    logStep(7, "Starting backup process.");
    await backupAndClean();
    spinner.succeed("Backup and cleanup completed successfully!");
    log("INFO", "Backup and cleanup finished.");
    ok("The working directories are clean and ready for tomorrow.");
  } catch (error) {
    spinner.fail("An error occurred during backup and cleanup.");
    log("ERROR", `Backup failed: ${(error as Error).message}`);
    console.error(error);
  }
}
