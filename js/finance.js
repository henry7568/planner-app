// finance.js
import {
  formatDateKey,
  formatKoreanDate,
  formatMoney,
  makeId,
  escapeHtml,
} from "./utils.js";

import { loadFinanceLocal, saveFinanceLocal } from "./storage.js";

let deps = {};

export function configureFinanceModule(config) {
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
    }
  );
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

  return {
    monthlyBudgets: { ...(current.monthlyBudgets || {}) },

    expenses: Array.isArray(current.expenses)
      ? current.expenses.map((item) => ({
          ...item,
          flowType: item.flowType || "expense",
        }))
      : [],

    assets: Array.isArray(current.assets)
      ? current.assets.map((item) => ({
          ...item,
        }))
      : [],
  };
}

export function initFinance() {
  const refs = getRefs();
  const loaded = loadFinanceLocal();

  const normalized = {
    monthlyBudgets:
      loaded && typeof loaded.monthlyBudgets === "object"
        ? loaded.monthlyBudgets
        : {},

    expenses: Array.isArray(loaded?.expenses)
      ? loaded.expenses.map((item) => ({
          ...item,
          flowType: item.flowType || "expense",
        }))
      : [],

    assets: Array.isArray(loaded?.assets) ? loaded.assets : [],
  };

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
    refs.financeBudgetAmount.value = currentBudget?.budget || "";
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

export function getFinanceBudgetByMonth(monthKey) {
  if (!monthKey) return null;
  return getFinanceData().monthlyBudgets?.[monthKey] || null;
}

export function saveFinanceBudget() {
  const refs = getRefs();

  const monthKey = refs.financeMonthKey?.value || "";
  const startDay = Math.max(
    1,
    Math.min(31, Number(refs.financePeriodStartDay?.value) || 1),
  );
  const budget = Math.max(0, Number(refs.financeBudgetAmount?.value) || 0);

  if (!monthKey) {
    alert("기준 월을 선택하세요.");
    refs.financeMonthKey?.focus();
    return;
  }

  const nextData = cloneFinanceData();

  nextData.monthlyBudgets[monthKey] = {
    monthKey,
    startDay,
    budget,
    updatedAt: Date.now(),
  };

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  renderFinance();
  alert("예산이 저장되었습니다.");
}

export function renderFinance() {
  const refs = getRefs();

  const monthKey = refs.financeMonthKey?.value || "";
  if (!monthKey) return;

  const savedBudget = getFinanceBudgetByMonth(monthKey);

  const startDay = Math.max(
    1,
    Math.min(
      31,
      Number(refs.financePeriodStartDay?.value || savedBudget?.startDay || 1),
    ),
  );

  const budget = Math.max(
    0,
    Number(refs.financeBudgetAmount?.value || savedBudget?.budget || 0),
  );

  if (refs.financePeriodStartDay) {
    refs.financePeriodStartDay.value = startDay;
  }

  if (
    savedBudget &&
    refs.financeBudgetAmount &&
    !refs.financeBudgetAmount.matches(":focus")
  ) {
    refs.financeBudgetAmount.value = savedBudget.budget || "";
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
    refs.financeMonthlySpentText.textContent = formatMoney(monthlyExpenseTotal);
  }

  if (refs.financeMonthlyIncomeText) {
    refs.financeMonthlyIncomeText.textContent = formatMoney(monthlyIncomeTotal);
  }

  if (refs.financeMonthlyNetText) {
    refs.financeMonthlyNetText.textContent = formatMoney(monthlyNet);
  }

  if (refs.financeBudgetProgressText) {
    refs.financeBudgetProgressText.textContent = `${progress}%`;
  }

  if (refs.financeBudgetProgressBar) {
    refs.financeBudgetProgressBar.style.width = `${Math.min(progress, 100)}%`;
  }

  renderFinanceFilterOptions();

  const filteredTransactions = getFinanceFilteredExpenses();
  const expenseOnlyList = filteredTransactions.filter(
    (item) => (item.flowType || "expense") === "expense",
  );

  renderFinanceExpenseList(expenseOnlyList);
  renderFinanceCategorySummary(expenseOnlyList);
  renderFinanceAssetSummary(filteredTransactions);
  renderFinanceAssetTransactionList(filteredTransactions);

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
    refs.financeSummaryExpenseCountText.textContent = `${filteredTransactions.length}건`;
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

export function saveFinanceExpense() {
  const refs = getRefs();

  const date = refs.financeExpenseDate?.value || "";
  const title = refs.financeExpenseTitle?.value.trim() || "";
  const amount = Math.max(0, Number(refs.financeExpenseAmount?.value) || 0);
  const category = refs.financeExpenseCategory?.value || "";

  const flowType = refs.financeTransactionType?.value || "expense";
  const time = refs.financeExpenseTime?.value || "";
  const color = refs.financeExpenseColor?.value || "blue";
  const paymentMethod = refs.financeExpensePaymentMethod?.value || "";
  const merchant = refs.financeExpenseMerchant?.value.trim() || "";
  const tag = refs.financeExpenseTag?.value.trim() || "";
  const subCategory = refs.financeExpenseSubCategory?.value || "";

  const repeat = refs.financeExpenseRepeat?.value || "none";
  const repeatUntil = refs.financeExpenseRepeatUntil?.value || "";

  if (!date) {
    alert("날짜를 입력하세요.");
    refs.financeExpenseDate?.focus();
    return { ok: false };
  }

  if (!title) {
    alert("항목명을 입력하세요.");
    refs.financeExpenseTitle?.focus();
    return { ok: false };
  }

  if (!amount) {
    alert("금액을 입력하세요.");
    refs.financeExpenseAmount?.focus();
    return { ok: false };
  }

  if (!category) {
    alert(
      flowType === "income"
        ? "입금 카테고리를 선택하세요."
        : "지출 카테고리를 선택하세요.",
    );
    refs.financeExpenseCategory?.focus();
    return { ok: false };
  }

  const subCategoryOptions = getFinanceSubCategoryMap()[category] || [];
  if (subCategoryOptions.length > 0 && !subCategory) {
    alert("서브카테고리를 선택하세요.");
    refs.financeExpenseSubCategory?.focus();
    return { ok: false };
  }

  if (
    repeat === "monthly" &&
    repeatUntil &&
    new Date(`${repeatUntil}T00:00`) < new Date(`${date}T00:00`)
  ) {
    alert("반복 종료일은 날짜보다 같거나 뒤여야 합니다.");
    refs.financeExpenseRepeatUntil?.focus();
    return { ok: false };
  }

  const editingId = String(getFinanceEditingExpenseId() || "").split("__")[0];
  const nextData = cloneFinanceData();

  if (editingId) {
    nextData.expenses = nextData.expenses.map((item) =>
      item.id === editingId
        ? {
            ...item,
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
            flowType,
            repeat,
            repeatUntil,
            isRecurring: repeat !== "none",
            updatedAt: Date.now(),
          }
        : item,
    );

    setFinanceData(nextData);
    saveFinanceLocal(nextData);
    setFinancePage(1);
    resetFinanceExpenseForm();
    renderFinance();

    alert(
      flowType === "income"
        ? "입금 내역이 수정되었습니다."
        : "지출 내역이 수정되었습니다.",
    );
    return {
      ok: true,
      mode: "edit",
      flowType,
    };
  }

  nextData.expenses.push({
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
    flowType,
    repeat,
    repeatUntil,
    isRecurring: repeat !== "none",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  setFinancePage(1);
  resetFinanceExpenseForm();
  renderFinance();

  alert(
    flowType === "income"
      ? "입금 내역이 저장되었습니다."
      : "지출 내역이 저장되었습니다.",
  );

  return {
    ok: true,
    mode: "create",
    flowType,
    repeat,
    count: 1,
  };
}

export function resetFinanceExpenseForm() {
  const refs = getRefs();

  setFinanceEditingExpenseId(null);

  if (refs.financeTransactionType) {
    refs.financeTransactionType.value = "expense";
  }

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
    refs.financeExpenseList.innerHTML = `<div class="empty-message">조건에 맞는 내역이 없습니다.</div>`;

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
    item.repeat === "monthly" ? `<span class="tag-badge">매월반복</span>` : "";

  const flowType = item.flowType || "expense";
  const flowText = flowType === "income" ? "수익" : "지출";
  const signedAmount =
    flowType === "income"
      ? `+ ${formatMoney(item.amount)}`
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

  const ok = confirm("이 내역을 삭제할까요?");
  if (!ok) return;

  const nextData = cloneFinanceData();

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
      <option value="expense">지출</option>
      <option value="income">수익</option>
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
    생활용품: ["생필품", "욕실용품", "주방용품", "청소용품", "기타"],
    쇼핑: ["의류", "신발", "잡화", "전자기기", "온라인쇼핑", "기타"],
    교통: ["대중교통", "택시", "주유", "주차", "기타"],
    의료: ["병원", "약국", "검사", "치과", "기타"],
    여가생활: ["영화", "공연", "여행", "전시", "기타"],
    취미: ["게임", "운동", "독서", "음악", "기타"],
    "주거/통신": ["월세", "관리비", "전기/가스", "통신비", "인터넷", "기타"],
    교육: ["학원", "수강료", "교재", "시험응시료", "기타"],
    저축: ["적금", "예금", "투자", "비상금", "기타"],

    급여: ["월급", "상여", "보너스", "기타"],
    용돈: ["가족", "지인", "기타"],
    환급: ["카드환급", "세금환급", "취소환불", "기타"],
    이자: ["예금이자", "적금이자", "기타"],
    투자수익: ["주식매도", "배당금", "기타"],
    기타수익: ["중고판매", "부수입", "기타"],

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

  subCategoryInput.innerHTML = `<option value="">선택</option>`;

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
      (item.flowType || "expense") === "income" ? "수익" : "지출";
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

  setFinanceEditingExpenseId(targetId);

  if (refs.financeTransactionType) {
    refs.financeTransactionType.value = item.flowType || "expense";
  }

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
  const noun = flowType === "income" ? "수익" : "지출";

  if (refs.financeSaveExpenseBtn) {
    refs.financeSaveExpenseBtn.textContent = isEditing
      ? `${noun} 수정`
      : `${noun} 저장`;
  }

  const formTitle = refs.financeExpenseFormCard?.querySelector("h2");
  if (formTitle) {
    formTitle.textContent = isEditing ? `${noun} 수정` : `${noun} 추가`;
  }

  refs.financeCancelExpenseEditBtn?.classList.toggle("hidden", !isEditing);
  refs.financeDeleteExpenseBtn?.classList.toggle("hidden", !isEditing);
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
      : "내역 추가";
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

export function resetFinanceAssetForm() {
  const refs = getRefs();

  setFinanceEditingAssetId(null);

  if (refs.financeAssetCategory) {
    refs.financeAssetCategory.value = "stock";
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

  if (refs.financeAssetTitle) {
    refs.financeAssetTitle.value = item.title || "";
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
    alert("반복 종료일은 기준 날짜보다 같거나 뒤여야 합니다.");
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

  if (refs.financeTotalAssetText) {
    refs.financeTotalAssetText.textContent = formatMoney(totalAssetAmount);
  }

  if (!refs.financeAssetList) return;

  if (!expandedAssets.length) {
    refs.financeAssetList.innerHTML =
      `<div class="empty-message">등록된 자산이 없습니다.</div>`;
    return;
  }

  const categoryTextMap = {
    stock: "주식",
    savings: "적금",
    deposit: "예금",
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
          ? `<span class="tag-badge">매월반복</span>`
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
              <div class="item-title">${escapeHtml(item.title || "")}</div>
              <div class="finance-amount-strong">${formatMoney(item.amount)}</div>
            </div>
            <div class="item-meta compact-meta">
              <span class="tag-badge">${escapeHtml(categoryText)}</span>
              ${dateText ? `<span class="meta-badge compact">${escapeHtml(dateText)}</span>` : ""}
              ${repeatText}
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

  const list = Array.isArray(transactionList) ? [...transactionList] : [];

  if (!list.length) {
    refs.financeAssetTransactionList.innerHTML =
      `<div class="empty-message">등록된 입출금 내역이 없습니다.</div>`;
    return;
  }

  refs.financeAssetTransactionList.innerHTML = list
    .sort((a, b) => {
      const aKey = `${a.date || ""} ${a.time || ""}`;
      const bKey = `${b.date || ""} ${b.time || ""}`;
      return bKey.localeCompare(aKey, "ko");
    })
    .map((item) => renderFinanceExpenseCard(item))
    .join("");
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