import { formatDateKey } from "./utils.js";

export function getVocabularyTodayKey() {
  return formatDateKey(new Date());
}

export function addVocabularyDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00`);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

export function getVocabularyAccuracy(words) {
  const totalReviews = words.reduce((sum, word) => sum + word.reviewCount, 0);
  const correct = words.reduce((sum, word) => sum + word.correctCount, 0);
  if (!totalReviews) return 0;
  return Math.round((correct / totalReviews) * 100);
}

export function getVocabularyStatusClass(word) {
  if (word.status === "known") return "known";
  if (word.status === "learning") return "learning";
  return "new";
}

export function getVocabularyReviewLabel(word) {
  if (word.status === "known") return "완벽";
  if (word.status === "learning") return "학습 중";
  return "신규";
}

const vocabularySuggestions = {
  hello: {
    meaning: "안녕하세요, 여보세요",
    example: "She smiled and said hello to everyone in the room.",
  },
  goodbye: {
    meaning: "작별 인사, 안녕히 가세요",
    example: "He waved goodbye before getting on the train.",
  },
  apple: {
    meaning: "사과",
    example: "I packed an apple for a quick snack.",
  },
  book: {
    meaning: "책, 예약하다",
    example: "This book explains the topic in simple language.",
  },
  study: {
    meaning: "공부하다, 연구하다",
    example: "I study vocabulary for twenty minutes every morning.",
  },
  schedule: {
    meaning: "일정, 일정을 잡다",
    example: "Please check your schedule before the meeting.",
  },
  budget: {
    meaning: "예산, 예산을 세우다",
    example: "The team created a budget for the new project.",
  },
  goal: {
    meaning: "목표",
    example: "Her goal is to read one English article every day.",
  },
  improve: {
    meaning: "개선하다, 향상시키다",
    example: "Regular practice can improve your speaking skills.",
  },
  review: {
    meaning: "복습하다, 검토하다",
    example: "Let's review the words we learned yesterday.",
  },
  practice: {
    meaning: "연습, 연습하다",
    example: "Daily practice makes difficult words feel familiar.",
  },
  remember: {
    meaning: "기억하다",
    example: "I remember the meaning because I used it in a sentence.",
  },
  perseverance: {
    meaning: "끈기, 인내",
    example: "Her perseverance helped her finish the project.",
  },
  serendipity: {
    meaning: "뜻밖의 행운",
    example: "A serendipitous encounter changed everything.",
  },
  ephemeral: {
    meaning: "순간적인, 오래가지 않는",
    example: "The moment felt beautiful but ephemeral.",
  },
  ubiquitous: {
    meaning: "어디에나 있는",
    example: "Smartphones are ubiquitous in modern life.",
  },
};

function normalizeSuggestionKey(front) {
  return String(front || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ");
}

export function getVocabularySuggestion(front) {
  const key = normalizeSuggestionKey(front);
  if (!key) return null;
  return vocabularySuggestions[key] || null;
}
