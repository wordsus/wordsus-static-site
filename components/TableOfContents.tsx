"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import type { TocItem } from "@/lib/types";
import { useTranslations } from "next-intl";

interface TableOfContentsProps {
  toc: TocItem[];
  onClick?: () => void;
}

export default function TableOfContents({ toc, onClick }: TableOfContentsProps) {
  const t = useTranslations("book");
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const headings = document.querySelectorAll(".prose-wordsus h1, .prose-wordsus h2, .prose-wordsus h3");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  return (
    <nav className="space-y-1">
      <p className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.2em] mb-6">
        {t("tableOfContents")}
      </p>
      <div className="flex flex-col space-y-1">
        {toc
          .filter((item) => item.level >= 2 && item.level <= 3)
          .map((item) => {
            const renderText = (text: string) => {
              const parts = text.split(/(`[^`]+`)/g);
              return parts.map((part, i) => {
                if (part.startsWith("`") && part.endsWith("`")) {
                  return (
                    <code key={i} className="bg-[hsl(var(--muted))] px-1 rounded font-mono text-[0.95em] text-[hsl(var(--primary))]">
                      {part.slice(1, -1)}
                    </code>
                  );
                }
                return part;
              });
            };

            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={onClick}
                className={clsx(
                  "group flex items-start py-1.5 transition-all duration-200 border-l-2",
                  item.level === 2 
                    ? "pl-4 text-[13px] font-semibold mt-4 first:mt-0" 
                    : "pl-8 text-[12px] font-normal text-[hsl(var(--muted-foreground))]",
                  activeId === item.id
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                <span className={clsx(
                  "transition-transform duration-200",
                  activeId === item.id ? "translate-x-1" : "group-hover:translate-x-1"
                )}>
                  {renderText(item.text)}
                </span>
              </a>
            );
          })}
      </div>
    </nav>
  );
}
