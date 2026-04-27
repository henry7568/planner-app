import { renderVocabularyPartBadge } from "./vocabularyParts.js";
import {
  renderVocabularyAudioButton,
  renderVocabularyWordDetails,
} from "./vocabularyWordDetails.js";

export function renderVocabularyWordRow(word, {
  escapeHtml,
  getStatusClass,
  getReviewLabel,
}) {
  return `
    <div class="vocab-word-row">
      <span>
        <strong>${escapeHtml(word.front)}</strong>
        ${renderVocabularyAudioButton(word, escapeHtml)}
        ${renderVocabularyPartBadge(word, escapeHtml)}
        <small>${escapeHtml(word.meaning || "뜻 없음")}</small>
        ${renderVocabularyWordDetails(word, escapeHtml)}
      </span>
      <span class="vocab-word-right">
        <i class="vocab-dot ${getStatusClass(word)}"></i>
        <em>${getReviewLabel(word)}</em>
      </span>
    </div>
  `;
}
