import { escapeHtml } from "./utils.js";
import { renderVocabularyPartBadge } from "./vocabularyParts.js";

const TEST_COUNTS = [10, 20, 30];

function normalizeAnswer(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function getExpectedAnswers(word, mode) {
  const source = mode === "meaning_to_front" ? word.front : word.meaning;
  return String(source || "")
    .split(/[,/;|·]| 또는 | 혹은 |,|\n/)
    .map(normalizeAnswer)
    .filter(Boolean);
}

function isAnswerCorrect(word, mode, answer) {
  const value = normalizeAnswer(answer);
  if (!value) return false;
  return getExpectedAnswers(word, mode).some((expected) => expected === value);
}

function shuffleWords(words) {
  return [...words]
    .map((word) => ({ word, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.word);
}

function getCurrentWord(data, words) {
  const id = data.testQueue[data.testIndex] || "";
  return words.find((word) => word.id === id) || null;
}

function getPrompt(word, mode) {
  if (mode === "meaning_to_front") {
    return {
      label: "뜻을 보고 단어를 입력하세요.",
      prompt: word.meaning || "뜻 없음",
      answerLabel: "정답 단어",
      answer: word.front,
      placeholder: "단어 입력",
    };
  }
  return {
    label: "단어를 보고 뜻을 입력하세요.",
    prompt: word.front,
    answerLabel: "정답 뜻",
    answer: word.meaning || "뜻 없음",
    placeholder: "뜻 입력",
  };
}

export function renderVocabularyTestPanel(data, words) {
  const currentWord = getCurrentWord(data, words);
  const total = data.testQueue.length;
  const currentAnswer = data.testAnswers[data.testIndex] || {};
  const count = data.testCount === "all" ? "all" : Number(data.testCount) || 10;
  const mode = data.testMode === "meaning_to_front" ? "meaning_to_front" : "front_to_meaning";

  if (!data.testQueue.length || !currentWord) {
    return `
      <div class="vocab-test-setup">
        <div>
          <strong>단어장 테스트</strong>
          <small>랜덤 단어를 골라 정답을 직접 입력합니다.</small>
        </div>
        <div class="vocab-test-mode-row" role="group" aria-label="테스트 방향">
          <button class="${mode === "front_to_meaning" ? "active" : ""}" type="button" data-vocab-action="set-test-mode" data-mode="front_to_meaning">단어 → 뜻</button>
          <button class="${mode === "meaning_to_front" ? "active" : ""}" type="button" data-vocab-action="set-test-mode" data-mode="meaning_to_front">뜻 → 단어</button>
        </div>
        <div class="vocab-test-count-row" role="group" aria-label="테스트 단어 수">
          ${TEST_COUNTS.map((item) => `
            <button class="${count === item ? "active" : ""}" type="button" data-vocab-action="set-test-count" data-count="${item}">${item}개</button>
          `).join("")}
          <button class="${count === "all" ? "active" : ""}" type="button" data-vocab-action="set-test-count" data-count="all">전체</button>
        </div>
        <button class="primary-btn vocab-full-btn" type="button" data-vocab-action="start-vocab-test" ${words.length ? "" : "disabled"}>테스트 시작</button>
        ${words.length ? "" : `<div class="vocab-empty compact">테스트할 단어가 없습니다.</div>`}
      </div>
    `;
  }

  if (data.testFinished) return renderTestResult(data, words);

  const prompt = getPrompt(currentWord, mode);
  const checked = currentAnswer.checked === true;
  const correct = checked && currentAnswer.correct === true;

  return `
    <div class="vocab-test-card">
      <div class="vocab-test-topline">
        <span>${data.testIndex + 1} / ${total}</span>
        <button class="secondary-btn compact" type="button" data-vocab-action="reset-vocab-test">테스트 종료</button>
      </div>
      <div class="vocab-test-prompt">
        <small>${escapeHtml(prompt.label)}</small>
        <strong>${escapeHtml(prompt.prompt)}</strong>
        ${renderVocabularyPartBadge(currentWord, escapeHtml)}
      </div>
      <label class="vocab-test-answer">
        <span>내 답</span>
        <input
          name="testAnswer"
          autocomplete="off"
          value="${escapeHtml(currentAnswer.answer || "")}"
          placeholder="${escapeHtml(prompt.placeholder)}"
        />
      </label>
      ${checked ? `
        <div class="vocab-review-result ${correct ? "correct" : "wrong"}">
          <strong>${correct ? "정답입니다." : "다시 확인해보세요."}</strong>
          <span>${prompt.answerLabel}: ${escapeHtml(prompt.answer)}</span>
          ${renderVocabularyPartBadge(currentWord, escapeHtml)}
          ${currentWord.example ? `<small>${escapeHtml(currentWord.example)}</small>` : ""}
        </div>
      ` : ""}
      <div class="vocab-test-actions">
        <button class="secondary-btn" type="button" data-vocab-action="check-vocab-test">정답 확인</button>
        <button class="primary-btn" type="button" data-vocab-action="next-vocab-test">${data.testIndex + 1 >= total ? "결과 보기" : "다음 단어"}</button>
      </div>
    </div>
  `;
}

function renderTestResult(data, words) {
  const total = data.testQueue.length;
  const correctCount = data.testAnswers.filter((answer) => answer.correct).length;
  const rows = data.testQueue.map((id, index) => {
    const word = words.find((item) => item.id === id);
    const answer = data.testAnswers[index] || {};
    if (!word) return "";
    return `
      <div class="vocab-test-result-row">
        <span>
          <strong>${escapeHtml(word.front)}</strong>
          ${renderVocabularyPartBadge(word, escapeHtml)}
          <small>${escapeHtml(word.meaning || "뜻 없음")}</small>
        </span>
        <em class="${answer.correct ? "correct" : "wrong"}">${answer.correct ? "정답" : "오답"}</em>
      </div>
    `;
  }).join("");
  return `
    <div class="vocab-test-result">
      <strong>테스트 결과</strong>
      <p>${total}개 중 ${correctCount}개 정답</p>
      <div class="vocab-test-result-list">${rows}</div>
      <button class="primary-btn vocab-full-btn" type="button" data-vocab-action="reset-vocab-test">다시 선택하기</button>
    </div>
  `;
}

export function startVocabularyTest(data, words) {
  const limit = data.testCount === "all"
    ? words.length
    : Math.min(Number(data.testCount) || 10, words.length);
  const queue = shuffleWords(words).slice(0, Math.max(0, limit)).map((word) => word.id);
  return {
    ...data,
    testQueue: queue,
    testIndex: 0,
    testAnswers: queue.map(() => ({ answer: "", checked: false, correct: false })),
    testFinished: false,
  };
}

export function setVocabularyTestCount(data, count) {
  return { ...data, testCount: count === "all" ? "all" : Number(count) || 10 };
}

export function setVocabularyTestMode(data, mode) {
  const testMode = mode === "meaning_to_front" ? "meaning_to_front" : "front_to_meaning";
  return { ...data, testMode, testQueue: [], testIndex: 0, testAnswers: [], testFinished: false };
}

export function updateVocabularyTestAnswer(data, value) {
  const answers = [...data.testAnswers];
  answers[data.testIndex] = {
    ...(answers[data.testIndex] || {}),
    answer: value,
    checked: false,
    correct: false,
  };
  return { ...data, testAnswers: answers };
}

export function checkVocabularyTestAnswer(data, words) {
  const word = getCurrentWord(data, words);
  if (!word) return data;
  const answers = [...data.testAnswers];
  const current = answers[data.testIndex] || {};
  answers[data.testIndex] = {
    ...current,
    checked: true,
    correct: isAnswerCorrect(word, data.testMode, current.answer),
  };
  return { ...data, testAnswers: answers };
}

export function nextVocabularyTestItem(data, words) {
  const checkedData = data.testAnswers[data.testIndex]?.checked
    ? data
    : checkVocabularyTestAnswer(data, words);
  if (checkedData.testIndex + 1 >= checkedData.testQueue.length) {
    return { ...checkedData, testFinished: true };
  }
  return { ...checkedData, testIndex: checkedData.testIndex + 1 };
}

export function resetVocabularyTest(data) {
  return { ...data, testQueue: [], testIndex: 0, testAnswers: [], testFinished: false };
}
