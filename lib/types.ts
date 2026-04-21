// Types for Wordsus content

export type Locale = "en" | "es";

export interface ChapterMeta {
  slug: string;
  title: string;
  order: number;
  audioUrl?: string;
}

export interface BookMeta {
  slug: string;
  locale: Locale;
  title: string;
  author: string;
  description: string;
  cover: string;
  category: string;
  tags: string[];
  featured: boolean;
  publishedAt: string;
  language: string;
  chapters: ChapterMeta[];
}

export interface CategoryMeta {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  icon: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface SearchableBook {
  slug: string;
  locale: Locale;
  title: string;
  author: string;
  description: string;
  cover: string;
  category: string;
  tags: string[];
  featured: boolean;
}
