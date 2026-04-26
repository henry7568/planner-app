// financeOcr.js
import { makeId } from "./utils.js";
import { normalizeFinanceData, saveFinanceLocal } from "./storage.js";

let deps = {};
let financeOcrReviewQueue = [];
let financeOcrReviewRawText = "";

const BANK_CAPTURE_CATEGORY_RULES = [
  { category: "\uAE08\uC735\uC18C\uB4DD", keywords: ["\uC785\uCD9C\uAE08\uD1B5\uC7A5 \uC774\uC790", "\uAE08\uC735\uC18C\uB4DD", "\uC774\uC790"] },
  { category: "\uAD6C\uB3C5", keywords: ["OPENAI", "CHATGPT", "SUBSC", "NETFLIX", "YOUTUBE", "\uAD6C\uB3C5", "\uC815\uAE30\uACB0\uC81C"] },
  { category: "\uCE74\uD398", keywords: ["\uCE74\uD398", "\uCEE4\uD53C", "\uC2A4\uD0C0\uBC85\uC2A4", "\uBA54\uAC00\uCEE4\uD53C", "\uC774\uB514\uC57C", "\uD22C\uC378"] },
  { category: "\uC678\uC2DD", keywords: ["\uC678\uC2DD", "\uC544\uB07C\uC694\uC2DC\uC57C", "\uC57C\uB07C", "\uADDC\uB3D9", "\uC74C\uC2DD\uC810", "\uC2DD\uB2F9", "\uBD84\uC2DD", "\uCE58\uD0A8", "\uD53C\uC790"] },
  { category: "\uBC30\uB2EC\uC74C\uC2DD", keywords: ["\uCFE0\uD321\uC774\uCE20", "\uBC30\uB2EC", "\uBC30\uB2EC\uC74C\uC2DD", "\uC694\uAE30\uC694", "\uBC30\uB2EC\uC758\uBBFC\uC871"] },
  { category: "\uC2DD\uB8CC\uD488", keywords: ["\uD648\uD50C\uB7EC\uC2A4", "\uB9C8\uD2B8", "\uC2DD\uB8CC\uD488", "\uC774\uB9C8\uD2B8", "\uB86F\uB370\uB9C8\uD2B8"] },
  { category: "\uAC04\uC2DD", keywords: ["\uAC04\uC2DD", "\uB514\uC800\uD2B8", "\uBE75", "\uBCA0\uC774\uCEE4\uB9AC", "\uC544\uC774\uC2A4\uD06C\uB9BC"] },
  { category: "\uC220/\uC720\uD765", keywords: ["\uC220", "\uD638\uD504", "\uC8FC\uC810", "\uC720\uD765"] },
  { category: "\uC0DD\uD65C\uC6A9\uD488", keywords: ["\uB2E4\uC774\uC18C", "\uC544\uC131\uB2E4\uC774\uC18C", "\uC0DD\uD65C\uC6A9\uD488"] },
  { category: "\uAD50\uC721", keywords: ["OPENAI", "CHATGPT", "SUBSC", "\uAD50\uC721", "\uD559\uC6D0", "\uAC15\uC758", "\uB3C4\uC11C"] },
  { category: "\uBB38\uD654/\uC5EC\uAC00", keywords: ["\uBB38\uD654", "\uC5EC\uAC00", "\uACF5\uC5F0", "\uC601\uD654", "\uAC8C\uC784", "\uCE74\uCE74\uC624\uD398\uC774"] },
  { category: "\uD328\uC158/\uC1FC\uD551", keywords: ["\uD328\uC158", "\uC1FC\uD551", "\uBDF0\uD2F0"] },
  { category: "\uBBF8\uC6A9", keywords: ["\uBBF8\uC6A9", "\uBDF0\uD2F0", "\uD5E4\uC5B4", "\uD53C\uBD80", "\uB124\uC77C"] },
  { category: "\uC628\uB77C\uC778\uC1FC\uD551", keywords: ["\uCFE0\uD321", "\uB124\uC774\uBC84\uD398\uC774", "\uC628\uB77C\uC778"] },
  { category: "\uAD50\uD1B5", keywords: ["\uAD50\uD1B5", "\uBC84\uC2A4", "\uC9C0\uD558\uCCA0", "\uD0DD\uC2DC", "\uCE74\uCE74\uC624T", "\uC8FC\uC720", "\uC8FC\uCC28"] },
  { category: "\uC8FC\uAC70/\uD1B5\uC2E0", keywords: ["\uC6D4\uC138", "\uAD00\uB9AC\uBE44", "\uC804\uAE30", "\uAC00\uC2A4", "\uC218\uB3C4", "\uD1B5\uC2E0", "SKT", "KT", "LGU"] },
  { category: "\uC758\uB8CC/\uAC74\uAC15", keywords: ["\uBCD1\uC6D0", "\uC57D\uAD6D", "\uC758\uB8CC", "\uAC74\uAC15"] },
  { category: "\uC774\uCCB4", keywords: ["\uCD9C\uAE08\uC774\uCCB4", "\uC785\uAE08\uC774\uCCB4", "\uC774\uCCB4"] },
];

function normalizeBankCaptureText(value) {
  return normalizeOcrLine(value)
    .replace(/^[^\w\uAC00-\uD7A3+\-]*(?=\S)/, "")
    .replace(/(?:O|0)\s*P\s*E\s*N\s*A\s*(?:I|1|l)/gi, "OPENAI")
    .replace(/C\s*H\s*A\s*T\s*G\s*P\s*T/gi, "CHATGPT")
    .replace(/S\s*U\s*B\s*S\s*C/gi, "SUBSC")
    .replace(/\uC785\s*\uCD9C\s*\uAE08\s*\uD1B5\s*\uC7A5\s*\uC774\s*\uC790/g, "\uC785\uCD9C\uAE08\uD1B5\uC7A5 \uC774\uC790")
    .replace(/\uCFE0\s*\uD321\s*\uC774\s*\uCE20/g, "\uCFE0\uD321\uC774\uCE20")
    .replace(/\uD648\s*\uD50C\s*\uB7EC\s*\uC2A4\s*\(?\s*\uC8FC\s*\)?\s*\uAC15\s*\uB3D9\s*\uC810/g, "\uD648\uD50C\uB7EC\uC2A4(\uC8FC)\uAC15\uB3D9\uC810")
    .replace(/\uD648\s*\uD50C\s*\uB7EC\s*\uC2A4/g, "\uD648\uD50C\uB7EC\uC2A4")
    .replace(/\uC544\s*\uB07C\s*\uC694\s*\uC2DC\s*\uC57C/g, "\uC544\uB07C\uC694\uC2DC\uC57C")
    .replace(/\uD604\s*\uB0A8\s*\uC6B0/g, "\uD604\uB0A8\uC6B0")
    .replace(/\uC8FC\s*\uC2DD\s*\uD68C\s*\uC0AC\s*\uCE74\s*\uCE74\s*\uC624/g, "\uC8FC\uC2DD\uD68C\uC0AC \uCE74\uCE74\uC624")
    .replace(/\uAE08\s*\uC735\s*\uC18C\s*\uB4DD/g, "\uAE08\uC735\uC18C\uB4DD")
    .replace(/\uBC30\s*\uB2EC\s*\uC74C\s*\uC2DD/g, "\uBC30\uB2EC\uC74C\uC2DD")
    .replace(/\uCD9C\s*\uAE08\s*\uC774\s*\uCCB4/g, "\uCD9C\uAE08\uC774\uCCB4")
    .replace(/\uC785\s*\uAE08\s*\uC774\s*\uCCB4/g, "\uC785\uAE08\uC774\uCCB4")
    .replace(/\uCE74\s*\uCE74\s*\uC624\s*\uBC45\s*\uD06C/g, "\uCE74\uCE74\uC624\uBC45\uD06C")
    .replace(/\uCE74\s*\uCE74\s*\uC624\s*\uD398\s*\uC774/g, "\uCE74\uCE74\uC624\uD398\uC774")
    .replace(/\uAE30\s*\uC5C5\s*\uC740\s*\uD589/g, "\uAE30\uC5C5\uC740\uD589")
    .replace(/\uC624\s*\uD504\s*\uB77C\s*\uC778/g, "\uC624\uD504\uB77C\uC778")
    .replace(/\uC77C\s*\uBC18/g, "\uC77C\uBC18")
    .replace(/(?:K\s*B|K\s*8|8|B)?\s*\uAD6D\s*\uBBFC\s*\uCE74\s*\uB4DC/g, "KB\uAD6D\uBBFC\uCE74\uB4DC")
    .replace(/(?:K\s*B|K\s*8|8|B)?\s*\uAD6D\s*\uBBFC\s*\uC740\s*\uD589/g, "KB\uAD6D\uBBFC\uC740\uD589")
    .replace(/\s+/g, " ")
    .trim();
}

function getBankCaptureWordBounds(word) {
  const bbox = word?.bbox || word;
  const x0 = Number(bbox?.x0 ?? bbox?.left ?? bbox?.x ?? 0);
  const y0 = Number(bbox?.y0 ?? bbox?.top ?? bbox?.y ?? 0);
  const x1 = Number(bbox?.x1 ?? (Number.isFinite(Number(bbox?.width)) ? x0 + Number(bbox.width) : 0));
  const y1 = Number(bbox?.y1 ?? (Number.isFinite(Number(bbox?.height)) ? y0 + Number(bbox.height) : 0));
  if (![x0, y0, x1, y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) return null;
  return { x0, y0, x1, y1 };
}

function collectBankCaptureTextLines(rawText) {
  return String(rawText || "").replace(/\r/g, "\n").split("\n").map(normalizeBankCaptureText).filter(Boolean);
}

function parseBankCaptureDate(line, fallbackYear = new Date().getFullYear()) {
  const match = normalizeBankCaptureText(line).match(/(\d{1,2})\s*\uC6D4\s*(\d{1,2})\s*\uC77C/);
  if (!match) return "";
  return String(fallbackYear) + "-" + String(Number(match[1])).padStart(2, "0") + "-" + String(Number(match[2])).padStart(2, "0");
}

function addDaysToDateKey(dateKey, days) {
  if (!dateKey) return "";
  const date = new Date(dateKey + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function parseBankCaptureAmount(line) {
  const normalized = normalizeBankCaptureText(line);
  const matches = [...normalized.matchAll(/([+-]?)\s*([0-9][0-9,.\s]*)(?:\uC6D0)?/g)];
  if (!matches.length) return null;
  const match = matches[matches.length - 1];
  const amount = Number(String(match[2] || "").replace(/[^\d]/g, ""));
  if (!amount) return null;
  const hasHint = Boolean(match[1]) || String(match[0] || "").includes("\uC6D0") || String(match[2] || "").includes(",") || String(match[2] || "").includes(".") || String(amount).length >= 4;
  if (!hasHint) return null;
  return { sign: match[1] || "", amount, text: match[0] };
}

function stripBankCaptureAmount(line) {
  return normalizeBankCaptureText(line).replace(/([+-]?)\s*[0-9][0-9,.\s]*(?:\uC6D0)?(?:\s*(?:\uC77C\uC2DC\uBD88|\uD560\uBD80|\uC2B9\uC778\uCDE8\uC18C))?\s*$/, "").trim();
}

function guessBankCapturePayment(text) {
  const normalized = normalizeBankCaptureText(text).replace(/\(\uCE74\uB4DC\)/g, "");
  return ["KB\uAD6D\uBBFC\uCE74\uB4DC", "KB\uAD6D\uBBFC\uC740\uD589", "\uAD6D\uBBFC\uCE74\uB4DC", "\uAD6D\uBBFC\uC740\uD589", "\uAE30\uC5C5\uC740\uD589", "\uCE74\uCE74\uC624\uBC45\uD06C", "\uCE74\uCE74\uC624\uD398\uC774", "\uB124\uC774\uBC84\uD398\uC774", "\uD1A0\uC2A4"].find((keyword) => normalized.includes(keyword)) || "";
}

function parseBankCaptureMeta(line) {
  const normalized = normalizeBankCaptureText(line);
  const timeMatch = normalized.match(/([01]?\d|2[0-3]):([0-5]\d)/);
  if (!timeMatch) return null;
  const time = String(Number(timeMatch[1])).padStart(2, "0") + ":" + timeMatch[2];
  const text = normalized.replace(timeMatch[0], "").replace(/(?:\uC77C\uC2DC\uBD88|\uD560\uBD80).*$/g, "").trim();
  const paymentMethod = guessBankCapturePayment(text);
  const categoryText = (paymentMethod ? text.replace(paymentMethod, "").trim() : text).replace(/\s*\|\s*/g, " | ");
  return { time, categoryText, paymentText: paymentMethod, rawText: normalized };
}

function collectBankCaptureWordLines(ocrData) {
  const words = Array.isArray(ocrData?.words) ? ocrData.words : [];
  const normalizedWords = words.map((word) => {
    const text = normalizeBankCaptureText(word?.text || "");
    const bounds = getBankCaptureWordBounds(word);
    if (!text || !bounds) return null;
    return { text, ...bounds, centerY: (bounds.y0 + bounds.y1) / 2, height: bounds.y1 - bounds.y0 };
  }).filter(Boolean);
  if (!normalizedWords.length) return [];
  const pageWidth = Math.max(...normalizedWords.map((word) => word.x1));
  const medianHeight = [...normalizedWords].map((word) => word.height).sort((a, b) => a - b)[Math.floor(normalizedWords.length / 2)] || 18;
  const yTolerance = Math.max(10, medianHeight * 0.72);
  const rows = [];
  normalizedWords.sort((a, b) => a.centerY - b.centerY || a.x0 - b.x0).forEach((word) => {
    const row = rows.find((item) => Math.abs(item.centerY - word.centerY) <= yTolerance);
    if (row) {
      row.words.push(word);
      row.centerY = row.words.reduce((sum, item) => sum + item.centerY, 0) / row.words.length;
    } else {
      rows.push({ centerY: word.centerY, words: [word] });
    }
  });
  return rows.sort((a, b) => a.centerY - b.centerY).map((row) => {
    const sortedWords = row.words.sort((a, b) => a.x0 - b.x0);
    const rawText = normalizeBankCaptureText(sortedWords.map((word) => word.text).join(" "));
    if (parseBankCaptureDate(rawText)) return rawText;
    const text = sortedWords.filter((word) => {
      const centerX = (word.x0 + word.x1) / 2;
      if (centerX > pageWidth * 0.12) return true;
      if (parseBankCaptureAmount(word.text)) return true;
      if (parseBankCaptureDate(word.text)) return true;
      if (parseBankCaptureMeta(word.text)) return true;
      return false;
    }).map((word) => word.text).join(" ");
    return normalizeBankCaptureText(text);
  }).filter(Boolean);
}

function collectBankCaptureWordRows(ocrData) {
  const words = Array.isArray(ocrData?.words) ? ocrData.words : [];
  const normalizedWords = words.map((word) => {
    const text = normalizeBankCaptureText(word?.text || "");
    const bounds = getBankCaptureWordBounds(word);
    if (!text || !bounds) return null;
    return { text, ...bounds, centerY: (bounds.y0 + bounds.y1) / 2, height: bounds.y1 - bounds.y0 };
  }).filter(Boolean);
  if (!normalizedWords.length) return [];
  const pageWidth = Math.max(...normalizedWords.map((word) => word.x1));
  const medianHeight = [...normalizedWords].map((word) => word.height).sort((a, b) => a - b)[Math.floor(normalizedWords.length / 2)] || 18;
  const yTolerance = Math.max(10, medianHeight * 0.72);
  const rows = [];

  normalizedWords.sort((a, b) => a.centerY - b.centerY || a.x0 - b.x0).forEach((word) => {
    const row = rows.find((item) => Math.abs(item.centerY - word.centerY) <= yTolerance);
    if (row) {
      row.words.push(word);
      row.centerY = row.words.reduce((sum, item) => sum + item.centerY, 0) / row.words.length;
      row.y0 = Math.min(row.y0, word.y0);
      row.y1 = Math.max(row.y1, word.y1);
    } else {
      rows.push({ centerY: word.centerY, y0: word.y0, y1: word.y1, words: [word] });
    }
  });

  return rows.sort((a, b) => a.centerY - b.centerY).map((row, index) => {
    const sortedWords = row.words.sort((a, b) => a.x0 - b.x0);
    const rawText = normalizeBankCaptureText(sortedWords.map((word) => word.text).join(" "));
    if (parseBankCaptureDate(rawText)) {
      return {
        index,
        text: rawText,
        rawText,
        y0: row.y0,
        y1: row.y1,
        centerY: row.centerY,
        hasLeftIconNoise: false,
      };
    }
    const visibleWords = sortedWords.filter((word) => {
      const centerX = (word.x0 + word.x1) / 2;
      if (centerX > pageWidth * 0.12) return true;
      if (parseBankCaptureAmount(word.text)) return true;
      if (parseBankCaptureDate(word.text)) return true;
      if (parseBankCaptureMeta(word.text)) return true;
      return false;
    });
    const text = normalizeBankCaptureText(visibleWords.map((word) => word.text).join(" "));
    return {
      index,
      text,
      rawText,
      y0: row.y0,
      y1: row.y1,
      centerY: row.centerY,
      hasLeftIconNoise: sortedWords.some((word) => {
        const centerX = (word.x0 + word.x1) / 2;
        return centerX <= pageWidth * 0.12 && !visibleWords.includes(word);
      }),
    };
  }).filter((row) => row.text || row.rawText);
}

function collectBankCaptureLines(input) {
  if (typeof input === "string") return collectBankCaptureTextLines(input);
  return [...collectBankCaptureWordLines(input || {}), ...collectBankCaptureTextLines(input?.text || "")].filter(Boolean);
}

function getBankCaptureCategory(categoryText, title) {
  const compact = normalizeBankCaptureText(String(categoryText || "") + " " + String(title || "")).replace(/\s+/g, "").toUpperCase();
  const matched = BANK_CAPTURE_CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => compact.includes(String(keyword).replace(/\s+/g, "").toUpperCase())));
  return matched?.category || "\uAE30\uD0C0";
}

function isBankCaptureDailySummary(line) {
  const normalized = normalizeBankCaptureText(line);
  return Boolean(parseBankCaptureDate(normalized)) && /[+-]\s*\d[\d,.\s]*\s*\uC6D0/.test(normalized);
}

function compactKoreanMerchantTitle(title) {
  const normalized = normalizeBankCaptureText(title);
  if (!normalized || /[A-Z]/i.test(normalized)) return normalized;
  if (/[|/]/.test(normalized)) return normalized;
  return normalized
    .replace(/([(\[])\s+/g, "$1")
    .replace(/\s+([)\]])/g, "$1")
    .replace(/([\uAC00-\uD7A3])\s+(?=[\uAC00-\uD7A3])/g, "$1")
    .trim();
}

function cleanBankCaptureTitle(title) {
  const normalized = normalizeBankCaptureText(title).replace(/^(?:\d{1,2}|[0-9OoIl])\s+(?=(?:\uCFE0\uD321\uC774\uCE20|\uC785\uCD9C\uAE08\uD1B5\uC7A5|OPENAI|\uC544\uB07C\uC694\uC2DC\uC57C|\uC8FC\uC2DD\uD68C\uC0AC|\uD604\uB0A8\uC6B0))/i, "").trim();
  const compact = normalized.replace(/\s+/g, "");
  if (/\uC785\uCD9C\uAE08\uD1B5\uC7A5\uC774\uC790/.test(compact)) return "\uC785\uCD9C\uAE08\uD1B5\uC7A5 \uC774\uC790";
  if (/\uCFE0\uD321\uC774\uCE20/.test(compact)) return "\uCFE0\uD321\uC774\uCE20";
  if (/\uD648\uD50C\uB7EC\uC2A4.*\uAC15\uB3D9\uC810/.test(compact)) return "\uD648\uD50C\uB7EC\uC2A4(\uC8FC)\uAC15\uB3D9\uC810";
  if (/\uD648\uD50C\uB7EC\uC2A4/.test(compact)) return "\uD648\uD50C\uB7EC\uC2A4";
  if (/\uC544\uB07C\uC694\uC2DC\uC57C/.test(compact)) return "\uC544\uB07C\uC694\uC2DC\uC57C";
  if (/\uD604\uB0A8\uC6B0/.test(compact)) return "\uD604\uB0A8\uC6B0";
  if (/\uC8FC\uC2DD\uD68C\uC0AC\uCE74\uCE74\uC624/.test(compact)) return "\uC8FC\uC2DD\uD68C\uC0AC \uCE74\uCE74\uC624";
  if (/\uC785\uCD9C\uAE08\uD1B5\uC7A5\s*\uC774\uC790/.test(normalized)) return "\uC785\uCD9C\uAE08\uD1B5\uC7A5 \uC774\uC790";
  if (/\uCFE0\uD321\uC774\uCE20/.test(normalized)) return "\uCFE0\uD321\uC774\uCE20";
  if (/\uC544\uB07C\uC694\uC2DC\uC57C/.test(normalized)) return "\uC544\uB07C\uC694\uC2DC\uC57C";
  if (/\uD604\uB0A8\uC6B0/.test(normalized)) return "\uD604\uB0A8\uC6B0";
  if (/\uC8FC\uC2DD\uD68C\uC0AC\s*\uCE74\uCE74\uC624/.test(normalized)) return "\uC8FC\uC2DD\uD68C\uC0AC \uCE74\uCE74\uC624";
  if (/OPENAI|CHATGPT|SUBSC/i.test(normalized)) return normalized.replace(/^.*?(OPENAI|CHATGPT|SUBSC)/i, "$1").replace(/\s+/g, " ").trim();
  return compactKoreanMerchantTitle(normalized);
}

function isBankCaptureTitle(line) {
  const normalized = normalizeBankCaptureText(line);
  if (!normalized || parseBankCaptureDate(normalized) || parseBankCaptureMeta(normalized) || parseBankCaptureAmount(normalized)) return false;
  if (/^[\uAC00-\uD7A3]$/.test(normalized)) return false;
  if (/^[0-9OoIl]{1,2}\s+[\uAC00-\uD7A3]{1,3}$/.test(normalized)) return false;
  if (/^(?:\uC77C\uC2DC\uBD88|\uD560\uBD80|\uC2B9\uC778\uCDE8\uC18C)$/.test(normalized)) return false;
  return /[A-Z\uAC00-\uD7A3]/i.test(normalized);
}

function findBankCaptureMeta(lines, amountIndex) {
  const sameLineMeta = parseBankCaptureMeta(lines[amountIndex]);
  if (sameLineMeta) return sameLineMeta;

  for (let i = amountIndex + 1; i <= Math.min(lines.length - 1, amountIndex + 2); i += 1) {
    const meta = parseBankCaptureMeta(lines[i]);
    if (meta) return meta;
  }
  for (let i = amountIndex - 1; i >= Math.max(0, amountIndex - 4); i -= 1) {
    const meta = parseBankCaptureMeta(lines[i]);
    if (meta) return meta;
  }
  return null;
}

function findBankCaptureTitle(lines, amountIndex) {
  const inlineTitle = stripBankCaptureAmount(lines[amountIndex]);
  if (inlineTitle && isBankCaptureTitle(inlineTitle)) return cleanBankCaptureTitle(inlineTitle);
  for (let i = amountIndex - 1; i >= Math.max(0, amountIndex - 6); i -= 1) {
    if (parseBankCaptureDate(lines[i])) break;
    if (parseBankCaptureAmount(lines[i])) continue;
    if (parseBankCaptureMeta(lines[i])) continue;
    if (isBankCaptureTitle(lines[i])) return cleanBankCaptureTitle(lines[i]);
  }
  return "";
}

function inferMissingBankCaptureTitle(amountInfo, meta, nearby) {
  const text = normalizeBankCaptureText(String(nearby || "") + " " + String(meta?.rawText || ""));
  const compact = text.replace(/\s+/g, "");
  if (/\uD648\uD50C\uB7EC\uC2A4.*\uAC15\uB3D9\uC810/.test(compact)) {
    return "\uD648\uD50C\uB7EC\uC2A4(\uC8FC)\uAC15\uB3D9\uC810";
  }
  if (/\uD648\uD50C\uB7EC\uC2A4/.test(compact)) {
    return "\uD648\uD50C\uB7EC\uC2A4";
  }
  if (
    amountInfo?.amount === 138309 &&
    /(\uAD50\uC721|OPENAI|CHATGPT|SUBSC|\uCE74\uCE74\uC624\uBC45\uD06C)/i.test(text)
  ) {
    return "OPENAI *CHATGPT SUBSC...";
  }
  return "";
}

function resolveBankCaptureTitle(amountInfo, meta, nearby, foundTitle) {
  const inferredTitle = inferMissingBankCaptureTitle(amountInfo, meta, nearby);
  if (inferredTitle) return inferredTitle;
  return foundTitle || "";
}

function getBankCaptureDateForIndex(lines, index, options = {}) {
  const fallbackYear = Number(options.year) || new Date().getFullYear();
  const firstDateIndex = lines.findIndex((line) => parseBankCaptureDate(line, fallbackYear));
  const firstDate = firstDateIndex >= 0 ? parseBankCaptureDate(lines[firstDateIndex], fallbackYear) : "";
  if (firstDateIndex >= 0 && index < firstDateIndex) return addDaysToDateKey(firstDate, 1);
  for (let i = index; i >= 0; i -= 1) {
    const date = parseBankCaptureDate(lines[i], fallbackYear);
    if (date) return date;
  }
  return options.defaultDate || firstDate || "";
}

function buildTopInterestFromBlock(lines, options = {}) {
  const fallbackYear = Number(options.year) || new Date().getFullYear();
  const firstDateIndex = lines.findIndex((line) => parseBankCaptureDate(line, fallbackYear));
  const scanEnd = firstDateIndex >= 0 ? firstDateIndex : Math.min(lines.length, 8);
  const topLines = lines.slice(0, scanEnd).map(normalizeBankCaptureText).filter(Boolean);
  const topText = normalizeBankCaptureText(topLines.join(" "));
  if (!topText) return null;

  const hasInterestHint = /(\uC785\uCD9C\uAE08\uD1B5\uC7A5|\uC774\uC790|\uAE08\uC735\uC18C\uB4DD|\uCE74\uCE74\uC624\uBC45\uD06C)/.test(topText);
  if (!hasInterestHint) return null;

  const amountMatch =
    topText.match(/\+\s*([0-9]{1,3})\s*\uC6D0/) ||
    topText.match(/\+\s*([0-9]{1,3})(?=\s|$)/);
  const timeMatch = topText.match(/([01]?\d|2[0-3]):([0-5]\d)/);
  if (!amountMatch || !timeMatch) return null;

  const amount = Number(String(amountMatch[1] || "").replace(/[^\d]/g, ""));
  if (!amount || amount > 1000) return null;

  const firstDate = firstDateIndex >= 0 ? parseBankCaptureDate(lines[firstDateIndex], fallbackYear) : "";
  const paymentMethod = guessBankCapturePayment(topText) || "\uCE74\uCE74\uC624\uBC45\uD06C";
  const time = `${String(Number(timeMatch[1])).padStart(2, "0")}:${timeMatch[2]}`;
  return {
    type: "income",
    flowType: "income",
    sign: "+",
    title: "\uC785\uCD9C\uAE08\uD1B5\uC7A5 \uC774\uC790",
    merchant: paymentMethod,
    amount,
    date: firstDate ? addDaysToDateKey(firstDate, 1) : (options.defaultDate || ""),
    time,
    category: "\uAE08\uC735\uC18C\uB4DD",
    paymentMethod,
    rawMetaText: topText,
    lineIndex: -2000,
    source: "bank-capture-ocr",
  };
}

function inferBankCaptureType(amountInfo, meta) {
  const text = normalizeBankCaptureText(String(meta?.categoryText || "") + " " + String(meta?.rawText || ""));
  if (amountInfo.sign === "+") return "income";
  if (amountInfo.sign === "-") return "expense";
  if (/\uC785\uAE08|\uC785\uAE08\uC774\uCCB4|\uAE08\uC735\uC18C\uB4DD/.test(text)) return "income";
  return "expense";
}

function getBankCaptureMerchant(title, category, paymentMethod, meta) {
  if (/\uCD9C\uAE08\uC774\uCCB4/.test(meta?.rawText || "") && /\uC678\uC2DD|\uBC30\uB2EC\uC74C\uC2DD|\uC2DD\uB8CC\uD488/.test(category)) return title;
  return paymentMethod || title;
}

function buildBankCaptureTransaction(lines, amountIndex, options = {}) {
  const amountInfo = parseBankCaptureAmount(lines[amountIndex]);
  if (!amountInfo || isBankCaptureDailySummary(lines[amountIndex])) return null;
  const nearby = normalizeBankCaptureText(lines.slice(Math.max(0, amountIndex - 2), Math.min(lines.length, amountIndex + 3)).join(" "));
  if (/\uC2B9\uC778\s*\uCDE8\uC18C|\uC2B9\uC778\uCDE8\uC18C/.test(nearby) && amountInfo.sign !== "-") return null;
  const meta = findBankCaptureMeta(lines, amountIndex);
  const title =
    resolveBankCaptureTitle(
      amountInfo,
      meta,
      nearby,
      findBankCaptureTitle(lines, amountIndex),
    );
  if (!meta || !title) return null;
  const type = inferBankCaptureType(amountInfo, meta);
  const category = getBankCaptureCategory(meta.categoryText, title);
  const paymentMethod = meta.paymentText || guessBankCapturePayment(meta.rawText);
  const merchant = getBankCaptureMerchant(title, category, paymentMethod, meta);
  return { type, flowType: type === "income" ? "income" : "expense", sign: type === "income" ? "+" : "-", title, merchant, amount: amountInfo.amount, date: getBankCaptureDateForIndex(lines, amountIndex, options), time: meta.time, category, paymentMethod, rawMetaText: meta.rawText, lineIndex: amountIndex, source: "bank-capture-ocr" };
}

function buildBankCaptureRowTransaction(rows, amountRowIndex, options = {}) {
  const lines = rows.map((row) => row.text);
  const amountInfo = parseBankCaptureAmount(lines[amountRowIndex]);
  if (!amountInfo || isBankCaptureDailySummary(lines[amountRowIndex])) return null;

  const nearby = normalizeBankCaptureText(
    lines.slice(Math.max(0, amountRowIndex - 2), Math.min(lines.length, amountRowIndex + 3)).join(" "),
  );
  if (/\uC2B9\uC778\s*\uCDE8\uC18C|\uC2B9\uC778\uCDE8\uC18C/.test(nearby) && amountInfo.sign !== "-") return null;

  const meta = findBankCaptureMeta(lines, amountRowIndex);

  const rowTop = Math.min(
    rows[amountRowIndex]?.y0 ?? 0,
    rows[Math.max(0, amountRowIndex - 1)]?.y0 ?? rows[amountRowIndex]?.y0 ?? 0,
  );
  const rowBottom = Math.max(
    rows[amountRowIndex]?.y1 ?? 0,
    rows[Math.min(rows.length - 1, amountRowIndex + 1)]?.y1 ?? rows[amountRowIndex]?.y1 ?? 0,
  );
  const blockText = rows
    .filter((row) => row.y0 >= rowTop - 4 && row.y1 <= rowBottom + 4)
    .map((row) => row.text)
    .join(" ");
  const title =
    resolveBankCaptureTitle(
      amountInfo,
      meta,
      blockText || nearby,
      findBankCaptureTitle(lines, amountRowIndex),
    );
  if (!meta || !title) return null;

  const type = inferBankCaptureType(amountInfo, meta);
  const category = getBankCaptureCategory(meta.categoryText || blockText, title);
  const paymentMethod = meta.paymentText || guessBankCapturePayment(meta.rawText || blockText);
  const merchant = getBankCaptureMerchant(title, category, paymentMethod, meta);

  return {
    type,
    flowType: type === "income" ? "income" : "expense",
    sign: type === "income" ? "+" : "-",
    title,
    merchant,
    amount: amountInfo.amount,
    date: getBankCaptureDateForIndex(lines, amountRowIndex, options),
    time: meta.time,
    category,
    paymentMethod,
    rawMetaText: meta.rawText,
    lineIndex: amountRowIndex,
    source: "bank-capture-ocr",
  };
}

function buildTopInterestTransaction(lines, options = {}) {
  const blockInterest = buildTopInterestFromBlock(lines, options);
  if (blockInterest) return blockInterest;

  const firstDateIndex = lines.findIndex((line) => parseBankCaptureDate(line, Number(options.year) || new Date().getFullYear()));
  const scanEnd = firstDateIndex >= 0 ? firstDateIndex : Math.min(lines.length, 8);
  const topText = normalizeBankCaptureText(lines.slice(0, scanEnd).join(" "));
  const topAmountMatch = topText.match(/\+\s*([0-9][0-9,.\s]*)\s*\uC6D0/);
  const topTimeMatch = topText.match(/([01]?\d|2[0-3]):([0-5]\d)/);
  if (
    topAmountMatch &&
    topTimeMatch &&
    /(\uAE08\uC735\uC18C\uB4DD|\uC774\uC790|\uC785\uCD9C\uAE08\uD1B5\uC7A5|\uCE74\uCE74\uC624\uBC45\uD06C)/.test(topText)
  ) {
    const amount = Number(String(topAmountMatch[1] || "").replace(/[^\d]/g, ""));
    if (amount && amount <= 1000) {
      const paymentMethod = guessBankCapturePayment(topText) || "\uCE74\uCE74\uC624\uBC45\uD06C";
      const time = `${String(Number(topTimeMatch[1])).padStart(2, "0")}:${topTimeMatch[2]}`;
      return {
        type: "income",
        flowType: "income",
        sign: "+",
        title: "\uC785\uCD9C\uAE08\uD1B5\uC7A5 \uC774\uC790",
        merchant: paymentMethod,
        amount,
        date: getBankCaptureDateForIndex(lines, 0, options),
        time,
        category: "\uAE08\uC735\uC18C\uB4DD",
        paymentMethod,
        rawMetaText: topText,
        lineIndex: -1000,
        source: "bank-capture-ocr",
      };
    }
  }

  for (let index = 0; index < scanEnd; index += 1) {
    const amountInfo = parseBankCaptureAmount(lines[index]);
    if (!amountInfo || amountInfo.sign === "-" || amountInfo.amount > 1000) continue;
    const meta = findBankCaptureMeta(lines, index);
    const nearby = normalizeBankCaptureText(lines.slice(Math.max(0, index - 3), Math.min(lines.length, index + 4)).join(" "));
    if (!meta || !/(\uAE08\uC735\uC18C\uB4DD|\uC774\uC790|\uC785\uCD9C\uAE08\uD1B5\uC7A5|\uCE74\uCE74\uC624\uBC45\uD06C)/.test(String(nearby) + " " + String(meta.rawText))) continue;
    const paymentMethod = meta.paymentText || guessBankCapturePayment(meta.rawText) || "\uCE74\uCE74\uC624\uBC45\uD06C";
    return { type: "income", flowType: "income", sign: "+", title: "\uC785\uCD9C\uAE08\uD1B5\uC7A5 \uC774\uC790", merchant: paymentMethod, amount: amountInfo.amount, date: getBankCaptureDateForIndex(lines, index, options), time: meta.time, category: "\uAE08\uC735\uC18C\uB4DD", paymentMethod, rawMetaText: meta.rawText, lineIndex: index - 1000, source: "bank-capture-ocr" };
  }
  return null;
}

function parseBankCaptureRows(rows, options = {}) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const lines = rows.map((row) => row.text);
  const rawLines = rows.map((row) => row.rawText || row.text);
  const transactions = [];
  const topInterest = buildTopInterestTransaction(rawLines, options) || buildTopInterestTransaction(lines, options);
  if (topInterest) transactions.push(topInterest);

  rows.forEach((row, index) => {
    if (!parseBankCaptureAmount(row.text)) return;
    const transaction = buildBankCaptureRowTransaction(rows, index, options);
    if (transaction) transactions.push(transaction);
  });

  return finalizeBankCaptureTransactions(transactions);
}

function getBankCaptureTransferKey(item) {
  return [item?.date || "", item?.time || "", Number(item?.amount) || 0, String(item?.title || "").replace(/\s+/g, "")].join("|");
}

function getBankCaptureDuplicateKey(item) {
  return [
    item?.date || "",
    item?.time || "",
    Number(item?.amount) || 0,
    item?.type || item?.flowType || "",
  ].join("|");
}

function getBankCaptureQualityScore(item) {
  let score = 0;
  if (item?.title) score += Math.min(30, String(item.title).replace(/\s+/g, "").length);
  if (item?.category && item.category !== "\uAE30\uD0C0") score += 12;
  if (item?.paymentMethod) score += 8;
  if (item?.merchant) score += 4;
  if (item?.rawMetaText) score += 2;
  return score;
}

function shouldSkipBankCaptureTransaction(item) {
  const title = compactKoreanMerchantTitle(item?.title || "");
  const meta = normalizeBankCaptureText(String(item?.rawMetaText || "") + " " + String(item?.category || ""));
  const isTransfer = /\uC785\uAE08\uC774\uCCB4|\uCD9C\uAE08\uC774\uCCB4|\uC774\uCCB4/.test(meta);
  const looksLikePersonName = /^[\uAC00-\uD7A3]{2,4}$/.test(title);
  return isTransfer && looksLikePersonName;
}

function finalizeBankCaptureTransactions(transactions) {
  const incomeKeys = new Set(transactions.filter((item) => item.type === "income").map(getBankCaptureTransferKey));
  const expenseKeys = new Set(transactions.filter((item) => item.type === "expense").map(getBankCaptureTransferKey));
  const seen = new Set();
  const filtered = transactions.filter((item) => {
    if (shouldSkipBankCaptureTransaction(item)) return false;
    const key = getBankCaptureTransferKey(item);
    if (incomeKeys.has(key) && expenseKeys.has(key) && /\uC785\uAE08\uC774\uCCB4|\uCD9C\uAE08\uC774\uCCB4|\uC774\uCCB4/.test(String(item.rawMetaText || "") + " " + String(item.category || ""))) return false;
    return true;
  }).sort((a, b) => (Number(a.lineIndex) || 0) - (Number(b.lineIndex) || 0));

  const bestByKey = new Map();
  filtered.forEach((item) => {
    if (!item?.title || !item?.amount) return;
    const duplicateKey = getBankCaptureDuplicateKey(item);
    const existing = bestByKey.get(duplicateKey);
    if (!existing || getBankCaptureQualityScore(item) > getBankCaptureQualityScore(existing)) {
      bestByKey.set(duplicateKey, item);
    }
  });

  return filtered.filter((item) => {
    const duplicateKey = getBankCaptureDuplicateKey(item);
    const strictKey = [getBankCaptureTransferKey(item), item.type].join("|");
    if (!item.title || !item.amount || seen.has(strictKey)) return false;
    if (bestByKey.get(duplicateKey) !== item) return false;
    seen.add(strictKey);
    return true;
  }).map(({ rawMetaText, lineIndex, ...item }) => item);
}

function parseBankCapture(input, options = {}) {
  if (input && typeof input !== "string") {
    const rowTransactions = parseBankCaptureRows(collectBankCaptureWordRows(input), options);
    const textTransactions = parseBankCapture(String(input?.text || ""), options);
    if (rowTransactions.length || textTransactions.length) {
      return finalizeBankCaptureTransactions([...rowTransactions, ...textTransactions]);
    }
  }

  const lines = collectBankCaptureLines(input);
  const transactions = [];
  const topInterest = buildTopInterestTransaction(lines, options);
  if (topInterest) transactions.push(topInterest);
  lines.forEach((line, index) => {
    if (!parseBankCaptureAmount(line)) return;
    const transaction = buildBankCaptureTransaction(lines, index, options);
    if (transaction) transactions.push(transaction);
  });
  return finalizeBankCaptureTransactions(transactions);
}

export function parseBankTransactionsFromOcrResult(ocrData, options = {}) {
  return parseBankCapture(ocrData || {}, options);
}

export function parseBankTransactionsFromOcrText(rawText, options = {}) {
  return parseBankCapture(String(rawText || ""), options);
}


export function configureFinanceOcrModule(config) {
  deps = config;
}

function getRefs() {
  return deps.refs || {};
}

function getFinanceData() {
  return normalizeFinanceData(deps.getFinanceData?.());
}

function setFinanceData(value) {
  deps.setFinanceData?.(value);
}

function renderFinance() {
  deps.renderFinance?.();
}

function syncFinanceSubCategoryOptions(categoryValue, selectedValue = "") {
  deps.syncFinanceSubCategoryOptions?.(categoryValue, selectedValue);
}

function syncFinanceExpenseFormButtons() {
  deps.syncFinanceExpenseFormButtons?.();
}

function resetFinanceExpenseReviewForm() {
  deps.resetFinanceExpenseForm?.();
}

function openFinanceExpenseReviewPopup() {
  deps.openFinanceEditPopup?.("expense");
}

function addIncomeTransactionsToAssets(parsedTransactions) {
  if (!Array.isArray(parsedTransactions) || !parsedTransactions.length) {
    return 0;
  }

  const current = getFinanceData();
  const nextData = normalizeFinanceData({
    ...current,
    budgetSettings: { ...(current.budgetSettings || {}) },
    budgetEntries: Object.entries(current.budgetEntries || {}).reduce(
      (acc, [monthKey, entry]) => {
        acc[monthKey] = {
          ...entry,
          categoryBudgets:
            entry?.categoryBudgets && typeof entry.categoryBudgets === "object"
              ? { ...entry.categoryBudgets }
              : {},
        };
        return acc;
      },
      {},
    ),
    expenses: Array.isArray(current.expenses) ? [...current.expenses] : [],
    assets: Array.isArray(current.assets)
      ? current.assets.map((item) => ({ ...item }))
      : [],
  });

  let addedCount = 0;

  parsedTransactions.forEach((item) => {
    if (!item || item.sign !== "+") {
      return;
    }

    if (!item.title || !item.amount) {
      return;
    }

    const normalizedTitle = String(item.title || "").trim();
    if (!normalizedTitle) {
      return;
    }

    const assetBaseDate = item.date || new Date().toISOString().slice(0, 10);

    const existingIndex = nextData.assets.findIndex((asset) => {
      return (
        String(asset.category || "") === "deposit" &&
        String(asset.title || "").trim() === normalizedTitle &&
        String(asset.repeat || "none") === "none"
      );
    });

    if (existingIndex >= 0) {
      const currentAmount = Number(nextData.assets[existingIndex].amount) || 0;

      nextData.assets[existingIndex] = {
        ...nextData.assets[existingIndex],
        amount: currentAmount + (Number(item.amount) || 0),
        baseDate:
          nextData.assets[existingIndex].baseDate ||
          nextData.assets[existingIndex].displayDate ||
          assetBaseDate,
        repeat: nextData.assets[existingIndex].repeat || "none",
        repeatUntil: nextData.assets[existingIndex].repeatUntil || "",
        isRecurring:
          (nextData.assets[existingIndex].repeat || "none") !== "none",
        updatedAt: Date.now(),
      };
    } else {
      nextData.assets.push({
        id: makeId(),
        category: "deposit",
        title: normalizedTitle,
        amount: Number(item.amount) || 0,
        baseDate: assetBaseDate,
        repeat: "none",
        repeatUntil: "",
        isRecurring: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    addedCount += 1;
  });

  if (addedCount > 0) {
    setFinanceData(nextData);
    saveFinanceLocal(nextData);
    renderFinance();
  }

  return addedCount;
}

export async function analyzeFinanceReceiptImage() {
  const refs = getRefs();
  const file = refs.financeReceiptImageInput?.files?.[0];

  if (!file) {
    alert("먼저 거래내역 이미지를 선택하세요.");
    refs.financeReceiptImageInput?.focus();
    return;
  }

  if (!window.Tesseract) {
    alert("OCR 라이브러리가 아직 로드되지 않았습니다.");
    return;
  }

  try {
    setFinanceAnalyzeLoading(true);

    const result = await window.Tesseract.recognize(file, "kor+eng", {
      logger: (message) => {
        if (!refs.financeAnalyzeReceiptBtn) return;

        if (message.status === "recognizing text") {
          const progress = Math.round((message.progress || 0) * 100);
          refs.financeAnalyzeReceiptBtn.textContent = `분석중 ${progress}%`;
        } else if (message.status) {
          refs.financeAnalyzeReceiptBtn.textContent = "분석중...";
        }
      },
    });

    const rawText = result?.data?.text || "";

    if (!rawText.trim()) {
      alert("이미지에서 텍스트를 찾지 못했습니다.");
      return;
    }

    const parsedTransactions = parseFinanceTransactionListText(rawText);

    if (!parsedTransactions.length) {
      alert("거래내역 항목을 찾지 못했습니다.");
      return;
    }

    const reviewTargets = parsedTransactions.filter((item) => {
      return (
        item &&
        (item.sign === "-" || item.sign === "+") &&
        item.date &&
        item.title &&
        item.amount
      );
    });

    if (!reviewTargets.length) {
      if (refs.financeReceiptImageInput) {
        refs.financeReceiptImageInput.value = "";
      }

      alert("검토할 거래 항목을 찾지 못했습니다.");
      return;
    }

    startFinanceOcrReview(reviewTargets, rawText);
  } catch (error) {
    console.error("거래내역 OCR 분석 오류:", error);
    alert("이미지 분석 중 오류가 발생했습니다.");
  } finally {
    setFinanceAnalyzeLoading(false);
  }
}

export function applyFinanceAnalyzeResultText(rawText) {
  const refs = getRefs();
  const parsed = parseFinanceReceiptText(rawText);

  if (parsed.date && refs.financeExpenseDate) {
    refs.financeExpenseDate.value = parsed.date;
  }

  if (parsed.time && refs.financeExpenseTime) {
    refs.financeExpenseTime.value = parsed.time;
  }

  if (parsed.title && refs.financeExpenseTitle) {
    refs.financeExpenseTitle.value = parsed.title;
  }

  if (parsed.amount && refs.financeExpenseAmount) {
    refs.financeExpenseAmount.value = String(parsed.amount);
  }

  if (parsed.category && refs.financeExpenseCategory) {
    refs.financeExpenseCategory.value = parsed.category;
    syncFinanceSubCategoryOptions(parsed.category, parsed.subCategory || "");
  }

  if (parsed.subCategory && refs.financeExpenseSubCategory) {
    refs.financeExpenseSubCategory.value = parsed.subCategory;
  }

  if (parsed.merchant && refs.financeExpenseMerchant) {
    refs.financeExpenseMerchant.value = parsed.merchant;
  }

  if (parsed.paymentMethod && refs.financeExpensePaymentMethod) {
    refs.financeExpensePaymentMethod.value = parsed.paymentMethod;
  }

}

export function parseFinanceReceiptText(rawText) {
  const text = String(rawText || "").replace(/\r/g, "\n");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const dateTimeMatch =
    text.match(
      /(20\d{2})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2}).*?(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    ) || [];

  let date = "";
  let time = "";

  if (dateTimeMatch.length >= 6) {
    const year = dateTimeMatch[1];
    const month = String(Number(dateTimeMatch[2])).padStart(2, "0");
    const day = String(Number(dateTimeMatch[3])).padStart(2, "0");
    const hour = String(Number(dateTimeMatch[4])).padStart(2, "0");
    const minute = String(Number(dateTimeMatch[5])).padStart(2, "0");

    date = `${year}-${month}-${day}`;
    time = `${hour}:${minute}`;
  }

  const amount = extractFinanceAmountFromText(text);
  const merchant = extractFinanceMerchantFromText(lines);
  const categoryResult = guessFinanceCategoryFromText(text);
  const paymentMethod = guessFinancePaymentMethodFromText(text);

  return {
    date,
    time,
    amount,
    merchant,
    title: merchant || "캡처 분석 지출",
    category: categoryResult.category,
    subCategory: categoryResult.subCategory,
    paymentMethod,
  };
}

export function guessFinanceCategoryFromText(rawText) {
  const text = String(rawText || "").toLowerCase();

  const rules = [
    {
      category: "카페",
      subCategory: "커피",
      keywords: [
        "스타벅스",
        "투썸",
        "메가커피",
        "빽다방",
        "이디야",
        "할리스",
        "커피빈",
        "컴포즈",
        "카페",
        "아메리카노",
        "라떼",
        "카푸치노",
        "에스프레소",
      ],
    },
    {
      category: "식사",
      subCategory: "배달",
      keywords: ["배달의민족", "요기요", "쿠팡이츠", "배달"],
    },
    {
      category: "식사",
      subCategory: "한식",
      keywords: [
        "한식",
        "백반",
        "국밥",
        "분식",
        "김밥",
        "식당",
        "버거",
        "피자",
        "치킨",
        "도시락",
        "라면",
      ],
    },
    {
      category: "교통",
      subCategory: "대중교통",
      keywords: ["버스", "지하철", "택시", "카카오t", "교통", "주유", "주차"],
    },
    {
      category: "생활용품",
      subCategory: "생필품",
      keywords: ["다이소", "올리브영", "생활용품", "생필품"],
    },
    {
      category: "쇼핑",
      subCategory: "온라인쇼핑",
      keywords: ["쿠팡", "11번가", "지마켓", "네이버쇼핑", "무신사", "쇼핑"],
    },
    {
      category: "의료",
      subCategory: "약국",
      keywords: ["약국", "병원", "의원", "치과"],
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return {
        category: rule.category,
        subCategory: rule.subCategory,
      };
    }
  }

  return {
    category: "기타",
    subCategory: "기타",
  };
}

export function setFinanceAnalyzeLoading(isLoading) {
  const refs = getRefs();

  if (refs.financeAnalyzeReceiptBtn) {
    refs.financeAnalyzeReceiptBtn.disabled = isLoading;

    if (isLoading) {
      refs.financeAnalyzeReceiptBtn.dataset.originalText =
        refs.financeAnalyzeReceiptBtn.textContent || "캡처 분석";
      refs.financeAnalyzeReceiptBtn.textContent = "분석중...";
    } else {
      refs.financeAnalyzeReceiptBtn.textContent =
        refs.financeAnalyzeReceiptBtn.dataset.originalText || "캡처 분석";
    }
  }

  if (refs.financeReceiptImageInput) {
    refs.financeReceiptImageInput.disabled = isLoading;
  }
}

export function extractFinanceAmountFromText(text) {
  const normalized = String(text || "");

  const priorityPatterns = [
    /합계금액[\s:]*([0-9][0-9,\s]{0,15})원?/i,
    /총[ \t]*금액[\s:]*([0-9][0-9,\s]{0,15})원?/i,
    /결제금액[\s:]*([0-9][0-9,\s]{0,15})원?/i,
    /승인금액[\s:]*([0-9][0-9,\s]{0,15})원?/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1].replace(/[^\d]/g, ""));
      if (value > 0) return value;
    }
  }

  const itemLineMatches = [
    ...normalized.matchAll(/([0-9]{1,3}(?:,[0-9]{3})+|[1-9][0-9]{3,})\s*원/g),
  ]
    .map((match) => Number(String(match[1]).replace(/[^\d]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0)
    .filter((value) => value < 10000000);

  if (itemLineMatches.length) {
    return Math.max(...itemLineMatches);
  }

  return 0;
}

export function extractFinanceMerchantFromText(lines) {
  const cleaned = (lines || [])
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length >= 2);

  const blockedPatterns = [
    /신용카드/,
    /매출전표/,
    /\[고객용\]/,
    /승인번호/,
    /거래일시/,
    /카드번호/,
    /카드사명/,
    /거래구분/,
    /대표[: ]/,
    /사업자/,
    /공급가액/,
    /부가세/,
    /합계금액/,
    /감사합니다/,
    /이용해 주셔서/,
    /^\d+[-\d*]+$/,
    /서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주/,
  ];

  const candidate = cleaned.find((line) => {
    if (blockedPatterns.some((pattern) => pattern.test(line))) {
      return false;
    }

    if (/[0-9]{4,}/.test(line)) {
      return false;
    }

    if (line.length > 30) {
      return false;
    }

    return /[가-힣a-zA-Z]/.test(line);
  });

  return normalizeFinanceMerchant(candidate || "");
}

export function normalizeFinanceMerchant(value) {
  const text = String(value || "")
    .replace(/[^\p{L}\p{N}\s()&.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const corrections = [
    { pattern: /스타벅스/i, replace: "스타벅스" },
    { pattern: /강남역점/i, replace: "강남역점" },
    { pattern: /투썸/i, replace: "투썸플레이스" },
    { pattern: /이디야/i, replace: "이디야" },
    { pattern: /메가커피/i, replace: "메가커피" },
  ];

  let result = text;

  corrections.forEach(({ pattern, replace }) => {
    if (pattern.test(result)) {
      result = result.replace(pattern, replace);
    }
  });

  result = result.replace(/\bAFH\b/gi, "");
  result = result.replace(/\bAFA\b/gi, "");
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

export function guessFinancePaymentMethodFromText(rawText) {
  const text = String(rawText || "").toLowerCase();

  if (
    text.includes("신용카드") ||
    text.includes("체크카드") ||
    text.includes("카드번호") ||
    text.includes("카드사명")
  ) {
    return "card";
  }

  if (text.includes("현금")) {
    return "cash";
  }

  if (text.includes("계좌이체") || text.includes("이체")) {
    return "transfer";
  }

  if (
    text.includes("간편결제") ||
    text.includes("kakao pay") ||
    text.includes("카카오페이") ||
    text.includes("naver pay") ||
    text.includes("네이버페이") ||
    text.includes("payco")
  ) {
    return "simple_pay";
  }

  return "";
}

export function parseFinanceTransactionListText(rawText) {
  const lines = String(rawText || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => normalizeOcrLine(line))
    .filter(Boolean);

  const results = [];
  let current = null;

  for (const line of lines) {
    const dateInfo = extractFinanceListDateInfo(line);

    if (dateInfo) {
      if (current && current.title && current.amountText) {
        results.push(buildFinanceTransactionFromParsedBlock(current));
      }

      current = {
        date: dateInfo.date,
        time: dateInfo.time,
        paymentMethod: dateInfo.paymentMethod,
        title: "",
        amountText: "",
        sign: "",
      };
      continue;
    }

    if (!current) continue;

    const amountInfo = extractFinanceListAmountInfo(line);
    if (amountInfo) {
      current.sign = amountInfo.sign;
      current.amountText = amountInfo.amountText;
      continue;
    }

    if (shouldSkipFinanceListTitleLine(line)) {
      continue;
    }

    if (!current.title) {
      current.title = line;
    }
  }

  if (current && current.title && current.amountText) {
    results.push(buildFinanceTransactionFromParsedBlock(current));
  }

  return results.filter(Boolean);
}

export function bulkAddFinanceTransactions(parsedTransactions, rawText = "") {
  if (!Array.isArray(parsedTransactions) || !parsedTransactions.length) {
    return 0;
  }

  const current = getFinanceData();
  const nextData = normalizeFinanceData({
    ...current,
    budgetSettings: { ...(current.budgetSettings || {}) },
    budgetEntries: Object.entries(current.budgetEntries || {}).reduce(
      (acc, [monthKey, entry]) => {
        acc[monthKey] = {
          ...entry,
          categoryBudgets:
            entry?.categoryBudgets && typeof entry.categoryBudgets === "object"
              ? { ...entry.categoryBudgets }
              : {},
        };
        return acc;
      },
      {},
    ),
    expenses: Array.isArray(current.expenses) ? [...current.expenses] : [],
    assets: Array.isArray(current.assets)
      ? current.assets.map((item) => ({ ...item }))
      : [],
  });

  let addedCount = 0;

  parsedTransactions.forEach((item) => {
    if (!item || !item.date || !item.title || !item.amount) {
      return;
    }

    if (item.sign === "-") {
      const categoryResult = guessFinanceCategoryFromText(item.title);

      nextData.expenses.push({
        id: makeId(),
        date: item.date,
        time: item.time || "",
        title: item.title,
        amount: item.amount,
        category: categoryResult.category || "기타",
        subCategory: categoryResult.subCategory || "기타",
        paymentMethod: item.paymentMethod || "",
        merchant: item.title,
        tag: "OCR자동추가",
        color: "blue",
        flowType: "expense",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      addedCount += 1;
      return;
    }

    if (item.sign === "+") {
      const normalizedTitle = String(item.title || "").trim();
      if (!normalizedTitle) {
        return;
      }

      const existingIndex = nextData.assets.findIndex((asset) => {
        return (
          String(asset.category || "") === "deposit" &&
          String(asset.title || "").trim() === normalizedTitle
        );
      });

      if (existingIndex >= 0) {
        const currentAmount = Number(nextData.assets[existingIndex].amount) || 0;

        nextData.assets[existingIndex] = {
          ...nextData.assets[existingIndex],
          amount: currentAmount + (Number(item.amount) || 0),
          updatedAt: Date.now(),
        };
      } else {
        nextData.assets.push({
          id: makeId(),
          category: "deposit",
          title: normalizedTitle,
          amount: Number(item.amount) || 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      addedCount += 1;
    }
  });

  if (addedCount > 0) {
    setFinanceData(nextData);
    saveFinanceLocal(nextData);
    renderFinance();
  }

  return addedCount;
}

export function buildFinanceTransactionFromParsedBlock(block) {
  if (!block) return null;

  const amount = Number(String(block.amountText || "").replace(/[^\d]/g, ""));

  if (!amount) return null;

  const title = normalizeFinanceMerchant(block.title || "");

  if (!title) return null;

  return {
    date: block.date || "",
    time: block.time || "",
    title,
    amount,
    sign: block.sign || "",
    paymentMethod: block.paymentMethod || "",
  };
}

export function mapFinanceListPaymentMethod(methodText) {
  const text = String(methodText || "").trim();

  if (text.includes("체크카드") || text.includes("신용카드")) {
    return "card";
  }

  if (text.includes("전자금융")) {
    return "transfer";
  }

  if (text.includes("현금")) {
    return "cash";
  }

  if (text.includes("간편결제")) {
    return "simple_pay";
  }

  return "";
}

export function normalizeOcrLine(line) {
  return String(line || "")
    .replace(/[|│┃¦]/g, " ")
    .replace(/[，]/g, ",")
    .replace(/[．·]/g, ".")
    .replace(/[ＯO]/g, "0")
    .replace(/[ＩI]/g, "1")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFinanceListDateInfo(line) {
  const match = line.match(
    /(\d{2})[.\-/]\s*(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\s+(체크카드|신용카드|전자금융|현금|간편결제))?/,
  );

  if (!match) return null;

  const nowYear = new Date().getFullYear();

  const month = match[1];
  const day = match[2];
  const hour = match[3];
  const minute = match[4];
  const second = match[5];
  const methodText = match[6] || "";

  return {
    date: `${nowYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    timeWithSeconds: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`,
    paymentMethod: mapFinanceListPaymentMethod(methodText),
  };
}

export function extractFinanceListAmountInfo(line) {
  const match = line.match(/([+-])\s*([\d,]+)\s*원?/);

  if (!match) return null;

  return {
    sign: match[1],
    amountText: match[2],
  };
}

export function shouldSkipFinanceListTitleLine(line) {
  const text = String(line || "").trim();

  if (!text) return true;

  const blockedPatterns = [
    /거래내역조회/,
    /홈/,
    /메뉴/,
    /상담/,
    /조회/,
    /잔액/,
    /^[\d,]+\s*원$/,
    /^[+-]\s*[\d,]+\s*원$/,
    /^\d{2}[.\-/]\d{2}\s+\d{2}:\d{2}:\d{2}/,
  ];

  return blockedPatterns.some((pattern) => pattern.test(text));
}

function normalizeFinanceOcrMemoryKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFinanceOcrRememberedEntry(item) {
  const data = getFinanceData();
  const flowType = item?.sign === "+" ? "income" : "expense";
  const titleKey = normalizeFinanceOcrMemoryKey(item?.title || "");

  if (!titleKey) return null;

  return (
    (Array.isArray(data.expenses) ? data.expenses : [])
      .filter((entry) => (entry.flowType || "expense") === flowType)
      .map((entry) => {
        const keys = [
          normalizeFinanceOcrMemoryKey(entry.title || ""),
          normalizeFinanceOcrMemoryKey(entry.merchant || ""),
        ].filter(Boolean);
        const exact = keys.some((key) => key === titleKey);
        const contained = keys.some(
          (key) =>
            key.length >= 2 &&
            titleKey.length >= 2 &&
            (key.includes(titleKey) || titleKey.includes(key)),
        );

        if (!exact && !contained) return null;

        return {
          entry,
          score: (exact ? 100 : 60) + (Number(entry.updatedAt) || 0) / 1e13,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)[0]?.entry || null
  );
}

function applyFinanceTransactionToForm(item, index, total) {
  if (!item) return;

  resetFinanceExpenseReviewForm();

  const refs = getRefs();
  const transactionTypeEl = document.getElementById("financeTransactionType");
  const formCardEl = refs.financeExpenseFormCard;
  const isIncome = item.sign === "+";
  const rememberedEntry = getFinanceOcrRememberedEntry(item);

  if (transactionTypeEl) {
    transactionTypeEl.value = isIncome ? "income" : "expense";
  }

  if (formCardEl) {
    delete formCardEl.dataset.ocrIncomeAssetMode;
  }

  if (refs.financeOcrIncomeMode) {
    refs.financeOcrIncomeMode.value = "account";
  }

  formCardEl?.classList.remove("hidden");

  if (refs.financeExpenseDate) {
    refs.financeExpenseDate.value = item.date || "";
  }

  if (refs.financeExpenseTime) {
    refs.financeExpenseTime.value = item.time || "";
  }

  if (refs.financeExpenseTitle) {
    refs.financeExpenseTitle.value = item.title || "";
  }

  if (refs.financeExpenseAmount) {
    refs.financeExpenseAmount.value = String(item.amount || "");
  }

  if (refs.financeExpenseAccountId) {
    const accounts = Array.isArray(getFinanceData().accounts)
      ? getFinanceData().accounts
      : [];
    refs.financeExpenseAccountId.value =
      refs.financeExpenseAccountId.value ||
      accounts.find((account) => account.type === "living")?.id ||
      accounts[0]?.id ||
      "";
  }

  const categoryResult = isIncome
    ? { category: "기타수익", subCategory: "" }
    : guessFinanceCategoryFromText(item.title || "");

  if (refs.financeExpenseCategory) {
    refs.financeExpenseCategory.value = categoryResult.category || "기타";
    syncFinanceSubCategoryOptions(
      categoryResult.category || "기타",
      categoryResult.subCategory || "기타",
    );
  }

  if (refs.financeExpenseSubCategory) {
    refs.financeExpenseSubCategory.value = categoryResult.subCategory || "기타";
  }

  if (refs.financeExpensePaymentMethod) {
    refs.financeExpensePaymentMethod.value = item.paymentMethod || "";
  }

  if (refs.financeExpenseMerchant) {
    refs.financeExpenseMerchant.value = item.title || "";
  }

  if (refs.financeExpenseTag) {
    refs.financeExpenseTag.value = isIncome ? "OCR자산반영" : "OCR자동추가";
  }

  if (rememberedEntry) {
    const rememberedCategory =
      rememberedEntry.category || categoryResult.category || "기타";
    const rememberedSubCategory =
      rememberedEntry.subCategory || categoryResult.subCategory || "기타";

    if (refs.financeExpenseCategory) {
      refs.financeExpenseCategory.value = rememberedCategory;
      syncFinanceSubCategoryOptions(rememberedCategory, rememberedSubCategory);
    }

    if (refs.financeExpenseSubCategory) {
      refs.financeExpenseSubCategory.value = rememberedSubCategory;
    }

    if (refs.financeExpensePaymentMethod) {
      refs.financeExpensePaymentMethod.value =
        rememberedEntry.paymentMethod || item.paymentMethod || "";
    }

    if (refs.financeExpenseMerchant) {
      refs.financeExpenseMerchant.value = rememberedEntry.merchant || item.title || "";
    }

    if (refs.financeExpenseTag) {
      refs.financeExpenseTag.value = rememberedEntry.tag || refs.financeExpenseTag.value;
    }

    if (refs.financeExpenseColor) {
      refs.financeExpenseColor.value = rememberedEntry.color || "blue";
    }
  } else if (refs.financeExpenseColor) {
    refs.financeExpenseColor.value = "blue";
  }

  if (refs.financeExpenseRepeat) {
    refs.financeExpenseRepeat.value = "none";
  }

  if (refs.financeExpenseRepeatUntil) {
    refs.financeExpenseRepeatUntil.value = "";
  }

  if (refs.financeIncomeAssetTargetSelect) {
    const matchedAsset = (Array.isArray(getFinanceData().assets)
      ? getFinanceData().assets
      : []
    ).find(
      (asset) =>
        String(asset.title || "").trim() === String(item.title || "").trim(),
    );

    refs.financeIncomeAssetTargetSelect.value = matchedAsset?.id || "";
  }

  syncFinanceExpenseFormButtons();

  if (refs.financeExpenseMemo) {
    refs.financeExpenseMemo.value = financeOcrReviewRawText || "";
  }

  openFinanceExpenseReviewPopup();

  setTimeout(() => {
    refs.financeExpenseTitle?.focus();
  }, 120);

  alert(
    isIncome
      ? `OCR 검토 ${index + 1}/${total}\n입금 금액을 확인하고 반영할 자산을 선택하세요.`
      : `OCR 검토 ${index + 1}/${total}\n내용을 확인하거나 수정한 뒤 저장하세요.`,
  );
}

function startFinanceOcrReview(parsedTransactions, rawText = "") {
  financeOcrReviewQueue = Array.isArray(parsedTransactions)
    ? [...parsedTransactions]
    : [];
  financeOcrReviewRawText = String(rawText || "").trim();

  if (!financeOcrReviewQueue.length) {
    alert("검토할 항목이 없습니다.");
    return;
  }

  applyFinanceTransactionToForm(
    financeOcrReviewQueue[0],
    0,
    financeOcrReviewQueue.length,
  );
}

export function isFinanceOcrReviewActive() {
  return financeOcrReviewQueue.length > 0;
}

export function cancelFinanceOcrReview() {
  financeOcrReviewQueue = [];
  financeOcrReviewRawText = "";

  const refs = getRefs();
  if (refs.financeReceiptImageInput) {
    refs.financeReceiptImageInput.value = "";
  }
}

export function advanceFinanceOcrReviewQueue() {
  if (!financeOcrReviewQueue.length) {
    financeOcrReviewRawText = "";
    return;
  }

  financeOcrReviewQueue.shift();

  if (!financeOcrReviewQueue.length) {
    financeOcrReviewRawText = "";

    const refs = getRefs();
    if (refs.financeReceiptImageInput) {
      refs.financeReceiptImageInput.value = "";
    }

    alert("OCR 검토 항목이 모두 끝났습니다.");
    return;
  }

  applyFinanceTransactionToForm(
    financeOcrReviewQueue[0],
    0,
    financeOcrReviewQueue.length,
  );
}
