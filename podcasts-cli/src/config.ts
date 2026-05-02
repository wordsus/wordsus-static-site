/**
 * Main configuration for the Podcasts CLI tool.
 * Adjust these values to match your environment.
 */
export const config = {
  /**
   * Path to the working directory shared with the Python video-generation script.
   * This must match the WORKING_DIR variable in the Python script.
   * Example: "/Users/yourname/Downloads/podcasts"
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
   * Path to the Python video-generation script.
   * The script will be called with `python3 <scriptPath>`.
   */
  pythonScriptPath: process.env.PODCASTS_PYTHON_SCRIPT ?? "/Users/fabian/scripts/generate_podcast_video.py",

  /**
   * Base URL of the published website. Used to construct article URLs.
   */
  siteBaseUrl: "https://wordsus.com",
} as const;
