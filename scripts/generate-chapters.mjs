import fs from 'fs';
import path from 'path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { all } from 'lowlight';
import { definer as hcl } from '@taga3s/highlightjs-terraform';

// ─── Syntax highlighting ──────────────────────────────────────────────────────
// rehype-highlight v7 uses lowlight internally (not the global hljs singleton).
// We spread lowlight's `all` preset (192 built-in grammars) and add the one
// language that isn't there: HCL / Terraform.
const highlightLanguages = { ...all, hcl };

// Aliases: { registeredLanguageName: aliasOrAliases }
const highlightAliases = {
  hcl:        ['terraform', 'tf'],
  dockerfile: 'Dockerfile',
  graphql:    'gql',
  protobuf:   'proto',
  properties: ['env', 'dotenv'],
  json:       ['jsonc', 'json5'],
  bash:       ['zsh', 'fish', 'ksh'],
  pgsql:      ['postgres', 'postgresql'],
  csharp:     'cs',
  powershell: ['ps1', 'pwsh'],
  x86asm:     'asm',
  django:     ['jinja', 'jinja2'],
  xml:        ['vue', 'svelte'],
};

const cwd = process.cwd();
const contentDir = path.join(cwd, 'content');
const publicDir = path.join(cwd, 'public', 'chapter-content');

async function getChapterContent(bookSlug, chapterSlug, locale) {
  let mdPath = path.join(contentDir, locale, 'books', bookSlug, `${chapterSlug}.md`);
  
  if (!fs.existsSync(mdPath)) {
    const bookDir = path.join(contentDir, locale, 'books', bookSlug);
    if (fs.existsSync(bookDir)) {
      const files = fs.readdirSync(bookDir);
      const matchingFile = files.find(f => f.endsWith(`-${chapterSlug}.md`));
      if (matchingFile) {
        mdPath = path.join(bookDir, matchingFile);
      }
    }
  }

  if (!fs.existsSync(mdPath)) {
    return null;
  }

  const raw = fs.readFileSync(mdPath, 'utf-8');
  const toc = [];
  const contentWithoutFencedCode = raw.replace(/```[\s\S]*?```/g, '');
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(contentWithoutFencedCode)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.replace(/`/g, '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    if (level <= 3) toc.push({ id, text, level });
  }

  const result = await remark()
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeHighlight, { languages: highlightLanguages, aliases: highlightAliases })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(raw);

  let html = result.toString();
  html = html.replace(/<(h[1-3])>(.*?)<\/h[1-3]>/g, (_, tag, content) => {
    const id = content.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    return `<${tag} id="${id}">${content}</${tag}>`;
  });

  return { html, toc };
}

async function generateAll() {
  const locales = fs.readdirSync(contentDir).filter(f => fs.statSync(path.join(contentDir, f)).isDirectory() && f.length === 2);

  for (const locale of locales) {
    const booksDir = path.join(contentDir, locale, 'books');
    if (!fs.existsSync(booksDir)) continue;

    const books = fs.readdirSync(booksDir).filter(f => fs.statSync(path.join(booksDir, f)).isDirectory());

    for (const bookSlug of books) {
      const bookJsonPath = path.join(booksDir, bookSlug, 'book.json');
      if (!fs.existsSync(bookJsonPath)) continue;

      const book = JSON.parse(fs.readFileSync(bookJsonPath, 'utf-8'));
      const outputDir = path.join(publicDir, locale, bookSlug);
      fs.mkdirSync(outputDir, { recursive: true });

      console.log(`Generating chapters for: ${bookSlug} [${locale}]`);

      for (const chapter of book.chapters) {
        const content = await getChapterContent(bookSlug, chapter.slug, locale);
        if (content) {
          fs.writeFileSync(path.join(outputDir, `${chapter.slug}.json`), JSON.stringify(content), 'utf-8');
        }
      }
    }
  }
}

generateAll().catch(console.error);
