# Scripts

This directory contains utility scripts to automate content management tasks for the Wordsus static site.

## Sync YouTube Videos to Chapters (`fetch_youtube_videos.py`)

This script fetches recent videos from configured YouTube channels and populates the `videoUrl` field in the corresponding book chapter metadata inside `book.json`.

### How it works

1. **Channel Resolution**: The script takes a list of book directories and their associated YouTube channel URLs. It automatically resolves the channel ID by scraping the channel page.
2. **Recent Video Retrieval**: It retrieves the RSS feed for each channel. By default, YouTube RSS feeds provide the latest 15 videos.
3. **Filtering**: It filters out videos published before a configurable `START_DATE` (default is `"2026-05-20"`).
4. **Matching**:
   - **By Title**: It normalizes both the video title and the chapter title (lowercasing, stripping accents, stripping punctuation, collapsing whitespace) and looks for an exact match.
   - **By Description URL**: If a video's title was manually modified on YouTube and does not match the chapter title, the script scans the video description for a URL starting with `https://wordsus.com`. It extracts the chapter slug from the end of the URL and matches it against the book's chapters.
5. **Updating book.json**: If a match is found and the chapter's `videoUrl` is empty or different, it updates it to the YouTube video URL (`https://www.youtube.com/watch?v=VIDEO_ID`) and writes the changes back to `book.json` preserving original formatting and non-ASCII character encoding.

### Running the script

Run the script directly using Python 3:

```bash
python3 fetch_youtube_videos.py
```

### Configuration

You can customize the following configuration options directly at the top of `fetch_youtube_videos.py`:

- `START_DATE`: Filter out videos published before this date (format: `YYYY-MM-DD`).
- `REQUEST_DELAY`: The delay (in seconds) between requests to YouTube. This prevents YouTube from throttling or blocking your IP address (default: `3.0` seconds).
- `BOOKS_CONFIG`: The list of mapping objects linking book directory paths to YouTube channels.
