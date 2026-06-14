import json
import time
import re
import unicodedata
import sys
import os
from deep_translator import GoogleTranslator

def slugify(value):
    """
    Normalizes string, converts to lowercase, removes non-alpha characters,
    and converts spaces to hyphens.
    """
    value = str(value)
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^\w\s-]', '', value).strip().lower()
    value = re.sub(r'[-\s]+', '-', value)
    return value

def translate_text(text, max_retries=3):
    if not text:
        return text
    
    for attempt in range(max_retries):
        try:
            translator = GoogleTranslator(source='es', target='en')
            translated = translator.translate(text)
            return translated
        except Exception as e:
            print(f"Error translating '{text}': {e}. Retrying ({attempt + 1}/{max_retries})...")
            time.sleep(2)
    print(f"Failed to translate '{text}' after {max_retries} attempts.")
    return text

def main():
    if len(sys.argv) < 2:
        print("Usage: python translate_book.py <path_to_book.json>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    
    if not os.path.exists(input_file):
        print(f"Error: File not found: {input_file}")
        sys.exit(1)

    print(f"Loading JSON data from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("Translating book metadata...")
    data['title'] = translate_text(data['title'])
    data['description'] = translate_text(data['description'])
    data['category'] = translate_text(data['category']).lower()
    data['author'] = "Wordsus Team"
    
    # Handle specific tags or translate them individually
    translated_tags = []
    for tag in data.get('tags', []):
        translated_tags.append(slugify(translate_text(tag)))
    data['tags'] = translated_tags
    
    data['locale'] = 'en'
    data['language'] = 'en'
    
    book_slug = slugify(data['title'].split(':')[0]) # General translation of title slug
    
    # If the folder name indicates a specific slug we might want to use it
    folder_name = os.path.basename(os.path.dirname(input_file))
    if folder_name != book_slug:
         print(f"Note: Folder name ({folder_name}) doesn't match translated title slug ({book_slug}). Using folder name as slug.")
         data['slug'] = folder_name
    else:
         data['slug'] = book_slug

    # Update cover image filename based on the english slug
    if 'cover' in data:
        data['cover'] = f"/images/books/{data['slug']}-en-cover.jpeg"
        
    print(f"Book title translated to: {data['title']}")
    
    chapters = data.get('chapters', [])
    total_chapters = len(chapters)
    print(f"Translating {total_chapters} chapters...")
    
    for i, chapter in enumerate(chapters):
        if i % 10 == 0:
            print(f"Progress: {i}/{total_chapters} chapters translated...")
            
        original_title = chapter.get('title', '')
        original_desc = chapter.get('description', '')
        
        translated_title = translate_text(original_title)
        translated_desc = translate_text(original_desc)
        
        chapter['title'] = translated_title
        chapter['description'] = translated_desc
        chapter['slug'] = slugify(translated_title)
        
        # Adding a small sleep to avoid rate limiting
        time.sleep(0.1)

    print(f"Progress: {total_chapters}/{total_chapters} chapters translated.")
    
    print("Saving translated JSON data...")
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print("Translation completed successfully!")

if __name__ == '__main__':
    main()
