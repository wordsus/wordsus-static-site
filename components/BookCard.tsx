"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next-image-export-optimizer";
import { useTranslations } from "next-intl";
import { Heart, BookOpen, X, BookOpenCheck, MoreVertical, CheckCheck, RotateCcw } from "lucide-react";
import type { BookMeta, Locale } from "@/lib/types";
import { clsx } from "clsx";
import { getSavedChapter, calcProgress, saveChapter, chapterKey } from "@/lib/readingProgress";

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
  const router = useRouter();
  const [isFav, setIsFav] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [savedChapterTitle, setSavedChapterTitle] = useState<string | null>(null);
  const [bookHref, setBookHref] = useState(`/${locale}/${book.slug}`);
  // Mobile overlay state — toggled by tap on touch devices
  const [showOverlay, setShowOverlay] = useState(false);
  const isTouchDevice = useRef(false);
  // Progress dropdown
  const [progressMenuOpen, setProgressMenuOpen] = useState(false);
  const progressMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isTouchDevice.current = window.matchMedia("(hover: none)").matches;
  }, []);

  useEffect(() => {
    // Load favorites
    try {
      const favs: string[] = JSON.parse(
        localStorage.getItem("wordsus-favorites") || "[]"
      );
      setIsFav(favs.includes(`${locale}:${book.slug}`));
    } catch {
      setIsFav(false);
    }

    // Load reading progress
    const savedSlug = getSavedChapter(locale, book.slug);
    if (savedSlug && book.chapters.length > 0) {
      const savedChapter = book.chapters.find((ch) => ch.slug === savedSlug);
      if (savedChapter) {
        const pct = calcProgress(savedChapter.order, book.chapters.length);
        setProgress(pct);
        setSavedChapterTitle(savedChapter.title);
        setBookHref(`/${locale}/${book.slug}/${savedSlug}`);
      }
    }
  }, [book.slug, book.chapters, locale]);

  // Close progress dropdown on outside click
  useEffect(() => {
    if (!progressMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (progressMenuRef.current && !progressMenuRef.current.contains(e.target as Node)) {
        setProgressMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [progressMenuOpen]);

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

  // Mark all chapters as read: saves last chapter and updates local state
  const markAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const lastChapter = book.chapters[book.chapters.length - 1];
    if (!lastChapter) return;
    saveChapter(locale, book.slug, lastChapter.slug);
    const pct = calcProgress(lastChapter.order, book.chapters.length);
    setProgress(pct);
    setSavedChapterTitle(lastChapter.title);
    setBookHref(`/${locale}/${book.slug}/${lastChapter.slug}`);
    setProgressMenuOpen(false);
  };

  // Reset progress: removes localStorage key and clears local state entirely
  const resetProgress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.removeItem(chapterKey(locale, book.slug));
    } catch { /* ignore */ }
    setProgress(null);
    setSavedChapterTitle(null);
    setBookHref(`/${locale}/${book.slug}`);
    setProgressMenuOpen(false);
  };

  // Card click handler: on touch devices, first tap opens overlay; otherwise navigate
  const handleCardClick = (e: React.MouseEvent) => {
    if (!isTouchDevice.current) return; // let Link handle it on desktop
    if (showOverlay) return; // overlay already open — let its buttons handle actions
    e.preventDefault();
    setShowOverlay(true);
  };

  if (variant === "compact") {
    return (
      <Link
        href={bookHref}
        className="group flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--accent)/0.3)] transition-all duration-200"
      >
        <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-[hsl(var(--muted))] shrink-0 flex items-center justify-center">
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
          {/* Progress overlay badge on cover */}
          {progress !== null && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30">
              <div
                className="h-full bg-[hsl(var(--primary))] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate group-hover:text-[hsl(var(--primary))] transition-colors">
            {book.title}
          </p>
          {book.subtitle && (
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate leading-tight mb-0.5">
              {book.subtitle}
            </p>
          )}
          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
            {book.author}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={bookHref}
      onClick={handleCardClick}
      className={clsx(
        "group relative flex flex-col rounded-2xl border bg-[hsl(var(--card))] overflow-hidden transition-all duration-250",
        showOverlay
          ? "border-[hsl(var(--primary)/0.5)] shadow-lg shadow-[hsl(var(--primary)/0.08)]"
          : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] hover:shadow-lg hover:shadow-[hsl(var(--primary)/0.08)]"
      )}
    >
      {/* Cover — floats centered inside the wider card */}
      <div className="px-5 pt-5 pb-0 bg-[hsl(var(--card))]">
        <div className="relative aspect-3/4 rounded-xl overflow-hidden shadow-md bg-linear-to-br from-[hsl(var(--muted))] to-[hsl(var(--accent))] group-hover:shadow-xl group-hover:shadow-[hsl(var(--primary)/0.12)] transition-shadow duration-300">
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
          {/* Progress overlay badge on cover */}
          {progress !== null && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30">
              <div
                className="h-full bg-[hsl(var(--primary))] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="min-w-0">
            <span className="inline-block max-w-full px-2 py-0.5 rounded-md bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-medium truncate align-middle">
              {book.category}
            </span>
          </div>
          <button
            id={`fav-${book.slug}`}
            onClick={toggleFavorite}
            aria-label={isFav ? t("removeFromFavorites") : t("addToFavorites")}
            className={clsx(
              "p-1.5 rounded-full transition-colors shrink-0",
              isFav
                ? "text-red-500 hover:bg-red-500/10"
                : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
            )}
          >
            <Heart size={14} fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold text-[19px] text-[hsl(var(--foreground))] leading-snug group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-1">
            {book.title}
          </h3>
          {book.subtitle && (
            <p className="text-[12px] text-[hsl(var(--muted-foreground))] leading-tight line-clamp-1 mt-0.5">
              {book.subtitle}
            </p>
          )}
        </div>
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

      {/* ─── Detail Overlay ─────────────────────────────────────────────
          Desktop: shown on CSS hover (group-hover:)
          Mobile:  shown when showOverlay === true (toggled by tap)         */}
      <div
        className={clsx(
          "absolute inset-0 z-20 bg-[hsl(var(--card))] transition-all duration-300 p-6 flex flex-col gap-4 overflow-y-auto",
          showOverlay
            ? "opacity-100 translate-y-0 visible"
            : "opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 invisible group-hover:visible"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="inline-block px-2 py-0.5 rounded-md bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] text-xs font-semibold uppercase tracking-wider">
            {book.category}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleFavorite}
              aria-label={isFav ? t("removeFromFavorites") : t("addToFavorites")}
              className={clsx(
                "p-1.5 rounded-full transition-colors bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-sm",
                isFav
                  ? "text-red-500 hover:bg-red-500/10"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
              )}
            >
              <Heart size={14} fill={isFav ? "currentColor" : "none"} />
            </button>
            {/* Close button — only relevant on mobile */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowOverlay(false);
              }}
              aria-label="Close"
              className="p-1.5 rounded-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors lg:hidden"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg text-[hsl(var(--foreground))] leading-tight mb-0.5">
            {book.title}
          </h3>
          {book.subtitle && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium leading-tight mb-2 italic opacity-80">
              {book.subtitle}
            </p>
          )}
          <p className="text-sm text-[hsl(var(--primary))] font-medium">
            {t("by")} {book.author}
          </p>
        </div>

        <p className="text-sm text-[hsl(var(--foreground))] leading-relaxed flex-1">
          {book.description}
        </p>

        {/* Reading progress inside overlay — with dropdown menu */}
        {progress !== null && (
          <div className="rounded-xl bg-[hsl(var(--accent)/0.5)] border border-[hsl(var(--primary)/0.15)] p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[hsl(var(--primary))]">
                {t("readingProgress")}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[hsl(var(--primary))]">
                  {progress}%
                </span>
                {/* Dropdown menu */}
                <div className="relative" ref={progressMenuRef}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setProgressMenuOpen((v) => !v);
                    }}
                    aria-label="Progress options"
                    className="p-0.5 rounded hover:bg-[hsl(var(--muted))] text-[hsl(var(--primary)/0.7)] hover:text-[hsl(var(--primary))] transition-colors"
                  >
                    <MoreVertical size={13} />
                  </button>
                  {progressMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg shadow-black/10 overflow-hidden">
                      <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors text-left"
                      >
                        <CheckCheck size={13} className="text-[hsl(var(--primary))] shrink-0" />
                        {t("markAllAsRead")}
                      </button>
                      <div className="h-px bg-[hsl(var(--border))]" />
                      <button
                        onClick={resetProgress}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors text-left"
                      >
                        <RotateCcw size={13} className="text-red-400 shrink-0" />
                        {t("resetProgress")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="relative h-2 w-full rounded-full bg-[hsl(var(--muted))] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[hsl(var(--primary)/0.6)] to-[hsl(var(--primary))] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {savedChapterTitle && (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                {t("lastRead")}: <span className="text-[hsl(var(--foreground))] font-medium">{savedChapterTitle}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {book.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded text-[0.65rem] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-medium shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Read button — shown on mobile as the navigation CTA */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(bookHref);
          }}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-semibold hover:bg-[hsl(var(--primary)/0.85)] transition-colors lg:hidden"
        >
          <BookOpenCheck size={16} />
          {t("readChapter")}
        </button>
      </div>
    </Link>
  );
}
