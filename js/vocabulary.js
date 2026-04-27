import { escapeHtml, makeId } from "./utils.js";
import { normalizeVocabularyData } from "./vocabularyData.js";
import {
  getVocabularyAccuracy,
  getVocabularyReviewLabel,
  getVocabularyStatusClass,
  getVocabularySuggestion,
  getVocabularyTodayKey,
} from "./vocabularyHelpers.js";
import {
  importVocabularyMarkdownForm,
  populateVocabularyMarkdownFileInput,
  renderVocabularyMarkdownImport,
} from "./vocabularyMarkdown.js";
import { deleteVocabularyDeck, renderDeckModal, renderDeckPanel, renameVocabularyDeck, setVocabularyDeckModalOpenClass } from "./vocabularyDeckModal.js";
import { playVocabularyWordAudio } from "./vocabularyAudio.js";
import {
  getEmptyVocabularyDraftExtras,
  getVocabularyDraftExtras,
  getVocabularyExtraFields,
  renderVocabularyAudioButton,
  renderVocabularyExtraFields,
} from "./vocabularyWordDetails.js";
import { renderVocabularyWordRow } from "./vocabularyWordRow.js";
import { inferVocabularyRoot, renderVocabularyRootGroups } from "./vocabularyRoots.js";
import { rateVocabularyReviewWord, renderVocabularyReviewPanel } from "./vocabularyReview.js";
import {
  checkVocabularyTestAnswer,
  nextVocabularyTestItem,
  renderVocabularyTestPanel,
  resetVocabularyTest,
  setVocabularyTestCount,
  setVocabularyTestMode,
  startVocabularyTest,
  updateVocabularyTestAnswer,
} from "./vocabularyTest.js";
import { renderVocabularyPartOptions } from "./vocabularyParts.js";

const PANEL_KEYS = ["home", "review", "test", "add", "decks"];
let deps = {};
let reviewFlipped = false;
let deckModalState = { open: false, deckId: "", page: 0 };
function getData() { return normalizeVocabularyData(deps.getVocabularyData?.()); }
function setData(nextData) { deps.setVocabularyData?.(normalizeVocabularyData(nextData)); }
function getMainMount() { return deps.refs?.vocabularyMount || null; }
function getHomeMount() { return deps.refs?.vocabularyHomeCardMount || null; }
function getDeckModalMount() { return document.getElementById("vocabularyDeckModalMount"); }
function getActiveDeck(data) {
  return data.decks.find((deck) => deck.id === data.activeDeckId) || data.decks[0] || null;
}

function getDeckWords(data, deckId = data.activeDeckId) {
  return data.words.filter((word) => word.deckId === deckId);
}
function getDueWords(data) {
  const today = getVocabularyTodayKey();
  return getDeckWords(data).filter((word) => (word.nextReview || today) <= today);
}

function renderHomeCard(data) {
  const deck = getActiveDeck(data);
  const words = getDeckWords(data);
  const dueWords = getDueWords(data);
  const recent = [...words].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 3);
  return `
    <button class="vocab-open-card" type="button" data-vocab-action="open-vocabulary-page">
      <span class="vocab-open-icon">Aa</span>
      <span class="vocab-open-main">
        <span class="vocab-kicker">Vocabulary</span>
        <strong>단어장</strong>
        <small>${dueWords.length ? `오늘 복습 ${dueWords.length}개` : "오늘 복습할 단어가 없습니다"}</small>
      </span>
      <span class="vocab-open-meta">
        <em>${escapeHtml(deck?.name || "기본 단어장")}</em>
        <b>${words.length}개</b>
      </span>
    </button>
    <div class="vocab-card-preview">
      ${recent.length ? recent.map(renderWordRow).join("") : `<div class="vocab-empty compact">아직 추가한 단어가 없습니다.</div>`}
    </div>
  `;
}

function renderTabs(data) {
  const labels = { home: "홈", review: "복습", test: "테스트", add: "추가", decks: "덱 관리" };
  return `
    <div class="vocab-tabs" role="tablist" aria-label="단어장 화면">
      ${PANEL_KEYS.map((key) => `
        <button
          class="vocab-tab ${data.activePanel === key ? "active" : ""}"
          type="button"
          data-vocab-action="switch-panel"
          data-panel="${key}"
          role="tab"
          aria-selected="${data.activePanel === key ? "true" : "false"}"
        >${labels[key]}</button>
      `).join("")}
    </div>
  `;
}

function renderHomePanel(data) {
  const deck = getActiveDeck(data);
  const words = getDeckWords(data);
  const dueWords = getDueWords(data);
  const progress = dueWords.length ? 0 : words.length ? 100 : 0;
  const recent = [...words].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 4);
  return `
    <div class="vocab-stat-grid">
      <div class="vocab-stat"><strong>${words.length}</strong><span>전체 단어</span></div>
      <div class="vocab-stat accent"><strong>${dueWords.length}</strong><span>오늘 복습</span></div>
      <div class="vocab-stat success"><strong>${getVocabularyAccuracy(words)}%</strong><span>정답률</span></div>
    </div>
    <div class="vocab-goal-box">
      <div class="vocab-card-header">
        <strong>오늘 목표</strong>
        <span class="vocab-badge blue">${escapeHtml(deck?.name || "기본 단어장")}</span>
      </div>
      <p>${dueWords.length ? `${dueWords.length}개 복습 대기` : "오늘 복습할 단어가 없습니다."}</p>
      <div class="vocab-progress"><span style="width: ${progress}%"></span></div>
      <button class="primary-btn vocab-full-btn" type="button" data-vocab-action="start-review">
        ${dueWords.length ? "복습 시작하기" : "단어 추가하기"}
      </button>
    </div>
    <div class="vocab-section-label">어근별 정리</div>
    ${renderVocabularyRootGroups(words, escapeHtml)}
    <div class="vocab-section-label">최근 추가 단어</div>
    <div class="vocab-word-list">
      ${recent.length ? recent.map(renderWordRow).join("") : `<div class="vocab-empty">아직 추가한 단어가 없습니다.</div>`}
    </div>
  `;
}

function renderWordRow(word) {
  return renderVocabularyWordRow(word, { escapeHtml, getStatusClass: getVocabularyStatusClass, getReviewLabel: getVocabularyReviewLabel });
}

function renderAddPanel(data) {
  const suggestion = getVocabularySuggestion(data.draftFront);
  const inferredRoot = data.draftRoot || inferVocabularyRoot(data.draftFront);
  return `
    <form class="vocab-form vocab-add-form" data-vocab-form="word">
      <div class="vocab-form-header vocab-add-header">
        <div>
          <strong>새 단어 추가</strong>
          <small>뜻, 예문, 어근을 채워 복습 카드로 저장합니다.</small>
        </div>
        <span class="vocab-ai-chip">AI 자동완성</span>
      </div>
      <div class="vocab-add-grid">
        <label for="vocabWordInput"><span>단어 / 표현</span>
          <input id="vocabWordInput" name="front" autocomplete="off" value="${escapeHtml(data.draftFront || "")}" placeholder="예: perseverance" />
        </label>
        <label><span>뜻</span>
          <input name="meaning" autocomplete="off" value="${escapeHtml(data.draftMeaning || "")}" placeholder="예: 끈기, 인내" aria-label="단어 뜻" />
        </label>
      </div>
      <label><span>예문</span>
        <textarea name="example" autocomplete="off" placeholder="예문을 입력하세요." aria-label="단어 예문">${escapeHtml(data.draftExample || "")}</textarea>
      </label>
      <div class="vocab-add-grid compact">
        <label><span>품사</span>
          <select name="partOfSpeech" aria-label="단어 품사">
            ${renderVocabularyPartOptions(data.draftPartOfSpeech)}
          </select>
        </label>
        <label><span>어근</span>
          <input name="root" autocomplete="off" value="${escapeHtml(inferredRoot)}" placeholder="예: act, port, spect" aria-label="단어 어근" />
        </label>
      </div>
      ${renderVocabularyExtraFields(data, escapeHtml)}
      <div class="vocab-add-grid compact">
        <label><span>덱 선택</span>
          <select name="deckId" aria-label="덱 선택">
            ${data.decks.map((deck) => `<option value="${escapeHtml(deck.id)}" ${deck.id === data.activeDeckId ? "selected" : ""}>${escapeHtml(deck.name)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${renderSuggestion(suggestion, data.draftFront)}
      <div class="vocab-add-actions">
        <button class="secondary-btn" type="button" data-vocab-action="cancel-word-draft">취소</button>
        <button class="primary-btn" type="submit">단어 저장</button>
      </div>
    </form>
  `;
}

function renderSuggestion(suggestion, draftFront) {
  if (!draftFront) return "";
  if (!suggestion) {
    return `
      <div class="vocab-suggestion muted">
        <span>제안을 찾지 못했습니다.</span>
        <small>뜻과 예문을 직접 입력하면 복습 카드에 그대로 저장됩니다.</small>
      </div>
    `;
  }
  return `
    <div class="vocab-suggestion">
      <span>AI 제안: <strong>${escapeHtml(suggestion.meaning)}</strong></span>
      <small>${escapeHtml(suggestion.example)}</small>
      <button class="secondary-btn" type="button" data-vocab-action="apply-suggestion">제안 적용</button>
    </div>
  `;
}

function renderActivePanel(data) {
  if (data.activePanel === "review") return renderVocabularyReviewPanel(data, getDueWords(data), reviewFlipped);
  if (data.activePanel === "test") return renderVocabularyTestPanel(data, getDeckWords(data));
  if (data.activePanel === "add") return renderAddPanel(data);
  if (data.activePanel === "decks") return renderDeckPanel(data, escapeHtml, renderVocabularyMarkdownImport, getVocabularyTodayKey());
  return renderHomePanel(data);
}

export function renderVocabulary() {
  const data = getData();
  const homeMount = getHomeMount();
  const mainMount = getMainMount();
  const deckModalMount = getDeckModalMount();
  if (homeMount) homeMount.innerHTML = renderHomeCard(data);
  if (deckModalMount) deckModalMount.innerHTML = renderDeckModal(data, deckModalState, escapeHtml);
  bindVocabularyEvents(deckModalMount);
  setVocabularyDeckModalOpenClass(deckModalState.open);
  if (!mainMount) return;
  mainMount.innerHTML = `
    <div class="vocab-header">
      <div>
        <span class="vocab-kicker">Vocabulary</span>
        <h2>단어장</h2>
        <p>오늘 복습할 단어: <strong>${getDueWords(data).length}개</strong></p>
      </div>
      <button class="secondary-btn vocab-close-btn" type="button" data-vocab-action="back-home">홈으로</button>
    </div>
    ${renderTabs(data)}
    <div class="vocab-panel">${renderActivePanel(data)}</div>
  `;
}

function switchPanel(panel) {
  if (!PANEL_KEYS.includes(panel)) return;
  const data = getData();
  reviewFlipped = false;
  setData({ ...data, activePanel: panel, reviewIndex: 0 });
  deps.queueSavePlannerData?.();
  renderVocabulary();
}

function startReview() {
  switchPanel(getDueWords(getData()).length ? "review" : "add");
}

function saveWord(form) {
  const data = getData();
  const elements = form.elements;
  const front = elements.front.value.trim();
  if (!front) {
    elements.front.focus();
    return;
  }
  const now = Date.now();
  const word = {
    id: makeId(),
    deckId: elements.deckId.value || data.activeDeckId,
    front,
    meaning: elements.meaning.value.trim(),
    example: elements.example.value.trim(),
    ...getVocabularyExtraFields(elements),
    root: elements.root.value.trim() || inferVocabularyRoot(front),
    partOfSpeech: elements.partOfSpeech.value,
    memo: "",
    status: "new",
    nextReview: getVocabularyTodayKey(),
    interval: 0,
    easeFactor: 2.5,
    reviewCount: 0,
    correctCount: 0,
    createdAt: now,
    updatedAt: now,
    lastReviewedAt: "",
  };
  setData({
    ...data,
    activeDeckId: word.deckId,
    activePanel: "home",
    words: [word, ...data.words],
    draftFront: "",
    draftMeaning: "",
    draftExample: "",
    draftRoot: "",
    draftPartOfSpeech: "",
    ...getEmptyVocabularyDraftExtras(),
  });
  deps.queueSavePlannerData?.();
  renderVocabulary();
}

function saveDeck(form) {
  const data = getData();
  const name = form.elements.deckName.value.trim();
  if (!name) return;
  const now = Date.now();
  const deck = { id: makeId(), name, description: "", createdAt: now, updatedAt: now };
  setData({ ...data, decks: [...data.decks, deck], activeDeckId: deck.id });
  deps.queueSavePlannerData?.();
  renderVocabulary();
}

function applySuggestion() {
  const data = getData();
  const suggestion = getVocabularySuggestion(data.draftFront);
  if (!suggestion) return;
  setData({ ...data, draftMeaning: suggestion.meaning, draftExample: suggestion.example });
  renderVocabulary();
}

function cancelWordDraft() {
  const data = getData();
  setData({
    ...data,
    activePanel: "home",
    draftFront: "",
    draftMeaning: "",
    draftExample: "",
    draftRoot: "",
    draftPartOfSpeech: "",
    ...getEmptyVocabularyDraftExtras(),
  });
  deps.queueSavePlannerData?.();
  renderVocabulary();
}

function updateDraft(form) {
  const data = getData();
  const elements = form.elements;
  setData({
    ...data,
    draftFront: elements.front?.value || "",
    draftMeaning: elements.meaning?.value || "",
    draftExample: elements.example?.value || "",
    draftRoot: elements.root?.value || "",
    draftPartOfSpeech: elements.partOfSpeech?.value || "",
    ...getVocabularyDraftExtras(elements),
  });
}

function isInsideVocabulary(eventTarget) {
  return getHomeMount()?.contains(eventTarget) || getMainMount()?.contains(eventTarget) || getDeckModalMount()?.contains(eventTarget);
}

function saveAndRender(nextData, shouldSave = true) {
  setData(nextData);
  if (shouldSave) deps.queueSavePlannerData?.();
  renderVocabulary();
}

function openDeckModal(deckId) {
  const data = getData();
  const nextDeckId = deckId || data.activeDeckId;
  deckModalState = { open: true, deckId: nextDeckId, page: 0 };
  saveAndRender({ ...data, activeDeckId: nextDeckId });
}

function closeDeckModal() { deckModalState = { open: false, deckId: "", page: 0 }; setVocabularyDeckModalOpenClass(false); renderVocabulary(); }

function moveDeckModalPage(direction) {
  deckModalState = { ...deckModalState, page: Math.max(0, (deckModalState.page || 0) + direction) };
  renderVocabulary();
}

function editDeck(deckId) {
  const data = getData();
  const deck = data.decks.find((item) => item.id === deckId);
  if (!deck) return;
  const nextName = window.prompt("덱 이름을 입력하세요.", deck.name);
  if (nextName === null) return;
  saveAndRender(renameVocabularyDeck(data, deck.id, nextName));
}

function deleteDeck(deckId) {
  const data = getData();
  const deck = data.decks.find((item) => item.id === deckId);
  if (!deck) return;
  if (data.decks.length <= 1) {
    window.alert("기본 단어장은 마지막 덱이라 삭제할 수 없습니다.");
    return;
  }
  const words = getDeckWords(data, deck.id);
  const ok = window.confirm(`"${deck.name}" 덱과 포함된 단어 ${words.length}개를 삭제할까요?`);
  if (!ok) return;
  const nextData = deleteVocabularyDeck(data, deck.id);
  if (deckModalState.deckId === deck.id) deckModalState = { open: false, deckId: "", page: 0 };
  saveAndRender(nextData);
}

function handleTestAction(action, target) {
  const data = getData();
  const words = getDeckWords(data);
  if (action === "set-test-count") return saveAndRender(setVocabularyTestCount(data, target.dataset.count), false);
  if (action === "set-test-mode") return saveAndRender(setVocabularyTestMode(data, target.dataset.mode), false);
  if (action === "start-vocab-test") return saveAndRender(startVocabularyTest(data, words), false);
  if (action === "check-vocab-test") return saveAndRender(checkVocabularyTestAnswer(data, words), false);
  if (action === "next-vocab-test") return saveAndRender(nextVocabularyTestItem(data, words), false);
  if (action === "reset-vocab-test") return saveAndRender(resetVocabularyTest(data), false);
  return null;
}

function handleClick(event) {
  const target = event.target.closest("[data-vocab-action]");
  if (!target || !isInsideVocabulary(target)) return;
  const action = target.dataset.vocabAction;
  if (action === "close-deck-modal" && event.target.closest("[data-vocab-modal-panel]") && !event.target.closest(".popup-close-btn")) {
    return;
  }
  if (action === "open-vocabulary-page") return deps.openVocabularyPage?.();
  if (action === "back-home") return deps.openHomePage?.();
  if (action === "switch-panel") return switchPanel(target.dataset.panel || "home");
  if (action === "start-review") return startReview();
  if (action === "flip-card") {
    reviewFlipped = !reviewFlipped;
    return renderVocabulary();
  }
  if (action === "rate-word") {
    reviewFlipped = false;
    return saveAndRender(rateVocabularyReviewWord(getData(), getDueWords(getData()), target.dataset.rating || "good"));
  }
  if (action === "open-deck-modal") return openDeckModal(target.dataset.id);
  if (action === "close-deck-modal") return closeDeckModal();
  if (action === "deck-modal-prev") return moveDeckModalPage(-1);
  if (action === "deck-modal-next") return moveDeckModalPage(1);
  if (action === "edit-deck") return editDeck(target.dataset.id);
  if (action === "delete-deck") return deleteDeck(target.dataset.id);
  if (action === "play-word-audio") return playVocabularyWordAudio(getData().words.find((word) => word.id === target.dataset.id));
  if (action === "apply-suggestion") return applySuggestion();
  if (action === "cancel-word-draft") return cancelWordDraft();
  return handleTestAction(action, target);
}

function handleSubmit(event) {
  const form = event.target.closest("[data-vocab-form]");
  if (!form || !isInsideVocabulary(form)) return;
  event.preventDefault();
  if (form.dataset.vocabForm === "word") saveWord(form);
  if (form.dataset.vocabForm === "deck") saveDeck(form);
  if (form.dataset.vocabForm === "markdown") {
    importVocabularyMarkdownForm({
      form,
      data: getData(),
      setData,
      makeId,
      todayKey: getVocabularyTodayKey(),
      queueSave: deps.queueSavePlannerData,
      render: renderVocabulary,
    });
  }
}

function handleInput(event) {
  const wordForm = event.target.closest('[data-vocab-form="word"]');
  if (wordForm && isInsideVocabulary(wordForm)) {
    updateDraft(wordForm);
    if (event.target.name === "front") {
      renderVocabulary();
      requestAnimationFrame(() => restoreWordInputFocus());
    }
    return;
  }
  if (event.target.name === "testAnswer" && isInsideVocabulary(event.target)) {
    setData(updateVocabularyTestAnswer(getData(), event.target.value || ""));
  }
}

function restoreWordInputFocus() {
  const input = document.getElementById("vocabWordInput");
  input?.focus();
  const length = input?.value?.length || 0;
  input?.setSelectionRange?.(length, length);
}

function handleChange(event) {
  const input = event.target.closest('input[name="markdownFile"]');
  if (!input || !isInsideVocabulary(input)) return;
  populateVocabularyMarkdownFileInput(input);
}

function bindVocabularyEvents(mount) {
  if (!mount || mount.dataset.vocabBound === "true") return;
  mount.dataset.vocabBound = "true";
  mount.addEventListener("click", handleClick);
  mount.addEventListener("submit", handleSubmit);
  mount.addEventListener("input", handleInput);
  mount.addEventListener("change", handleChange);
}

export function configureVocabularyModule(options = {}) {
  deps = options;
  bindVocabularyEvents(getHomeMount());
  bindVocabularyEvents(getMainMount());
}

export { normalizeVocabularyData };
