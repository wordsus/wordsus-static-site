import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, Heart } from "lucide-react";

export default function Footer() {
  const t = useTranslations("footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-lg text-[hsl(var(--foreground))]">
              <div className="w-7 h-7 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center">
                <BookOpen size={14} className="text-white" />
              </div>
              Wordsus
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xs">
              {t("tagline")}
            </p>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Navigation
            </h3>
            <div className="space-y-1">
              {[
                { href: "/en", label: "Home (EN)" },
                { href: "/es", label: "Inicio (ES)" },
                { href: "/en/favorites", label: "Favorites" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Open source */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Open Source
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Wordsus is open source and free to use. Contributions are welcome.
            </p>
            <a
              href="https://github.com/wordsus/wordsus-static-site"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--primary))] hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              View on GitHub
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <p>
            © {currentYear} Wordsus. {t("rights")}
          </p>
          <p className="flex items-center gap-1">
            {t("builtWith")} <Heart size={12} className="text-red-400 mx-1" /> &
            Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
