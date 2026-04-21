"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import BookCard from "@/components/BookCard";
import type { BookMeta, Locale } from "@/lib/types";
import { BookOpen, Clock, ArrowRight } from "lucide-react";

interface HomeClientProps {
  locale: Locale;
  allBooks: BookMeta[];
  categories: { slug: string; title: string; description: string; icon: string }[];
  booksByCategory: Record<string, BookMeta[]>;
}

export default function HomeClient({
  locale,
  allBooks,
  categories,
  booksByCategory,
}: HomeClientProps) {
  const t = useTranslations("home");
  const [recentBooks, setRecentBooks] = useState<BookMeta[]>([]);

  useEffect(() => {
    try {
      const recent: string[] = JSON.parse(
        localStorage.getItem("wordsus-recent") || "[]"
      );
      const found = recent
        .map((key) => {
          const [loc, slug] = key.split(":");
          if (loc !== locale) return null;
          return allBooks.find((b) => b.slug === slug) || null;
        })
        .filter(Boolean) as BookMeta[];
      setRecentBooks(found.slice(0, 4));
    } catch {
      setRecentBooks([]);
    }
  }, [allBooks, locale]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
      {/* ─── Recently read ──────────────────────────────────────── */}
      {recentBooks.length > 0 && (
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
            {recentBooks.map((book) => (
              <BookCard key={book.slug} book={book} locale={locale} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {/* ─── Categories + featured books ────────────────────────── */}
      <section>
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
                <div className="flex items-center justify-between mb-5">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
