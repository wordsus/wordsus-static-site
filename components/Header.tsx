"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";
import type { Locale } from "@/lib/types";
import { clsx } from "clsx";
import SearchModal from "@/components/SearchModal";

type Theme = "light" | "dark" | "system";

interface HeaderProps {
  locale: Locale;
}

export default function Header({ locale }: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("system");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  const switchLocale = (newLocale: Locale) => {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  };

  const otherLocale: Locale = locale === "en" ? "es" : "en";
  const localeName = locale === "en" ? t("language.es") : t("language.en");

  const navLinks = [
    { href: `/${locale}`, label: t("nav.home") },
    { href: `/${locale}/favorites`, label: t("nav.favorites") },
  ];

  const themeOptions: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun size={14} />, label: t("theme.light") },
    { value: "dark", icon: <Moon size={14} />, label: t("theme.dark") },
    { value: "system", icon: <Monitor size={14} />, label: t("theme.system") },
  ];

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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                )}
              >
                {link.label}
              </Link>
            ))}
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

            {/* Favorites (mobile) */}
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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                )}
              >
                {link.label}
              </Link>
            ))}
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
