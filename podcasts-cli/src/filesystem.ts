/**
 * Filesystem helpers — manages sources-today, outputs-today, backups directories.
 */
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { config } from "./config.js";
import { log } from "./logger.js";

// ─── Directory paths ─────────────────────────────────────────────────────────

export const sourcesDir = () => path.join(config.workingDir, "sources-today");
export const defaultSourcesDir = () => path.join(config.workingDir, "default-sources");
export const outputsDir = () => path.join(config.workingDir, "outputs-today");
export const backupsDir = () => path.join(config.workingDir, "backups");
export const logsDir = () => path.join(config.workingDir, "logs");

// ─── Bootstrap ───────────────────────────────────────────────────────────────

export function ensureWorkingDirs(): void {
  for (const dir of [sourcesDir(), outputsDir(), backupsDir(), logsDir()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── Source file paths ───────────────────────────────────────────────────────

export function getJsonSourcePath(alias: string): string {
  return path.join(sourcesDir(), `${alias}.json`);
}

export function findAudioFile(alias: string): string | null {
  const dir = sourcesDir();
  for (const ext of ["wav", "mp3", "m4a", "ogg", "flac"]) {
    const candidate = path.join(dir, `${alias}.${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function findImageFile(alias: string): string | null {
  const dir = sourcesDir();
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const candidate = path.join(dir, `${alias}.${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function findVideoFile(alias: string): string | null {
  const dir = sourcesDir();
  const candidate = path.join(dir, `${alias}.mp4`);
  return fs.existsSync(candidate) ? candidate : null;
}

export function findBgFile(alias: string): string | null {
  const sourcesBg = findBgFileInDir(sourcesDir(), alias);
  if (sourcesBg) return sourcesBg;

  const defaultBg = findBgFileInDir(defaultSourcesDir(), alias);
  if (defaultBg) return defaultBg;

  return null;
}

function findBgFileInDir(dir: string, alias: string): string | null {
  if (!fs.existsSync(dir)) return null;

  // Check video first
  const videoCandidate = path.join(dir, `${alias}-bg.mp4`);
  if (fs.existsSync(videoCandidate)) return videoCandidate;

  // Check images
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const candidate = path.join(dir, `${alias}-bg.${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

export function findJsonFile(alias: string): string | null {
  const candidate = getJsonSourcePath(alias);
  return fs.existsSync(candidate) ? candidate : null;
}

// ─── Episode Discovery ───────────────────────────────────────────────────────

export interface EpisodeDiscoveryInfo {
  alias: string;
  jsonPath: string;
  order: number;
}

export function discoverEpisodes(): EpisodeDiscoveryInfo[] {
  const dir = sourcesDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const episodes: EpisodeDiscoveryInfo[] = [];

  for (const file of files) {
    if (file.endsWith(".json")) {
      const alias = path.basename(file, ".json");
      const jsonPath = path.join(dir, file);

      // Basic processable check
      const hasAudio = findAudioFile(alias) !== null;
      const hasImage = findImageFile(alias) !== null;

      if (hasAudio && hasImage) {
        try {
          const content = fs.readFileSync(jsonPath, "utf-8");
          const data = JSON.parse(content);
          episodes.push({
            alias,
            jsonPath,
            order: data.order ?? 0,
          });
        } catch (e) {
          log("ERROR", `Failed to read metadata for ${alias}: ${e}`);
        }
      }
    }
  }

  return episodes.sort((a, b) => (a.order - b.order) || a.alias.localeCompare(b.alias));
}

// ─── Readiness check ─────────────────────────────────────────────────────────

export interface ReadinessResult {
  alias: string;
  hasAudio: boolean;
  hasImage: boolean;
  hasJson: boolean;
  ready: boolean;
}

export function checkReadiness(aliases: string[]): ReadinessResult[] {
  return aliases.map((alias) => {
    const hasAudio = findAudioFile(alias) !== null;
    const hasImage = findImageFile(alias) !== null;
    const hasJson = findJsonFile(alias) !== null;
    return {
      alias,
      hasAudio,
      hasImage,
      hasJson,
      ready: hasAudio && hasImage && hasJson,
    };
  });
}

// ─── Backup ───────────────────────────────────────────────────────────────────

function getBackupTimestamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}-${min}`;
}

async function zipDirectory(sourceDir: string, outZip: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outZip);
    const archive = archiver("zip", { zlib: { level: 6 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

export async function backupAndClean(): Promise<void> {
  const timestamp = getBackupTimestamp();
  const backups = backupsDir();
  fs.mkdirSync(backups, { recursive: true });

  const sourcesZip = path.join(backups, `sources_${timestamp}.zip`);
  const outputsZip = path.join(backups, `outputs_${timestamp}.zip`);

  // Zip sources-today
  if (fs.existsSync(sourcesDir()) && fs.readdirSync(sourcesDir()).length > 0) {
    await zipDirectory(sourcesDir(), sourcesZip);
    log("INFO", `Backed up sources-today → ${sourcesZip}`);
  }

  // Zip outputs-today
  if (fs.existsSync(outputsDir()) && fs.readdirSync(outputsDir()).length > 0) {
    await zipDirectory(outputsDir(), outputsZip);
    log("INFO", `Backed up outputs-today → ${outputsZip}`);
  }

  // Clean directories
  fs.rmSync(sourcesDir(), { recursive: true, force: true });
  fs.rmSync(outputsDir(), { recursive: true, force: true });
  fs.mkdirSync(sourcesDir(), { recursive: true });
  fs.mkdirSync(outputsDir(), { recursive: true });
  log("INFO", "Cleaned sources-today and outputs-today");

  // Purge old backups
  purgeOldBackups();
}

export function purgeOldBackups(): void {
  const backups = backupsDir();
  if (!fs.existsSync(backups)) return;

  const files = fs.readdirSync(backups);

  // Extract the date portion (YYYY-MM-DD) from backup filenames.
  // Expected format: sources_YYYY-MM-DD_HH-mm.zip or outputs_YYYY-MM-DD_HH-mm.zip
  const dateRegex = /^(?:sources|outputs)_(\d{4}-\d{2}-\d{2})_\d{2}-\d{2}\.zip$/;

  // Collect all distinct generation dates across all backup files.
  const distinctDates = new Set<string>();
  for (const file of files) {
    const match = dateRegex.exec(file);
    if (match) {
      distinctDates.add(match[1]);
    }
  }

  // Sort dates descending (most recent first) and keep only the N most recent.
  const sortedDates = Array.from(distinctDates).sort((a, b) => b.localeCompare(a));
  const retainedDates = new Set(sortedDates.slice(0, config.backupRetentionSessions));

  // Delete any backup file whose date is not in the retained set.
  for (const file of files) {
    const match = dateRegex.exec(file);
    if (match && !retainedDates.has(match[1])) {
      const filePath = path.join(backups, file);
      fs.rmSync(filePath, { force: true });
      log("INFO", `Purged old backup: ${file}`);
    }
  }
}

export function saveLastEpisode(episode: number): void {
  const dir = logsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const logFile = path.join(dir, "last-episode.log");
  fs.writeFileSync(logFile, episode.toString(), "utf-8");
  log("INFO", `Saved last episode (${episode}) to ${logFile}`);
}

export function getLastEpisode(): number | null {
  const logFile = path.join(logsDir(), "last-episode.log");
  if (!fs.existsSync(logFile)) return null;
  try {
    const content = fs.readFileSync(logFile, "utf-8").trim();
    const num = parseInt(content, 10);
    return isNaN(num) ? null : num;
  } catch (e) {
    return null;
  }
}
