/**
 * Step 6 — Execute the Python generation script.
 * Runs the configured Python script which processes the sources_today/ directory
 * and writes the final mp4 and txt files to outputs_today/.
 */
import { spawn } from "child_process";
import { confirm } from "@inquirer/prompts";
import { config } from "../config.js";
import { printStep, ok, err, warn, info, C } from "../ui.js";
import { logStep, log } from "../logger.js";
import type { SessionState } from "../types.js";

export async function runStep6(session: SessionState): Promise<void> {
  printStep(6, "Generate Videos");

  info(`The Python script will now process the files in sources_today/.`);
  info(`Make sure the script is configured to look in:`);
  info(`  WORKING_DIR=${config.workingDir}`);
  
  const proceed = await confirm({
    message: C.white("Start video generation?"),
    default: true,
  });

  if (!proceed) {
    log("WARN", "Video generation skipped by user.");
    return;
  }

  logStep(6, `Starting Python script: ${config.pythonScriptPath}`);

  return new Promise((resolve, reject) => {
    // Determine how to run the script. Could be `python3`, `python`, etc.
    // For now we assume `python3`. It can be overridden in the environment if needed.
    const pythonCmd = process.env.PYTHON_CMD || "python3";
    
    // We pass the working directory as an environment variable to the python script
    const env = {
      ...process.env,
      WORKING_DIR: config.workingDir,
    };

    const pythonProcess = spawn(pythonCmd, [config.pythonScriptPath], {
      stdio: "inherit",
      env,
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        ok("Video generation completed successfully.");
        log("INFO", "Python script exited with code 0.");
        resolve();
      } else {
        err(`Video generation failed with exit code ${code}.`);
        log("ERROR", `Python script failed with code ${code}.`);
        reject(new Error(`Python script failed with code ${code}`));
      }
    });

    pythonProcess.on("error", (error) => {
      err(`Failed to start Python script: ${error.message}`);
      log("ERROR", `Failed to start Python script: ${error.message}`);
      reject(error);
    });
  });
}
