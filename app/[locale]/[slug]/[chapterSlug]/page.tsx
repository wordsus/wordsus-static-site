import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  getAllBooks,
  getBookBySlug,
  getChapterContent,
} from "@/lib/content";
import type { Locale } from "@/lib/types";
import type { Metadata } from "next";
import BookClient from "@/components/BookClient";

type Props = {
  params: Promise<{ locale: string; slug: string; chapterSlug: string }>;
};

export function generateStaticParams() {
  const paths: { locale: string; slug: string; chapterSlug: string }[] = [];

  for (const locale of routing.locales) {
    const books = getAllBooks(locale as Locale);
    for (const book of books) {
      for (const chapter of book.chapters) {
        paths.push({ locale, slug: book.slug, chapterSlug: chapter.slug });
      }
    }
  }

  return paths;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, chapterSlug } = await params;
  const loc = locale as Locale;

  const book = getBookBySlug(slug, loc);
  if (!book) return { title: "Not Found" };

  const chapter = book.chapters.find((c) => c.slug === chapterSlug);
  if (!chapter) return { title: book.title };

  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations({ locale, namespace: "book" });

  const description = chapter.description || t("chapterDescription", {
    order: chapter.order,
    chapterTitle: chapter.title,
    bookTitle: book.title,
  });

  return {
    title: `${chapter.title} - ${book.title}`,
    description,
  };
}

export default async function ChapterPage({ params }: Props) {
  const { locale, slug, chapterSlug } = await params;
  const loc = locale as Locale;
  setRequestLocale(locale);

  const book = getBookBySlug(slug, loc);
  if (!book) notFound();

  const chapter = book.chapters.find((c) => c.slug === chapterSlug);
  if (!chapter) notFound();

  const { html, toc } = await getChapterContent(book.slug, chapterSlug, loc);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: chapter.title,
    author: {
      "@type": "Person",
      name: book.author,
    },
    isPartOf: {
      "@type": "Book",
      name: book.title,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://wordsus.org"}/${locale}/${book.slug}`,
    },
    inLanguage: locale,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://wordsus.org"}/${locale}/${book.slug}/${chapter.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BookClient
        book={book}
        locale={loc}
        initialChapterSlug={chapterSlug}
        initialChapterHtml={html}
        initialToc={toc}
        allChapers={book.chapters}
      />
    </>
  );
}
