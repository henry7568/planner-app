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
  return deps.getFinanceData?.() || {
    monthlyBudgets: {},
    expenses: [],
  };
}

function setFinanceData(value) {
  deps.setFinanceData?.(value);
}

function getFinanceEditingExpenseId() {
  return deps.getFinanceEditingExpenseId?.() || null;
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
    expenses: Array.isArray(current.expenses) ? [...current.expenses] : [],
  };
}

export function initFinance() {
  const refs = getRefs();
  const loaded = loadFinanceLocal();

  setFinanceData(loaded);

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

  syncFinanceSubCategoryOptions(refs.financeExpenseCategory?.value || "");
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
  const monthlyExpenses = getFinanceExpensesForPeriod(
    period.startKey,
    period.endKey,
  );

  const monthlySpent = monthlyExpenses.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  const todayKey = formatDateKey(new Date());

  const todaySpent = monthlyExpenses
    .filter((item) => item.date === todayKey)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const remaining = budget - monthlySpent;
  const progress =
    budget > 0 ? Math.min(999, Math.round((monthlySpent / budget) * 100)) : 0;

  if (refs.financeCurrentPeriodLabel) {
    refs.financeCurrentPeriodLabel.textContent =
      `${formatKoreanDate(period.startKey)} ~ ${formatKoreanDate(period.endKey)}`;
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
    refs.financeMonthlySpentText.textContent = formatMoney(monthlySpent);
  }

  if (refs.financeBudgetProgressText) {
    refs.financeBudgetProgressText.textContent = `${progress}%`;
  }

  if (refs.financeBudgetProgressBar) {
    refs.financeBudgetProgressBar.style.width = `${Math.min(progress, 100)}%`;
  }

  renderFinanceFilterOptions();

  const filteredExpenses = getFinanceFilteredExpenses();
  renderFinanceExpenseList(filteredExpenses);
  renderFinanceCategorySummary(filteredExpenses);
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
  return getFinanceData().expenses.filter((item) => {
    return item.date >= startKey && item.date <= endKey;
  });
}

export function saveFinanceExpense() {
  const refs = getRefs();

  const date = refs.financeExpenseDate?.value || "";
  const title = refs.financeExpenseTitle?.value.trim() || "";
  const amount = Math.max(0, Number(refs.financeExpenseAmount?.value) || 0);
  const category = refs.financeExpenseCategory?.value || "";

  const time = refs.financeExpenseTime?.value || "";
  const color = refs.financeExpenseColor?.value || "blue";
  const paymentMethod = refs.financeExpensePaymentMethod?.value || "";
  const merchant = refs.financeExpenseMerchant?.value.trim() || "";
  const tag = refs.financeExpenseTag?.value.trim() || "";
  const memo = refs.financeExpenseMemo?.value.trim() || "";
  const subCategory = refs.financeExpenseSubCategory?.value || "";

  if (!date) {
    alert("지출 날짜를 입력하세요.");
    refs.financeExpenseDate?.focus();
    return;
  }

  if (!title) {
    alert("항목명을 입력하세요.");
    refs.financeExpenseTitle?.focus();
    return;
  }

  if (!amount) {
    alert("금액을 입력하세요.");
    refs.financeExpenseAmount?.focus();
    return;
  }

  if (!category) {
    alert("카테고리를 선택하세요.");
    refs.financeExpenseCategory?.focus();
    return;
  }

  const editingId = getFinanceEditingExpenseId();

  const payload = {
    id: editingId || makeId(),
    date,
    time,
    title,
    amount,
    category,
    subCategory,
    paymentMethod,
    merchant,
    tag,
    memo,
    color,
    updatedAt: Date.now(),
  };

  const nextData = cloneFinanceData();

  if (editingId) {
    nextData.expenses = nextData.expenses.map((item) =>
      item.id === editingId
        ? {
            ...item,
            ...payload,
          }
        : item,
    );
  } else {
    nextData.expenses.push({
      ...payload,
      createdAt: Date.now(),
    });
  }

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  resetFinanceExpenseForm();
  renderFinance();

  alert(editingId ? "지출이 수정되었습니다." : "지출이 저장되었습니다.");
}

export function resetFinanceExpenseForm() {
  const refs = getRefs();

  setFinanceEditingExpenseId(null);

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

  if (refs.financeExpensePaymentMethod) {
    refs.financeExpensePaymentMethod.value = "";
  }

  if (refs.financeExpenseMerchant) {
    refs.financeExpenseMerchant.value = "";
  }

  if (refs.financeExpenseTag) {
    refs.financeExpenseTag.value = "";
  }

  if (refs.financeExpenseMemo) {
    refs.financeExpenseMemo.value = "";
  }

  if (refs.financeExpenseColor) {
    refs.financeExpenseColor.value = "blue";
  }

  syncFinanceExpenseFormButtons();
}

export function renderFinanceExpenseList(expenseList) {
  const refs = getRefs();
  if (!refs.financeExpenseList) return;

  const sorted = [...expenseList].sort((a, b) => {
    const aTime = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
    const bTime = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
    return bTime - aTime;
  });

  if (sorted.length === 0) {
    refs.financeExpenseList.innerHTML =
      `<div class="empty-message">아직 저장된 지출이 없습니다.</div>`;

    if (refs.financePageText) refs.financePageText.textContent = "1 / 1";
    refs.financePrevPageBtn?.setAttribute("disabled", "true");
    refs.financeNextPageBtn?.setAttribute("disabled", "true");
    return;
  }

  const { pageItems, totalPages, currentPage } = getFinancePagedExpenses(sorted);

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
  return `
    <div
      class="item-card item-color-${item.color || "blue"} clickable-item-card"
      data-action="open-edit-finance-expense"
      data-id="${item.id}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <div class="item-content">
        <div class="item-title">${escapeHtml(item.title || "")}</div>
        <div class="item-meta compact-meta">
          <span class="meta-badge compact">${formatKoreanDate(item.date)}${item.time ? ` ${item.time}` : ""}</span>
          <span class="meta-badge compact">${formatMoney(item.amount)}</span>
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
            item.paymentMethod
              ? `<span class="tag-badge">${escapeHtml(getFinancePaymentMethodText(item.paymentMethod))}</span>`
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
        </div>
      </div>

      <div class="item-actions">
        <button
          class="delete-btn"
          type="button"
          data-action="delete-finance-expense"
          data-id="${item.id}"
        >
          삭제
        </button>
      </div>
    </div>
  `;
}

export function deleteFinanceExpense(id) {
  const ok = confirm("이 지출을 삭제할까요?");
  if (!ok) return;

  const nextData = cloneFinanceData();
  nextData.expenses = nextData.expenses.filter((item) => item.id !== id);

  if (getFinanceEditingExpenseId() === id) {
    resetFinanceExpenseForm();
  }

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  renderFinance();
}

export function renderFinanceFilterOptions() {
  const refs = getRefs();

  if (refs.financeListMonthFilter) {
    const monthKeys = [
      ...new Set(
        getFinanceData().expenses.map((item) => String(item.date || "").slice(0, 7)),
      ),
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

  if (refs.financeListCategoryFilter) {
    const categories = [
      ...new Set(getFinanceData().expenses.map((item) => item.category || "")),
    ]
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
}

export function getFinanceFilteredExpenses() {
  const refs = getRefs();

  const monthFilterValue = refs.financeListMonthFilter?.value || "";
  const categoryFilterValue = refs.financeListCategoryFilter?.value || "";
  const paymentFilterValue = refs.financeListPaymentFilter?.value || "";
  const searchValue = (refs.financeListSearchInput?.value || "")
    .trim()
    .toLowerCase();

  let list = [...getFinanceData().expenses];

  if (monthFilterValue) {
    list = list.filter((item) =>
      String(item.date || "").startsWith(monthFilterValue),
    );
  }

  if (categoryFilterValue) {
    list = list.filter((item) => (item.category || "") === categoryFilterValue);
  }

  if (paymentFilterValue) {
    list = list.filter(
      (item) => (item.paymentMethod || "") === paymentFilterValue,
    );
  }

  if (searchValue) {
    list = list.filter((item) => {
      const target = [
        item.title,
        item.category,
        item.subCategory,
        item.merchant,
        item.tag,
        item.memo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return target.includes(searchValue);
    });
  }

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
    기타: ["기타"],
  };
}

export function syncFinanceSubCategoryOptions(categoryValue, selectedValue = "") {
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
    refs.financeCategorySummaryList.innerHTML =
      `<div class="empty-message">표시할 카테고리 합계가 없습니다.</div>`;
    return;
  }

  const totalAmount = expenseList.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  const grouped = expenseList.reduce((acc, item) => {
    const key = item.category || "미분류";
    acc[key] = (acc[key] || 0) + (Number(item.amount) || 0);
    return acc;
  }, {});

  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  refs.financeCategorySummaryList.innerHTML = sorted
    .map(([category, amount]) => {
      const ratio =
        totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0;

      return `
        <div class="item-card">
          <div class="item-content">
            <div class="item-title">${escapeHtml(category)}</div>
            <div class="item-meta compact-meta">
              <span class="meta-badge compact">${formatMoney(amount)}</span>
              <span class="tag-badge">${ratio}%</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

export function startEditFinanceExpense(id) {
  const refs = getRefs();
  const item = getFinanceData().expenses.find((x) => x.id === id);
  if (!item) return;

  setFinanceEditingExpenseId(id);

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

  if (refs.financeExpensePaymentMethod) {
    refs.financeExpensePaymentMethod.value = item.paymentMethod || "";
  }

  if (refs.financeExpenseMerchant) {
    refs.financeExpenseMerchant.value = item.merchant || "";
  }

  if (refs.financeExpenseTag) {
    refs.financeExpenseTag.value = item.tag || "";
  }

  if (refs.financeExpenseMemo) {
    refs.financeExpenseMemo.value = item.memo || "";
  }

  if (refs.financeExpenseColor) {
    refs.financeExpenseColor.value = item.color || "blue";
  }

  syncFinanceExpenseFormButtons();

  refs.financeExpenseFormCard?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function deleteEditingFinanceExpense() {
  const editingId = getFinanceEditingExpenseId();
  if (!editingId) return;

  const ok = confirm("현재 수정 중인 지출을 삭제할까요?");
  if (!ok) return;

  const nextData = cloneFinanceData();
  nextData.expenses = nextData.expenses.filter(
    (item) => item.id !== editingId,
  );

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  resetFinanceExpenseForm();
  renderFinance();
}

export function syncFinanceExpenseFormButtons() {
  const refs = getRefs();

  if (refs.financeSaveExpenseBtn) {
    refs.financeSaveExpenseBtn.textContent = getFinanceEditingExpenseId()
      ? "지출 수정"
      : "지출 저장";
  }

  refs.financeCancelExpenseEditBtn?.classList.toggle(
    "hidden",
    !getFinanceEditingExpenseId(),
  );

  refs.financeDeleteExpenseBtn?.classList.toggle(
    "hidden",
    !getFinanceEditingExpenseId(),
  );
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