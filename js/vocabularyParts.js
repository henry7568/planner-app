export const VOCABULARY_PARTS = [
  { value: "", label: "품사 없음" },
  { value: "n.", label: "n. 명사" },
  { value: "v.", label: "v. 동사" },
  { value: "adj.", label: "adj. 형용사" },
  { value: "adv.", label: "adv. 부사" },
  { value: "prep.", label: "prep. 전치사" },
  { value: "conj.", label: "conj. 접속사" },
  { value: "phr.", label: "phr. 구" },
];

const PART_ALIASES = new Map([
  ["n", "n."],
  ["noun", "n."],
  ["명사", "n."],
  ["v", "v."],
  ["verb", "v."],
  ["동사", "v."],
  ["adj", "adj."],
  ["adjective", "adj."],
  ["형용사", "adj."],
  ["adv", "adv."],
  ["adverb", "adv."],
  ["부사", "adv."],
  ["prep", "prep."],
  ["preposition", "prep."],
  ["전치사", "prep."],
  ["conj", "conj."],
  ["conjunction", "conj."],
  ["접속사", "conj."],
  ["phr", "phr."],
  ["phrase", "phr."],
  ["구", "phr."],
]);

export function normalizeVocabularyPart(value) {
  const key = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  return PART_ALIASES.get(key) || "";
}

export function renderVocabularyPartOptions(selectedValue = "") {
  const selected = normalizeVocabularyPart(selectedValue);
  return VOCABULARY_PARTS.map((part) => `
    <option value="${part.value}" ${part.value === selected ? "selected" : ""}>${part.label}</option>
  `).join("");
}

export function renderVocabularyPartBadge(word, escapeHtml) {
  const part = normalizeVocabularyPart(word?.partOfSpeech);
  return part ? `<em class="vocab-part-badge">${escapeHtml(part)}</em>` : "";
}

export function extractVocabularyPartFromFront(front) {
  const text = String(front || "").trim();
  const match = text.match(/\b(n|noun|v|verb|adj|adjective|adv|adverb|prep|conj|phr)\.?\b/i);
  const partOfSpeech = normalizeVocabularyPart(match?.[1] || "");
  const cleanFront = partOfSpeech
    ? text
        .replace(/\s*\((n|noun|v|verb|adj|adjective|adv|adverb|prep|conj|phr)\.?\)\s*/i, " ")
        .replace(/\b(n|noun|v|verb|adj|adjective|adv|adverb|prep|conj|phr)\.?\b/i, " ")
        .replace(/\s+/g, " ")
        .trim()
    : text;
  return { front: cleanFront, partOfSpeech };
}
