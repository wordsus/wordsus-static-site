/**
 * Main configuration for the Podcasts CLI tool.
 * Adjust these values to match your environment.
 */
export const config = {
  /**
   * Path to the working directory.
   */
  workingDir: process.env.PODCASTS_WORKING_DIR ?? "/Users/fabian/Documents/podcasts",

  /**
   * Path to the wordsus-static-site content directory.
   * Used to read book.json files.
   */
  contentDir: process.env.PODCASTS_CONTENT_DIR ?? "/Users/fabian/Documents/CodeProjects/github.com/wordsus/wordsus-static-site/frontend/content",

  /**
   * Number of episode-generation sessions to keep backup zip files.
   * Each distinct calendar date on which an episode was generated counts as one session.
   * For example, with a weekly schedule, a value of 3 retains backups from the last 3 weeks.
   */
  backupRetentionSessions: 3,

  /**
   * Number of days to keep log files before permanent deletion.
   */
  logRetentionDays: 7,

  /**
   * Base URL of the published website. Used to construct article URLs.
   */
  siteBaseUrl: "https://wordsus.com",

  /**
   * Scheduling settings for YouTube uploads.
   * baseDate is the anchor point: episode 1 is scheduled on this date.
   * Each subsequent episode adds 1 day.
   * Derived from: episode 16 → May 15, 2026 → baseDate = April 30, 2026.
   */
  schedule: {
    /**
     * Anchor date for episode scheduling (YYYY-MM-DD).
     * Episode 1 is scheduled on the first available publish day on or after this date.
     * Each subsequent episode is scheduled on the next available publish day.
     * Derived from: episode 16 → May 15, 2026 → baseDate = April 30, 2026.
     */
    baseDate: "2026-07-06",
    /**
     * Weekdays on which to publish episodes.
     * Can be an array of English weekday strings (e.g. ["Tuesday", "Friday"]).
     * Case-insensitive, supports short/long names, and falls back to all days if empty.
     */
    publishDays: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ],
    /**
     * Fixed upload time shown in the YouTube info file.
     * Format: 12-hour clock with AM/PM, e.g. "3:30 PM".
     */
    scheduledTime: "3:00 PM",
  },

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
