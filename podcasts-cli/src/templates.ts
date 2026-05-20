/**
 * Template engine — resolves and renders prompt templates.
 *
 * Resolution priority (first match wins):
 *   1. podcasts-cli/templates/<alias>/<name>-<locale>.txt  (book-specific locale override)
 *   2. podcasts-cli/templates/<alias>/<name>.txt           (book-specific general override)
 *   3. podcasts-cli/templates/<name>-<locale>.txt          (general locale override)
 *   4. podcasts-cli/templates/<name>.txt                   (general fallback)
 *
 * Supported variables (replaced with {{VARIABLE_NAME}} syntax):
 *   {{PODCAST_NAME}}        → book.podcast
 *   {{EPISODE_TITLE}}       → chapter.title
 *   {{EPISODE_NUMBER}}      → chapter.order
 *   {{EPISODE_DESCRIPTION}} → chapter.description (empty string if not set)
 *   {{THUMBNAIL_TITLE}}     → chapter.thumbnailTitle (falls back to EPISODE_TITLE if not set)
 *   {{ARTICLE_URL}}         → public URL of the article
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { BookConfig } from "./books.js";
import type { Chapter } from "./types.js";
import { buildArticleUrl } from "./content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(__dirname, "../templates");

export type TemplateName = "audio-prompt" | "image-prompt";

/**
 * Resolves the path to a template for the given book, checking locale-specific
 * and book-specific overrides before falling back to the general template.
 *
 * Priority (first existing file wins):
 *   1. templates/<alias>/<name>-<locale>.txt
 *   2. templates/<alias>/<name>.txt
 *   3. templates/<name>-<locale>.txt
 *   4. templates/<name>.txt
 */
export function resolveTemplatePath(book: BookConfig, name: TemplateName): string {
  const localeSuffix = `-${book.locale}`;

  // 1. Book-specific locale override
  const aliasLocalePath = path.join(templatesDir, book.alias, `${name}${localeSuffix}.txt`);
  if (fs.existsSync(aliasLocalePath)) return aliasLocalePath;

  // 2. Book-specific general override
  const aliasPath = path.join(templatesDir, book.alias, `${name}.txt`);
  if (fs.existsSync(aliasPath)) return aliasPath;

  // 3. General locale override
  const generalLocalePath = path.join(templatesDir, `${name}${localeSuffix}.txt`);
  if (fs.existsSync(generalLocalePath)) return generalLocalePath;

  // 4. General fallback
  const generalPath = path.join(templatesDir, `${name}.txt`);
  if (!fs.existsSync(generalPath)) {
    throw new Error(
      `Template "${name}.txt" not found. Create it at:\n  ${generalPath}`
    );
  }
  return generalPath;
}

/**
 * Renders a template for a specific book chapter, replacing all variables.
 */
export function renderTemplate(
  book: BookConfig,
  chapter: Chapter,
  name: TemplateName
): string {
  const templatePath = resolveTemplatePath(book, name);
  const raw = fs.readFileSync(templatePath, "utf-8");
  const articleUrl = buildArticleUrl(book, chapter);
  const thumbnailTitle = chapter.thumbnailTitle || chapter.title;

  return raw
    .replaceAll("{{PODCAST_NAME}}", book.podcast)
    .replaceAll("{{EPISODE_TITLE}}", chapter.title)
    .replaceAll("{{EPISODE_NUMBER}}", String(chapter.order))
    .replaceAll("{{EPISODE_DESCRIPTION}}", chapter.description ?? "")
    .replaceAll("{{THUMBNAIL_TITLE}}", thumbnailTitle)
    .replaceAll("{{ARTICLE_URL}}", articleUrl);
}
