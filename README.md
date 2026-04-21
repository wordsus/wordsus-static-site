# Wordsus — Free Online Books and Courses

<p align="center">
  <img src="public/images/books/intro-python-cover.jpg" alt="Wordsus" width="120" />
</p>

<p align="center">
  A modern, multilingual platform for publishing and reading free educational books and courses — fully static, SEO-optimized, and deployable on Cloudflare Workers.
</p>

<p align="center">
  <a href="#-features">Features</a> ·
  <a href="#-tech-stack">Tech Stack</a> ·
  <a href="#-project-structure">Project Structure</a> ·
  <a href="#-adding-content">Adding Content</a> ·
  <a href="#-development">Development</a> ·
  <a href="#-deployment">Deployment</a>
</p>

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 📚 **Static books & courses** | Content stored as JSON + Markdown files — no database needed |
| 🌍 **Multilingual** | English & Spanish out of the box (easily extensible) |
| 🔍 **Client-side search** | Full-text search across title, author, description, and tags |
| ❤️ **Favorites** | Saved in `localStorage` — no login required |
| 📖 **Reading progress** | Last chapter per book remembered in `localStorage` |
| 🎵 **Audio player** | Per-chapter audio with play/pause, seek, and speed control |
| 🌗 **Theme switcher** | Light, Dark, and System modes; choice persisted locally |
| 📱 **Fully responsive** | Optimized for desktop, tablet, and phone |
| 🔥 **SEO optimized** | `hreflang`, Open Graph, structured metadata per page |
| ⚡ **Cloudflare-ready** | 100% static export (`next export`), no server-side runtime needed |

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Static Export)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **i18n**: [next-intl](https://next-intl-docs.vercel.app)
- **Markdown**: [remark](https://github.com/remarkjs/remark) + `remark-gfm` + `remark-html`
- **Icons**: [Lucide React](https://lucide.dev)
- **Package manager**: [pnpm](https://pnpm.io)

---

## 📁 Project Structure

```
wordsus-static-site/
│
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Locale-scoped routes (/en, /es)
│   │   ├── layout.tsx            # Locale layout (Header, Footer, i18n provider)
│   │   ├── page.tsx              # Homepage (hero + categories + featured books)
│   │   ├── favorites/page.tsx    # Saved books page
│   │   └── [slug]/page.tsx       # Dynamic: Book reader OR Category listing
│   ├── layout.tsx                # Root layout (theme init, fonts, global metadata)
│   └── globals.css               # Global styles + Tailwind + prose styles
│
├── components/                   # Reusable UI components
│   ├── Header.tsx                # Sticky header (nav, search, theme, language)
│   ├── Footer.tsx                # Site footer
│   ├── HeroSection.tsx           # Homepage hero banner
│   ├── BookCard.tsx              # Book card (grid card & compact variant)
│   ├── BookClient.tsx            # 3-column book reader layout
│   ├── CategoryPage.tsx          # Category listing
│   ├── FavoritesClient.tsx       # Favorites grid
│   ├── HomeClient.tsx            # Homepage (recently read + categories)
│   ├── SearchModal.tsx           # Client-side search modal
│   ├── AudioPlayer.tsx           # Sticky audio player with speed control
│   └── TableOfContents.tsx       # Right sidebar ToC with active heading
│
├── content/                      # 📝 All book content goes here
│   ├── en/                       # English content
│   │   ├── books/
│   │   │   └── <book-slug>/
│   │   │       ├── book.json     # Book metadata & chapter index
│   │   │       └── <chapter-slug>.md  # Chapter content (Markdown)
│   │   └── categories/
│   │       └── <category-slug>.json  # Category metadata
│   └── es/                       # Spanish content (same structure)
│
├── i18n/
│   ├── routing.ts                # Locale configuration
│   └── request.ts                # Server-side i18n setup
│
├── lib/
│   ├── types.ts                  # TypeScript types (BookMeta, ChapterMeta, etc.)
│   └── content.ts                # Content utilities (read books, chapters, categories)
│
├── messages/
│   ├── en.json                   # English UI translations
│   └── es.json                   # Spanish UI translations
│
├── public/
│   ├── images/books/             # Book cover images
│   ├── search-index/             # Auto-generated at build: en.json, es.json
│   └── chapter-content/         # Auto-generated at build: per-chapter HTML
│
└── middleware.ts                 # next-intl locale routing middleware
```

---

## 📝 Adding Content

### Adding a New Book

1. **Create the book directory** under the appropriate locale:

```
content/en/books/<your-book-slug>/
```

2. **Create `book.json`** with the book's metadata:

```json
{
  "slug": "my-awesome-book",
  "locale": "en",
  "title": "My Awesome Book",
  "author": "Your Name",
  "description": "A short description of the book.",
  "cover": "/images/books/my-awesome-book-cover.jpg",
  "category": "programming",
  "tags": ["python", "beginner"],
  "featured": true,
  "publishedAt": "2024-06-01",
  "language": "en",
  "chapters": [
    {
      "slug": "chapter-1-introduction",
      "title": "Introduction",
      "order": 1,
      "audioUrl": "https://your-s3-bucket.s3.amazonaws.com/my-awesome-book/chapter-1.mp3"
    }
  ]
}
```

**Fields explained:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | ✅ | URL-friendly identifier (must match directory name) |
| `locale` | `"en"` \| `"es"` | ✅ | Language of this book version |
| `title` | string | ✅ | Book title |
| `author` | string | ✅ | Author name |
| `description` | string | ✅ | Short description for cards and SEO |
| `cover` | string | ✅ | Path to cover image in `/public/` |
| `category` | string | ✅ | Must match a category slug in `content/<locale>/categories/` |
| `tags` | string[] | ✅ | Keywords for search |
| `featured` | boolean | ✅ | Show on homepage if `true` |
| `publishedAt` | string | ✅ | ISO date string |
| `chapters` | ChapterMeta[] | ✅ | Ordered list of chapters |
| `chapters[].audioUrl` | string | ❌ | S3 URL for chapter audio (optional) |

3. **Create chapter Markdown files** named exactly as the `slug` in `book.json`:

```
content/en/books/my-awesome-book/chapter-1-introduction.md
```

Chapters support standard Markdown + GFM (tables, code blocks, etc.):

````markdown
# Chapter Title

Regular paragraph text...

## Section Heading

```python
# Code blocks with syntax highlighting
print("Hello!")
```

| Column A | Column B |
|----------|----------|
| Cell 1   | Cell 2   |
````

4. **Add a cover image** to `public/images/books/`.

5. **Run the dev server** — the book will appear automatically.

---

### Adding a New Category

Create a JSON file in `content/<locale>/categories/<category-slug>.json`:

```json
{
  "slug": "mathematics",
  "locale": "en",
  "title": "Mathematics",
  "description": "Explore algebra, calculus, statistics, and more.",
  "icon": "calculator"
}
```

---

### Adding a New Language

1. **Add the locale** to `i18n/routing.ts`:

```typescript
export const routing = defineRouting({
  locales: ["en", "es", "fr"],  // Add "fr"
  defaultLocale: "en",
});
```

2. **Create a translation file** at `messages/fr.json` (copy from `en.json` and translate).

3. **Create content** under `content/fr/`.

4. **Update middleware** matcher if needed.

---

## 🚀 Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install Dependencies

```bash
pnpm install
```

### Start Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The site will redirect to `/en` automatically.

The dev server supports:
- Hot reload for components, pages, and translations
- Automatic Markdown processing
- All local storage features (favorites, recent books, theme)

> **Note**: Visit `/en` for English and `/es` for Spanish.

---

### Build for Production

```bash
pnpm build
```

This generates a fully static site in the `/out` directory, including:
- Pre-rendered HTML for all locales, books, and categories
- `/public/search-index/en.json` and `/public/search-index/es.json` (client-side search)
- `/public/chapter-content/<locale>/<book>/<chapter>.json` (for client-side chapter navigation)

---

### Useful Scripts

#### Fix Markdown Headings
If you have markdown files with incorrect heading hierarchies (e.g., starting with `###` or `####` instead of `##`), you can use the `fix_headings.py` script to automatically correct them in a directory.

```bash
python scripts/fix_headings.py <path_to_directory>
```
Example:
```bash
python scripts/fix_headings.py content/es/books/backend-en-python
```
The script will analyze each markdown file, find the first heading, and if it has too many `#` characters (more than 2), it will remove the extra `#` from all headings in the file, ignoring code blocks. If the first heading is already `#` or `##`, it skips the file.

---

## ☁️ Deployment

### Cloudflare Workers / Pages

The site is a 100% static export compatible with Cloudflare Workers:

1. **Build the project**:

```bash
pnpm build
```

2. **Deploy the `/out` directory** to Cloudflare Pages via the dashboard or Wrangler CLI:

```bash
npx wrangler pages deploy out
```

Or use Cloudflare Pages Git integration — connect your repository and set:
- **Build command**: `pnpm build`
- **Output directory**: `out`

### Other Platforms

The `/out` folder is a standard static site and can be served by:
- **Vercel** (with zero config)
- **Netlify**
- **GitHub Pages**
- **Any CDN or static host**

---

## 🎨 Design System

The design uses CSS custom properties for theming, defined in `globals.css`:

```css
:root {
  --primary: 262 83% 58%;      /* Purple */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  /* ... */
}

.dark {
  --background: 222 47% 8%;
  --primary: 262 83% 68%;
  /* ... */
}
```

Override any variable to customize the palette without touching component code.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Built with ❤️ by the Wordsus team</p>
