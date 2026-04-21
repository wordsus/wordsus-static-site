"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Heart, Menu, X } from "lucide-react";
import type { BookMeta, TocItem, Locale } from "@/lib/types";
import TableOfContents from "@/components/TableOfContents";
import AudioPlayer from "@/components/AudioPlayer";
import Image from "next/image";

interface BookClientProps {
  book: BookMeta;
  locale: Locale;
  initialChapterSlug: string;
  initialChapterHtml: string;
  initialToc: TocItem[];
  allChapers: BookMeta["chapters"];
}

export default function BookClient({
  book,
  locale,
  initialChapterSlug,
  initialChapterHtml,
  initialToc,
  allChapers,
}: BookClientProps) {
  const t = useTranslations("book");
  const [activeChapter, setActiveChapter] = useState(initialChapterSlug);
  const [chapterHtml, setChapterHtml] = useState(initialChapterHtml);
  const [toc, setToc] = useState<TocItem[]>(initialToc);
  const [loading, setLoading] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentChapterMeta = allChapers.find((ch) => ch.slug === activeChapter);
  const currentIdx = allChapers.findIndex((ch) => ch.slug === activeChapter);
  const prevChapter = currentIdx > 0 ? allChapers[currentIdx - 1] : null;
  const nextChapter = currentIdx < allChapers.length - 1 ? allChapers[currentIdx + 1] : null;

  // Load favorites state
  useEffect(() => {
    try {
      const favs: string[] = JSON.parse(localStorage.getItem("wordsus-favorites") || "[]");
      setIsFav(favs.includes(`${locale}:${book.slug}`));
    } catch {}
  }, [book.slug, locale]);

  // Track recent books
  useEffect(() => {
    try {
      const key = `${locale}:${book.slug}`;
      const recent: string[] = JSON.parse(localStorage.getItem("wordsus-recent") || "[]");
      const filtered = recent.filter((r) => r !== key);
      localStorage.setItem("wordsus-recent", JSON.stringify([key, ...filtered].slice(0, 10)));
    } catch {}
  }, [book.slug, locale]);

  // Persist current chapter per book
  useEffect(() => {
    try {
      localStorage.setItem(`wordsus-chapter-${locale}-${book.slug}`, activeChapter);
    } catch {}
  }, [activeChapter, book.slug, locale]);

  // Fetch chapter content
  const loadChapter = useCallback(
    async (slug: string) => {
      if (slug === initialChapterSlug) {
        setChapterHtml(initialChapterHtml);
        setToc(initialToc);
        setActiveChapter(slug);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/chapter-content/${locale}/${book.slug}/${slug}.json`);
        const data = await res.json();
        setChapterHtml(data.html);
        setToc(data.toc);
      } catch {
        setChapterHtml("<p>Error loading chapter.</p>");
        setToc([]);
      } finally {
        setLoading(false);
        setActiveChapter(slug);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [initialChapterSlug, initialChapterHtml, initialToc, locale, book.slug]
  );

  const toggleFavorite = () => {
    try {
      const key = `${locale}:${book.slug}`;
      const favs: string[] = JSON.parse(localStorage.getItem("wordsus-favorites") || "[]");
      const next = isFav ? favs.filter((f) => f !== key) : [...favs, key];
      localStorage.setItem("wordsus-favorites", JSON.stringify(next));
      setIsFav(!isFav);
    } catch {}
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)]">
      {/* ─── Mobile sidebar overlay ─────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Left sidebar: book index ──────────────────── */}
      <aside
        className={clsx(
          "fixed lg:sticky top-16 z-40 lg:z-auto h-[calc(100vh-4rem)] overflow-y-auto",
          "w-72 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]",
          "transition-transform duration-300 shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Book header */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <Link
            href={`/${locale}/${book.category}`}
            className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1 mb-3"
          >
            <ChevronLeft size={12} />
            {t("backToCategory")}
          </Link>

          {book.cover && (
            <div className="w-20 h-28 rounded-xl overflow-hidden mb-3 mx-auto">
              <Image
                src={book.cover}
                alt={book.title}
                width={80}
                height={112}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h1 className="font-bold text-sm text-[hsl(var(--foreground))] text-center leading-snug">
            {book.title}
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] text-center mt-0.5">
            {t("by")} {book.author}
          </p>

          <button
            id="book-favorite-btn"
            onClick={toggleFavorite}
            className={clsx(
              "mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isFav
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
            )}
          >
            <Heart size={13} fill={isFav ? "currentColor" : "none"} />
            {isFav ? t("removeFromFavorites") : t("addToFavorites")}
          </button>
        </div>

        {/* Chapter list */}
        <div className="p-2">
          <p className="px-2 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            {t("chapters")}
          </p>
          {allChapers.map((ch) => (
            <button
              key={ch.slug}
              onClick={() => {
                loadChapter(ch.slug);
                setSidebarOpen(false);
              }}
              className={clsx(
                "w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors leading-snug",
                activeChapter === ch.slug
                  ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-medium"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              )}
            >
              <span className="text-[hsl(var(--primary)/0.6)] mr-1.5 font-mono">
                {String(ch.order).padStart(2, "0")}.
              </span>
              {ch.title}
            </button>
          ))}
        </div>
      </aside>

      {/* ─── Main content ──────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Mobile controls */}
        <div className="lg:hidden sticky top-16 z-30 flex items-center gap-2 bg-[hsl(var(--background)/0.9)] backdrop-blur-sm px-4 py-2 border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
            {currentChapterMeta?.title}
          </span>
        </div>

        {/* Chapter content */}
        <article className="max-w-3xl mx-auto px-6 py-10">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-[hsl(var(--muted))] rounded w-2/3" />
              <div className="h-4 bg-[hsl(var(--muted))] rounded w-full" />
              <div className="h-4 bg-[hsl(var(--muted))] rounded w-5/6" />
              <div className="h-4 bg-[hsl(var(--muted))] rounded w-4/6" />
            </div>
          ) : (
            <div
              className="prose-wordsus animate-fade-in"
              dangerouslySetInnerHTML={{ __html: chapterHtml }}
            />
          )}

          {/* Chapter navigation */}
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-[hsl(var(--border))]">
            {prevChapter ? (
              <button
                onClick={() => loadChapter(prevChapter.slug)}
                className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                <ChevronLeft size={16} />
                <span className="line-clamp-1 max-w-[200px]">{prevChapter.title}</span>
              </button>
            ) : (
              <div />
            )}
            {nextChapter ? (
              <button
                onClick={() => loadChapter(nextChapter.slug)}
                className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                <span className="line-clamp-1 max-w-[200px]">{nextChapter.title}</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <div />
            )}
          </div>
        </article>

        {/* Audio player */}
        {currentChapterMeta?.audioUrl && (
          <div className="max-w-3xl mx-auto">
            <AudioPlayer
              audioUrl={currentChapterMeta.audioUrl}
              chapterTitle={currentChapterMeta.title}
            />
          </div>
        )}
      </div>

      {/* ─── Right sidebar: ToC ────────────────────────── */}
      <aside className="hidden xl:block w-60 shrink-0">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-6">
          <TableOfContents toc={toc} />
        </div>
      </aside>
    </div>
  );
}
