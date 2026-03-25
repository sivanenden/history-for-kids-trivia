# History for Kids - Trivia Game

## Project Overview
A Hebrew trivia game for kids based on the podcast "היסטוריה לילדים" (History for Kids) by Yuval Malchi on Kan Educational (~266 episodes). Mobile-first, RTL, static site.

## Architecture

```
History for kids/
├── CLAUDE.md                 # This file
├── PRD.md                    # Full product requirements
├── package.json              # For Vercel deployment
├── .claude/launch.json       # Dev server config
├── public/                   # Static game (deployed as-is)
│   ├── index.html            # Single page app
│   ├── style.css             # All styles
│   ├── app.js                # Game logic
│   ├── data/trivia.json      # All trivia questions
│   └── assets/               # Images/logo
└── scraper/                  # One-time data pipeline
    ├── scrape_podtext.py     # Scrape transcripts from podtext.co.il
    ├── generate_trivia.py    # Generate trivia via Claude API
    └── requirements.txt
```

## Key Technical Decisions
- **Pure vanilla HTML/CSS/JS** - No framework, keeps it simple and fast
- **Static site** - All trivia pre-generated into trivia.json, no backend
- **LocalStorage** - Player profiles, scores, levels stored per-device
- **Heebo font** - Google Fonts, Hebrew-optimized

## Data Pipeline
1. Scrape transcripts from podtext.co.il (Wix blog, needs Playwright for JS rendering)
2. Also pull episode metadata from Omny.fm RSS feed
3. Generate trivia questions via Claude API (5-8 per episode)
4. Output: public/data/trivia.json

## Running Locally
```bash
npx serve public -l 3000
```

## Trivia JSON Schema
```json
{
  "id": 1,
  "question": "Hebrew question text?",
  "options": ["opt1", "opt2", "opt3", "opt4"],
  "correct": 1,           // index into options array
  "funFact": "Hebrew fun fact",
  "episode": "Episode title",
  "topic": "מדע",         // one of: מדע, הרפתקאות, ספורט, מוזיקה ואמנות, ישראל, המצאות, טבע, תרבות, מנהיגים
  "era": "המאה ה-20",     // one of: העת העתיקה, ימי הביניים, העת החדשה המוקדמת, המאה ה-19, המאה ה-20, המאה ה-21
  "difficulty": 1          // 1-3
}
```

## Levels System
Levels progress by total correct answers across all games:
- 0: חוקר מתחיל (🏛️)
- 10: תלמיד היסטוריה (📖)
- 25: סייר בזמן (🧭)
- 50: חוקר מומחה (🔍)
- 80: היסטוריון (🎓)
- 120: מומחה היסטוריה (⭐)
- 170: פרופסור (🏅)
- 230: גאון היסטורי (👑)
- 300: אגדה חיה (🏆)
