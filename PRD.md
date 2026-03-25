# PRD: היסטוריה לילדים - Trivia Game

## 1. Product Vision
A fun, mobile-friendly Hebrew trivia game for kids (ages 10-14) based on the popular Israeli podcast "היסטוריה לילדים" by Yuval Malchi. The game turns podcast knowledge into an interactive challenge that encourages repeated listening and learning.

## 2. Target User
- **Primary**: גור (age 12), avid listener of the podcast
- **Secondary**: Other kids who listen to the podcast, friends who want to compete
- **Context**: Played on mobile phones, casual sessions of 3-5 minutes

## 3. Core Features

### 3.1 Player System
- **Name entry**: Simple name input, stored in LocalStorage
- **Multiple players**: Support switching between players on the same device
- **Persistent stats**: Total correct answers, games played, best score, best streak
- **Levels**: 9 progression levels based on cumulative correct answers (see CLAUDE.md)
- **Leaderboard**: Local device leaderboard sorted by total correct answers

### 3.2 Game Modes
| Mode | Description | Questions |
|------|-------------|-----------|
| טריוויה אקראית | Random mix from all categories | 10 |
| לפי נושא | Filter by topic (9 topics) | Up to 10 |
| לפי תקופה | Filter by historical era (6 eras) | Up to 10 |

### 3.3 Topics (נושאים)
| Key | Hebrew | Icon | Example |
|-----|--------|------|---------|
| מדע | מדע | 🔬 | Alexander Fleming, Rosalind Franklin |
| הרפתקאות | הרפתקאות | 🧭 | Jacques Cousteau, Jeanne Baret |
| ספורט | ספורט | ⚽ | Football history |
| מוזיקה ואמנות | מוזיקה ואמנות | 🎵 | Vivaldi, Chopin, David Bowie |
| ישראל | ישראל | 🇮🇱 | Ilan Ramon, Ofra Haza, Kaveret |
| המצאות | המצאות | 💡 | Hedy Lamarr, Louis Braille |
| טבע | טבע | 🌿 | History of dogs |
| תרבות | תרבות | 📚 | Pokemon, Walt Disney, Ketchup |
| מנהיגים | מנהיגים | 👑 | Martin Luther King, Maharaja |

### 3.4 Eras (תקופות)
| Key | Hebrew | Icon | Years |
|-----|--------|------|-------|
| העת העתיקה | העת העתיקה | 🏛️ | Until 500 CE |
| ימי הביניים | ימי הביניים | ⚔️ | 500-1500 |
| העת החדשה המוקדמת | העת החדשה המוקדמת | 🗺️ | 1500-1800 |
| המאה ה-19 | המאה ה-19 | 🏭 | 1800-1900 |
| המאה ה-20 | המאה ה-20 | 🚀 | 1900-2000 |
| המאה ה-21 | המאה ה-21 | 💻 | 2000-today |

### 3.5 Quiz Flow
1. Select game mode (random / topic / era)
2. If topic/era: select specific category
3. Quiz: 10 questions (or fewer if category is small)
4. Each question: 4 multiple-choice options (shuffled order each time)
5. On answer: immediate feedback (green/red), fun fact from episode, episode reference
6. After all questions: results screen with score, title, streak, level-up notification
7. Share result or play again

### 3.6 Engagement Features
- **Streak counter**: Visual badge for 3+ consecutive correct answers
- **Confetti**: On high scores (80%+) and level-ups
- **Fun facts**: After every question, with "listen to episode" prompt
- **Share**: Copy/share score card to WhatsApp/messages
- **Level progression**: Visual progress bar toward next level

## 4. Design Specifications

### 4.1 Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| Gold | #D4A017 | Primary accent, buttons, progress |
| Gold Light | #F0D060 | Gradients, highlights |
| Brown Dark | #3E2723 | Primary text, headers |
| Brown | #5D4037 | Secondary text |
| Cream | #FFF8E1 | Background |
| Cream Dark | #F5E6C8 | Card borders, secondary bg |
| Correct | #4CAF50 | Correct answer |
| Wrong | #E53935 | Wrong answer |

### 4.2 Typography
- **Font**: Heebo (Google Fonts) - clean, Hebrew-optimized
- **Weights**: 400 (body), 700 (labels), 800-900 (headings, scores)

### 4.3 Layout
- **Direction**: RTL (right-to-left)
- **Max width**: 480px centered
- **Mobile-first**: Touch-friendly buttons (min 48px height)
- **Safe areas**: Supports notched phones

## 5. Data Pipeline

### 5.1 Transcript Sources
1. **PodText.co.il**: AI-generated Hebrew transcripts (primary source)
   - URL pattern: `podtext.co.il/post/kids-history-DD-MM-YYYY`
   - Sitemap: `podtext.co.il/blog-posts-sitemap.xml`
   - Requires Playwright (Wix site, client-rendered)
2. **Omny.fm RSS**: Episode metadata + audio URLs
   - Feed: `omnycontent.com/d/playlist/.../podcast.rss`
   - Contains ~32 recent episodes (not full archive)

### 5.2 Trivia Generation
- **Tool**: Claude API (claude-sonnet-4-20250514)
- **Per episode**: 5-8 multiple-choice questions
- **Calibration**: Age 12, Hebrew, difficulty 1-3
- **Classification**: Auto-categorize by topic and era
- **Quality**: Each question must have exactly 1 correct answer, 3 plausible distractors

### 5.3 Update Strategy
- Monthly scrape of PodText for new episodes
- Generate trivia for new episodes only (incremental)
- Merge into existing trivia.json
- Redeploy

## 6. Technical Stack
| Component | Technology |
|-----------|-----------|
| Frontend | Vanilla HTML/CSS/JS |
| Storage | LocalStorage (client-side) |
| Data | Static JSON |
| Hosting | Vercel (static site) |
| Scraper | Python + Playwright |
| Trivia Gen | Claude API |
| Dev Server | `npx serve` |

## 7. Screens

### Screen 1: Player Selection
- List of existing players (with level icons)
- "Add player" input + button
- Delete player (with confirmation)
- Auto-selects if only one player

### Screen 2: Welcome / Home
- Personalized greeting ("שלום [name]!")
- Level card with progress bar
- 3 game mode buttons (random, by topic, by era)
- Leaderboard button
- Switch player button

### Screen 3: Category Selection
- Grid of category cards (2 columns)
- Each card: icon, label, question count
- Back button

### Screen 4: Quiz
- Quit button (with confirmation)
- Progress bar + question counter
- Question card
- 4 answer buttons (shuffled)
- Fun fact panel (after answering)
- Episode reference link
- Next button

### Screen 5: Results
- Score emoji + title
- Score (X out of Y)
- Stats: correct answers, longest streak
- Level-up notification (if applicable)
- Play again / Share / Back to menu buttons

### Screen 6: Leaderboard
- Ranked list of all players
- Gold/silver/bronze styling for top 3
- Shows level icon and total correct answers

## 8. V1.1 Features (In Progress)

### 8.1 Daily Challenge
- Fixed set of 5 questions per day (seeded by date)
- Calendar/streak tracker showing which days were completed
- Special badge for completing 7 days in a row

### 8.2 Sound Effects
- **Source**: Extracted from podcast intro jingle
- Correct answer: short positive sound
- Wrong answer: short buzz
- High score / level up: triumphant fanfare
- Can be muted via toggle

### 8.3 Timed Mode
- Optional 15-second countdown per question
- Bonus points for fast answers (under 5 seconds = +1 bonus)
- Visual countdown bar that changes color (green → yellow → red)
- Toggle on/off from game mode selection

### 8.4 "שאל את פיצקי" Hint System
- **פיצקי** is the helper character from the podcast
- Available 2-3 times per game
- Eliminates 2 wrong answers, leaving the correct + 1 distractor
- Button shows פיצקי icon with remaining hint count
- Animated appearance when used

### 8.5 Spotify Episode Links
- After each question, the episode reference links to Spotify
- URL pattern: `https://open.spotify.com/show/0cHdRNk24adWawuZQyyn3b`
- Search by episode title to find direct episode link

### 8.6 Achievement Badges
Collectable badges stored in LocalStorage per player:

| Badge | Hebrew | Condition |
|-------|--------|-----------|
| 🎯 | ניצחון ראשון | Complete first game |
| 💯 | מושלם! | Score 10/10 in a game |
| 🔥 | רצף חם | Get 5 correct in a row |
| 📚 | חובב היסטוריה | Complete 10 games |
| 🌍 | סייר בזמן | Play all 6 era categories |
| 🧠 | מומחה נושאים | Play all 9 topic categories |
| 📅 | שבוע של היסטוריה | Complete 7 daily challenges in a row |
| ⚡ | ברק | Answer correctly in under 3 seconds (timed mode) |
| 👑 | אגדה חיה | Reach the highest level |

### 8.7 Challenge a Friend
- Generate a shareable link with a specific question set
- Friend plays the same questions and compares scores
- Share via WhatsApp/messages

## 9. Known Limitations
- **LocalStorage only**: Scores don't sync across devices
- **Static trivia**: New questions require rebuilding and redeploying
- **PodText coverage**: May not have transcripts for all 266 episodes
- **RSS limitation**: Feed has 266 episodes but PodText coverage varies

## 10. Future Enhancements (Not in V1.1)
- PWA with offline support
- Backend with cloud-synced leaderboards
- Episode-specific cover art in quiz questions
- Difficulty selection filter (easy/medium/hard)
- Multiplayer real-time mode
