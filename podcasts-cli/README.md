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

## Prerequisites

This tool requires the following system dependencies to be installed and available in your **PATH**:

- **FFmpeg**: Used for video rendering and audio-reactive visualizers.
- **ffprobe**: (Part of the FFmpeg suite) Used to detect media durations.

You can install them via Homebrew (macOS):

```bash
brew install ffmpeg
```

## Configuration

### 1. Environment Variables / Directories

Review `src/config.ts` or set the following environment variables:

- `PODCASTS_WORKING_DIR`: Directory where working folders will be created (e.g., `~/Downloads/podcasts`).
- `PODCASTS_CONTENT_DIR`: Path to the website's `content` folder.

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

### 3. Video Generation Settings

You can customize the video output and visualizer behavior in `src/config.ts`:

- **Visualizer Style:** `bars`, `wave`, `circle`, or `spectrum`.
- **Color:** Accent color in Hex format (e.g., `#00FFAA`).
- **Resolution:** Target output resolution (default `1920x1080`).
- **FPS:** Target frames per second (default `30`).
- **Crossfade Duration:** Seamless loop duration for video backgrounds (default `1.0s`).

### 4. YouTube Scheduling Settings

You can configure how the YouTube scheduled release date is calculated in `src/config.ts`:

- **baseDate**: The anchor date for episode scheduling (format: `YYYY-MM-DD`). Episode 1 will be scheduled on the first available publish day on or after this date.
- **publishDays**: An array of English weekday strings (e.g. `["Tuesday", "Friday"]`) representing the days of the week on which episodes should be scheduled. (Case-insensitive, supports long and short names, and falls back to all days if empty).
- **scheduledTime**: The fixed upload time shown in the YouTube info file (e.g., `3:30 PM`).

#### How it works

- Episode 1 maps to the first weekday from `publishDays` that is on or after `baseDate`.
- Each subsequent episode (Episode 2, 3, etc.) is scheduled on the next available weekday from the `publishDays` list.

### 5. Prompt Templates

The template engine resolves prompts using a priority cascade and optionally appends book-specific extra content. All template files are plain `.txt` files located inside the `templates/` folder.

#### Base templates (general fallback)

```text
templates/
  audio-prompt.txt     ← General prompt for NotebookLM
  image-prompt.txt     ← General prompt for Gemini / image generation
```

#### Book-specific overrides

Create a subdirectory named after the book's `alias` to override the base template for a specific book. The override completely replaces the base template.

```text
templates/
  <alias>/
    audio-prompt.txt   ← Overrides the general audio-prompt for this book
    image-prompt.txt   ← Overrides the general image-prompt for this book
```

#### Locale-specific overrides

Append the locale code (e.g., `-en`, `-es`) to the filename to target a specific language. Locale variants follow the same priority structure as general overrides.

```text
templates/
  <alias>/
    image-prompt-en.txt   ← Book + locale override (highest priority)
  image-prompt-en.txt     ← General locale override
```

#### Resolution order (first existing file wins)

| Priority | Path | Description |
| -------- | ---- | ----------- |
| 1 | `templates/<alias>/<name>-<locale>.txt` | Book-specific + locale-specific |
| 2 | `templates/<alias>/<name>.txt` | Book-specific (any locale) |
| 3 | `templates/<name>-<locale>.txt` | General locale override |
| 4 | `templates/<name>.txt` | General fallback (required) |

#### Extra files (additive customization)

In addition to the override mechanism above, you can **append** extra content to the resolved base prompt without replacing it. Place an `*-extra.txt` file inside the book's alias directory:

```text
templates/
  <alias>/
    audio-prompt-extra.txt   ← Appended to the audio prompt for this book
    image-prompt-extra.txt   ← Appended to the image prompt for this book
```

**Behavior:**

- The extra file does **not** replace the base template; its content is added at the end of the final prompt, separated by a blank line.
- The extra file is only applied when it exists inside the book's `<alias>/` directory — there is no general (non-alias) extra file.
- If the extra file exists but is empty (or whitespace-only), it is silently ignored.
- All [template variables](#6-template-variables) are also available in extra files.

**Example result** when `templates/2qui/image-prompt-extra.txt` contains `Use a dark blue color palette.`:

```text
<...rendered base image-prompt content...>

Use a dark blue color palette.
```

### 6. Template Variables

All `.txt` template files (base overrides and extra files) support the following placeholders, which are replaced at render time:

| Variable | Source | Description |
| -------- | ------ | ----------- |
| `{{PODCAST_NAME}}` | `book.podcast` in `src/books.ts` | The podcast show name. |
| `{{EPISODE_TITLE}}` | `chapter.title` in `book.json` | Full title of the current chapter. |
| `{{EPISODE_HEADING}}` | Derived from `chapter.title` | Text before the first `:` in the title, trimmed. |
| `{{EPISODE_SUBHEADING}}` | Derived from `chapter.title` | Text after the first `:` in the title, trimmed. |
| `{{EPISODE_HEADING_UPPER}}` | Derived from `chapter.title` | Same as `{{EPISODE_HEADING}}`, in uppercase. |
| `{{EPISODE_SUBHEADING_UPPER}}` | Derived from `chapter.title` | Same as `{{EPISODE_SUBHEADING}}`, in uppercase. |
| `{{EPISODE_NUMBER}}` | `chapter.order` in `book.json` | Order number of the chapter. |
| `{{EPISODE_DESCRIPTION}}` | `chapter.description` in `book.json` | Chapter description. Empty string if not set. |
| `{{THUMBNAIL_TITLE}}` | `chapter.thumbnailTitle` in `book.json` | Custom thumbnail title. Falls back to `{{EPISODE_TITLE}}` if not set. |
| `{{ARTICLE_URL}}` | Auto-generated | Public URL of the article on the website. |

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
- **Step 4 - Image Prompts:** Copies prompts to the clipboard so you can paste them into Gemini and generate image descriptions.
- **Step 5 - Verification:** Waits for you to place the downloaded audio and images (`[alias].wav`, `[alias].png`) into `sources_today/`.
- **Step 6 - Generation:** Uses **FFmpeg** to create the `.mp4` and `.txt` files in `outputs_today/`. It renders an audio-reactive visualizer and manages background loops.
- **Step 7 - Cleanup:** After uploading everything to YouTube, it packages today's files into a ZIP file in the `backups/` folder and cleans the environment for the next day.

### Filtering / Selecting Episodes

You can selectively process only a subset of books/episodes for the day:

1. Run **Step 1** to generate all metadata `[alias].json` files inside `sources_today/`.
2. Manually delete the `[alias].json` files of the episodes you **do not** wish to process.
3. Continue with **Steps 2 to 7**. The CLI will automatically skip any episode that does not have its corresponding metadata `.json` file inside `sources_today/`.
