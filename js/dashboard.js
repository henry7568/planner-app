// dashboard.js
import { formatDateKey } from "./utils.js";
import { renderCard, renderSelectedCard } from "./renderItems.js";
import { getStatusSymbol } from "./plannerItems.js";
import {
  sortItems,
  isItemOnDate,
  getTodoDiffMinutes,
  getItemsForDate,
} from "./calendar.js";

let deps = {};

export function configureDashboardModule(config) {
  deps = config;
}

function getItems() {
  return deps.getItems?.() || [];
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

  if (!dashboardItemList) return;

  if (filtered.length === 0) {
    dashboardItemList.innerHTML = `
      <div class="empty-message">현재 표시할 항목이 없습니다.</div>
    `;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  if (getDashboardPage() > totalPages) {
    setDashboardPage(totalPages);
  }

  const currentPage = getDashboardPage();
  const startIndex = (currentPage - 1) * pageSize;
  const visibleItems = filtered.slice(startIndex, startIndex + pageSize);

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
  let filtered = [...getItems()];

  const selectedFilterType = getSelectedFilterType();
  const selectedFilterYear = getSelectedFilterYear();
  const selectedFilterMonth = getSelectedFilterMonth();

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

  const years = [...new Set(getItems().map((item) => getYearFromItem(item)))].sort();

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