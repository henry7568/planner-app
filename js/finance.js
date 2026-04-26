// finance.js
import {
  formatDateKey,
  formatKoreanDate,
  formatMoney,
  makeId,
  escapeHtml,
} from "./utils.js";

import {
  loadFinanceLocal,
  normalizeFinanceData,
  saveFinanceLocal,
} from "./storage.js";

import { COIN_KRW_VALUE, getCoinBalance } from "./rewards.js";
import { parseBankTransactionsFromOcrResult } from "./financeOcr.js";

let deps = {};
let financePage = 1;
let financeEventsBound = false;
let currentAssetRegisterType = "";
let currentTransactionEditId = "";
let currentAssetEditId = "";
let currentRelationshipField = "";
let financeCaptureReviewQueue = [];
let financeCaptureReviewIndex = -1;
let isFinanceCaptureReviewActive = false;
let financeCaptureSelectedFileName = "";
const FINANCE_CATEGORY_STAT_SORT_KEY = "lifePlanner.financeCategoryStatSort";
let financeCategoryStatSort = localStorage.getItem(FINANCE_CATEGORY_STAT_SORT_KEY) || "default";

const LEDGER_PAGE_SIZE = 5;

const ACCOUNT_TYPES = [
  { type: "living", name: "생활비 계좌", icon: "🏠", color: "#2563eb" },
  { type: "savings", name: "적금계좌", icon: "💰", color: "#0f766e" },
  { type: "investment", name: "투자계좌", icon: "📈", color: "#7c3aed" },
  { type: "leisure", name: "여가비 계좌", icon: "🎮", color: "#f59e0b" },
];

const TRANSACTION_TYPES = [
  { value: "expense", label: "지출", sign: -1 },
  { value: "income", label: "입금", sign: 1 },
  { value: "withdrawal", label: "출금", sign: -1 },
  { value: "transfer", label: "이체", sign: 0 },
  { value: "saving", label: "저축", sign: -1 },
  { value: "investment", label: "투자", sign: -1 },
];

const LEDGER_CATEGORIES = [
  "교육",
  "문화/여가",
  "패션/쇼핑",
  "온라인쇼핑",
  "기타",
];

const EXTRA_LEDGER_CATEGORIES = [
  "\uBC30\uB2EC\uC74C\uC2DD",
  "\uC2DD\uB8CC\uD488",
  "\uC0DD\uD65C\uC6A9\uD488",
  "\uAD50\uC721",
  "\uBB38\uD654/\uC5EC\uAC00",
  "\uD328\uC158/\uC1FC\uD551",
  "\uC628\uB77C\uC778\uC1FC\uD551",
  "\uAD50\uD1B5",
  "\uC8FC\uAC70/\uD1B5\uC2E0",
  "\uC758\uB8CC/\uAC74\uAC15",
  "\uAE08\uC735\uC18C\uB4DD",
  "\uC774\uCCB4",
  "\uC785\uAE08",
  "\uAE30\uD0C0",
];

function normalizeLedgerCategory(category = "") {
  const value = String(category || "").trim();
  if (value === "\uC2DD\uBE44") return "\uC678\uC2DD";
  return value || "\uAE30\uD0C0";
}

function getLedgerCategories(selectedCategory = "") {
  const categories = [
    "\uC678\uC2DD",
    "\uCE74\uD398",
    "\uBC30\uB2EC\uC74C\uC2DD",
    "\uC2DD\uB8CC\uD488",
    "\uAC04\uC2DD",
    "\uC220/\uC720\uD765",
    "\uAD6C\uB3C5",
    "\uC1FC\uD551",
    "\uC628\uB77C\uC778\uC1FC\uD551",
    "\uD328\uC158/\uC1FC\uD551",
    "\uBBF8\uC6A9",
    "\uC0DD\uD65C\uC6A9\uD488",
    "\uBB38\uD654/\uC5EC\uAC00",
    "\uAD50\uC721",
    "\uAD50\uD1B5",
    "\uC8FC\uAC70/\uD1B5\uC2E0",
    "\uC758\uB8CC/\uAC74\uAC15",
    "\uC6B4\uB3D9",
    "\uBC18\uB824\uB3D9\uBB3C",
    "\uACBD\uC870\uC0AC",
    "\uC6A9\uB3C8",
    "\uBCF4\uD5D8",
    "\uC138\uAE08",
    "\uAE08\uC735\uC18C\uB4DD",
    "\uC774\uCCB4",
    "\uC785\uAE08",
    "\uAE30\uD0C0",
  ];

  const selected = normalizeLedgerCategory(selectedCategory);
  if (selected && !categories.includes(selected)) {
    return [selected, ...categories];
  }

  return categories;
}

function renderFinanceCategoryPicker(selectedCategory = "\uAE30\uD0C0") {
  const selected = normalizeLedgerCategory(selectedCategory);
  return `
    <div class="finance-category-picker">
      <input type="hidden" name="category" value="${escapeHtml(selected)}" />
      <button class="finance-category-trigger" type="button" data-finance-action="toggle-finance-category">
        <span>${escapeHtml(selected)}</span>
        <b aria-hidden="true">⌄</b>
      </button>
      <div class="finance-category-menu hidden">
        ${getLedgerCategories(selected).map((category) => `
          <button class="finance-category-option ${category === selected ? "selected" : ""}" type="button" data-finance-action="pick-finance-category" data-value="${escapeHtml(category)}">
            ${escapeHtml(category)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

const WHAT_MAIN_OPTIONS = [
  "먹기",
  "놀기",
  "여행",
  "쇼핑/뷰티",
  "경조사",
  "교육",
  "용돈",
  "기타",
];

const WHAT_SUB_OPTIONS = {
  먹기: ["점심먹기", "저녁먹기", "브런치", "커피/음료", "빵/디저트", "술", "기타"],
};

const WHO_OPTIONS = ["나", "가족", "친구", "친척", "직장동료", "기타"];
const HOW_OPTIONS = ["현금", "카드", "계좌이체", "간편결제", "기타"];

export function configureFinanceModule(config) {
  deps = config || {};
}

function getRewardsData() {
  return deps.getRewardsData?.() || {};
}

function getFinanceData() {
  return normalizeFinanceData(deps.getFinanceData?.());
}

function setFinanceData(value) {
  deps.setFinanceData?.(normalizeFinanceData(value));
}

function query(id) {
  return document.getElementById(id);
}

function todayKey() {
  return formatDateKey(new Date());
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
}

function normalizeType(type) {
  if (type === "expense" || type === "income" || type === "transfer") {
    return type;
  }
  if (type === "withdrawal" || type === "saving" || type === "investment") {
    return type;
  }
  return "expense";
}

function getTransactionTypeMeta(type) {
  return (
    TRANSACTION_TYPES.find((item) => item.value === normalizeType(type)) ||
    TRANSACTION_TYPES[0]
  );
}

function getTransactions(data = getFinanceData()) {
  return Array.isArray(data.transactions) ? data.transactions : [];
}

function getAssets(data = getFinanceData()) {
  return Array.isArray(data.assets) ? data.assets : [];
}

function getAccounts(data = getFinanceData()) {
  return Array.isArray(data.accounts) ? data.accounts : [];
}

function getAccountById(accountId, data = getFinanceData()) {
  return getAccounts(data).find((account) => account.id === accountId) || null;
}

function getAssetById(assetId, data = getFinanceData()) {
  return getAssets(data).find((asset) => asset.id === assetId) || null;
}

function getAssetLinkedToAccount(accountId, data = getFinanceData()) {
  if (!accountId) return null;
  return getAssets(data).find((asset) => asset.accountId === accountId) || null;
}

function getResolvedTransactionAssetId(transaction, data = getFinanceData()) {
  if (transaction?.assetId) return transaction.assetId;
  const accountId = transaction?.accountId || "";
  if (!accountId) return "";

  const linkedAssets = getAssets(data).filter((asset) => asset.accountId === accountId);
  return linkedAssets.length === 1 ? linkedAssets[0].id : "";
}

function getTransactionAccountLabel(item, data = getFinanceData()) {
  const asset =
    getAssetById(getResolvedTransactionAssetId(item, data), data) ||
    getAssetLinkedToAccount(item.accountId, data);
  const account = getAccountById(item.accountId, data);
  return asset?.name || asset?.title || account?.name || "계좌 없음";
}

function getAssetTransactionDelta(assetId, data = getFinanceData()) {
  if (!assetId) return 0;

  return getTransactions(data).reduce((sum, transaction) => {
    if (
      !isFinanceV2Transaction(transaction) ||
      getResolvedTransactionAssetId(transaction, data) !== assetId
    ) {
      return sum;
    }

    const amount = Number(transaction.amount) || 0;
    const type = normalizeType(transaction.type || transaction.flowType);

    if (type === "income") return sum + amount;
    if (["expense", "withdrawal", "saving", "investment", "transfer"].includes(type)) {
      return sum - amount;
    }

    return sum;
  }, 0);
}

function getAssetDisplayBalance(asset, data = getFinanceData()) {
  if (!asset) return 0;
  return (Number(asset.amount) || 0) + getAssetTransactionDelta(asset.id, data);
}

function getAssetBaseAmountFromDisplayAmount(assetId, displayAmount, data = getFinanceData()) {
  if (!assetId) return Math.max(0, Number(displayAmount) || 0);
  return (Number(displayAmount) || 0) - getAssetTransactionDelta(assetId, data);
}

function getAccountByType(type, data = getFinanceData()) {
  return getAccounts(data).find((account) => account.type === type) || null;
}

function getDefaultAccountId(type = "living", data = getFinanceData()) {
  return getAccountByType(type, data)?.id || getAccounts(data)[0]?.id || "";
}

function getLeisureCoinLimit() {
  return Math.max(0, Number(getCoinBalance(getRewardsData())) || 0) * COIN_KRW_VALUE;
}

function isFinanceV2Transaction(item) {
  return (
    Number(item?.financeTransactionSchemaVersion) >= 3 ||
    item?.source === "finance-v2"
  );
}

function getAccountComputedBalance(accountId, data = getFinanceData()) {
  if (!accountId) return 0;

  const assetTotal = getAssets(data).reduce((sum, asset) => {
    if (asset.accountId !== accountId) return sum;
    return sum + getAssetDisplayBalance(asset, data);
  }, 0);

  const transactionTotal = getTransactions(data).reduce((sum, transaction) => {
    if (!isFinanceV2Transaction(transaction)) return sum;
    if (getResolvedTransactionAssetId(transaction, data)) return sum;

    const amount = Number(transaction.amount) || 0;
    const type = normalizeType(transaction.type || transaction.flowType);

    if (type === "income" && transaction.accountId === accountId) {
      return sum + amount;
    }

    if (
      ["expense", "withdrawal", "saving", "investment"].includes(type) &&
      transaction.accountId === accountId
    ) {
      return sum - amount;
    }

    if (type === "transfer") {
      if (transaction.accountId === accountId) return sum - amount;
      if (transaction.targetAccountId === accountId) return sum + amount;
    }

    return sum;
  }, 0);

  return assetTotal + transactionTotal;
}

function getAccountDisplayBalance(account, data = getFinanceData()) {
  return getAccountComputedBalance(account?.id, data);
}

function formatCompactMoney(value) {
  const safeValue = Number(value) || 0;
  const absValue = Math.abs(safeValue);

  if (absValue >= 100000) {
    return `${safeValue < 0 ? "-" : ""}${Math.round(absValue / 10000).toLocaleString("ko-KR")}만 원`;
  }

  return formatMoney(safeValue);
}

function formatBudgetDisplayMoney(value) {
  const safeValue = Number(value) || 0;
  const absValue = Math.abs(safeValue);
  const sign = safeValue < 0 ? "-" : "";

  if (absValue >= 1000000000000) {
    return `${sign}${formatScaledNumber(absValue / 1000000000000)} \uC870`;
  }

  if (absValue >= 100000000) {
    return `${sign}${formatScaledNumber(absValue / 100000000)} \uC5B5`;
  }

  if (absValue >= 10000000) {
    return `${sign}${formatScaledNumber(absValue / 10000000)} \uCC9C\uB9CC\uC6D0`;
  }

  if (absValue >= 10000) {
    return `${sign}${formatScaledNumber(absValue / 10000)} \uB9CC\uC6D0`;
  }

  return formatMoney(safeValue);
}

function formatScaledNumber(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return rounded.toLocaleString("ko-KR", {
    maximumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
  });
}

function parseBudgetDisplayMoney(text) {
  const rawText = String(text || "").replace(/\s/g, "");
  const numericText = rawText.match(/-?[0-9,.]+/)?.[0] || "0";
  const numericValue = Number(numericText.replace(/,/g, ""));

  if (!Number.isFinite(numericValue)) return 0;
  if (rawText.includes("\uC870")) return numericValue * 1000000000000;
  if (rawText.includes("\uC5B5")) return numericValue * 100000000;
  if (rawText.includes("\uCC9C\uB9CC")) return numericValue * 10000000;
  if (rawText.includes("\uB9CC")) return numericValue * 10000;
  return numericValue;
}

function saveNextFinanceData(nextData) {
  const normalized = normalizeFinanceData(nextData);
  setFinanceData(normalized);
  saveFinanceLocal(normalized);
  renderFinance();
}

function applyTransactionBalance(accounts, transaction, direction = 1) {
  const amount = Math.max(0, Number(transaction?.amount) || 0);
  if (!amount) return accounts;

  const type = normalizeType(transaction.type || transaction.flowType);
  const fromId = transaction.accountId || "";
  const toId = transaction.targetAccountId || "";
  const hasSourceAsset = Boolean(transaction.assetId);

  return accounts.map((account) => {
    let delta = 0;

    if (!hasSourceAsset && type === "income" && account.id === fromId) {
      delta += amount;
    } else if (!hasSourceAsset && ["expense", "withdrawal", "saving", "investment"].includes(type) && account.id === fromId) {
      delta -= amount;
    } else if (type === "transfer") {
      if (!hasSourceAsset && account.id === fromId) delta -= amount;
      if (account.id === toId) delta += amount;
    }

    if (!delta) return account;

    return {
      ...account,
      balance: (Number(account.balance) || 0) + delta * direction,
      updatedAt: Date.now(),
    };
  });
}

function makeTransactionFromForm(form) {
  const data = getFinanceData();
  const formData = new FormData(form);
  const type = normalizeType(formData.get("type"));
  const accountType =
    type === "saving" ? "savings" : type === "investment" ? "investment" : "living";
  const assetId = String(formData.get("assetId") || "");
  const selectedAsset = getAssetById(assetId, data);

  return {
    id: currentTransactionEditId || makeId(),
    financeTransactionSchemaVersion: 3,
    source: "finance-v2",
    type,
    flowType: type === "income" || type === "transfer" ? type : "expense",
    title: String(formData.get("title") || "").trim(),
    amount: Math.max(0, Number(formData.get("amount")) || 0),
    date: String(formData.get("date") || todayKey()),
    time: String(formData.get("time") || ""),
    category: normalizeLedgerCategory(formData.get("category")),
    assetId,
    accountId:
      selectedAsset?.accountId ||
      String(formData.get("accountId") || "") ||
      getDefaultAccountId(accountType, data),
    targetAccountId: String(formData.get("targetAccountId") || ""),
    paymentMethod: String(formData.get("paymentMethod") || ""),
    merchant: String(formData.get("merchant") || "").trim(),
    memo: "",
    relationshipLedger: {
      withWhom: String(formData.get("withWhom") || "나"),
      what: String(formData.get("what") || ""),
      how: String(formData.get("how") || ""),
      memo: String(formData.get("relationshipMemo") || "").trim(),
    },
    createdAt: Number(form.dataset.createdAt) || Date.now(),
    updatedAt: Date.now(),
  };
}

function makeAssetFromForm(form) {
  const data = getFinanceData();
  const formData = new FormData(form);
  const type = String(formData.get("assetType") || currentAssetRegisterType || "deposit_saving");
  const accountType = type === "investment" ? "investment" : "savings";
  const displayAmount = Math.max(0, Number(formData.get("amount")) || 0);
  const baseAmount = getAssetBaseAmountFromDisplayAmount(currentAssetEditId, displayAmount, data);

  return {
    id: currentAssetEditId || makeId(),
    financeAssetSchemaVersion: 3,
    source: "finance-v2",
    type,
    category: type,
    name: String(formData.get("name") || "").trim(),
    title: String(formData.get("name") || "").trim(),
    amount: baseAmount,
    accountId:
      String(formData.get("accountId") || "") ||
      getDefaultAccountId(accountType, data),
    memo: String(formData.get("memo") || "").trim(),
    baseDate: String(formData.get("baseDate") || todayKey()),
    createdAt: Number(form.dataset.createdAt) || Date.now(),
    updatedAt: Date.now(),
  };
}

function getMonthKey() {
  return query("financeLedgerMonthInput")?.value || todayKey().slice(0, 7);
}

function getMonthlyTransactions() {
  const monthKey = getMonthKey();
  return getTransactions().filter((item) => String(item.date || "").startsWith(monthKey));
}

function getTransactionAmountDirection(item) {
  const type = normalizeType(item.type || item.flowType);
  if (type === "income") return 1;
  if (type === "transfer") return 0;
  return -1;
}

function getExpenseLikeTransactions(list) {
  return list.filter((item) => getTransactionAmountDirection(item) < 0);
}

function getIncomeTransactions(list) {
  return list.filter((item) => getTransactionAmountDirection(item) > 0);
}

function getCategoryTotals(list) {
  return getExpenseLikeTransactions(list).reduce((acc, item) => {
    const key = normalizeLedgerCategory(item.category);
    acc[key] = (acc[key] || 0) + (Number(item.amount) || 0);
    return acc;
  }, {});
}

function renderFinanceShells() {
  const assetTab = query("tab-finance");
  const ledgerTab = query("tab-salary");

  if (assetTab && !assetTab.dataset.financeV2Mounted) {
    assetTab.dataset.financeV2Mounted = "true";
    assetTab.innerHTML = `
      <section class="finance-v2 finance-asset-home" id="financeAssetHomeMount"></section>
      <button id="financeAssetRegisterBtn" class="finance-floating-add" type="button" data-finance-action="open-asset-type-sheet">보유 자산 등록</button>
    `;
  }

  if (ledgerTab && !ledgerTab.dataset.financeV2Mounted) {
    ledgerTab.dataset.financeV2Mounted = "true";
    ledgerTab.innerHTML = `
      <section class="finance-v2 finance-ledger-home" id="financeLedgerHomeMount"></section>
      <button id="financeTransactionAddBtn" class="finance-floating-add" type="button" data-finance-action="open-transaction-form">거래 등록</button>
    `;
  }
}

export function initFinance() {
  const loaded = loadFinanceLocal();
  const normalized = normalizeFinanceData(loaded);
  setFinanceData(normalized);
  renderFinanceShells();
  bindFinanceEvents();
  renderFinance();
}

export function renderFinance() {
  renderFinanceShells();
  renderAssetHome();
  renderLedgerHome();
}

function renderAssetHome() {
  const mount = query("financeAssetHomeMount");
  if (!mount) return;
  const rewardWallet = query("financeRewardWalletSection");

  const data = getFinanceData();
  const accounts = ACCOUNT_TYPES.map((template) => ({
    ...template,
    account: getAccountByType(template.type, data),
  }));
  const totalAccountBalance = accounts.reduce(
    (sum, item) => sum + getAccountDisplayBalance(item.account, data),
    0,
  );
  const assetTotal = getAssets(data).reduce(
    (sum, asset) => sum + getAssetDisplayBalance(asset, data),
    0,
  );
  const leisureAccount = getAccountByType("leisure", data);
  const leisureUsed = getExpenseLikeTransactions(getTransactions(data)).reduce(
    (sum, item) => sum + (item.accountId === leisureAccount?.id ? Number(item.amount) || 0 : 0),
    0,
  );
  const leisureLimit = getLeisureCoinLimit();
  const leisureRemain = leisureLimit - leisureUsed;

  mount.innerHTML = `
    <section class="finance-mobile-hero">
      <div>
        <span class="finance-mini-label">자산 홈</span>
        <h2>총 자산</h2>
      </div>
      <strong>${formatMoney(totalAccountBalance)}</strong>
      <p>생활비, 적금, 투자, 여가비 계좌 합계입니다.</p>
    </section>

    <section class="finance-account-grid" aria-label="자산 계좌">
      ${accounts.map((item) => renderAccountCard(item)).join("")}
    </section>

    <section class="finance-leisure-card">
      <div>
        <span class="finance-mini-label">AI 코인 연동</span>
        <h3>여가비 계좌</h3>
      </div>
      <div class="finance-leisure-lines">
        <span>현재 사용 ${formatMoney(leisureUsed)}</span>
        <span>코인 기준 최대 ${formatMoney(leisureLimit)}</span>
        <strong>남은 사용 가능 ${formatMoney(leisureRemain)}</strong>
      </div>
    </section>

    <section class="finance-reward-wallet-slot" id="financeRewardWalletSlot" aria-label="AI 보상 지갑"></section>

    <section class="finance-section-card">
      <div class="finance-section-title">
        <h3>보유 자산</h3>
        <strong>${formatMoney(assetTotal)}</strong>
      </div>
      <div class="finance-asset-list-v2">
        ${renderAssetRows(getAssets(data))}
      </div>
    </section>
  `;

  const rewardWalletSlot = query("financeRewardWalletSlot");
  if (rewardWallet && rewardWalletSlot) {
    rewardWalletSlot.appendChild(rewardWallet);
  }
}

function renderAccountCard({ type, name, icon, color, account }) {
  const balance = getAccountDisplayBalance(account);
  const accountId = account?.id || "";
  return `
    <button class="finance-account-card-v2" type="button" style="--finance-accent:${color}" data-finance-action="open-account-detail" data-id="${escapeHtml(accountId)}">
      <span class="finance-account-icon">${icon}</span>
      <div>
        <strong>${escapeHtml(account?.name || name)}</strong>
        <small>${escapeHtml(account?.memo || name)}</small>
      </div>
      <b>${formatMoney(balance)}</b>
    </button>
  `;
}

function renderAssetRows(assets) {
  if (!assets.length) {
    return `<p class="finance-empty-text">등록된 보유 자산이 없습니다.</p>`;
  }

  return assets
    .slice()
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .map((asset) => {
      const account = getAccountById(asset.accountId);
      const balance = getAssetDisplayBalance(asset);
      return `
        <button class="finance-compact-row" type="button" data-finance-action="open-asset-form" data-id="${escapeHtml(asset.id)}">
          <span>${asset.type === "investment" ? "📈" : "💰"}</span>
          <span class="finance-row-main">
            <strong>${escapeHtml(asset.name || asset.title || "이름 없는 자산")}</strong>
            <small>${escapeHtml(account?.name || "연결 계좌 없음")}</small>
          </span>
          <b>${formatMoney(balance)}</b>
        </button>
      `;
    })
    .join("");
}

function openAccountDetailPopup(accountId) {
  const data = getFinanceData();
  const account = getAccountById(accountId, data);
  if (!account) return;

  const assets = getAssets(data).filter((asset) => asset.accountId === accountId);
  const transactions = getTransactions(data)
    .filter(
      (transaction) =>
        transaction.accountId === accountId ||
        transaction.targetAccountId === accountId,
    )
    .sort((a, b) =>
      `${b.date || ""} ${b.time || ""}`.localeCompare(
        `${a.date || ""} ${a.time || ""}`,
      ),
    );
  const balance = getAccountDisplayBalance(account, data);
  const mount = getPopupMount();

  mount.innerHTML = `
    <div class="finance-popup-header">
      <div>
        <h2>${escapeHtml(account.name || "통장")}</h2>
        <p>${escapeHtml(account.memo || account.type || "연결된 항목을 확인합니다.")}</p>
      </div>
      <button class="secondary-btn" type="button" data-finance-action="close-finance-popup">닫기</button>
    </div>

    <section class="finance-detail-hero">
      <span>🏦</span>
      <strong>${formatMoney(balance)}</strong>
      <small>보유 자산 ${assets.length}건 · 거래 ${transactions.length}건</small>
    </section>

    <section class="finance-account-detail-section">
      <div class="finance-section-title">
        <h3>보유 자산</h3>
        <strong>${formatMoney(assets.reduce((sum, asset) => sum + getAssetDisplayBalance(asset, data), 0))}</strong>
      </div>
      ${renderAccountAssetRows(assets)}
    </section>

    <section class="finance-account-detail-section">
      <div class="finance-section-title">
        <h3>거래 내역</h3>
        <strong>${transactions.length}건</strong>
      </div>
      ${renderAccountTransactionRows(transactions, accountId)}
    </section>
  `;
  openPopupOverlay();
}

function renderAccountAssetRows(assets) {
  if (!assets.length) {
    return `<p class="finance-empty-text">연결된 보유 자산이 없습니다.</p>`;
  }

  return assets
    .map(
      (asset) => {
        const balance = getAssetDisplayBalance(asset);
        return `
        <button class="finance-compact-row" type="button" data-finance-action="open-asset-form" data-id="${escapeHtml(asset.id)}">
          <span>${asset.type === "investment" ? "📈" : "💰"}</span>
          <span class="finance-row-main">
            <strong>${escapeHtml(asset.name || asset.title || "이름 없는 자산")}</strong>
            <small>${escapeHtml(asset.baseDate || "기준일 없음")}</small>
          </span>
          <b>${formatMoney(balance)}</b>
        </button>
      `;
      },
    )
    .join("");
}

function renderAccountTransactionRows(transactions, accountId) {
  if (!transactions.length) {
    return `<p class="finance-empty-text">연결된 거래가 없습니다.</p>`;
  }

  return transactions
    .slice(0, 30)
    .map((transaction) => {
      const type = normalizeType(transaction.type || transaction.flowType);
      const isIncoming =
        type === "income" ||
        (type === "transfer" && transaction.targetAccountId === accountId);
      const isOutgoing =
        ["expense", "withdrawal", "saving", "investment"].includes(type) ||
        (type === "transfer" && transaction.accountId === accountId);
      const sign = isIncoming ? "+" : isOutgoing ? "-" : "";
      const amountClass = isIncoming ? "is-income" : isOutgoing ? "is-expense" : "";

      return `
        <button class="finance-transaction-row" type="button" data-finance-action="open-transaction-detail" data-id="${escapeHtml(transaction.id)}">
          <span class="finance-transaction-icon">${isIncoming ? "↗" : "↘"}</span>
          <span class="finance-row-main">
            <strong>${escapeHtml(transaction.title || transaction.merchant || "거래")}</strong>
            <small>${escapeHtml(transaction.date || "날짜 없음")} ${escapeHtml(transaction.time || "")}</small>
          </span>
          <b class="${amountClass}">${sign}${formatMoney(transaction.amount)}</b>
        </button>
      `;
    })
    .join("");
}

function getDefaultCaptureAccountId(type = "expense") {
  if (type === "income") return getDefaultAccountId("living");
  if (type === "transfer") return getDefaultAccountId("living");
  return getDefaultAccountId("living");
}

function toTransactionFormItem(item = {}) {
  const type = normalizeType(item.type || item.flowType || "expense");
  return {
    ...item,
    type,
    flowType: type === "income" || type === "transfer" ? type : "expense",
    accountId: item.accountId || getDefaultCaptureAccountId(type),
    date: item.date || todayKey(),
    time: item.time || "",
    category: normalizeLedgerCategory(item.category),
    paymentMethod: item.paymentMethod || "",
  };
}

function getFinanceBudgetAmount(monthKey) {
  const entry = getFinanceData().budgetEntries?.[monthKey];
  return Math.max(0, Number(entry?.totalBudget ?? entry?.budget ?? 0) || 0);
}

function saveFinanceBudgetAmount(monthKey, amount) {
  if (!monthKey) return;

  const data = getFinanceData();
  const currentEntry = data.budgetEntries?.[monthKey] || {};
  const nextData = {
    ...data,
    budgetEntries: {
      ...(data.budgetEntries || {}),
      [monthKey]: {
        ...currentEntry,
        monthKey,
        startDay:
          Number(currentEntry.startDay) ||
          Number(data.budgetSettings?.defaultStartDay) ||
          1,
        totalBudget: Math.max(0, Number(amount) || 0),
        categoryBudgets:
          currentEntry.categoryBudgets &&
          typeof currentEntry.categoryBudgets === "object"
            ? { ...currentEntry.categoryBudgets }
            : {},
        note: currentEntry.note || "",
        createdAt: Number(currentEntry.createdAt) || Date.now(),
        updatedAt: Date.now(),
      },
    },
  };

  saveNextFinanceData(nextData);
}

function startLedgerBudgetInlineEdit() {
  const editor = query("financeLedgerBudgetEditor");
  const value = query("financeLedgerBudgetValue");
  if (!editor || !value) return;

  editor.classList.add("is-editing");
  value.dataset.beforeEdit = value.textContent || "";
  value.setAttribute("contenteditable", "true");
  value.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(value);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function commitLedgerBudgetInlineEdit() {
  const value = query("financeLedgerBudgetValue");
  if (!value || value.getAttribute("contenteditable") !== "true") return;

  const amount = parseBudgetDisplayMoney(value.textContent);
  if (!Number.isFinite(amount)) {
    renderLedgerHome();
    return;
  }

  saveFinanceBudgetAmount(getMonthKey(), amount);
}

function renderLedgerHome() {
  const mount = query("financeLedgerHomeMount");
  if (!mount) return;

  const monthKey = getMonthKey();
  const monthly = getMonthlyTransactions();
  const incomeTotal = getIncomeTransactions(monthly).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const expenseTotal = getExpenseLikeTransactions(monthly).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const budgetAmount = getFinanceBudgetAmount(monthKey);
  const budgetRemain = budgetAmount - expenseTotal;
  const budgetDisplayText = formatBudgetDisplayMoney(budgetAmount);
  const categoryTotals = getCategoryTotals(monthly);
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const monthLabel = `${Number(monthKey.slice(5, 7)) || new Date().getMonth() + 1}월`;

  mount.innerHTML = `
    <section class="finance-ledger-summary">
      <div class="finance-ledger-topline">
        <button class="finance-month-button" type="button" data-finance-action="prev-ledger-month">‹</button>
        <label class="finance-month-picker-label">
          <span>${monthLabel}</span>
          <input id="financeLedgerMonthInput" type="month" value="${escapeHtml(monthKey)}" aria-label="가계부 월 선택" />
        </label>
        <button class="finance-month-button" type="button" data-finance-action="next-ledger-month">›</button>
      </div>
      <div class="finance-ledger-total-grid">
        <div><span>수입</span><strong>${formatCompactMoney(incomeTotal)}</strong></div>
        <div id="financeLedgerBudgetEditor" class="finance-ledger-budget-cell">
          <div id="financeLedgerBudgetDisplay" class="finance-ledger-budget-text" role="button" tabindex="0" data-finance-action="edit-ledger-budget">
            <span>이번 달 예산</span>
            <strong id="financeLedgerBudgetValue">${budgetDisplayText}</strong>
            ${budgetAmount ? `<small>남은 예산 ${formatBudgetDisplayMoney(budgetRemain)}</small>` : `<small>눌러서 수정</small>`}
          </div>
        </div>
        <div><span>지출</span><strong>${formatCompactMoney(expenseTotal)}</strong></div>
      </div>
      <p>주요 카테고리 ${topCategory ? `${escapeHtml(topCategory[0])} ${Math.round((topCategory[1] / Math.max(expenseTotal, 1)) * 100)}%` : "없음"}</p>
    </section>

    <section class="finance-section-card">
      <div class="finance-section-title">
        <h3>월별 지출 통계</h3>
        <div class="finance-stat-sort">
          <strong>${formatCompactMoney(expenseTotal)}</strong>
          <select id="financeCategoryStatSortSelect" aria-label="카테고리 통계 정렬">
            <option value="default" ${financeCategoryStatSort === "default" ? "selected" : ""}>기본순</option>
            <option value="amount-desc" ${financeCategoryStatSort === "amount-desc" ? "selected" : ""}>금액 높은순</option>
            <option value="amount-asc" ${financeCategoryStatSort === "amount-asc" ? "selected" : ""}>금액 낮은순</option>
            <option value="name" ${financeCategoryStatSort === "name" ? "selected" : ""}>이름순</option>
          </select>
        </div>
      </div>
      <div class="finance-ratio-list">${renderCategoryRatios(categoryTotals, expenseTotal)}</div>
    </section>

    <section class="finance-section-card">
      <div class="finance-section-title">
        <h3>거래 목록</h3>
        <strong>${monthly.length}건</strong>
      </div>
      <div id="financeLedgerTransactionList">
        ${renderTransactionDateGroups(monthly)}
      </div>
      ${renderLedgerPagination(monthly.length)}
    </section>
  `;
}

function renderCategoryRatios(categoryTotals, expenseTotal) {
  let entries = getLedgerCategories().map((category) => [
    category,
    categoryTotals[category] || 0,
  ]).filter(([, value]) => value > 0);

  if (!entries.length) {
    return `<p class="finance-empty-text">이번 달 지출 데이터가 없습니다.</p>`;
  }

  if (financeCategoryStatSort === "amount-desc") {
    entries = entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  } else if (financeCategoryStatSort === "amount-asc") {
    entries = entries.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "ko"));
  } else if (financeCategoryStatSort === "name") {
    entries = entries.sort((a, b) => a[0].localeCompare(b[0], "ko"));
  }

  return entries
    .map(([category, value]) => {
      const ratio = Math.round((value / Math.max(expenseTotal, 1)) * 100);
      return `
        <button class="finance-ratio-row finance-ratio-button" type="button" data-finance-action="open-category-transactions" data-category="${escapeHtml(category)}">
          <span>${escapeHtml(category)}</span>
          <div><i style="width:${ratio}%"></i></div>
          <b>${ratio}%</b>
        </button>
      `;
    })
    .join("");
}

function getCategoryTransactionsForMonth(category, monthKey = getMonthKey()) {
  const normalizedCategory = normalizeLedgerCategory(category);

  return getExpenseLikeTransactions(getTransactions())
    .filter((item) => String(item.date || "").startsWith(monthKey))
    .filter((item) => normalizeLedgerCategory(item.category) === normalizedCategory)
    .sort((a, b) => `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`));
}

function openFinanceCategoryTransactionsPopup(category = "") {
  const normalizedCategory = normalizeLedgerCategory(category);
  const monthKey = getMonthKey();
  const items = getCategoryTransactionsForMonth(normalizedCategory, monthKey);
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const mount = getPopupMount();

  mount.innerHTML = `
    <div class="finance-detail-view finance-category-detail-view">
      <div class="finance-popup-header">
        <div>
          <span class="finance-form-badge">월별 지출 통계</span>
          <h2>${escapeHtml(normalizedCategory)}</h2>
          <p>${escapeHtml(monthKey)} · ${items.length}건 · ${formatMoney(total)}</p>
        </div>
        <button class="secondary-btn" type="button" data-finance-action="close-finance-popup">닫기</button>
      </div>
      <div class="finance-category-transaction-list">
        ${
          items.length
            ? items.map(renderCategoryTransactionPopupRow).join("")
            : `<p class="finance-empty-text">해당 카테고리 거래가 없습니다.</p>`
        }
      </div>
    </div>
  `;
  openPopupOverlay();
}

function renderCategoryTransactionPopupRow(item) {
  const accountLabel = getTransactionAccountLabel(item);
  const direction = getTransactionAmountDirection(item);
  const iconType = direction > 0 ? "income" : "expense";
  const icon = direction > 0 ? "↗" : "↘";
  const sign = direction > 0 ? "+" : direction < 0 ? "-" : "";

  return `
    <button class="finance-category-transaction-row" type="button" data-finance-action="open-transaction-detail" data-id="${escapeHtml(item.id)}">
      <span class="finance-transaction-icon is-${iconType}" aria-hidden="true">${icon}</span>
      <span class="finance-row-main">
        <strong>${escapeHtml(item.title || item.merchant || "거래")}</strong>
        <small>${escapeHtml(item.date || "날짜 없음")} ${escapeHtml(item.time || "")} · ${escapeHtml(item.paymentMethod || accountLabel)}</small>
      </span>
      <b class="${direction > 0 ? "is-income" : "is-expense"}">${sign}${formatMoney(item.amount)}</b>
    </button>
  `;
}

function formatLedgerDateHeader(dateKey) {
  if (!dateKey || dateKey === "날짜 없음") return "날짜 없음";

  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getMonth() + 1}월 ${date.getDate()}일(${weekdays[date.getDay()]})`;
}

function renderTransactionDateGroups(transactions) {
  const sorted = transactions
    .slice()
    .sort((a, b) => `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`));
  const startIndex = (financePage - 1) * LEDGER_PAGE_SIZE;
  const visible = sorted.slice(startIndex, startIndex + LEDGER_PAGE_SIZE);

  if (!visible.length) {
    return `<p class="finance-empty-text">거래 내역이 없습니다.</p>`;
  }

  const groups = visible.reduce((acc, item) => {
    const key = item.date || "날짜 없음";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([date, items]) => {
      const income = getIncomeTransactions(items).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const expense = getExpenseLikeTransactions(items).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      return `
        <section class="finance-date-group">
          <header>
            <strong>${formatLedgerDateHeader(date)}</strong>
            <span>
              ${income ? `<b class="is-income">+${formatMoney(income)}</b>` : ""}
              ${expense ? `<b class="is-expense">-${formatMoney(expense)}</b>` : ""}
            </span>
          </header>
          ${items.map(renderTransactionRow).join("")}
        </section>
      `;
    })
    .join("");
}

function renderTransactionRow(item) {
  const typeMeta = getTransactionTypeMeta(item.type || item.flowType);
  const accountLabel = getTransactionAccountLabel(item);
  const categoryLabel = normalizeLedgerCategory(item.category);
  const direction = getTransactionAmountDirection(item);
  const amountClass = direction > 0 ? "is-income" : direction < 0 ? "is-expense" : "";
  const iconType = direction > 0 ? "income" : "expense";
  const icon = direction > 0 ? "↗" : "↘";
  const installment = item.installment || item.cardPlan || "";

  return `
    <button class="finance-transaction-row" type="button" data-finance-action="open-transaction-detail" data-id="${escapeHtml(item.id)}">
      <span class="finance-transaction-icon is-${iconType}" aria-hidden="true">${icon}</span>
      <span class="finance-row-main">
        <strong>${escapeHtml(item.title || item.merchant || typeMeta.label)}</strong>
        <small>${escapeHtml(item.time || "시간 없음")} | ${escapeHtml(categoryLabel)} | ${escapeHtml(item.paymentMethod || accountLabel)}</small>
      </span>
      <span class="finance-transaction-amount">
        <b class="${amountClass}">${direction > 0 ? "+" : direction < 0 ? "-" : ""}${formatMoney(item.amount)}</b>
        ${installment ? `<small>${escapeHtml(installment)}</small>` : ""}
      </span>
    </button>
  `;
}

function renderLedgerPagination(total) {
  const maxPage = Math.max(1, Math.ceil(total / LEDGER_PAGE_SIZE));
  financePage = Math.min(Math.max(1, financePage), maxPage);

  if (maxPage <= 1) return "";

  return `
    <div class="finance-pagination">
      <button class="secondary-btn" type="button" data-finance-action="ledger-page" data-direction="-1" ${financePage <= 1 ? "disabled" : ""}>이전</button>
      <span>${financePage} / ${maxPage}</span>
      <button class="secondary-btn" type="button" data-finance-action="ledger-page" data-direction="1" ${financePage >= maxPage ? "disabled" : ""}>다음</button>
    </div>
  `;
}

function bindFinanceEvents() {
  if (financeEventsBound) return;
  financeEventsBound = true;

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-finance-action]");
    if (!target) {
      closeFinanceCategoryMenus();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (target.dataset.financeAction !== "toggle-finance-category") {
      closeFinanceCategoryMenus(target.closest(".finance-category-picker"));
    }
    handleFinanceAction(target);
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-finance-form]");
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();

    if (form.dataset.financeForm === "transaction") {
      submitTransactionForm(form);
    } else if (form.dataset.financeForm === "asset") {
      submitAssetForm(form);
    }
  }, true);

  document.addEventListener("change", (event) => {
    if (event.target?.id === "financeLedgerMonthInput") {
      financePage = 1;
      renderLedgerHome();
    }

    if (event.target?.id === "financeLedgerBudgetValue") {
      commitLedgerBudgetInlineEdit();
    }

    if (event.target?.id === "financeCategoryStatSortSelect") {
      setFinanceCategoryStatSort(event.target.value || "default");
    }

    if (event.target?.id === "financeCaptureImageInput") {
      financeCaptureSelectedFileName = event.target.files?.[0]?.name || "";
      updateFinanceCaptureFileLabel();
    }
  });

  document.addEventListener("focusout", (event) => {
    if (event.target?.id === "financeLedgerBudgetValue") {
      commitLedgerBudgetInlineEdit();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target?.id !== "financeLedgerBudgetValue") return;

    if (event.key === "Enter") {
      event.preventDefault();
      commitLedgerBudgetInlineEdit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.target.textContent = event.target.dataset.beforeEdit || event.target.textContent;
      renderLedgerHome();
    }
  });
}

function handleFinanceAction(target) {
  const action = target.dataset.financeAction;

  if (action === "open-asset-type-sheet") openAssetTypeSheet();
  if (action === "select-asset-type") openFinanceAssetForm(target.dataset.type || "");
  if (action === "open-asset-form") openFinanceAssetForm("", target.dataset.id || "");
  if (action === "open-account-detail") openAccountDetailPopup(target.dataset.id || "");
  if (action === "open-transaction-form") openFinanceEditPopup("expense");
  if (action === "open-transaction-detail") openTransactionDetail(target.dataset.id);
  if (action === "open-category-transactions") openFinanceCategoryTransactionsPopup(target.dataset.category || "");
  if (action === "edit-transaction") startEditFinanceExpense(target.dataset.id);
  if (action === "delete-transaction") deleteFinanceExpense(target.dataset.id);
  if (action === "delete-asset") deleteEditingFinanceAsset();
  if (action === "close-finance-popup") closeFinanceEditPopup();
  if (action === "relationship-field") openRelationshipPicker(target.dataset.field);
  if (action === "relationship-pick") applyRelationshipPick(target);
  if (action === "show-custom-relationship") showCustomRelationship(target.dataset.field);
  if (action === "save-custom-relationship") saveCustomRelationship(target.dataset.field);
  if (action === "cancel-custom-relationship") openRelationshipPicker(target.dataset.field);
  if (action === "ledger-page") handleFinancePageChange(Number(target.dataset.direction) || 0);
  if (action === "prev-ledger-month") shiftLedgerMonth(-1);
  if (action === "next-ledger-month") shiftLedgerMonth(1);
  if (action === "edit-ledger-budget") startLedgerBudgetInlineEdit();
  if (action === "toggle-finance-category") toggleFinanceCategoryMenu(target);
  if (action === "pick-finance-category") pickFinanceCategory(target);
  if (action === "choose-finance-capture") query("financeCaptureImageInput")?.click();
  if (action === "analyze-finance-capture") analyzeFinanceCaptureImage();
  if (action === "register-current-finance-capture") registerCurrentFinanceCaptureItem();
  if (action === "register-all-finance-capture") registerAllFinanceCaptureItems();
  if (action === "skip-finance-capture") skipFinanceCaptureItem();
  if (action === "cancel-finance-capture") finishFinanceCaptureReviewCancel();
}

function closeFinanceCategoryMenus(exceptPicker = null) {
  document.querySelectorAll(".finance-category-picker").forEach((picker) => {
    if (exceptPicker && picker === exceptPicker) return;
    picker.querySelector(".finance-category-menu")?.classList.add("hidden");
  });
}

function toggleFinanceCategoryMenu(target) {
  const picker = target.closest(".finance-category-picker");
  if (!picker) return;
  const menu = picker.querySelector(".finance-category-menu");
  if (!menu) return;

  const shouldOpen = menu.classList.contains("hidden");
  closeFinanceCategoryMenus(picker);
  menu.classList.toggle("hidden", !shouldOpen);
}

function pickFinanceCategory(target) {
  const picker = target.closest(".finance-category-picker");
  if (!picker) return;

  const value = target.dataset.value || "\uAE30\uD0C0";
  const input = picker.querySelector("input[name='category']");
  const label = picker.querySelector(".finance-category-trigger span");
  if (input) input.value = value;
  if (label) label.textContent = value;

  picker.querySelectorAll(".finance-category-option").forEach((button) => {
    button.classList.toggle("selected", button === target);
  });
  closeFinanceCategoryMenus();
}

function openAssetTypeSheet() {
  const mount = getPopupMount();
  mount.innerHTML = `
    <div class="finance-popup-header finance-register-header">
      <div>
        <h2>자산 등록</h2>
        <p>통장 잔액이 아니라, 따로 보유 중인 자산만 등록합니다.</p>
      </div>
      <button class="secondary-btn" type="button" data-finance-action="close-finance-popup">닫기</button>
    </div>
    <div class="finance-type-grid finance-asset-type-grid">
      <button class="finance-register-type-card" type="button" data-finance-action="select-asset-type" data-type="deposit_saving">
        <span>💰</span>
        <strong>예금·적금</strong>
        <small>만기나 목적이 있는 묶인 돈</small>
      </button>
      <button class="finance-register-type-card" type="button" data-finance-action="select-asset-type" data-type="investment">
        <span>📈</span>
        <strong>투자</strong>
        <small>주식, 펀드, 투자성 자산</small>
      </button>
    </div>
  `;
  openPopupOverlay();
}

function openPopupOverlay() {
  query("financeEditPopupOverlay")?.classList.remove("hidden");
  resetFinancePopupScroll();
}

function resetFinancePopupScroll() {
  const overlay = query("financeEditPopupOverlay");
  const panel = overlay?.querySelector(".finance-edit-popup-panel");
  const mount = query("financeEditPopupMount");

  [overlay, panel, mount].forEach((element) => {
    if (element) element.scrollTop = 0;
  });

  requestAnimationFrame(() => {
    [overlay, panel, mount].forEach((element) => {
      if (element) element.scrollTop = 0;
    });
  });
}

function getPopupMount() {
  const overlay = query("financeEditPopupOverlay");
  let mount = query("financeEditPopupMount");

  if (overlay && overlay.dataset.financeV2Popup !== "true") {
    overlay.dataset.financeV2Popup = "true";
    overlay.innerHTML = `<div class="popup-panel popup-shell finance-edit-popup-panel"><div id="financeEditPopupMount"></div></div>`;
    mount = query("financeEditPopupMount");
  }

  if (!mount && overlay) {
    overlay.innerHTML = `<div class="popup-panel popup-shell finance-edit-popup-panel"><div id="financeEditPopupMount"></div></div>`;
    overlay.dataset.financeV2Popup = "true";
    mount = query("financeEditPopupMount");
  }

  return mount;
}

export function closeFinanceEditPopup() {
  query("financeEditPopupOverlay")?.classList.add("hidden");
  const mount = query("financeEditPopupMount");
  if (mount) mount.innerHTML = "";
  currentAssetRegisterType = "";
  currentTransactionEditId = "";
  currentAssetEditId = "";
  currentRelationshipField = "";
}

export function openFinanceEditPopup(mode = "expense") {
  const type = mode === "income" ? "income" : "expense";
  currentTransactionEditId = "";
  renderTransactionForm({ type, date: todayKey(), time: nowTime() });
  openPopupOverlay();
}

export function openFinanceExpenseForm() {
  openFinanceEditPopup("expense");
}

export function openFinanceExpenseFormForAsset(assetId, flowType = "expense") {
  const asset = getAssets().find((item) => item.id === assetId);
  renderTransactionForm({
    type: normalizeType(flowType),
    title: asset?.name || asset?.title || "",
    category: "기타",
    date: todayKey(),
    assetId: asset?.id || "",
    accountId: asset?.accountId || "",
  });
  openPopupOverlay();
}

export function openFinanceAssetForm(type = "", assetId = "") {
  const existing = getAssets().find((asset) => asset.id === assetId) || null;
  currentAssetRegisterType =
    type === "investment" || type === "deposit_saving"
      ? type
      : existing?.type === "investment"
        ? "investment"
        : "deposit_saving";
  currentAssetEditId = existing?.id || "";

  renderAssetForm(existing);
  openPopupOverlay();
}

function renderTransactionForm(item = {}) {
  const mount = getPopupMount();
  const data = getFinanceData();
  const type = normalizeType(item.type || item.flowType || "expense");
  const relationship = item.relationshipLedger || {};
  currentTransactionEditId = item.id || "";
  const selectedAssetId =
    item.assetId || getAssetLinkedToAccount(item.accountId, data)?.id || "";

  mount.innerHTML = `
    <div class="finance-popup-header finance-register-header">
      <div>
        <span class="finance-form-badge">거래내역</span>
        <h2>${currentTransactionEditId ? "거래 수정" : "거래 등록"}</h2>
        <p>입금, 지출, 출금, 이체처럼 돈이 움직인 기록을 저장합니다.</p>
      </div>
      <button class="secondary-btn" type="button" data-finance-action="close-finance-popup">닫기</button>
    </div>
    <form class="finance-form-v2" data-finance-form="transaction" data-created-at="${Number(item.createdAt) || ""}">
      <section class="finance-form-section">
        <div class="finance-form-section-title">
          <span>1</span>
          <strong>거래 기본 정보</strong>
        </div>
        <div class="finance-form-grid">
          <label>거래 유형
            <select name="type">${TRANSACTION_TYPES.map((meta) => `<option value="${meta.value}" ${type === meta.value ? "selected" : ""}>${meta.label}</option>`).join("")}</select>
          </label>
          <label>금액
            <input name="amount" type="number" min="0" step="1" inputmode="numeric" value="${escapeHtml(item.amount || "")}" placeholder="예: 12000" required />
          </label>
          <label class="finance-form-wide">거래명
            <input name="title" type="text" value="${escapeHtml(item.title || item.merchant || "")}" placeholder="예: 점심, 급여, 카드값" required />
          </label>
          <label>카테고리
            ${renderFinanceCategoryPicker(item.category || "\uAE30\uD0C0")}
          </label>
          <label>거래수단
            <input name="paymentMethod" type="text" value="${escapeHtml(item.paymentMethod || "")}" placeholder="카드, 현금, 계좌이체" />
          </label>
        </div>
      </section>

      <section class="finance-form-section">
        <div class="finance-form-section-title">
          <span>2</span>
          <strong>날짜와 계좌</strong>
        </div>
        <div class="finance-form-grid">
          <label>날짜
            <input name="date" type="date" value="${escapeHtml(item.date || todayKey())}" required />
          </label>
          <label>시간
            <input name="time" type="time" value="${escapeHtml(item.time || "")}" />
          </label>
          <label>거래 자산
            <select name="assetId">${renderAssetAccountOptions(selectedAssetId, data)}</select>
          </label>
          <label>받는 계좌
            <select name="targetAccountId"><option value="">선택 안 함</option>${renderAccountOptions(item.targetAccountId, data, false)}</select>
          </label>
          <label class="finance-form-wide">가맹점 / 거래처
            <input name="merchant" type="text" value="${escapeHtml(item.merchant || "")}" placeholder="예: 스타벅스, 회사, 친구" />
          </label>
        </div>
      </section>

      <section class="finance-form-section finance-capture-section">
        <div class="finance-form-section-title">
          <span>OCR</span>
          <strong>캡처 채우기</strong>
        </div>
        <p class="finance-form-help">은행/카드 앱 거래내역 캡처를 분석해 여러 거래를 한 건씩 검토합니다.</p>
        <div class="finance-capture-actions">
          <input id="financeCaptureImageInput" class="hidden" type="file" accept="image/*" />
          <button class="secondary-btn" type="button" data-finance-action="choose-finance-capture">캡처 선택</button>
          <button id="financeCaptureAnalyzeBtn" class="secondary-btn" type="button" data-finance-action="analyze-finance-capture">캡처 채우기</button>
        </div>
        <div id="financeCaptureReviewStatus" class="finance-capture-review-status"></div>
      </section>

      <section class="finance-relationship-editor">
        <h3>인간관계부</h3>
        ${renderRelationshipField("withWhom", "누구와", relationship.withWhom || "나")}
        ${renderRelationshipField("what", "무엇을", relationship.what || "")}
        ${renderRelationshipField("how", "어떻게", relationship.how || "")}
        <label>메모
          <textarea name="relationshipMemo" rows="2" placeholder="입력 전이에요">${escapeHtml(relationship.memo || "")}</textarea>
        </label>
        <input type="hidden" name="withWhom" value="${escapeHtml(relationship.withWhom || "나")}" />
        <input type="hidden" name="what" value="${escapeHtml(relationship.what || "")}" />
        <input type="hidden" name="how" value="${escapeHtml(relationship.how || "")}" />
      </section>

      <div class="finance-popup-actions">
        <button class="primary-btn" type="submit">${currentTransactionEditId ? "수정 저장" : "저장"}</button>
        <button class="secondary-btn" type="button" data-finance-action="close-finance-popup">취소</button>
        ${currentTransactionEditId ? `<button class="delete-btn" type="button" data-finance-action="delete-transaction" data-id="${escapeHtml(currentTransactionEditId)}">삭제</button>` : ""}
      </div>
    </form>
  `;

  renderFinanceCaptureReviewStatus();
  updateFinanceCaptureFileLabel();
  resetFinancePopupScroll();
}

function updateFinanceCaptureFileLabel() {
  const button = document.querySelector("[data-finance-action='choose-finance-capture']");
  if (!button) return;

  const input = query("financeCaptureImageInput");
  const fileName = input?.files?.[0]?.name || financeCaptureSelectedFileName;
  button.textContent = fileName || "\uCEA1\uCC98 \uC120\uD0DD";
  button.title = fileName || "\uCEA1\uCC98 \uC120\uD0DD";
}

function renderFinanceCaptureReviewStatus() {
  const mount = query("financeCaptureReviewStatus");
  if (!mount) return;

  if (!isFinanceCaptureReviewActive || !financeCaptureReviewQueue.length) {
    mount.innerHTML = "";
    return;
  }

  mount.innerHTML = `
    <div class="finance-capture-review-box">
      <strong>${financeCaptureReviewIndex + 1} / ${financeCaptureReviewQueue.length} 검토 중</strong>
      <div class="finance-capture-review-actions">
        <button class="primary-btn" type="button" data-finance-action="register-current-finance-capture">등록</button>
        <button class="secondary-btn" type="button" data-finance-action="register-all-finance-capture">전체 등록</button>
        <button class="secondary-btn" type="button" data-finance-action="skip-finance-capture">이 항목 건너뛰기</button>
        <button class="secondary-btn" type="button" data-finance-action="cancel-finance-capture">취소</button>
      </div>
    </div>
  `;
}

function setFinanceCaptureLoading(isLoading) {
  const button = query("financeCaptureAnalyzeBtn");
  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading ? "분석 중..." : "캡처 채우기";
}

async function analyzeFinanceCaptureImage() {
  const input = query("financeCaptureImageInput");
  const file = input?.files?.[0];

  if (!file) {
    alert("먼저 거래내역 캡처 이미지를 선택해주세요.");
    input?.focus();
    return;
  }

  if (!window.Tesseract) {
    alert("OCR 라이브러리가 아직 로드되지 않았습니다.");
    return;
  }

  try {
    setFinanceCaptureLoading(true);
    const result = await window.Tesseract.recognize(file, "kor+eng");
    const parsed = parseBankTransactionsFromOcrResult(result?.data || {}, {
      defaultDate: todayKey(),
      year: Number(getMonthKey().slice(0, 4)) || new Date().getFullYear(),
    }).filter((item) => item.title && item.amount);

    if (!parsed.length) {
      alert("거래내역 항목을 찾지 못했습니다.");
      return;
    }

    startFinanceCaptureReview(parsed);
  } catch (error) {
    console.error("거래내역 캡처 OCR 오류:", error);
    alert("캡처 분석 중 오류가 발생했습니다.");
  } finally {
    setFinanceCaptureLoading(false);
  }
}

function getFinanceCaptureDuplicateKey(item, includeTitle = false) {
  const type = normalizeType(item?.type || item?.flowType || "expense");
  const base = [
    item?.date || "",
    item?.time || "",
    Number(item?.amount) || 0,
    type,
  ];
  if (includeTitle) {
    base.push(String(item?.title || item?.merchant || "").replace(/\s+/g, "").toLowerCase());
  }
  return base.join("|");
}

function normalizeFinanceCaptureReviewItems(items) {
  const seen = new Set();

  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      ...toTransactionFormItem(item),
      id: "",
    }))
    .filter((item) => {
      if (!item.title || !item.amount) return false;
      const queueKey = getFinanceCaptureDuplicateKey(item);
      if (seen.has(queueKey)) return false;
      seen.add(queueKey);
      return true;
    });
}

function startFinanceCaptureReview(items) {
  financeCaptureReviewQueue = normalizeFinanceCaptureReviewItems(items);
  financeCaptureReviewIndex = 0;
  isFinanceCaptureReviewActive = true;

  if (!financeCaptureReviewQueue.length) {
    isFinanceCaptureReviewActive = false;
    alert("새로 검토할 거래 항목이 없습니다.");
    return;
  }

  renderFinanceCaptureReviewItem();
}

function renderFinanceCaptureReviewItem() {
  const item = financeCaptureReviewQueue[financeCaptureReviewIndex];

  if (!item) {
    cancelFinanceCaptureReview();
    closeFinanceEditPopup();
    renderFinance();
    return;
  }

  currentTransactionEditId = "";
  renderTransactionForm(item);
}

function advanceFinanceCaptureReview() {
  financeCaptureReviewIndex += 1;

  if (financeCaptureReviewIndex >= financeCaptureReviewQueue.length) {
    const count = financeCaptureReviewQueue.length;
    cancelFinanceCaptureReview();
    closeFinanceEditPopup();
    renderFinance();
    alert(`${count}건의 거래 검토를 마쳤습니다.`);
    return;
  }

  renderFinanceCaptureReviewItem();
}

function skipFinanceCaptureItem() {
  if (!isFinanceCaptureReviewActive) return;
  advanceFinanceCaptureReview();
}

function registerCurrentFinanceCaptureItem() {
  if (!isFinanceCaptureReviewActive) return;

  const form = query("financeEditPopupMount")?.querySelector("[data-finance-form='transaction']");
  if (!form) return;

  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
  } else {
    submitTransactionForm(form);
  }
}

function finishFinanceCaptureReviewCancel() {
  if (!isFinanceCaptureReviewActive) {
    closeFinanceEditPopup();
    return;
  }

  cancelFinanceCaptureReview();
  closeFinanceEditPopup();
  renderFinance();
}

function cancelFinanceCaptureReview() {
  financeCaptureReviewQueue = [];
  financeCaptureReviewIndex = -1;
  isFinanceCaptureReviewActive = false;
  financeCaptureSelectedFileName = "";

  const input = query("financeCaptureImageInput");
  if (input) input.value = "";
  updateFinanceCaptureFileLabel();
}

function saveTransactionDirect(item) {
  const data = getFinanceData();
  let accounts = getAccounts(data).map((account) => ({ ...account }));
  const transactions = getTransactions(data).map((transaction) => ({ ...transaction }));
  const normalized = {
    ...toTransactionFormItem(item),
    id: item.id || makeId(),
    financeTransactionSchemaVersion: 3,
    source: "finance-v2",
    createdAt: Number(item.createdAt) || Date.now(),
    updatedAt: Date.now(),
  };

  transactions.push(normalized);
  accounts = applyTransactionBalance(accounts, normalized, 1);

  saveNextFinanceData({
    ...data,
    accounts,
    transactions,
    expenses: transactions,
  });
}

function registerAllFinanceCaptureItems() {
  if (!isFinanceCaptureReviewActive) return;

  const remaining = financeCaptureReviewQueue.slice(financeCaptureReviewIndex);
  remaining.forEach((item) => saveTransactionDirect(item));
  const count = remaining.length;
  cancelFinanceCaptureReview();
  closeFinanceEditPopup();
  renderFinance();
  alert(`${count}건의 거래를 등록했습니다.`);
}

function renderRelationshipField(field, label, value) {
  return `
    <button class="finance-relationship-row" type="button" data-finance-action="relationship-field" data-field="${field}">
      <span>${label}</span>
      <strong data-relationship-value="${field}">${escapeHtml(value || "입력 전이에요")}</strong>
    </button>
  `;
}

function renderAccountOptions(selectedId = "", data = getFinanceData(), includeEmpty = true) {
  return `${includeEmpty ? `<option value="">선택 안 함</option>` : ""}${getAccounts(data)
    .map((account) => `<option value="${escapeHtml(account.id)}" ${account.id === selectedId ? "selected" : ""}>${escapeHtml(account.name)}</option>`)
    .join("")}`;
}

function renderAssetAccountOptions(selectedId = "", data = getFinanceData(), includeEmpty = true) {
  const assets = getAssets(data);
  const emptyLabel = assets.length ? "선택 안 함" : "보유 자산을 먼저 등록하세요";

  return `${includeEmpty ? `<option value="">${emptyLabel}</option>` : ""}${assets
    .map((asset) => {
      const account = getAccountById(asset.accountId, data);
      const label = account?.name
        ? `${asset.name || asset.title || "이름 없는 자산"} · ${account.name}`
        : asset.name || asset.title || "이름 없는 자산";
      return `<option value="${escapeHtml(asset.id)}" ${asset.id === selectedId ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("")}`;
}

function renderAssetForm(asset = null) {
  const mount = getPopupMount();
  const data = getFinanceData();
  const amountValue = asset ? getAssetDisplayBalance(asset, data) : "";
  const type = currentAssetRegisterType || asset?.type || "deposit_saving";
  const title = type === "investment" ? "투자 등록" : "예금·적금 등록";
  const badge = type === "investment" ? "투자 자산" : "예금·적금";
  const icon = type === "investment" ? "📈" : "💰";

  mount.innerHTML = `
    <div class="finance-popup-header finance-register-header">
      <div>
        <span class="finance-form-badge">${badge}</span>
        <h2>${currentAssetEditId ? "자산 수정" : title}</h2>
        <p>${type === "investment" ? "투자계좌에 연결할 보유 투자 자산을 등록합니다." : "적금계좌에 연결할 예금·적금 자산을 등록합니다."}</p>
      </div>
      <button class="secondary-btn" type="button" data-finance-action="close-finance-popup">닫기</button>
    </div>
    <form class="finance-form-v2" data-finance-form="asset" data-created-at="${Number(asset?.createdAt) || ""}">
      <input type="hidden" name="assetType" value="${escapeHtml(type)}" />
      <section class="finance-asset-form-hero">
        <span>${icon}</span>
        <div>
          <strong>${currentAssetEditId ? "등록된 보유 자산을 수정합니다." : "새 보유 자산을 추가합니다."}</strong>
          <small>입출금 거래가 아니라 현재 보유 중인 자산입니다.</small>
        </div>
      </section>
      <section class="finance-form-section">
        <div class="finance-form-section-title">
          <span>1</span>
          <strong>자산 정보</strong>
        </div>
        <div class="finance-form-grid">
          <label class="finance-form-wide">자산명
            <input name="name" type="text" value="${escapeHtml(asset?.name || asset?.title || "")}" placeholder="${type === "investment" ? "예: 국내 주식" : "예: 청년 적금"}" required />
          </label>
          <label>금액
            <input name="amount" type="number" min="0" step="1" inputmode="numeric" value="${escapeHtml(amountValue)}" placeholder="예: 5000000" required />
          </label>
          <label>기준일
            <input name="baseDate" type="date" value="${escapeHtml(asset?.baseDate || todayKey())}" />
          </label>
        </div>
      </section>
      <section class="finance-form-section">
        <div class="finance-form-section-title">
          <span>2</span>
          <strong>연결 정보</strong>
        </div>
        <label>연결 계좌
          <select name="accountId">${renderAccountOptions(asset?.accountId, data)}</select>
        </label>
        <label>메모
          <textarea name="memo" rows="2" placeholder="메모">${escapeHtml(asset?.memo || "")}</textarea>
        </label>
      </section>
      <div class="finance-popup-actions">
        <button class="primary-btn" type="submit">${currentAssetEditId ? "수정 저장" : "저장"}</button>
        <button class="secondary-btn" type="button" data-finance-action="close-finance-popup">취소</button>
        ${currentAssetEditId ? `<button class="delete-btn" type="button" data-finance-action="delete-asset" data-id="${escapeHtml(currentAssetEditId)}">삭제</button>` : ""}
      </div>
    </form>
  `;
}

function submitTransactionForm(form) {
  const item = makeTransactionFromForm(form);

  if (!item.title || !item.amount) {
    alert("거래명과 금액을 입력해주세요.");
    return;
  }

  const data = getFinanceData();
  let accounts = getAccounts(data).map((account) => ({ ...account }));
  const transactions = getTransactions(data).map((transaction) => ({ ...transaction }));
  const existingIndex = transactions.findIndex((transaction) => transaction.id === item.id);

  if (existingIndex >= 0) {
    accounts = applyTransactionBalance(accounts, transactions[existingIndex], -1);
    transactions[existingIndex] = item;
  } else {
    transactions.push(item);
  }

  accounts = applyTransactionBalance(accounts, item, 1);

  saveNextFinanceData({
    ...data,
    accounts,
    transactions,
    expenses: transactions,
  });

  if (isFinanceCaptureReviewActive) {
    advanceFinanceCaptureReview();
    return;
  }

  closeFinanceEditPopup();
}

function submitAssetForm(form) {
  const asset = makeAssetFromForm(form);

  if (!asset.name || !asset.amount) {
    alert("자산명과 금액을 입력해주세요.");
    return;
  }

  const data = getFinanceData();
  const assets = getAssets(data).map((item) => ({ ...item }));
  const existingIndex = assets.findIndex((item) => item.id === asset.id);

  if (existingIndex >= 0) {
    assets[existingIndex] = asset;
  } else {
    assets.push(asset);
  }

  saveNextFinanceData({ ...data, assets });
  closeFinanceEditPopup();
}

function openTransactionDetail(id) {
  const item = getTransactions().find((transaction) => transaction.id === id);
  if (!item) return;

  const typeMeta = getTransactionTypeMeta(item.type || item.flowType);
  const accountLabel = getTransactionAccountLabel(item);
  const relationship = item.relationshipLedger || {};
  const mount = getPopupMount();

  mount.innerHTML = `
    <div class="finance-detail-view">
      <div class="finance-popup-header">
        <div>
          <h2>${escapeHtml(item.title || item.merchant || "거래")}</h2>
          <p>${typeMeta.label}</p>
        </div>
        <button class="secondary-btn" type="button" data-finance-action="close-finance-popup">닫기</button>
      </div>
      <section class="finance-detail-hero">
        <span>${item.type === "income" ? "↗" : "↘"}</span>
        <strong>${formatMoney(item.amount)}</strong>
        <small>${escapeHtml(item.paymentMethod || accountLabel)} · ${escapeHtml(item.date || "")} ${escapeHtml(item.time || "")}</small>
      </section>
      <section class="finance-relationship-editor">
        <h3>인간관계부</h3>
        ${renderReadOnlyLedgerRow("누구와", relationship.withWhom || "입력 전이에요")}
        ${renderReadOnlyLedgerRow("무엇을", relationship.what || "입력 전이에요")}
        ${renderReadOnlyLedgerRow("어떻게", relationship.how || "입력 전이에요")}
        ${renderReadOnlyLedgerRow("메모", relationship.memo || "입력 전이에요")}
      </section>
      <div class="finance-popup-actions">
        <button class="primary-btn" type="button" data-finance-action="edit-transaction" data-id="${escapeHtml(item.id)}">수정</button>
        <button class="delete-btn" type="button" data-finance-action="delete-transaction" data-id="${escapeHtml(item.id)}">삭제</button>
      </div>
    </div>
  `;
  openPopupOverlay();
}

function renderReadOnlyLedgerRow(label, value) {
  return `
    <div class="finance-relationship-row is-readonly">
      <span>${label}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function openRelationshipPicker(field = "") {
  currentRelationshipField = field;
  const mount = getPopupMount();
  const form = mount.querySelector("[data-finance-form='transaction']");
  if (!form) return;

  const selectedValue = form.querySelector(`[name="${field}"]`)?.value || "";
  const title = field === "withWhom" ? "누구와 함께 하셨나요?" : field === "what" ? "무엇을 하셨나요?" : "어떻게 하셨나요?";
  const options = field === "withWhom" ? WHO_OPTIONS : field === "how" ? HOW_OPTIONS : WHAT_MAIN_OPTIONS;
  const subOptions = field === "what" && (selectedValue === "먹기" || !selectedValue) ? WHAT_SUB_OPTIONS["먹기"] : [];

  const picker = document.createElement("section");
  picker.className = "finance-picker-panel";
  picker.dataset.relationshipPicker = field;
  picker.innerHTML = `
    <div class="finance-popup-header">
      <div>
        <h3>${title}</h3>
        <p>선택된 항목은 저장 시 거래에 함께 남습니다.</p>
      </div>
      <button class="secondary-btn" type="button" data-finance-action="close-finance-popup">닫기</button>
    </div>
    <div class="finance-chip-grid">
      ${options.map((option) => renderPickerChip(field, option, selectedValue)).join("")}
    </div>
    ${subOptions.length ? `<div class="finance-chip-grid is-sub">${subOptions.map((option) => renderPickerChip(field, option, selectedValue)).join("")}</div>` : ""}
    <div class="finance-picker-custom" data-custom-field="${field}">
      <button class="secondary-btn" type="button" data-finance-action="show-custom-relationship" data-field="${field}">추가하기</button>
    </div>
  `;

  form.classList.add("hidden");
  mount.appendChild(picker);
}

function renderPickerChip(field, option, selectedValue) {
  return `
    <button class="${option === selectedValue ? "is-selected" : ""}" type="button" data-finance-action="relationship-pick" data-field="${field}" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>
  `;
}

function applyRelationshipPick(target) {
  const field = target.dataset.field || currentRelationshipField;
  const value = target.dataset.value || "";
  const mount = getPopupMount();
  const form = mount.querySelector("[data-finance-form='transaction']");
  if (!form) return;

  const input = form.querySelector(`[name="${field}"]`);
  const label = form.querySelector(`[data-relationship-value="${field}"]`);
  if (input) input.value = value;
  if (label) label.textContent = value || "입력 전이에요";

  mount.querySelector(`[data-relationship-picker="${field}"]`)?.remove();

  if (field === "what" && WHAT_SUB_OPTIONS[value]) {
    form.classList.remove("hidden");
    openRelationshipPicker(field);
    return;
  }

  form.classList.remove("hidden");
}

function showCustomRelationship(field) {
  const box = getPopupMount().querySelector(`[data-custom-field="${field}"]`);
  if (!box) return;

  box.innerHTML = `
    <input id="financeCustomRelationshipInput" type="text" maxlength="8" placeholder="항목명(8자)" />
    <button class="primary-btn" type="button" data-finance-action="save-custom-relationship" data-field="${field}">저장</button>
    <button class="secondary-btn" type="button" data-finance-action="cancel-custom-relationship" data-field="${field}">취소</button>
  `;
  query("financeCustomRelationshipInput")?.focus();
}

function saveCustomRelationship(field) {
  const value = query("financeCustomRelationshipInput")?.value.trim() || "";
  if (!value) return;
  applyRelationshipPick({ dataset: { field, value } });
}

export function startEditFinanceExpense(id) {
  const item = getTransactions().find((transaction) => transaction.id === id);
  if (!item) return;
  renderTransactionForm(item);
  openPopupOverlay();
}

export function deleteFinanceExpense(id) {
  const targetId = id || currentTransactionEditId;
  if (!targetId) return;

  const data = getFinanceData();
  const transactions = getTransactions(data);
  const target = transactions.find((item) => item.id === targetId);
  if (!target) return;

  const nextTransactions = transactions.filter((item) => item.id !== targetId);
  const accounts = applyTransactionBalance(getAccounts(data), target, -1);

  saveNextFinanceData({
    ...data,
    accounts,
    transactions: nextTransactions,
    expenses: nextTransactions,
  });
  closeFinanceEditPopup();
}

export function deleteEditingFinanceExpense() {
  deleteFinanceExpense(currentTransactionEditId);
}

export function startEditFinanceAsset(id) {
  openFinanceAssetForm("", id);
}

export function deleteEditingFinanceAsset() {
  if (!currentAssetEditId) return;
  const data = getFinanceData();
  saveNextFinanceData({
    ...data,
    assets: getAssets(data).filter((asset) => asset.id !== currentAssetEditId),
  });
  closeFinanceEditPopup();
}

export function handleFinancePageChange(direction) {
  const total = getMonthlyTransactions().length;
  const maxPage = Math.max(1, Math.ceil(total / LEDGER_PAGE_SIZE));
  financePage = Math.min(maxPage, Math.max(1, financePage + direction));
  renderLedgerHome();
}

function shiftLedgerMonth(delta) {
  const input = query("financeLedgerMonthInput");
  const current = input?.value || todayKey().slice(0, 7);
  const [year, month] = current.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  if (input) {
    input.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  financePage = 1;
  renderLedgerHome();
}

function setFinanceCategoryStatSort(value) {
  financeCategoryStatSort = ["default", "amount-desc", "amount-asc", "name"].includes(value)
    ? value
    : "default";
  localStorage.setItem(FINANCE_CATEGORY_STAT_SORT_KEY, financeCategoryStatSort);
  renderLedgerHome();
}

export function saveFinanceExpense() {
  const form = query("financeEditPopupMount")?.querySelector("[data-finance-form='transaction']");
  if (!form) return { ok: false };
  submitTransactionForm(form);
  return { ok: true };
}

export function saveFinanceAsset() {
  const form = query("financeEditPopupMount")?.querySelector("[data-finance-form='asset']");
  if (!form) return { ok: false };
  submitAssetForm(form);
  return { ok: true };
}

export function resetFinanceExpenseForm() {
  currentTransactionEditId = "";
}

export function resetFinanceAssetForm() {
  currentAssetEditId = "";
}

export function saveFinanceBudget() {
  renderFinance();
}

export function syncFinanceSubCategoryOptions() {}
export function syncFinanceExpenseFormButtons() {}
export function renderFinanceExpenseList() {}
export function renderFinanceFilterOptions() {}
export function renderFinanceCategorySummary() {}
export function renderFinanceAccountList() {}
export function renderFinanceAssetFilters() {}
export function renderFinanceAssetDashboard() {}
export function renderFinanceAssetCategorySummary() {}
export function renderFinanceAssetTransactionList() {}

export function saveFinanceAccount() {
  renderFinance();
}

export function resetFinanceAccountForm() {}
export function deleteEditingFinanceAccount() {}
export function startEditFinanceAccount() {}

export function openFinanceAssetSummaryPopup() {
  openAssetTypeSheet();
}

export function openFinanceOverviewSummaryPopup() {
  renderLedgerHome();
}

export function handleFinanceAssetTransactionPageChange(direction) {
  handleFinancePageChange(direction);
}
