"use client";

import { useState, useEffect } from "react";
import Image from "next-image-export-optimizer";
import { useTranslations } from "next-intl";
import { BookOpen, Tag, Globe, Calendar, ChevronRight } from "lucide-react";
import type { BookMeta } from "@/lib/types";

interface BookIntroProps {
  book: BookMeta;
  onChapterSelect: (slug: string) => void;
}

export default function BookIntro({ book, onChapterSelect }: BookIntroProps) {
  const t = useTranslations("book");

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const check = () => setIsDark(html.classList.contains("dark"));
    check();
    // Watch for theme changes
    const observer = new MutationObserver(check);
    observer.observe(html, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const year = book.publishedAt
    ? new Date(book.publishedAt).getUTCFullYear()
    : null;

  // Flat ordered chapter list (respects parts order if defined)
  const orderedChapters = book.parts
    ? book.parts.flatMap((p) =>
      p.chapterSlugs
        .map((s) => book.chapters.find((c) => c.slug === s))
        .filter(Boolean)
    )
    : [...book.chapters].sort((a, b) => a!.order - b!.order);

  return (
    <div className="min-h-screen">
      {/* ── Book Cover ────────────────────────────────────── */}
      {book.cover && (
        <div
          id="intro-cover"
          className="flex items-center justify-center py-20 px-6 relative overflow-hidden"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 90% 70% at 50% 50%, hsl(var(--primary)/0.09) 0%, hsl(var(--background)) 70%)"
              : "radial-gradient(ellipse 90% 70% at 50% 50%, hsl(var(--primary)/0.1) 0%, hsl(var(--background)) 80%)",
          }}
        >
          {/* Ambient glow */}
          <div
            style={{
              position: "absolute",
              width: "600px",
              height: "400px",
              background: isDark
                ? "radial-gradient(ellipse, hsl(var(--primary)/0.3) 0%, transparent 70%)"
                : "radial-gradient(ellipse, hsl(var(--primary)/0.25) 0%, transparent 70%)",
              filter: "blur(90px)",
              pointerEvents: "none",
              opacity: isDark ? 0.6 : 0.45,
            }}
          />

          <div className="relative z-10 w-full max-w-[480px]">
            <div
              className="relative overflow-hidden rounded-2xl shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
              style={{
                width: "100%",
                height: "auto",
                boxShadow: isDark
                  ? "0 40px 80px -15px rgba(0,0,0,0.8), 0 25px 45px -20px rgba(0,0,0,0.6)"
                  : "0 30px 60px -12px rgba(0,0,0,0.18), 0 15px 30px -15px rgba(0,0,0,0.12)",
              }}
            >
              <Image
                src={book.cover}
                alt={book.title}
                width={500}
                height={750}
                className="w-full h-auto block"
                priority
              />
              {/* Subtle gloss overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(0,0,0,0.08) 100%)",
                }}
              />
            </div>
          </div>

          {/* Bottom gradient separator */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[1px]"
            style={{
              background: isDark
                ? "linear-gradient(to right, transparent, hsl(var(--primary)/0.4) 50%, transparent)"
                : "linear-gradient(to right, transparent, hsl(var(--primary)/0.2) 50%, transparent)",
            }}
          />
        </div>
      )}

      {/* ── Book metadata below the cover ─────────────────────── */}
      <div id="intro-information" className="max-w-3xl mx-auto px-6 py-20 space-y-20">

        {/* Title block */}
        <div className="text-center space-y-4">
          {book.subtitle && (
            <p className="text-[hsl(var(--primary))] text-sm font-semibold uppercase tracking-[0.2em]">
              {book.subtitle}
            </p>
          )}
          <h1
            className="font-extrabold leading-tight text-[hsl(var(--foreground))]"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
          >
            {book.title}
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-lg leading-relaxed max-w-2xl mx-auto">
            {book.description}
          </p>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--foreground))] text-xs px-3 py-1.5 rounded-full font-medium">
            <BookOpen size={12} className="text-[hsl(var(--primary))]" />
            {book.author}
          </span>
          {year && (
            <span className="flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--foreground))] text-xs px-3 py-1.5 rounded-full font-medium">
              <Calendar size={12} className="text-[hsl(var(--primary))]" />
              {t("edition", { year })}
            </span>
          )}
          <span className="flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--foreground))] text-xs px-3 py-1.5 rounded-full font-medium">
            <Globe size={12} className="text-[hsl(var(--primary))]" />
            {book.language?.toUpperCase()}
          </span>
          <span className="flex items-center gap-1.5 bg-[hsl(var(--primary))] text-white text-xs px-3 py-1.5 rounded-full font-bold">
            {t("chapters_count", { count: book.chapters.length })}
          </span>
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              const first = orderedChapters[0];
              if (first) onChapterSelect(first!.slug);
            }}
            className="inline-flex items-center gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)] text-white font-bold px-8 py-3.5 rounded-full text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <BookOpen size={16} />
            {t("startReading")}
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-[hsl(var(--border))]" />

        {/* Tags */}
        {book.tags && book.tags.length > 0 && (
          <div className="-mt-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--primary))] mb-4 flex items-center gap-2">
              <Tag size={13} /> {t("tags")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {book.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Table of contents */}
        <div id="intro-index" className="-mt-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--primary))] mb-6 flex items-center gap-2">
            <BookOpen size={13} /> {t("tableOfContentsIntro")}
          </h2>

          {book.parts ? (
            <div className="space-y-10">
              {book.parts.map((part) => {
                const partChapters = part.chapterSlugs
                  .map((s) => book.chapters.find((c) => c.slug === s))
                  .filter(Boolean);
                return (
                  <div key={part.title} id={`intro-part-${part.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                    <p className="text-[11px] font-bold text-[hsl(var(--primary))] uppercase tracking-widest mb-3 border-b border-[hsl(var(--primary)/0.15)] pb-2">
                      {part.title}
                    </p>
                    <div className="space-y-1">
                      {partChapters.map((ch) => (
                        <button
                          key={ch!.slug}
                          onClick={() => onChapterSelect(ch!.slug)}
                          className="w-full text-left group flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors duration-150"
                        >
                          <span className="font-mono text-[10px] text-[hsl(var(--primary)/0.6)] mt-0.5 shrink-0 w-6 pt-px">
                            {String(ch!.order).padStart(2, "0")}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent-foreground))] leading-snug">
                              {ch!.title}
                            </span>
                            {ch!.description && (
                              <span className="block text-xs text-[hsl(var(--muted-foreground))] mt-0.5 leading-relaxed line-clamp-2">
                                {ch!.description}
                              </span>
                            )}
                          </span>
                          <ChevronRight
                            size={14}
                            className="shrink-0 mt-0.5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] group-hover:translate-x-0.5 transition-transform"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {orderedChapters.map((ch) => (
                <button
                  key={ch!.slug}
                  onClick={() => onChapterSelect(ch!.slug)}
                  className="w-full text-left group flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors duration-150"
                >
                  <span className="font-mono text-[10px] text-[hsl(var(--primary)/0.6)] mt-0.5 shrink-0 w-6 pt-px">
                    {String(ch!.order).padStart(2, "0")}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent-foreground))] leading-snug">
                      {ch!.title}
                    </span>
                    {ch!.description && (
                      <span className="block text-xs text-[hsl(var(--muted-foreground))] mt-0.5 leading-relaxed line-clamp-2">
                        {ch!.description}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    size={14}
                    className="shrink-0 mt-0.5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] group-hover:translate-x-0.5 transition-transform"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}
