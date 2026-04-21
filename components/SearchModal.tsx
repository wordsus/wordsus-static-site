"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Search, X, BookOpen } from "lucide-react";
import type { Locale, SearchableBook } from "@/lib/types";
import Image from "next/image";

interface SearchModalProps {
  locale: Locale;
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ locale, isOpen, onClose }: SearchModalProps) {
  const t = useTranslations("nav");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchableBook[]>([]);
  const [index, setIndex] = useState<SearchableBook[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search index from static JSON file
  useEffect(() => {
    if (!isOpen) return;
    fetch(`/search-index/${locale}.json`)
      .then((r) => r.json())
      .then((data: SearchableBook[]) => setIndex(data))
      .catch(() => setIndex([]));
  }, [isOpen, locale]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Local search
  const doSearch = useCallback(
    (q: string) => {
      if (!q.trim() || index.length === 0) {
        setResults([]);
        return;
      }
      const lower = q.toLowerCase();
      const filtered = index.filter(
        (book) =>
          book.title.toLowerCase().includes(lower) ||
          book.author.toLowerCase().includes(lower) ||
          book.description.toLowerCase().includes(lower) ||
          book.tags.some((tag) => tag.toLowerCase().includes(lower))
      );
      setResults(filtered.slice(0, 8));
    },
    [index]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    doSearch(val);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
          <Search size={18} className="text-[hsl(var(--muted-foreground))] shrink-0" />
          <input
            id="search-input"
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder={t("searchPlaceholder")}
            className="flex-1 bg-transparent text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none text-sm"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query && results.length === 0 ? (
            <div className="p-8 text-center text-[hsl(var(--muted-foreground))] text-sm">
              {t("noResults")} &ldquo;{query}&rdquo;
            </div>
          ) : null}

          {results.map((book) => (
            <Link
              key={book.slug}
              href={`/${locale}/${book.slug}`}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--muted))] transition-colors"
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
                <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                  {book.title}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                  {book.author} · {book.category}
                </p>
              </div>
            </Link>
          ))}

          {!query && (
            <div className="p-8 text-center text-[hsl(var(--muted-foreground))] text-sm">
              {t("searchPlaceholder")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
