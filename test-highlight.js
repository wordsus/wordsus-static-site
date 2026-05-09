import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import dockerfile from "highlight.js/lib/languages/dockerfile";

const raw = "```dockerfile\nFROM ubuntu\n```";

remark()
  .use(remarkRehype)
  .use(rehypeHighlight, { languages: { dockerfile } })
  .use(rehypeStringify)
  .process(raw)
  .then(res => console.log(String(res)))
  .catch(err => console.error(err));
