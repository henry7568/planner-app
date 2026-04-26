// calendar.js
import {
  makeDateTime,
  formatDateKey,
  formatKoreanDate,
  escapeHtml,
} from "./utils.js";
import { renderCoinBadge, renderSelectedCard } from "./renderItems.js";
import { getItemTimeStateClass } from "./itemTimeState.js";
import { getStatusSymbol } from "./plannerItems.js";
import {
  expandRecurringPlannerItemsInRange,
} from "./repeat.js";

let deps = {};
const TIMELINE_MINUTE_PX = 1.35;
const TIMELINE_DAY_HEIGHT = 1440 * TIMELINE_MINUTE_PX;
const TIMELINE_HOUR_HEIGHT = 60 * TIMELINE_MINUTE_PX;

function getTimelineOffset(minutes) {
  return Math.round(minutes * TIMELINE_MINUTE_PX);
}

export function configureCalendarModule(config) {
  deps = config;
}

function getSelectedDate() {
  return deps.getSelectedDate?.() || "";
}

function setSelectedDate(value) {
  deps.setSelectedDate?.(value);
}

function getItems() {
  return deps.getItems?.() || [];
}

function getCalendarYear() {
  return deps.getCalendarYear?.();
}

function getCalendarMonth() {
  return deps.getCalendarMonth?.();
}

function getRefs() {
  return deps.refs || {};
}

function resetPopupQuickAddForm() {
  deps.resetPopupQuickAddForm?.();
}

function renderAll() {
  deps.renderAll?.();
}

export function renderCalendar() {
  const { calendarTitle, calendarGrid } = getRefs();
  if (!calendarTitle || !calendarGrid) return;

  const calendarYear = getCalendarYear();
  const calendarMonth = getCalendarMonth();

  calendarTitle.textContent = `${String(calendarYear).slice(2)}년 ${calendarMonth + 1}월`;

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const prevMonthLastDay = new Date(calendarYear, calendarMonth, 0).getDate();

  const cells = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const dateObj = new Date(calendarYear, calendarMonth - 1, day);
    cells.push(createCalendarCell(dateObj, true));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(calendarYear, calendarMonth, day);
    cells.push(createCalendarCell(dateObj, false));
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (startWeekday + daysInMonth) + 1;
    const dateObj = new Date(calendarYear, calendarMonth + 1, nextDay);
    cells.push(createCalendarCell(dateObj, true));
  }

  calendarGrid.innerHTML = cells.join("");
}

export function createCalendarCell(dateObj, isOtherMonth) {
  const dateKey = formatDateKey(dateObj);
  const todayKey = formatDateKey(new Date());
  const isToday = dateKey === todayKey;
  const isSelected = dateKey === getSelectedDate();

  const dayItems = getItemsForDate(dateKey);
  const visibleItems = dayItems.slice(0, 3);
  const moreCount = dayItems.length - visibleItems.length;

  return `
    <div class="calendar-cell ${isOtherMonth ? "other-month" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected-date" : ""}"
      data-action="select-date"
      data-date="${dateKey}">
      <div class="calendar-date">${dateObj.getDate()}</div>
      <div class="calendar-items">
        ${visibleItems
          .map((item) => {
            const locationText = getScheduleLocationTextForDate(dateKey, item);
            const timeText = getCalendarItemTime(item);
            const timeStateClass = getItemTimeStateClass(item);
            const statusTargetId = item.id;
            const coinBadge = renderCoinBadge(item, statusTargetId);

            const typeIcon =
              item.type === "todo"
                ? `<span class="calendar-type-icon todo" title="할일">✔</span>`
                : `<span class="calendar-type-icon schedule" title="일정">🗓</span>`;

            const bottomClass = timeText
              ? "calendar-event-bottom"
              : "calendar-event-bottom no-time";

            return `
              <div class="calendar-event ${item.type} ${item.status} item-color-${item.color || "blue"} ${timeStateClass}"
                title="${escapeHtml(item.title)}${timeText ? ` · ${escapeHtml(timeText)}` : ""}${locationText ? ` · ${escapeHtml(locationText)}` : ""}">
                <div class="calendar-event-top">
                  ${typeIcon}
                  <span class="calendar-title-inline">${escapeHtml(item.title)}</span>
                </div>
                <div class="calendar-event-reward">${coinBadge}</div>

                ${
                  timeText || locationText
                    ? `
                  <div class="${bottomClass}">
                    <div class="calendar-event-meta-left">
                      ${timeText ? `<span class="calendar-time">${escapeHtml(timeText)}</span>` : ""}
                    </div>
                    <div class="calendar-event-meta-right">
                      ${locationText ? `<span class="calendar-location">📍 ${escapeHtml(locationText)}</span>` : ""}
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            `;
          })
          .join("")}
        ${moreCount > 0 ? `<div class="calendar-more">+ ${moreCount}개 더</div>` : ""}
      </div>
    </div>
  `;
}

export function getCalendarItemTime(item) {
  if (item.type === "todo") {
    return item.dueTime || "시간없음";
  }

  const rawStartTime = String(item.startTime || "").trim();
  const rawEndTime = String(item.endTime || "").trim();

  const startTime = rawStartTime;
  const endTime = rawEndTime;

  const isAllDayLikeRange =
    (!startTime && !endTime) ||
    ((startTime === "00:00" || !startTime) &&
      (endTime === "00:00" || endTime === "24:00" || !endTime));

  if (isAllDayLikeRange) {
    return "";
  }

  if (startTime && endTime) {
    return `${startTime}~${endTime}`;
  }

  if (startTime) {
    return startTime;
  }

  if (endTime) {
    return `~${endTime}`;
  }

  return "";
}

export function selectCalendarDate(dateKey) {
  setSelectedDate(dateKey);
  renderCalendar();
  openDatePopup(dateKey);
}

export function openDatePopup(dateKey) {
  const {
    selectedDateLabel,
    popupScheduleEndDate,
    calendarPopupOverlay,
  } = getRefs();

  const dayItems = getItemsForDate(dateKey);

  if (selectedDateLabel) {
    selectedDateLabel.textContent = `${formatKoreanDate(dateKey)} 항목`;
  }

  renderSelectedDateAllDay(dateKey, dayItems);
  renderSelectedDateTimeline(dateKey, dayItems);
  renderSelectedDateExtraList(dateKey, dayItems);

  resetPopupQuickAddForm();

  if (popupScheduleEndDate) {
    popupScheduleEndDate.value = dateKey;
  }

  calendarPopupOverlay?.classList.remove("hidden");
}

export function renderSelectedDateAllDay(dateKey, itemsForDate) {
  const { selectedDateAllDay } = getRefs();
  if (!selectedDateAllDay) return;

  const allDayItems = itemsForDate.filter((item) =>
    isAllDayTimelineItem(dateKey, item),
  );

  if (allDayItems.length === 0) {
    selectedDateAllDay.innerHTML = "";
    return;
  }

  selectedDateAllDay.innerHTML = `
    <div class="all-day-wrap">
      <div class="all-day-title">종일 일정</div>
      <div class="all-day-list">
        ${allDayItems.map((item) => renderAllDayItem(dateKey, item)).join("")}
      </div>
    </div>
  `;
}

export function isAllDayTimelineItem(dateKey, item) {
  if (item.type !== "schedule") return false;

  const startTime = String(item.startTime || "").trim();
  const endTime = String(item.endTime || "").trim();

  const noStartTime = !startTime;
  const noEndTime = !endTime;

  const isStartBoundaryAllDay = noStartTime || startTime === "00:00";
  const isEndBoundaryAllDay =
    noEndTime || endTime === "00:00" || endTime === "24:00";

  // 여러 날 일정의 가운데 날짜는 항상 종일
  if (item.startDate < dateKey && item.endDate > dateKey) {
    return true;
  }

  // 첫날: 시작이 자정(또는 시간 없음)이면 종일 일정으로 처리
  if (
    item.startDate === dateKey &&
    item.endDate > dateKey &&
    isStartBoundaryAllDay
  ) {
    return true;
  }

  // 마지막날: 종료가 자정/24:00(또는 시간 없음)이면 종일 일정으로 처리
  if (
    item.startDate < dateKey &&
    item.endDate === dateKey &&
    isEndBoundaryAllDay
  ) {
    return true;
  }

  // 하루짜리 일정인데 시작/종료가 모두 종일 경계 시간이면 종일 일정
  if (
    item.startDate === dateKey &&
    item.endDate === dateKey &&
    isStartBoundaryAllDay &&
    isEndBoundaryAllDay
  ) {
    return true;
  }

  return false;
}

export function renderAllDayItem(dateKey, item) {
  const colorClass = `item-color-${item.color || "blue"}`;
  const timeStateClass = getItemTimeStateClass(item);
  const repeatIcon =
    item.repeat && item.repeat !== "none"
      ? `<span class="all-day-repeat">↻</span>`
      : "";

  const locationText = getScheduleLocationTextForDate(dateKey, item);

  return `
    <div
      class="all-day-item ${colorClass} ${timeStateClass} clickable-item-card"
      data-action="open-edit-item"
      data-id="${item.id}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <div class="all-day-main">
        <span class="all-day-type">일정</span>
        <span class="all-day-text">${escapeHtml(item.title)}</span>
        ${repeatIcon}
      </div>
      ${locationText ? `<div class="all-day-location">📍 ${escapeHtml(locationText)}</div>` : ""}
    </div>
  `;
}

export function renderSelectedDateTimeline(dateKey, itemsForDate) {
  const { selectedDateTimeline } = getRefs();
  if (!selectedDateTimeline) return;

  const blocks = itemsForDate
    .filter((item) => !isAllDayTimelineItem(dateKey, item))
    .map((item) => buildTimelineBlock(dateKey, item))
    .filter(Boolean);

  if (blocks.length === 0) {
    selectedDateTimeline.innerHTML = `
      <div class="empty-message">이 날짜에는 시간 지정 항목이 없습니다.</div>
    `;
    return;
  }

  const laidOutBlocks = layoutTimelineBlocks(blocks);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const nowLineHtml = buildCurrentTimeLine(dateKey);

  selectedDateTimeline.innerHTML = `
    <div
      id="timelineBoard"
      class="timeline-board"
      style="--timeline-day-height: ${TIMELINE_DAY_HEIGHT}px; --timeline-hour-height: ${TIMELINE_HOUR_HEIGHT}px;"
    >
      <div class="timeline-scroll-area">
        <div class="timeline-hour-column">
          ${hours
            .map(
              (hour) => `
            <div class="timeline-hour-label">${formatHourLabel(hour)}</div>
          `,
            )
            .join("")}
        </div>

        <div id="timelineGridWrap" class="timeline-grid-wrap">
          <div class="timeline-grid-lines">
            ${hours.map(() => `<div class="timeline-grid-line"></div>`).join("")}
          </div>

          ${nowLineHtml}

          <div class="timeline-block-layer">
            ${laidOutBlocks.map((block) => renderPositionedTimelineBlock(block)).join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  scrollTimelineToNow(dateKey);
  startTimelineNowAutoRefresh(dateKey);
}

export function buildCurrentTimeLine(dateKey) {
  const todayKey = formatDateKey(new Date());

  if (dateKey !== todayKey) return "";

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTop = getTimelineOffset(currentMinutes);
  const currentTimeText = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return `
    <div id="timelineNowLine" class="timeline-now-line" style="top: ${currentTop}px;">
      <div class="timeline-now-dot"></div>
      <div class="timeline-now-stroke"></div>
      <div class="timeline-now-label">${currentTimeText}</div>
    </div>
  `;
}

export function updateTimelineNowLine(dateKey) {
  const todayKey = formatDateKey(new Date());
  const nowLine = document.getElementById("timelineNowLine");

  if (!nowLine) return;
  if (dateKey !== todayKey) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTop = getTimelineOffset(currentMinutes);
  const currentTimeText = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  nowLine.style.top = `${currentTop}px`;

  const label = nowLine.querySelector(".timeline-now-label");
  if (label) {
    label.textContent = currentTimeText;
  }
}

export function startTimelineNowAutoRefresh(dateKey) {
  stopTimelineNowAutoRefresh();

  const todayKey = formatDateKey(new Date());
  if (dateKey !== todayKey) return;

  deps.setTimelineNowTimer?.(
    setInterval(() => {
      updateTimelineNowLine(dateKey);
    }, 5 * 60 * 1000),
  );
}

export function stopTimelineNowAutoRefresh() {
  const timer = deps.getTimelineNowTimer?.();
  if (timer) {
    clearInterval(timer);
    deps.setTimelineNowTimer?.(null);
  }
}

export function scrollTimelineToNow(dateKey) {
  const todayKey = formatDateKey(new Date());
  if (dateKey !== todayKey) return;

  requestAnimationFrame(() => {
    const scrollArea = document.querySelector(".timeline-scroll-area");
    if (!scrollArea) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetScrollTop = Math.max(getTimelineOffset(currentMinutes - 180), 0);

    scrollArea.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });
  });
}

export function buildTimelineBlock(dateKey, item) {
  if (item.type === "todo") {
    if (!item.dueTime) return null;

    const startMinutes = timeStringToMinutes(item.dueTime);
    const endMinutes = Math.min(startMinutes + 12, 1440);

    return {
      id: item.id,
      item,
      dateKey,
      startMinutes,
      endMinutes,
      isTodoPoint: true,
    };
  }

  if (item.type === "schedule") {
    if (!isScheduleTimedOnDate(dateKey, item)) return null;

    let startMinutes = 0;
    let endMinutes = 1440;

    if (item.startDate === dateKey) {
      startMinutes = item.startTime ? timeStringToMinutes(item.startTime) : 0;
    }

    if (item.endDate === dateKey) {
      endMinutes = item.endTime ? timeStringToMinutes(item.endTime) : 1440;
    }

    if (item.startDate === dateKey && item.endDate === dateKey) {
      startMinutes = item.startTime ? timeStringToMinutes(item.startTime) : 0;
      endMinutes = item.endTime ? timeStringToMinutes(item.endTime) : 1440;
    }

    if (endMinutes <= startMinutes) {
      endMinutes = Math.min(startMinutes + 30, 1440);
    }

    return {
      id: item.id,
      item,
      dateKey,
      startMinutes,
      endMinutes,
    };
  }

  return null;
}

export function timeStringToMinutes(timeString) {
  const [hour, minute] = String(timeString).split(":").map(Number);
  return hour * 60 + minute;
}

export function layoutTimelineBlocks(blocks) {
  const sorted = [...blocks].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return a.endMinutes - b.endMinutes;
  });

  const groups = [];
  let currentGroup = [];

  for (const block of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(block);
      continue;
    }

    const currentGroupEnd = Math.max(...currentGroup.map((x) => x.endMinutes));

    if (block.startMinutes < currentGroupEnd) {
      currentGroup.push(block);
    } else {
      groups.push(currentGroup);
      currentGroup = [block];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const result = [];

  groups.forEach((group) => {
    const columns = [];
    const laidOut = [];

    group.forEach((block) => {
      let assignedColumn = 0;

      while (true) {
        const lastEnd = columns[assignedColumn];

        if (lastEnd == null || lastEnd <= block.startMinutes) {
          columns[assignedColumn] = block.endMinutes;
          break;
        }

        assignedColumn++;
      }

      laidOut.push({
        ...block,
        column: assignedColumn,
      });
    });

    const totalColumns = Math.max(...laidOut.map((x) => x.column)) + 1;

    laidOut.forEach((block) => {
      result.push({
        ...block,
        totalColumns,
      });
    });
  });

  return result;
}

export function renderPositionedTimelineBlock(block) {
  const item = block.item;
  const colorClass = `item-color-${item.color || "blue"}`;
  const timeStateClass = getItemTimeStateClass(item);
  const coinBadge = renderCoinBadge(item, item.id);
  const repeatIcon =
    item.repeat && item.repeat !== "none"
      ? `<span class="timeline-repeat">↻</span>`
      : "";

  const top = getTimelineOffset(block.startMinutes);
  const height = Math.max(
    getTimelineOffset(block.endMinutes) - getTimelineOffset(block.startMinutes),
    44,
  );

  const widthPercent = 100 / block.totalColumns;
  const leftPercent = widthPercent * block.column;

  const locationText = getScheduleLocationTextForDate(block.dateKey, item);

  let timeText = "";

  if (item.type === "todo") {
    timeText = item.dueTime || "시간 없음";
  } else {
    const startText = formatTimelineTime(block.startMinutes);
    const endText = formatTimelineTime(block.endMinutes);
    timeText = `${startText} ~ ${endText}`;
  }

  if (block.isTodoPoint) {
    return `
      <div
        class="timeline-point ${colorClass} ${timeStateClass} clickable-item-card"
        data-action="open-edit-item"
        data-id="${item.id}"
        role="button"
        tabindex="0"
        title="클릭해서 수정"
        style="
          top: ${top}px;
          left: calc(${leftPercent}% + 4px);
          width: calc(${widthPercent}% - 8px);
        "
      >
        <div class="timeline-point-dot"></div>
        <div class="timeline-point-content">
          <div class="timeline-point-main">
            <span class="timeline-type todo">할일</span>
            <span class="timeline-title">${escapeHtml(item.title)}</span>
            ${coinBadge}
            ${repeatIcon}
          </div>
          <div class="timeline-point-sub">
            <span class="timeline-time">${timeText}</span>
            ${item.tag ? `<span class="timeline-tag">${escapeHtml(item.tag)}</span>` : ""}
            ${locationText ? `<span class="timeline-tag">📍 ${escapeHtml(locationText)}</span>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div
      class="timeline-block ${colorClass} ${timeStateClass} clickable-item-card"
      data-action="open-edit-item"
      data-id="${item.id}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
      style="
        top: ${top}px;
        height: ${height}px;
        left: calc(${leftPercent}% + 4px);
        width: calc(${widthPercent}% - 8px);
      "
    >
      <div class="timeline-block-main">
        <span class="timeline-type schedule">일정</span>
        <span class="timeline-title">${escapeHtml(item.title)}</span>
        ${coinBadge}
        ${repeatIcon}
      </div>

      <div class="timeline-block-sub">
        <span class="timeline-time">${timeText}</span>
        ${item.tag ? `<span class="timeline-tag">${escapeHtml(item.tag)}</span>` : ""}
        ${locationText ? `<span class="timeline-tag">📍 ${escapeHtml(locationText)}</span>` : ""}
      </div>
    </div>
  `;
}

export function formatTimelineTime(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 1440));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  if (safeMinutes === 1440) return "24:00";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function renderSelectedDateExtraList(dateKey, itemsForDate) {
  const { selectedDateItemList } = getRefs();
  if (!selectedDateItemList) return;

  const extraItems = itemsForDate.filter((item) => {
    if (item.type === "todo") {
      return !item.dueTime;
    }

    if (item.type === "schedule") {
      return !isScheduleTimedOnDate(dateKey, item);
    }

    return true;
  });

  if (extraItems.length === 0) {
    selectedDateItemList.innerHTML = "";
    return;
  }

  selectedDateItemList.innerHTML = `
    <div class="cardless-section-title">시간 미지정 / 종일 항목</div>
    <div class="selected-date-list-compact">
      ${extraItems.map((item) => renderSelectedCard(item, getStatusSymbol)).join("")}
    </div>
  `;
}

export function isScheduleTimedOnDate(dateKey, item) {
  const isStartDate = item.startDate === dateKey;
  const isEndDate = item.endDate === dateKey;

  return (
    (isStartDate && !!item.startTime) ||
    (isEndDate && !!item.endTime) ||
    (item.startDate < dateKey && item.endDate > dateKey)
  );
}

export function formatHourLabel(hour) {
  if (hour === 0) return "오전 12시";
  if (hour < 12) return `오전 ${hour}시`;
  if (hour === 12) return "오후 12시";
  return `오후 ${hour - 12}시`;
}

export function renderTimelineItem(dateKey, item) {
  const colorClass = `item-color-${item.color || "blue"}`;
  const timeStateClass = getItemTimeStateClass(item);
  const coinBadge = renderCoinBadge(item, item.id);
  const repeatIcon =
    item.repeat && item.repeat !== "none"
      ? `<span class="timeline-repeat">↻</span>`
      : "";

  let timeText = "";

  if (item.type === "todo") {
    timeText = item.dueTime || "시간 없음";
  } else {
    const startText =
      item.startDate === dateKey ? item.startTime || "00:00" : "00:00";

    const endText =
      item.endDate === dateKey ? item.endTime || "23:59" : "24:00";

    timeText = `${startText} ~ ${endText}`;
  }

  return `
    <div
      class="timeline-item ${colorClass} ${timeStateClass} clickable-item-card"
      data-action="open-edit-item"
      data-id="${item.id}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <div class="timeline-item-main">
        <span class="timeline-type">${item.type === "todo" ? "할일" : "일정"}</span>
        <span class="timeline-title">${escapeHtml(item.title)}</span>
        ${coinBadge}
        ${repeatIcon}
      </div>
      <div class="timeline-item-sub">
        <span class="timeline-time">${timeText}</span>
        ${item.tag ? `<span class="timeline-tag">${escapeHtml(item.tag)}</span>` : ""}
      </div>
    </div>
  `;
}

export function closeDatePopup() {
  const {
    selectedDateAllDay,
    selectedDateTimeline,
    selectedDateItemList,
    calendarPopupOverlay,
  } = getRefs();

  setSelectedDate("");
  stopTimelineNowAutoRefresh();

  if (selectedDateAllDay) selectedDateAllDay.innerHTML = "";
  if (selectedDateTimeline) selectedDateTimeline.innerHTML = "";
  if (selectedDateItemList) selectedDateItemList.innerHTML = "";

  resetPopupQuickAddForm();
  calendarPopupOverlay?.classList.add("hidden");
  renderCalendar();
}

export function getItemsForDate(dateKey) {
  const expandedItems = expandRecurringPlannerItemsInRange(
    getItems(),
    dateKey,
    dateKey,
  );

  return sortItems(expandedItems.filter((item) => isItemOnDate(dateKey, item)));
}

export function isItemOnDate(dateKey, item) {
  if (!item) return false;

  if (item.type === "todo") {
    return item.dueDate === dateKey;
  }

  if (item.type === "schedule") {
    const target = new Date(`${dateKey}T00:00`);
    const start = new Date(`${item.startDate}T00:00`);
    const end = new Date(`${item.endDate}T00:00`);

    return target >= start && target <= end;
  }

  return false;
}

export function sortItems(itemArray) {
  return [...(itemArray || [])].sort((a, b) => {
    const aTime = getSortDateTime(a).getTime();
    const bTime = getSortDateTime(b).getTime();

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    if ((a.type || "") !== (b.type || "")) {
      return (a.type || "").localeCompare(b.type || "", "ko");
    }

    return String(a.title || "").localeCompare(String(b.title || ""), "ko");
  });
}

export function getSortDateTime(item) {
  if (!item) {
    return new Date("9999-12-31T23:59");
  }

  if (item.type === "todo") {
    return new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  }

  return new Date(
    makeDateTime(
      item.endDate || item.startDate,
      item.endTime || item.startTime || "23:59",
    ),
  );
}

export function getTodoDiffMinutes(item) {
  const target = new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  const nowDate = new Date();
  return Math.floor((target - nowDate) / (1000 * 60));
}

export function getTodoRemainText(item) {
  const target = new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  const nowDate = new Date();
  const diffMinutes = Math.floor((target - nowDate) / (1000 * 60));

  if (diffMinutes > 0) {
    const days = Math.floor(diffMinutes / (60 * 24));
    const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
    const minutes = diffMinutes % 60;

    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  }

  if (diffMinutes === 0) return "지금 마감";

  const pastMinutes = Math.abs(diffMinutes);
  const pastDays = Math.floor(pastMinutes / (60 * 24));
  const pastHours = Math.floor((pastMinutes % (60 * 24)) / 60);

  if (pastDays > 0) return `${pastDays}일 지남`;
  if (pastHours > 0) return `${pastHours}시간 지남`;
  return `${pastMinutes}분 지남`;
}

export function getScheduleProgressText(item) {
  const nowDate = new Date();
  const start = new Date(makeDateTime(item.startDate, item.startTime || "00:00"));
  const end = new Date(makeDateTime(item.endDate, item.endTime || "23:59"));

  if (nowDate < start) return "시작 전";
  if (nowDate > end) return "종료됨";
  return "진행 중";
}

function getScheduleLocationTextForDate(dateKey, item) {
  if (
    Array.isArray(item.dailyLocations) &&
    item.dailyLocations.length > 0 &&
    dateKey
  ) {
    const sorted = [...item.dailyLocations].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    let current = null;

    for (const entry of sorted) {
      if (entry.date <= dateKey) {
        current = entry;
        continue;
      }
      break;
    }

    if (current?.label) {
      return current.label;
    }
  }

  return item.location || "";
}
