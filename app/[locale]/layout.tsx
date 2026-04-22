import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEs = locale === "es";
  return {
    title: {
      default: isEs
        ? "Wordsus | Libros y Cursos Gratuitos"
        : "Wordsus | Free Online Books and Courses",
      template: "%s | Wordsus",
    },
    description: isEs
      ? "Descubre una biblioteca de libros educativos y cursos gratuitos en múltiples categorías."
      : "Discover free educational books and courses across multiple categories.",
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Ensure valid locale
  if (!routing.locales.includes(locale as "en" | "es")) {
    notFound();
  }
  
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div lang={locale} className="min-h-screen flex flex-col">
        <Header locale={locale as "en" | "es"} />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
