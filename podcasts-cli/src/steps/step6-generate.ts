/**
 * Step 6 — Generate Videos.
 * Port of the Python script to TypeScript.
 * Processes the sources_today/ directory and writes final mp4 and txt files to outputs_today/.
 */
import fs from "fs";
import path from "path";
import { confirm } from "@inquirer/prompts";
import { config } from "../config.js";
import { printStep, ok, err, info, C, divider } from "../ui.js";
import { logStep, log } from "../logger.js";
import type { SessionState } from "../types.js";
import { discoverEpisodes, outputsDir, findAudioFile, findImageFile, findVideoFile, saveLastEpisode } from "../filesystem.js";
import { runFFmpeg } from "../ffmpeg.js";
import { generateYoutubeInfo } from "../youtube.js";

export async function runStep6(session: SessionState): Promise<void> {
  printStep(6, "Generate Videos");

  const episodes = discoverEpisodes();

  if (episodes.length === 0) {
    warn("No processable episodes found in sources_today/.");
    info("Each episode needs a .json metadata file, an audio file, and a background image/video.");
    return;
  }

  info(`Found ${C.accent(episodes.length.toString())} episode(s) to process.`);
  
  const proceed = await confirm({
    message: C.white("Start video generation?"),
    default: true,
  });

  if (!proceed) {
    log("WARN", "Video generation skipped by user.");
    return;
  }

  logStep(6, `Starting generation of ${episodes.length} videos...`);

  let doneCount = 0;
  let skippedCount = 0;
  const errors: { alias: string; error: any }[] = [];

  for (const ep of episodes) {
    const { alias, jsonPath } = ep;
    const outputVideo = path.join(outputsDir(), `${alias}.mp4`);
    const outputInfo = path.join(outputsDir(), `${alias}_upload_info.txt`);

    divider();
    info(`Processing: ${C.primary.bold(alias)}`);

    // Skip if already exists
    if (fs.existsSync(outputVideo)) {
      info(`⏭ Skipping ${alias} — video already exists.`);
      skippedCount++;
      continue;
    }

    try {
      const audioFile = findAudioFile(alias)!;
      const bgVideo = findVideoFile(alias);
      const bgImage = findImageFile(alias);
      
      const backgroundFile = bgVideo || bgImage!;
      const isStaticImage = !bgVideo;

      // Read metadata for YouTube info
      const metadata = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

      // Run FFmpeg
      await runFFmpeg({
        audioFile,
        backgroundFile,
        outputFile: outputVideo,
        isStaticImage,
        onProgress: (p) => {
          const ratio = p.seconds / p.totalSeconds;
          const percent = (ratio * 100).toFixed(1);
          const barWidth = 30;
          const filledWidth = Math.floor(ratio * barWidth);
          const bar = C.accent("━".repeat(filledWidth)) + C.muted("━".repeat(barWidth - filledWidth));
          
          process.stdout.write(`\r  🎬 Rendering: ${C.white("[")}${bar}${C.white("]")} ${C.accent(percent + "%")} [${p.seconds.toFixed(0)}s/${p.totalSeconds.toFixed(0)}s]   `);
        }
      });
      process.stdout.write("\n");

      // Generate YouTube info
      generateYoutubeInfo({
        infoPath: outputInfo,
        metadata,
        videoFile: outputVideo
      });

      // Copy thumbnail if it's an image
      if (bgImage) {
        const destThumbnail = path.join(outputsDir(), `${alias}${path.extname(bgImage)}`);
        fs.copyFileSync(bgImage, destThumbnail);
        info(`Thumbnail copied: ${path.basename(destThumbnail)}`);
      }

      ok(`Done — ${alias}`);
      doneCount++;
    } catch (e) {
      err(`Failed to process ${alias}: ${e}`);
      log("ERROR", `Failed to process ${alias}: ${e}`);
      errors.push({ alias, error: e });
    }
  }

  divider();
  if (errors.length > 0) {
    err(`${errors.length} episode(s) failed to process.`);
  }
  ok(`All episodes processed — ${doneCount} rendered, ${skippedCount} skipped.`);

  // Save the episode number to last-episode.log
  saveLastEpisode(session.defaultEpisode);

  log("INFO", `Step 6 completed: ${doneCount} done, ${skippedCount} skipped, ${errors.length} errors.`);
}

function warn(msg: string): void {
  console.log(C.warn("  ⚠  ") + C.white(msg));
}
