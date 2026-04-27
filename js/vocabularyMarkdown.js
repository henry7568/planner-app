import { inferVocabularyRoot } from "./vocabularyRoots.js";
import { extractVocabularyPartFromFront, normalizeVocabularyPart } from "./vocabularyParts.js";
import { normalizeVocabularyList } from "./vocabularyWordDetails.js";

function cleanMarkdownValue(value) {
  return String(value || "")
    .replace(/^[-*]\s*/, "")
    .replace(/^예문\s*[:：]\s*/i, "")
    .replace(/^example\s*[:：]\s*/i, "")
    .trim();
}

function parseBulletLine(line) {
  const text = cleanMarkdownValue(line);
  if (!text) return null;

  if (text.includes("|")) {
    const [rawFront, second, third, ...rest] = text
      .split("|")
      .map((part) => part.trim());
    const frontInfo = extractVocabularyPartFromFront(rawFront);
    const explicitPart = normalizeVocabularyPart(second);
    const front = frontInfo.front;
    const meaning = explicitPart ? third : second;
    const exampleParts = explicitPart ? rest : [third, ...rest];
    if (!front || !meaning) return null;
    return {
      front,
      meaning,
      example: exampleParts.filter(Boolean).join(" | ").trim(),
      exampleMeaning: "",
      partOfSpeech: explicitPart || frontInfo.partOfSpeech,
      pronunciation: "",
      synonyms: [],
      antonyms: [],
      phrasalVerb: "",
      phrasalVerbMeaning: "",
      audioUrl: "",
    };
  }

  const colonMatch = text.match(/^([^:：]+)[:：]\s*(.+)$/);
  if (!colonMatch) return null;
  const frontInfo = extractVocabularyPartFromFront(colonMatch[1]);
  return {
    front: frontInfo.front,
    meaning: colonMatch[2].trim(),
    example: "",
    exampleMeaning: "",
    partOfSpeech: frontInfo.partOfSpeech,
    pronunciation: "",
    synonyms: [],
    antonyms: [],
    phrasalVerb: "",
    phrasalVerbMeaning: "",
    audioUrl: "",
  };
}

function parseExampleLine(value) {
  const [example, exampleMeaning = ""] = String(value || "").split(/\s+\/\s+(?:example\s*[:：]\s*)?/i);
  return {
    example: cleanMarkdownValue(example),
    exampleMeaning: cleanMarkdownValue(exampleMeaning),
  };
}

function parsePhrasalVerb(value) {
  const match = String(value || "").trim().match(/^(.+?)\s*\((.+)\)\s*$/);
  return match
    ? { phrasalVerb: match[1].trim(), phrasalVerbMeaning: match[2].trim() }
    : { phrasalVerb: String(value || "").trim(), phrasalVerbMeaning: "" };
}

export function parseVocabularyMarkdown(text) {
  const lines = String(text || "").split(/\r?\n/);
  const result = { deckName: "", words: [] };
  let currentWord = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading && !result.deckName) {
      result.deckName = heading[1].trim();
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      const parsed = parseBulletLine(line);
      if (parsed) {
        currentWord = parsed;
        result.words.push(currentWord);
        return;
      }
    }

    const exampleMatch = line.match(/^(?:[-*]\s*)?(?:예문|example|하위 줄 예문)\s*[:：]\s*(.+)$/i);
    if (exampleMatch && currentWord) {
      Object.assign(currentWord, parseExampleLine(exampleMatch[1]));
      return;
    }

    const fieldMatch = line.match(/^(?:[-*]\s*)?(발음|동의어|반의어|phrasal verb|오디오|audio)\s*[:：]\s*(.+)$/i);
    if (fieldMatch && currentWord) {
      const key = fieldMatch[1].toLowerCase();
      const value = cleanMarkdownValue(fieldMatch[2]);
      if (key === "발음") currentWord.pronunciation = value;
      if (key === "동의어") currentWord.synonyms = normalizeVocabularyList(value);
      if (key === "반의어") currentWord.antonyms = normalizeVocabularyList(value);
      if (key === "오디오" || key === "audio") currentWord.audioUrl = value;
      if (key === "phrasal verb") Object.assign(currentWord, parsePhrasalVerb(value));
    }
  });

  return result;
}

export function renderVocabularyMarkdownImport(data, escapeHtml) {
  return `
    <details class="vocab-md-details">
      <summary>
        <span>
          <strong>Markdown 가져오기</strong>
          <small>.md 파일이나 텍스트로 단어를 한 번에 추가합니다.</small>
        </span>
        <em>.md 지원</em>
      </summary>
      <form class="vocab-form vocab-md-form" data-vocab-form="markdown">
        <div class="vocab-md-grid">
          <label>
            <span>가져올 덱</span>
            <select name="targetDeckId" aria-label="Markdown 가져올 덱">
              <option value="__new">새 덱으로 가져오기</option>
              ${data.decks.map((deck) => `
                <option value="${escapeHtml(deck.id)}">${escapeHtml(deck.name)}에 추가</option>
              `).join("")}
            </select>
          </label>
          <label>
            <span>새 덱 이름</span>
            <input name="deckName" autocomplete="off" placeholder="Markdown 제목을 자동으로 사용합니다" />
          </label>
        </div>
        <label class="vocab-file-picker">
          <span>Markdown 파일</span>
          <input name="markdownFile" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" aria-label="Markdown 파일 선택" />
        </label>
        <label>
          <span>Markdown 텍스트</span>
          <textarea name="markdownText" autocomplete="off" placeholder="- achieve (v) | 성취하다 | I achieved my goal.&#10;발음: /əˈtʃiːv/&#10;동의어: accomplish, attain"></textarea>
        </label>
        <button class="primary-btn vocab-full-btn" type="submit">Markdown 가져오기</button>
      </form>
    </details>
  `;
}

export function buildVocabularyMarkdownImport({
  data,
  text,
  targetDeckId,
  deckName,
  makeId,
  todayKey,
}) {
  const parsed = parseVocabularyMarkdown(text);
  const now = Date.now();
  const useNewDeck = targetDeckId === "__new" || !data.decks.some((deck) => deck.id === targetDeckId);
  const targetDeck = useNewDeck
    ? {
        id: makeId(),
        name: deckName || parsed.deckName || "가져온 단어장",
        description: "",
        createdAt: now,
        updatedAt: now,
      }
    : data.decks.find((deck) => deck.id === targetDeckId);
  const existingKeys = new Set(
    data.words
      .filter((word) => word.deckId === targetDeck.id)
      .map((word) => word.front.trim().toLowerCase()),
  );
  const importedWords = parsed.words
    .filter((word) => word.front && word.meaning)
    .filter((word) => {
      const key = word.front.trim().toLowerCase();
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    })
    .map((word) => ({
      id: makeId(),
      deckId: targetDeck.id,
      front: word.front.trim(),
      meaning: word.meaning.trim(),
      example: word.example.trim(),
      exampleMeaning: word.exampleMeaning?.trim() || "",
      root: inferVocabularyRoot(word.front),
      partOfSpeech: normalizeVocabularyPart(word.partOfSpeech),
      pronunciation: word.pronunciation?.trim() || "",
      synonyms: normalizeVocabularyList(word.synonyms),
      antonyms: normalizeVocabularyList(word.antonyms),
      phrasalVerb: word.phrasalVerb?.trim() || "",
      phrasalVerbMeaning: word.phrasalVerbMeaning?.trim() || "",
      audioUrl: word.audioUrl?.trim() || "",
      memo: "",
      status: "new",
      nextReview: todayKey,
      interval: 0,
      easeFactor: 2.5,
      reviewCount: 0,
      correctCount: 0,
      createdAt: now,
      updatedAt: now,
      lastReviewedAt: "",
    }));

  return {
    addedCount: importedWords.length,
    parsedCount: parsed.words.length,
    nextData: {
      ...data,
      activeDeckId: targetDeck.id,
      activePanel: "home",
      decks: useNewDeck ? [...data.decks, targetDeck] : data.decks,
      words: [...importedWords, ...data.words],
    },
  };
}

export function importVocabularyMarkdownForm({
  form,
  data,
  setData,
  makeId,
  todayKey,
  queueSave,
  render,
}) {
  const text = form.elements.markdownText?.value?.trim() || "";
  if (!text) {
    form.elements.markdownText?.focus();
    return;
  }
  const result = buildVocabularyMarkdownImport({
    data,
    text,
    targetDeckId: form.elements.targetDeckId?.value || "__new",
    deckName: form.elements.deckName?.value.trim() || "",
    makeId,
    todayKey,
  });
  if (!result.addedCount) {
    alert("가져올 수 있는 단어를 찾지 못했습니다.");
    return;
  }
  setData(result.nextData);
  queueSave?.();
  render?.();
  alert(`${result.addedCount}개 단어를 가져왔습니다.`);
}

export function populateVocabularyMarkdownFileInput(input) {
  const file = input.files?.[0];
  if (!file) return;
  file.text().then((text) => {
    const form = input.closest('[data-vocab-form="markdown"]');
    const textarea = form?.elements.markdownText;
    const deckNameInput = form?.elements.deckName;
    if (textarea) textarea.value = text;
    if (deckNameInput && !deckNameInput.value.trim()) {
      deckNameInput.value = parseVocabularyMarkdown(text).deckName || file.name.replace(/\.[^.]+$/, "");
    }
  });
}
