"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next-image-export-optimizer";
import { useTranslations } from "next-intl";
import { BookOpen, X } from "lucide-react";
import type { BookMeta, Locale } from "@/lib/types";
import { getSavedChapter, calcProgress } from "@/lib/readingProgress";

interface RecentBookCardProps {
  bookKey: string;       // "locale:slug" — used as React key and for removal
  book: BookMeta;
  bookLocale: Locale;
  currentLocale: Locale;
  onRemove: (key: string) => void;
}

export default function RecentBookCard({
  bookKey,
  book,
  bookLocale,
  currentLocale,
  onRemove,
}: RecentBookCardProps) {
  const t = useTranslations("book");
  const tHome = useTranslations("home");

  const [progress, setProgress] = useState<number | null>(null);
  const [savedChapterTitle, setSavedChapterTitle] = useState<string | null>(null);
  const [href, setHref] = useState(`/${bookLocale}/${book.slug}`);

  useEffect(() => {
    const savedSlug = getSavedChapter(bookLocale, book.slug);
    if (savedSlug && book.chapters.length > 0) {
      const savedChapter = book.chapters.find((ch) => ch.slug === savedSlug);
      if (savedChapter) {
        setProgress(calcProgress(savedChapter.order, book.chapters.length));
        setSavedChapterTitle(savedChapter.title);
        setHref(`/${bookLocale}/${book.slug}/${savedSlug}`);
      }
    }
  }, [book.slug, book.chapters, bookLocale]);

  return (
    <div className="relative group/item">
      {/* Dismiss button */}
      <button
        onClick={() => onRemove(bookKey)}
        aria-label={tHome("removeFromReading")}
        title={tHome("removeFromReading")}
        className="absolute top-2 right-2 z-10 p-1 rounded-full opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity bg-[hsl(var(--muted))] hover:bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
      >
        <X size={12} />
      </button>

      <Link
        href={href}
        className="group flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--accent)/0.3)] transition-all duration-200 pr-10"
      >
        {/* Cover thumbnail */}
        <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-[hsl(var(--muted))] shrink-0 flex items-center justify-center shadow-xs">
          {book.cover ? (
            <Image
              src={book.cover}
              alt={book.title}
              width={48}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen size={16} className="text-[hsl(var(--muted-foreground))]" />
          )}

          {/* Locale badge — bottom-right of cover, only when different locale */}
          {bookLocale !== currentLocale && (
            <span className="absolute bottom-0 right-0 px-1 py-0.5 rounded-tl-md text-[0.55rem] font-bold uppercase tracking-wider bg-[hsl(var(--primary))] text-white z-10">
              {bookLocale}
            </span>
          )}

          {/* Progress strip on cover image */}
          {progress !== null && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30">
              <div
                className="h-full bg-[hsl(var(--primary))] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Text info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate group-hover:text-[hsl(var(--primary))] transition-colors">
            {book.title}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
            {book.author}
          </p>

          {/* Reading progress bar */}
          {progress !== null && (
            <div className="mt-2 space-y-1">
              <div className="relative h-1.5 w-full rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[hsl(var(--primary)/0.6)] to-[hsl(var(--primary))] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                {savedChapterTitle ? (
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate max-w-[80%]">
                    {t("lastRead")}: <span className="font-medium text-[hsl(var(--foreground))]">{savedChapterTitle}</span>
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-[10px] font-bold text-[hsl(var(--primary))] shrink-0 ml-1">
                  {progress}%
                </span>
              </div>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
