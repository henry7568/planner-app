export function normalizeVocabularyList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getVocabularyExtraFields(elements) {
  return {
    pronunciation: elements.pronunciation?.value.trim() || "",
    exampleMeaning: elements.exampleMeaning?.value.trim() || "",
    synonyms: normalizeVocabularyList(elements.synonyms?.value || ""),
    antonyms: normalizeVocabularyList(elements.antonyms?.value || ""),
    phrasalVerb: elements.phrasalVerb?.value.trim() || "",
    phrasalVerbMeaning: elements.phrasalVerbMeaning?.value.trim() || "",
    audioUrl: elements.audioUrl?.value.trim() || "",
  };
}

export function getEmptyVocabularyDraftExtras() {
  return {
    draftPronunciation: "",
    draftExampleMeaning: "",
    draftSynonyms: "",
    draftAntonyms: "",
    draftPhrasalVerb: "",
    draftPhrasalVerbMeaning: "",
    draftAudioUrl: "",
  };
}

export function getVocabularyDraftExtras(elements) {
  return {
    draftPronunciation: elements.pronunciation?.value || "",
    draftExampleMeaning: elements.exampleMeaning?.value || "",
    draftSynonyms: elements.synonyms?.value || "",
    draftAntonyms: elements.antonyms?.value || "",
    draftPhrasalVerb: elements.phrasalVerb?.value || "",
    draftPhrasalVerbMeaning: elements.phrasalVerbMeaning?.value || "",
    draftAudioUrl: elements.audioUrl?.value || "",
  };
}

export function renderVocabularyExtraFields(data, escapeHtml) {
  return `
    <div class="vocab-add-grid compact">
      <label><span>발음</span>
        <input name="pronunciation" autocomplete="off" value="${escapeHtml(data.draftPronunciation || "")}" placeholder="예: /əˈtʃiːv/" aria-label="단어 발음" />
      </label>
      <label><span>예문 해석</span>
        <input name="exampleMeaning" autocomplete="off" value="${escapeHtml(data.draftExampleMeaning || "")}" placeholder="예: 목표를 달성했다" aria-label="단어 예문 해석" />
      </label>
    </div>
    <div class="vocab-add-grid compact">
      <label><span>동의어</span>
        <input name="synonyms" autocomplete="off" value="${escapeHtml(data.draftSynonyms || "")}" placeholder="예: accomplish, attain" aria-label="단어 동의어" />
      </label>
      <label><span>반의어</span>
        <input name="antonyms" autocomplete="off" value="${escapeHtml(data.draftAntonyms || "")}" placeholder="예: fail" aria-label="단어 반의어" />
      </label>
    </div>
    <div class="vocab-add-grid compact">
      <label><span>phrasal verb</span>
        <input name="phrasalVerb" autocomplete="off" value="${escapeHtml(data.draftPhrasalVerb || "")}" placeholder="예: carry out" aria-label="단어 phrasal verb" />
      </label>
      <label><span>phrasal verb 뜻</span>
        <input name="phrasalVerbMeaning" autocomplete="off" value="${escapeHtml(data.draftPhrasalVerbMeaning || "")}" placeholder="예: 수행하다" aria-label="phrasal verb 뜻" />
      </label>
    </div>
    <label><span>오디오 URL</span>
      <input name="audioUrl" autocomplete="off" value="${escapeHtml(data.draftAudioUrl || "")}" placeholder="https://example.com/achieve.mp3" aria-label="단어 오디오 URL" />
    </label>
  `;
}

export function renderVocabularyAudioButton(word, escapeHtml) {
  const label = word.audioUrl ? "오디오" : "발음";
  return `<button class="vocab-audio-btn" type="button" data-vocab-action="play-word-audio" data-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.front)} ${label} 재생">▶ ${label}</button>`;
}

function renderDetailItem(label, value, escapeHtml) {
  if (!value) return "";
  return `<span><b>${label}</b>${escapeHtml(value)}</span>`;
}

function renderListItem(label, list, escapeHtml) {
  if (!Array.isArray(list) || !list.length) return "";
  return renderDetailItem(label, list.join(", "), escapeHtml);
}

export function renderVocabularyWordDetails(word, escapeHtml) {
  const phrasal = word.phrasalVerb
    ? `${word.phrasalVerb}${word.phrasalVerbMeaning ? ` (${word.phrasalVerbMeaning})` : ""}`
    : "";
  const details = [
    renderDetailItem("발음", word.pronunciation, escapeHtml),
    renderDetailItem("예문 해석", word.exampleMeaning, escapeHtml),
    renderListItem("동의어", word.synonyms, escapeHtml),
    renderListItem("반의어", word.antonyms, escapeHtml),
    renderDetailItem("phrasal", phrasal, escapeHtml),
  ].filter(Boolean);
  return details.length ? `<div class="vocab-word-details">${details.join("")}</div>` : "";
}
