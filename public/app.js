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
  const data = safeParseJson('historyTriviaBadges', {});
  return data[currentPlayer] || [];
}

function savePlayerBadge(badgeId) {
  if (!currentPlayer) return false;
  const data = safeParseJson('historyTriviaBadges', {});
  if (!data[currentPlayer]) data[currentPlayer] = [];
  if (data[currentPlayer].includes(badgeId)) return false;
  data[currentPlayer].push(badgeId);
  safeSetItem('historyTriviaBadges', JSON.stringify(data));
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
  const dailyData = safeParseJson('historyTriviaDaily', {});
  const playerDaily = dailyData[currentPlayer];
  if (playerDaily && playerDaily.streak >= 7 && savePlayerBadge('daily_week'))
    newBadges.push(BADGES.find(b => b.id === 'daily_week'));

  // Topic master (played all 9 topics)
  const playedTopics = safeParseJson('historyTriviaPlayedTopics', {});
  const playerTopics = playedTopics[currentPlayer] || [];
  if (playerTopics.length >= 9 && savePlayerBadge('topic_master'))
    newBadges.push(BADGES.find(b => b.id === 'topic_master'));

  // Time traveler (played all 6 eras)
  const playedEras = safeParseJson('historyTriviaPlayedEras', {});
  const playerEras = playedEras[currentPlayer] || [];
  if (playerEras.length >= 6 && savePlayerBadge('time_traveler'))
    newBadges.push(BADGES.find(b => b.id === 'time_traveler'));

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
let soundEnabled = safeGetItem('historyTriviaSound', 'true') !== 'false';
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
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
  safeSetItem('historyTriviaSound', soundEnabled);
  document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) playTone(440, 0.1);
}

// ===== TIMER SYSTEM =====
let timedMode = false;
let timerInterval = null;
let timerStartTime = 0;
let timerElapsed = 0; // Track elapsed time for pause/resume
let fastestAnswerTime = Infinity;
const TIMER_SECONDS = 15;

function startTimer() {
  if (!timedMode) return;
  clearTimer();
  const bar = document.getElementById('timerBar');
  const fill = document.getElementById('timerFill');
  const text = document.getElementById('timerText');
  bar.style.display = 'block';
  fill.style.transform = 'scaleX(1)';
  fill.className = 'timer-fill';
  text.textContent = TIMER_SECONDS;
  timerStartTime = Date.now();
  timerElapsed = 0;

  timerInterval = setInterval(() => {
    const remaining = TIMER_SECONDS - timerElapsed - (Date.now() - timerStartTime) / 1000;
    if (remaining <= 0) {
      clearTimer();
      if (!answered) autoTimeOut();
      return;
    }
    const pct = (remaining / TIMER_SECONDS) * 100;
    fill.style.transform = `scaleX(${pct / 100})`;
    text.textContent = Math.ceil(remaining);
    fill.className = 'timer-fill' + (remaining < 5 ? ' danger' : remaining < 10 ? ' warning' : '');
  }, 100);
}

function pauseTimer() {
  if (!timerInterval) return;
  timerElapsed += (Date.now() - timerStartTime) / 1000;
  clearInterval(timerInterval);
  timerInterval = null;
}

function resumeTimer() {
  if (!timedMode || answered || timerInterval) return;
  timerStartTime = Date.now();
  const bar = document.getElementById('timerBar');
  const fill = document.getElementById('timerFill');
  const text = document.getElementById('timerText');

  timerInterval = setInterval(() => {
    const remaining = TIMER_SECONDS - timerElapsed - (Date.now() - timerStartTime) / 1000;
    if (remaining <= 0) {
      clearTimer();
      if (!answered) autoTimeOut();
      return;
    }
    const pct = (remaining / TIMER_SECONDS) * 100;
    fill.style.transform = `scaleX(${pct / 100})`;
    text.textContent = Math.ceil(remaining);
    fill.className = 'timer-fill' + (remaining < 5 ? ' danger' : remaining < 10 ? ' warning' : '');
  }, 100);
}

function clearTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerElapsed = 0;
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
  const linkEl = document.getElementById('episodeLink');
  linkEl.querySelector('span').textContent = `שמע את הפרק: ${q.episode}`;
  linkEl.href = SPOTIFY_SHOW_URL;
  document.getElementById('funFact').classList.add('visible');
  dotResults.push(false);
  renderProgressDots();
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
  const dailyData = safeParseJson('historyTriviaDaily', {});
  const playerDaily = dailyData[currentPlayer];
  const today = getDailyDateKey();

  if (playerDaily && playerDaily.lastDate === today) {
    alert('כבר סיימת את האתגר היומי! חזור מחר לאתגר חדש.');
    return;
  }

  lastMode = 'daily';
  lastCategory = null;
  resetGameState();

  const seed = getDailySeed();
  currentQuestions = seededShuffle(triviaData.questions, seed).slice(0, 5);

  if (currentQuestions.length === 0) {
    alert('אין מספיק שאלות. נסה שוב מאוחר יותר.');
    return;
  }

  challengeStartTime = Date.now();
  challengeTotalTime = 0;
  showScreen('quizScreen');
  renderQuestion();
}

function saveDailyCompletion() {
  if (lastMode !== 'daily' || !currentPlayer) return;
  const dailyData = safeParseJson('historyTriviaDaily', {});
  const today = getDailyDateKey();
  const yd = new Date(Date.now() - 86400000);
  const yesterday = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`;

  if (!dailyData[currentPlayer]) dailyData[currentPlayer] = { streak: 0, lastDate: null };
  const pd = dailyData[currentPlayer];

  if (pd.lastDate === yesterday) {
    pd.streak += 1;
  } else if (pd.lastDate !== today) {
    pd.streak = 1;
  }
  pd.lastDate = today;
  safeSetItem('historyTriviaDaily', JSON.stringify(dailyData));
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

// ===== CHALLENGE SYSTEM =====
let challengeData = null; // { challenger, score, total, time, questionIds }
let challengeStartTime = 0;
let challengeTotalTime = 0;

function encodeChallenge() {
  const player = currentPlayer || 'שחקן';
  const total = currentQuestions.length;
  const questionIds = currentQuestions.map(q => q.id);
  const timeSec = Math.round(challengeTotalTime / 1000);

  const data = {
    c: player,      // challenger name
    s: correctCount, // correct answers (not bonus-inflated score)
    t: total,        // total questions
    tm: timeSec,     // time in seconds
    q: questionIds   // question IDs
  };

  // Use URL-safe base64 (replace +/ with -_) to prevent chat apps mangling
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?challenge=${encoded}`;
}

function decodeChallenge(param) {
  try {
    // Restore standard base64 from URL-safe version
    let b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const decoded = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(decoded);
  } catch (e) {
    console.error('Failed to decode challenge:', e);
    return null;
  }
}

function checkForChallenge() {
  const params = new URLSearchParams(window.location.search);
  const challengeParam = params.get('challenge');
  const resultsParam = params.get('results');

  if (challengeParam) {
    const data = decodeChallenge(challengeParam);
    if (data && data.q && data.q.length > 0) {
      challengeData = data;
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
      return 'challenge';
    }
  }

  if (resultsParam) {
    const data = decodeChallenge(resultsParam);
    if (data) {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      showResultsCard(data);
      return 'results';
    }
  }

  return null;
}

function showChallengeIntro() {
  if (!challengeData) return;
  // Validate challenge data types to prevent XSS
  const name = String(challengeData.c || 'שחקן');
  const s = parseInt(challengeData.s) || 0;
  const t = parseInt(challengeData.t) || 0;
  const tm = parseInt(challengeData.tm) || 0;
  const timeStr = tm ? formatTime(tm) : '';
  document.getElementById('challengeFrom').innerHTML =
    `<strong>${escapeHtml(name)}</strong> השיג/ה ${s}/${t}` +
    (timeStr ? ` ב-${timeStr}` : '');
  showScreen('challengeIntroScreen');
}

function startChallengeGame() {
  if (!triviaData || !challengeData) return;

  lastMode = 'challenge';
  lastCategory = null;
  resetGameState();
  timedMode = false;

  // Find questions by ID in the same order (cap at 20 for safety)
  currentQuestions = (challengeData.q || []).slice(0, 20)
    .map(id => triviaData.questions.find(q => q.id === Number(id)))
    .filter(q => q != null);

  if (currentQuestions.length === 0) {
    alert('לא נמצאו השאלות של האתגר. נסה שוב.');
    showScreen('welcomeScreen');
    return;
  }

  challengeStartTime = Date.now();
  showScreen('quizScreen');
  renderQuestion();
}

function declineChallenge() {
  challengeData = null;
  showScreen('playerScreen');
}

function shareChallenge() {
  challengeTotalTime = challengeTotalTime || 0;
  const url = encodeChallenge();
  const player = currentPlayer || 'שחקן';
  const total = currentQuestions.length;

  const text = `⚔️ ${player} מאתגר אותך!
📜 השגתי ${correctCount}/${total} בטריוויה של היסטוריה לילדים!
את/ה יכול/ה לנצח אותי? 😏
👇 לחץ/י כאן לאתגר:
${url}`;

  // Try WhatsApp first (most natural for Israeli kids)
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
}

function showChallengeResults() {
  if (!challengeData) return;

  const myTimeSec = Math.round((Date.now() - challengeStartTime) / 1000);
  const myTotal = currentQuestions.length;

  // Challenger info
  document.getElementById('challengerName').textContent = challengeData.c;
  document.getElementById('challengerScore').textContent = `${challengeData.s}/${challengeData.t}`;
  document.getElementById('challengerTime').textContent = challengeData.tm ? formatTime(challengeData.tm) : '';

  // My info
  document.getElementById('challengedName').textContent = currentPlayer || 'אתה';
  document.getElementById('challengedScore').textContent = `${correctCount}/${myTotal}`;
  document.getElementById('challengedTime').textContent = formatTime(myTimeSec);

  // Determine winner (use correctCount, not bonus-inflated score)
  const winnerEl = document.getElementById('challengeWinner');
  if (correctCount > challengeData.s) {
    winnerEl.textContent = '🏆 ניצחת!';
    winnerEl.className = 'challenge-winner win';
    launchConfetti();
  } else if (correctCount < challengeData.s) {
    winnerEl.textContent = `😤 ${challengeData.c} ניצח/ה!`;
    winnerEl.className = 'challenge-winner lose';
  } else {
    // Tie - check time
    if (challengeData.tm && myTimeSec < challengeData.tm) {
      winnerEl.textContent = '🏆 תיקו בניקוד, אבל היית מהיר/ה יותר!';
      winnerEl.className = 'challenge-winner win';
      launchConfetti();
    } else if (challengeData.tm && myTimeSec > challengeData.tm) {
      winnerEl.textContent = `😤 תיקו! אבל ${challengeData.c} היה/ייתה מהיר/ה יותר`;
      winnerEl.className = 'challenge-winner lose';
    } else {
      winnerEl.textContent = '🤝 תיקו מושלם!';
      winnerEl.className = 'challenge-winner tie';
    }
  }

  // Store for share-back
  challengeTotalTime = myTimeSec * 1000;

  showScreen('challengeResultsScreen');
}

function shareResultBack() {
  const myTimeSec = Math.round(challengeTotalTime / 1000);
  const myName = currentPlayer || 'חבר';
  const total = currentQuestions.length;

  let resultEmoji;
  if (correctCount > challengeData.s) resultEmoji = '💪 ניצחתי!';
  else if (correctCount < challengeData.s) resultEmoji = '😤 הפעם ניצחת...';
  else resultEmoji = '🤝 תיקו!';

  // Build results link so Player A can see the comparison card
  const resultsData = {
    a: { n: challengeData.c, s: challengeData.s, t: challengeData.t, tm: challengeData.tm },
    b: { n: myName, s: correctCount, t: total, tm: myTimeSec }
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(resultsData)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const baseUrl = window.location.origin + window.location.pathname;
  const resultsUrl = `${baseUrl}?results=${encoded}`;

  const text = `⚔️ סיימתי את האתגר שלך!
📊 ${myName}: ${correctCount}/${total} ${myTimeSec ? `ב-${formatTime(myTimeSec)}` : ''}
📊 ${challengeData.c}: ${challengeData.s}/${challengeData.t} ${challengeData.tm ? `ב-${formatTime(challengeData.tm)}` : ''}
${resultEmoji}
👇 ראה את התוצאות:
${resultsUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
}

function shareResultsCard() {
  const myTimeSec = Math.round(challengeTotalTime / 1000);
  const myName = currentPlayer || 'שחקן';
  const total = currentQuestions.length;

  const resultsData = {
    a: { n: challengeData.c, s: challengeData.s, t: challengeData.t, tm: challengeData.tm },
    b: { n: myName, s: correctCount, t: total, tm: myTimeSec }
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(resultsData)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const baseUrl = window.location.origin + window.location.pathname;
  const url = `${baseUrl}?results=${encoded}`;

  if (navigator.share) {
    navigator.share({ text: '📊 תוצאות האתגר:', url }).catch(() => copyToClipboard(url));
  } else {
    copyToClipboard(url);
  }
}

function showResultsCard(data) {
  // Validate data structure
  if (!data || !data.a || !data.b) {
    showScreen('welcomeScreen');
    return;
  }
  // Display a shared results comparison card
  document.getElementById('challengerName').textContent = data.a.n;
  document.getElementById('challengerScore').textContent = `${data.a.s}/${data.a.t}`;
  document.getElementById('challengerTime').textContent = data.a.tm ? formatTime(data.a.tm) : '';

  document.getElementById('challengedName').textContent = data.b.n;
  document.getElementById('challengedScore').textContent = `${data.b.s}/${data.b.t}`;
  document.getElementById('challengedTime').textContent = data.b.tm ? formatTime(data.b.tm) : '';

  const winnerEl = document.getElementById('challengeWinner');
  if (data.b.s > data.a.s) {
    winnerEl.textContent = `🏆 ${data.b.n} ניצח/ה!`;
    winnerEl.className = 'challenge-winner win';
  } else if (data.a.s > data.b.s) {
    winnerEl.textContent = `🏆 ${data.a.n} ניצח/ה!`;
    winnerEl.className = 'challenge-winner win';
  } else {
    winnerEl.textContent = '🤝 תיקו!';
    winnerEl.className = 'challenge-winner tie';
  }

  showScreen('challengeResultsScreen');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')} דק׳` : `${s} שנ׳`;
}

// ===== SAFE LOCALSTORAGE =====
function safeGetItem(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function safeSetItem(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { console.warn('Storage error:', e); }
}

function safeParseJson(key, fallback) {
  try { return JSON.parse(safeGetItem(key, JSON.stringify(fallback))); }
  catch { return fallback; }
}

// ===== STATE =====
let triviaData = null;
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let correctCount = 0; // Track actual correct answers separately from bonus score
let streak = 0;
let maxStreak = 0;
let answered = false;
let dotResults = []; // Track correct/wrong per question for progress dots
let lastMode = null;
let lastCategory = null;
let currentPlayer = null;

const QUESTIONS_PER_GAME = 10;
const LETTERS = ['א', 'ב', 'ג', 'ד'];
const STORAGE_KEY = 'historyTriviaPlayers';
const SPOTIFY_SHOW_URL = 'https://open.spotify.com/show/0cHdRNk24adWawuZQyyn3b';

function resetGameState() {
  score = 0;
  correctCount = 0;
  streak = 0;
  maxStreak = 0;
  currentIndex = 0;
  answered = false;
  dotResults = [];
  hintsRemaining = 3;
  fastestAnswerTime = Infinity;
  challengeStartTime = Date.now();
  challengeTotalTime = 0;
}

// ===== INIT =====
async function init() {
  // Show loading state
  document.body.classList.add('loading');

  try {
    const res = await fetch('data/trivia.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triviaData = await res.json();
    console.log(`Loaded ${triviaData.questions.length} questions`);
  } catch (err) {
    console.error('Failed to load trivia data:', err);
    const errEl = document.getElementById('loadingError');
    if (errEl) errEl.style.display = 'block';
  }

  document.body.classList.remove('loading');

  // Restore sound setting
  document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';

  // Check if this is a challenge link
  const urlAction = checkForChallenge();

  renderPlayerList();

  const players = getPlayers();
  if (players.length === 1) {
    selectPlayer(players[0].name);
  }

  if (urlAction === 'challenge') {
    // If player already selected, show challenge intro directly
    // Otherwise, pendingChallenge flag will trigger it after player selection
    if (currentPlayer) {
      setTimeout(() => showChallengeIntro(), 300);
    }
    // If no player selected yet, challengeData stays set and
    // selectPlayer will check for it
  } else if (urlAction === 'results') {
    // Results card is already shown by checkForChallenge
  }

  document.getElementById('newPlayerName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPlayer();
  });
}

// ===== PLAYER MANAGEMENT =====
function getPlayers() {
  return safeParseJson(STORAGE_KEY, []);
}

function savePlayers(players) {
  safeSetItem(STORAGE_KEY, JSON.stringify(players));
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

function editPlayer(oldName, event) {
  event.stopPropagation();
  const newName = prompt('שם חדש:', oldName);
  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
  const trimmed = newName.trim().slice(0, 20);

  const players = getPlayers();
  // Check for duplicate name
  if (players.some(p => p.name === trimmed)) {
    alert('כבר יש שחקן עם השם הזה!');
    return;
  }

  const player = players.find(p => p.name === oldName);
  if (player) player.name = trimmed;
  savePlayers(players);

  // Update badges
  const badges = safeParseJson('historyTriviaBadges', {});
  if (badges[oldName]) { badges[trimmed] = badges[oldName]; delete badges[oldName]; }
  safeSetItem('historyTriviaBadges', JSON.stringify(badges));

  // Update played topics/eras
  const topics = safeParseJson('historyTriviaPlayedTopics', {});
  if (topics[oldName]) { topics[trimmed] = topics[oldName]; delete topics[oldName]; }
  safeSetItem('historyTriviaPlayedTopics', JSON.stringify(topics));

  const eras = safeParseJson('historyTriviaPlayedEras', {});
  if (eras[oldName]) { eras[trimmed] = eras[oldName]; delete eras[oldName]; }
  safeSetItem('historyTriviaPlayedEras', JSON.stringify(eras));

  // Update daily challenge data
  const daily = safeParseJson('historyTriviaDaily', {});
  if (daily[oldName]) { daily[trimmed] = daily[oldName]; delete daily[oldName]; }
  safeSetItem('historyTriviaDaily', JSON.stringify(daily));

  if (currentPlayer === oldName) currentPlayer = trimmed;
  renderPlayerList();
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

  // Check for pending challenge
  if (challengeData) {
    showChallengeIntro();
  } else {
    showScreen('welcomeScreen');
  }
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
  const dailyData = safeParseJson('historyTriviaDaily', {});
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

    const editBtn = document.createElement('button');
    editBtn.className = 'player-edit';
    editBtn.title = 'ערוך שם';
    editBtn.textContent = '✏️';
    editBtn.onclick = (e) => editPlayer(p.name, e);

    const delBtn = document.createElement('button');
    delBtn.className = 'player-delete';
    delBtn.title = 'מחק שחקן';
    delBtn.textContent = '✕';
    delBtn.onclick = (e) => deletePlayer(p.name, e);

    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(editBtn);
    card.appendChild(delBtn);
    list.appendChild(card);
  }

  setTimeout(() => document.getElementById('newPlayerName')?.focus(), 100);
}

// ===== NAVIGATION =====
const screenHistory = [];

function showScreen(id) {
  // Track history for back navigation (don't track if going back)
  const currentScreen = document.querySelector('.screen.active');
  if (currentScreen && currentScreen.id !== id) {
    // Don't push duplicate consecutive entries (prevents nav loops)
    if (screenHistory[screenHistory.length - 1] !== currentScreen.id) {
      screenHistory.push(currentScreen.id);
    }
    // Keep history short
    if (screenHistory.length > 10) screenHistory.shift();
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);

  if (id === 'playerScreen') renderPlayerList();
  if (id === 'leaderboardScreen') renderStats();
  if (id === 'badgesScreen') renderBadgesScreen();
  if (id === 'welcomeScreen' && currentPlayer) {
    const player = getPlayers().find(p => p.name === currentPlayer);
    if (player) updateLevelCard(player);
    updateDailyDesc();
  }
}

function goBack() {
  // Go to previous screen, or welcomeScreen as fallback
  const prev = screenHistory.pop();
  if (prev && prev !== 'quizScreen' && prev !== 'resultsScreen' && prev !== 'challengeResultsScreen') {
    showScreen(prev);
    // Remove the entry showScreen just added (since we're going back)
    screenHistory.pop();
  } else {
    showScreen('welcomeScreen');
    screenHistory.pop();
  }
}

function quitQuiz() {
  if (currentIndex > 0 && !confirm('בטוח שאתה רוצה לצאת? ההתקדמות לא תישמר.')) return;
  clearTimer();
  goBack();
}

// ===== LEADERBOARD =====
function renderStats() {
  const container = document.getElementById('statsContent');
  const player = currentPlayer
    ? getPlayers().find(p => p.name === currentPlayer)
    : null;

  if (!player) {
    container.innerHTML = '<div class="stats-empty">בחר שחקן כדי לראות סטטיסטיקות</div>';
    return;
  }

  const level = getLevel(player.totalCorrect);
  const nextLevel = getNextLevel(player.totalCorrect);
  const totalAnswered = player.totalAnswered || (player.totalGames * 10); // fallback for old profiles
  const accuracy = totalAnswered > 0
    ? Math.round((player.totalCorrect / totalAnswered) * 100)
    : 0;
  const playedTopics = safeParseJson('historyTriviaPlayedTopics', {});
  const playerTopics = playedTopics[currentPlayer] || [];
  const playedEras = safeParseJson('historyTriviaPlayedEras', {});
  const playerEras = playedEras[currentPlayer] || [];
  const dailyData = safeParseJson('historyTriviaDaily', {});
  const playerDaily = dailyData[currentPlayer];
  const dailyStreak = playerDaily?.streak || 0;

  // Progress to next level
  let progressHTML = '';
  if (nextLevel) {
    const progress = player.totalCorrect - level.threshold;
    const needed = nextLevel.threshold - level.threshold;
    const pct = Math.min(100, Math.round((progress / needed) * 100));
    progressHTML = `
      <div class="stats-progress">
        <div class="stats-progress-label">התקדמות לדרגת ${nextLevel.icon} ${nextLevel.name}</div>
        <div class="stats-progress-bar"><div class="stats-progress-fill" style="width: ${pct}%"></div></div>
        <div class="stats-progress-text">${player.totalCorrect} / ${nextLevel.threshold} תשובות נכונות</div>
      </div>
    `;
  } else {
    progressHTML = '<div class="stats-max-level">🏆 הגעת לדרגה הגבוהה ביותר!</div>';
  }

  // Topic coverage
  const allTopics = triviaData ? [...new Set(triviaData.questions.map(q => q.topic))] : [];
  const topicCoverage = allTopics.length > 0
    ? `${playerTopics.length} מתוך ${allTopics.length}`
    : '—';

  // Era coverage
  const allEras = triviaData ? [...new Set(triviaData.questions.map(q => q.era))] : [];
  const eraCoverage = allEras.length > 0
    ? `${playerEras.length} מתוך ${allEras.length}`
    : '—';

  container.innerHTML = `
    <div class="stats-level-card">
      <div class="stats-level-icon">${level.icon}</div>
      <div class="stats-level-name">${level.name}</div>
      ${progressHTML}
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">${player.totalCorrect}</div>
        <div class="stat-label">תשובות נכונות</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${player.totalGames}</div>
        <div class="stat-label">משחקים</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${accuracy}%</div>
        <div class="stat-label">אחוז הצלחה</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${player.bestStreak}</div>
        <div class="stat-label">רצף שיא</div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">🗺️ כיסוי</div>
      <div class="stats-coverage-row">
        <span>נושאים שנוסו</span>
        <span class="stats-coverage-val">${topicCoverage}</span>
      </div>
      <div class="stats-coverage-row">
        <span>תקופות שנוסו</span>
        <span class="stats-coverage-val">${eraCoverage}</span>
      </div>
      <div class="stats-coverage-row">
        <span>רצף יומי נוכחי</span>
        <span class="stats-coverage-val">${dailyStreak} 🔥</span>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== CATEGORY SELECTION =====
function showCategories(type) {
  if (!triviaData || !triviaData.questions) {
    alert('טוען שאלות... נסה שוב בעוד רגע.');
    return;
  }
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
  resetGameState();
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

  challengeStartTime = Date.now();
  challengeTotalTime = 0;
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

  // Render progress dots
  renderProgressDots();

  document.getElementById('questionNumber').textContent = `שאלה ${currentIndex + 1}`;
  document.getElementById('questionText').textContent = q.question;

  // Shuffle options
  const indices = q.options.map((_, i) => i);
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

// ===== PROGRESS DOTS =====
function renderProgressDots() {
  const container = document.getElementById('progressDots');
  container.innerHTML = '';
  const total = currentQuestions.length;
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('span');
    dot.className = 'progress-dot';
    if (i === currentIndex) dot.classList.add('current');
    if (i < dotResults.length) {
      dot.classList.add(dotResults[i] ? 'correct-dot' : 'wrong-dot');
      dot.classList.remove('current');
    }
    container.appendChild(dot);
  }
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
    correctCount++;
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

  // Track result for progress dots
  dotResults.push(isCorrect);
  renderProgressDots();

  allBtns.forEach(b => {
    if (!b.classList.contains('correct') && !b.classList.contains('wrong')) {
      b.classList.add('disabled');
    }
  });

  // Update score with pop animation
  const scoreEl = document.getElementById('quizScore');
  scoreEl.textContent = `${score} נקודות`;
  if (isCorrect) {
    scoreEl.classList.remove('score-pop');
    void scoreEl.offsetWidth; // Force reflow for re-triggering
    scoreEl.classList.add('score-pop');
  }

  const q = currentQuestions[currentIndex];
  document.getElementById('funFactText').textContent = q.funFact;

  // Spotify episode link
  const linkEl = document.getElementById('episodeLink');
  linkEl.querySelector('span').textContent = `שמע את הפרק: ${q.episode}`;
  linkEl.href = SPOTIFY_SHOW_URL;

  document.getElementById('funFact').classList.add('visible');

  const nextBtn = document.getElementById('nextBtn');
  nextBtn.textContent = currentIndex === currentQuestions.length - 1
    ? 'לתוצאות! 🎉'
    : 'השאלה הבאה ←';
  // Delay showing next button by 2s to encourage reading the fun fact
  nextBtn.classList.remove('visible');
  setTimeout(() => nextBtn.classList.add('visible'), 1000);
}

// ===== NEXT QUESTION =====
function nextQuestion() {
  if (!answered) return; // Guard against rapid clicks
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
  const pct = correctCount / total; // Use actual correct count, not bonus-inflated score

  // Track total game time for challenges
  if (challengeStartTime > 0) {
    challengeTotalTime = Date.now() - challengeStartTime;
  }

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
      player.totalCorrect += correctCount; // Use actual correct answers, not bonus-inflated score
      player.totalAnswered = (player.totalAnswered || 0) + currentQuestions.length;
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

  // Track topics and eras played (for badges)
  if (currentPlayer) {
    const questTopics = [...new Set(currentQuestions.map(q => q.topic))];
    const questEras = [...new Set(currentQuestions.map(q => q.era))];

    const playedTopics = safeParseJson('historyTriviaPlayedTopics', {});
    const playerTopics = new Set(playedTopics[currentPlayer] || []);
    questTopics.forEach(t => playerTopics.add(t));
    playedTopics[currentPlayer] = [...playerTopics];
    safeSetItem('historyTriviaPlayedTopics', JSON.stringify(playedTopics));

    const playedEras = safeParseJson('historyTriviaPlayedEras', {});
    const playerEras = new Set(playedEras[currentPlayer] || []);
    questEras.forEach(e => playerEras.add(e));
    playedEras[currentPlayer] = [...playerEras];
    safeSetItem('historyTriviaPlayedEras', JSON.stringify(playedEras));
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
  const displayScore = timedMode && score > correctCount
    ? `${correctCount} <span>מתוך ${total}</span> <span class="bonus-note">+${score - correctCount} בונוס ⚡</span>`
    : `${correctCount} <span>מתוך ${total}</span>`;
  document.getElementById('resultsFinalScore').innerHTML = displayScore;
  document.getElementById('resultCorrect').textContent = correctCount;
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

  // If this was a challenge, show challenge results instead
  if (lastMode === 'challenge' && challengeData) {
    showChallengeResults();
    return;
  }

  showScreen('resultsScreen');
}

// ===== SHARE =====
function shareScore() {
  const total = currentQuestions.length;
  const player = currentPlayer || 'שחקן';
  const playerData = currentPlayer
    ? getPlayers().find(p => p.name === currentPlayer)
    : null;
  const level = playerData ? getLevel(playerData.totalCorrect) : LEVELS[0];
  // Use the results screen title (matches what user sees)
  const resultsTitle = document.getElementById('resultsTitle')?.textContent || level.name;

  const text = [
    `📜 טריוויה - היסטוריה לילדים`,
    `${player} השיג ${correctCount}/${total}!`,
    `${level.icon} דרגה: ${resultsTitle}`,
    `🔥 רצף: ${maxStreak}`,
    ``,
    `בואו לשחק גם! 🎮`,
    `https://history-for-kids-trivia.vercel.app`,
  ].join('\n');

  if (navigator.share) {
    navigator.share({ text, url: 'https://history-for-kids-trivia.vercel.app' }).catch(() => copyToClipboard(text));
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
  // Clear challenge state so "play again" starts a fresh game
  challengeData = null;
  challengeStartTime = 0;
  challengeTotalTime = 0;

  if (lastMode === 'daily') {
    // Daily can only be played once per day, fall back to random
    startMode('random');
  } else if (lastMode === 'challenge') {
    // After a challenge, go to random mode
    startMode('random');
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
    if ((e.key === 'Enter' || e.key === ' ') && answered && document.getElementById('nextBtn').classList.contains('visible')) {
      nextQuestion();
    }
  }
});

// ===== VISIBILITY CHANGE (pause/resume timer) =====
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseTimer();
  } else {
    resumeTimer();
  }
});

// ===== ANALYTICS & ERROR TRACKING =====
const track = (name, data) => {
  try {
    // Vercel Web Analytics custom events
    if (window.va) window.va('event', { name, data });
  } catch (e) { /* silent */ }
};

// Track game starts
const _origStartMode = startMode;
startMode = function(mode, category) {
  track('game_start', { mode, category: category || 'none' });
  return _origStartMode.apply(this, arguments);
};

// Track game completions
const _origShowResults = showResults;
showResults = function() {
  try {
    track('game_complete', {
      mode: lastMode,
      score: score,
      total: currentQuestions.length,
      accuracy: Math.round((correctCount / currentQuestions.length) * 100),
      timed: timedMode,
      hintsUsed: 3 - hintsRemaining
    });
  } catch (e) { /* don't break game */ }
  return _origShowResults.apply(this, arguments);
};

// Track hint usage
const _origUseHint = typeof useHint === 'function' ? useHint : null;
if (_origUseHint) {
  useHint = function() {
    try {
      track('hint_used', { questionIndex: currentIndex, hintsLeft: hintsRemaining });
    } catch (e) { /* don't break game */ }
    return _origUseHint.apply(this, arguments);
  };
}

// Global error handler - catch crashes
window.addEventListener('error', (e) => {
  track('js_error', {
    message: e.message,
    source: (e.filename || '').split('/').pop(),
    line: e.lineno,
    col: e.colno
  });
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  track('promise_error', {
    message: String(e.reason).slice(0, 200)
  });
});

// Track session duration on page leave
let sessionStart = Date.now();
window.addEventListener('beforeunload', () => {
  track('session_end', {
    duration_sec: Math.round((Date.now() - sessionStart) / 1000),
    player: currentPlayer || 'none'
  });
});

// ===== START =====
init();
