import { getAllBooks } from "@/lib/content";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/types";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import FavoritesClient from "@/components/FavoritesClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "favorites" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(locale);
  const allBooks = getAllBooks(loc);

  return <FavoritesClient locale={loc} allBooks={allBooks} />;
}
