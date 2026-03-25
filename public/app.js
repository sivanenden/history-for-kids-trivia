// ===== LEVELS SYSTEM =====
const LEVELS = [
  { name: 'חוקר מתחיל', icon: '🏛️', threshold: 0 },
  { name: 'תלמיד היסטוריה', icon: '📖', threshold: 10 },
  { name: 'סייר בזמן', icon: '🧭', threshold: 25 },
  { name: 'חוקר מומחה', icon: '🔍', threshold: 50 },
  { name: 'היסטוריון', icon: '🎓', threshold: 80 },
  { name: 'מומחה היסטוריה', icon: '⭐', threshold: 120 },
  { name: 'פרופסור', icon: '🏅', threshold: 170 },
  { name: 'גאון היסטורי', icon: '👑', threshold: 230 },
  { name: 'אגדה חיה', icon: '🏆', threshold: 300 },
];

function getLevel(totalCorrect) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (totalCorrect >= l.threshold) level = l;
    else break;
  }
  return level;
}

function getNextLevel(totalCorrect) {
  for (const l of LEVELS) {
    if (totalCorrect < l.threshold) return l;
  }
  return null;
}

// ===== BADGES SYSTEM =====
const BADGES = [
  { id: 'first_win', icon: '🎯', name: 'ניצחון ראשון', desc: 'סיים משחק ראשון' },
  { id: 'perfect', icon: '💯', name: 'מושלם!', desc: 'ענה נכון על כל השאלות' },
  { id: 'hot_streak', icon: '🔥', name: 'רצף חם', desc: 'ענה נכון 5 פעמים ברצף' },
  { id: 'history_fan', icon: '📚', name: 'חובב היסטוריה', desc: 'סיים 10 משחקים' },
  { id: 'time_traveler', icon: '🌍', name: 'סייר בזמן', desc: 'שחק בכל 6 התקופות' },
  { id: 'topic_master', icon: '🧠', name: 'מומחה נושאים', desc: 'שחק בכל 9 הנושאים' },
  { id: 'daily_week', icon: '📅', name: 'שבוע של היסטוריה', desc: '7 אתגרים יומיים ברצף' },
  { id: 'lightning', icon: '⚡', name: 'ברק', desc: 'ענה נכון תוך 3 שניות' },
  { id: 'legend', icon: '👑', name: 'אגדה חיה', desc: 'הגע לדרגה הגבוהה ביותר' },
];

function getPlayerBadges() {
  if (!currentPlayer) return [];
  const data = JSON.parse(localStorage.getItem('historyTriviaBadges') || '{}');
  return data[currentPlayer] || [];
}

function savePlayerBadge(badgeId) {
  if (!currentPlayer) return false;
  const data = JSON.parse(localStorage.getItem('historyTriviaBadges') || '{}');
  if (!data[currentPlayer]) data[currentPlayer] = [];
  if (data[currentPlayer].includes(badgeId)) return false;
  data[currentPlayer].push(badgeId);
  localStorage.setItem('historyTriviaBadges', JSON.stringify(data));
  return true;
}

function checkAndAwardBadges() {
  const newBadges = [];
  const players = getPlayers();
  const player = players.find(p => p.name === currentPlayer);
  if (!player) return newBadges;

  // First win
  if (player.totalGames >= 1 && savePlayerBadge('first_win'))
    newBadges.push(BADGES.find(b => b.id === 'first_win'));

  // Perfect score
  if (score === currentQuestions.length && savePlayerBadge('perfect'))
    newBadges.push(BADGES.find(b => b.id === 'perfect'));

  // Hot streak (5 in a row)
  if (maxStreak >= 5 && savePlayerBadge('hot_streak'))
    newBadges.push(BADGES.find(b => b.id === 'hot_streak'));

  // History fan (10 games)
  if (player.totalGames >= 10 && savePlayerBadge('history_fan'))
    newBadges.push(BADGES.find(b => b.id === 'history_fan'));

  // Lightning (answered in under 3 seconds in timed mode)
  if (fastestAnswerTime > 0 && fastestAnswerTime < 3 && savePlayerBadge('lightning'))
    newBadges.push(BADGES.find(b => b.id === 'lightning'));

  // Legend (highest level)
  if (getLevel(player.totalCorrect).name === 'אגדה חיה' && savePlayerBadge('legend'))
    newBadges.push(BADGES.find(b => b.id === 'legend'));

  // Daily week (7 day streak)
  const dailyData = JSON.parse(localStorage.getItem('historyTriviaDaily') || '{}');
  const playerDaily = dailyData[currentPlayer];
  if (playerDaily && playerDaily.streak >= 7 && savePlayerBadge('daily_week'))
    newBadges.push(BADGES.find(b => b.id === 'daily_week'));

  return newBadges;
}

function renderBadgesScreen() {
  const grid = document.getElementById('badgesGrid');
  const earned = getPlayerBadges();

  grid.innerHTML = BADGES.map(b => {
    const isEarned = earned.includes(b.id);
    return `
      <div class="badge-card ${isEarned ? '' : 'locked'}">
        <span class="badge-icon">${b.icon}</span>
        <span class="badge-name">${b.name}</span>
      </div>
    `;
  }).join('');
}

// ===== SOUND SYSTEM =====
let soundEnabled = localStorage.getItem('historyTriviaSound') !== 'false';
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine') {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* ignore audio errors */ }
}

function playCorrectSound() {
  playTone(523, 0.1); // C5
  setTimeout(() => playTone(659, 0.1), 100); // E5
  setTimeout(() => playTone(784, 0.2), 200); // G5
}

function playWrongSound() {
  playTone(200, 0.3, 'square');
}

function playLevelUpSound() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.15), i * 120));
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('historyTriviaSound', soundEnabled);
  document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) playTone(440, 0.1);
}

// ===== TIMER SYSTEM =====
let timedMode = false;
let timerInterval = null;
let timerStartTime = 0;
let fastestAnswerTime = Infinity;
const TIMER_SECONDS = 15;

function startTimer() {
  if (!timedMode) return;
  clearTimer();
  const bar = document.getElementById('timerBar');
  const fill = document.getElementById('timerFill');
  const text = document.getElementById('timerText');
  bar.style.display = 'block';
  fill.style.width = '100%';
  fill.className = 'timer-fill';
  text.textContent = TIMER_SECONDS;
  timerStartTime = Date.now();

  let remaining = TIMER_SECONDS;
  timerInterval = setInterval(() => {
    remaining = TIMER_SECONDS - (Date.now() - timerStartTime) / 1000;
    if (remaining <= 0) {
      clearTimer();
      if (!answered) autoTimeOut();
      return;
    }
    const pct = (remaining / TIMER_SECONDS) * 100;
    fill.style.width = pct + '%';
    text.textContent = Math.ceil(remaining);
    fill.className = 'timer-fill' + (remaining < 5 ? ' danger' : remaining < 10 ? ' warning' : '');
  }, 100);
}

function clearTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function autoTimeOut() {
  answered = true;
  streak = 0;
  playWrongSound();
  const allBtns = document.querySelectorAll('.option-btn');
  const q = currentQuestions[currentIndex];
  // Find and highlight correct answer
  allBtns.forEach((btn, i) => {
    btn.classList.add('disabled');
  });
  // We need to find the correct button - it has the correct answer text
  allBtns.forEach(btn => {
    const text = btn.querySelector('span:last-child').textContent;
    if (text === q.options[q.correct]) btn.classList.add('correct');
  });
  document.getElementById('funFactText').textContent = '⏰ נגמר הזמן! ' + q.funFact;
  document.getElementById('episodeLink').querySelector('span').textContent =
    `שמע את הפרק: ${q.episode}`;
  document.getElementById('funFact').classList.add('visible');
  const nextBtn = document.getElementById('nextBtn');
  nextBtn.textContent = currentIndex === currentQuestions.length - 1 ? 'לתוצאות! 🎉' : 'השאלה הבאה ←';
  nextBtn.classList.add('visible');
  document.getElementById('hintBtn').classList.add('used');
}

// ===== DAILY CHALLENGE =====
function getDailyDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDailySeed() {
  const key = getDailyDateKey();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startDailyChallenge() {
  if (!triviaData || !triviaData.questions) {
    alert('טוען שאלות... נסה שוב בעוד רגע.');
    return;
  }

  // Check if already completed today
  const dailyData = JSON.parse(localStorage.getItem('historyTriviaDaily') || '{}');
  const playerDaily = dailyData[currentPlayer];
  const today = getDailyDateKey();

  if (playerDaily && playerDaily.lastDate === today) {
    alert('כבר סיימת את האתגר היומי! חזור מחר לאתגר חדש.');
    return;
  }

  lastMode = 'daily';
  lastCategory = null;
  score = 0;
  streak = 0;
  maxStreak = 0;
  currentIndex = 0;
  answered = false;
  hintsRemaining = 3;
  fastestAnswerTime = Infinity;

  const seed = getDailySeed();
  currentQuestions = seededShuffle(triviaData.questions, seed).slice(0, 5);

  showScreen('quizScreen');
  renderQuestion();
}

function saveDailyCompletion() {
  if (lastMode !== 'daily' || !currentPlayer) return;
  const dailyData = JSON.parse(localStorage.getItem('historyTriviaDaily') || '{}');
  const today = getDailyDateKey();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (!dailyData[currentPlayer]) dailyData[currentPlayer] = { streak: 0, lastDate: null };
  const pd = dailyData[currentPlayer];

  if (pd.lastDate === yesterday) {
    pd.streak += 1;
  } else if (pd.lastDate !== today) {
    pd.streak = 1;
  }
  pd.lastDate = today;
  localStorage.setItem('historyTriviaDaily', JSON.stringify(dailyData));
}

// ===== HINT SYSTEM (שאל את פיצקי) =====
let hintsRemaining = 3;
let currentCorrectDisplayIdx = 0;

function useHint() {
  if (answered || hintsRemaining <= 0) return;
  hintsRemaining--;
  document.getElementById('hintCount').textContent = hintsRemaining;
  if (hintsRemaining <= 0) document.getElementById('hintBtn').classList.add('disabled');

  // Eliminate 2 wrong answers
  const allBtns = Array.from(document.querySelectorAll('.option-btn'));
  const wrongBtns = allBtns.filter((_, i) => i !== currentCorrectDisplayIdx);
  const toRemove = shuffle(wrongBtns).slice(0, 2);
  toRemove.forEach(btn => {
    btn.classList.add('disabled');
    btn.style.opacity = '0.3';
  });

  playTone(880, 0.05);
  setTimeout(() => playTone(1100, 0.1), 80);
}

// ===== STATE =====
let triviaData = null;
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let streak = 0;
let maxStreak = 0;
let answered = false;
let lastMode = null;
let lastCategory = null;
let currentPlayer = null;

const QUESTIONS_PER_GAME = 10;
const LETTERS = ['א', 'ב', 'ג', 'ד'];
const STORAGE_KEY = 'historyTriviaPlayers';
const SPOTIFY_SHOW_URL = 'https://open.spotify.com/show/0cHdRNk24adWawuZQyyn3b';

// ===== INIT =====
async function init() {
  try {
    const res = await fetch('data/trivia.json');
    triviaData = await res.json();
    console.log(`Loaded ${triviaData.questions.length} questions`);
  } catch (err) {
    console.error('Failed to load trivia data:', err);
  }

  // Restore sound setting
  document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';

  renderPlayerList();

  const players = getPlayers();
  if (players.length === 1) {
    selectPlayer(players[0].name);
  }

  document.getElementById('newPlayerName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPlayer();
  });
}

// ===== PLAYER MANAGEMENT =====
function getPlayers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function savePlayers(players) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function addPlayer() {
  const input = document.getElementById('newPlayerName');
  const name = input.value.trim();
  if (!name) return;

  const players = getPlayers();
  if (players.find(p => p.name === name)) {
    selectPlayer(name);
    input.value = '';
    return;
  }

  players.push({ name, totalCorrect: 0, totalGames: 0, bestScore: 0, bestStreak: 0 });
  savePlayers(players);
  input.value = '';
  selectPlayer(name);
}

function deletePlayer(name, event) {
  event.stopPropagation();
  if (!confirm(`למחוק את השחקן ${name}?`)) return;
  const players = getPlayers().filter(p => p.name !== name);
  savePlayers(players);
  if (currentPlayer === name) {
    currentPlayer = null;
    showScreen('playerScreen');
  }
  renderPlayerList();
}

function selectPlayer(name) {
  currentPlayer = name;
  const players = getPlayers();
  const player = players.find(p => p.name === name);
  if (!player) return;

  document.getElementById('welcomeGreeting').textContent = `שלום ${name}`;
  updateLevelCard(player);
  updateDailyDesc();
  showScreen('welcomeScreen');
}

function updateLevelCard(player) {
  const level = getLevel(player.totalCorrect);
  const nextLevel = getNextLevel(player.totalCorrect);

  document.getElementById('levelIcon').textContent = level.icon;
  document.getElementById('levelTitle').textContent = level.name;

  if (nextLevel) {
    const progress = player.totalCorrect - level.threshold;
    const needed = nextLevel.threshold - level.threshold;
    const pct = Math.min((progress / needed) * 100, 100);
    document.getElementById('levelProgressFill').style.width = pct + '%';
    document.getElementById('levelProgressText').textContent =
      `${player.totalCorrect}/${nextLevel.threshold} לדרגת ${nextLevel.name}`;
  } else {
    document.getElementById('levelProgressFill').style.width = '100%';
    document.getElementById('levelProgressText').textContent = 'הדרגה הגבוהה ביותר!';
  }
}

function updateDailyDesc() {
  const dailyData = JSON.parse(localStorage.getItem('historyTriviaDaily') || '{}');
  const pd = dailyData[currentPlayer];
  const today = getDailyDateKey();
  const el = document.getElementById('dailyDesc');
  if (pd && pd.lastDate === today) {
    el.textContent = '✅ סיימת היום! חזור מחר';
  } else if (pd && pd.streak > 0) {
    el.textContent = `🔥 רצף של ${pd.streak} ימים`;
  } else {
    el.textContent = '5 שאלות חדשות כל יום';
  }
}

function renderPlayerList() {
  const list = document.getElementById('playersList');
  const players = getPlayers();
  list.innerHTML = '';

  if (players.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:8px;">הכנס את השם שלך כדי להתחיל!</p>';
    return;
  }

  for (const p of players) {
    const level = getLevel(p.totalCorrect);
    const card = document.createElement('div');
    card.className = 'player-card';
    card.onclick = () => selectPlayer(p.name);

    const avatar = document.createElement('div');
    avatar.className = 'player-avatar';
    avatar.textContent = level.icon;

    const info = document.createElement('div');
    info.className = 'player-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'player-name';
    nameEl.textContent = p.name;
    const rankEl = document.createElement('div');
    rankEl.className = 'player-rank';
    rankEl.textContent = `${level.name} · ${p.totalCorrect} תשובות נכונות`;
    info.appendChild(nameEl);
    info.appendChild(rankEl);

    const delBtn = document.createElement('button');
    delBtn.className = 'player-delete';
    delBtn.title = 'מחק שחקן';
    delBtn.textContent = '✕';
    delBtn.onclick = (e) => deletePlayer(p.name, e);

    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(delBtn);
    list.appendChild(card);
  }

  setTimeout(() => document.getElementById('newPlayerName')?.focus(), 100);
}

// ===== NAVIGATION =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);

  if (id === 'playerScreen') renderPlayerList();
  if (id === 'leaderboardScreen') renderLeaderboard();
  if (id === 'badgesScreen') renderBadgesScreen();
  if (id === 'welcomeScreen' && currentPlayer) {
    const player = getPlayers().find(p => p.name === currentPlayer);
    if (player) updateLevelCard(player);
    updateDailyDesc();
  }
}

function quitQuiz() {
  if (currentIndex > 0 && !confirm('בטוח שאתה רוצה לצאת? ההתקדמות לא תישמר.')) return;
  clearTimer();
  showScreen('welcomeScreen');
}

// ===== LEADERBOARD =====
function renderLeaderboard() {
  const lb = document.getElementById('leaderboard');
  const players = getPlayers().sort((a, b) => b.totalCorrect - a.totalCorrect);

  if (players.length === 0) {
    lb.innerHTML = '<div class="leaderboard-empty">עדיין אין שחקנים. הוסף שחקן והתחל לשחק!</div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const rowClasses = ['gold', 'silver', 'bronze'];

  lb.innerHTML = players.map((p, i) => {
    const level = getLevel(p.totalCorrect);
    const cls = i < 3 ? rowClasses[i] : '';
    const rank = i < 3 ? medals[i] : (i + 1);
    return `
      <div class="lb-row ${cls}">
        <div class="lb-rank">${rank}</div>
        <div>
          <div class="lb-name">${escapeHtml(p.name)}</div>
          <div class="lb-level">${level.icon} ${level.name}</div>
        </div>
        <div class="lb-score-col">
          <div class="lb-score-val">${p.totalCorrect}</div>
          <div class="lb-score-label">תשובות נכונות</div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== CATEGORY SELECTION =====
function showCategories(type) {
  const grid = document.getElementById('categoryGrid');
  const title = document.getElementById('categoryTitle');
  grid.innerHTML = '';

  if (type === 'topic') {
    title.textContent = 'בחר נושא';
    for (const [key, val] of Object.entries(triviaData.topics)) {
      const count = triviaData.questions.filter(q => q.topic === key).length;
      if (count === 0) continue;
      const card = document.createElement('button');
      card.className = 'category-card';
      card.innerHTML = `
        <span class="cat-icon">${val.icon}</span>
        <span class="cat-label">${val.label}</span>
        <span class="cat-count">${count} שאלות</span>
      `;
      card.onclick = () => startMode('topic', key);
      grid.appendChild(card);
    }
  } else {
    title.textContent = 'בחר תקופה';
    for (const [key, val] of Object.entries(triviaData.eras)) {
      const count = triviaData.questions.filter(q => q.era === key).length;
      if (count === 0) continue;
      const card = document.createElement('button');
      card.className = 'category-card';
      card.innerHTML = `
        <span class="cat-icon">${val.icon}</span>
        <span class="cat-label">${val.label}</span>
        <span class="cat-count">${count} שאלות</span>
      `;
      card.onclick = () => startMode('era', key);
      grid.appendChild(card);
    }
  }

  showScreen('categoryScreen');
}

// ===== START GAME =====
function startMode(mode, category = null) {
  if (!triviaData || !triviaData.questions) {
    alert('טוען שאלות... נסה שוב בעוד רגע.');
    return;
  }

  lastMode = mode;
  lastCategory = category;
  score = 0;
  streak = 0;
  maxStreak = 0;
  currentIndex = 0;
  answered = false;
  hintsRemaining = 3;
  fastestAnswerTime = Infinity;
  timedMode = document.getElementById('timerToggle').checked;

  let pool = [...triviaData.questions];
  if (mode === 'topic') pool = pool.filter(q => q.topic === category);
  else if (mode === 'era') pool = pool.filter(q => q.era === category);

  pool = shuffle(pool);
  currentQuestions = pool.slice(0, QUESTIONS_PER_GAME);

  if (currentQuestions.length === 0) {
    alert('אין מספיק שאלות בקטגוריה הזו. נסה קטגוריה אחרת!');
    return;
  }

  showScreen('quizScreen');
  renderQuestion();
}

// ===== RENDER QUESTION =====
function renderQuestion() {
  const q = currentQuestions[currentIndex];
  answered = false;

  document.getElementById('quizProgress').textContent =
    `שאלה ${currentIndex + 1} מתוך ${currentQuestions.length}`;
  document.getElementById('quizScore').textContent = `${score} נקודות`;
  document.getElementById('progressFill').style.width =
    `${((currentIndex) / currentQuestions.length) * 100}%`;

  document.getElementById('questionNumber').textContent = `שאלה ${currentIndex + 1}`;
  document.getElementById('questionText').textContent = q.question;

  // Shuffle options
  const indices = [0, 1, 2, 3];
  const shuffledIndices = shuffle(indices);
  currentCorrectDisplayIdx = shuffledIndices.indexOf(q.correct);

  const optionsList = document.getElementById('optionsList');
  optionsList.innerHTML = '';

  shuffledIndices.forEach((origIdx, displayIdx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `
      <span class="option-letter">${LETTERS[displayIdx]}</span>
      <span>${q.options[origIdx]}</span>
    `;
    btn.onclick = () => selectAnswer(btn, origIdx === q.correct, currentCorrectDisplayIdx);
    optionsList.appendChild(btn);
  });

  document.getElementById('funFact').classList.remove('visible');
  document.getElementById('nextBtn').classList.remove('visible');
  document.getElementById('streakBadge').classList.remove('visible');

  // Reset hint button
  const hintBtn = document.getElementById('hintBtn');
  hintBtn.classList.remove('used', 'disabled');
  if (hintsRemaining <= 0) hintBtn.classList.add('disabled');
  hintBtn.style.display = answered ? 'none' : 'flex';
  document.getElementById('hintCount').textContent = hintsRemaining;

  // Start timer
  document.getElementById('timerBar').style.display = timedMode ? 'block' : 'none';
  startTimer();
}

// ===== SELECT ANSWER =====
function selectAnswer(btn, isCorrect, correctDisplayIdx) {
  if (answered) return;
  answered = true;
  clearTimer();

  // Track answer speed for badge
  if (timedMode) {
    const elapsed = (Date.now() - timerStartTime) / 1000;
    if (isCorrect && elapsed < fastestAnswerTime) fastestAnswerTime = elapsed;
  }

  const allBtns = document.querySelectorAll('.option-btn');

  // Hide hint button
  document.getElementById('hintBtn').classList.add('used');

  if (isCorrect) {
    btn.classList.add('correct');
    score++;
    streak++;
    maxStreak = Math.max(maxStreak, streak);
    playCorrectSound();

    // Bonus point for fast answer in timed mode
    if (timedMode && (Date.now() - timerStartTime) < 5000) {
      score++;
      document.getElementById('quizScore').textContent = `${score} נקודות ⚡`;
    }

    if (streak >= 3) {
      document.getElementById('streakCount').textContent = streak;
      const badge = document.getElementById('streakBadge');
      badge.classList.remove('visible');
      void badge.offsetWidth;
      badge.classList.add('visible');
      setTimeout(() => badge.classList.remove('visible'), 2000);
    }
  } else {
    btn.classList.add('wrong');
    streak = 0;
    allBtns[correctDisplayIdx].classList.add('correct');
    playWrongSound();
  }

  allBtns.forEach(b => {
    if (!b.classList.contains('correct') && !b.classList.contains('wrong')) {
      b.classList.add('disabled');
    }
  });

  document.getElementById('quizScore').textContent = `${score} נקודות`;

  const q = currentQuestions[currentIndex];
  document.getElementById('funFactText').textContent = q.funFact;

  // Spotify episode link
  const linkEl = document.getElementById('episodeLink');
  linkEl.querySelector('span').textContent = `שמע את הפרק: ${q.episode}`;
  linkEl.onclick = () => window.open(SPOTIFY_SHOW_URL, '_blank');
  linkEl.style.cursor = 'pointer';

  document.getElementById('funFact').classList.add('visible');

  const nextBtn = document.getElementById('nextBtn');
  nextBtn.textContent = currentIndex === currentQuestions.length - 1
    ? 'לתוצאות! 🎉'
    : 'השאלה הבאה ←';
  nextBtn.classList.add('visible');
}

// ===== NEXT QUESTION =====
function nextQuestion() {
  currentIndex++;
  if (currentIndex >= currentQuestions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

// ===== RESULTS =====
function showResults() {
  clearTimer();
  const total = currentQuestions.length;
  const pct = score / total;

  // Save daily completion
  saveDailyCompletion();

  // Save player stats and check for level up
  let leveledUp = false;
  let newLevelName = '';
  if (currentPlayer) {
    const players = getPlayers();
    const player = players.find(p => p.name === currentPlayer);
    if (player) {
      const oldLevel = getLevel(player.totalCorrect);
      player.totalCorrect += score;
      player.totalGames += 1;
      player.bestScore = Math.max(player.bestScore, score);
      player.bestStreak = Math.max(player.bestStreak, maxStreak);
      const newLevel = getLevel(player.totalCorrect);
      if (newLevel.name !== oldLevel.name) {
        leveledUp = true;
        newLevelName = `${newLevel.icon} ${newLevel.name}`;
      }
      savePlayers(players);
    }
  }

  // Check badges
  const newBadges = checkAndAwardBadges();

  let emoji, title, message;
  if (pct === 1) {
    emoji = '🏆'; title = 'מושלם! גאון היסטורי!';
    message = 'ענית נכון על כל השאלות! יובל מלחי היה גאה בך!';
    launchConfetti();
  } else if (pct >= 0.8) {
    emoji = '🌟'; title = 'מומחה היסטוריה!';
    message = 'תוצאה מרשימה! אתה באמת מכיר את ההיסטוריה!';
    launchConfetti();
  } else if (pct >= 0.6) {
    emoji = '📚'; title = 'חוקר היסטוריה';
    message = 'לא רע בכלל! עוד כמה פרקים ותהיה מומחה!';
  } else if (pct >= 0.4) {
    emoji = '🔍'; title = 'היסטוריון מתחיל';
    message = 'התחלה טובה! כדאי להאזין לעוד פרקים של היסטוריה לילדים!';
  } else {
    emoji = '🎧'; title = 'זמן להאזין!';
    message = 'נראה שיש עוד הרבה מה לגלות! בוא נאזין לעוד פרקים!';
  }

  document.getElementById('resultsEmoji').textContent = emoji;
  document.getElementById('resultsTitle').textContent = title;
  document.getElementById('resultsFinalScore').innerHTML = `${score} <span>מתוך ${total}</span>`;
  document.getElementById('resultCorrect').textContent = score;
  document.getElementById('resultStreak').textContent = maxStreak;
  document.getElementById('resultsMessage').textContent = message;
  document.getElementById('progressFill').style.width = '100%';

  // Level up notification
  const levelUpEl = document.getElementById('levelUp');
  if (leveledUp) {
    document.getElementById('levelUpTitle').textContent = newLevelName;
    levelUpEl.style.display = 'block';
    playLevelUpSound();
    launchConfetti();
  } else {
    levelUpEl.style.display = 'none';
  }

  // Show new badges
  const newBadgesEl = document.getElementById('newBadges');
  if (newBadges.length > 0) {
    newBadgesEl.style.display = 'block';
    newBadgesEl.innerHTML = `
      <div class="new-badges-title">🎖️ הישגים חדשים!</div>
      <div class="new-badges-list">
        ${newBadges.map(b => `<div class="new-badge-item">${b.icon} ${b.name}</div>`).join('')}
      </div>
    `;
    launchConfetti();
  } else {
    newBadgesEl.style.display = 'none';
  }

  document.getElementById('shareToast').classList.remove('visible');
  showScreen('resultsScreen');
}

// ===== SHARE =====
function shareScore() {
  const total = currentQuestions.length;
  const player = currentPlayer || 'שחקן';
  const level = currentPlayer
    ? getLevel(getPlayers().find(p => p.name === currentPlayer)?.totalCorrect || 0)
    : LEVELS[0];

  const text = [
    `📜 טריוויה - היסטוריה לילדים`,
    `${player} השיג ${score}/${total}!`,
    `${level.icon} דרגה: ${level.name}`,
    `🔥 רצף: ${maxStreak}`,
    ``,
    `בואו לשחק גם! 🎮`,
  ].join('\n');

  if (navigator.share) {
    navigator.share({ text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  const showToast = () => {
    const toast = document.getElementById('shareToast');
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showToast).catch(() => { fallbackCopy(text); showToast(); });
  } else {
    fallbackCopy(text);
    showToast();
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

// ===== PLAY AGAIN =====
function playAgain() {
  if (lastMode === 'daily') {
    startDailyChallenge();
  } else {
    startMode(lastMode, lastCategory);
  }
}

// ===== UTILS =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  container.innerHTML = '';
  const colors = ['#D4A017', '#F0D060', '#E53935', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];
  for (let i = 0; i < 60; i++) {
    const div = document.createElement('div');
    div.className = 'confetti';
    div.style.left = Math.random() * 100 + '%';
    div.style.background = colors[Math.floor(Math.random() * colors.length)];
    div.style.width = (Math.random() * 8 + 6) + 'px';
    div.style.height = (Math.random() * 8 + 6) + 'px';
    div.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    div.style.animationDuration = (Math.random() * 2 + 2) + 's';
    div.style.animationDelay = (Math.random() * 1.5) + 's';
    container.appendChild(div);
  }
  setTimeout(() => container.innerHTML = '', 5000);
}

// ===== KEYBOARD SUPPORT =====
document.addEventListener('keydown', (e) => {
  if (document.getElementById('quizScreen').classList.contains('active')) {
    const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3 };
    if (keyMap[e.key] !== undefined && !answered) {
      const btns = document.querySelectorAll('.option-btn');
      if (btns[keyMap[e.key]]) btns[keyMap[e.key]].click();
    }
    if ((e.key === 'Enter' || e.key === ' ') && answered) {
      nextQuestion();
    }
  }
});

// ===== START =====
init();
