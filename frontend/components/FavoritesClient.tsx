"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Heart, BookOpen, ArrowLeft } from "lucide-react";
import type { Locale, BookMeta } from "@/lib/types";
import BookCard from "@/components/BookCard";

interface FavoritesClientProps {
  locale: Locale;
  allBooksAllLocales: BookMeta[];
}

// Friendly locale label map — populated from translations at render time
const LOCALE_ORDER: Locale[] = ["es", "en"];

export default function FavoritesClient({ locale, allBooksAllLocales }: FavoritesClientProps) {
  const t = useTranslations("favorites");
  const tLang = useTranslations("language");

  // Map locale -> BookMeta[] for favorites
  const [byLocale, setByLocale] = useState<Record<string, BookMeta[]>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const favKeys: string[] = JSON.parse(
        localStorage.getItem("wordsus-favorites") || "[]"
      );

      // Group by locale, preserving the order the user favourited them (most recent first)
      const grouped: Record<string, BookMeta[]> = {};
      for (const key of favKeys) {
        const colonIdx = key.indexOf(":");
        const loc = key.slice(0, colonIdx) as Locale;
        const slug = key.slice(colonIdx + 1);
        const book = allBooksAllLocales.find(
          (b) => b.slug === slug && b.locale === loc
        );
        if (book) {
          if (!grouped[loc]) grouped[loc] = [];
          grouped[loc].push(book);
        }
      }
      setByLocale(grouped);
    } catch {
      setByLocale({});
    } finally {
      setLoaded(true);
    }
  }, [allBooksAllLocales]);

  const totalCount = Object.values(byLocale).reduce((acc, arr) => acc + arr.length, 0);

  // Locale sections ordered by LOCALE_ORDER, then any remaining locales
  const orderedLocales = [
    ...LOCALE_ORDER.filter((l) => byLocale[l]?.length),
    ...Object.keys(byLocale).filter(
      (l) => !LOCALE_ORDER.includes(l as Locale) && byLocale[l]?.length
    ),
  ] as Locale[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href={`/${locale}`}
        className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Home
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Heart size={20} className="text-red-500" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {t("title")}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Loading skeleton */}
      {!loaded ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[hsl(var(--muted))] animate-pulse aspect-3/4"
            />
          ))}
        </div>
      ) : totalCount === 0 ? (
        /* Empty state */
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-[hsl(var(--muted-foreground))]" />
          </div>
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
            {t("empty")}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            {t("emptySubtitle")}
          </p>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary)/0.85)] transition-colors"
          >
            <BookOpen size={14} />
            {t("browseBooks")}
          </Link>
        </div>
      ) : (
        /* Sections per locale */
        <div className="space-y-12">
          {orderedLocales.map((loc) => {
            const books = byLocale[loc];
            // Friendly locale name from translations; fall back to the code itself
            let localeLabel: string;
            try {
              localeLabel = tLang(loc);
            } catch {
              localeLabel = loc.toUpperCase();
            }

            return (
              <section key={loc}>
                {/* Section header — only show if there are multiple locale sections */}
                {orderedLocales.length > 1 && (
                  <div className="flex items-center gap-3 mb-5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
                      {loc}
                    </span>
                    <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">
                      {localeLabel}
                    </h2>
                    <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {books.length} {books.length === 1 ? t("bookSingular") : t("bookPlural")}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {books.map((book) => (
                    <BookCard key={`${loc}:${book.slug}`} book={book} locale={loc} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
