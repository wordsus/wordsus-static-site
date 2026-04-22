"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/types";

interface HeroSectionProps {
  locale: Locale;
}

export default function HeroSection({ locale }: HeroSectionProps) {
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden bg-[hsl(var(--background))] pt-16 pb-20">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[hsl(var(--primary)/0.08)] blur-3xl" />
        <div className="absolute top-20 -left-12 w-72 h-72 rounded-full bg-[hsl(var(--accent)/0.6)] blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] text-xs font-medium border border-[hsl(var(--primary)/0.2)]">
          <BookOpen size={12} />
          Free & Open Access
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[hsl(var(--foreground))] tracking-tight leading-tight">
          {t("heroTitle")}
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto leading-relaxed">
          {t("heroSubtitle")}
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={`/${locale}#categories`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-white font-semibold text-sm hover:bg-[hsl(var(--primary)/0.88)] transition-colors shadow-lg shadow-[hsl(var(--primary)/0.3)]"
          >
            {t("startReading")}
            <ArrowRight size={16} />
          </Link>
          <Link
            href={`/${locale}#categories`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] font-semibold text-sm hover:bg-[hsl(var(--muted))] transition-colors"
          >
            {t("browseCategories")}
          </Link>
        </div>
      </div>
    </section>
  );
}
