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

  // Initialise from localStorage immediately (before first render) so the
  // correct chapter is known without waiting for a useEffect.
  const [activeChapter, setActiveChapter] = useState<string>(() => {
    if (typeof window === "undefined") return initialChapterSlug;
    try {
      const saved = localStorage.getItem(`wordsus-chapter-${locale}-${book.slug}`);
      if (saved && allChapers.some((ch) => ch.slug === saved)) {
        return saved;
      }
    } catch {}
    return initialChapterSlug;
  });

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

  // Persist current chapter per book every time it changes
  useEffect(() => {
    try {
      localStorage.setItem(`wordsus-chapter-${locale}-${book.slug}`, activeChapter);
    } catch {}
  }, [activeChapter, book.slug, locale]);

  // On mount: if localStorage gave us a chapter that differs from the SSR
  // initial chapter, fetch its content now.
  useEffect(() => {
    if (activeChapter !== initialChapterSlug) {
      loadChapter(activeChapter, true);
    } else {
      // Same chapter — just sync the URL
      const newUrl = `/${locale}/${book.slug}/${activeChapter}`;
      if (window.location.pathname.replace(/\/$/, "") !== newUrl) {
        window.history.replaceState(null, "", newUrl);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Fetch chapter content
  const loadChapter = useCallback(
    async (slug: string, isAutoLoad = false) => {
      if (slug === activeChapter && chapterHtml !== initialChapterHtml) return;
      
      setLoading(true);
      try {
        const res = await fetch(`/chapter-content/${locale}/${book.slug}/${slug}.json`);
        const data = await res.json();
        setChapterHtml(data.html);
        setToc(data.toc);
        
        // Update URL
        const newUrl = `/${locale}/${book.slug}/${slug}`;
        if (window.location.pathname !== newUrl) {
          if (isAutoLoad) {
            window.history.replaceState(null, "", newUrl);
          } else {
            window.history.pushState(null, "", newUrl);
          }
        }
      } catch {
        setChapterHtml("<p>Error loading chapter.</p>");
        setToc([]);
      } finally {
        setLoading(false);
        setActiveChapter(slug);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [activeChapter, chapterHtml, initialChapterHtml, locale, book.slug]
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

  useEffect(() => {
    const pres = document.querySelectorAll('.prose-wordsus pre');
    pres.forEach((pre) => {
      if (pre.querySelector('.mac-header')) return;

      const code = pre.querySelector('code');
      const languageClass = code?.className || '';
      const languageMatch = languageClass.match(/language-(\w+)/);
      const language = languageMatch ? languageMatch[1] : '';

      const header = document.createElement('div');
      header.className = 'mac-header flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#1a1b26] rounded-t-xl absolute top-0 left-0 right-0 h-11';
      
      const dots = document.createElement('div');
      dots.className = 'flex gap-2 w-16';
      dots.innerHTML = `
        <div class="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
        <div class="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
        <div class="w-3 h-3 rounded-full bg-[#27c93f]"></div>
      `;

      const langSpan = document.createElement('span');
      langSpan.className = 'text-[11px] text-[#a9b1d6] font-mono uppercase font-semibold flex-1 text-center tracking-wider';
      langSpan.innerText = language;

      const btnContainer = document.createElement('div');
      btnContainer.className = 'w-16 flex justify-end';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'text-xs text-[#a9b1d6] hover:text-white transition-colors flex items-center justify-center p-1.5 rounded-md hover:bg-white/10';
      copyBtn.title = t('copyCode') || 'Copy';
      copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      `;

      copyBtn.onclick = () => {
        const text = code?.innerText || '';
        navigator.clipboard.writeText(text);
        copyBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27c93f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        `;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          `;
        }, 2000);
      };

      btnContainer.appendChild(copyBtn);
      header.appendChild(dots);
      header.appendChild(langSpan);
      header.appendChild(btnContainer);

      pre.insertBefore(header, pre.firstChild);
    });
  }, [chapterHtml, t]);

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
          <p className="px-2 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
            {t("chapters")}
          </p>

          {book.parts ? (
            book.parts.map((part) => (
              <div key={part.title} className="mt-6 first:mt-2 mb-2">
                <p className="px-3 py-1 text-[10px] font-bold text-[hsl(var(--primary))] uppercase tracking-widest mb-2 border-b border-[hsl(var(--primary)/0.1)] pb-1">
                  {part.title}
                </p>
                {part.chapterSlugs.map((slug) => {
                  const ch = allChapers.find((c) => c.slug === slug);
                  if (!ch) return null;
                  return (
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
                  );
                })}
              </div>
            ))
          ) : (
            allChapers.map((ch) => (
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
            ))
          )}
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
            <div className="animate-fade-in">
              <h1 className="text-4xl font-extrabold mb-10 text-[hsl(var(--foreground))] tracking-tight">
                {currentChapterMeta?.order}. {currentChapterMeta?.title}
              </h1>
              <div
                className="prose-wordsus"
                dangerouslySetInnerHTML={{ __html: chapterHtml }}
              />
            </div>
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
      <aside className="hidden xl:block w-80 shrink-0">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-8">
          <TableOfContents toc={toc} />
        </div>
      </aside>
    </div>
  );
}
