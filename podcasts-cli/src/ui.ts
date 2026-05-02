/**
 * UI helpers — shared styled primitives for terminal output.
 */
import chalk from "chalk";
import boxen from "boxen";

// ─── Brand palette ───────────────────────────────────────────────────────────

export const C = {
  primary: chalk.hex("#A78BFA"),      // violet
  accent: chalk.hex("#34D399"),       // emerald
  warn: chalk.hex("#FBBF24"),         // amber
  danger: chalk.hex("#F87171"),       // rose
  muted: chalk.hex("#6B7280"),        // gray
  bold: chalk.bold,
  dim: chalk.dim,
  white: chalk.white,
  cyan: chalk.cyan,
  magenta: chalk.magenta,
};

// ─── Banner ──────────────────────────────────────────────────────────────────

export function printBanner(): void {
  const title = C.primary.bold("  🎙  Podcasts CLI");
  const sub = C.muted("  wordsus.com · podcast production assistant");
  console.log(
    boxen(`${title}\n${sub}`, {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      borderStyle: "round",
      borderColor: "magenta",
      dimBorder: false,
    })
  );
}

// ─── Step header ─────────────────────────────────────────────────────────────

export function printStep(num: number, label: string): void {
  console.log("\n" + C.primary.bold(`  ── Step ${num} ──`) + C.white.bold(` ${label}`));
}

// ─── Success / error / info ──────────────────────────────────────────────────

export function ok(msg: string): void {
  console.log(C.accent("  ✔  ") + C.white(msg));
}

export function warn(msg: string): void {
  console.log(C.warn("  ⚠  ") + C.white(msg));
}

export function err(msg: string): void {
  console.log(C.danger("  ✖  ") + C.white(msg));
}

export function info(msg: string): void {
  console.log(C.muted("  ·  ") + C.white(msg));
}

// ─── Section divider ─────────────────────────────────────────────────────────

export function divider(): void {
  console.log(C.muted("  " + "─".repeat(52)));
}

// ─── Clipboard notice ────────────────────────────────────────────────────────

export function clipboardNotice(label: string, value: string): void {
  console.log(
    C.accent("  📋 Copied: ") + C.primary.bold(label)
  );
  console.log(C.muted("     ") + C.dim(value.slice(0, 80) + (value.length > 80 ? "…" : "")));
}

// ─── Readiness table ─────────────────────────────────────────────────────────

import type { ReadinessResult } from "./filesystem.js";

export function printReadinessTable(results: ReadinessResult[]): void {
  console.log();
  const header =
    C.muted("  Alias".padEnd(16)) +
    C.muted("Audio".padEnd(10)) +
    C.muted("Image".padEnd(10)) +
    C.muted("JSON".padEnd(10)) +
    C.muted("Ready");
  console.log(header);
  console.log(C.muted("  " + "─".repeat(50)));
  for (const r of results) {
    const tick = (v: boolean) => (v ? C.accent("✔") : C.danger("✖"));
    const ready = r.ready ? C.accent.bold("  YES") : C.danger.bold("   NO");
    console.log(
      `  ${C.white(r.alias.padEnd(14))}` +
      `${tick(r.hasAudio).padEnd(18)}` +
      `${tick(r.hasImage).padEnd(18)}` +
      `${tick(r.hasJson).padEnd(18)}` +
      ready
    );
  }
  console.log();
}
