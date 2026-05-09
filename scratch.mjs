import fs from 'fs';
import path from 'path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

const cwd = process.cwd();
const contentDir = path.join(cwd, 'content');

async function validate() {
  const files = [];
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.md')) files.push(p);
    }
  }
  walk(contentDir);

  const failed = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      await remark()
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeKatex)
        .use(rehypeHighlight, { ignoreMissing: true })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(raw);
    } catch (e) {
      failed.push({ file, error: e.message });
    }
  }
  console.log('Failed:', failed.length);
  if (failed.length > 0) console.log(failed);
}
validate();
