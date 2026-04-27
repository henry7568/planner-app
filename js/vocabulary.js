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
import { renderVocabularyPartBadge, renderVocabularyPartOptions } from "./vocabularyParts.js";

const PANEL_KEYS = ["home", "review", "test", "add", "decks"];
let deps = {};
let reviewFlipped = false;

function getData() { return normalizeVocabularyData(deps.getVocabularyData?.()); }
function setData(nextData) { deps.setVocabularyData?.(normalizeVocabularyData(nextData)); }
function getMainMount() { return deps.refs?.vocabularyMount || null; }
function getHomeMount() { return deps.refs?.vocabularyHomeCardMount || null; }

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
  return `
    <div class="vocab-word-row">
      <span>
        <strong>${escapeHtml(word.front)}</strong>
        ${renderVocabularyPartBadge(word, escapeHtml)}
        <small>${escapeHtml(word.meaning || "뜻 없음")}</small>
      </span>
      <span class="vocab-word-right">
        <i class="vocab-dot ${getVocabularyStatusClass(word)}"></i>
        <em>${getVocabularyReviewLabel(word)}</em>
      </span>
    </div>
  `;
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

function renderDeckPanel(data) {
  return `
    <div class="vocab-deck-grid">
      ${data.decks.map((deck) => renderDeckCard(data, deck)).join("")}
    </div>
    <form class="vocab-deck-form" data-vocab-form="deck">
      <label><span>덱 이름</span>
        <input name="deckName" autocomplete="off" placeholder="예: TOEIC 빈출" />
      </label>
      <button class="secondary-btn" type="submit">덱 추가</button>
    </form>
    ${renderVocabularyMarkdownImport(data, escapeHtml)}
  `;
}

function renderDeckCard(data, deck) {
  const words = getDeckWords(data, deck.id);
  const dueCount = words.filter((word) => word.nextReview <= getVocabularyTodayKey()).length;
  const progress = words.length
    ? Math.round((words.filter((word) => word.status === "known").length / words.length) * 100)
    : 0;
  return `
    <button class="vocab-deck-card ${deck.id === data.activeDeckId ? "active" : ""}" type="button" data-vocab-action="select-deck" data-id="${escapeHtml(deck.id)}">
      <strong>${escapeHtml(deck.name)}</strong>
      <span>${words.length}개 · 오늘 ${dueCount}개 복습</span>
      <i><b style="width:${progress}%"></b></i>
    </button>
  `;
}

function renderActivePanel(data) {
  if (data.activePanel === "review") return renderVocabularyReviewPanel(data, getDueWords(data), reviewFlipped);
  if (data.activePanel === "test") return renderVocabularyTestPanel(data, getDeckWords(data));
  if (data.activePanel === "add") return renderAddPanel(data);
  if (data.activePanel === "decks") return renderDeckPanel(data);
  return renderHomePanel(data);
}

export function renderVocabulary() {
  const data = getData();
  const homeMount = getHomeMount();
  const mainMount = getMainMount();
  if (homeMount) homeMount.innerHTML = renderHomeCard(data);
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
  });
}

function isInsideVocabulary(eventTarget) {
  return getHomeMount()?.contains(eventTarget) || getMainMount()?.contains(eventTarget);
}

function saveAndRender(nextData, shouldSave = true) {
  setData(nextData);
  if (shouldSave) deps.queueSavePlannerData?.();
  renderVocabulary();
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
  if (action === "select-deck") {
    const data = getData();
    return saveAndRender({ ...data, activeDeckId: target.dataset.id || data.activeDeckId });
  }
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
