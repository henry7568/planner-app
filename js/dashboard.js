// dashboard.js
import { escapeHtml, formatDateKey } from "./utils.js";
import { renderCard, renderSelectedCard } from "./renderItems.js";
import { getStatusSymbol } from "./plannerItems.js";
import {
  sortItems,
  isItemOnDate,
  getTodoDiffMinutes,
  getItemsForDate,
} from "./calendar.js";
import { expandRecurringPlannerItemsInRange } from "./repeat.js";
import { COIN_KRW_VALUE, getCoinBalance } from "./rewards.js";

let deps = {};
let coinLedgerPage = 1;
let coinLedgerFilterKey = "";
const COIN_LEDGER_PAGE_SIZE = 5;
const STATUS_LEDGER_TYPES = new Set([
  "earn",
  "revoke",
  "fail_penalty",
  "fail_refund",
]);

export function configureDashboardModule(config) {
  deps = config;
}

function getItems() {
  return deps.getItems?.() || [];
}

function getRewardsData() {
  return deps.getRewardsData?.() || {};
}

function getSelectedFilterType() {
  return deps.getSelectedFilterType?.() || "";
}

function getSelectedFilterYear() {
  return deps.getSelectedFilterYear?.() || "";
}

function getSelectedFilterMonth() {
  return deps.getSelectedFilterMonth?.() || "";
}

function getDashboardPage() {
  return deps.getDashboardPage?.() || 1;
}

function setDashboardPage(value) {
  deps.setDashboardPage?.(value);
}

function getRefs() {
  return deps.refs || {};
}

function shouldHideCompletedDashboardItems() {
  return deps.shouldHideCompletedDashboardItems?.() || false;
}

export function renderDashboard() {
  const {
    totalCount,
    pendingCount,
    failCount,
    successCount,
    dashboardTodoCount,
    dashboardScheduleCount,
    dashboardTodayCount,
    dashboardUrgentTodoCount,
    achievementRate,
    achievementBarFill,
    achievementDesc,
    coinBalanceText,
    hobbyBudgetText,
    coinLedgerList,
    dashboardItemList,
  } = getRefs();

  const pageSize = deps.dashboardPageSize || 10;
  const filtered = sortItems(getFilteredItems());

  if (totalCount) totalCount.textContent = filtered.length;

  if (pendingCount) {
    pendingCount.textContent = filtered.filter(
      (item) => item.status === "pending",
    ).length;
  }

  if (failCount) {
    failCount.textContent = filtered.filter(
      (item) => item.status === "fail",
    ).length;
  }

  if (successCount) {
    successCount.textContent = filtered.filter(
      (item) => item.status === "success",
    ).length;
  }

  if (dashboardTodoCount) {
    dashboardTodoCount.textContent = filtered.filter(
      (item) => item.type === "todo",
    ).length;
  }

  if (dashboardScheduleCount) {
    dashboardScheduleCount.textContent = filtered.filter(
      (item) => item.type === "schedule",
    ).length;
  }

  const todayKey = formatDateKey(new Date());

  if (dashboardTodayCount) {
    dashboardTodayCount.textContent = filtered.filter((item) =>
      isItemOnDate(todayKey, item),
    ).length;
  }

  if (dashboardUrgentTodoCount) {
    dashboardUrgentTodoCount.textContent = filtered.filter((item) => {
      if (item.type !== "todo") return false;
      const diff = getTodoDiffMinutes(item);
      return diff >= 0 && diff <= 1440;
    }).length;
  }

  const rate = getAchievementRate(filtered);

  if (achievementRate) achievementRate.textContent = `${rate}%`;
  if (achievementBarFill) achievementBarFill.style.width = `${rate}%`;

  const completedBase = filtered.filter(
    (item) => item.status === "success" || item.status === "fail",
  ).length;

  if (achievementDesc) {
    achievementDesc.textContent =
      completedBase === 0
        ? "완료 / (완료 + 미완료) 기준 · 아직 계산할 항목이 없습니다."
        : `완료 / (완료 + 미완료) 기준 · ${completedBase}개 반영`;
  }

  renderCoinDashboard({
    coinBalanceText,
    hobbyBudgetText,
    coinLedgerList,
    filteredItems: filtered,
  });

  if (!dashboardItemList) return;

  if (filtered.length === 0) {
    dashboardItemList.innerHTML = `
      <div class="empty-message">현재 표시할 항목이 없습니다.</div>
    `;
    return;
  }

  const visibleList = shouldHideCompletedDashboardItems()
    ? filtered.filter((item) => item.status !== "success")
    : filtered;

  if (visibleList.length === 0) {
    dashboardItemList.innerHTML = `
      <div class="empty-message">표시할 항목이 없습니다.</div>
    `;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(visibleList.length / pageSize));

  if (getDashboardPage() > totalPages) {
    setDashboardPage(totalPages);
  }

  const currentPage = getDashboardPage();
  const startIndex = (currentPage - 1) * pageSize;
  const visibleItems = visibleList.slice(startIndex, startIndex + pageSize);

  dashboardItemList.innerHTML = `
    ${visibleItems.map((item) => renderCard(item, getStatusSymbol)).join("")}

    <div class="pagination-wrap">
      <button
        class="secondary-btn"
        type="button"
        id="dashboardPrevPageBtn"
        ${currentPage === 1 ? "disabled" : ""}
      >
        이전
      </button>

      <span class="pagination-text">
        ${currentPage} / ${totalPages}
      </span>

      <button
        class="secondary-btn"
        type="button"
        id="dashboardNextPageBtn"
        ${currentPage === totalPages ? "disabled" : ""}
      >
        다음
      </button>
    </div>
  `;

  document
    .getElementById("dashboardPrevPageBtn")
    ?.addEventListener("click", () => {
      if (getDashboardPage() > 1) {
        setDashboardPage(getDashboardPage() - 1);
        renderDashboard();

        requestAnimationFrame(() => {
          dashboardItemList?.closest(".card")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    });

  document
    .getElementById("dashboardNextPageBtn")
    ?.addEventListener("click", () => {
      if (getDashboardPage() < totalPages) {
        setDashboardPage(getDashboardPage() + 1);
        renderDashboard();

        requestAnimationFrame(() => {
          dashboardItemList?.closest(".card")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    });
}

export function renderTodayList() {
  const { todayList } = getRefs();
  if (!todayList) return;

  const todayKey = formatDateKey(new Date());
  const todayItems = getItemsForDate(todayKey);

  if (todayItems.length === 0) {
    todayList.innerHTML = `<div class="empty-message">오늘 항목이 없습니다.</div>`;
    return;
  }

  todayList.innerHTML = todayItems
    .map((item) => renderCard(item, getStatusSymbol))
    .join("");
}

function getLegacyCoinLedgerLabel(type, fallback) {
  const labelMap = {
    earn: "획득",
    revoke: "회수",
    fail_penalty: "실패 차감",
    fail_refund: "차감 복구",
    spend: "사용",
  };

  return labelMap[type] || fallback || "기록";
}

function renderLegacyCoinDashboard({ coinBalanceText, hobbyBudgetText, coinLedgerList }) {
  const rewards = getRewardsData();
  const balance = getCoinBalance(rewards);
  const hobbyBudget = balance * COIN_KRW_VALUE;

  if (coinBalanceText) coinBalanceText.textContent = `${balance.toLocaleString()}C`;
  if (hobbyBudgetText) {
    hobbyBudgetText.textContent = `${hobbyBudget.toLocaleString()}원`;
  }

  if (!coinLedgerList) return;

  const ledger = Array.isArray(rewards.ledger) ? rewards.ledger.slice(0, 8) : [];
  if (ledger.length === 0) {
    coinLedgerList.innerHTML = `<div class="empty-message compact-empty">아직 코인 기록이 없습니다.</div>`;
    return;
  }

  coinLedgerList.innerHTML = ledger
    .map((entry) => {
      const amount = Number(entry.amount) || 0;
      const sign = amount > 0 ? "+" : "";
      const label =
        entry.type === "earn"
          ? "획득"
          : entry.type === "revoke"
            ? "회수"
            : "사용";
      const title = entry.itemTitle || "취미생활 사용";
      const date = new Date(Number(entry.createdAt) || Date.now());
      const krw = Math.abs(amount) * COIN_KRW_VALUE;

      return `
        <div class="coin-ledger-row">
          <div>
            <strong>${getCoinLedgerLabel(entry.type, label)}</strong>
            <span>${escapeHtml(title)}</span>
          </div>
          <div class="coin-ledger-amount ${amount < 0 ? "negative" : "positive"}">
            ${sign}${amount.toLocaleString()}C
            <small>${krw.toLocaleString()}원</small>
          </div>
          <time>${date.toLocaleDateString("ko-KR")}</time>
        </div>
      `;
    })
    .join("");
}

function getCoinAmountHtml(amount, sign = "") {
  return `<span class="coin-amount"><span class="coin-icon" aria-hidden="true"></span>${sign}${amount.toLocaleString()}</span>`;
}

function getFilteredRewardTargetKeys(filteredItems) {
  return new Set(
    (filteredItems || [])
      .map((item) => item.sourceId || item.id)
      .filter(Boolean),
  );
}

function getCoinFilterKey(targetKeys, isFilterActive) {
  return JSON.stringify({
    type: getSelectedFilterType(),
    year: getSelectedFilterYear(),
    month: getSelectedFilterMonth(),
    active: isFilterActive,
    keys: [...targetKeys].sort(),
  });
}

function getDisplayLedgerEntries(ledger, targetKeys, isFilterActive) {
  const filtered = isFilterActive
    ? ledger.filter((entry) => entry.targetKey && targetKeys.has(entry.targetKey))
    : ledger;

  const seenTargets = new Set();
  const displayEntries = [];

  filtered.forEach((entry) => {
    if (STATUS_LEDGER_TYPES.has(entry.type)) {
      if (!entry.targetKey || seenTargets.has(entry.targetKey)) return;
      seenTargets.add(entry.targetKey);
      if (entry.type === "earn" || entry.type === "fail_penalty") {
        displayEntries.push(entry);
      }
      return;
    }

    if (!isFilterActive || entry.targetKey) {
      displayEntries.push(entry);
    }
  });

  return displayEntries.sort(
    (a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0),
  );
}

function getCoinLedgerLabel(type) {
  const labelMap = {
    earn: "획득",
    revoke: "회수",
    fail_penalty: "실패 차감",
    fail_refund: "차감 복구",
    spend: "사용",
  };

  return labelMap[type] || "기록";
}

function renderCoinDashboard({
  coinBalanceText,
  hobbyBudgetText,
  coinLedgerList,
  filteredItems = [],
}) {
  const rewards = getRewardsData();
  const targetKeys = getFilteredRewardTargetKeys(filteredItems);
  const isFilterActive = Boolean(
    getSelectedFilterType() || getSelectedFilterYear() || getSelectedFilterMonth(),
  );
  const nextFilterKey = getCoinFilterKey(targetKeys, isFilterActive);

  if (nextFilterKey !== coinLedgerFilterKey) {
    coinLedgerFilterKey = nextFilterKey;
    coinLedgerPage = 1;
  }

  const ledger = getDisplayLedgerEntries(
    Array.isArray(rewards.ledger) ? rewards.ledger : [],
    targetKeys,
    isFilterActive,
  );
  const balance = ledger.reduce(
    (sum, entry) => sum + (Number(entry.amount) || 0),
    0,
  );
  const hobbyBudget = balance * COIN_KRW_VALUE;

  if (coinBalanceText) {
    coinBalanceText.innerHTML = getCoinAmountHtml(balance);
  }
  if (hobbyBudgetText) {
    hobbyBudgetText.textContent = `${hobbyBudget.toLocaleString()}원`;
  }

  if (!coinLedgerList) return;

  if (ledger.length === 0) {
    coinLedgerList.innerHTML = `<div class="empty-message compact-empty">아직 코인 기록이 없습니다.</div>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(ledger.length / COIN_LEDGER_PAGE_SIZE));
  if (coinLedgerPage > totalPages) coinLedgerPage = totalPages;

  const startIndex = (coinLedgerPage - 1) * COIN_LEDGER_PAGE_SIZE;
  const visibleLedger = ledger.slice(
    startIndex,
    startIndex + COIN_LEDGER_PAGE_SIZE,
  );

  coinLedgerList.innerHTML = `
    ${visibleLedger
      .map((entry) => {
        const amount = Number(entry.amount) || 0;
        const sign = amount > 0 ? "+" : "";
        const title = entry.itemTitle || "취미생활 사용";
        const date = new Date(Number(entry.createdAt) || Date.now());
        const krw = Math.abs(amount) * COIN_KRW_VALUE;

        return `
          <div class="coin-ledger-row">
            <div>
              <strong>${getCoinLedgerLabel(entry.type)}</strong>
              <span>${escapeHtml(title)}</span>
            </div>
            <div class="coin-ledger-amount ${amount < 0 ? "negative" : "positive"}">
              ${getCoinAmountHtml(Math.abs(amount), sign)}
              <small>${krw.toLocaleString()}원</small>
            </div>
            ${
              entry.type === "spend"
                ? `
                  <div class="coin-ledger-actions">
                    <button class="secondary-btn" type="button" data-action="edit-coin-spend" data-id="${entry.id}">수정</button>
                    <button class="secondary-btn" type="button" data-action="delete-coin-spend" data-id="${entry.id}">삭제</button>
                  </div>
                `
                : ""
            }
            <time>${date.toLocaleDateString("ko-KR")}</time>
          </div>
        `;
      })
      .join("")}
    <div class="coin-ledger-pagination">
      <button
        class="secondary-btn"
        type="button"
        id="coinLedgerPrevPageBtn"
        ${coinLedgerPage === 1 ? "disabled" : ""}
      >
        이전
      </button>
      <span>${coinLedgerPage} / ${totalPages}</span>
      <button
        class="secondary-btn"
        type="button"
        id="coinLedgerNextPageBtn"
        ${coinLedgerPage === totalPages ? "disabled" : ""}
      >
        다음
      </button>
    </div>
  `;

  document.getElementById("coinLedgerPrevPageBtn")?.addEventListener("click", () => {
    if (coinLedgerPage <= 1) return;
    coinLedgerPage -= 1;
    renderDashboard();
  });

  document.getElementById("coinLedgerNextPageBtn")?.addEventListener("click", () => {
    if (coinLedgerPage >= totalPages) return;
    coinLedgerPage += 1;
    renderDashboard();
  });
}

export function getSummaryList(type, filtered) {
  const todayKey = formatDateKey(new Date());

  if (type === "all") return sortItems(filtered);
  if (type === "pending") {
    return sortItems(filtered.filter((item) => item.status === "pending"));
  }
  if (type === "fail") {
    return sortItems(filtered.filter((item) => item.status === "fail"));
  }
  if (type === "success") {
    return sortItems(filtered.filter((item) => item.status === "success"));
  }
  if (type === "todo") {
    return sortItems(filtered.filter((item) => item.type === "todo"));
  }
  if (type === "schedule") {
    return sortItems(filtered.filter((item) => item.type === "schedule"));
  }
  if (type === "today") {
    return sortItems(filtered.filter((item) => isItemOnDate(todayKey, item)));
  }
  if (type === "urgent") {
    return sortItems(
      filtered.filter((item) => {
        if (item.type !== "todo") return false;
        const diff = getTodoDiffMinutes(item);
        return diff >= 0 && diff <= 1440;
      }),
    );
  }

  return [];
}

export function getFilteredItems() {
  const selectedFilterYear = getSelectedFilterYear();
  const selectedFilterMonth = getSelectedFilterMonth();

  let rangeStartKey = "1900-01-01";
  let rangeEndKey = "9999-12-31";

  if (selectedFilterYear && selectedFilterMonth) {
    const monthDate = new Date(
      Number(selectedFilterYear),
      Number(selectedFilterMonth) - 1,
      1,
    );
    const lastDate = new Date(
      Number(selectedFilterYear),
      Number(selectedFilterMonth),
      0,
    );

    rangeStartKey = formatDateKey(monthDate);
    rangeEndKey = formatDateKey(lastDate);
  } else if (selectedFilterYear) {
    rangeStartKey = `${selectedFilterYear}-01-01`;
    rangeEndKey = `${selectedFilterYear}-12-31`;
  }

  let filtered = expandRecurringPlannerItemsInRange(
    getItems(),
    rangeStartKey,
    rangeEndKey,
  );

  const selectedFilterType = getSelectedFilterType();

  if (selectedFilterType) {
    filtered = filtered.filter((item) => item.type === selectedFilterType);
  }

  if (selectedFilterYear) {
    filtered = filtered.filter(
      (item) => getYearFromItem(item) === selectedFilterYear,
    );
  }

  if (selectedFilterMonth) {
    filtered = filtered.filter(
      (item) => getMonthFromItem(item) === selectedFilterMonth,
    );
  }

  return filtered;
}

export function getAchievementRate(filteredItems) {
  const success = filteredItems.filter(
    (item) => item.status === "success",
  ).length;
  const fail = filteredItems.filter((item) => item.status === "fail").length;
  const base = success + fail;

  if (base === 0) return 0;

  return Math.round((success / base) * 100);
}

export function renderYearOptions() {
  const { yearFilter } = getRefs();
  if (!yearFilter) return;

  const expanded = expandRecurringPlannerItemsInRange(
    getItems(),
    "1900-01-01",
    "9999-12-31",
  );

  const years = [...new Set(expanded.map((item) => getYearFromItem(item)))].sort();

  yearFilter.innerHTML = `<option value="">전체</option>`;

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = `${year.slice(2)}년`;

    if (year === getSelectedFilterYear()) {
      option.selected = true;
    }

    yearFilter.appendChild(option);
  });

  if (getSelectedFilterYear() && !years.includes(getSelectedFilterYear())) {
    deps.setSelectedFilterYear?.("");
    yearFilter.value = "";
  }
}

export function openSummaryPopup(type) {
  const { summaryPopupLabel, summaryPopupList, summaryPopupOverlay } = getRefs();

  const filtered = getFilteredItems();
  const list = getSummaryList(type, filtered);

  const labelMap = {
    all: "전체 목록",
    pending: "대기 목록",
    fail: "미완료 목록",
    success: "완료 목록",
    todo: "할일 목록",
    schedule: "일정 목록",
    today: "오늘 포함 항목",
    urgent: "마감 임박 할일",
  };

  if (summaryPopupLabel) {
    summaryPopupLabel.textContent = labelMap[type] || "목록";
  }

  if (!summaryPopupList) return;

  if (list.length === 0) {
    summaryPopupList.innerHTML = `<div class="empty-message">표시할 항목이 없습니다.</div>`;
  } else {
    summaryPopupList.innerHTML = list
      .map((item) => renderSelectedCard(item, getStatusSymbol))
      .join("");
  }

  summaryPopupOverlay?.classList.remove("hidden");
}

export function closeSummaryPopup() {
  const { summaryPopupOverlay } = getRefs();
  summaryPopupOverlay?.classList.add("hidden");
}

export function renderMonthOptions() {
  const { monthFilter } = getRefs();
  if (!monthFilter) return;

  const months = getAvailableMonthsForYear(getSelectedFilterYear());

  monthFilter.innerHTML = `<option value="">전체</option>`;

  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = `${Number(month)}월`;

    if (month === getSelectedFilterMonth()) {
      option.selected = true;
    }

    monthFilter.appendChild(option);
  });

  if (getSelectedFilterMonth() && !months.includes(getSelectedFilterMonth())) {
    deps.setSelectedFilterMonth?.("");
    monthFilter.value = "";
  }
}

export function getAvailableMonthsForYear(year) {
  let source = getItems();

  if (year) {
    source = getItems().filter((item) => getYearFromItem(item) === year);
  }

  return [...new Set(source.map((item) => getMonthFromItem(item)))].sort(
    (a, b) => Number(a) - Number(b),
  );
}

export function getYearFromItem(item) {
  return item.type === "todo"
    ? item.dueDate.slice(0, 4)
    : item.startDate.slice(0, 4);
}

export function getMonthFromItem(item) {
  return item.type === "todo"
    ? item.dueDate.slice(5, 7)
    : item.startDate.slice(5, 7);
}
