const ROOT_HINTS = [
  { root: "act", label: "act", meaning: "행동하다", pattern: /act/i },
  { root: "port", label: "port", meaning: "나르다", pattern: /port/i },
  { root: "spect", label: "spect", meaning: "보다", pattern: /(spect|spec)/i },
  { root: "dict", label: "dict", meaning: "말하다", pattern: /dict/i },
  { root: "scrib", label: "scrib/script", meaning: "쓰다", pattern: /(scrib|script)/i },
  { root: "cred", label: "cred", meaning: "믿다", pattern: /cred/i },
  { root: "struct", label: "struct", meaning: "세우다", pattern: /struct/i },
  { root: "form", label: "form", meaning: "형태", pattern: /form/i },
  { root: "ject", label: "ject", meaning: "던지다", pattern: /ject/i },
  { root: "mit", label: "mit/miss", meaning: "보내다", pattern: /(mit|miss)/i },
  { root: "vis", label: "vid/vis", meaning: "보다", pattern: /(vid|vis)/i },
  { root: "phon", label: "phon", meaning: "소리", pattern: /phon/i },
  { root: "photo", label: "photo", meaning: "빛", pattern: /photo/i },
  { root: "graph", label: "graph", meaning: "쓰다/그리다", pattern: /graph/i },
  { root: "bio", label: "bio", meaning: "생명", pattern: /bio/i },
  { root: "geo", label: "geo", meaning: "땅", pattern: /geo/i },
  { root: "tele", label: "tele", meaning: "멀리", pattern: /tele/i },
  { root: "auto", label: "auto", meaning: "스스로", pattern: /auto/i },
  { root: "micro", label: "micro", meaning: "작은", pattern: /micro/i },
  { root: "macro", label: "macro", meaning: "큰", pattern: /macro/i },
];

export function inferVocabularyRoot(front) {
  const text = String(front || "").trim();
  if (!text) return "";
  const match = ROOT_HINTS.find((item) => item.pattern.test(text));
  return match?.label || "";
}

export function getVocabularyRootGroups(words = []) {
  const groups = new Map();
  words.forEach((word) => {
    const root = String(word.root || inferVocabularyRoot(word.front) || "기타").trim();
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(word);
  });
  return [...groups.entries()]
    .map(([root, items]) => ({ root, words: items }))
    .sort((a, b) => b.words.length - a.words.length || a.root.localeCompare(b.root));
}

export function getVocabularyRootMeaning(root) {
  const hint = ROOT_HINTS.find((item) => item.label === root || item.root === root);
  return hint?.meaning || "";
}

export function renderVocabularyRootGroups(words, escapeHtml) {
  const groups = getVocabularyRootGroups(words).slice(0, 6);
  if (!groups.length) {
    return `<div class="vocab-empty compact">아직 어근으로 묶을 단어가 없습니다.</div>`;
  }
  return `
    <div class="vocab-root-grid">
      ${groups.map((group) => {
        const meaning = getVocabularyRootMeaning(group.root);
        const preview = group.words.slice(0, 3).map((word) => word.front).join(", ");
        return `
          <div class="vocab-root-card">
            <span>
              <strong>${escapeHtml(group.root)}</strong>
              ${meaning ? `<small>${escapeHtml(meaning)}</small>` : ""}
            </span>
            <em>${group.words.length}개</em>
            <p>${escapeHtml(preview)}</p>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
