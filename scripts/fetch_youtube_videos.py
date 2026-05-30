#!/usr/bin/env python3
import os
import re
import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import unicodedata

# ==============================================================================
# Configuration
# ==============================================================================
START_DATE = "2026-05-20"  # Only consider videos published on or after this date (YYYY-MM-DD)
REQUEST_DELAY = 1.0       # Delay in seconds between requests to YouTube to prevent IP block

# Export configuration for external veobible-app
EXPORT_SELECTED_BOOKS = ["la-biblia-en-contexto", "the-bible-in-context"]
JSON_EXPORT_DIR = "../../../xeost/veobible-app/src/data"
IMAGE_EXPORT_DIR = "../../../xeost/veobible-app/public/images"

# Mapping of book content directories to their YouTube channel URLs
BOOKS_CONFIG = [
    {
        "book_path": "../content/es/books/fisica-para-mortales",
        "youtube_url": "https://www.youtube.com/@fisica-para-mortales"
    },
    {
        "book_path": "../content/es/books/quimica-para-mortales",
        "youtube_url": "https://www.youtube.com/@quimica-para-mortales"
    },
    {
        "book_path": "../content/es/books/astronomia-para-mortales",
        "youtube_url": "https://www.youtube.com/@astronomia-para-mortales"
    },
    {
        "book_path": "../content/es/books/biologia-para-mortales",
        "youtube_url": "https://www.youtube.com/@biologia-para-mortales"
    },
    {
        "book_path": "../content/es/books/la-biblia-en-contexto",
        "youtube_url": "https://www.youtube.com/@la-biblia-en-contexto"
    },
    {
        "book_path": "../content/es/books/nutricion-para-mortales",
        "youtube_url": "https://www.youtube.com/@nutricion-para-mortales"
    },
    {
        "book_path": "../content/es/books/psicologia-para-mortales",
        "youtube_url": "https://www.youtube.com/@psicologia-para-mortales"
    },
    {
        "book_path": "../content/es/books/economia-austriaca-para-mortales",
        "youtube_url": "https://www.youtube.com/@economia-austriaca"
    },
    {
        "book_path": "../content/en/books/physics-for-mortals",
        "youtube_url": "https://www.youtube.com/@physics-for-mortals"
    },
    {
        "book_path": "../content/en/books/chemistry-for-mortals",
        "youtube_url": "https://www.youtube.com/@chemistry-for-mortals"
    },
    {
        "book_path": "../content/en/books/astronomy-for-mortals",
        "youtube_url": "https://www.youtube.com/@astronomy-for-mortals"
    },
    {
        "book_path": "../content/en/books/biology-for-mortals",
        "youtube_url": "https://www.youtube.com/@biology-for-mortals"
    },
    {
        "book_path": "../content/en/books/the-bible-in-context",
        "youtube_url": "https://www.youtube.com/@the-bible-context"
    },
    {
        "book_path": "../content/en/books/nutrition-for-mortals",
        "youtube_url": "https://www.youtube.com/@nutrition-for-mortals"
    },
    {
        "book_path": "../content/en/books/psychology-for-mortals",
        "youtube_url": "https://www.youtube.com/@psychology-for-mortals"
    },
    {
        "book_path": "../content/en/books/austrian-economics-for-mortals",
        "youtube_url": "https://www.youtube.com/@austrian-economics"
    }
]

# ==============================================================================
# Helper Functions
# ==============================================================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Caches to avoid redundant network requests
channel_id_cache = {}  # youtube_handle -> channel_id
rss_feed_cache = {}    # channel_id -> list of video dicts

def normalize_text(text):
    """Normalize text by converting to lowercase, removing accents and punctuation, and collapsing spaces."""
    if not text:
        return ""
    text = text.lower()
    # Normalize unicode to decompose accents (e.g. á -> a + accent)
    text = unicodedata.normalize('NFKD', text)
    # Remove combining accent characters
    text = "".join([c for c in text if not unicodedata.combining(c)])
    # Remove non-alphanumeric characters except spaces
    text = re.sub(r'[^a-z0-9\s]', '', text)
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def get_channel_handle(url):
    """Extract channel handle (e.g., @name) from a YouTube URL."""
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.strip('/')
    if path.startswith('@'):
        return path
    return None

def fetch_html(url):
    """Fetch HTML content from a URL with custom User-Agent."""
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req) as response:
        return response.read().decode('utf-8')

def get_channel_id(handle):
    """Resolve channel ID from handle by scraping the channel page."""
    if handle in channel_id_cache:
        return channel_id_cache[handle]
    
    url = f"https://www.youtube.com/{handle}"
    print(f"Resolving channel ID for {handle}...")
    try:
        html = fetch_html(url)
        # Try primary itemprop identifier meta tag
        match = re.search(r'<meta itemprop="identifier" content="([^"]+)"', html)
        if match:
            channel_id = match.group(1)
            channel_id_cache[handle] = channel_id
            time.sleep(REQUEST_DELAY)
            return channel_id
            
        # Try fallback patterns
        match = re.search(r'"externalId":"([^"]+)"', html)
        if match:
            channel_id = match.group(1)
            channel_id_cache[handle] = channel_id
            time.sleep(REQUEST_DELAY)
            return channel_id
            
        match = re.search(r'<meta property="og:url" content="https://www.youtube.com/channel/([^"]+)"', html)
        if match:
            channel_id = match.group(1)
            channel_id_cache[handle] = channel_id
            time.sleep(REQUEST_DELAY)
            return channel_id

        raise ValueError(f"Could not find channel ID patterns in HTML for handle: {handle}")
    except Exception as e:
        print(f"Error resolving channel ID for {handle}: {e}")
        return None

def fetch_rss_feed(channel_id):
    """Fetch and parse YouTube RSS feed for a channel ID."""
    if channel_id in rss_feed_cache:
        return rss_feed_cache[channel_id]
        
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    print(f"Fetching RSS feed for channel ID {channel_id}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        namespaces = {
            'atom': 'http://www.w3.org/2005/Atom',
            'yt': 'http://www.youtube.com/xml/schemas/2015',
            'media': 'http://search.yahoo.com/mrss/'
        }
        
        videos = []
        for entry in root.findall('atom:entry', namespaces):
            video_id = entry.find('yt:videoId', namespaces).text
            title = entry.find('atom:title', namespaces).text
            published = entry.find('atom:published', namespaces).text
            
            description = ""
            media_group = entry.find('media:group', namespaces)
            if media_group is not None:
                desc_el = media_group.find('media:description', namespaces)
                if desc_el is not None:
                    description = desc_el.text or ""
                    
            videos.append({
                'id': video_id,
                'title': title,
                'published': published,
                'description': description
            })
            
        rss_feed_cache[channel_id] = videos
        time.sleep(REQUEST_DELAY)
        return videos
    except Exception as e:
        print(f"Error fetching/parsing RSS feed for {channel_id}: {e}")
        return []

def extract_slug_from_description(description):
    """Find wordsus.com URLs in the description and extract the last path segment (slug)."""
    # Regex to find wordsus.com links
    urls = re.findall(r'https?://(?:www\.)?wordsus\.com/[a-zA-Z0-9\-_/]+', description)
    for url in urls:
        # Parse the path of the URL
        parsed_url = urllib.parse.urlparse(url)
        path_segments = [seg for seg in parsed_url.path.split('/') if seg]
        if path_segments:
            # The last segment is the chapter slug
            return path_segments[-1]
    return None

def get_video_id_from_url(url):
    """Extract YouTube video ID from various video URL formats."""
    if not url:
        return None
    parsed = urllib.parse.urlparse(url)
    if parsed.hostname in ('youtube.com', 'www.youtube.com', 'm.youtube.com'):
        query = urllib.parse.parse_qs(parsed.query)
        if 'v' in query:
            return query['v'][0]
    if parsed.hostname == 'youtu.be':
        return parsed.path.strip('/')
    if parsed.hostname in ('youtube.com', 'www.youtube.com') and parsed.path.startswith('/embed/'):
        parts = parsed.path.split('/')
        if len(parts) > 2:
            return parts[2]
    return None

def download_image(video_id, output_path):
    """Download the highest resolution thumbnail available for the video (maxresdefault, sddefault, or hqdefault)."""
    import urllib.error
    resolutions = ["maxresdefault", "sddefault", "hqdefault"]
    for res in resolutions:
        url = f"https://img.youtube.com/vi/{video_id}/{res}.jpg"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req) as response:
                with open(output_path, 'wb') as f:
                    f.write(response.read())
            print(f"    -> Downloaded {res} thumbnail to: {output_path}")
            time.sleep(REQUEST_DELAY)
            return True
        except urllib.error.HTTPError as e:
            if e.code == 404:
                # 404 means the resolution isn't available, try the next lower resolution
                continue
            else:
                print(f"    [Error] HTTP error {e.code} while downloading {res} from {url}")
        except Exception as e:
            print(f"    [Error] Failed to download thumbnail {res} from {url}: {e}")
            
    return False

# ==============================================================================
# Main Execution Flow
# ==============================================================================
def main():
    print("==============================================================================")
    print(f"Starting YouTube Video Sync script (Publish date >= {START_DATE})")
    print("==============================================================================")
    
    total_books_updated = 0
    total_chapters_updated = 0
    
    for book in BOOKS_CONFIG:
        # Resolve book.json path relative to the script directory
        book_dir = os.path.normpath(os.path.join(SCRIPT_DIR, book["book_path"]))
        book_json_path = os.path.join(book_dir, "book.json")
        
        if not os.path.exists(book_json_path):
            print(f"\n[Warning] book.json not found for path: {book_json_path}. Skipping.")
            continue
            
        print(f"\nProcessing book: {os.path.basename(book_dir)}...")
        
        # Read book.json
        try:
            with open(book_json_path, "r", encoding="utf-8") as f:
                book_data = json.load(f)
        except Exception as e:
            print(f"[Error] Failed to read/parse {book_json_path}: {e}")
            continue
            
        chapters = book_data.get("chapters", [])
        if not chapters:
            print(f"No chapters found in book.json. Skipping.")
            continue
            
        # Get handle and channel ID
        youtube_url = book["youtube_url"]
        handle = get_channel_handle(youtube_url)
        if not handle:
            print(f"[Error] Invalid handle in URL: {youtube_url}. Skipping.")
            continue
            
        channel_id = get_channel_id(handle)
        if not channel_id:
            print(f"[Error] Could not retrieve channel ID for handle {handle}. Skipping.")
            continue
            
        # Fetch RSS Feed
        videos = fetch_rss_feed(channel_id)
        if not videos:
            print(f"No videos retrieved from feed. Skipping.")
            continue
            
        # Filter videos on/after START_DATE
        filtered_videos = [v for v in videos if v['published'][:10] >= START_DATE]
        print(f"Found {len(filtered_videos)} videos published on or after {START_DATE}.")
        
        # Build indexes of chapters to quickly match
        chapters_by_normalized_title = {}
        chapters_by_slug = {}
        for ch in chapters:
            norm_title = normalize_text(ch.get("title", ""))
            if norm_title:
                chapters_by_normalized_title[norm_title] = ch
            slug = ch.get("slug", "")
            if slug:
                chapters_by_slug[slug] = ch
                
        # Match videos to chapters
        book_modified = False
        chapters_updated_count = 0
        
        for video in filtered_videos:
            matched_chapter = None
            video_title = video['title']
            video_id = video['id']
            video_desc = video['description']
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            
            # Step 1: Match by exact normalized title
            norm_video_title = normalize_text(video_title)
            if norm_video_title in chapters_by_normalized_title:
                matched_chapter = chapters_by_normalized_title[norm_video_title]
                print(f"  [Match by Title] Video '{video_title}' -> Chapter '{matched_chapter['title']}'")
            else:
                # Step 2: Match by parsing description URL
                chapter_slug = extract_slug_from_description(video_desc)
                if chapter_slug and chapter_slug in chapters_by_slug:
                    matched_chapter = chapters_by_slug[chapter_slug]
                    print(f"  [Match by URL Slug] Video '{video_title}' -> Chapter '{matched_chapter['title']}'")
                    
            # If we matched a chapter, update its videoUrl
            if matched_chapter:
                current_video_url = matched_chapter.get("videoUrl", "")
                if current_video_url != video_url:
                    matched_chapter["videoUrl"] = video_url
                    book_modified = True
                    chapters_updated_count += 1
                    print(f"    -> Updated videoUrl to: {video_url}")
                else:
                    print(f"    -> videoUrl is already up to date: {video_url}")
            else:
                print(f"  [No Match] Video '{video_title}' ({video_id}) could not be matched to any chapter.")
                
        # Save back to book.json if modified
        if book_modified:
            try:
                with open(book_json_path, "w", encoding="utf-8") as f:
                    json.dump(book_data, f, indent=2, ensure_ascii=False)
                    # Add trailing newline for formatting consistency
                    f.write("\n")
                print(f"[Saved] Updated book.json successfully with {chapters_updated_count} updates.")
                total_books_updated += 1
                total_chapters_updated += chapters_updated_count
            except Exception as e:
                print(f"[Error] Failed to write to {book_json_path}: {e}")
        else:
            print(f"No changes made to book.json.")

        # Check if this book needs to be exported
        book_slug = book_data.get("slug")
        if book_slug in EXPORT_SELECTED_BOOKS:
            print(f"Exporting data and thumbnails for selected book: {book_slug}...")
            
            # Resolve target export directories
            resolved_json_export_dir = os.path.normpath(os.path.join(SCRIPT_DIR, JSON_EXPORT_DIR))
            resolved_image_export_dir = os.path.normpath(os.path.join(SCRIPT_DIR, IMAGE_EXPORT_DIR))
            
            # Ensure directories exist
            os.makedirs(resolved_json_export_dir, exist_ok=True)
            book_image_dir = os.path.join(resolved_image_export_dir, book_slug)
            os.makedirs(book_image_dir, exist_ok=True)
            
            videos_list = []
            for ch in chapters:
                ch_video_url = ch.get("videoUrl")
                if ch_video_url:
                    video_id = get_video_id_from_url(ch_video_url)
                    if video_id:
                        ch_slug = ch.get("slug")
                        image_filename = f"{ch_slug}.jpg"
                        target_image_path = os.path.join(book_image_dir, image_filename)
                        
                        # Download thumbnail if not already present
                        if not os.path.exists(target_image_path):
                            download_image(video_id, target_image_path)
                        else:
                            print(f"    -> Thumbnail already exists: {image_filename}")
                            
                        videos_list.append({
                            "title": ch.get("title", ""),
                            "description": ch.get("description", ""),
                            "videoUrl": ch_video_url,
                            "imageFilename": image_filename
                        })
            
            # Export JSON file
            export_data = {
                "language": book_data.get("language") or book_data.get("locale") or "",
                "name": book_data.get("title") or "",
                "slug": book_slug,
                "description": book_data.get("description") or "",
                "youtubeUrl": youtube_url,
                "videos": videos_list
            }
            
            json_export_path = os.path.join(resolved_json_export_dir, f"{book_slug}.json")
            try:
                with open(json_export_path, "w", encoding="utf-8") as f:
                    json.dump(export_data, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                print(f"[Exported] Saved JSON metadata to: {json_export_path}")
            except Exception as e:
                print(f"[Error] Failed to write export JSON to {json_export_path}: {e}")
            
    print("\n==============================================================================")
    print("Sync complete!")
    print(f"Total books updated: {total_books_updated}")
    print(f"Total chapter URLs updated: {total_chapters_updated}")
    print("==============================================================================")

if __name__ == "__main__":
    main()
