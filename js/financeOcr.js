// financeOcr.js
import { makeId } from "./utils.js";
import { saveFinanceLocal } from "./storage.js";

let deps = {};
let financeOcrReviewQueue = [];
let financeOcrReviewRawText = "";

export function configureFinanceOcrModule(config) {
  deps = config;
}

function getRefs() {
  return deps.refs || {};
}

function getFinanceData() {
  return (
    deps.getFinanceData?.() || {
      monthlyBudgets: {},
      expenses: [],
      assets: [],
    }
  );
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

function addIncomeTransactionsToAssets(parsedTransactions) {
  if (!Array.isArray(parsedTransactions) || !parsedTransactions.length) {
    return 0;
  }

  const current = getFinanceData();

  const nextData = {
    monthlyBudgets: { ...(current.monthlyBudgets || {}) },
    expenses: Array.isArray(current.expenses) ? [...current.expenses] : [],
    assets: Array.isArray(current.assets)
      ? current.assets.map((item) => ({ ...item }))
      : [],
  };

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

    const addedIncomeAssetCount = addIncomeTransactionsToAssets(parsedTransactions);

    const reviewTargets = parsedTransactions.filter((item) => {
      return (
        item &&
        item.sign === "-" &&
        item.date &&
        item.title &&
        item.amount
      );
    });

    if (!reviewTargets.length) {
      if (refs.financeReceiptImageInput) {
        refs.financeReceiptImageInput.value = "";
      }

      if (addedIncomeAssetCount > 0) {
        alert(`입금 ${addedIncomeAssetCount}건을 자산에 자동 반영했습니다.`);
      } else {
        alert("검토할 지출(-금액) 항목을 찾지 못했습니다.");
      }
      return;
    }

    startFinanceOcrReview(reviewTargets, rawText);

    if (addedIncomeAssetCount > 0) {
      setTimeout(() => {
        alert(
          `입금 ${addedIncomeAssetCount}건을 자산에 자동 반영했고,\n지출 ${reviewTargets.length}건은 이어서 검토합니다.`,
        );
      }, 80);
    }
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

  if (rawText && refs.financeExpenseMemo && !refs.financeExpenseMemo.value.trim()) {
    refs.financeExpenseMemo.value = rawText.trim();
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

  const nextData = {
    monthlyBudgets: { ...(current.monthlyBudgets || {}) },
    expenses: Array.isArray(current.expenses) ? [...current.expenses] : [],
    assets: Array.isArray(current.assets)
      ? current.assets.map((item) => ({ ...item }))
      : [],
  };

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

function applyFinanceTransactionToForm(item, index, total) {
  const refs = getRefs();
  if (!item) return;

  const transactionTypeEl = document.getElementById("financeTransactionType");
  const formCardEl = document.getElementById("financeExpenseFormCard");

  if (transactionTypeEl) {
    transactionTypeEl.value = "expense";
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

  const categoryResult = guessFinanceCategoryFromText(item.title || "");

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

  if (refs.financeExpenseMemo) {
    refs.financeExpenseMemo.value = financeOcrReviewRawText || "";
  }

  setTimeout(() => {
    refs.financeExpenseTitle?.focus();
  }, 120);

  alert(
    `OCR 검토 ${index + 1}/${total}\n내용을 확인하거나 수정한 뒤 저장하세요.`,
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

    alert("OCR 검토 항목 저장이 모두 끝났습니다.");
    return;
  }

  applyFinanceTransactionToForm(
    financeOcrReviewQueue[0],
    0,
    financeOcrReviewQueue.length,
  );
}
