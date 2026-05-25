import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { log } from "./logger.js";

const DAY_MAP: Record<string, number> = {
  // English names
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  // Spanish names
  domingo: 0, dom: 0,
  lunes: 1, lun: 1,
  martes: 2, mar: 2,
  miércoles: 3, miercoles: 3, mie: 3,
  jueves: 4, jue: 4,
  viernes: 5, vie: 5,
  sábado: 6, sabado: 6, sab: 6,
};

function parsePublishDays(publishDays: readonly (string | number)[] | string): Set<number> {
  const result = new Set<number>();

  const processItem = (item: unknown) => {
    if (typeof item === "number") {
      if (item >= 0 && item <= 6) {
        result.add(item);
      }
    } else if (typeof item === "string") {
      const clean = item.trim().toLowerCase();
      const num = parseInt(clean, 10);
      if (!isNaN(num) && num >= 0 && num <= 6) {
        result.add(num);
      } else if (clean in DAY_MAP) {
        result.add(DAY_MAP[clean]);
      }
    }
  };

  if (Array.isArray(publishDays)) {
    publishDays.forEach(processItem);
  } else if (typeof publishDays === "string") {
    publishDays.split(",").forEach(processItem);
  }

  // Fallback to all days if empty or invalid to prevent infinite loops
  if (result.size === 0) {
    for (let i = 0; i < 7; i++) {
      result.add(i);
    }
  }

  return result;
}

/**
 * Calculates the scheduled date for a given episode number.
 * Episode 1 is scheduled on the first available publish day on or after config.schedule.baseDate;
 * each subsequent episode is scheduled on the next available publish day.
 */
function getScheduledDate(episodeNumber: number): string {
  const base = new Date(`${config.schedule.baseDate}T00:00:00`);
  const publishDayNums = parsePublishDays(config.schedule.publishDays);

  let currentDate = new Date(base.getTime());

  // Find first publish day on or after baseDate
  while (!publishDayNums.has(currentDate.getDay())) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Advance for subsequent episodes
  for (let i = 1; i < episodeNumber; i++) {
    currentDate.setDate(currentDate.getDate() + 1);
    while (!publishDayNums.has(currentDate.getDay())) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return currentDate.toLocaleDateString("en-US", {
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
