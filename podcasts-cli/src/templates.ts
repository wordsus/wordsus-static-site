/**
 * Template engine — resolves and renders prompt templates.
 *
 * Resolution priority:
 *   1. podcasts-cli/templates/<alias>/<template-name>.md  (book-specific override)
 *   2. podcasts-cli/templates/<template-name>.md           (general)
 *
 * Supported variables (replaced with {{VARIABLE_NAME}} syntax):
 *   {{PODCAST_NAME}}      → book.podcast
 *   {{EPISODE_TITLE}}     → chapter.title
 *   {{EPISODE_NUMBER}}    → chapter.order
 *   {{IMAGE_TITLE}}       → first part of split title
 *   {{IMAGE_SUBTITLE}}    → second part of split title (after separator)
 *   {{ARTICLE_URL}}       → public URL of the article
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { BookConfig } from "./books.js";
import type { Chapter } from "./types.js";
import { buildArticleUrl, splitTitle } from "./content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(__dirname, "../templates");

export type TemplateName = "audio-prompt" | "image-prompt";

/**
 * Resolves the path to a template, checking book-specific overrides first.
 */
export function resolveTemplatePath(book: BookConfig, name: TemplateName): string {
  const overridePath = path.join(templatesDir, book.alias, `${name}.md`);
  if (fs.existsSync(overridePath)) return overridePath;
  const generalPath = path.join(templatesDir, `${name}.md`);
  if (!fs.existsSync(generalPath)) {
    throw new Error(
      `Template "${name}.md" not found. Create it at:\n  ${generalPath}`
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
  const { title: imageTitle, subtitle: imageSubtitle } = splitTitle(chapter.title);
  const articleUrl = buildArticleUrl(book, chapter);

  return raw
    .replaceAll("{{PODCAST_NAME}}", book.podcast)
    .replaceAll("{{EPISODE_TITLE}}", chapter.title)
    .replaceAll("{{EPISODE_NUMBER}}", String(chapter.order))
    .replaceAll("{{IMAGE_TITLE}}", imageTitle)
    .replaceAll("{{IMAGE_SUBTITLE}}", imageSubtitle)
    .replaceAll("{{ARTICLE_URL}}", articleUrl);
}
