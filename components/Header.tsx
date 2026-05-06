"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next-image-export-optimizer";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Heart,
  Sun,
  Moon,
  Monitor,
  Globe,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import type { Locale, CategoryMeta } from "@/lib/types";
import { clsx } from "clsx";
import SearchModal from "@/components/SearchModal";

type Theme = "light" | "dark" | "system";

// Map icon names from JSON to emoji/icon representation
const CATEGORY_ICONS: Record<string, string> = {
  flask: "🔬",
  code: "💻",
  book: "📖",
  star: "⭐",
  heart: "❤️",
  music: "🎵",
  globe: "🌍",
  math: "📐",
  atom: "⚛️",
  bible: "✝️",
  church: "⛪",
  cloud: "☁️",
  server: "🖥️",
  default: "📚",
};

function getCategoryIcon(icon: string): string {
  return CATEGORY_ICONS[icon] ?? CATEGORY_ICONS.default;
}

interface HeaderProps {
  locale: Locale;
  categories: CategoryMeta[];
}

export default function Header({ locale, categories }: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("system");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Load theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("wordsus-theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("wordsus-theme", theme);
  }, [theme]);

  // Scroll detection for header shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close categories dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(e.target as Node)
      ) {
        setCategoriesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setCategoriesOpen(false);
  }, [pathname]);

  const switchLocale = (newLocale: Locale) => {
    router.push(`/${newLocale}`);
  };

  const otherLocale: Locale = locale === "en" ? "es" : "en";
  const localeName = locale === "en" ? t("language.es") : t("language.en");

  const themeOptions: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun size={14} />, label: t("theme.light") },
    { value: "dark", icon: <Moon size={14} />, label: t("theme.dark") },
    { value: "system", icon: <Monitor size={14} />, label: t("theme.system") },
  ];

  const isCategoryActive = categories.some(
    (cat) => pathname === `/${locale}/${cat.slug}`
  );

  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-40 w-full border-b transition-all duration-200",
          scrolled
            ? "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.85)] backdrop-blur-md"
            : "border-transparent bg-[hsl(var(--background))]"
        )}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 font-bold text-xl text-[hsl(var(--foreground))] shrink-0"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <Image
                src="/images/wordsus-logo.png"
                alt="Wordsus"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="hidden sm:inline">Wordsus</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Home */}
            <Link
              href={`/${locale}`}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === `/${locale}`
                  ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              )}
            >
              {t("nav.home")}
            </Link>

            {/* Categories dropdown */}
            <div className="relative" ref={categoriesRef}>
              <button
                id="categories-menu-button"
                onClick={() => setCategoriesOpen((o) => !o)}
                aria-expanded={categoriesOpen}
                aria-haspopup="true"
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors select-none",
                  isCategoryActive
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                )}
              >
                {t("nav.categories")}
                <ChevronDown
                  size={14}
                  className={clsx(
                    "transition-transform duration-200",
                    categoriesOpen ? "rotate-180" : "rotate-0"
                  )}
                />
              </button>

              {/* Dropdown panel */}
              <div
                className={clsx(
                  "absolute left-0 top-full mt-2 z-50 transition-all duration-200 origin-top-left",
                  categoriesOpen
                    ? "opacity-100 scale-100 pointer-events-auto"
                    : "opacity-0 scale-95 pointer-events-none"
                )}
                style={{ minWidth: "220px" }}
              >
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-xl overflow-hidden">
                  {/* Header of dropdown */}
                  <div className="px-4 py-2.5 border-b border-[hsl(var(--border))]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      {t("nav.categories")}
                    </p>
                  </div>
                  {/* Category list */}
                  <div className="py-1.5">
                    {categories.map((cat) => {
                      const href = `/${locale}/${cat.slug}`;
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={cat.slug}
                          href={href}
                          onClick={() => setCategoriesOpen(false)}
                          className={clsx(
                            "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                            isActive
                              ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                              : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                          )}
                        >
                          <span className="text-base leading-none select-none">
                            {getCategoryIcon(cat.icon)}
                          </span>
                          <span className="font-medium">{cat.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Favorites */}
            <Link
              href={`/${locale}/favorites`}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === `/${locale}/favorites`
                  ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              )}
            >
              {t("nav.favorites")}
            </Link>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <button
              id="search-button"
              onClick={() => setSearchOpen(true)}
              aria-label={t("nav.search")}
              className="p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Search size={18} />
            </button>

            {/* Favorites (mobile icon) */}
            <Link
              href={`/${locale}/favorites`}
              aria-label={t("nav.favorites")}
              className="md:hidden p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Heart size={18} />
            </Link>

            {/* Theme switcher */}
            <div className="relative group">
              <button
                id="theme-toggle"
                aria-label={t("theme.toggle")}
                className="p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                {theme === "light" ? (
                  <Sun size={18} />
                ) : theme === "dark" ? (
                  <Moon size={18} />
                ) : (
                  <Monitor size={18} />
                )}
              </button>
              <div className="absolute right-0 top-full mt-1 w-36 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={clsx(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                      theme === opt.value
                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language switcher */}
            <button
              id="language-switcher"
              onClick={() => switchLocale(otherLocale)}
              aria-label={t("language.toggle")}
              title={localeName}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Globe size={16} />
              <span className="hidden sm:inline uppercase font-medium text-xs">
                {otherLocale}
              </span>
            </button>

            {/* Mobile menu toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 space-y-1 animate-fade-in">
            {/* Home */}
            <Link
              href={`/${locale}`}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === `/${locale}`
                  ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              )}
            >
              {t("nav.home")}
            </Link>

            {/* Categories accordion */}
            <div>
              <button
                onClick={() => setMobileCategoriesOpen((o) => !o)}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isCategoryActive
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                )}
              >
                <span>{t("nav.categories")}</span>
                <ChevronDown
                  size={14}
                  className={clsx(
                    "transition-transform duration-200",
                    mobileCategoriesOpen ? "rotate-180" : "rotate-0"
                  )}
                />
              </button>

              {mobileCategoriesOpen && (
                <div className="mt-1 ml-3 pl-3 border-l-2 border-[hsl(var(--border))] space-y-0.5">
                  {categories.map((cat) => {
                    const href = `/${locale}/${cat.slug}`;
                    const isActive = pathname === href;
                    return (
                      <Link
                        key={cat.slug}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={clsx(
                          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                            : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                        )}
                      >
                        <span className="text-sm leading-none">
                          {getCategoryIcon(cat.icon)}
                        </span>
                        {cat.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Favorites */}
            <Link
              href={`/${locale}/favorites`}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === `/${locale}/favorites`
                  ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              )}
            >
              {t("nav.favorites")}
            </Link>
          </div>
        )}
      </header>

      {/* Search modal */}
      <SearchModal
        locale={locale}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
