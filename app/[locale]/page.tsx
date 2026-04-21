import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllBooks, getAllCategories, getBooksByCategory } from "@/lib/content";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/types";
import HomeClient from "@/components/HomeClient";
import type { Metadata } from "next";
import HeroSection from "@/components/HeroSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("heroTitle"),
    description: t("heroSubtitle"),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(locale);

  const allBooks = getAllBooks(loc);
  const categories = getAllCategories(loc);
  const booksByCategory: Record<string, typeof allBooks> = {};

  for (const cat of categories) {
    booksByCategory[cat.slug] = getBooksByCategory(cat.slug, loc).filter(
      (b) => b.featured
    );
  }

  return (
    <>
      <HeroSection locale={loc} />
      <HomeClient
        locale={loc}
        allBooks={allBooks}
        categories={categories}
        booksByCategory={booksByCategory}
      />
    </>
  );
}
