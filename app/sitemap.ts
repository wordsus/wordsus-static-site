import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getAllBooks, getAllCategories } from '@/lib/content';
import type { Locale } from '@/lib/types';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wordsus.org';
  const entries: MetadataRoute.Sitemap = [];

  // Home and categories
  for (const locale of routing.locales) {
    entries.push({
      url: `${siteUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    });

    const categories = getAllCategories(locale as Locale);
    for (const cat of categories) {
      entries.push({
        url: `${siteUrl}/${locale}/${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    const books = getAllBooks(locale as Locale);
    for (const book of books) {
      entries.push({
        url: `${siteUrl}/${locale}/${book.slug}`,
        lastModified: new Date(book.publishedAt || new Date()),
        changeFrequency: 'weekly',
        priority: 0.9,
      });

      for (const chapter of book.chapters) {
        entries.push({
          url: `${siteUrl}/${locale}/${book.slug}/${chapter.slug}`,
          lastModified: new Date(book.publishedAt || new Date()),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  }

  return entries;
}
