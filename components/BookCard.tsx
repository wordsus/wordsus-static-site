"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Heart, BookOpen } from "lucide-react";
import type { BookMeta, Locale } from "@/lib/types";
import { clsx } from "clsx";

interface BookCardProps {
  book: BookMeta;
  locale: Locale;
  variant?: "default" | "compact";
}

export default function BookCard({
  book,
  locale,
  variant = "default",
}: BookCardProps) {
  const t = useTranslations("book");
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    try {
      const favs: string[] = JSON.parse(
        localStorage.getItem("wordsus-favorites") || "[]"
      );
      setIsFav(favs.includes(`${locale}:${book.slug}`));
    } catch {
      setIsFav(false);
    }
  }, [book.slug, locale]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const key = `${locale}:${book.slug}`;
      const favs: string[] = JSON.parse(
        localStorage.getItem("wordsus-favorites") || "[]"
      );
      const next = isFav ? favs.filter((f) => f !== key) : [...favs, key];
      localStorage.setItem("wordsus-favorites", JSON.stringify(next));
      setIsFav(!isFav);
    } catch {
      // ignore
    }
  };

  if (variant === "compact") {
    return (
      <Link
        href={`/${locale}/${book.slug}`}
        className="group flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--accent)/0.3)] transition-all duration-200"
      >
        <div className="w-10 h-14 rounded-lg overflow-hidden bg-[hsl(var(--muted))] shrink-0 flex items-center justify-center">
          {book.cover ? (
            <Image
              src={book.cover}
              alt={book.title}
              width={40}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen size={16} className="text-[hsl(var(--muted-foreground))]" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate group-hover:text-[hsl(var(--primary))] transition-colors">
            {book.title}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
            {book.author}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/${book.slug}`}
      className="group relative flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden hover:border-[hsl(var(--primary)/0.5)] hover:shadow-lg hover:shadow-[hsl(var(--primary)/0.08)] transition-all duration-250"
    >
      {/* Cover */}
      <div className="relative aspect-3/4 bg-linear-to-br from-[hsl(var(--muted))] to-[hsl(var(--accent))] overflow-hidden">
        {book.cover ? (
          <Image
            src={book.cover}
            alt={book.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen size={40} className="text-[hsl(var(--primary)/0.4)]" />
          </div>
        )}

        {/* Favorite button */}
        <button
          id={`fav-${book.slug}`}
          onClick={toggleFavorite}
          aria-label={isFav ? t("removeFromFavorites") : t("addToFavorites")}
          className={clsx(
            "absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-all duration-200 z-10",
            isFav
              ? "bg-red-500/90 text-white"
              : "bg-black/30 text-white hover:bg-black/50"
          )}
        >
          <Heart size={14} fill={isFav ? "currentColor" : "none"} />
        </button>

        {/* Category tag */}
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-medium">
            {book.category}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-1">
        <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] leading-snug group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {t("by")} {book.author}
        </p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mt-1">
          {book.description}
        </p>
        <div className="mt-auto pt-2 flex items-center gap-1 flex-wrap">
          {book.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[0.65rem] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
