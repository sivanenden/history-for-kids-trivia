#!/usr/bin/env python3
"""
Generate trivia questions from podcast transcripts using Claude API.

Reads transcripts.json (output of scrape_podtext.py) and generates
categorized Hebrew trivia questions for each episode.

Usage:
    export ANTHROPIC_API_KEY=your_key_here
    python generate_trivia.py

Options:
    --input FILE        Input transcripts file (default: scraper/transcripts.json)
    --output FILE       Output trivia file (default: public/data/trivia.json)
    --existing FILE     Existing trivia file to merge with (for incremental updates)
    --max-episodes N    Limit number of episodes to process (for testing)
    --dry-run           Show what would be processed without calling API
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic not installed. Run: pip install anthropic")
    sys.exit(1)

# ===== CONFIG =====
MODEL = "claude-sonnet-4-20250514"
QUESTIONS_PER_EPISODE = 6

TOPICS = ["מדע", "הרפתקאות", "ספורט", "מוזיקה ואמנות", "ישראל", "המצאות", "טבע", "תרבות", "מנהיגים"]
ERAS = ["העת העתיקה", "ימי הביניים", "העת החדשה המוקדמת", "המאה ה-19", "המאה ה-20", "המאה ה-21"]

TOPIC_META = {
    "מדע": {"icon": "🔬", "label": "מדע"},
    "הרפתקאות": {"icon": "🧭", "label": "הרפתקאות"},
    "ספורט": {"icon": "⚽", "label": "ספורט"},
    "מוזיקה ואמנות": {"icon": "🎵", "label": "מוזיקה ואמנות"},
    "ישראל": {"icon": "🇮🇱", "label": "ישראל"},
    "המצאות": {"icon": "💡", "label": "המצאות"},
    "טבע": {"icon": "🌿", "label": "טבע"},
    "תרבות": {"icon": "📚", "label": "תרבות"},
    "מנהיגים": {"icon": "👑", "label": "מנהיגים"},
}

ERA_META = {
    "העת העתיקה": {"icon": "🏛️", "label": "העת העתיקה", "years": "עד 500 לספירה"},
    "ימי הביניים": {"icon": "⚔️", "label": "ימי הביניים", "years": "500-1500"},
    "העת החדשה המוקדמת": {"icon": "🗺️", "label": "העת החדשה המוקדמת", "years": "1500-1800"},
    "המאה ה-19": {"icon": "🏭", "label": "המאה ה-19", "years": "1800-1900"},
    "המאה ה-20": {"icon": "🚀", "label": "המאה ה-20", "years": "1900-2000"},
    "המאה ה-21": {"icon": "💻", "label": "המאה ה-21", "years": "2000-היום"},
}

SYSTEM_PROMPT = """אתה מומחה ביצירת שאלות טריוויה בעברית לילדים בגילאי 10-14, מבוסס על הפודקאסט "היסטוריה לילדים" של יובל מלחי.

כללים:
1. כל שאלה חייבת להיות בעברית תקנית וברורה
2. סימן השאלה (?) בסוף השאלה
3. 4 אפשרויות תשובה - רק אחת נכונה
4. התשובות הלא-נכונות צריכות להיות סבירות אך שגויות בבירור
5. ה-funFact צריך להיות עובדה מעניינת ומפתיעה מהפרק
6. רמת קושי: 1=קל (ידע בסיסי), 2=בינוני (דורש הקשבה לפרק), 3=קשה (פרט ספציפי)
7. השאלות צריכות להיות מגוונות - לא רק "מי היה X?" אלא גם "מה גילה?", "איפה?", "למה?", "מתי?"

סיווג נושאים (topic) - בחר את הנושא המתאים ביותר:
- מדע: מדענים, גילויים מדעיים, רפואה
- הרפתקאות: מגלי ארצות, חוקרים, מסעות
- ספורט: ספורטאים, תחרויות, משחקים
- מוזיקה ואמנות: מוזיקאים, ציירים, יוצרים
- ישראל: היסטוריה ישראלית ויהודית, אישים ישראלים
- המצאות: ממציאים, טכנולוגיה, חידושים
- טבע: בעלי חיים, סביבה, טבע
- תרבות: תרבות פופולרית, היסטוריה של דברים יומיומיים, ספרות
- מנהיגים: מלכים, נשיאים, מנהיגים פוליטיים

סיווג תקופות (era):
- העת העתיקה: עד 500 לספירה
- ימי הביניים: 500-1500
- העת החדשה המוקדמת: 1500-1800
- המאה ה-19: 1800-1900
- המאה ה-20: 1900-2000
- המאה ה-21: 2000-היום"""

USER_PROMPT_TEMPLATE = """צור {n} שאלות טריוויה מבוססות על הטקסט הבא מפרק "{title}" של הפודקאסט "היסטוריה לילדים":

--- תחילת הטקסט ---
{text}
--- סוף הטקסט ---

החזר JSON בלבד (ללא markdown, ללא הסברים) בפורמט הבא:
[
  {{
    "question": "שאלה בעברית?",
    "options": ["תשובה 1", "תשובה 2", "תשובה 3", "תשובה 4"],
    "correct": 0,
    "funFact": "עובדה מעניינת מהפרק",
    "topic": "אחד מ: {topics}",
    "era": "אחד מ: {eras}",
    "difficulty": 1
  }}
]

שים לב:
- correct הוא האינדקס (0-3) של התשובה הנכונה במערך options
- difficulty: 1=קל, 2=בינוני, 3=קשה (מותאם לגיל 12)
- גוון את רמות הקושי (לא הכל קל ולא הכל קשה)
- חשוב מאוד: גוון את סוגי השאלות! אסור שכל השאלות יהיו "מי היה/הייתה X". השתמש בסוגים מגוונים:
  * "מה גילה/המציא X?" - שאלות על הישגים
  * "באיזו שנה / באיזו תקופה קרה X?" - שאלות על זמן
  * "איפה נולד/חי X?" - שאלות על מקום
  * "מה הקשר בין X ל-Y?" - שאלות על קשרים
  * "מה קרה אחרי ש-X?" - שאלות על השלכות
  * "למה X עשה Y?" - שאלות על מוטיבציה
  * "איזה אתגר / מכשול עמד בפני X?" - שאלות על קשיים
  * "מה המיוחד ב-X?" - שאלות על ייחודיות
  * "נכון או לא נכון: ..." (כשאלת ריבוי ברירות) - שאלות על עובדות מפתיעות
- מקסימום שאלה אחת מסוג "מי היה/הייתה" לכל פרק"""


def generate_questions(client, title, text, n=QUESTIONS_PER_EPISODE):
    """Call Claude API to generate trivia questions from a transcript."""
    # Truncate very long transcripts to stay within context
    max_chars = 15000
    if len(text) > max_chars:
        text = text[:max_chars] + "\n...[הטקסט קוצר]"

    prompt = USER_PROMPT_TEMPLATE.format(
        n=n,
        title=title,
        text=text,
        topics=", ".join(TOPICS),
        eras=", ".join(ERAS),
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text.strip()

    # Try to extract JSON from response
    # Sometimes Claude wraps it in ```json ... ```
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    questions = json.loads(content)

    # Validate each question
    valid = []
    for q in questions:
        if (
            isinstance(q.get("question"), str)
            and isinstance(q.get("options"), list)
            and len(q["options"]) == 4
            and isinstance(q.get("correct"), int)
            and 0 <= q["correct"] <= 3
            and q.get("topic") in TOPICS
            and q.get("era") in ERAS
            and q.get("difficulty") in [1, 2, 3]
        ):
            q["episode"] = title
            valid.append(q)

    return valid


def main():
    parser = argparse.ArgumentParser(description="Generate trivia from transcripts")
    parser.add_argument("--input", default=str(Path(__file__).parent / "transcripts.json"))
    parser.add_argument("--output", default=str(Path(__file__).parent.parent / "public" / "data" / "trivia.json"))
    parser.add_argument("--existing", default=None, help="Existing trivia.json to merge with")
    parser.add_argument("--max-episodes", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # Load transcripts
    with open(args.input, "r", encoding="utf-8") as f:
        episodes = json.load(f)

    # Filter to episodes with transcripts
    with_transcripts = [e for e in episodes if e.get("transcript")]
    print(f"Found {len(with_transcripts)} episodes with transcripts (out of {len(episodes)} total)")

    if args.max_episodes:
        with_transcripts = with_transcripts[:args.max_episodes]
        print(f"  Limiting to {len(with_transcripts)} episodes")

    # Load existing trivia (for incremental updates)
    existing_questions = []
    existing_episodes = set()
    if args.existing and Path(args.existing).exists():
        with open(args.existing, "r", encoding="utf-8") as f:
            existing = json.load(f)
            existing_questions = existing.get("questions", [])
            existing_episodes = {q["episode"] for q in existing_questions}
            print(f"  Loaded {len(existing_questions)} existing questions from {len(existing_episodes)} episodes")

    # Filter out already-processed episodes
    new_episodes = [e for e in with_transcripts if e["title"] not in existing_episodes]
    print(f"  {len(new_episodes)} new episodes to process")

    if args.dry_run:
        print("\n[DRY RUN] Would process:")
        for ep in new_episodes:
            print(f"  - {ep['title']} ({len(ep['transcript'])} chars)")
        return

    if not new_episodes:
        print("No new episodes to process. Done!")
        return

    # Initialize Claude client
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    # Generate questions
    all_questions = list(existing_questions)
    next_id = max((q.get("id", 0) for q in all_questions), default=0) + 1

    for i, ep in enumerate(new_episodes):
        title = ep["title"]
        text = ep["transcript"]
        print(f"\n[{i+1}/{len(new_episodes)}] Generating questions for: {title}")

        try:
            questions = generate_questions(client, title, text)
            for q in questions:
                q["id"] = next_id
                next_id += 1
            all_questions.extend(questions)
            print(f"  Generated {len(questions)} questions")
        except json.JSONDecodeError as e:
            print(f"  ERROR parsing response: {e}")
        except Exception as e:
            print(f"  ERROR: {e}")

        # Rate limit
        time.sleep(1)

    # Build output
    output = {
        "meta": {
            "podcast": "היסטוריה לילדים",
            "host": "יובל מלחי",
            "totalQuestions": len(all_questions),
            "lastUpdated": time.strftime("%Y-%m-%d"),
        },
        "topics": TOPIC_META,
        "eras": ERA_META,
        "questions": all_questions,
    }

    # Save
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(all_questions)} questions to {output_path}")
    print(f"Topics: {len(set(q['topic'] for q in all_questions))} unique")
    print(f"Eras: {len(set(q['era'] for q in all_questions))} unique")
    print("Done!")


if __name__ == "__main__":
    main()
