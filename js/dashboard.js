// dashboard.js
import { escapeHtml, formatDateKey, formatKoreanDate, makeDateTime } from "./utils.js";
import { renderCard, renderSelectedCard } from "./renderItems.js";
import { getStatusSymbol } from "./plannerItems.js";
import {
  sortItems,
  isItemOnDate,
  getTodoDiffMinutes,
  getItemsForDate,
} from "./calendar.js";
import { expandRecurringPlannerItemsInRange } from "./repeat.js";
import {
  COIN_KRW_VALUE,
  getCoinBalance,
  getCoinLedgerEntriesForMonth,
  getCoinLedgerMonthKey,
} from "./rewards.js";

let deps = {};
let coinLedgerPage = 1;
let coinLedgerFilterKey = "";
let todayPage = 1;
const COIN_LEDGER_PAGE_SIZE = 3;
const TODAY_PAGE_SIZE = 3;
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
    timeAnalysisSummary,
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
    dashboardUrgentTodoCount.textContent =
      filtered.filter(isUrgentPlannerItem).length;
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
  renderTimeAnalysis(timeAnalysisSummary);

  if (!dashboardItemList) return;

  if (filtered.length === 0) {
    dashboardItemList.innerHTML = `
      <div class="empty-message">현재 표시할 항목이 없습니다.</div>
    `;
    return;
  }

  const visibleList = shouldHideCompletedDashboardItems()
    ? filtered.filter((item) => (item.status || "pending") === "pending")
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
    ${renderDashboardDateSections(visibleItems)}

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
  const {
    todayList,
    todayAchievementRate,
    todayAchievementBarFill,
    todayAchievementDesc,
  } = getRefs();
  if (!todayList) return;

  const todayKey = formatDateKey(new Date());
  const todayItems = getItemsForDate(todayKey);
  const todayRate = getAchievementRate(todayItems);
  const completedBase = todayItems.filter(
    (item) => item.status === "success" || item.status === "fail",
  ).length;

  if (todayAchievementRate) {
    todayAchievementRate.textContent = `${todayRate}%`;
  }

  if (todayAchievementBarFill) {
    todayAchievementBarFill.style.width = `${todayRate}%`;
  }

  if (todayAchievementDesc) {
    todayAchievementDesc.textContent =
      completedBase === 0
        ? "아직 완료 또는 미완료로 확정된 오늘 항목이 없습니다."
        : `완료 / (완료 + 미완료) 기준 · ${completedBase}개 반영`;
  }

  if (todayItems.length === 0) {
    todayPage = 1;
    todayList.innerHTML = `<div class="empty-message">오늘 항목이 없습니다.</div>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(todayItems.length / TODAY_PAGE_SIZE));
  todayPage = Math.min(Math.max(todayPage, 1), totalPages);

  const startIndex = (todayPage - 1) * TODAY_PAGE_SIZE;
  const visibleItems = todayItems.slice(startIndex, startIndex + TODAY_PAGE_SIZE);

  todayList.innerHTML = `
    ${visibleItems.map((item) => renderCard(item, getStatusSymbol)).join("")}
    ${renderTodayPagination(todayPage, totalPages, todayItems.length)}
  `;

  todayList
    .querySelector("[data-action='change-today-page'][data-direction='-1']")
    ?.addEventListener("click", () => {
      if (todayPage <= 1) return;
      todayPage -= 1;
      renderTodayList();
    });

  todayList
    .querySelector("[data-action='change-today-page'][data-direction='1']")
    ?.addEventListener("click", () => {
      if (todayPage >= totalPages) return;
      todayPage += 1;
      renderTodayList();
    });
}

function renderTodayPagination(page, totalPages, totalCount) {
  if (totalPages <= 1) return "";

  return `
    <div class="planner-pagination today-pagination">
      <button
        class="secondary-btn"
        type="button"
        data-action="change-today-page"
        data-direction="-1"
        ${page <= 1 ? "disabled" : ""}
      >
        \uC774\uC804
      </button>
      <span class="planner-pagination-text">${page} / ${totalPages} · \uCD1D ${totalCount}\uAC1C</span>
      <button
        class="secondary-btn"
        type="button"
        data-action="change-today-page"
        data-direction="1"
        ${page >= totalPages ? "disabled" : ""}
      >
        \uB2E4\uC74C
      </button>
    </div>
  `;
}

function renderTimeAnalysis(container) {
  if (!container) return;

  const analysis = getTimeUsageAnalysis();
  const totalHours = analysis.totalMinutes / 60;

  container.innerHTML = `
    <div class="time-analysis-stats">
      <div>
        <span>총 계획 시간</span>
        <strong>${formatHours(totalHours)}</strong>
      </div>
      <div>
        <span>최다 태그/프로젝트</span>
        <strong>${escapeHtml(analysis.topLabel || "없음")}</strong>
      </div>
      <div>
        <span>종일 일정</span>
        <strong>${analysis.allDayCount}개</strong>
      </div>
    </div>
    <div class="time-analysis-bars">
      ${
        analysis.categories.length
          ? analysis.categories.map(renderTimeAnalysisBar).join("")
          : `<div class="empty-message compact-empty">선택한 기간에 시간이 있는 일정이 없습니다.</div>`
      }
    </div>
  `;
}

function renderTimeAnalysisBar(entry) {
  return `
    <div class="time-analysis-row">
      <div class="time-analysis-label">
        <span>${escapeHtml(entry.label)}</span>
        <strong>${formatHours(entry.minutes / 60)}</strong>
      </div>
      <div class="time-analysis-track">
        <div class="time-analysis-fill" style="width: ${entry.ratio}%"></div>
      </div>
    </div>
  `;
}

function getTimeUsageAnalysis() {
  const { startKey, endKey } = getSelectedAnalysisRange();
  const schedules = expandRecurringPlannerItemsInRange(
    getItems(),
    startKey,
    endKey,
  ).filter((item) => item.type === "schedule");

  const tagMinutes = new Map();
  const projectMinutes = new Map();
  const categoryMinutes = new Map();
  let totalMinutes = 0;
  let allDayCount = 0;

  schedules.forEach((item) => {
    const duration = getScheduleDurationMinutes(item);

    if (duration <= 0) {
      allDayCount += 1;
      return;
    }

    totalMinutes += duration;

    const tag = item.tag || "태그 없음";
    tagMinutes.set(tag, (tagMinutes.get(tag) || 0) + duration);

    const projectLabel = item.projectId ? deps.getProjectLabel?.(item.projectId) || "" : "";
    if (projectLabel) {
      projectMinutes.set(projectLabel, (projectMinutes.get(projectLabel) || 0) + duration);
    }

    const category = inferScheduleCategory(item);
    categoryMinutes.set(category, (categoryMinutes.get(category) || 0) + duration);
  });

  const topTag = getTopEntry(tagMinutes);
  const topProject = getTopEntry(projectMinutes);
  const topLabel =
    topProject && (!topTag || topProject.minutes > topTag.minutes)
      ? topProject.label
      : topTag?.label || "";

  const categories = [...categoryMinutes.entries()]
    .map(([label, minutes]) => ({
      label,
      minutes,
      ratio: totalMinutes ? Math.round((minutes / totalMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    totalMinutes,
    topLabel,
    allDayCount,
    categories,
  };
}

function getSelectedAnalysisRange() {
  const year = getSelectedFilterYear() || String(new Date().getFullYear());
  const month = getSelectedFilterMonth();

  if (month) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0);
    return {
      startKey: formatDateKey(start),
      endKey: formatDateKey(end),
    };
  }

  return {
    startKey: `${year}-01-01`,
    endKey: `${year}-12-31`,
  };
}

function getScheduleDurationMinutes(item) {
  if (!item.startTime || !item.endTime) return 0;

  const start = new Date(makeDateTime(item.startDate, item.startTime));
  const end = new Date(makeDateTime(item.endDate || item.startDate, item.endTime));
  const diff = Math.round((end.getTime() - start.getTime()) / 60000);

  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function inferScheduleCategory(item) {
  const source = `${item.title || ""} ${item.tag || ""}`.toLowerCase();
  const categoryHints = [
    ["업무", ["업무", "회의", "미팅", "보고", "회사", "면접"]],
    ["공부", ["공부", "강의", "과제", "시험", "수업", "복습"]],
    ["개인", ["병원", "운동", "청소", "정리", "예약", "개인"]],
    ["여가", ["여가", "카페", "약속", "친구", "영화", "여행", "게임"]],
  ];

  return (
    categoryHints.find(([, words]) => words.some((word) => source.includes(word)))?.[0] ||
    item.tag ||
    "기타"
  );
}

function getTopEntry(map) {
  return [...map.entries()]
    .map(([label, minutes]) => ({ label, minutes }))
    .sort((a, b) => b.minutes - a.minutes)[0];
}

function formatHours(value) {
  if (!value) return "0시간";
  return `${Number(value.toFixed(value >= 10 ? 0 : 1)).toLocaleString("ko-KR")}시간`;
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
  const coinMonthKey = getCoinLedgerMonthKey();
  const balance = getCoinBalance(rewards, coinMonthKey);
  const hobbyBudget = balance * COIN_KRW_VALUE;

  if (coinBalanceText) coinBalanceText.textContent = `${balance.toLocaleString()}C`;
  if (hobbyBudgetText) {
    hobbyBudgetText.textContent = `${hobbyBudget.toLocaleString()}원`;
  }

  if (!coinLedgerList) return;

  const ledger = getCoinLedgerEntriesForMonth(rewards.ledger, coinMonthKey).slice(0, 3);
  if (ledger.length === 0) {
    coinLedgerList.innerHTML = `<div class="empty-message compact-empty">이번 달 코인 기록이 없습니다.</div>`;
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
        <div class="coin-ledger-row ${amount < 0 ? "negative" : "positive"}">
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
      .map((item) => item.id)
      .filter(Boolean),
  );
}

function getCoinFilterKey(targetKeys, isFilterActive) {
  return JSON.stringify({
    coinMonth: getCoinLedgerMonthKey(),
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
  const coinMonthKey = getCoinLedgerMonthKey();

  if (nextFilterKey !== coinLedgerFilterKey) {
    coinLedgerFilterKey = nextFilterKey;
    coinLedgerPage = 1;
  }

  const ledger = getDisplayLedgerEntries(
    getCoinLedgerEntriesForMonth(rewards.ledger, coinMonthKey),
    targetKeys,
    isFilterActive,
  );
  const balance = getCoinBalance(rewards, coinMonthKey);
  const hobbyBudget = balance * COIN_KRW_VALUE;

  if (coinBalanceText) {
    coinBalanceText.innerHTML = getCoinAmountHtml(balance);
  }
  if (hobbyBudgetText) {
    hobbyBudgetText.textContent = `${hobbyBudget.toLocaleString()}원`;
  }

  if (!coinLedgerList) return;

  if (ledger.length === 0) {
    coinLedgerList.innerHTML = `<div class="empty-message compact-empty">이번 달 코인 기록이 없습니다.</div>`;
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
          <div
            class="coin-ledger-row ${amount < 0 ? "negative" : "positive"} clickable-item-card"
            data-action="open-coin-ledger-edit"
            data-id="${escapeHtml(entry.id || "")}"
            role="button"
            tabindex="0"
          >
            <div>
              <strong>${getCoinLedgerLabel(entry.type)}</strong>
              <span>${escapeHtml(title)}</span>
            </div>
            <div class="coin-ledger-amount ${amount < 0 ? "negative" : "positive"}">
              ${getCoinAmountHtml(Math.abs(amount), sign)}
              <small>${krw.toLocaleString()}원</small>
            </div>
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
    return sortItems(filtered.filter(isUrgentPlannerItem));
  }

  return [];
}

function getScheduleUrgentDiffMinutes(item) {
  const nowDate = new Date();
  const start = new Date(makeDateTime(item.startDate, item.startTime || "00:00"));
  const end = new Date(
    makeDateTime(item.endDate || item.startDate, item.endTime || "23:59"),
  );
  const target = nowDate <= start ? start : end;
  return Math.floor((target - nowDate) / (1000 * 60));
}

function isUrgentPlannerItem(item) {
  if (!item) return false;
  const diff =
    item.type === "schedule"
      ? getScheduleUrgentDiffMinutes(item)
      : getTodoDiffMinutes(item);
  return diff >= 0 && diff <= 1440;
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
    today: "오늘까지 작업",
    urgent: "마감 임박 작업",
  };

  if (summaryPopupLabel) {
    summaryPopupLabel.textContent = labelMap[type] || "목록";
  }

  if (!summaryPopupList) return;

  if (list.length === 0) {
    summaryPopupList.innerHTML = `<div class="empty-message">표시할 항목이 없습니다.</div>`;
  } else {
    summaryPopupList.innerHTML = renderSummaryPopupSections(list);
  }

  summaryPopupOverlay?.classList.remove("hidden");
}

export function closeSummaryPopup() {
  const { summaryPopupOverlay } = getRefs();
  summaryPopupOverlay?.classList.add("hidden");
}

function getSummaryItemDateKey(item) {
  if (!item) return "";
  return item.type === "todo" ? item.dueDate || "" : item.startDate || "";
}

function getSummaryDateLabel(dateKey) {
  return dateKey ? formatKoreanDate(dateKey) : "날짜 없음";
}

function renderDashboardDateSections(list) {
  const grouped = list.reduce((acc, item) => {
    const key = getSummaryItemDateKey(item) || "none";
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(item);
    return acc;
  }, new Map());

  return [...grouped.entries()]
    .map(([key, sectionItems]) => `
      <details class="dashboard-date-section" open>
        <summary class="dashboard-date-header">
          <span>${getSummaryDateLabel(key === "none" ? "" : key)}</span>
          <strong>${sectionItems.length}</strong>
        </summary>
        <div class="dashboard-date-body">
          ${sectionItems.map((item) => renderCard(item, getStatusSymbol)).join("")}
        </div>
      </details>
    `)
    .join("");
}

function getSummaryRowDateText(item) {
  if (!item) return "";

  if (item.type === "todo") {
    return `${formatKoreanDate(item.dueDate)}${item.dueTime ? ` ${item.dueTime}` : ""}`;
  }

  return `${formatKoreanDate(item.startDate)}${item.startTime ? ` ${item.startTime}` : ""} ~ ${formatKoreanDate(item.endDate)}${item.endTime ? ` ${item.endTime}` : ""}`;
}

function renderSummaryItemRow(item) {
  const statusTargetId = item.id;
  const typeText = item.type === "schedule" ? "일정" : "할일";
  const dateText = getSummaryRowDateText(item);

  return `
    <div
      class="summary-popup-row clickable-item-card"
      data-action="open-edit-item"
      data-id="${item.id}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <button
        class="status-btn ${item.status || "pending"}"
        data-action="toggle-status"
        data-id="${statusTargetId}"
        title="상태 변경"
        type="button"
      >
        ${getStatusSymbol(item.status)}
      </button>
      <div class="summary-popup-row-main">
        <strong>${escapeHtml(item.title || "")}</strong>
        <div class="summary-popup-row-meta">
          <span class="timeline-type ${item.type === "todo" ? "todo" : "schedule"}">${typeText}</span>
          <span>${escapeHtml(dateText)}</span>
          ${item.tag ? `<span class="timeline-tag">${escapeHtml(item.tag)}</span>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderSummaryPopupSections(list) {
  const grouped = list.reduce((acc, item) => {
    const key = getSummaryItemDateKey(item) || "none";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return Object.keys(grouped)
    .sort((a, b) => {
      if (a === "none") return 1;
      if (b === "none") return -1;
      return a.localeCompare(b);
    })
    .map((key) => {
      const sectionItems = grouped[key];

      return `
        <details class="summary-weekday-section" open>
          <summary class="summary-weekday-header">
            <span>${getSummaryDateLabel(key === "none" ? "" : key)}</span>
            <strong>${sectionItems.length}</strong>
          </summary>
          <div class="summary-weekday-body">
            ${sectionItems.map(renderSummaryItemRow).join("")}
          </div>
        </details>
      `;
    })
    .join("");
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
