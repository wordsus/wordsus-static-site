import Link from "next/link";
import { useTranslations } from "next-intl";
import Image from "next-image-export-optimizer";
import { Heart } from "lucide-react";

interface FooterProps {
  locale: string;
}

export default function Footer({ locale }: FooterProps) {
  const t = useTranslations("footer");
  const currentYear = new Date().getFullYear();

  const isEs = locale === "es";

  const navigationLinks = [
    { href: `/${locale}`, label: isEs ? "Inicio" : "Home" },
    { href: `/${locale}/favorites`, label: isEs ? "Favoritos" : "Favorites" },
  ];

  const legalLinks = [
    { href: `/${locale}/privacy`, label: t("privacyPolicy") },
    { href: `/${locale}/terms`, label: t("termsConditions") },
    { href: `/${locale}/cookies`, label: t("cookiePolicy") },
  ];

  const companyLinks = [
    { href: `/${locale}/about`, label: t("aboutUs") },
    { href: `/${locale}/about#contact`, label: t("contact") },
  ];

  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isEs ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-10 mb-12`}>

          {/* Brand column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-md">
                <Image
                  src="/images/wordsus-logo.png"
                  alt="Wordsus"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-xl text-[hsl(var(--foreground))]">Wordsus</span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xs">
              {t("tagline")}
            </p>
            <a
              href="https://github.com/wordsus/wordsus-static-site"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span>Open Source</span>
            </a>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--foreground))]">
              {t("navigation")}
            </h3>
            <ul className="space-y-2.5">
              {navigationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--foreground))]">
              {t("legal")}
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--foreground))]">
              {t("company")}
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Articles (Spanish only) */}
          {isEs && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--foreground))]">
                Artículos
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/es/mejor-app-para-leer-libros"
                    className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    Mejores apps para leer libros gratis
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[hsl(var(--border))] pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            © {currentYear} Wordsus. {t("rights")}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            {t("builtWith")}
            <Heart size={11} className="text-red-400 fill-red-400" aria-hidden />
            &amp; Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
