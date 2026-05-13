import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { log } from "./logger.js";

/**
 * Calculates the scheduled date for a given episode number.
 * The date is derived from config.schedule.baseDate + (episode - 1) days.
 */
function getScheduledDate(episodeNumber: number): string {
  const base = new Date(`${config.schedule.baseDate}T00:00:00`);
  base.setDate(base.getDate() + (episodeNumber - 1));
  return base.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const YOUTUBE_INFO_TEMPLATE = `\
══════════════════════════════════════════════════
{podcast} — Episode {episode}
══════════════════════════════════════════════════

TITLE
-----
{title}

DESCRIPTION
-----------
{description}

SCHEDULED TIME
--------------
{date}
{time}

══════════════════════════════════════════════════
`;

export function generateYoutubeInfo(params: {
  infoPath: string;
  metadata: any;
  videoFile: string;
}): void {
  const { infoPath, metadata, videoFile } = params;

  const description = metadata.description || "";
  const locale = (metadata.locale || "es").toLowerCase();
  const source = metadata.source || "";

  let sourceInfo = "";
  if (locale === "es") {
    sourceInfo = `\n\n📚 *Fuentes del episodio*\nPuedes leer el artículo completo utilizado en este episodio en:\n${source}`;
  } else {
    sourceInfo = `\n\n📚 *Episode Sources*\nYou can read the full article used in this episode at:\n${source}`;
  }

  const fullDescription = `${description}${sourceInfo}`;

  const content = YOUTUBE_INFO_TEMPLATE
    .replaceAll("{podcast}", metadata.podcast || "N/A")
    .replaceAll("{episode}", metadata.episode || "N/A")
    .replaceAll("{title}", metadata.title || "N/A")
    .replaceAll("{description}", fullDescription)
    .replaceAll("{date}", getScheduledDate(Number(metadata.episode) || 1))
    .replaceAll("{time}", config.schedule.scheduledTime)
    .replaceAll("{video_file}", path.basename(videoFile));

  fs.writeFileSync(infoPath, content, "utf-8");
  log("INFO", `YouTube upload info written: ${infoPath}`);
}
