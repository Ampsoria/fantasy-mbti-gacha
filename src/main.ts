import "./style.css";
import characterData from "../data/characters.json";
import questionData from "../data/questions.json";
import characterDataTh from "../data/characters_th.json";
import questionDataTh from "../data/questions_th.json";
import { calculateResult, type UserAnswer, type GachaResult, type Question, type Character } from "./engine";
import html2canvas from "html2canvas";
import { createIcons, icons } from "lucide";
// ─── Types ──────────────────────────────────────────────────
interface QuizState {
  currentIndex: number;
  answers: UserAnswer[];
  isTransitioning: boolean;
  startedAt: number;
}

// ─── State ──────────────────────────────────────────────────
let currentLang: "en" | "th" = (localStorage.getItem("fbti_lang") as "en" | "th") || "en";

function getQuestions(): Question[] {
  return (currentLang === "en" ? questionData.questions : questionDataTh.questions) as unknown as Question[];
}

function getCharacters(): Character[] {
  return (currentLang === "en" ? characterData.characters : characterDataTh.characters) as unknown as Character[];
}

let questions = getQuestions();
let characters = getCharacters();

const state: QuizState = {
  currentIndex: 0,
  answers: [],
  isTransitioning: false,
  startedAt: 0,
};

// ─── DOM Refs ───────────────────────────────────────────────
const $ = (id: string) => document.getElementById(id)!;
const screens = {
  landing: $("screen-landing"),
  quiz: $("screen-quiz"),
  summoning: $("screen-summoning"),
  result: $("screen-result"),
};

// ─── Particles ──────────────────────────────────────────────
function initParticles() {
  const canvas = $("particles-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  interface Particle {
    x: number; y: number; r: number;
    dx: number; dy: number; o: number; hue: number;
  }
  const particles: Particle[] = Array.from({ length: 70 }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: Math.random() * 2 + 0.5,
    dx: (Math.random() - 0.5) * 0.25,
    dy: -Math.random() * 0.3 - 0.05,
    o: Math.random() * 0.5 + 0.1,
    hue: Math.random() > 0.5 ? 260 : 175,
  }));

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) { p.y = h; p.x = Math.random() * w; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.o})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });
}

// ─── Internationalization ───────────────────────────────────
const translations = {
  en: {
    "landing.subtitle": "The Fantasy MBTI Assessment",
    "landing.title": "ECHOES OF<br>THE ARCANE",
    "landing.desc": "Discover your fantasy archetype. Answer 12 situational questions and unlock your fate.",
    "landing.start": "BEGIN YOUR QUEST",
    "landing.resume": "Continue Quest",
    "landing.hint": "24 unique characters await • Will you find the hidden one?",
    "rarity.common": "Common",
    "rarity.rare": "Rare",
    "rarity.sr": "Super Rare",
    "rarity.secret": "Secret",
    "quiz.keyboard_hint": "Press <kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd> to choose",
    "summoning.pulling": "PULLING...",
    "summoning.touch": "✦ TOUCH TO REVEAL ✦",
    "summoning.tap": "Tap to Reveal",
    "summoning.view": "View Full Profile",
    "result.subtitle": "YOUR DESTINY",
    "result.share": "Share Results",
    "result.save": "Save Image",
    "result.saving": "Saving...",
    "result.restart": "Play Again",
    "axis.EI": "🧭 Mind — Energy",
    "axis.SN": "👁️ Perception — Information",
    "axis.TF": "⚖️ Judgment — Decisions",
    "axis.JP": "🗓️ Lifestyle — Structure",
    "stat.N": "of adventurers share this archetype. A <strong>proven</strong> and reliable soul.",
    "stat.R": "of adventurers unlock a Rare character. You walk a <strong>distinguished</strong> path.",
    "stat.SR": "of adventurers unlock a Super Rare character. You are <strong>truly exceptional</strong>.",
    "stat.SSR": "of adventurers discover the Secret character. You found the <strong>impossible</strong>.",
    "secret.type": "??? — The Paradox",
    "share.title": "My Fantasy Archetype:",
    "share.rarity": "Rarity:",
    "share.play": "Find your archetype:",
    "share.error": "Failed to copy link. Please try again."
  },
  th: {
    "landing.subtitle": "แบบทดสอบ MBTI แฟนตาซี",
    "landing.title": "เสียงสะท้อน<br>แห่งมนตรา",
    "landing.desc": "ค้นหาตัวตนของคุณในโลกแฟนตาซี ตอบคำถาม 12 ข้อและปลดล็อกโชคชะตาของคุณ",
    "landing.start": "เริ่มการเดินทาง",
    "landing.resume": "เดินทางต่อ",
    "landing.hint": "24 ตัวละครกำลังรอคุณอยู่ • คุณจะค้นพบความลับที่ซ่อนอยู่หรือไม่?",
    "rarity.common": "ทั่วไป",
    "rarity.rare": "หายาก",
    "rarity.sr": "หายากมาก",
    "rarity.secret": "ความลับ",
    "quiz.keyboard_hint": "กด <kbd>A</kbd>–<kbd>D</kbd> หรือ <kbd>1</kbd>–<kbd>4</kbd> เพื่อเลือก",
    "summoning.pulling": "กำลังอัญเชิญ...",
    "summoning.touch": "✦ แตะเพื่อเปิดเผย ✦",
    "summoning.tap": "แตะเพื่อเปิดเผย",
    "summoning.view": "ดูประวัติทั้งหมด",
    "result.subtitle": "โชคชะตาของคุณ",
    "result.share": "แชร์ผลลัพธ์",
    "result.save": "บันทึกรูป",
    "result.saving": "กำลังบันทึก...",
    "result.restart": "เล่นอีกครั้ง",
    "axis.EI": "🧭 จิตใจ — พลังงาน",
    "axis.SN": "👁️ การรับรู้ — ข้อมูล",
    "axis.TF": "⚖️ การตัดสินใจ — เหตุผลและอารมณ์",
    "axis.JP": "🗓️ ไลฟ์สไตล์ — โครงสร้าง",
    "stat.N": "ของนักผจญภัยมีตัวตนแบบนี้ เป็นดวงวิญญาณที่ <strong>พึ่งพาได้</strong> และได้รับการพิสูจน์แล้ว",
    "stat.R": "ของนักผจญภัยปลดล็อกตัวละครระดับ Rare คุณกำลังเดินบนเส้นทางที่ <strong>โดดเด่น</strong>",
    "stat.SR": "ของนักผจญภัยปลดล็อกตัวละครระดับ Super Rare คุณช่าง <strong>ยอดเยี่ยมอย่างแท้จริง</strong>",
    "stat.SSR": "ของนักผจญภัยค้นพบตัวละครระดับ Secret คุณได้พบกับ <strong>สิ่งที่เป็นไปไม่ได้</strong> แล้ว",
    "secret.type": "??? — ความย้อนแย้ง",
    "share.title": "ตัวตนแฟนตาซีของฉัน:",
    "share.rarity": "ระดับ:",
    "share.play": "ค้นหาตัวตนของคุณได้ที่:",
    "share.error": "คัดลอกลิงก์ไม่สำเร็จ กรุณาลองใหม่"
  }
};

function t(key: string): string {
  return (translations[currentLang] as any)[key] || key;
}

function updateUIForLanguage() {
  $("lang-text").textContent = currentLang.toUpperCase();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      if (key === "landing.title") {
        el.innerHTML = t(key);
      } else {
        el.textContent = t(key);
      }
    }
  });

  // Re-render current page specific dynamic content if needed
  if (screens.quiz.classList.contains("active")) renderQuestion();
  if (screens.result.classList.contains("active") && pendingResult) {
    showResult(pendingResult);
  }
  
  createIcons({ icons });
}

$("lang-toggle").addEventListener("click", () => {
  currentLang = currentLang === "en" ? "th" : "en";
  localStorage.setItem("fbti_lang", currentLang);
  
  // Update data sources
  questions = getQuestions();
  characters = getCharacters();
  
  updateUIForLanguage();
});

// ─── Screen Management ──────────────────────────────────────
function showScreen(name: keyof typeof screens) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ─── Progress Dots ──────────────────────────────────────────
function renderProgressDots() {
  const container = $("progress-dots");
  container.innerHTML = "";
  questions.forEach((_: any, i: number) => {
    const dot = document.createElement("span");
    dot.className = "progress-dot";
    if (i < state.currentIndex) dot.classList.add("completed");
    if (i === state.currentIndex) dot.classList.add("current");
    // Mark Easter Egg questions subtly
    if (state.answers[i]) {
      const q = questions[i];
      const choice = q.choices[state.answers[i].choiceIndex] as any;
      if (choice?.isEasterEgg) dot.classList.add("egg-found");
    }
    container.appendChild(dot);
  });
}

// ─── Quiz Rendering ─────────────────────────────────────────
const AXIS_ICONS: Record<string, string> = {
  EI: '<i data-lucide="compass"></i>', 
  SN: '<i data-lucide="eye"></i>', 
  TF: '<i data-lucide="scale"></i>', 
  JP: '<i data-lucide="calendar"></i>',
};

function renderQuestion() {
  if (state.isTransitioning) return;
  const q = questions[state.currentIndex] as any;

  // Progress
  $("question-counter").textContent = `${state.currentIndex + 1} / ${questions.length}`;
  const pct = (state.currentIndex / questions.length) * 100;
  ($("progress-fill") as HTMLElement).style.width = `${pct}%`;
  $("axis-label").textContent = t(`axis.${q.axis}`);
  $("axis-icon").innerHTML = AXIS_ICONS[q.axis] || "";

  renderProgressDots();

  // Chapter title
  $("chapter-title").textContent = q.chapter || `Chapter ${q.id}`;
  $("chapter-number").textContent = `— ${toRoman(q.id)} —`;

  // Animate quiz body with slide direction
  const body = $("quiz-body");
  body.classList.remove("slide-in", "slide-in-reverse");
  body.offsetHeight; // force reflow
  body.classList.add("slide-in");

  // Scenario text
  $("scenario-text").textContent = q.scenario;

  // Choices with staggered animation
  const container = $("choices-container");
  container.innerHTML = "";

  q.choices.forEach((choice: any, idx: number) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.style.animationDelay = `${idx * 0.08 + 0.15}s`;
    btn.setAttribute("data-index", String(idx));
    btn.id = `choice-q${q.id}-${idx}`;

    // Choice label (A, B, C, D)
    const label = document.createElement("span");
    label.className = "choice-label";
    label.textContent = String.fromCharCode(65 + idx);

    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = choice.text;

    btn.appendChild(label);
    btn.appendChild(text);

    // If previously answered, show selection
    if (state.answers[state.currentIndex]?.choiceIndex === idx) {
      btn.classList.add("selected");
    }

    btn.addEventListener("click", () => selectChoice(idx));
    container.appendChild(btn);
  });
  
  createIcons({ icons });
}

function selectChoice(choiceIndex: number) {
  if (state.isTransitioning) return;
  state.isTransitioning = true;

  // Visual feedback
  const btns = document.querySelectorAll(".choice-btn");
  btns.forEach((b) => b.classList.remove("selected"));
  btns[choiceIndex]?.classList.add("selected");

  // Disable all buttons during transition
  btns.forEach((b) => (b as HTMLButtonElement).disabled = true);

  // Store answer securely
  state.answers[state.currentIndex] = {
    questionIndex: state.currentIndex,
    choiceIndex,
  };

  // Persist to sessionStorage for crash recovery
  saveState();

  // Advance after animation
  setTimeout(() => {
    state.currentIndex++;
    state.isTransitioning = false;

    if (state.currentIndex < questions.length) {
      renderQuestion();
    } else {
      // Quiz complete
      ($("progress-fill") as HTMLElement).style.width = "100%";
      renderProgressDots();
      setTimeout(() => startSummoning(), 500);
    }
  }, 400);
}

// ─── State Persistence ──────────────────────────────────────
function saveState() {
  try {
    sessionStorage.setItem("fbti_state", JSON.stringify({
      answers: state.answers,
      currentIndex: state.currentIndex,
      startedAt: state.startedAt,
    }));
  } catch { /* storage unavailable */ }
}

function loadState(): boolean {
  try {
    const saved = sessionStorage.getItem("fbti_state");
    if (!saved) return false;
    const data = JSON.parse(saved);
    if (data.answers?.length > 0 && data.currentIndex < questions.length) {
      state.answers = data.answers;
      state.currentIndex = data.currentIndex;
      state.startedAt = data.startedAt || Date.now();
      return true;
    }
  } catch { /* corrupt data */ }
  return false;
}

function clearState() {
  state.currentIndex = 0;
  state.answers = [];
  state.isTransitioning = false;
  state.startedAt = Date.now();
  try { sessionStorage.removeItem("fbti_state"); } catch { /* noop */ }
}

// ─── Summoning → Gacha Reveal Flow ──────────────────────────
let pendingResult: GachaResult | null = null;
let revealParticlesId: number | null = null;

function startSummoning() {
  showScreen("summoning");
  const content = $("summoning-content");
  const textEl = $("summoning-text");
  const wrapper = $("gacha-card-wrapper");
  const cardInner = $("gacha-card-inner");

  // Reset states
  content.classList.remove("hidden", "burst");
  wrapper.classList.remove("visible");
  cardInner.classList.remove("flipped");
  $("btn-view-details").style.display = "none";
  stopRevealParticles();

  const messages = [
    "The stars are aligning...",
    "Your choices echo through the void...",
    "Fate weaves its final thread...",
    "Your archetype awakens...",
  ];

  let i = 0;
  const interval = setInterval(() => {
    i++;
    if (i < messages.length) {
      textEl.style.opacity = "0";
      setTimeout(() => { textEl.textContent = messages[i]; textEl.style.opacity = "1"; }, 300);
    }
  }, 1100);

  // Phase 1 → Phase 2: Burst then show card
  setTimeout(() => {
    clearInterval(interval);
    content.classList.add("burst");
    textEl.textContent = "✦ Summoned! ✦";
    textEl.style.opacity = "1";

    // Calculate result
    pendingResult = calculateResult(state.answers, questions as any, characters as any);
    clearState();

    // Populate gacha card front
    populateGachaCard(pendingResult);

    setTimeout(() => {
      content.classList.add("hidden");
      wrapper.classList.add("visible");
    }, 800);
  }, 4400);
}

// ─── Gacha Card Population ──────────────────────────────────
const RARITY_NAMES: Record<string, string> = { N: "COMMON", R: "RARE", SR: "SUPER RARE", SSR: "✦ SECRET ✦" };
const RARITY_EMOJI: Record<string, string> = { N: "🛡️", R: "⚔️", SR: "🌟", SSR: "🌀" };
const RARITY_STARS: Record<string, string> = { N: "★", R: "★★", SR: "★★★", SSR: "★★★★★" };

// Rarity particle colors: [hue, saturation, lightness]
const RARITY_COLORS: Record<string, number[][]> = {
  N:   [[210, 20, 75], [220, 15, 85]],
  R:   [[215, 90, 65], [230, 80, 70]],
  SR:  [[275, 80, 65], [290, 70, 75], [260, 90, 55]],
  SSR: [[0, 85, 60], [45, 90, 60], [175, 80, 60], [275, 80, 65]],
};

function setPortrait(container: HTMLElement, imageUrl: string, fallbackEmoji: string) {
  container.innerHTML = '';
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = 'Character Portrait';
  img.className = 'portrait-img';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.onerror = () => {
    container.innerHTML = `<span class="portrait-emoji">${fallbackEmoji}</span>`;
  };
  container.appendChild(img);
}

function populateGachaCard(result: GachaResult) {
  const c = result.character;
  const r = c.rarity.toLowerCase();

  $("gacha-front-glow").className = `gacha-front-glow glow-${r}`;
  const tag = $("gacha-rarity-tag");
  tag.className = `gacha-rarity-tag rarity-${r}`;
  tag.textContent = RARITY_NAMES[c.rarity] || c.rarity;

  // Use actual character image
  setPortrait(
    document.querySelector('.gacha-portrait')! as HTMLElement,
    c.image_url,
    RARITY_EMOJI[c.rarity] || "⚔️"
  );

  $("gacha-char-name").textContent = c.name;
  $("gacha-char-class").textContent = c.class_title;

  // SSR glitch effect
  const front = $("gacha-card-front");
  front.classList.remove("ssr-glitch");
}

// ─── Card Flip & Reveal Particles ───────────────────────────
$("gacha-card").addEventListener("click", () => {
  const inner = $("gacha-card-inner");
  if (inner.classList.contains("flipped")) return;

  inner.classList.add("flipped");

  if (pendingResult) {
    // SSR gets glitch effect
    if (pendingResult.character.rarity === "SSR") {
      setTimeout(() => {
        $("gacha-card-front").classList.add("ssr-glitch");
        setTimeout(() => $("gacha-card-front").classList.remove("ssr-glitch"), 600);
      }, 400);
    }

    // Burst rarity particles
    startRevealParticles(pendingResult.character.rarity);

    // Show details button after card flip
    setTimeout(() => {
      $("btn-view-details").style.display = "inline-flex";
    }, 1000);
  }
});

// ─── Rarity Particle System ─────────────────────────────────
function startRevealParticles(rarity: string) {
  const canvas = $("reveal-particles") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = RARITY_COLORS[rarity] || RARITY_COLORS.N;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const count = rarity === "SSR" ? 120 : rarity === "SR" ? 80 : rarity === "R" ? 50 : 30;

  interface RevealP { x: number; y: number; vx: number; vy: number; r: number; life: number; maxLife: number; hsl: number[]; }
  const parts: RevealP[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    const hsl = colors[Math.floor(Math.random() * colors.length)];
    parts.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: Math.random() * 4 + 1,
      life: 1, maxLife: Math.random() * 60 + 40,
      hsl,
    });
  }

  function drawReveal() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of parts) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.05; // gravity
      p.vx *= 0.99;
      p.life -= 1 / p.maxLife;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hsl[0]}, ${p.hsl[1]}%, ${p.hsl[2]}%, ${p.life * 0.8})`;
      ctx.fill();

      // Glow
      if (rarity === "SR" || rarity === "SSR") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hsl[0]}, ${p.hsl[1]}%, ${p.hsl[2]}%, ${p.life * 0.15})`;
        ctx.fill();
      }
    }
    if (alive) {
      revealParticlesId = requestAnimationFrame(drawReveal);
    }
  }
  drawReveal();
}

function stopRevealParticles() {
  if (revealParticlesId) {
    cancelAnimationFrame(revealParticlesId);
    revealParticlesId = null;
  }
  const canvas = $("reveal-particles") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── View Full Profile ──────────────────────────────────────
$("btn-view-details").addEventListener("click", () => {
  if (pendingResult) {
    stopRevealParticles();
    showResult(pendingResult);
  }
});

// ─── Result Rendering ───────────────────────────────────────
function showResult(result: GachaResult) {
  const c = result.character;
  const r = c.rarity.toLowerCase();

  $("card-glow").className = `card-glow glow-${r}`;
  const rarityEl = $("card-rarity");
  rarityEl.className = `card-rarity rarity-${r}`;
  rarityEl.textContent = RARITY_NAMES[c.rarity] || c.rarity;

  $("card-stars").textContent = RARITY_STARS[c.rarity] || "★";
  $("card-stars").className = `card-stars stars-${r}`;

  // Use actual character image on result page
  setPortrait(
    $("portrait-placeholder"),
    c.image_url,
    RARITY_EMOJI[c.rarity] || "⚔️"
  );
  $("char-name").textContent = c.name;
  $("char-class").textContent = c.class_title;
  $("char-desc").textContent = c.description;
  $("char-id").textContent = `#${c.id.replace("char_", "")}`;

  // Rarity stat
  const statsPct: Record<string, string> = { N: "42%", R: "18%", SR: "5%", SSR: "<1%" };
  const statsIcon: Record<string, string> = { N: "target", R: "gem", SR: "star", SSR: "orbit" };
  const pct = statsPct[c.rarity] || "42%";
  const icon = statsIcon[c.rarity] || "target";
  
  $("rarity-stat-icon").innerHTML = `<i data-lucide="${icon}"></i>`;
  $("rarity-stat-text").innerHTML = `<strong>${pct}</strong> ${t(`stat.${c.rarity}`)}`;

  // MBTI type
  $("mbti-type").textContent = result.isSecret ? t("secret.type") : result.mbtiType;

  // Axis bars
  const barsContainer = $("axis-bars");
  barsContainer.innerHTML = "";

  const axes = [
    { left: "E", right: "I", pct: result.axisPercentages.EI },
    { left: "S", right: "N", pct: result.axisPercentages.SN },
    { left: "T", right: "F", pct: result.axisPercentages.TF },
    { left: "J", right: "P", pct: result.axisPercentages.JP },
  ];

  axes.forEach((a) => {
    const row = document.createElement("div");
    row.className = "axis-row";
    row.innerHTML = `
      <span class="axis-label-left">${a.left}</span>
      <div class="axis-track">
        <div class="axis-fill" style="width: 0%"></div>
        <div class="axis-marker"></div>
      </div>
      <span class="axis-label-right">${a.right}</span>
      <span class="axis-pct">${a.pct}%</span>
    `;
    barsContainer.appendChild(row);
  });

  // Delay bars animation
  setTimeout(() => {
    const fills = document.querySelectorAll(".axis-fill");
    fills.forEach((fill: any, i) => {
      const keys = ["EI", "SN", "TF", "JP"];
      const key = keys[i] as keyof typeof result.axisPercentages;
      fill.style.width = `${result.axisPercentages[key]}%`;
    });
  }, 100);
  
  createIcons({ icons });

  showScreen("result");
}

// ─── Keyboard Navigation ───────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (!screens.quiz.classList.contains("active")) return;
  if (state.isTransitioning) return;
  const q = questions[state.currentIndex] as any;
  const keyMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
  const idx = keyMap[e.key.toLowerCase()];
  if (idx !== undefined && idx < q.choices.length) selectChoice(idx);
});

// ─── Utility ────────────────────────────────────────────────
function toRoman(n: number): string {
  const map: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let result = "";
  for (const [val, sym] of map) { while (n >= val) { result += sym; n -= val; } }
  return result;
}

// ─── Event Listeners ────────────────────────────────────────
$("btn-start").addEventListener("click", () => {
  clearState(); state.startedAt = Date.now();
  renderQuestion(); showScreen("quiz");
});

const resumeBtn = $("btn-resume");
if (resumeBtn) {
  resumeBtn.addEventListener("click", () => { renderQuestion(); showScreen("quiz"); });
}

$("btn-retry").addEventListener("click", () => {
  clearState(); state.startedAt = Date.now();
  renderQuestion(); showScreen("quiz");
});

$("btn-share").addEventListener("click", async () => {
  const name = $("char-name").textContent;
  const cls = $("char-class").textContent;
  const mbti = $("mbti-type").textContent;
  const rarity = $("card-rarity").textContent;
  const stat = $("rarity-stat-text").textContent;
  const text = [
    `🎴 ${t("share.title")} ${name} — ${cls}!`,
    `⭐ ${t("share.rarity")} ${rarity}`,
    `🧬 Type: ${mbti}`,
    `📊 ${stat}`,
    ``,
    `${t("share.play")} Fantasy MBTI Gacha`,
  ].join("\n");

  if (navigator.share) {
    try { await navigator.share({ title: "Fantasy MBTI Result", text }); } catch { /* cancelled */ }
  } else {
    await navigator.clipboard.writeText(text);
    const btn = $("btn-share");
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">✅</span> Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  }
});

$("btn-save").addEventListener("click", async () => {
  const card = $("result-card");
  if (!card) return;
  
  const btn = $("btn-save");
  const origText = btn.innerHTML;
  btn.innerHTML = `<i data-lucide="hourglass" class="btn-icon"></i> <span data-i18n="result.saving">${t("result.saving")}</span>`;
  createIcons({ icons });
  btn.style.opacity = "0.7";
  btn.style.pointerEvents = "none";
  
  try {
    const canvas = await html2canvas(card, {
      backgroundColor: "#111116",
      scale: 2, // High resolution
      useCORS: true,
      logging: false
    });
    
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `FBTI_${pendingResult?.character?.name || "Result"}.png`;
    a.click();
  } catch (err) {
    console.error("Save failed", err);
    alert(currentLang === "th" ? "เกิดข้อผิดพลาดในการบันทึกภาพ" : "Failed to save image.");
  } finally {
    btn.innerHTML = origText;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  }
});

// ─── Initialization ─────────────────────────────────────────
initParticles();
updateUIForLanguage();
if (loadState()) resumeBtn?.classList.add("visible");
createIcons({ icons });
