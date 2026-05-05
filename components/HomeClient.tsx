"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import BookCard from "@/components/BookCard";
import RecentBookCard from "@/components/RecentBookCard";
import type { BookMeta, Locale } from "@/lib/types";
import { BookOpen, Clock, ArrowRight } from "lucide-react";

interface RecentEntry {
  key: string;       // "locale:slug"
  book: BookMeta;
  bookLocale: Locale;
}

interface HomeClientProps {
  locale: Locale;
  allBooks: BookMeta[];             // books in the current locale (for category grid)
  allBooksAllLocales: BookMeta[];   // books from every locale (for Continue Reading)
  categories: { slug: string; title: string; description: string; icon: string; order?: number }[];
  booksByCategory: Record<string, BookMeta[]>;
}

export default function HomeClient({
  locale,
  allBooks,
  allBooksAllLocales,
  categories,
  booksByCategory,
}: HomeClientProps) {
  const t = useTranslations("home");
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);

  // Read all recent entries from localStorage, across all locales
  const loadRecent = () => {
    try {
      const recent: string[] = JSON.parse(
        localStorage.getItem("wordsus-recent") || "[]"
      );
      const found: RecentEntry[] = [];
      for (const key of recent) {
        const colonIdx = key.indexOf(":");
        const loc = key.slice(0, colonIdx) as Locale;
        const slug = key.slice(colonIdx + 1);
        const book = allBooksAllLocales.find(
          (b) => b.slug === slug && b.locale === loc
        );
        if (book) found.push({ key, book, bookLocale: loc });
      }
      setRecentEntries(found);
    } catch {
      setRecentEntries([]);
    }
  };

  useEffect(() => {
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBooksAllLocales]);

  const removeRecent = (keyToRemove: string) => {
    try {
      const recent: string[] = JSON.parse(
        localStorage.getItem("wordsus-recent") || "[]"
      );
      localStorage.setItem(
        "wordsus-recent",
        JSON.stringify(recent.filter((k) => k !== keyToRemove))
      );
      setRecentEntries((prev) => prev.filter((e) => e.key !== keyToRemove));
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
      {/* ─── Continue Reading ──────────────────────────────────────── */}
      {recentEntries.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Clock size={18} className="text-[hsl(var(--primary))]" />
            <div>
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
                {t("recentlyRead")}
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("recentlyReadSubtitle")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentEntries.map(({ key, book, bookLocale }) => (
              <RecentBookCard
                key={key}
                bookKey={key}
                book={book}
                bookLocale={bookLocale}
                currentLocale={locale}
                onRemove={removeRecent}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Categories + featured books ────────────────────────── */}
      <section id="categories">
        <div className="flex items-center gap-2 mb-8">
          <BookOpen size={18} className="text-[hsl(var(--primary))]" />
          <div>
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
              {t("categories")}
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {t("categoriesSubtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-14">
          {categories.map((cat) => {
            const books = (booksByCategory[cat.slug] || []).slice(0, 6);
            if (books.length === 0) return null;
            return (
              <div key={cat.slug}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="font-semibold text-[hsl(var(--foreground))]">
                      {cat.title}
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {cat.description}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/${cat.slug}`}
                    className="flex items-center gap-1 text-sm text-[hsl(var(--primary))] hover:underline shrink-0"
                  >
                    {t("viewAll")}
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {books.map((book) => (
                    <BookCard key={book.slug} book={book} locale={locale} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Empty state ────────────────────────────────────────── */}
      {categories.length === 0 && (
        <div className="text-center py-24 text-[hsl(var(--muted-foreground))]">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">{t("noRecentBooks")}</p>
          <Link
            href={`/${locale}`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary)/0.85)] transition-colors"
          >
            {t("browseNow")}
          </Link>
        </div>
      )}
    </div>
  );
}
