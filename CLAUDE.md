# History for Kids - Trivia Game

## Project Overview
A Hebrew trivia game for kids based on the podcast "היסטוריה לילדים" (History for Kids) by Yuval Malchi on Kan Educational (~266 episodes). Mobile-first, RTL, static site with an adventure map / explorer's journal visual theme.

**Live URL**: Deployed on Vercel (auto-deploys on git push)
**Built for**: Gur (age 12), avid listener of the podcast

## Architecture

```
History for kids/
├── CLAUDE.md                          # This file
├── PRD.md                             # Full product requirements
├── package.json                       # For Vercel deployment
├── .claude/launch.json                # Dev server config
├── public/                            # Static game (deployed as-is)
│   ├── index.html                     # Single page app with inline SVG icons
│   ├── style.css                      # Adventure map theme styles
│   ├── app.js                         # Game logic + challenge system
│   ├── data/trivia.json               # 848 questions from 143 episodes
│   └── assets/
│       └── podcast-cover.jpg          # Podcast cover art
└── scraper/                           # Data pipeline
    ├── scrape_podtext.py              # Scrape transcripts from podtext.co.il
    ├── generate_trivia.py             # Generate trivia via Claude API
    ├── check_new_transcripts.py       # Periodic checker for new transcripts
    ├── transcripts.json               # Scraped transcript data (not in git)
    ├── episodes.json                  # RSS episode metadata (not in git)
    └── requirements.txt
```

## Key Technical Decisions
- **Pure vanilla HTML/CSS/JS** - No framework, keeps it simple and fast
- **Static site** - All trivia pre-generated into trivia.json, no backend needed
- **LocalStorage** - Player profiles, scores, levels, badges stored per-device
- **Rubik font** - Google Fonts, Hebrew-optimized, modern feel
- **No backend for challenges** - Challenge data encoded in URL params (base64)
- **SVG icons** - Custom inline SVGs instead of emojis for menu icons

## Visual Theme
**Adventure Map / Explorer's Journal** style:
- Warm palette: deep browns (#1a0f0a), leather (#8B4513), parchment (#F5E6C8), compass gold (#C8960E), explorer blue (#2C5F7C)
- Parchment texture background via CSS gradients
- Journal-style cards with right-border color accents
- Custom SVG icons: compass, scroll, open book, hourglass, star, medal

## Game Features

### Core Game Modes
- **טריוויה אקראית** (Random Trivia) - 10 random questions from all topics/eras
- **אתגר יומי** (Daily Challenge) - 5 seeded questions, same for all players each day, tracks streaks
- **לפי נושא** (By Topic) - Filter by 9 topics (מדע, הרפתקאות, ספורט, מוזיקה ואמנות, ישראל, המצאות, טבע, תרבות, מנהיגים)
- **לפי תקופה** (By Era) - Filter by 6 eras (העת העתיקה through המאה ה-21)

### Player System
- Multiple player profiles per device
- Progress tracking (total correct, games played, best score, best streak)
- Level progression system (9 levels from חוקר מתחיל to אגדה חיה)

### Challenge-a-Friend System (⚔️ אתגר חבר)
Flow:
1. Player A finishes a game → clicks "⚔️ אתגר חבר"
2. Opens WhatsApp with challenge link (question IDs + score + time encoded in URL)
3. Player B opens link → sees challenge intro screen with Player A's score
4. Player B plays the exact same questions
5. VS comparison screen shows both scores + times + winner
6. Player B can "שלח תוצאה חזרה" (send result back) via WhatsApp
7. Both players can view a shared results card link

### Other Features
- **⏱️ Timed mode** - 15-second timer per question, bonus points for fast answers
- **🐿️ שאל את פיצי** (Ask Pizi) - Hint system, eliminates 2 wrong answers (3 hints per game)
- **🔊 Sound effects** - Synthesized tones for correct/wrong/level-up (Web Audio API)
- **🎖️ Badges** - 9 achievements (first win, perfect score, hot streak, etc.)
- **🏆 Leaderboard** - Local leaderboard across all players on device
- **Spotify link** - Each question links to the podcast on Spotify
- **Confetti** - CSS animation on wins and level-ups
- **Keyboard support** - Number keys 1-4 for answers, Enter/Space for next

## Data Pipeline

### Initial Scraping (already done)
1. `scrape_podtext.py` - Scrapes transcripts from podtext.co.il (Wix blog, needs Playwright)
2. Also pulls episode metadata from Omny.fm RSS feed
3. `generate_trivia.py` - Generates 5-8 trivia questions per episode via Claude API
4. Output: `public/data/trivia.json` (848 questions from 143 episodes)

### Periodic Updates (every ~14 days)
Run `check_new_transcripts.py` to check for new transcripts:
```bash
cd scraper
export ANTHROPIC_API_KEY=sk-ant-...
python check_new_transcripts.py
# If new questions found:
cd ..
git add public/data/trivia.json scraper/transcripts.json
git commit -m "Add trivia from new transcripts"
git push
```

### Coverage
- Total podcast episodes: ~266
- Episodes with transcripts on podtext.co.il: 146
- Episodes covered in trivia: 143
- Total questions: 848
- Coverage: ~54%

## Trivia JSON Schema
```json
{
  "meta": { "generated": "...", "totalQuestions": 848 },
  "topics": { "מדע": { "icon": "🔬", "label": "מדע וטכנולוגיה" }, ... },
  "eras": { "העת העתיקה": { "icon": "🏛️", "label": "העת העתיקה" }, ... },
  "questions": [
    {
      "id": 1,
      "question": "Hebrew question text?",
      "options": ["opt1", "opt2", "opt3", "opt4"],
      "correct": 1,
      "funFact": "Hebrew fun fact",
      "episode": "Episode title",
      "topic": "מדע",
      "era": "המאה ה-20",
      "difficulty": 1
    }
  ]
}
```

## Levels System
| Threshold | Name | Icon |
|-----------|------|------|
| 0 | חוקר מתחיל | 🏛️ |
| 10 | תלמיד היסטוריה | 📖 |
| 25 | סייר בזמן | 🧭 |
| 50 | חוקר מומחה | 🔍 |
| 80 | היסטוריון | 🎓 |
| 120 | מומחה היסטוריה | ⭐ |
| 170 | פרופסור | 🏅 |
| 230 | גאון היסטורי | 👑 |
| 300 | אגדה חיה | 🏆 |

## Running Locally
```bash
npx serve public -l 3000
```

## Deployment
- Hosted on **Vercel** (Hobby plan)
- GitHub repo: `sivanenden/history-for-kids-trivia`
- Auto-deploys on push to `main`
- Output directory: `public`
