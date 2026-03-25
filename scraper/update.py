#!/usr/bin/env python3
"""
Monthly update script: check for new episodes, scrape transcripts, generate trivia.

This script is designed to be run monthly (or on-demand) to:
1. Check the RSS feed for new episodes since last run
2. Scrape any new transcripts from PodText
3. Generate trivia questions for new episodes only
4. Merge with existing trivia.json

Usage:
    export ANTHROPIC_API_KEY=your_key_here
    python update.py

    # Dry run (check for new episodes without processing):
    python update.py --dry-run
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

SCRAPER_DIR = Path(__file__).parent
PROJECT_DIR = SCRAPER_DIR.parent
TRANSCRIPTS_FILE = SCRAPER_DIR / "transcripts.json"
TRIVIA_FILE = PROJECT_DIR / "public" / "data" / "trivia.json"


def get_existing_episode_titles():
    """Get set of episode titles already in trivia.json."""
    if not TRIVIA_FILE.exists():
        return set()
    with open(TRIVIA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {q["episode"] for q in data.get("questions", [])}


def main():
    parser = argparse.ArgumentParser(description="Monthly update for new episodes")
    parser.add_argument("--dry-run", action="store_true", help="Check for new episodes without processing")
    args = parser.parse_args()

    existing = get_existing_episode_titles()
    print(f"Existing trivia covers {len(existing)} episodes")

    # Step 1: Run the scraper
    print("\n" + "=" * 60)
    print("Step 1: Scraping transcripts")
    print("=" * 60)
    result = subprocess.run(
        [sys.executable, str(SCRAPER_DIR / "scrape_podtext.py")],
        cwd=str(SCRAPER_DIR),
    )
    if result.returncode != 0:
        print("Scraper failed!")
        sys.exit(1)

    # Check how many new episodes
    if TRANSCRIPTS_FILE.exists():
        with open(TRANSCRIPTS_FILE, "r", encoding="utf-8") as f:
            transcripts = json.load(f)
        new_with_transcript = [
            e for e in transcripts
            if e.get("transcript") and e["title"] not in existing
        ]
        print(f"\nFound {len(new_with_transcript)} new episodes with transcripts:")
        for ep in new_with_transcript:
            print(f"  - {ep['title']}")

        if not new_with_transcript:
            print("\nNo new episodes to process. Everything is up to date!")
            return

    if args.dry_run:
        print("\n[DRY RUN] Would generate trivia for the above episodes.")
        return

    # Step 2: Generate trivia for new episodes
    print("\n" + "=" * 60)
    print("Step 2: Generating trivia questions")
    print("=" * 60)
    gen_args = [
        sys.executable,
        str(SCRAPER_DIR / "generate_trivia.py"),
        "--input", str(TRANSCRIPTS_FILE),
        "--output", str(TRIVIA_FILE),
        "--existing", str(TRIVIA_FILE),
    ]
    result = subprocess.run(gen_args, cwd=str(SCRAPER_DIR))
    if result.returncode != 0:
        print("Trivia generation failed!")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("Update complete!")
    print("=" * 60)

    # Show summary
    if TRIVIA_FILE.exists():
        with open(TRIVIA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"Total questions: {data['meta']['totalQuestions']}")
        print(f"Last updated: {data['meta']['lastUpdated']}")


if __name__ == "__main__":
    main()
