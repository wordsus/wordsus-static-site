"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import type { BookMeta } from "@/lib/types";

interface IntroTocProps {
  book: BookMeta;
}

interface TocEntry {
  id: string;
  label: string;
  level: 1 | 2 | 3;
}

export default function IntroToc({ book }: IntroTocProps) {
  const t = useTranslations("book");
  const [activeId, setActiveId] = useState<string>("intro-cover");

  // Build static TOC entries from book metadata
  const entries: TocEntry[] = [
    { id: "intro-cover", label: t("introCover"), level: 1 },
    { id: "intro-information", label: t("introInformation"), level: 1 },
    { id: "intro-index", label: t("tableOfContentsIntro"), level: 1 },
    ...(book.parts
      ? book.parts.map((p) => ({
          id: `intro-part-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          label: p.title,
          level: 2 as const,
        }))
      : []),
  ];

  // Observe all anchored sections
  useEffect(() => {
    const ids = entries.map((e) => e.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (observerEntries) => {
        // Find the topmost intersecting entry
        const visible = observerEntries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -50% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.slug]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav className="space-y-1">
      <p className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.2em] mb-6">
        {t("tableOfContents")}
      </p>
      <div className="flex flex-col space-y-0.5">
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => scrollTo(entry.id)}
            className={clsx(
              "group flex items-start py-1.5 text-left transition-all duration-200 border-l-2 w-full",
              entry.level === 1
                ? "pl-4 text-[13px] font-semibold mt-3 first:mt-0"
                : "pl-8 text-[12px] font-normal text-[hsl(var(--muted-foreground))]",
              activeId === entry.id
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
            )}
          >
            <span
              className={clsx(
                "transition-transform duration-200 leading-snug",
                activeId === entry.id
                  ? "translate-x-1"
                  : "group-hover:translate-x-1"
              )}
            >
              {entry.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
