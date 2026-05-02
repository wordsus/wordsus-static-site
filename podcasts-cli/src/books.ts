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
    podcast: "Física para Mortales",
  },
  {
    alias: "quimica",
    slug: "quimica-para-mortales",
    locale: "es",
    order: 2,
    podcast: "Química para Mortales",
  },
  {
    alias: "astronomia",
    slug: "astronomia-para-mortales",
    locale: "es",
    order: 3,
    podcast: "Astronomía para Mortales",
  },
  {
    alias: "biologia",
    slug: "biologia-para-mortales",
    locale: "es",
    order: 4,
    podcast: "Biología para Mortales",
  },
  // Add more books as needed. Remember to also add template overrides in
  // podcasts-cli/templates/<alias>/ if the book needs custom prompts.
];
