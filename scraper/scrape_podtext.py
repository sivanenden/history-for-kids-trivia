#!/usr/bin/env python3
"""
Scrape transcripts for "היסטוריה לילדים" from podtext.co.il and episode metadata from Omny.fm RSS.

Strategy:
1. Parse the Omny.fm RSS feed for episode titles, dates, and audio URLs
2. Parse the PodText sitemap for known transcript URLs
3. For episodes not in sitemap, try constructing URLs from dates
4. Use Playwright to render each PodText page and extract transcript text

Usage:
    pip install -r requirements.txt
    playwright install chromium
    python scrape_podtext.py
"""

import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None

# ===== CONFIG =====
RSS_URL = "https://www.omnycontent.com/d/playlist/23f697a0-7e6a-4e96-a223-a82c00962b12/5d166961-3f93-4859-a8dd-a919008d592b/d7702e41-7c9d-4afe-bf80-a919008d592b/podcast.rss"
SITEMAP_URL = "https://www.podtext.co.il/blog-posts-sitemap.xml"
PODTEXT_BASE = "https://www.podtext.co.il/post/kids-history-"
OUTPUT_FILE = Path(__file__).parent / "transcripts.json"
EPISODES_FILE = Path(__file__).parent / "episodes.json"


def fetch_rss_episodes():
    """Fetch episode metadata from Omny.fm RSS feed."""
    print("Fetching RSS feed...")
    resp = requests.get(RSS_URL, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.content, "lxml-xml")

    episodes = []
    for item in soup.find_all("item"):
        title = item.find("title").text.strip()
        pub_date_str = item.find("pubDate").text.strip()
        # Parse date like "Tue, 24 Mar 2026 22:00:00 +0000"
        try:
            pub_date = datetime.strptime(pub_date_str, "%a, %d %b %Y %H:%M:%S %z")
        except ValueError:
            pub_date = None

        enclosure = item.find("enclosure")
        audio_url = enclosure["url"] if enclosure else None

        duration_tag = item.find("itunes:duration")
        duration = int(duration_tag.text) if duration_tag else None

        description = item.find("description")
        desc_text = description.text.strip() if description else ""

        episodes.append({
            "title": title,
            "date": pub_date.strftime("%Y-%m-%d") if pub_date else None,
            "date_dmy": pub_date.strftime("%d-%m-%Y") if pub_date else None,
            "audio_url": audio_url,
            "duration_seconds": duration,
            "description": desc_text[:200],
        })

    print(f"  Found {len(episodes)} episodes in RSS feed")
    return episodes


def fetch_sitemap_urls():
    """Get known kids-history transcript URLs from PodText sitemap."""
    print("Fetching PodText sitemap...")
    resp = requests.get(SITEMAP_URL, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.content, "lxml-xml")

    urls = []
    for loc in soup.find_all("loc"):
        url = loc.text.strip()
        if "kids-history" in url:
            urls.append(url)

    print(f"  Found {len(urls)} kids-history URLs in sitemap")
    return urls


def build_candidate_urls(episodes, sitemap_urls):
    """Build list of PodText URLs to try, from sitemap + date-based guesses."""
    known = set(sitemap_urls)
    candidates = list(sitemap_urls)

    for ep in episodes:
        if ep["date_dmy"]:
            url = PODTEXT_BASE + ep["date_dmy"]
            if url not in known:
                candidates.append(url)
                known.add(url)

    print(f"  Total candidate URLs to scrape: {len(candidates)}")
    return candidates


def scrape_transcripts(urls):
    """Use Playwright to render PodText pages and extract transcript text."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium")
        sys.exit(1)

    transcripts = {}
    print(f"\nScraping {len(urls)} pages with Playwright...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for i, url in enumerate(urls):
            slug = url.split("/post/")[-1] if "/post/" in url else url
            print(f"  [{i+1}/{len(urls)}] {slug}...", end=" ")

            try:
                page.goto(url, timeout=30000, wait_until="domcontentloaded")
                # Wait for blog content to render (Wix needs time to hydrate)
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
                    print("SKIP (too short or empty)")

            except Exception as e:
                print(f"FAIL ({e})")

            # Be respectful
            time.sleep(1)

        browser.close()

    print(f"\nSuccessfully scraped {len(transcripts)} transcripts")
    return transcripts


def merge_data(episodes, transcripts):
    """Merge RSS episode data with scraped transcripts."""
    merged = []

    for ep in episodes:
        entry = {**ep, "transcript": None}

        # Try matching by date slug
        if ep["date_dmy"]:
            slug = f"kids-history-{ep['date_dmy']}"
            if slug in transcripts:
                entry["transcript"] = transcripts[slug]["text"]
                entry["transcript_source"] = transcripts[slug]["url"]

        merged.append(entry)

    # Also add transcripts that don't match any RSS episode
    matched_slugs = set()
    for ep in merged:
        if ep.get("transcript_source"):
            slug = ep["transcript_source"].split("/post/")[-1]
            matched_slugs.add(slug)

    for slug, data in transcripts.items():
        if slug not in matched_slugs:
            merged.append({
                "title": data["title"],
                "date": None,
                "date_dmy": None,
                "audio_url": None,
                "duration_seconds": None,
                "description": "",
                "transcript": data["text"],
                "transcript_source": data["url"],
            })

    with_transcript = sum(1 for e in merged if e.get("transcript"))
    print(f"\nMerged: {len(merged)} total episodes, {with_transcript} with transcripts")
    return merged


def main():
    print("=" * 60)
    print("היסטוריה לילדים - Transcript Scraper")
    print("=" * 60)

    # Step 1: Fetch RSS
    episodes = fetch_rss_episodes()

    # Save episodes metadata
    with open(EPISODES_FILE, "w", encoding="utf-8") as f:
        json.dump(episodes, f, ensure_ascii=False, indent=2)
    print(f"Saved episodes to {EPISODES_FILE}")

    # Step 2: Fetch sitemap
    sitemap_urls = fetch_sitemap_urls()

    # Step 3: Build candidate URLs
    candidate_urls = build_candidate_urls(episodes, sitemap_urls)

    # Step 4: Scrape transcripts
    transcripts = scrape_transcripts(candidate_urls)

    # Step 5: Merge
    merged = merge_data(episodes, transcripts)

    # Save
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"Saved transcripts to {OUTPUT_FILE}")
    print("\nDone! Next step: run generate_trivia.py")


if __name__ == "__main__":
    main()
