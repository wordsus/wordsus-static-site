/**
 * Filesystem helpers — manages sources_today, outputs_today, backups directories.
 */
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { config } from "./config.js";
import { log } from "./logger.js";

// ─── Directory paths ─────────────────────────────────────────────────────────

export const sourcesDir = () => path.join(config.workingDir, "sources_today");
export const outputsDir = () => path.join(config.workingDir, "outputs_today");
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

export function findJsonFile(alias: string): string | null {
  const candidate = getJsonSourcePath(alias);
  return fs.existsSync(candidate) ? candidate : null;
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

  // Zip sources_today
  if (fs.existsSync(sourcesDir()) && fs.readdirSync(sourcesDir()).length > 0) {
    await zipDirectory(sourcesDir(), sourcesZip);
    log("INFO", `Backed up sources_today → ${sourcesZip}`);
  }

  // Zip outputs_today
  if (fs.existsSync(outputsDir()) && fs.readdirSync(outputsDir()).length > 0) {
    await zipDirectory(outputsDir(), outputsZip);
    log("INFO", `Backed up outputs_today → ${outputsZip}`);
  }

  // Clean directories
  fs.rmSync(sourcesDir(), { recursive: true, force: true });
  fs.rmSync(outputsDir(), { recursive: true, force: true });
  fs.mkdirSync(sourcesDir(), { recursive: true });
  fs.mkdirSync(outputsDir(), { recursive: true });
  log("INFO", "Cleaned sources_today and outputs_today");

  // Purge old backups
  purgeOldBackups();
}

function purgeOldBackups(): void {
  const backups = backupsDir();
  if (!fs.existsSync(backups)) return;
  const retentionMs = config.backupRetentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const file of fs.readdirSync(backups)) {
    const filePath = path.join(backups, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > retentionMs) {
      fs.rmSync(filePath, { force: true });
      log("INFO", `Purged old backup: ${file}`);
    }
  }
}
