"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Heart, BookOpen, ArrowLeft } from "lucide-react";
import type { Locale, BookMeta } from "@/lib/types";
import BookCard from "@/components/BookCard";

interface FavoritesClientProps {
  locale: Locale;
  allBooks: BookMeta[];
}

export default function FavoritesClient({ locale, allBooks }: FavoritesClientProps) {
  const t = useTranslations("favorites");
  const [favorites, setFavorites] = useState<BookMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const favKeys: string[] = JSON.parse(
        localStorage.getItem("wordsus-favorites") || "[]"
      );
      const books = favKeys
        .map((key) => {
          const [loc, slug] = key.split(":");
          if (loc !== locale) return null;
          return allBooks.find((b) => b.slug === slug) || null;
        })
        .filter(Boolean) as BookMeta[];
      setFavorites(books);
    } catch {
      setFavorites([]);
    } finally {
      setLoaded(true);
    }
  }, [allBooks, locale]);

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

      {!loaded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[hsl(var(--muted))] animate-pulse aspect-[3/4]"
            />
          ))}
        </div>
      ) : favorites.length === 0 ? (
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
            Browse Books
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {favorites.map((book) => (
            <BookCard key={book.slug} book={book} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
