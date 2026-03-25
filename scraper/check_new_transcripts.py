#!/usr/bin/env python3
"""
Check for new transcripts on podtext.co.il and generate trivia for any new episodes.

Run this every ~14 days to pick up new transcripts.
It compares against the existing trivia.json to avoid re-processing.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python check_new_transcripts.py
"""

import json
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None

# ===== CONFIG =====
SITEMAP_URL = "https://www.podtext.co.il/blog-posts-sitemap.xml"
RSS_URL = "https://www.omnycontent.com/d/playlist/23f697a0-7e6a-4e96-a223-a82c00962b12/5d166961-3f93-4859-a8dd-a919008d592b/d7702e41-7c9d-4afe-bf80-a919008d592b/podcast.rss"
TRIVIA_FILE = Path(__file__).parent.parent / "public" / "data" / "trivia.json"
TRANSCRIPTS_FILE = Path(__file__).parent / "transcripts.json"


def get_existing_episodes():
    """Get set of episode titles already in trivia.json."""
    if not TRIVIA_FILE.exists():
        return set()
    with open(TRIVIA_FILE, encoding="utf-8") as f:
        data = json.load(f)
    return set(q["episode"] for q in data.get("questions", []))


def get_existing_transcript_slugs():
    """Get set of slugs already scraped."""
    if not TRANSCRIPTS_FILE.exists():
        return set()
    with open(TRANSCRIPTS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    slugs = set()
    for ep in data:
        if ep.get("transcript_source"):
            slug = ep["transcript_source"].split("/post/")[-1]
            slugs.add(slug)
    return slugs


def fetch_current_sitemap_urls():
    """Get all kids-history URLs currently in sitemap."""
    print("Checking PodText sitemap for new transcripts...")
    resp = requests.get(SITEMAP_URL, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.content, "lxml-xml")

    urls = []
    for loc in soup.find_all("loc"):
        url = loc.text.strip()
        if "kids-history" in url:
            urls.append(url)

    print(f"  Found {len(urls)} total kids-history URLs in sitemap")
    return urls


def find_new_urls(sitemap_urls, existing_slugs):
    """Find URLs that haven't been scraped yet."""
    new_urls = []
    for url in sitemap_urls:
        slug = url.split("/post/")[-1] if "/post/" in url else url
        if slug not in existing_slugs:
            new_urls.append(url)
    return new_urls


def scrape_new_transcripts(urls):
    """Scrape transcript text from new URLs."""
    if not urls:
        return {}

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium")
        sys.exit(1)

    transcripts = {}
    print(f"\nScraping {len(urls)} new pages...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for i, url in enumerate(urls):
            slug = url.split("/post/")[-1] if "/post/" in url else url
            print(f"  [{i+1}/{len(urls)}] {slug}...", end=" ")

            try:
                page.goto(url, timeout=30000, wait_until="domcontentloaded")
                page.wait_for_selector("[data-hook='post-description']", timeout=15000)

                title_el = page.query_selector("[data-hook='post-title']")
                title = title_el.inner_text() if title_el else ""

                content_el = page.query_selector("[data-hook='post-description']")
                text = content_el.inner_text() if content_el else ""

                if text and len(text) > 100:
                    transcripts[slug] = {
                        "title": title,
                        "text": text,
                        "url": url,
                        "char_count": len(text),
                    }
                    print(f"OK ({len(text)} chars)")
                else:
                    print("SKIP (too short)")

            except Exception as e:
                print(f"FAIL ({e})")

            time.sleep(1)

        browser.close()

    return transcripts


def generate_trivia_for_new(transcripts):
    """Generate trivia questions for new transcripts and append to trivia.json."""
    if not transcripts:
        return 0

    import anthropic

    client = anthropic.Anthropic()

    # Load existing trivia
    with open(TRIVIA_FILE, encoding="utf-8") as f:
        trivia_data = json.load(f)

    existing_questions = trivia_data["questions"]
    next_id = max(q["id"] for q in existing_questions) + 1 if existing_questions else 1
    new_count = 0

    topics = list(trivia_data.get("topics", {}).keys())
    eras = list(trivia_data.get("eras", {}).keys())

    for slug, data in transcripts.items():
        title = data["title"]
        text = data["text"][:8000]

        print(f"\n  Generating questions for: {title}")

        prompt = f"""אתה יוצר שאלות טריוויה בעברית לילדים בגילאי 10-14, מבוסס על הפודקאסט "היסטוריה לילדים" עם יובל מלחי.

הפרק: {title}

תמלול (חלקי):
{text}

צור 5-8 שאלות טריוויה מהפרק הזה. כל שאלה צריכה:
1. להיות מעניינת ומתאימה לילדים
2. לכלול 4 אפשרויות תשובה (רק אחת נכונה)
3. לכלול עובדה מעניינת (funFact) שקשורה לשאלה
4. לסווג לנושא אחד מתוך: {', '.join(topics)}
5. לסווג לתקופה אחת מתוך: {', '.join(eras)}
6. לקבוע רמת קושי 1-3

החזר JSON array:
[{{"question": "...", "options": ["א", "ב", "ג", "ד"], "correct": 0, "funFact": "...", "topic": "...", "era": "...", "difficulty": 1}}]

רק JSON, בלי טקסט נוסף."""

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}]
            )

            text_response = response.content[0].text.strip()
            if text_response.startswith("```"):
                text_response = text_response.split("\n", 1)[1].rsplit("```", 1)[0]

            questions = json.loads(text_response)

            for q in questions:
                q["id"] = next_id
                q["episode"] = title
                next_id += 1

            existing_questions.extend(questions)
            new_count += len(questions)
            print(f"  Generated {len(questions)} questions")

        except Exception as e:
            print(f"  ERROR generating questions: {e}")

    # Save updated trivia
    trivia_data["questions"] = existing_questions
    with open(TRIVIA_FILE, "w", encoding="utf-8") as f:
        json.dump(trivia_data, f, ensure_ascii=False, indent=2)

    return new_count


def update_transcripts_file(new_transcripts):
    """Append new transcripts to the existing transcripts.json."""
    existing = []
    if TRANSCRIPTS_FILE.exists():
        with open(TRANSCRIPTS_FILE, encoding="utf-8") as f:
            existing = json.load(f)

    for slug, data in new_transcripts.items():
        existing.append({
            "title": data["title"],
            "date": None,
            "date_dmy": None,
            "audio_url": None,
            "duration_seconds": None,
            "description": "",
            "transcript": data["text"],
            "transcript_source": data["url"],
        })

    with open(TRANSCRIPTS_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)


def main():
    print("=" * 60)
    print("היסטוריה לילדים - New Transcript Checker")
    print("=" * 60)

    # Step 1: Check what we already have
    existing_slugs = get_existing_transcript_slugs()
    print(f"Already scraped: {len(existing_slugs)} transcripts")

    # Step 2: Check sitemap for current URLs
    sitemap_urls = fetch_current_sitemap_urls()

    # Step 3: Find new ones
    new_urls = find_new_urls(sitemap_urls, existing_slugs)
    print(f"\n🆕 Found {len(new_urls)} new transcript(s)!")

    if not new_urls:
        print("\nNo new transcripts to process. Try again in 14 days.")
        return

    # Step 4: Scrape new transcripts
    new_transcripts = scrape_new_transcripts(new_urls)

    if not new_transcripts:
        print("\nNo usable transcripts found in new pages.")
        return

    # Step 5: Update transcripts file
    update_transcripts_file(new_transcripts)

    # Step 6: Generate trivia questions
    print(f"\n📝 Generating trivia for {len(new_transcripts)} new episodes...")
    new_count = generate_trivia_for_new(new_transcripts)

    print(f"\n✅ Done! Added {new_count} new questions from {len(new_transcripts)} episodes")
    print(f"Total questions now: check public/data/trivia.json")
    print("\nDon't forget to commit and push:")
    print("  git add public/data/trivia.json scraper/transcripts.json")
    print('  git commit -m "Add trivia from new transcripts"')
    print("  git push")


if __name__ == "__main__":
    main()
