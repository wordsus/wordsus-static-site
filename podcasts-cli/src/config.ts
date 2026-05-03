/**
 * Main configuration for the Podcasts CLI tool.
 * Adjust these values to match your environment.
 */
export const config = {
  /**
   * Path to the working directory.
   */
  workingDir: process.env.PODCASTS_WORKING_DIR ?? "/Users/fabian/Downloads/podcasts",

  /**
   * Path to the wordsus-static-site content directory.
   * Used to read book.json files.
   */
  contentDir: process.env.PODCASTS_CONTENT_DIR ?? "/Users/fabian/Documents/CodeProjects/github.com/wordsus/wordsus-static-site/content",

  /**
   * Number of days to keep backup zip files before permanent deletion.
   */
  backupRetentionDays: 7,

  /**
   * Number of days to keep log files before permanent deletion.
   */
  logRetentionDays: 7,

  /**
   * Base URL of the published website. Used to construct article URLs.
   */
  siteBaseUrl: "https://wordsus.com",

  /**
   * Video generation settings.
   */
  video: {
    visualizer: {
      sensitivity: 0.8,
      style: "wave" as "bars" | "wave" | "circle" | "spectrum",
      color: "#00FFAA",
      height: 400,
      bands: 64,
    },
    output: {
      codec: "libx264",
      crf: 22,
      resolution: "1920x1080",
      fps: 30,
    },
    loop: {
      crossfadeDuration: 1.0,
    },
  },
} as const;
