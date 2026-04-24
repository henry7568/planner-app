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
  saveFinanceLocal,
  normalizeFinanceData,
} from "./storage.js";

import { COIN_KRW_VALUE, getCoinBalance } from "./rewards.js";
import { renderFinanceExtras } from "./financeExtras.js";

let deps = {};
let financeAssetTransactionPage = 1;
const FINANCE_ASSET_TRANSACTION_PAGE_SIZE = 10;

export function configureFinanceModule(config) {
  deps = config;
}

function getRefs() {
  return deps.refs || {};
}

function getFinanceData() {
  return normalizeFinanceData(deps.getFinanceData?.());
}

function getRewardsData() {
  return deps.getRewardsData?.() || {};
}

function setFinanceData(value) {
  deps.setFinanceData?.(value);
}

function getFinanceEditingExpenseId() {
  return deps.getFinanceEditingExpenseId?.() || null;
}

function getFinanceEditingAssetId() {
  return deps.getFinanceEditingAssetId?.() || null;
}

function setFinanceEditingAssetId(value) {
  deps.setFinanceEditingAssetId?.(value);
}

function setFinanceEditingExpenseId(value) {
  deps.setFinanceEditingExpenseId?.(value);
}

function getFinanceAccounts() {
  return Array.isArray(getFinanceData().accounts) ? getFinanceData().accounts : [];
}

function getFinanceAccountById(accountId) {
  return getFinanceAccounts().find((item) => item.id === accountId) || null;
}

function getFinanceAccountName(accountId) {
  return getFinanceAccountById(accountId)?.name || "";
}

function getDefaultFinanceAccountId(type = "living") {
  const accounts = getFinanceAccounts();
  return (
    accounts.find((item) => item.type === type)?.id ||
    accounts[0]?.id ||
    ""
  );
}

function applyFinanceTransactionToAccounts(accounts, transaction, direction = 1) {
  const amount = Math.max(0, Number(transaction?.amount) || 0);
  const flowType = transaction?.flowType || "expense";

  if (!amount || transaction?.repeat !== "none") {
    return accounts;
  }

  return accounts.map((account) => {
    let delta = 0;

    if (flowType === "income" && account.id === transaction.accountId) {
      delta = amount;
    } else if (flowType === "expense" && account.id === transaction.accountId) {
      delta = -amount;
    } else if (flowType === "transfer") {
      if (account.id === transaction.accountId) delta -= amount;
      if (account.id === transaction.targetAccountId) delta += amount;
    }

    if (!delta) return account;

    return {
      ...account,
      balance: (Number(account.balance) || 0) + delta * direction,
      updatedAt: Date.now(),
    };
  });
}

function renderFinanceAccountOptions(selectedAccountId = "") {
  const refs = getRefs();
  const accounts = getFinanceAccounts();
  const accountOptions = accounts
    .map(
      (account) =>
        `<option value="${escapeHtml(account.id)}">${escapeHtml(
          account.name || "?듭옣",
        )} · ${formatMoney(account.balance)}</option>`,
    )
    .join("");
  const emptyOption = `<option value="">?좏깮</option>`;

  [
    refs.financeExpenseAccountId,
    refs.financeExpenseTargetAccountId,
    refs.financeAssetAccountId,
  ].forEach((select) => {
    if (!select) return;

    const currentValue = selectedAccountId || select.value || "";
    select.innerHTML = `${emptyOption}${accountOptions}`;
    select.value = currentValue || "";
  });
}

function formatFinanceSummaryTotalAsset(value) {
  const safeValue = Number(value) || 0;
  const absValue = Math.abs(safeValue);

  if (absValue < 100000) {
    return formatMoney(safeValue);
  }

  const manwonValue = Math.round(absValue / 10000);
  const sign = safeValue < 0 ? "-" : "";
  return `${sign}${manwonValue.toLocaleString("ko-KR")}\uB9CC \uC6D0`;
}

function isFinanceOcrIncomeAssetMode() {
  return getRefs().financeExpenseFormCard?.dataset.ocrIncomeAssetMode === "true";
}

function setFinanceOcrIncomeAssetMode(value) {
  const formCard = getRefs().financeExpenseFormCard;
  if (!formCard) return;

  if (value) {
    formCard.dataset.ocrIncomeAssetMode = "true";
    return;
  }

  delete formCard.dataset.ocrIncomeAssetMode;
}

function isFinanceOcrReviewActive() {
  return Boolean(deps.isFinanceOcrReviewActive?.());
}

function getFinancePage() {
  return deps.getFinancePage?.() || 1;
}

function setFinancePage(value) {
  deps.setFinancePage?.(value);
}

function getFinancePageSize() {
  return deps.financePageSize || 10;
}

function cloneFinanceData() {
  const current = getFinanceData();

  return normalizeFinanceData({
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
    expenses: Array.isArray(current.expenses)
      ? current.expenses.map((item) => ({
          ...item,
          flowType: item.flowType || "expense",
        }))
      : [],
    accounts: Array.isArray(current.accounts)
      ? current.accounts.map((item) => ({ ...item }))
      : [],
    assets: Array.isArray(current.assets)
      ? current.assets.map((item) => ({
          ...item,
        }))
      : [],
    subscriptions: Array.isArray(current.subscriptions)
      ? current.subscriptions.map((item) => ({ ...item }))
      : [],
    assetGoals: Array.isArray(current.assetGoals)
      ? current.assetGoals.map((item) => ({
          ...item,
          linkedAssetIds: Array.isArray(item.linkedAssetIds)
            ? [...item.linkedAssetIds]
            : [],
        }))
      : [],
  });
}

export function initFinance() {
  const refs = getRefs();
  const loaded = loadFinanceLocal();
  const normalized = normalizeFinanceData(loaded);

  setFinanceData(normalized);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (refs.financeMonthKey && !refs.financeMonthKey.value) {
    refs.financeMonthKey.value = defaultMonth;
  }

  const currentBudget = getFinanceBudgetByMonth(refs.financeMonthKey?.value);

  if (refs.financePeriodStartDay && !refs.financePeriodStartDay.value) {
    refs.financePeriodStartDay.value = currentBudget?.startDay || 1;
  }

  if (refs.financeBudgetAmount && !refs.financeBudgetAmount.value) {
    refs.financeBudgetAmount.value = currentBudget?.totalBudget || "";
  }

  if (refs.financeExpenseDate && !refs.financeExpenseDate.value) {
    refs.financeExpenseDate.value = formatDateKey(new Date());
  }

  if (refs.financeTransactionType && !refs.financeTransactionType.value) {
    refs.financeTransactionType.value = "expense";
  }

  if (refs.financeAssetCategory && !refs.financeAssetCategory.value) {
    refs.financeAssetCategory.value = "stock";
  }

  syncFinanceSubCategoryOptions(refs.financeExpenseCategory?.value || "");
  syncFinanceExpenseFormButtons();
  renderFinance();
}

function findPreviousBudgetEntry(monthKey) {
  if (!monthKey) return null;

  const entries = Object.values(getFinanceData().budgetEntries || {})
    .filter((entry) => entry?.monthKey && entry.monthKey < monthKey)
    .sort((a, b) => String(b.monthKey).localeCompare(String(a.monthKey), "ko"));

  return entries[0] || null;
}

export function getFinanceBudgetByMonth(monthKey, options = {}) {
  if (!monthKey) return null;

  const { includeInherited = true } = options;
  const financeData = getFinanceData();
  const exactEntry = financeData.budgetEntries?.[monthKey] || null;

  if (exactEntry) {
    return {
      ...exactEntry,
      isInherited: false,
    };
  }

  if (!includeInherited || financeData.budgetSettings?.autoApplyPreviousBudget === false) {
    return null;
  }

  const inheritedEntry = findPreviousBudgetEntry(monthKey);
  if (!inheritedEntry) return null;

  return {
    ...inheritedEntry,
    monthKey,
    sourceMonthKey: inheritedEntry.monthKey,
    isInherited: true,
  };
}

export function saveFinanceBudget() {
  const refs = getRefs();

  const monthKey = refs.financeMonthKey?.value || "";
  const financeData = getFinanceData();
  const startDay = Math.max(
    1,
    Math.min(
      31,
      Number(
        refs.financePeriodStartDay?.value ||
          financeData.budgetSettings?.defaultStartDay ||
          1,
      ) || 1,
    ),
  );
  const budget = Math.max(0, Number(refs.financeBudgetAmount?.value) || 0);

  if (!monthKey) {
    alert("기준 월을 선택하세요.");
    refs.financeMonthKey?.focus();
    return;
  }

  const nextData = cloneFinanceData();
  const existingEntry = nextData.budgetEntries?.[monthKey] || null;

  nextData.budgetSettings = {
    ...(nextData.budgetSettings || {}),
    defaultStartDay: startDay,
  };

  nextData.budgetEntries[monthKey] = {
    ...(existingEntry || {}),
    monthKey,
    startDay,
    totalBudget: budget,
    categoryBudgets:
      existingEntry?.categoryBudgets && typeof existingEntry.categoryBudgets === "object"
        ? { ...existingEntry.categoryBudgets }
        : {},
    note: existingEntry?.note || "",
    createdAt: Number(existingEntry?.createdAt) || Date.now(),
    updatedAt: Date.now(),
  };

  const normalized = normalizeFinanceData(nextData);
  setFinanceData(normalized);
  saveFinanceLocal(normalized);
  renderFinance();
  alert("예산이 저장되었습니다.");
}

export function renderFinance() {
  const refs = getRefs();

  const monthKey = refs.financeMonthKey?.value || "";
  if (!monthKey) return;

  const savedBudget = getFinanceBudgetByMonth(monthKey);
  const exactBudget = getFinanceBudgetByMonth(monthKey, {
    includeInherited: false,
  });

  const startDay = Math.max(
    1,
    Math.min(
      31,
      Number(
        refs.financePeriodStartDay?.value ||
          savedBudget?.startDay ||
          getFinanceData().budgetSettings?.defaultStartDay ||
          1,
      ),
    ),
  );

  const budget = Math.max(
    0,
    Number(refs.financeBudgetAmount?.value || savedBudget?.totalBudget || 0),
  );

  if (refs.financePeriodStartDay) {
    refs.financePeriodStartDay.value = startDay;
  }

  if (
    savedBudget &&
    refs.financeBudgetAmount &&
    !refs.financeBudgetAmount.matches(":focus")
  ) {
    refs.financeBudgetAmount.value = savedBudget.totalBudget || "";
  }

  const period = getFinancePeriodRange(monthKey, startDay);
  const monthlyTransactions = getFinanceExpensesForPeriod(
    period.startKey,
    period.endKey,
  );

  const monthlyExpenseTotal = monthlyTransactions
    .filter((item) => (item.flowType || "expense") === "expense")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const monthlyIncomeTotal = monthlyTransactions
    .filter((item) => item.flowType === "income")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const monthlyNet = monthlyIncomeTotal - monthlyExpenseTotal;

  const todayKey = formatDateKey(new Date());

  const todaySpent = monthlyTransactions
    .filter(
      (item) =>
        item.date === todayKey && (item.flowType || "expense") === "expense",
    )
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const remaining = budget - monthlyExpenseTotal;
  const progress =
    budget > 0
      ? Math.min(999, Math.round((monthlyExpenseTotal / budget) * 100))
      : 0;

  if (refs.financeCurrentPeriodLabel) {
    refs.financeCurrentPeriodLabel.textContent = `${formatKoreanDate(period.startKey)} ~ ${formatKoreanDate(period.endKey)}`;
  }

  if (refs.financeMonthlyBudgetText) {
    refs.financeMonthlyBudgetText.textContent = formatMoney(budget);
  }

  if (refs.financeTotalBudgetText) {
    refs.financeTotalBudgetText.textContent = formatMoney(budget);
  }

  if (refs.financeRemainingBudgetText) {
    refs.financeRemainingBudgetText.textContent = formatMoney(remaining);
  }

  if (refs.financeTodaySpentText) {
    refs.financeTodaySpentText.textContent = formatMoney(todaySpent);
  }

  if (refs.financeMonthlySpentText) {
    refs.financeMonthlySpentText.textContent =
      formatFinanceSummaryTotalAsset(monthlyExpenseTotal);
  }

  if (refs.financeMonthlyIncomeText) {
    refs.financeMonthlyIncomeText.textContent =
      formatFinanceSummaryTotalAsset(monthlyIncomeTotal);
  }

  if (refs.financeMonthlyNetText) {
    refs.financeMonthlyNetText.textContent =
      formatFinanceSummaryTotalAsset(monthlyNet);
  }

  if (refs.financeBudgetProgressText) {
    refs.financeBudgetProgressText.textContent = `${progress}%`;
  }

  if (refs.financeBudgetProgressBar) {
    refs.financeBudgetProgressBar.style.width = `${Math.min(progress, 100)}%`;
  }

  renderFinanceAccountOptions();
  renderFinanceAccountList();
  renderFinanceFilterOptions();

  const filteredTransactions = getFinanceFilteredExpenses();
  const expenseOnlyList = filteredTransactions.filter(
    (item) => (item.flowType || "expense") === "expense",
  );

  renderFinanceExpenseList(filteredTransactions);
  renderFinanceCategorySummary(expenseOnlyList);
  renderFinanceAssetFilters();
  renderFinanceAssetDashboard();
  renderFinanceAssetCategorySummary();
  renderFinanceAssetTransactionList(filteredTransactions);
  renderFinanceExtras();

  if (refs.financeSummaryTopCategoryText) {
    if (!expenseOnlyList.length) {
      refs.financeSummaryTopCategoryText.textContent = "-";
    } else {
      const grouped = expenseOnlyList.reduce((acc, item) => {
        const key = item.category || "미분류";
        acc[key] = (acc[key] || 0) + (Number(item.amount) || 0);
        return acc;
      }, {});

      const topCategory = Object.entries(grouped).sort(
        (a, b) => b[1] - a[1],
      )[0];

      refs.financeSummaryTopCategoryText.textContent = topCategory?.[0] || "-";
    }
  }

  if (refs.financeSummaryExpenseCountText) {
    const inheritedLabel =
      savedBudget?.isInherited && !exactBudget?.monthKey
        ? ` · ${savedBudget.sourceMonthKey} 예산 적용`
        : "";
    refs.financeSummaryExpenseCountText.textContent = `${filteredTransactions.length}건${inheritedLabel}`;
  }
}

export function getFinancePeriodRange(monthKey, startDay) {
  const [year, month] = monthKey.split("-").map(Number);

  const startDate = new Date(year, month - 1, startDay);

  const nextMonthDate = new Date(year, month, startDay);
  nextMonthDate.setDate(nextMonthDate.getDate() - 1);

  return {
    startKey: formatDateKey(startDate),
    endKey: formatDateKey(nextMonthDate),
  };
}

export function getFinanceExpensesForPeriod(startKey, endKey) {
  return expandRecurringFinanceExpensesInRange(
    getFinanceData().expenses,
    startKey,
    endKey,
  ).filter((item) => item.date >= startKey && item.date <= endKey);
}

function buildFinanceTransactionPayload(existing = null) {
  const refs = getRefs();
  const flowType = refs.financeTransactionType?.value || "expense";
  const repeat = refs.financeExpenseRepeat?.value || "none";

  return {
    ...(existing || {}),
    id: existing?.id || makeId(),
    date: refs.financeExpenseDate?.value || "",
    time: refs.financeExpenseTime?.value || "",
    title: refs.financeExpenseTitle?.value.trim() || "",
    amount: Math.max(0, Number(refs.financeExpenseAmount?.value) || 0),
    category: refs.financeExpenseCategory?.value || "",
    subCategory: refs.financeExpenseSubCategory?.value || "",
    accountId:
      refs.financeExpenseAccountId?.value || getDefaultFinanceAccountId("living"),
    targetAccountId:
      flowType === "transfer" ? refs.financeExpenseTargetAccountId?.value || "" : "",
    assetId: refs.financeExpenseAssetId?.value || "",
    paymentMethod: refs.financeExpensePaymentMethod?.value || "",
    merchant: refs.financeExpenseMerchant?.value.trim() || "",
    tag: refs.financeExpenseTag?.value.trim() || "",
    color: refs.financeExpenseColor?.value || "blue",
    memo: refs.financeExpenseMemo?.value.trim() || "",
    flowType,
    repeat,
    repeatUntil: refs.financeExpenseRepeatUntil?.value || "",
    isRecurring: repeat !== "none",
    createdAt: Number(existing?.createdAt) || Date.now(),
    updatedAt: Date.now(),
  };
}

export function saveFinanceExpense() {
  const refs = getRefs();

  const editingId = String(getFinanceEditingExpenseId() || "").split("__")[0];
  const nextData = cloneFinanceData();
  const previous = editingId
    ? nextData.expenses.find((item) => item.id === editingId)
    : null;
  const payload = buildFinanceTransactionPayload(previous);
  const isOcrIncomeAssetMode =
    payload.flowType === "income" && isFinanceOcrIncomeAssetMode();

  if (!payload.date) {
    alert("날짜를 입력하세요.");
    refs.financeExpenseDate?.focus();
    return { ok: false };
  }

  if (!payload.title) {
    alert("거래명을 입력하세요.");
    refs.financeExpenseTitle?.focus();
    return { ok: false };
  }

  if (!payload.amount) {
    alert("금액을 입력하세요.");
    refs.financeExpenseAmount?.focus();
    return { ok: false };
  }

  if (!payload.accountId) {
    alert("통장을 선택하세요.");
    refs.financeExpenseAccountId?.focus();
    return { ok: false };
  }

  if (payload.flowType === "transfer" && !payload.targetAccountId) {
    alert("받는 통장을 선택하세요.");
    refs.financeExpenseTargetAccountId?.focus();
    return { ok: false };
  }

  if (
    payload.flowType === "transfer" &&
    payload.accountId === payload.targetAccountId
  ) {
    alert("보내는 통장과 받는 통장이 같을 수 없습니다.");
    refs.financeExpenseTargetAccountId?.focus();
    return { ok: false };
  }

  if (!isOcrIncomeAssetMode && payload.flowType !== "transfer" && !payload.category) {
    alert(
      payload.flowType === "income"
        ? "입금 카테고리를 선택하세요."
        : "출금 카테고리를 선택하세요.",
    );
    refs.financeExpenseCategory?.focus();
    return { ok: false };
  }

  const subCategoryOptions = getFinanceSubCategoryMap()[payload.category] || [];
  if (
    !isOcrIncomeAssetMode &&
    payload.flowType !== "transfer" &&
    subCategoryOptions.length > 0 &&
    !payload.subCategory
  ) {
    alert("서브카테고리를 선택하세요.");
    refs.financeExpenseSubCategory?.focus();
    return { ok: false };
  }

  if (
    payload.repeat === "monthly" &&
    payload.repeatUntil &&
    new Date(`${payload.repeatUntil}T00:00`) <
      new Date(`${payload.date}T00:00`)
  ) {
    alert("반복 종료일은 거래 날짜보다 같거나 뒤여야 합니다.");
    refs.financeExpenseRepeatUntil?.focus();
    return { ok: false };
  }

  if (isOcrIncomeAssetMode) {
    const targetAssetId = refs.financeIncomeAssetTargetSelect?.value || "";
    const targetId = String(targetAssetId || "").split("__")[0];
    const normalizedTitle = payload.title.trim();
    const existingIndex = targetId
      ? nextData.assets.findIndex((item) => item.id === targetId)
      : nextData.assets.findIndex(
          (asset) =>
            String(asset.category || "") === "deposit" &&
            String(asset.title || asset.name || "").trim() === normalizedTitle &&
            String(asset.repeat || "none") === "none",
        );

    if (targetId && existingIndex < 0) {
      alert("선택한 자산을 찾지 못했습니다.");
      refs.financeIncomeAssetTargetSelect?.focus();
      return { ok: false };
    }

    if (existingIndex >= 0) {
      const currentAmount = Number(nextData.assets[existingIndex].amount) || 0;
      nextData.assets[existingIndex] = {
        ...nextData.assets[existingIndex],
        amount: currentAmount + payload.amount,
        updatedAt: Date.now(),
      };
    } else {
      nextData.assets.push({
        id: makeId(),
        category: "deposit",
        name: normalizedTitle,
        title: normalizedTitle,
        amount: payload.amount,
        accountId: payload.accountId,
        baseDate: payload.date || formatDateKey(new Date()),
        repeat: "none",
        repeatUntil: "",
        isRecurring: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    setFinanceData(nextData);
    saveFinanceLocal(nextData);
    resetFinanceExpenseForm();
    renderFinance();
    alert("입금 항목을 자산에 반영했습니다.");
    return {
      ok: true,
      mode: "create",
      flowType: payload.flowType,
      assetLinked: true,
    };
  }

  if (editingId) {
    if (previous) {
      nextData.accounts = applyFinanceTransactionToAccounts(
        nextData.accounts,
        previous,
        -1,
      );
    }

    nextData.expenses = nextData.expenses.map((item) =>
      item.id === editingId
        ? {
            ...item,
            ...payload,
            id: editingId,
            createdAt: Number(item.createdAt) || payload.createdAt,
            updatedAt: Date.now(),
          }
        : item,
    );
    nextData.accounts = applyFinanceTransactionToAccounts(
      nextData.accounts,
      { ...payload, id: editingId },
      1,
    );
  } else {
    nextData.expenses.push(payload);
    nextData.accounts = applyFinanceTransactionToAccounts(
      nextData.accounts,
      payload,
      1,
    );
  }

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  setFinancePage(1);
  resetFinanceExpenseForm();
  renderFinance();

  alert(editingId ? "거래내역이 수정되었습니다." : "거래내역이 저장되었습니다.");
  return {
    ok: true,
    mode: editingId ? "edit" : "create",
    flowType: payload.flowType,
    repeat: payload.repeat,
    count: 1,
  };
}

export function resetFinanceExpenseForm() {
  const refs = getRefs();

  setFinanceEditingExpenseId(null);
  setFinanceOcrIncomeAssetMode(false);

  if (refs.financeTransactionType) {
    refs.financeTransactionType.value = "expense";
  }

  if (refs.financeOcrIncomeMode) {
    refs.financeOcrIncomeMode.value = "account";
  }

  if (refs.financeExpenseAccountId) {
    refs.financeExpenseAccountId.value = getDefaultFinanceAccountId("living");
  }

  if (refs.financeExpenseTargetAccountId) {
    refs.financeExpenseTargetAccountId.value = "";
  }

  refs.financeExpenseTargetAccountGroup?.classList.add("hidden");

  if (refs.financeExpenseDate) {
    refs.financeExpenseDate.value = formatDateKey(new Date());
  }

  if (refs.financeExpenseTime) {
    refs.financeExpenseTime.value = "";
  }

  if (refs.financeExpenseTitle) {
    refs.financeExpenseTitle.value = "";
  }

  if (refs.financeExpenseAmount) {
    refs.financeExpenseAmount.value = "";
  }

  if (refs.financeExpenseCategory) {
    refs.financeExpenseCategory.value = "";
  }

  syncFinanceSubCategoryOptions("");

  if (refs.financeExpenseSubCategory) {
    refs.financeExpenseSubCategory.value = "";
  }

  if (refs.financeExpensePaymentMethod) {
    refs.financeExpensePaymentMethod.value = "";
  }

  if (refs.financeExpenseMerchant) {
    refs.financeExpenseMerchant.value = "";
  }

  if (refs.financeIncomeAssetTargetSelect) {
    refs.financeIncomeAssetTargetSelect.value = "";
  }

  if (refs.financeExpenseAssetId) {
    refs.financeExpenseAssetId.value = "";
  }

  if (refs.financeExpenseMemo) {
    refs.financeExpenseMemo.value = "";
  }

  if (refs.financeExpenseTag) {
    refs.financeExpenseTag.value = "";
  }

  if (refs.financeExpenseColor) {
    refs.financeExpenseColor.value = "blue";
  }

  if (refs.financeExpenseRepeat) {
    refs.financeExpenseRepeat.value = "none";
    refs.financeExpenseRepeat.disabled = false;
  }

  if (refs.financeExpenseRepeatUntil) {
    refs.financeExpenseRepeatUntil.value = "";
    refs.financeExpenseRepeatUntil.disabled = false;
  }

  deps.syncRepeatUntilToggleState?.("finance");
  syncFinanceExpenseFormButtons();
  closeFinanceEditPopup();
}

export function renderFinanceExpenseList(expenseList) {
  const refs = getRefs();
  if (!refs.financeExpenseList) return;

  const list = Array.isArray(expenseList) ? [...expenseList] : [];

  if (list.length === 0) {
    refs.financeExpenseList.innerHTML = `<div class="empty-message">조건에 맞는 거래내역이 없습니다.</div>`;

    if (refs.financePageText) refs.financePageText.textContent = "1 / 1";
    if (refs.financePrevPageBtn) refs.financePrevPageBtn.disabled = true;
    if (refs.financeNextPageBtn) refs.financeNextPageBtn.disabled = true;
    return;
  }

  const { pageItems, totalPages, currentPage } = getFinancePagedExpenses(list);

  if (refs.financePageText) {
    refs.financePageText.textContent = `${currentPage} / ${totalPages}`;
  }

  if (refs.financePrevPageBtn) {
    refs.financePrevPageBtn.disabled = currentPage <= 1;
  }

  if (refs.financeNextPageBtn) {
    refs.financeNextPageBtn.disabled = currentPage >= totalPages;
  }

  refs.financeExpenseList.innerHTML = pageItems
    .map((item) => renderFinanceExpenseCard(item))
    .join("");
}

export function renderFinanceExpenseCard(item) {
  const dateTimeText = `${formatKoreanDate(item.date)}${item.time ? ` ${item.time}` : ""}`;

  const paymentText = item.paymentMethod
    ? getFinancePaymentMethodText(item.paymentMethod)
    : "";

  const repeatText =
    item.repeat === "monthly" ? `<span class="tag-badge">매월 반복</span>` : "";

  const flowType = item.flowType || "expense";
  const flowText = flowType === "income" ? "입금" : flowType === "transfer" ? "이체" : "출금";
  const signedAmount =
    flowType === "income"
      ? `+ ${formatMoney(item.amount)}`
      : flowType === "transfer"
        ? formatMoney(item.amount)
        : `- ${formatMoney(item.amount)}`;
  const targetId = item.sourceId || item.id;

  return `
    <div
      class="item-card item-color-${item.color || "blue"} clickable-item-card"
      data-action="open-edit-finance-expense"
      data-id="${targetId}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <div class="item-content">
        <div class="item-title-row">
          <div class="item-title">
            ${escapeHtml(item.title || "")}
          </div>

          <div class="finance-amount-strong">
            ${escapeHtml(signedAmount)}
          </div>
        </div>

        <div class="item-meta compact-meta">
          <span class="meta-badge compact">
            ${escapeHtml(dateTimeText)}
          </span>

          <span class="tag-badge">${flowText}</span>

          ${
            item.accountId
              ? `<span class="tag-badge">${escapeHtml(getFinanceAccountName(item.accountId) || "통장")}</span>`
              : ""
          }

          ${
            item.targetAccountId
              ? `<span class="tag-badge">→ ${escapeHtml(getFinanceAccountName(item.targetAccountId) || "통장")}</span>`
              : ""
          }

          ${
            item.category
              ? `<span class="tag-badge">${escapeHtml(item.category)}</span>`
              : ""
          }

          ${
            item.subCategory
              ? `<span class="tag-badge">${escapeHtml(item.subCategory)}</span>`
              : ""
          }

          ${
            paymentText
              ? `<span class="tag-badge">${escapeHtml(paymentText)}</span>`
              : ""
          }

          ${
            item.merchant
              ? `<span class="tag-badge">${escapeHtml(item.merchant)}</span>`
              : ""
          }

          ${
            item.tag
              ? `<span class="tag-badge">${escapeHtml(item.tag)}</span>`
              : ""
          }

          ${repeatText}
        </div>
      </div>
    </div>
  `;
}

export function deleteFinanceExpense(id) {
  const targetId = String(id || "").split("__")[0];
  const targetItem = getFinanceData().expenses.find(
    (item) => item.id === targetId,
  );
  if (!targetItem) return;

  const ok = confirm("이 거래내역을 삭제할까요?");
  if (!ok) return;

  const nextData = cloneFinanceData();

  nextData.accounts = applyFinanceTransactionToAccounts(
    nextData.accounts,
    targetItem,
    -1,
  );
  nextData.expenses = nextData.expenses.filter((item) => item.id !== targetId);

  if (
    getFinanceEditingExpenseId() === id ||
    getFinanceEditingExpenseId() === targetId
  ) {
    resetFinanceExpenseForm();
  }

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  setFinancePage(1);
  renderFinance();
}

export function renderFinanceFilterOptions() {
  const refs = getRefs();
  const todayKey = formatDateKey(new Date());

  const expanded = expandRecurringFinanceExpensesInRange(
    getFinanceData().expenses,
    "1900-01-01",
    todayKey,
  );

  if (refs.financeListMonthFilter) {
    const monthKeys = [
      ...new Set(expanded.map((item) => String(item.date || "").slice(0, 7))),
    ]
      .filter(Boolean)
      .sort()
      .reverse();

    const currentValue = refs.financeListMonthFilter.value || "";
    refs.financeListMonthFilter.innerHTML = `<option value="">전체</option>`;

    monthKeys.forEach((monthKey) => {
      const option = document.createElement("option");
      option.value = monthKey;

      const [year, month] = monthKey.split("-");
      option.textContent = `${year.slice(2)}년 ${Number(month)}월`;

      if (currentValue === monthKey) {
        option.selected = true;
      }

      refs.financeListMonthFilter.appendChild(option);
    });

    if (currentValue && !monthKeys.includes(currentValue)) {
      refs.financeListMonthFilter.value = "";
    }
  }

  if (refs.financeListFlowFilter) {
    const currentValue = refs.financeListFlowFilter.value || "";
    refs.financeListFlowFilter.innerHTML = `
      <option value="">전체</option>
      <option value="expense">출금</option>
      <option value="income">입금</option>
      <option value="transfer">이체</option>
    `;
    refs.financeListFlowFilter.value = currentValue;
  }

  if (refs.financeListCategoryFilter) {
    const categories = [...new Set(expanded.map((item) => item.category || ""))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ko"));

    const currentValue = refs.financeListCategoryFilter.value || "";
    refs.financeListCategoryFilter.innerHTML = `<option value="">전체</option>`;

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;

      if (currentValue === category) {
        option.selected = true;
      }

      refs.financeListCategoryFilter.appendChild(option);
    });

    if (currentValue && !categories.includes(currentValue)) {
      refs.financeListCategoryFilter.value = "";
    }
  }

  if (refs.financeListPaymentFilter) {
    const paymentMethods = [
      ...new Set(expanded.map((item) => item.paymentMethod || "")),
    ].filter(Boolean);

    const paymentOrder = ["card", "cash", "transfer", "simple_pay"];
    const sortedPaymentMethods = paymentMethods.sort((a, b) => {
      return paymentOrder.indexOf(a) - paymentOrder.indexOf(b);
    });

    const currentValue = refs.financeListPaymentFilter.value || "";
    refs.financeListPaymentFilter.innerHTML = `<option value="">전체</option>`;

    sortedPaymentMethods.forEach((method) => {
      const option = document.createElement("option");
      option.value = method;
      option.textContent = getFinancePaymentMethodText(method);

      if (currentValue === method) {
        option.selected = true;
      }

      refs.financeListPaymentFilter.appendChild(option);
    });

    if (currentValue && !sortedPaymentMethods.includes(currentValue)) {
      refs.financeListPaymentFilter.value = "";
    }
  }

  if (refs.financeListSortFilter) {
    const currentValue = refs.financeListSortFilter.value || "latest";

    refs.financeListSortFilter.innerHTML = `
      <option value="latest">최신순</option>
      <option value="oldest">오래된순</option>
      <option value="amount_high">금액 높은순</option>
      <option value="amount_low">금액 낮은순</option>
      <option value="title_asc">이름순</option>
    `;

    refs.financeListSortFilter.value = currentValue;
  }
}

export function getFinanceFilteredExpenses() {
  const refs = getRefs();
  const todayKey = formatDateKey(new Date());

  let list = expandRecurringFinanceExpensesInRange(
    getFinanceData().expenses,
    "1900-01-01",
    todayKey,
  ).filter((item) => {
    const itemDate = item.date || "";
    return !!itemDate && itemDate <= todayKey;
  });

  const monthValue = refs.financeListMonthFilter?.value || "";
  const flowValue = refs.financeListFlowFilter?.value || "";
  const categoryValue = refs.financeListCategoryFilter?.value || "";
  const paymentValue = refs.financeListPaymentFilter?.value || "";
  const sortValue = refs.financeListSortFilter?.value || "latest";
  const searchValue = (refs.financeListSearchInput?.value || "")
    .trim()
    .toLowerCase();

  if (monthValue) {
    list = list.filter(
      (item) => String(item.date || "").slice(0, 7) === monthValue,
    );
  }

  if (flowValue) {
    list = list.filter((item) => (item.flowType || "expense") === flowValue);
  }

  if (categoryValue) {
    list = list.filter((item) => (item.category || "") === categoryValue);
  }

  if (paymentValue) {
    list = list.filter((item) => (item.paymentMethod || "") === paymentValue);
  }

  if (searchValue) {
    list = list.filter((item) => {
      const target = [
        item.title,
        item.category,
        item.subCategory,
        item.merchant,
        item.tag,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return target.includes(searchValue);
    });
  }

  if (sortValue === "oldest") {
    list.sort((a, b) => {
      const aKey = `${a.date || ""} ${a.time || ""}`;
      const bKey = `${b.date || ""} ${b.time || ""}`;
      return aKey.localeCompare(bKey, "ko");
    });
    return list;
  }

  if (sortValue === "amount_high") {
    list.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    return list;
  }

  if (sortValue === "amount_low") {
    list.sort((a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0));
    return list;
  }

  if (sortValue === "title_asc") {
    list.sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""), "ko"),
    );
    return list;
  }

  list.sort((a, b) => {
    const aKey = `${a.date || ""} ${a.time || ""}`;
    const bKey = `${b.date || ""} ${b.time || ""}`;
    return bKey.localeCompare(aKey, "ko");
  });

  return list;
}

export function getFinancePaymentMethodText(value) {
  if (value === "card") return "카드";
  if (value === "cash") return "현금";
  if (value === "transfer") return "계좌이체";
  if (value === "simple_pay") return "간편결제";
  return value || "";
}

export function getFinanceSubCategoryMap() {
  return {
    식사: ["한식", "중식", "일식", "양식", "패스트푸드", "배달", "기타"],
    카페: ["커피", "디저트", "베이커리", "음료", "기타"],
    생활용품: ["생필품", "청소용품", "주방용품", "소모품", "기타"],
    의류: ["의류", "신발", "잡화", "전자기기", "온라인쇼핑", "기타"],
    교통: ["대중교통", "택시", "주유", "주차", "기타"],
    의료: ["병원", "약국", "검진", "치과", "기타"],
    여가생활: ["영화", "공연", "여행", "전시", "기타"],
    취미: ["게임", "운동", "독서", "음악", "기타"],
    "주거/통신": ["월세", "관리비", "전기/가스", "통신비", "인터넷", "기타"],
    교육: ["학원", "수강료", "교재", "시험응시료", "기타"],
    저축: ["예금", "적금", "투자", "비상금", "기타"],
    급여: ["월급", "상여", "보너스", "기타"],
    용돈: ["가족", "지원", "기타"],
    환급: ["카드환급", "입금환급", "취소환불", "기타"],
    이자: ["예금이자", "적금이자", "기타"],
    투자수익: ["주식매도", "배당금", "기타"],
    기타수입: ["중고판매", "부수입", "기타"],
    기타: ["기타"],
  };
}

export function syncFinanceSubCategoryOptions(
  categoryValue,
  selectedValue = "",
) {
  const refs = getRefs();
  const subCategoryInput = refs.financeExpenseSubCategory;
  if (!subCategoryInput) return;

  const map = getFinanceSubCategoryMap();
  const options = map[categoryValue] || [];

  subCategoryInput.innerHTML = `<option value="">서브카테고리 선택</option>`;

  options.forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    if (label === selectedValue) {
      option.selected = true;
    }
    subCategoryInput.appendChild(option);
  });

  if (!options.includes(selectedValue)) {
    subCategoryInput.value = "";
  }
}

export function renderFinanceCategorySummary(expenseList) {
  const refs = getRefs();
  if (!refs.financeCategorySummaryList) return;

  if (!expenseList.length) {
    refs.financeCategorySummaryList.innerHTML = `<div class="empty-message">표시할 카테고리 합계가 없습니다.</div>`;
    return;
  }

  const netTotal = expenseList.reduce((sum, item) => {
    const signed =
      (item.flowType || "expense") === "income"
        ? Number(item.amount) || 0
        : -(Number(item.amount) || 0);
    return sum + signed;
  }, 0);

  const grouped = expenseList.reduce((acc, item) => {
    const flowLabel =
      (item.flowType || "expense") === "income" ? "입금" : "출금";
    const category = item.category || "미분류";
    const key = `${flowLabel} · ${category}`;
    const signed =
      (item.flowType || "expense") === "income"
        ? Number(item.amount) || 0
        : -(Number(item.amount) || 0);

    acc[key] = (acc[key] || 0) + signed;
    return acc;
  }, {});

  const sorted = Object.entries(grouped).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  );

  refs.financeCategorySummaryList.innerHTML = `
    <div class="item-card">
      <div class="item-content">
        <div class="item-title">카테고리 요약</div>
        <div class="item-meta compact-meta">
          <span class="meta-badge compact">
            순합계 ${
              netTotal >= 0
                ? `+ ${formatMoney(Math.abs(netTotal))}`
                : `- ${formatMoney(Math.abs(netTotal))}`
            }
          </span>
        </div>
      </div>
    </div>

    ${sorted
      .map(([category, amount]) => {
        const amountText =
          amount >= 0
            ? `+ ${formatMoney(Math.abs(amount))}`
            : `- ${formatMoney(Math.abs(amount))}`;

        return `
          <div class="item-card">
            <div class="item-content">
              <div class="item-title">${escapeHtml(category)}</div>
              <div class="item-meta compact-meta">
                <span class="meta-badge compact">${escapeHtml(amountText)}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("")}
  `;
}
export function startEditFinanceExpense(id) {
  const refs = getRefs();
  const targetId = String(id || "").split("__")[0];
  const item = getFinanceData().expenses.find((x) => x.id === targetId);
  if (!item) return;

  setFinanceOcrIncomeAssetMode(false);
  setFinanceEditingExpenseId(targetId);

  if (refs.financeTransactionType) {
    refs.financeTransactionType.value = item.flowType || "expense";
  }

  if (refs.financeExpenseAccountId) {
    refs.financeExpenseAccountId.value =
      item.accountId || getDefaultFinanceAccountId("living");
  }

  if (refs.financeExpenseTargetAccountId) {
    refs.financeExpenseTargetAccountId.value = item.targetAccountId || "";
  }

  refs.financeExpenseTargetAccountGroup?.classList.toggle(
    "hidden",
    (item.flowType || "expense") !== "transfer",
  );

  if (refs.financeExpenseDate) {
    refs.financeExpenseDate.value = item.date || formatDateKey(new Date());
  }

  if (refs.financeExpenseTime) {
    refs.financeExpenseTime.value = item.time || "";
  }

  if (refs.financeExpenseTitle) {
    refs.financeExpenseTitle.value = item.title || "";
  }

  if (refs.financeExpenseAmount) {
    refs.financeExpenseAmount.value = item.amount || "";
  }

  if (refs.financeExpenseCategory) {
    refs.financeExpenseCategory.value = item.category || "";
  }

  syncFinanceSubCategoryOptions(item.category || "", item.subCategory || "");

  if (refs.financeExpenseSubCategory) {
    refs.financeExpenseSubCategory.value = item.subCategory || "";
  }

  if (refs.financeExpensePaymentMethod) {
    refs.financeExpensePaymentMethod.value = item.paymentMethod || "";
  }

  if (refs.financeExpenseMerchant) {
    refs.financeExpenseMerchant.value = item.merchant || "";
  }

  if (refs.financeExpenseTag) {
    refs.financeExpenseTag.value = item.tag || "";
  }

  if (refs.financeExpenseAssetId) {
    refs.financeExpenseAssetId.value = item.assetId || "";
  }

  if (refs.financeExpenseMemo) {
    refs.financeExpenseMemo.value = item.memo || "";
  }

  if (refs.financeExpenseColor) {
    refs.financeExpenseColor.value = item.color || "blue";
  }

  if (refs.financeExpenseRepeat) {
    refs.financeExpenseRepeat.value = item.repeat || "none";
    refs.financeExpenseRepeat.disabled = false;
  }

  if (refs.financeExpenseRepeatUntil) {
    refs.financeExpenseRepeatUntil.value = item.repeatUntil || "";
    refs.financeExpenseRepeatUntil.disabled = false;
  }

  syncFinanceExpenseFormButtons();
  openFinanceEditPopup("expense");

  setTimeout(() => {
    refs.financeExpenseTitle?.focus();
  }, 100);

  deps.syncRepeatUntilToggleState?.("finance");
}

export function deleteEditingFinanceExpense() {
  const editingId = getFinanceEditingExpenseId();
  if (!editingId) return;

  deleteFinanceExpense(editingId);

  const stillExists = getFinanceData().expenses.some(
    (item) => item.id === editingId,
  );

  if (!stillExists) {
    resetFinanceExpenseForm();
  }
}

export function syncFinanceExpenseFormButtons() {
  const refs = getRefs();
  const isEditing = !!getFinanceEditingExpenseId();
  const flowType = refs.financeTransactionType?.value || "expense";
  const isOcrReviewActive = isFinanceOcrReviewActive();
  const isOcrIncomeAssetMode =
    flowType === "income" && isFinanceOcrIncomeAssetMode();
  const noun =
    flowType === "income"
      ? "\uC785\uAE08"
      : flowType === "transfer"
        ? "\uC774\uCCB4"
        : "\uCD9C\uAE08";

  renderFinanceIncomeAssetTargetOptions();
  renderFinanceAccountOptions();

  refs.financeExpenseTargetAccountGroup?.classList.toggle(
    "hidden",
    flowType !== "transfer",
  );

  refs.financeIncomeAssetLinkGroup?.classList.toggle(
    "hidden",
    !isOcrIncomeAssetMode,
  );

  if (refs.financeSaveExpenseBtn) {
    refs.financeSaveExpenseBtn.textContent = isOcrIncomeAssetMode
      ? "\uC790\uC0B0 \uBC18\uC601"
      : isEditing
        ? `${noun} \uC218\uC815`
        : `${noun} \uC800\uC7A5`;
  }

  const formTitle = refs.financeExpenseFormCard?.querySelector("h2");
  if (formTitle) {
    formTitle.textContent = isOcrIncomeAssetMode
      ? "OCR \uC785\uAE08 \uC790\uC0B0 \uBC18\uC601"
      : isEditing
        ? `${noun} \uC218\uC815`
        : `${noun} \uCD94\uAC00`;
  }

  refs.financeSkipOcrReviewBtn?.classList.toggle("hidden", !isOcrReviewActive);

  if (refs.financeCancelExpenseEditBtn) {
    refs.financeCancelExpenseEditBtn.textContent =
      isOcrReviewActive && !isEditing
        ? "OCR \uCDE8\uC18C"
        : "\uC218\uC815 \uCDE8\uC18C";
    refs.financeCancelExpenseEditBtn.classList.toggle(
      "hidden",
      !isEditing && !isOcrReviewActive,
    );
  }

  refs.financeDeleteExpenseBtn?.classList.toggle("hidden", !isEditing);
}
export function renderFinanceIncomeAssetTargetOptions(preferredAssetId = "") {
  const refs = getRefs();
  if (!refs.financeIncomeAssetTargetSelect) return;

  const currentValue =
    preferredAssetId || refs.financeIncomeAssetTargetSelect.value || "";
  const assets = Array.isArray(getFinanceData().assets)
    ? [...getFinanceData().assets]
    : [];

  const options = assets.sort((a, b) =>
    String(a.title || "").localeCompare(String(b.title || ""), "ko"),
  );

  refs.financeIncomeAssetTargetSelect.innerHTML =
    `<option value="">새 자산으로 등록</option>`;

  options.forEach((asset) => {
    const option = document.createElement("option");
    option.value = asset.id || "";
    option.textContent = `${asset.name || asset.title || "자산"} · ${formatMoney(
      asset.amount,
    )}`;
    refs.financeIncomeAssetTargetSelect.appendChild(option);
  });

  refs.financeIncomeAssetTargetSelect.value = currentValue;
}

function getFinanceAccountTypeLabel(type) {
  return (
    {
      living: "생활비",
      leisure: "여유자금",
      emergency: "비상금",
      investment_waiting: "투자 대기금",
      custom: "직접 설정",
    }[type] || "직접 설정"
  );
}

export function renderFinanceAccountList() {
  const refs = getRefs();
  if (!refs.financeAccountList) return;

  const accounts = getFinanceAccounts();

  if (!accounts.length) {
    refs.financeAccountList.innerHTML =
      `<div class="empty-message">등록된 통장이 없습니다.</div>`;
    return;
  }

  refs.financeAccountList.innerHTML = accounts
    .map(
      (account) => `
        <article class="finance-account-card">
          <div>
            <strong>${escapeHtml(account.name || "통장")}</strong>
            <span class="tag-badge">${escapeHtml(
              getFinanceAccountTypeLabel(account.type),
            )}</span>
          </div>
          <div class="finance-account-balance">${formatMoney(account.balance)}</div>
          ${
            account.memo
              ? `<p class="small-text">${escapeHtml(account.memo)}</p>`
              : ""
          }
          <div class="button-row compact-button-row">
            <button class="secondary-btn" type="button" data-action="open-edit-finance-account" data-id="${escapeHtml(account.id)}">수정</button>
          </div>
        </article>
      `,
    )
    .join("");
}

export function resetFinanceAccountForm() {
  const refs = getRefs();

  if (refs.financeAccountId) refs.financeAccountId.value = "";
  if (refs.financeAccountName) refs.financeAccountName.value = "";
  if (refs.financeAccountType) refs.financeAccountType.value = "custom";
  if (refs.financeAccountBalance) refs.financeAccountBalance.value = "";
  if (refs.financeAccountColor) refs.financeAccountColor.value = "blue";
  if (refs.financeAccountMemo) refs.financeAccountMemo.value = "";
  if (refs.financeSaveAccountBtn) refs.financeSaveAccountBtn.textContent = "통장 저장";
  refs.financeCancelAccountEditBtn?.classList.add("hidden");
  refs.financeDeleteAccountBtn?.classList.add("hidden");
}

export function startEditFinanceAccount(id) {
  const refs = getRefs();
  const account = getFinanceAccountById(String(id || "").split("__")[0]);
  if (!account) return;

  if (refs.financeAccountId) refs.financeAccountId.value = account.id || "";
  if (refs.financeAccountName) refs.financeAccountName.value = account.name || "";
  if (refs.financeAccountType) refs.financeAccountType.value = account.type || "custom";
  if (refs.financeAccountBalance) refs.financeAccountBalance.value = account.balance || "";
  if (refs.financeAccountColor) refs.financeAccountColor.value = account.color || "blue";
  if (refs.financeAccountMemo) refs.financeAccountMemo.value = account.memo || "";
  if (refs.financeSaveAccountBtn) refs.financeSaveAccountBtn.textContent = "통장 수정";
  refs.financeCancelAccountEditBtn?.classList.remove("hidden");
  refs.financeDeleteAccountBtn?.classList.remove("hidden");
  refs.financeAccountName?.focus();
}

export function saveFinanceAccount() {
  const refs = getRefs();
  const editingId = refs.financeAccountId?.value || "";
  const name = refs.financeAccountName?.value.trim() || "";

  if (!name) {
    alert("통장 이름을 입력하세요.");
    refs.financeAccountName?.focus();
    return;
  }

  const payload = {
    id: editingId || makeId(),
    name,
    type: refs.financeAccountType?.value || "custom",
    balance: Number(refs.financeAccountBalance?.value) || 0,
    color: refs.financeAccountColor?.value || "blue",
    memo: refs.financeAccountMemo?.value.trim() || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const nextData = cloneFinanceData();
  nextData.accounts = editingId
    ? nextData.accounts.map((item) =>
        item.id === editingId
          ? {
              ...item,
              ...payload,
              createdAt: Number(item.createdAt) || payload.createdAt,
            }
          : item,
      )
    : [payload, ...nextData.accounts];

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  resetFinanceAccountForm();
  renderFinance();
}

export function deleteEditingFinanceAccount() {
  const refs = getRefs();
  const targetId = refs.financeAccountId?.value || "";
  if (!targetId) return;

  const data = getFinanceData();
  const isLinkedToTransaction = data.expenses.some(
    (item) => item.accountId === targetId || item.targetAccountId === targetId,
  );
  const isLinkedToAsset = data.assets.some((item) => item.accountId === targetId);

  if (isLinkedToTransaction || isLinkedToAsset) {
    alert("연결된 거래나 자산이 있어 삭제할 수 없습니다. 먼저 연결을 변경하세요.");
    return;
  }

  if (!confirm("통장을 삭제할까요?")) return;

  const nextData = cloneFinanceData();
  nextData.accounts = nextData.accounts.filter((item) => item.id !== targetId);

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  resetFinanceAccountForm();
  renderFinance();
}

export function getFinancePagedExpenses(sortedExpenses) {
  const totalPages = Math.max(
    1,
    Math.ceil(sortedExpenses.length / getFinancePageSize()),
  );

  if (getFinancePage() > totalPages) {
    setFinancePage(totalPages);
  }

  if (getFinancePage() < 1) {
    setFinancePage(1);
  }

  const startIndex = (getFinancePage() - 1) * getFinancePageSize();
  const pageItems = sortedExpenses.slice(
    startIndex,
    startIndex + getFinancePageSize(),
  );

  return {
    pageItems,
    totalPages,
    currentPage: getFinancePage(),
  };
}

export function handleFinancePageChange(direction) {
  setFinancePage(getFinancePage() + direction);

  if (getFinancePage() < 1) {
    setFinancePage(1);
  }

  renderFinance();

  getRefs().financeExpenseListCard?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function generateFinanceExpenseSeries({
  date,
  time,
  title,
  amount,
  category,
  subCategory,
  paymentMethod,
  merchant,
  tag,
  color,
  repeat,
  repeatUntil,
  flowType,
}) {
  return [
    {
      id: makeId(),
      date,
      time,
      title,
      amount,
      category,
      subCategory,
      paymentMethod,
      merchant,
      tag,
      color,
      flowType: flowType || "expense",
      repeat: repeat || "none",
      repeatUntil: repeatUntil || "",
      isRecurring: repeat !== "none",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

export function toggleFinanceExpenseForm(forceOpen = null) {
  const refs = getRefs();
  if (!refs.financeExpenseFormCard) return;

  const isOpen = !refs.financeExpenseFormCard.classList.contains("hidden");
  const shouldOpen = forceOpen === null ? !isOpen : forceOpen;

  refs.financeExpenseFormCard.classList.toggle("hidden", !shouldOpen);

  if (refs.financeOpenExpenseFormBtn) {
    refs.financeOpenExpenseFormBtn.textContent = shouldOpen
      ? "닫기"
      : "거래 추가";
  }

  if (shouldOpen) {
    requestAnimationFrame(() => {
      refs.financeExpenseTitle?.focus();
    });
  }
}

export function openFinanceExpenseForm() {
  resetFinanceExpenseForm();
  openFinanceEditPopup("expense");
}

export function openFinanceExpenseFormForAsset(assetId, flowType = "expense") {
  const targetId = String(assetId || "").split("__")[0];
  const asset = getFinanceData().assets.find((item) => item.id === targetId);

  if (!asset) return;

  resetFinanceExpenseForm();

  const refs = getRefs();

  if (refs.financeTransactionType) {
    refs.financeTransactionType.value =
      flowType === "income" ? "income" : "expense";
  }

  if (refs.financeExpenseDate) {
    refs.financeExpenseDate.value = formatDateKey(new Date());
  }

  if (refs.financeExpenseTitle) {
    refs.financeExpenseTitle.value = `${asset.name || asset.title || "자산"} ${
      flowType === "income" ? "입금" : "출금"
    }`;
  }

  if (refs.financeExpenseMerchant) {
    refs.financeExpenseMerchant.value = asset.title || "";
  }

  if (flowType === "income") {
    renderFinanceIncomeAssetTargetOptions(targetId);
    if (refs.financeIncomeAssetTargetSelect) {
      refs.financeIncomeAssetTargetSelect.value = targetId;
    }
  }

  if (refs.financeExpenseTag) {
    refs.financeExpenseTag.value = "자산";
  }

  if (refs.financeExpenseCategory) {
    refs.financeExpenseCategory.value =
      flowType === "income" ? "기타수입" : "기타";
  }

  syncFinanceSubCategoryOptions(refs.financeExpenseCategory?.value || "");

  if (refs.financeExpensePaymentMethod) {
    refs.financeExpensePaymentMethod.value = "transfer";
  }

  syncFinanceExpenseFormButtons();
  openFinanceEditPopup("expense");

  setTimeout(() => {
    refs.financeExpenseAmount?.focus();
  }, 100);
}

export function resetFinanceAssetForm() {
  const refs = getRefs();

  setFinanceEditingAssetId(null);

  if (refs.financeAssetCategory) {
    refs.financeAssetCategory.value = "stock";
  }

  if (refs.financeAssetPurpose) {
    refs.financeAssetPurpose.value = "general";
  }

  if (refs.financeAssetAccountId) {
    refs.financeAssetAccountId.value = getDefaultFinanceAccountId("leisure");
  }

  if (refs.financeAssetTitle) {
    refs.financeAssetTitle.value = "";
  }

  if (refs.financeAssetAmount) {
    refs.financeAssetAmount.value = "";
  }

  if (refs.financeAssetBaseDate) {
    refs.financeAssetBaseDate.value = formatDateKey(new Date());
  }

  if (refs.financeAssetRepeat) {
    refs.financeAssetRepeat.value = "none";
  }

  if (refs.financeAssetRepeatUntil) {
    refs.financeAssetRepeatUntil.value = "";
    refs.financeAssetRepeatUntil.disabled = true;
    refs.financeAssetRepeatUntil.classList.remove("hidden");
  }

  if (refs.financeAssetRepeatUntilNoneBtn) {
    refs.financeAssetRepeatUntilNoneBtn.classList.add("hidden");
  }

  if (refs.financeAssetRepeatUntilToggleBtn) {
    refs.financeAssetRepeatUntilToggleBtn.textContent = "없음 사용";
  }

  if (refs.financeSaveAssetBtn) {
    refs.financeSaveAssetBtn.textContent = "자산 저장";
  }

  const formTitle = refs.financeAssetFormCard?.querySelector("h2");
  if (formTitle) {
    formTitle.textContent = "자산 추가";
  }

  refs.financeDeleteAssetBtn?.classList.add("hidden");
  closeFinanceEditPopup();
}

export function deleteEditingFinanceAsset() {
  const editingId = getFinanceEditingAssetId();
  if (!editingId) return;

  const ok = confirm("이 자산을 삭제할까요?");
  if (!ok) return;

  const targetId = String(editingId).split("__")[0];
  const nextData = cloneFinanceData();

  nextData.assets = nextData.assets.filter((item) => item.id !== targetId);

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  resetFinanceAssetForm();
  renderFinance();
}

export function startEditFinanceAsset(id) {
  const refs = getRefs();
  const targetId = String(id || "").split("__")[0];
  const item = getFinanceData().assets.find((x) => x.id === targetId);
  if (!item) return;

  setFinanceEditingAssetId(targetId);

  if (refs.financeAssetCategory) {
    refs.financeAssetCategory.value = item.category || "stock";
  }

  if (refs.financeAssetPurpose) {
    refs.financeAssetPurpose.value = item.accountPurpose || "general";
  }

  if (refs.financeAssetAccountId) {
    refs.financeAssetAccountId.value =
      item.accountId || getDefaultFinanceAccountId("leisure");
  }

  if (refs.financeAssetTitle) {
    refs.financeAssetTitle.value = item.name || item.title || "";
  }

  if (refs.financeAssetAmount) {
    refs.financeAssetAmount.value = item.amount || "";
  }

  if (refs.financeAssetBaseDate) {
    refs.financeAssetBaseDate.value = item.baseDate || item.createdDate || "";
  }

  if (refs.financeAssetRepeat) {
    refs.financeAssetRepeat.value = item.repeat || "none";
  }

  if (refs.financeAssetRepeatUntil) {
    refs.financeAssetRepeatUntil.value = item.repeatUntil || "";
    refs.financeAssetRepeatUntil.disabled =
      (item.repeat || "none") === "none";

    const isNoneMode =
      (item.repeat || "none") !== "none" && !item.repeatUntil;

    refs.financeAssetRepeatUntil.classList.toggle("hidden", isNoneMode);
    refs.financeAssetRepeatUntilNoneBtn?.classList.toggle("hidden", !isNoneMode);
  }

  if (refs.financeAssetRepeatUntilToggleBtn) {
    refs.financeAssetRepeatUntilToggleBtn.textContent =
      refs.financeAssetRepeatUntil?.classList.contains("hidden")
        ? "날짜 사용"
        : "없음 사용";
  }

  if (refs.financeSaveAssetBtn) {
    refs.financeSaveAssetBtn.textContent = "자산 수정";
  }

  const formTitle = refs.financeAssetFormCard?.querySelector("h2");
  if (formTitle) {
    formTitle.textContent = "자산 수정";
  }

  refs.financeDeleteAssetBtn?.classList.remove("hidden");

  openFinanceEditPopup("asset");

  setTimeout(() => {
    refs.financeAssetTitle?.focus();
  }, 100);
}

export function saveFinanceAsset() {
  const refs = getRefs();

  const category = refs.financeAssetCategory?.value || "";
  const accountPurpose = refs.financeAssetPurpose?.value || "general";
  const accountId = refs.financeAssetAccountId?.value || "";
  const title = refs.financeAssetTitle?.value.trim() || "";
  const amount = Math.max(0, Number(refs.financeAssetAmount?.value) || 0);
  const baseDate = refs.financeAssetBaseDate?.value || "";
  const repeat = refs.financeAssetRepeat?.value || "none";
  const repeatUntilInputHidden =
    refs.financeAssetRepeatUntil?.classList.contains("hidden");
  const repeatUntil =
    repeat !== "none" && !repeatUntilInputHidden
      ? refs.financeAssetRepeatUntil?.value || ""
      : "";

  if (!category) {
    alert("자산 종류를 선택하세요.");
    refs.financeAssetCategory?.focus();
    return { ok: false };
  }

  if (!title) {
    alert("자산명을 입력하세요.");
    refs.financeAssetTitle?.focus();
    return { ok: false };
  }

  if (!amount) {
    alert("자산 금액을 입력하세요.");
    refs.financeAssetAmount?.focus();
    return { ok: false };
  }

  if (!baseDate) {
    alert("기준 날짜를 입력하세요.");
    refs.financeAssetBaseDate?.focus();
    return { ok: false };
  }

  if (
    repeat === "monthly" &&
    repeatUntil &&
    new Date(`${repeatUntil}T00:00`) < new Date(`${baseDate}T00:00`)
  ) {
    alert("반복 종료일은 기준 날짜와 같거나 뒤여야 합니다.");
    refs.financeAssetRepeatUntil?.focus();
    return { ok: false };
  }

  const editingId = String(getFinanceEditingAssetId() || "").split("__")[0];
  const nextData = cloneFinanceData();

  if (editingId) {
    nextData.assets = nextData.assets.map((item) =>
      item.id === editingId
        ? {
            ...item,
            category,
            accountPurpose,
            purpose: accountPurpose,
            accountId,
            name: title,
            title,
            amount,
            baseDate,
            repeat,
            repeatUntil,
            isRecurring: repeat !== "none",
            updatedAt: Date.now(),
          }
        : item,
    );

    setFinanceData(nextData);
    saveFinanceLocal(nextData);
    resetFinanceAssetForm();
    renderFinance();

    alert("자산이 수정되었습니다.");
    return {
      ok: true,
      mode: "edit",
    };
  }

  nextData.assets.push({
    id: makeId(),
    category,
    accountPurpose,
    purpose: accountPurpose,
    accountId,
    name: title,
    title,
    amount,
    baseDate,
    repeat,
    repeatUntil,
    isRecurring: repeat !== "none",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  resetFinanceAssetForm();
  renderFinance();

  alert("자산이 저장되었습니다.");
  return {
    ok: true,
    mode: "create",
  };
}

export function renderFinanceAssetSummary(transactionList = []) {
  const refs = getRefs();
  const todayKey = formatDateKey(new Date());

  const expandedAssets = expandRecurringAssetsInRange(
    getFinanceData().assets,
    "1900-01-01",
    todayKey,
  ).filter((item) => {
    const targetDate = item.displayDate || item.baseDate || "";
    return !!targetDate && targetDate <= todayKey;
  });

  const assetBaseAmount = expandedAssets.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  const transactionNetAmount = (Array.isArray(transactionList)
    ? transactionList
    : []
  ).reduce((sum, item) => {
    const amount = Number(item.amount) || 0;
    return sum + ((item.flowType || "expense") === "income" ? amount : -amount);
  }, 0);

  const totalAssetAmount = assetBaseAmount + transactionNetAmount;

  [refs.financeDashboardTotalAssetText, refs.financeManageTotalAssetText]
    .filter(Boolean)
    .forEach((node) => {
      node.textContent = formatFinanceSummaryTotalAsset(totalAssetAmount);
    });

  if (!refs.financeAssetList) return;

  if (!expandedAssets.length) {
    refs.financeAssetList.innerHTML =
      `<div class="empty-message">등록된 자산이 없습니다.</div>`;
    return;
  }

  const categoryTextMap = {
    stock: "二쇱떇",
    savings: "?곴툑",
    deposit: "?덇툑",
  };

  refs.financeAssetList.innerHTML = expandedAssets
    .sort((a, b) => {
      const aKey = a.displayDate || a.baseDate || "";
      const bKey = b.displayDate || b.baseDate || "";
      return bKey.localeCompare(aKey, "ko");
    })
    .map((item) => {
      const categoryText =
        categoryTextMap[item.category] || item.category || "기타";

      const repeatText =
        item.repeat === "monthly"
          ? `<span class="tag-badge">매월 반복</span>`
          : "";

      const dateText = getAssetDisplayDateText(item);
      const targetId = item.sourceId || item.id;

      return `
        <div
          class="item-card clickable-item-card"
          data-action="open-edit-finance-asset"
          data-id="${targetId}"
          role="button"
          tabindex="0"
          title="클릭해서 수정"
        >
          <div class="item-content">
            <div class="item-title-row">
              <div class="item-title">${escapeHtml(item.name || item.title || "")}</div>
              <div class="finance-amount-strong">${formatMoney(item.amount)}</div>
            </div>
            <div class="item-meta compact-meta">
              <span class="tag-badge">${escapeHtml(categoryText)}</span>
              ${
                item.accountId
                  ? `<span class="tag-badge">${escapeHtml(getFinanceAccountName(item.accountId) || "연결 통장")}</span>`
                  : ""
              }
              ${dateText ? `<span class="meta-badge compact">${escapeHtml(dateText)}</span>` : ""}
              ${repeatText}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function getExpandedFinanceAssetsToToday() {
  const todayKey = formatDateKey(new Date());

  return expandRecurringAssetsInRange(
    getFinanceData().assets,
    "1900-01-01",
    todayKey,
  ).filter((item) => {
    const targetDate = item.displayDate || item.baseDate || "";
    return !!targetDate && targetDate <= todayKey;
  });
}

function getExpandedFinanceTransactionsToToday() {
  const todayKey = formatDateKey(new Date());

  return expandRecurringFinanceExpensesInRange(
    getFinanceData().expenses,
    "1900-01-01",
    todayKey,
  ).filter((item) => {
    const itemDate = item.date || "";
    return !!itemDate && itemDate <= todayKey;
  });
}

function getAssetCategoryText(category) {
  if (category === "bank") return "통장";
  const categoryTextMap = {
    stock: "주식",
    saving: "적금",
    savings: "적금",
    deposit: "예금",
    cash: "현금",
    custom: "기타",
  };

  return categoryTextMap[category] || category || "기타";
}

function getAssetPurposeText(purpose) {
  const purposeTextMap = {
    living: "생활비 통장",
    leisure: "여유자금 통장",
    general: "일반 자산",
  };

  return purposeTextMap[purpose] || purposeTextMap.general;
}

function getFinanceAccountSplitSummary(assetSnapshots = buildFinanceAssetSnapshots()) {
  const accounts = getFinanceAccounts();
  const livingAccounts = accounts.filter((item) => item.type === "living");
  const leisureAccounts = accounts.filter((item) => item.type === "leisure");
  const livingTotal = livingAccounts.reduce(
    (sum, item) => sum + (Number(item.balance) || 0),
    0,
  );
  const leisureTotal = leisureAccounts.reduce(
    (sum, item) => sum + (Number(item.balance) || 0),
    0,
  );
  const leisureTarget = getCoinBalance(getRewardsData()) * COIN_KRW_VALUE;

  return {
    livingTotal,
    leisureTotal,
    leisureTarget,
    leisureGap: leisureTarget - leisureTotal,
    livingCount: livingAccounts.length,
    leisureCount: leisureAccounts.length,
  };
}

function renderFinanceAccountSplit(assetSnapshots) {
  const refs = getRefs();
  if (!refs.financeAccountSplitCard) return;

  const summary = getFinanceAccountSplitSummary(assetSnapshots);
  const gapText =
    summary.leisureGap > 0
      ? `${formatMoney(summary.leisureGap)} 모자람`
      : summary.leisureGap < 0
        ? `${formatMoney(Math.abs(summary.leisureGap))} 초과`
        : "목표 금액 일치";

  refs.financeAccountLivingText &&
    (refs.financeAccountLivingText.textContent = formatMoney(summary.livingTotal));
  refs.financeAccountLeisureText &&
    (refs.financeAccountLeisureText.textContent = formatMoney(summary.leisureTotal));
  refs.financeAccountLeisureTargetText &&
    (refs.financeAccountLeisureTargetText.textContent = formatMoney(summary.leisureTarget));
  refs.financeAccountLeisureGapText &&
    (refs.financeAccountLeisureGapText.textContent = gapText);
  refs.financeAccountSplitDesc &&
    (refs.financeAccountSplitDesc.textContent =
      `생활비 통장 ${summary.livingCount}개 · 여유자금 통장 ${summary.leisureCount}개 · AI 코인 기준`);
}

function getRecurringAssetOccurrenceCount(item, todayKey) {
  if (!item?.baseDate || item.baseDate > todayKey) return 0;
  if (item.repeat !== "monthly") return 1;

  let count = 0;
  let cursor = item.baseDate;

  while (cursor && cursor <= todayKey) {
    if (item.repeatUntil && cursor > item.repeatUntil) {
      break;
    }

    count += 1;
    cursor = moveFinanceMonth(cursor, 1);
  }

  return count;
}

function getNextAssetOccurrenceDate(item, todayKey) {
  if (!item?.baseDate || item.repeat !== "monthly") return "";

  let cursor = item.baseDate;

  while (cursor && cursor <= todayKey) {
    cursor = moveFinanceMonth(cursor, 1);
  }

  if (!cursor) return "";
  if (item.repeatUntil && cursor > item.repeatUntil) return "";
  return cursor;
}

function buildFinanceAssetSnapshots() {
  const todayKey = formatDateKey(new Date());

  return (Array.isArray(getFinanceData().assets) ? getFinanceData().assets : [])
    .map((item) => {
      const occurrenceCount = getRecurringAssetOccurrenceCount(item, todayKey);
      const currentAmount = (Number(item.amount) || 0) * occurrenceCount;
      const nextDate = getNextAssetOccurrenceDate(item, todayKey);
      const lastAppliedDate =
        occurrenceCount > 0
          ? item.repeat === "monthly"
            ? moveFinanceMonth(item.baseDate, occurrenceCount - 1)
            : item.baseDate || ""
          : "";

      return {
        ...item,
        accountPurpose: item.accountPurpose || "general",
        currentAmount,
        occurrenceCount,
        categoryText: getAssetCategoryText(item.category),
        purposeText: getAssetPurposeText(item.accountPurpose || "general"),
        lastAppliedDate,
        nextDate,
      };
    })
    .filter((item) => item.currentAmount > 0 || item.baseDate);
}

function renderFinanceAssetPopupCard(item) {
  const repeatText =
    item.repeat === "monthly" ? `<span class="tag-badge">매월 반복</span>` : "";
  const dateText = item.lastAppliedDate
    ? `최근 반영 ${formatKoreanDate(item.lastAppliedDate)}`
    : item.baseDate
      ? `기준일 ${formatKoreanDate(item.baseDate)}`
      : "";
  const nextDateText = item.nextDate
    ? `다음 반영 ${formatKoreanDate(item.nextDate)}`
    : item.repeat === "monthly"
      ? "반복 종료"
      : "추가 반복 없음";

  return `
    <div
      class="selected-item-card clickable-item-card"
      data-action="open-edit-finance-asset"
      data-id="${item.id}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <div class="selected-item-content">
        <div class="selected-item-title">${escapeHtml(item.title || "")}</div>
        <div class="selected-item-meta">
          <span class="tag-badge">${escapeHtml(item.categoryText || "")}</span>
          <span class="meta-badge">${formatMoney(item.currentAmount)}</span>
          ${dateText ? `<span class="meta-badge">${escapeHtml(dateText)}</span>` : ""}
          <span class="meta-badge">${escapeHtml(nextDateText)}</span>
          ${repeatText}
        </div>
      </div>
    </div>
  `;
}

export function renderFinanceAssetFilters() {
  const refs = getRefs();
  const snapshots = buildFinanceAssetSnapshots();

  if (refs.financeAssetCategoryFilter) {
    const categories = [...new Set(snapshots.map((item) => item.category || ""))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ko"));

    const currentValue = refs.financeAssetCategoryFilter.value || "";
    refs.financeAssetCategoryFilter.innerHTML = `<option value="">전체</option>`;

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = getAssetCategoryText(category);

      if (currentValue === category) {
        option.selected = true;
      }

      refs.financeAssetCategoryFilter.appendChild(option);
    });

    if (currentValue && !categories.includes(currentValue)) {
      refs.financeAssetCategoryFilter.value = "";
    }
  }

  if (refs.financeAssetSortFilter && !refs.financeAssetSortFilter.value) {
    refs.financeAssetSortFilter.value = "current_high";
  }
}

function getFilteredFinanceAssetSnapshots() {
  const refs = getRefs();
  let list = buildFinanceAssetSnapshots();

  const searchValue = (refs.financeAssetSearchInput?.value || "")
    .trim()
    .toLowerCase();
  const categoryValue = refs.financeAssetCategoryFilter?.value || "";
  const sortValue = refs.financeAssetSortFilter?.value || "current_high";

  if (categoryValue) {
    list = list.filter((item) => (item.category || "") === categoryValue);
  }

  if (searchValue) {
    list = list.filter((item) => {
      const target = [item.title, item.categoryText, item.baseDate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return target.includes(searchValue);
    });
  }

  if (sortValue === "latest") {
    list.sort((a, b) =>
      String(b.lastAppliedDate || b.baseDate || "").localeCompare(
        String(a.lastAppliedDate || a.baseDate || ""),
        "ko",
      ),
    );
    return list;
  }

  if (sortValue === "title_asc") {
    list.sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""), "ko"),
    );
    return list;
  }

  list.sort((a, b) => {
    const byAmount =
      (Number(b.currentAmount) || 0) - (Number(a.currentAmount) || 0);

    if (byAmount !== 0) return byAmount;

    return String(b.lastAppliedDate || b.baseDate || "").localeCompare(
      String(a.lastAppliedDate || a.baseDate || ""),
      "ko",
    );
  });

  return list;
}

export function renderFinanceAssetDashboard() {
  const refs = getRefs();
  const assetSnapshots = buildFinanceAssetSnapshots().filter((item) =>
    String(item.title || "").trim(),
  );
  renderFinanceAccountSplit(assetSnapshots);
  const accountsTotal = getFinanceAccounts().reduce(
    (sum, item) => sum + (Number(item.balance) || 0),
    0,
  );
  const filteredAssets = getFilteredFinanceAssetSnapshots();

  const assetBaseAmount = getFinanceData().assets.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  const totalAssetAmount = accountsTotal + assetBaseAmount;
  const assetCount = assetSnapshots.length;
  const filteredAssetAmount = filteredAssets.reduce(
    (sum, item) => sum + (Number(item.currentAmount) || 0),
    0,
  );
  const recurringMonthlyAmount = (Array.isArray(getFinanceData().assets)
    ? getFinanceData().assets
    : []
  )
    .filter((item) => item?.repeat === "monthly")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const largestAsset = [...assetSnapshots].sort(
    (a, b) => (Number(b.currentAmount) || 0) - (Number(a.currentAmount) || 0),
  )[0];

  [refs.financeDashboardTotalAssetText, refs.financeManageTotalAssetText]
    .filter(Boolean)
    .forEach((node) => {
      node.textContent = formatFinanceSummaryTotalAsset(totalAssetAmount);
    });

  if (refs.financeAssetRegisteredTotalText) {
    refs.financeAssetRegisteredTotalText.textContent = `${assetCount}개`;
  }

  if (refs.financeAssetTransactionNetText) {
    refs.financeAssetTransactionNetText.textContent =
      formatMoney(filteredAssetAmount);
  }

  if (refs.financeAssetRecurringMonthlyText) {
    refs.financeAssetRecurringMonthlyText.textContent = formatMoney(
      recurringMonthlyAmount,
    );
  }

  if (refs.financeAssetLargestText) {
    refs.financeAssetLargestText.textContent = largestAsset?.name || largestAsset?.title || "-";
  }

  if (refs.financeAssetLargestMetaText) {
    refs.financeAssetLargestMetaText.textContent = largestAsset
      ? `${formatMoney(largestAsset.currentAmount)} · ${largestAsset.categoryText}`
      : "아직 자산이 없습니다.";
  }

  if (!refs.financeAssetList) return;

  if (!filteredAssets.length) {
    refs.financeAssetList.innerHTML =
      `<div class="empty-message">조건에 맞는 자산이 없습니다.</div>`;
    return;
  }

  refs.financeAssetList.innerHTML = filteredAssets
    .map((item) => {
      const repeatText =
        item.repeat === "monthly"
          ? `<span class="tag-badge">매월 반복</span>`
          : "";
      const share =
        assetBaseAmount > 0
          ? Math.round(
              ((Number(item.currentAmount) || 0) / assetBaseAmount) * 100,
            )
          : 0;
      const appliedText =
        item.repeat === "monthly"
          ? `누적 ${item.occurrenceCount}회 적용`
          : "1회 등록 자산";
      const dateText = item.lastAppliedDate
        ? `최근 반영 ${formatKoreanDate(item.lastAppliedDate)}`
        : item.baseDate
          ? `기준일 ${formatKoreanDate(item.baseDate)}`
          : "";
      const nextDateText = item.nextDate
        ? `다음 반영 ${formatKoreanDate(item.nextDate)}`
        : item.repeat === "monthly"
          ? "반복 종료"
          : "추가 반복 없음";

      return `
        <div
          class="item-card clickable-item-card finance-asset-card"
          data-action="open-edit-finance-asset"
          data-id="${item.id}"
          data-category="${escapeHtml(item.category || "")}"
          role="button"
          tabindex="0"
          title="클릭해서 수정"
        >
          <div class="item-content">
            <div class="finance-asset-card-top">
              <div class="finance-asset-main">
                <div class="item-title">${escapeHtml(item.title || "")}</div>
                <div class="finance-asset-subtext">
                  ${escapeHtml(appliedText)} · ${escapeHtml(dateText)}
                </div>
              </div>
              <div class="finance-asset-amount-block">
                <div class="finance-amount-strong">${formatMoney(item.currentAmount)}</div>
                <div class="finance-asset-share">총 자산 대비 ${share}%</div>
              </div>
            </div>
            <div class="item-meta compact-meta">
              <span class="tag-badge">${escapeHtml(item.categoryText)}</span>
              <span class="tag-badge">${escapeHtml(item.purposeText)}</span>
              ${
                item.baseDate
                  ? `<span class="meta-badge compact">시작 ${escapeHtml(formatKoreanDate(item.baseDate))}</span>`
                  : ""
              }
              <span class="meta-badge compact">${escapeHtml(nextDateText)}</span>
              ${repeatText}
            </div>
            <div class="finance-asset-progress">
              <div
                class="finance-asset-progress-fill"
                style="width: ${Math.max(2, Math.min(100, share))}%"
              ></div>
            </div>
            <div class="finance-asset-metrics">
              <div class="finance-asset-metric">
                <span class="finance-asset-metric-label">누적 적용</span>
                <span class="finance-asset-metric-value">${escapeHtml(appliedText)}</span>
              </div>
              <div class="finance-asset-metric">
                <span class="finance-asset-metric-label">다음 기준</span>
                <span class="finance-asset-metric-value">${escapeHtml(nextDateText.replace("다음 반영 ", ""))}</span>
              </div>
            </div>
            <div class="finance-asset-card-actions">
              <button
                type="button"
                class="secondary-btn"
                data-action="quick-asset-cashflow"
                data-id="${item.id}"
                data-flow-type="income"
              >
                입금 기록
              </button>
              <button
                type="button"
                class="secondary-btn"
                data-action="quick-asset-cashflow"
                data-id="${item.id}"
                data-flow-type="expense"
              >
                출금 기록
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

export function openFinanceAssetSummaryPopup(type) {
  const refs = getRefs();
  const snapshots = buildFinanceAssetSnapshots().filter((item) =>
    String(item.title || "").trim(),
  );
  const filteredAssets = getFilteredFinanceAssetSnapshots();
  const recurringAssets = snapshots.filter((item) => item.repeat === "monthly");
  const largestAsset = [...snapshots].sort(
    (a, b) => (Number(b.currentAmount) || 0) - (Number(a.currentAmount) || 0),
  )[0];

  const popupMap = {
    assets: {
      label: "등록 자산 목록",
      list: snapshots,
      empty: "등록된 자산이 없습니다.",
    },
    visible_assets: {
      label: "현재 필터 자산 목록",
      list: filteredAssets,
      empty: "현재 필터 조건에 맞는 자산이 없습니다.",
    },
    recurring_assets: {
      label: "월 반복 자산 목록",
      list: recurringAssets,
      empty: "월 반복 자산이 없습니다.",
    },
    largest_asset: {
      label: "가장 큰 자산",
      list: largestAsset ? [largestAsset] : [],
      empty: "표시할 자산이 없습니다.",
    },
  };

  const target = popupMap[type] || popupMap.assets;

  if (refs.summaryPopupLabel) {
    refs.summaryPopupLabel.textContent = target.label;
  }

  if (!refs.summaryPopupList) return;

  refs.summaryPopupList.innerHTML = target.list.length
    ? target.list.map((item) => renderFinanceAssetPopupCard(item)).join("")
    : `<div class="empty-message">${target.empty}</div>`;

  refs.summaryPopupOverlay?.classList.remove("hidden");
}

export function openFinanceOverviewSummaryPopup(type) {
  const refs = getRefs();
  const monthKey = refs.financeMonthKey?.value || "";
  const savedBudget = getFinanceBudgetByMonth(monthKey);
  const startDay = Math.max(
    1,
    Math.min(
      31,
      Number(
        refs.financePeriodStartDay?.value ||
          savedBudget?.startDay ||
          getFinanceData().budgetSettings?.defaultStartDay ||
          1,
      ),
    ),
  );

  const period = monthKey ? getFinancePeriodRange(monthKey, startDay) : null;
  const monthlyTransactions = period
    ? getFinanceExpensesForPeriod(period.startKey, period.endKey)
    : [];
  const monthlyIncomeList = monthlyTransactions.filter(
    (item) => item.flowType === "income",
  );
  const monthlyExpenseList = monthlyTransactions.filter(
    (item) => (item.flowType || "expense") === "expense",
  );
  const assetSnapshots = buildFinanceAssetSnapshots().filter((item) =>
    String(item.title || "").trim(),
  );

  const popupMap = {
    dashboard_assets: {
      label: "총 자산 구성 목록",
      mode: "assets",
      list: assetSnapshots,
      empty: "등록된 자산이 없습니다.",
    },
    monthly_income: {
      label: "월 수입 목록",
      mode: "transactions",
      list: monthlyIncomeList,
      empty: "이번 기간 수입 내역이 없습니다.",
    },
    monthly_expense: {
      label: "월 지출 목록",
      mode: "transactions",
      list: monthlyExpenseList,
      empty: "이번 기간 지출 내역이 없습니다.",
    },
    monthly_net: {
      label: "월 순변동 목록",
      mode: "transactions",
      list: monthlyTransactions,
      empty: "이번 기간 입출금 내역이 없습니다.",
    },
  };

  const target = popupMap[type] || popupMap.dashboard_assets;

  if (refs.summaryPopupLabel) {
    refs.summaryPopupLabel.textContent = target.label;
  }

  if (!refs.summaryPopupList) return;

  if (!target.list.length) {
    refs.summaryPopupList.innerHTML = `<div class="empty-message">${target.empty}</div>`;
  } else if (target.mode === "assets") {
    refs.summaryPopupList.innerHTML = target.list
      .map((item) => renderFinanceAssetPopupCard(item))
      .join("");
  } else {
    refs.summaryPopupList.innerHTML = target.list
      .map((item) => renderFinanceExpenseCard(item))
      .join("");
  }

  refs.summaryPopupOverlay?.classList.remove("hidden");
}

export function renderFinanceAssetCategorySummary() {
  const refs = getRefs();
  if (!refs.financeAssetCategorySummaryList) return;

  const snapshots = buildFinanceAssetSnapshots().filter(
    (item) => (Number(item.currentAmount) || 0) > 0,
  );

  if (!snapshots.length) {
    refs.financeAssetCategorySummaryList.innerHTML =
      `<div class="empty-message">아직 자산 분포를 계산할 데이터가 없습니다.</div>`;
    return;
  }

  const total = snapshots.reduce(
    (sum, item) => sum + (Number(item.currentAmount) || 0),
    0,
  );

  const grouped = snapshots.reduce((acc, item) => {
    const key = item.category || "other";
    if (!acc[key]) {
      acc[key] = {
        label: item.categoryText || "기타",
        amount: 0,
      };
    }
    acc[key].amount += Number(item.currentAmount) || 0;
    return acc;
  }, {});

  const sorted = Object.entries(grouped).sort(
    (a, b) => b[1].amount - a[1].amount,
  );

  refs.financeAssetCategorySummaryList.innerHTML = sorted
    .map(([categoryKey, entry]) => {
      const amount = Number(entry.amount) || 0;
      const share = total > 0 ? Math.round((amount / total) * 100) : 0;

      return `
        <div class="item-card finance-asset-category-card" data-category="${escapeHtml(categoryKey)}">
          <div class="item-content">
            <div class="finance-asset-category-row">
              <div class="item-title">${escapeHtml(entry.label)}</div>
              <div class="finance-asset-category-total">${formatMoney(amount)}</div>
            </div>
            <div class="finance-asset-category-progress">
              <div
                class="finance-asset-category-progress-fill"
                style="width: ${Math.max(4, Math.min(100, share))}%"
              ></div>
            </div>
            <div class="item-meta compact-meta">
              <span class="meta-badge compact">비중 ${share}%</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

export function renderFinanceAssetTransactionList(transactionList = []) {
  const refs = getRefs();
  if (!refs.financeAssetTransactionList) return;

  const list = Array.isArray(transactionList)
    ? [...transactionList].sort((a, b) => {
        const aKey = `${a.date || ""} ${a.time || ""}`;
        const bKey = `${b.date || ""} ${b.time || ""}`;
        return bKey.localeCompare(aKey, "ko");
      })
    : [];

  if (!list.length) {
    refs.financeAssetTransactionList.innerHTML =
      `<div class="empty-message">등록된 입출금 내역이 없습니다.</div>`;
    financeAssetTransactionPage = 1;
    return;
  }

  const totalPages = Math.max(
    1,
    Math.ceil(list.length / FINANCE_ASSET_TRANSACTION_PAGE_SIZE),
  );

  financeAssetTransactionPage = Math.min(
    Math.max(1, financeAssetTransactionPage),
    totalPages,
  );

  const startIndex =
    (financeAssetTransactionPage - 1) * FINANCE_ASSET_TRANSACTION_PAGE_SIZE;
  const pageItems = list.slice(
    startIndex,
    startIndex + FINANCE_ASSET_TRANSACTION_PAGE_SIZE,
  );
  const pagination = `
    <div class="planner-pagination finance-asset-transaction-pagination">
      <button
        class="secondary-btn"
        type="button"
        data-action="change-finance-asset-transaction-page"
        data-direction="-1"
        ${financeAssetTransactionPage <= 1 ? "disabled" : ""}
      >
        이전
      </button>
      <span class="planner-pagination-text">${financeAssetTransactionPage} / ${totalPages} · 총 ${list.length}개</span>
      <button
        class="secondary-btn"
        type="button"
        data-action="change-finance-asset-transaction-page"
        data-direction="1"
        ${financeAssetTransactionPage >= totalPages ? "disabled" : ""}
      >
        다음
      </button>
    </div>
  `;

  refs.financeAssetTransactionList.innerHTML = [
    pagination,
    pageItems.map((item) => renderFinanceExpenseCard(item)).join(""),
    pagination,
  ].join("");
}

export function handleFinanceAssetTransactionPageChange(direction) {
  financeAssetTransactionPage += Number(direction) || 0;
  renderFinance();

  getRefs().financeAssetTransactionList?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function openFinanceEditPopup(mode = "expense") {
  const refs = getRefs();

  if (!refs.financeEditPopupOverlay || !refs.financeEditPopupMount) return;

  const targetCard =
    mode === "asset" ? refs.financeAssetFormCard : refs.financeExpenseFormCard;

  if (!targetCard) return;

  if (!targetCard.__originalParent) {
    targetCard.__originalParent = targetCard.parentNode || null;
    targetCard.__originalNextSibling = targetCard.nextSibling || null;
  }

  refs.financeEditPopupMount.innerHTML = "";
  refs.financeEditPopupMount.dataset.financePopupMode = mode;
  refs.financeEditPopupMount.appendChild(targetCard);

  targetCard.classList.remove("hidden");
  refs.financeEditPopupOverlay.classList.remove("hidden");

  document.body.classList.add("modal-open");
}

export function closeFinanceEditPopup() {
  const refs = getRefs();

  if (!refs.financeEditPopupOverlay || !refs.financeEditPopupMount) return;

  [refs.financeExpenseFormCard, refs.financeAssetFormCard].forEach((card) => {
    if (!card) return;

    const originalParent = card.__originalParent || null;
    const originalNextSibling = card.__originalNextSibling || null;

    if (originalParent) {
      if (
        originalNextSibling &&
        originalNextSibling.parentNode === originalParent
      ) {
        originalParent.insertBefore(card, originalNextSibling);
      } else {
        originalParent.appendChild(card);
      }
    }

    card.classList.add("hidden");
  });

  refs.financeEditPopupMount.innerHTML = "";
  refs.financeEditPopupMount.dataset.financePopupMode = "";
  refs.financeEditPopupOverlay.classList.add("hidden");

  document.body.classList.remove("modal-open");
}

function isRecurringFinanceAssetMaster(item) {
  return !!item && item.repeat === "monthly";
}

function buildRecurringFinanceAssetOccurrence(item, occurrenceDate) {
  return {
    ...item,
    id: `${item.id}__${occurrenceDate}`,
    sourceId: item.id,
    occurrenceDateKey: occurrenceDate,
    displayDate: occurrenceDate,
    isVirtualOccurrence: true,
  };
}

function expandRecurringAssetsInRange(sourceItems, rangeStartKey, rangeEndKey) {
  const items = Array.isArray(sourceItems) ? sourceItems : [];
  const expanded = [];
  const todayKey = formatDateKey(new Date());

  const effectiveEndKey =
    rangeEndKey && rangeEndKey < todayKey ? rangeEndKey : todayKey;

  items.forEach((item) => {
    if (!item) return;

    const baseDate = item.displayDate || item.baseDate || "";

    if (!isRecurringFinanceAssetMaster(item)) {
      if (!baseDate || baseDate <= effectiveEndKey) {
        expanded.push(item);
      }
      return;
    }

    let cursor = item.baseDate || "";
    if (!cursor) return;

    while (cursor < rangeStartKey) {
      cursor = moveFinanceMonth(cursor, 1);

      if (item.repeatUntil && cursor > item.repeatUntil) {
        break;
      }

      if (cursor > effectiveEndKey) {
        break;
      }
    }

    while (cursor && cursor <= effectiveEndKey) {
      if (item.repeatUntil && cursor > item.repeatUntil) {
        break;
      }

      expanded.push(buildRecurringFinanceAssetOccurrence(item, cursor));
      cursor = moveFinanceMonth(cursor, 1);
    }
  });

  return expanded;
}

function getAssetDisplayDateText(item) {
  const targetDate = item.displayDate || item.baseDate || "";
  if (!targetDate) return "";
  return formatKoreanDate(targetDate);
}

function isRecurringFinanceMaster(item) {
  return !!item && item.repeat === "monthly" && !item.groupId;
}

function moveFinanceMonth(dateKey, diffMonths = 1) {
  const source = new Date(`${dateKey}T00:00`);
  const originalDay = source.getDate();

  source.setDate(1);
  source.setMonth(source.getMonth() + diffMonths);

  const lastDay = new Date(
    source.getFullYear(),
    source.getMonth() + 1,
    0,
  ).getDate();

  source.setDate(Math.min(originalDay, lastDay));

  return formatDateKey(source);
}

function buildRecurringFinanceOccurrence(item, occurrenceDate) {
  return {
    ...item,
    id: `${item.id}__${occurrenceDate}`,
    sourceId: item.id,
    date: occurrenceDate,
    isVirtualOccurrence: true,
  };
}

function expandRecurringFinanceExpensesInRange(
  sourceItems,
  rangeStartKey,
  rangeEndKey,
) {
  const items = Array.isArray(sourceItems) ? sourceItems : [];
  const expanded = [];
  const todayKey = formatDateKey(new Date());

  const effectiveEndKey =
    rangeEndKey && rangeEndKey < todayKey ? rangeEndKey : todayKey;

  items.forEach((item) => {
    if (!item) return;

    if (!isRecurringFinanceMaster(item)) {
      const itemDate = item.date || "";
      if (!itemDate || itemDate <= effectiveEndKey) {
        expanded.push(item);
      }
      return;
    }

    let cursor = item.date || "";
    if (!cursor) return;

    while (cursor < rangeStartKey) {
      cursor = moveFinanceMonth(cursor, 1);

      if (item.repeatUntil && cursor > item.repeatUntil) {
        break;
      }

      if (cursor > effectiveEndKey) {
        break;
      }
    }

    while (cursor && cursor <= effectiveEndKey) {
      if (item.repeatUntil && cursor > item.repeatUntil) {
        break;
      }

      expanded.push(buildRecurringFinanceOccurrence(item, cursor));
      cursor = moveFinanceMonth(cursor, 1);
    }
  });

  return expanded;
}

export function openFinanceAssetForm() {
  if (typeof window.showFinanceAssetManagePage === "function") {
    window.showFinanceAssetManagePage();
  }

  resetFinanceAssetForm();
  openFinanceEditPopup("asset");

  setTimeout(() => {
    getRefs().financeAssetTitle?.focus();
  }, 100);
}

function renderFinanceExpenseForm(item) {
  return `
    <div class="form-grid-2">

      <div class="form-group">
        <label>유형</label>
        <select id="financeEditFlow">
          <option value="expense" ${item?.flow === "expense" ? "selected" : ""}>지출</option>
          <option value="income" ${item?.flow === "income" ? "selected" : ""}>입금</option>
        </select>
      </div>

      <div class="form-group">
        <label>금액</label>
        <input id="financeEditAmount"
          type="number"
          value="${item?.amount || ""}">
      </div>

      <div class="form-group">
        <label>카테고리</label>
        <input id="financeEditCategory"
          type="text"
          value="${item?.category || ""}">
      </div>

      <div class="form-group">
        <label>메모</label>
        <input id="financeEditMemo"
          type="text"
          value="${item?.memo || ""}">
      </div>

    </div>

    <div class="button-row">
      <button id="financeUpdateExpenseBtn" class="primary-btn">
        수정
      </button>

      <button id="financeDeleteExpenseBtn" class="danger-btn">
        삭제
      </button>
    </div>
  `;
}

function renderFinanceAssetForm(asset) {
  return `
    <div class="form-grid-2">

      <div class="form-group">
        <label>자산 이름</label>
        <input id="financeEditAssetTitle"
          value="${asset?.title || ""}">
      </div>

      <div class="form-group">
        <label>금액</label>
        <input id="financeEditAssetAmount"
          type="number"
          value="${asset?.amount || ""}">
      </div>

      <div class="form-group">
        <label>유형</label>
        <select id="financeEditAssetType">
          <option value="stock" ${asset?.type === "stock" ? "selected" : ""}>주식</option>
          <option value="saving" ${asset?.type === "saving" ? "selected" : ""}>적금</option>
          <option value="deposit" ${asset?.type === "deposit" ? "selected" : ""}>예금</option>
        </select>
      </div>

    </div>

    <div class="button-row">
      <button id="financeUpdateAssetBtn" class="primary-btn">
        수정
      </button>

      <button id="financeDeleteAssetBtn" class="danger-btn">
        삭제
      </button>
    </div>
  `;
}

