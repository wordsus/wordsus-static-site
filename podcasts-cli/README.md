# Podcasts CLI

A command-line tool designed to assist and automate the workflow for producing podcast episodes for Wordsus books.

This tool acts as an interactive orchestrator, providing a menu to explicitly execute each production step, from generating audio (via NotebookLM) and images (via Gemini/Midjourney) to final video rendering.

## Key Features

1. **Interactive Management:** Elegant command-line interface that guides you through the entire process.
2. **Structured Directories:** Automatically organizes daily files into `sources_today/` and `outputs_today/`.
3. **Clipboard Handling:** Automatically copies URLs and customized prompts, saving time and preventing errors.
4. **Template System:** Base prompts and book-specific overrides for both audio and image generation.
5. **Validation:** Verifies that all resources (audio, image, json) are present before executing the video rendering.
6. **Automatic Backups:** Zips the day's files into a backup folder and purges old backups and logs.

## Configuration

### 1. Environment Variables / Directories
Review `src/config.ts` or set the following environment variables:
- `PODCASTS_WORKING_DIR`: Directory where working folders will be created (e.g., `~/Downloads/podcasts`). **This must match your Python script's configuration.**
- `PODCASTS_CONTENT_DIR`: Path to the website's `content` folder.
- `PODCASTS_PYTHON_SCRIPT`: Absolute path to the Python video generation script.

### 2. Registering Books
Edit `src/books.ts` to define which books from the website are relevant to this process.

```typescript
export const books: BookConfig[] = [
  {
    alias: "fisica",
    slug: "fisica-para-mortales",
    locale: "es",
    order: 1,
    podcast: "Física para Mortales",
  }
];
```

### 3. Prompt Templates
Templates are located in the `templates/` folder:
- `audio-prompt.md`: General prompt for NotebookLM.
- `image-prompt.md`: General prompt for Gemini.

If a specific book requires a different prompt, create a folder with the book's `alias` inside `templates/` and place the file there (e.g., `templates/fisica/audio-prompt.md`).

### 4. Template Variables
You can use the following placeholders in any `.md` template:
- `{{PODCAST_NAME}}`: The podcast show name defined as `podcast` in `src/books.ts`.
- `{{EPISODE_TITLE}}`: The full title of the current chapter (`chapter.title`) from `book.json`.
- `{{EPISODE_NUMBER}}`: The order number of the chapter (`chapter.order`) from `book.json`.
- `{{ARTICLE_URL}}`: The public URL of the article on the website (automatically generated).
- `{{IMAGE_TITLE}}`: The first part of the title (extracted from the title before any `:` or `—`).
- `{{IMAGE_SUBTITLE}}`: The second part of the title (extracted from the title after any `:` or `—`).

## Usage

To start the workflow, run the script from the root of the web project:

```bash
pnpm podcasts
```

You can also specify the default episode directly:

```bash
pnpm podcasts --episode 3
```

### Workflow (Steps)

- **Step 0 - Setup:** Choose the episode number for the session.
- **Step 1 - JSON:** Automatically generates the `metadata.json` (`[alias].json`) files inside `sources_today/`.
- **Step 2 - URLs:** Copies article URLs one by one. Use them to add sources in NotebookLM.
- **Step 3 - Audio Prompts:** Copies prompts one by one to customize the "Audio Overview" in NotebookLM.
- **Step 4 - Image Prompts:** Copies prompts and automatically opens the corresponding Gemini chat (defined in `chats.txt`) to generate image descriptions.
- **Step 5 - Verification:** Waits for you to place the downloaded audio and images (`[alias].wav`, `[alias].png`) into `sources_today/`.
- **Step 6 - Generation:** Launches the Python script to create the `.mp4` and `.txt` files in `outputs_today/`.
- **Step 7 - Cleanup:** After uploading everything to YouTube, it packages today's files into a ZIP file in the `backups/` folder and cleans the environment for the next day.
