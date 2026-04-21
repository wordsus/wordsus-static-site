import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  getAllBooks,
  getAllCategories,
  getBookBySlug,
  getCategoryBySlug,
  getChapterContent,
  buildSearchIndex,
} from "@/lib/content";
import type { Locale } from "@/lib/types";
import type { Metadata } from "next";
import BookClient from "@/components/BookClient";
import CategoryPage from "@/components/CategoryPage";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// Generate all static paths for books and categories
export function generateStaticParams() {
  const paths: { locale: string; slug: string }[] = [];

  for (const locale of routing.locales) {
    // Books
    const books = getAllBooks(locale as Locale);
    for (const book of books) {
      paths.push({ locale, slug: book.slug });
    }
    // Categories
    const categories = getAllCategories(locale as Locale);
    for (const cat of categories) {
      paths.push({ locale, slug: cat.slug });
    }
  }

  return paths;
}

// Generate static search JSON files at build time
function generateSearchIndex() {
  try {
    const publicDir = join(process.cwd(), "public", "search-index");
    mkdirSync(publicDir, { recursive: true });

    for (const locale of routing.locales) {
      const index = buildSearchIndex(locale as Locale);
      writeFileSync(
        join(publicDir, `${locale}.json`),
        JSON.stringify(index),
        "utf-8"
      );
    }
  } catch {
    // In dev, might fail; ignored
  }
}

// Generate static chapter JSON for client-side navigation
async function generateChapterFiles() {
  try {
    for (const locale of routing.locales) {
      const books = getAllBooks(locale as Locale);
      for (const book of books) {
        for (const chapter of book.chapters) {
          const { html, toc } = await getChapterContent(
            book.slug,
            chapter.slug,
            locale as Locale
          );
          const dir = join(
            process.cwd(),
            "public",
            "chapter-content",
            locale,
            book.slug
          );
          mkdirSync(dir, { recursive: true });
          writeFileSync(
            join(dir, `${chapter.slug}.json`),
            JSON.stringify({ html, toc }),
            "utf-8"
          );
        }
      }
    }
  } catch {
    // Ignored in dev
  }
}

// Trigger file generation (runs at build time via generateStaticParams)
let generated = false;
async function ensureStaticFiles() {
  if (generated) return;
  generated = true;
  generateSearchIndex();
  await generateChapterFiles();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = locale as Locale;

  // Check if it's a book
  const book = getBookBySlug(slug, loc);
  if (book) {
    return {
      title: book.title,
      description: book.description,
      openGraph: {
        title: book.title,
        description: book.description,
        images: book.cover ? [{ url: book.cover }] : undefined,
        locale: locale,
        type: "book",
      },
      alternates: {
        languages: {
          [locale]: `/${locale}/${slug}`,
        },
      },
    };
  }

  // Check if it's a category
  const category = getCategoryBySlug(slug, loc);
  if (category) {
    return {
      title: category.title,
      description: category.description,
    };
  }

  return { title: "Not Found" };
}

export default async function SlugPage({ params }: Props) {
  const { locale, slug } = await params;
  const loc = locale as Locale;
  setRequestLocale(locale);

  await ensureStaticFiles();

  // Try as a book
  const book = getBookBySlug(slug, loc);
  if (book && book.chapters.length > 0) {
    // Determine which chapter to show (first chapter; client will override from localStorage)
    const firstChapter = book.chapters[0];
    const { html, toc } = await getChapterContent(
      book.slug,
      firstChapter.slug,
      loc
    );

    return (
      <BookClient
        book={book}
        locale={loc}
        initialChapterSlug={firstChapter.slug}
        initialChapterHtml={html}
        initialToc={toc}
        allChapers={book.chapters}
      />
    );
  }

  // Try as a category
  const category = getCategoryBySlug(slug, loc);
  if (category) {
    const { getBooksByCategory } = await import("@/lib/content");
    const books = getBooksByCategory(slug, loc);
    return <CategoryPage category={category} books={books} locale={loc} />;
  }

  notFound();
}
