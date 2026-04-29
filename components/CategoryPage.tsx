import Link from "next/link";
import { useTranslations } from "next-intl";
import type { BookMeta, CategoryMeta, Locale } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { ArrowLeft, BookOpen } from "lucide-react";

interface CategoryPageProps {
  category: CategoryMeta;
  books: BookMeta[];
  locale: Locale;
}

export default function CategoryPage({
  category,
  books,
  locale,
}: CategoryPageProps) {
  const t = useTranslations("category");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back link */}
      <Link
        href={`/${locale}`}
        className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Home
      </Link>

      {/* Category header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
          {category.title}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          {category.description}
        </p>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {books.length} {t("books")}
        </p>
      </div>

      {/* Books grid */}
      {books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-5">
          {books.map((book) => (
            <BookCard key={book.slug} book={book} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">No books in this category yet.</p>
          <p className="text-sm mt-1">Check back soon for new content.</p>
        </div>
      )}
    </div>
  );
}
