import { normalizeVocabularyPart } from "./vocabularyParts.js";

const DEFAULT_DECK_ID = "deck-default";

function makeVocabularyId(prefix = "vocab") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeVocabularyDeck(deck) {
  const source = deck && typeof deck === "object" ? deck : {};
  const now = Date.now();
  const name = String(source.name || "기본 단어장").trim();

  return {
    id: source.id || makeVocabularyId("vocab-deck"),
    name: name || "기본 단어장",
    description: String(source.description || "").trim(),
    createdAt: Number(source.createdAt) || now,
    updatedAt: Number(source.updatedAt) || Number(source.createdAt) || now,
  };
}

function normalizeVocabularyWord(word, fallbackDeckId = DEFAULT_DECK_ID) {
  const source = word && typeof word === "object" ? word : {};
  const now = Date.now();
  const front = String(source.front || source.word || "").trim();
  const createdAt = Number(source.createdAt) || now;

  return {
    id: source.id || makeVocabularyId("vocab-word"),
    deckId: source.deckId || fallbackDeckId,
    front,
    meaning: String(source.meaning || source.back || "").trim(),
    example: String(source.example || "").trim(),
    root: String(source.root || "").trim(),
    partOfSpeech: normalizeVocabularyPart(source.partOfSpeech || source.pos || ""),
    memo: String(source.memo || "").trim(),
    status: ["new", "learning", "known"].includes(source.status)
      ? source.status
      : "new",
    nextReview: source.nextReview || new Date(createdAt).toISOString().slice(0, 10),
    interval: Math.max(0, Number(source.interval) || 0),
    easeFactor: Math.max(1.3, Number(source.easeFactor) || 2.5),
    reviewCount: Math.max(0, Number(source.reviewCount) || 0),
    correctCount: Math.max(0, Number(source.correctCount) || 0),
    createdAt,
    updatedAt: Number(source.updatedAt) || createdAt,
    lastReviewedAt: source.lastReviewedAt || "",
  };
}

function normalizeVocabularyTestAnswers(answers) {
  if (!Array.isArray(answers)) return [];
  return answers.map((answer) => ({
    answer: String(answer?.answer || ""),
    checked: answer?.checked === true,
    correct: answer?.correct === true,
  }));
}

export function normalizeVocabularyData(data = {}) {
  const source = data && typeof data === "object" ? data : {};
  const rawDecks = Array.isArray(source.decks) ? source.decks : [];
  const decks = rawDecks.length
    ? rawDecks.map(normalizeVocabularyDeck)
    : [normalizeVocabularyDeck({ id: DEFAULT_DECK_ID, name: "기본 단어장" })];
  const deckIds = new Set(decks.map((deck) => deck.id));
  const fallbackDeckId = decks[0]?.id || DEFAULT_DECK_ID;
  const words = Array.isArray(source.words)
    ? source.words
        .map((word) => normalizeVocabularyWord(word, fallbackDeckId))
        .filter((word) => word.front)
        .map((word) =>
          deckIds.has(word.deckId) ? word : { ...word, deckId: fallbackDeckId },
        )
    : [];

  return {
    version: 1,
    activePanel: ["home", "review", "test", "add", "decks"].includes(source.activePanel)
      ? source.activePanel
      : "home",
    activeDeckId: deckIds.has(source.activeDeckId)
      ? source.activeDeckId
      : fallbackDeckId,
    dailyGoal: Math.max(1, Number(source.dailyGoal) || 12),
    reviewIndex: Math.max(0, Number(source.reviewIndex) || 0),
    testCount: source.testCount === "all" ? "all" : Math.max(1, Number(source.testCount) || 10),
    testMode: ["front_to_meaning", "meaning_to_front"].includes(source.testMode)
      ? source.testMode
      : "front_to_meaning",
    testQueue: Array.isArray(source.testQueue) ? source.testQueue.map(String) : [],
    testIndex: Math.max(0, Number(source.testIndex) || 0),
    testAnswers: normalizeVocabularyTestAnswers(source.testAnswers),
    testFinished: source.testFinished === true,
    draftFront: source.draftFront || "",
    draftMeaning: source.draftMeaning || "",
    draftExample: source.draftExample || "",
    draftRoot: source.draftRoot || "",
    draftPartOfSpeech: normalizeVocabularyPart(source.draftPartOfSpeech || ""),
    words,
    decks,
  };
}
