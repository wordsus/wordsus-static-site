/**
 * Configuration for books that are relevant to the podcast workflow.
 * Only books listed here will be processed by the CLI.
 *
 * Fields:
 *  - alias:   Short identifier used as filename prefix in sources_today/outputs_today.
 *             Must be unique and filesystem-safe (no spaces, lowercase, hyphens ok).
 *  - slug:    The book directory name inside content/<locale>/books/
 *  - locale:  Language code ("es" | "en")
 *  - order:   Display order in menus (lower numbers appear first)
 *  - podcast: Human-readable podcast show name used in audio prompts
 */
export interface BookConfig {
  alias: string;
  slug: string;
  locale: "es" | "en";
  order: number;
  podcast: string;
}

export const books: BookConfig[] = [
  {
    alias: "fisica",
    slug: "fisica-para-mortales",
    locale: "es",
    order: 1,
    podcast: "Física para Mortales Podcast",
  },
  {
    alias: "quimica",
    slug: "quimica-para-mortales",
    locale: "es",
    order: 2,
    podcast: "Química para Mortales Podcast",
  },
  {
    alias: "astronomia",
    slug: "astronomia-para-mortales",
    locale: "es",
    order: 3,
    podcast: "Astronomía para Mortales Podcast",
  },
  {
    alias: "biologia",
    slug: "biologia-para-mortales",
    locale: "es",
    order: 4,
    podcast: "Biología para Mortales Podcast",
  },
  {
    alias: "contexto",
    slug: "la-biblia-en-contexto",
    locale: "es",
    order: 5,
    podcast: "La Biblia en Contexto Podcast",
  },
  {
    alias: "physics",
    slug: "physics-for-mortals",
    locale: "en",
    order: 6,
    podcast: "Physics for Mortals Podcast",
  },
  {
    alias: "chemistry",
    slug: "chemistry-for-mortals",
    locale: "en",
    order: 7,
    podcast: "Chemistry for Mortals Podcast",
  },
  {
    alias: "astronomy",
    slug: "astronomy-for-mortals",
    locale: "en",
    order: 8,
    podcast: "Astronomy for Mortals Podcast",
  },
  {
    alias: "biology",
    slug: "biology-for-mortals",
    locale: "en",
    order: 9,
    podcast: "Biology for Mortals Podcast",
  },
  {
    alias: "context",
    slug: "the-bible-in-context",
    locale: "en",
    order: 10,
    podcast: "The Bible in Context Podcast",
  },
  // Add more books as needed. Remember to also add template overrides in
  // podcasts-cli/templates/<alias>/ if the book needs custom prompts.
];
