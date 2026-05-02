// ─── Book content types (mirrors the book.json schema) ───────────────────────

export interface Chapter {
  slug: string;
  title: string;
  order: number;
  description?: string;
  audioUrl?: string;
}

export interface BookJson {
  slug: string;
  locale: string;
  title: string;
  author: string;
  description: string;
  cover: string;
  category: string;
  tags: string[];
  featured: boolean;
  publishedAt: string;
  language: string;
  chapters: Chapter[];
}

// ─── Podcast episode metadata (written to sources_today/<alias>.json) ─────────

export interface EpisodeMetadata {
  episode: string;
  podcast: string;
  title: string;
  description: string;
  source: string;
  locale: string;
  order: number;
}

// ─── Session state shared across steps ────────────────────────────────────────

export interface EpisodeTarget {
  alias: string;
  episodeNumber: number;
}

export interface SessionState {
  defaultEpisode: number;
  askPerBook: boolean;
  targets: EpisodeTarget[];
}
