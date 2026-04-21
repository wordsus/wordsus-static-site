import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import type { BookMeta, CategoryMeta, TocItem, Locale } from "./types";

const contentDir = path.join(process.cwd(), "content");

// ─── Books ───────────────────────────────────────────────────────────────────

export function getAllBooks(locale: Locale): BookMeta[] {
  const booksDir = path.join(contentDir, locale, "books");
  if (!fs.existsSync(booksDir)) return [];

  const bookDirs = fs
    .readdirSync(booksDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  return bookDirs
    .map((dir) => {
      const bookJsonPath = path.join(booksDir, dir, "book.json");
      if (!fs.existsSync(bookJsonPath)) return null;
      const raw = fs.readFileSync(bookJsonPath, "utf-8");
      return JSON.parse(raw) as BookMeta;
    })
    .filter(Boolean) as BookMeta[];
}

export function getBookBySlug(slug: string, locale: Locale): BookMeta | null {
  const bookJsonPath = path.join(contentDir, locale, "books", slug, "book.json");
  if (!fs.existsSync(bookJsonPath)) return null;
  const raw = fs.readFileSync(bookJsonPath, "utf-8");
  return JSON.parse(raw) as BookMeta;
}

export function getFeaturedBooks(locale: Locale, limit = 6): BookMeta[] {
  return getAllBooks(locale)
    .filter((b) => b.featured)
    .slice(0, limit);
}

export function getBooksByCategory(category: string, locale: Locale): BookMeta[] {
  return getAllBooks(locale).filter((b) => b.category === category);
}

// ─── Chapters ────────────────────────────────────────────────────────────────

export async function getChapterContent(
  bookSlug: string,
  chapterSlug: string,
  locale: Locale
): Promise<{ html: string; toc: TocItem[] }> {
  let mdPath = path.join(
    contentDir,
    locale,
    "books",
    bookSlug,
    `${chapterSlug}.md`
  );

  // If the file doesn't exist, try to find one with an order prefix (e.g., "1-slug.md")
  if (!fs.existsSync(mdPath)) {
    const bookDir = path.join(contentDir, locale, "books", bookSlug);
    if (fs.existsSync(bookDir)) {
      const files = fs.readdirSync(bookDir);
      const matchingFile = files.find(f => f.endsWith(`-${chapterSlug}.md`));
      if (matchingFile) {
        mdPath = path.join(bookDir, matchingFile);
      }
    }
  }

  if (!fs.existsSync(mdPath)) {
    return { html: "<p>Chapter not found.</p>", toc: [] };
  }

  const raw = fs.readFileSync(mdPath, "utf-8");

  // Extract TOC from headings before processing (strip fenced code blocks first)
  const toc: TocItem[] = [];
  const contentWithoutFencedCode = raw.replace(/```[\s\S]*?```/g, "");
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(contentWithoutFencedCode)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // Generate ID: remove backticks from inline code then slugify
    const id = text
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    if (level <= 3) {
      toc.push({ id, text, level });
    }
  }

  // Process Markdown to HTML
  const result = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(raw);

  // Add IDs to headings in HTML
  let html = result.toString();
  html = html.replace(/<(h[1-3])>(.*?)<\/h[1-3]>/g, (_, tag, content) => {
    const id = content
      .replace(/<[^>]+>/g, "") // Strip HTML tags like <code>
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    return `<${tag} id="${id}">${content}</${tag}>`;
  });

  return { html, toc };
}

// ─── Categories ──────────────────────────────────────────────────────────────

export function getAllCategories(locale: Locale): CategoryMeta[] {
  const categoriesDir = path.join(contentDir, locale, "categories");
  if (!fs.existsSync(categoriesDir)) return [];

  return fs
    .readdirSync(categoriesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(categoriesDir, f), "utf-8");
      return JSON.parse(raw) as CategoryMeta;
    });
}

export function getCategoryBySlug(
  slug: string,
  locale: Locale
): CategoryMeta | null {
  const catPath = path.join(contentDir, locale, "categories", `${slug}.json`);
  if (!fs.existsSync(catPath)) return null;
  const raw = fs.readFileSync(catPath, "utf-8");
  return JSON.parse(raw) as CategoryMeta;
}

// ─── Search index ────────────────────────────────────────────────────────────

export function buildSearchIndex(locale: Locale) {
  const books = getAllBooks(locale);
  return books.map((b) => ({
    slug: b.slug,
    locale: b.locale,
    title: b.title,
    author: b.author,
    description: b.description,
    cover: b.cover,
    category: b.category,
    tags: b.tags,
    featured: b.featured,
  }));
}
