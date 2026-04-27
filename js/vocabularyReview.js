import { escapeHtml } from "./utils.js";
import { addVocabularyDays, getVocabularyTodayKey } from "./vocabularyHelpers.js";
import { renderVocabularyPartBadge } from "./vocabularyParts.js";

function advanceVocabularyReview(data) {
  return { ...data, reviewIndex: data.reviewIndex + 1 };
}

export function renderVocabularyReviewPanel(data, dueWords, reviewFlipped) {
  const index = dueWords.length ? data.reviewIndex % dueWords.length : 0;
  const word = dueWords[index];

  if (!word) {
    return `
      <div class="vocab-empty review">
        <strong>오늘 복습할 단어가 없습니다.</strong>
        <span>새 단어를 추가하거나 다른 덱을 선택해보세요.</span>
      </div>
    `;
  }

  return `
    <div class="vocab-review-count">${index + 1} / ${dueWords.length}</div>
    <button class="vocab-flip-wrap" type="button" data-vocab-action="flip-card" aria-label="단어 카드 뒤집기">
      <span class="vocab-flip-card ${reviewFlipped ? "flipped" : ""}">
        <span class="vocab-flip-face front">
          <small>카드를 눌러 뜻 보기</small>
          <strong>${escapeHtml(word.front)}</strong>
          ${renderVocabularyPartBadge(word, escapeHtml)}
          <small>뜻을 확인한 뒤 기억 정도를 선택하세요.</small>
        </span>
        <span class="vocab-flip-face back">
          <strong>${escapeHtml(word.meaning || "뜻 없음")}</strong>
          ${renderVocabularyPartBadge(word, escapeHtml)}
          <small>${escapeHtml(word.example || "예문 없음")}</small>
        </span>
      </span>
    </button>
    <div class="vocab-rating-row">
      <button class="secondary-btn" type="button" data-vocab-action="rate-word" data-rating="again">다시</button>
      <button class="secondary-btn" type="button" data-vocab-action="rate-word" data-rating="good">애매</button>
      <button class="primary-btn" type="button" data-vocab-action="rate-word" data-rating="easy">완벽</button>
    </div>
  `;
}

export function rateVocabularyReviewWord(data, dueWords, rating) {
  const word = dueWords[data.reviewIndex % Math.max(1, dueWords.length)];
  if (!word) return data;

  const currentInterval = Math.max(0, Number(word.interval) || 0);
  const currentEase = Math.max(1.3, Number(word.easeFactor) || 2.5);
  const next =
    rating === "again"
      ? { interval: 1, easeFactor: Math.max(1.3, currentEase - 0.2), status: "learning", correct: 0 }
      : rating === "easy"
        ? {
            interval: Math.max(4, Math.round(Math.max(1, currentInterval) * (currentEase + 0.25) * 1.5)),
            easeFactor: currentEase + 0.15,
            status: "known",
            correct: 1,
          }
        : {
            interval: Math.max(1, Math.round(Math.max(1, currentInterval) * currentEase)),
            easeFactor: currentEase,
            status: "learning",
            correct: 1,
          };

  return {
    ...advanceVocabularyReview(data),
    words: data.words.map((item) =>
      item.id === word.id
        ? {
            ...item,
            status: next.status,
            interval: next.interval,
            easeFactor: next.easeFactor,
            nextReview: addVocabularyDays(getVocabularyTodayKey(), next.interval),
            reviewCount: item.reviewCount + 1,
            correctCount: item.correctCount + next.correct,
            lastReviewedAt: getVocabularyTodayKey(),
            updatedAt: Date.now(),
          }
        : item,
    ),
  };
}
