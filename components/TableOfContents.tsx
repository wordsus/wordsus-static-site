"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import type { TocItem } from "@/lib/types";
import { useTranslations } from "next-intl";

interface TableOfContentsProps {
  toc: TocItem[];
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
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
  }, []);

  if (toc.length === 0) return null;

  return (
    <nav className="text-sm space-y-0.5">
      <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
        {t("tableOfContents")}
      </p>
      {toc.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={clsx(
            "block py-1 border-l-2 transition-all duration-150 text-xs leading-relaxed",
            item.level === 1
              ? "pl-3"
              : item.level === 2
              ? "pl-5"
              : "pl-7",
            activeId === item.id
              ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-medium"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))]"
          )}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}
