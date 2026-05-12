// ============================================================
// Fantasy MBTI Gacha Engine
// Core scoring, MBTI calculation, and gacha pull logic
// ============================================================

export interface Choice {
  text: string;
  weights: Record<string, number>;
  isEasterEgg?: boolean;
}

export interface Question {
  id: number;
  axis: string;
  scenario: string;
  choices: Choice[];
}

export interface Character {
  id: string;
  name: string;
  class_title: string;
  rarity: "N" | "R" | "SR" | "SSR";
  mbti_type: string;
  description: string;
  image_url: string;
}

export interface UserAnswer {
  questionIndex: number;
  choiceIndex: number;
}

export interface AxisScores {
  E: number;
  I: number;
  S: number;
  N: number;
  T: number;
  F: number;
  J: number;
  P: number;
}

export interface GachaResult {
  character: Character;
  mbtiType: string;
  axisScores: AxisScores;
  axisPercentages: { EI: number; SN: number; TF: number; JP: number };
  isSecret: boolean;
  pullRarity: string;
}

const RARITY_ORDER: Record<string, number> = { N: 0, R: 1, SR: 2, SSR: 3 };

const DROP_RATES: Record<string, Record<string, number>> = {
  N_R: { N: 0.7, R: 0.3 },
  R_SR: { R: 0.75, SR: 0.25 },
  SR_SR: { SR_A: 0.5, SR_B: 0.5 },
};

const EASTER_EGG_REQUIRED = 2;

export function calculateResult(
  answers: UserAnswer[],
  questions: Question[],
  characters: Character[]
): GachaResult {
  const scores: AxisScores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  let easterEggCount = 0;

  for (const answer of answers) {
    const question = questions[answer.questionIndex];
    if (!question) continue;
    const choice = question.choices[answer.choiceIndex];
    if (!choice) continue;

    for (const [axis, weight] of Object.entries(choice.weights)) {
      if (axis in scores) {
        scores[axis as keyof AxisScores] += weight;
      }
    }
    if (choice.isEasterEgg) easterEggCount++;
  }

  // SSR check
  if (easterEggCount >= EASTER_EGG_REQUIRED) {
    const secretChar = characters.find((c) => c.rarity === "SSR");
    if (secretChar) {
      return buildResult(secretChar, "???", scores, true);
    }
  }

  const mbtiType = deriveMBTI(scores);
  const pool = characters.filter((c) => c.mbti_type === mbtiType && c.rarity !== "SSR");

  if (pool.length === 0) {
    return buildResult(findClosestMatch(scores, characters), mbtiType, scores, false);
  }
  if (pool.length === 1) {
    return buildResult(pool[0], mbtiType, scores, false);
  }

  return buildResult(executeGachaPull(pool), mbtiType, scores, false);
}

function deriveMBTI(scores: AxisScores): string {
  return [
    scores.E >= scores.I ? "E" : "I",
    scores.S >= scores.N ? "S" : "N",
    scores.T >= scores.F ? "T" : "F",
    scores.J >= scores.P ? "J" : "P",
  ].join("");
}

function calcAxisPercentages(scores: AxisScores) {
  const pct = (a: number, b: number) => {
    const total = a + b;
    return total === 0 ? 50 : Math.round((a / total) * 100);
  };
  return {
    EI: pct(scores.E, scores.I),
    SN: pct(scores.S, scores.N),
    TF: pct(scores.T, scores.F),
    JP: pct(scores.J, scores.P),
  };
}

function executeGachaPull(pool: Character[]): Character {
  const rarities = [...new Set(pool.map((c) => c.rarity))].sort(
    (a, b) => (RARITY_ORDER[a] ?? 0) - (RARITY_ORDER[b] ?? 0)
  );

  if (rarities.length === 1) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (rarities.length === 2) {
    const key = `${rarities[0]}_${rarities[1]}`;
    const rates = DROP_RATES[key];
    if (rates) {
      const roll = Math.random();
      const lowerRate = rates[rarities[0]] ?? 0.5;
      const selectedRarity = roll < lowerRate ? rarities[0] : rarities[1];
      const candidates = pool.filter((c) => c.rarity === selectedRarity);
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function findClosestMatch(scores: AxisScores, characters: Character[]): Character {
  const targetType = deriveMBTI(scores);
  const nonSecret = characters.filter((c) => c.rarity !== "SSR");
  let bestMatch = nonSecret[0];
  let bestDistance = 4;

  for (const char of nonSecret) {
    let distance = 0;
    for (let i = 0; i < 4; i++) {
      if (char.mbti_type[i] !== targetType[i]) distance++;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = char;
    }
  }
  return bestMatch;
}

function buildResult(
  character: Character,
  mbtiType: string,
  scores: AxisScores,
  isSecret: boolean
): GachaResult {
  return {
    character,
    mbtiType,
    axisScores: scores,
    axisPercentages: calcAxisPercentages(scores),
    isSecret,
    pullRarity: character.rarity,
  };
}
