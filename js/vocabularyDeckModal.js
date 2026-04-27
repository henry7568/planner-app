import { renderVocabularyPartBadge } from "./vocabularyParts.js";
import { renderVocabularyAudioButton, renderVocabularyWordDetails } from "./vocabularyWordDetails.js";

const WORDS_PER_PAGE = 5;
const DEFAULT_DECK_ID = "deck-default";

function getDeckWords(data, deckId) {
  return data.words.filter((word) => word.deckId === deckId);
}

function getDeckById(data, deckId) {
  return data.decks.find((deck) => deck.id === deckId) || data.decks[0] || null;
}

function renderDeckProgress(words) {
  if (!words.length) return 0;
  return Math.round((words.filter((word) => word.status === "known").length / words.length) * 100);
}

function isDefaultVocabularyDeck(deck) {
  return deck?.id === DEFAULT_DECK_ID || deck?.name === "기본 단어장";
}

function renderDeckCard(data, deck, escapeHtml, todayKey) {
  const words = getDeckWords(data, deck.id);
  const dueCount = words.filter((word) => (word.nextReview || todayKey) <= todayKey).length;
  const progress = renderDeckProgress(words);
  return `
    <div class="vocab-deck-card-wrap">
      <button class="vocab-deck-card ${deck.id === data.activeDeckId ? "active" : ""}" type="button" data-vocab-action="open-deck-modal" data-id="${escapeHtml(deck.id)}">
        <strong>${escapeHtml(deck.name)}</strong>
        <span>${words.length}개 · 오늘 ${dueCount}개 복습</span>
        <i><b style="width:${progress}%"></b></i>
      </button>
      ${isDefaultVocabularyDeck(deck) ? "" : `
        <div class="vocab-deck-actions">
          <button class="secondary-btn" type="button" data-vocab-action="edit-deck" data-id="${escapeHtml(deck.id)}">덱 수정</button>
          <button class="delete-btn" type="button" data-vocab-action="delete-deck" data-id="${escapeHtml(deck.id)}">덱 삭제</button>
        </div>
      `}
    </div>
  `;
}

export function renderDeckPanel(data, escapeHtml, renderMarkdownImport, todayKey) {
  return `
    <div class="vocab-deck-grid">
      ${data.decks.map((deck) => renderDeckCard(data, deck, escapeHtml, todayKey)).join("")}
    </div>
    <form class="vocab-deck-form" data-vocab-form="deck">
      <label><span>덱 이름</span>
        <input name="deckName" autocomplete="off" placeholder="예: TOEIC 빈출" />
      </label>
      <button class="secondary-btn" type="submit">덱 추가</button>
    </form>
    ${renderMarkdownImport(data, escapeHtml)}
  `;
}

function renderModalWordRow(word, escapeHtml) {
  return `
    <div class="vocab-modal-word-row">
      <div>
        <strong>${escapeHtml(word.front)}</strong>
        ${renderVocabularyAudioButton(word, escapeHtml)}
        ${renderVocabularyPartBadge(word, escapeHtml)}
        <small>${escapeHtml(word.meaning || "뜻 없음")}</small>
      </div>
      <em>${escapeHtml(word.example || "예문 없음")}</em>
      ${renderVocabularyWordDetails(word, escapeHtml)}
    </div>
  `;
}

export function renderDeckModal(data, modalState, escapeHtml) {
  if (!modalState.open) return "";
  const deck = getDeckById(data, modalState.deckId);
  if (!deck) return "";
  const words = getDeckWords(data, deck.id);
  const pageCount = Math.max(1, Math.ceil(words.length / WORDS_PER_PAGE));
  const page = Math.min(Math.max(0, modalState.page || 0), pageCount - 1);
  const pageWords = words.slice(page * WORDS_PER_PAGE, page * WORDS_PER_PAGE + WORDS_PER_PAGE);
  return `
    <div class="popup-overlay vocab-deck-modal-overlay" data-vocab-action="close-deck-modal">
      <section class="popup-panel vocab-deck-modal-panel" role="dialog" aria-modal="true" aria-labelledby="vocabDeckModalTitle" data-vocab-modal-panel>
        <div class="popup-header">
          <div>
            <div id="vocabDeckModalTitle" class="popup-title">${escapeHtml(deck.name)}</div>
            <div class="popup-subtext">단어 ${words.length}개 · ${page + 1}/${pageCount} 페이지</div>
          </div>
          <button class="popup-close-btn" type="button" aria-label="덱 팝업 닫기" data-vocab-action="close-deck-modal">×</button>
        </div>
        <div class="vocab-modal-word-list">
          ${pageWords.length ? pageWords.map((word) => renderModalWordRow(word, escapeHtml)).join("") : `<div class="vocab-empty">이 덱에 단어가 없습니다.</div>`}
        </div>
        <div class="vocab-modal-pager">
          <button class="secondary-btn" type="button" data-vocab-action="deck-modal-prev" ${page <= 0 ? "disabled" : ""}>이전 5개</button>
          <span>${page + 1} / ${pageCount}</span>
          <button class="secondary-btn" type="button" data-vocab-action="deck-modal-next" ${page >= pageCount - 1 ? "disabled" : ""}>다음 5개</button>
        </div>
        <div class="vocab-modal-actions">
          <button class="secondary-btn" type="button" data-vocab-action="edit-deck" data-id="${escapeHtml(deck.id)}">덱 수정</button>
          <button class="delete-btn" type="button" data-vocab-action="delete-deck" data-id="${escapeHtml(deck.id)}">덱 삭제</button>
        </div>
      </section>
    </div>
  `;
}

export function setVocabularyDeckModalOpenClass(isOpen) {
  ["modal-open", "vocab-modal-open"].forEach((className) => {
    document.documentElement.classList.toggle(className, isOpen);
    document.body?.classList.toggle(className, isOpen);
  });
}

export function renameVocabularyDeck(data, deckId, nextName) {
  const name = String(nextName || "").trim();
  if (!name) return data;
  return {
    ...data,
    decks: data.decks.map((deck) =>
      deck.id === deckId ? { ...deck, name, updatedAt: Date.now() } : deck,
    ),
  };
}

export function deleteVocabularyDeck(data, deckId) {
  if (data.decks.length <= 1) return data;
  const nextDecks = data.decks.filter((deck) => deck.id !== deckId);
  const fallbackDeckId = nextDecks[0]?.id || data.activeDeckId;
  return {
    ...data,
    decks: nextDecks,
    words: data.words.filter((word) => word.deckId !== deckId),
    activeDeckId: data.activeDeckId === deckId ? fallbackDeckId : data.activeDeckId,
  };
}
