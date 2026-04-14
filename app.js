const itemType = document.getElementById("itemType");
const titleInput = document.getElementById("titleInput");

const todoFields = document.getElementById("todoFields");
const scheduleFields = document.getElementById("scheduleFields");

const todoDueDate = document.getElementById("todoDueDate");
const todoDueTime = document.getElementById("todoDueTime");

const scheduleStartDate = document.getElementById("scheduleStartDate");
const scheduleStartTime = document.getElementById("scheduleStartTime");
const scheduleEndDate = document.getElementById("scheduleEndDate");
const scheduleEndTime = document.getElementById("scheduleEndTime");

const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");

const typeFilter = document.getElementById("typeFilter");
const monthFilter = document.getElementById("monthFilter");
const itemList = document.getElementById("itemList");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const failCount = document.getElementById("failCount");
const successCount = document.getElementById("successCount");

const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");

const selectedDateLabel = document.getElementById("selectedDateLabel");
const selectedDateScheduleList = document.getElementById("selectedDateScheduleList");
const clearSelectedDateBtn = document.getElementById("clearSelectedDateBtn");
const calendarPopupOverlay = document.getElementById("calendarPopupOverlay");

let items = loadItems();
let selectedMonth = "";
let selectedTypeFilter = "";
let editingId = null;
let selectedDate = "";

const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

init();

function init() {
  toggleTypeFields();
  syncCalendarWithFilter();
  renderMonthOptions();
  renderItems();
  renderSummary();
  renderCalendar();
  renderSelectedDateSchedules();

  itemType.addEventListener("change", toggleTypeFields);
  saveBtn.addEventListener("click", saveItem);
  cancelEditBtn.addEventListener("click", cancelEdit);

  typeFilter.addEventListener("change", (e) => {
    selectedTypeFilter = e.target.value;
    renderItems();
    renderSummary();
  });

  monthFilter.addEventListener("change", (e) => {
    selectedMonth = e.target.value;
    syncCalendarWithFilter();
    renderItems();
    renderSummary();
    renderCalendar();
    renderSelectedDateSchedules();
  });

  prevMonthBtn.addEventListener("click", () => {
    calendarMonth -= 1;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    }
    renderCalendar();
    renderSelectedDateSchedules();
  });

  nextMonthBtn.addEventListener("click", () => {
    calendarMonth += 1;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear += 1;
    }
    renderCalendar();
    renderSelectedDateSchedules();
  });

  clearSelectedDateBtn.addEventListener("click", () => {
    selectedDate = "";
    renderCalendar();
    renderSelectedDateSchedules();
  });

  calendarPopupOverlay.addEventListener("click", (e) => {
    if (e.target === calendarPopupOverlay) {
      selectedDate = "";
      renderCalendar();
      renderSelectedDateSchedules();
    }
  });
}

function toggleTypeFields() {
  const type = itemType.value;

  if (type === "todo") {
    todoFields.classList.remove("hidden");
    scheduleFields.classList.add("hidden");
  } else {
    todoFields.classList.add("hidden");
    scheduleFields.classList.remove("hidden");
  }
}

function saveItem() {
  const type = itemType.value;
  const title = titleInput.value.trim();

  if (!title) {
    alert("제목을 입력하세요.");
    titleInput.focus();
    return;
  }

  if (type === "todo") {
    saveTodo(title);
  } else {
    saveSchedule(title);
  }
}

function saveTodo(title) {
  const dueDate = todoDueDate.value;
  const dueTime = todoDueTime.value;

  if (!dueDate) {
    alert("할일의 기한 날짜를 입력하세요.");
    todoDueDate.focus();
    return;
  }

  const todoData = {
    id: editingId ?? Date.now(),
    type: "todo",
    title,
    dueDate,
    dueTime,
    status: getExistingStatus(editingId),
    createdAt: getTodayString()
  };

  upsertItem(todoData);
}

function saveSchedule(title) {
  const startDate = scheduleStartDate.value;
  const startTime = scheduleStartTime.value;
  const endDate = scheduleEndDate.value;
  const endTime = scheduleEndTime.value;

  if (!startDate || !endDate) {
    alert("일정의 시작 날짜와 종료 날짜를 입력하세요.");
    return;
  }

  const startDateTime = makeDateTime(startDate, startTime);
  const endDateTime = makeDateTime(endDate, endTime);

  if (startDateTime && endDateTime && new Date(startDateTime) > new Date(endDateTime)) {
    alert("종료 시점은 시작 시점보다 뒤여야 합니다.");
    return;
  }

  const scheduleData = {
    id: editingId ?? Date.now(),
    type: "schedule",
    title,
    startDate,
    startTime,
    endDate,
    endTime,
    status: getExistingStatus(editingId),
    createdAt: getTodayString()
  };

  upsertItem(scheduleData);
}

function upsertItem(newItem) {
  if (editingId === null) {
    items.push(newItem);
  } else {
    items = items.map((item) => (item.id === editingId ? newItem : item));
  }

  saveItems();
  resetForm();
  renderMonthOptions();
  renderItems();
  renderSummary();
  renderCalendar();
  renderSelectedDateSchedules();
}

function getExistingStatus(id) {
  if (id === null) return "pending";
  const existing = items.find((item) => item.id === id);
  return existing ? existing.status : "pending";
}

function resetForm() {
  editingId = null;
  formTitle.textContent = "항목 추가";
  saveBtn.textContent = "추가하기";
  cancelEditBtn.classList.add("hidden");

  itemType.value = "todo";
  titleInput.value = "";

  todoDueDate.value = "";
  todoDueTime.value = "";

  scheduleStartDate.value = "";
  scheduleStartTime.value = "";
  scheduleEndDate.value = "";
  scheduleEndTime.value = "";

  toggleTypeFields();
}

function cancelEdit() {
  resetForm();
}

function getTodayString() {
  const nowDate = new Date();
  const year = nowDate.getFullYear();
  const month = String(nowDate.getMonth() + 1).padStart(2, "0");
  const day = String(nowDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeDateTime(date, time) {
  if (!date) return "";
  if (!time) return `${date}T00:00`;
  return `${date}T${time}`;
}

function getMonthKeyFromItem(item) {
  if (item.type === "todo") {
    return item.dueDate.slice(0, 7);
  }
  return item.startDate.slice(0, 7);
}

function getFilteredItems() {
  let filtered = [...items];

  if (selectedTypeFilter) {
    filtered = filtered.filter((item) => item.type === selectedTypeFilter);
  }

  if (selectedMonth) {
    filtered = filtered.filter((item) => getMonthKeyFromItem(item) === selectedMonth);
  }

  return filtered;
}

function sortItems(itemArray) {
  return itemArray.sort((a, b) => {
    const aDate = getSortDate(a);
    const bDate = getSortDate(b);
    return new Date(aDate) - new Date(bDate);
  });
}

function getSortDate(item) {
  if (item.type === "todo") {
    return makeDateTime(item.dueDate, item.dueTime || "00:00");
  }
  return makeDateTime(item.startDate, item.startTime || "00:00");
}

function renderItems() {
  const filteredItems = sortItems(getFilteredItems());

  if (filteredItems.length === 0) {
    itemList.innerHTML = `
      <div class="empty-message">
        현재 표시할 항목이 없습니다.
        <div class="guide-box">
          상태 버튼은 클릭할 때마다
          <strong>빈칸 → 실패(-) → 성공(✓) → 빈칸</strong>
          순서로 바뀝니다.
        </div>
      </div>
    `;
    return;
  }

  itemList.innerHTML = filteredItems.map((item) => renderCard(item)).join("");
}

function renderCard(item) {
  const commonMeta = `
    <span class="meta-badge">종류: ${item.type === "todo" ? "할일" : "일정"}</span>
    <span class="meta-badge">상태: ${getStatusText(item.status)}</span>
    <span class="meta-badge">월: ${getMonthKeyFromItem(item)}</span>
  `;

  let detailMeta = "";

  if (item.type === "todo") {
    detailMeta = `
      <span class="meta-badge">기한: ${item.dueDate}${item.dueTime ? ` ${item.dueTime}` : ""}</span>
      <span class="meta-badge">남은 기한: ${getTodoRemainText(item)}</span>
    `;
  } else {
    detailMeta = `
      <span class="meta-badge">기간: ${item.startDate}${item.startTime ? ` ${item.startTime}` : ""} ~ ${item.endDate}${item.endTime ? ` ${item.endTime}` : ""}</span>
      <span class="meta-badge">일정 상태: ${getScheduleProgressText(item)}</span>
    `;
  }

  return `
    <div class="item-card">
      <button
        class="status-btn ${item.status}"
        onclick="toggleStatus(${item.id})"
        title="상태 변경"
      >
        ${getStatusSymbol(item.status)}
      </button>

      <div class="item-content">
        <div class="item-title">${escapeHtml(item.title)}</div>
        <div class="item-meta">
          ${commonMeta}
          ${detailMeta}
        </div>
      </div>

      <div class="item-actions">
        <button class="edit-btn" onclick="startEdit(${item.id})">수정</button>
        <button class="delete-btn" onclick="deleteItem(${item.id})">삭제</button>
      </div>
    </div>
  `;
}

function getTodoRemainText(item) {
  const target = new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  const nowDate = new Date();

  const diffMs = target - nowDate;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes > 0) {
    const days = Math.floor(diffMinutes / (60 * 24));
    const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
    const minutes = diffMinutes % 60;

    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  }

  if (diffMinutes === 0) {
    return "지금 마감";
  }

  const pastMinutes = Math.abs(diffMinutes);
  const pastDays = Math.floor(pastMinutes / (60 * 24));
  const pastHours = Math.floor((pastMinutes % (60 * 24)) / 60);

  if (pastDays > 0) return `${pastDays}일 지남`;
  if (pastHours > 0) return `${pastHours}시간 지남`;
  return `${pastMinutes}분 지남`;
}

function getScheduleProgressText(item) {
  const nowDate = new Date();
  const start = new Date(makeDateTime(item.startDate, item.startTime || "00:00"));
  const end = new Date(makeDateTime(item.endDate, item.endTime || "23:59"));

  if (nowDate < start) return "시작 전";
  if (nowDate > end) return "종료됨";
  return "진행 중";
}

function getNextStatus(currentStatus) {
  if (currentStatus === "pending") return "fail";
  if (currentStatus === "fail") return "success";
  return "pending";
}

function getStatusSymbol(status) {
  if (status === "fail") return "-";
  if (status === "success") return "✓";
  return "";
}

function getStatusText(status) {
  if (status === "fail") return "실패";
  if (status === "success") return "성공";
  return "미선택";
}

function toggleStatus(id) {
  const item = items.find((x) => x.id === id);
  if (!item) return;

  item.status = getNextStatus(item.status);
  saveItems();
  renderItems();
  renderSummary();
  renderCalendar();
  renderSelectedDateSchedules();
}

function startEdit(id) {
  const item = items.find((x) => x.id === id);
  if (!item) return;

  editingId = id;
  formTitle.textContent = "항목 수정";
  saveBtn.textContent = "수정 저장";
  cancelEditBtn.classList.remove("hidden");

  itemType.value = item.type;
  titleInput.value = item.title;

  if (item.type === "todo") {
    todoDueDate.value = item.dueDate || "";
    todoDueTime.value = item.dueTime || "";

    scheduleStartDate.value = "";
    scheduleStartTime.value = "";
    scheduleEndDate.value = "";
    scheduleEndTime.value = "";
  } else {
    scheduleStartDate.value = item.startDate || "";
    scheduleStartTime.value = item.startTime || "";
    scheduleEndDate.value = item.endDate || "";
    scheduleEndTime.value = item.endTime || "";

    todoDueDate.value = "";
    todoDueTime.value = "";
  }

  toggleTypeFields();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteItem(id) {
  const ok = confirm("정말 삭제할까요?");
  if (!ok) return;

  items = items.filter((item) => item.id !== id);

  if (editingId === id) {
    resetForm();
  }

  if (selectedDate) {
    const schedules = getSchedulesForDate(selectedDate).filter((item) => item.id !== id);
    if (schedules.length === 0) {
      selectedDate = "";
    }
  }

  saveItems();
  renderMonthOptions();
  renderItems();
  renderSummary();
  renderCalendar();
  renderSelectedDateSchedules();
}

function renderMonthOptions() {
  const months = [...new Set(items.map((item) => getMonthKeyFromItem(item)))].sort();

  monthFilter.innerHTML = `<option value="">전체</option>`;

  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    if (month === selectedMonth) {
      option.selected = true;
    }
    monthFilter.appendChild(option);
  });

  if (selectedMonth && !months.includes(selectedMonth)) {
    selectedMonth = "";
    monthFilter.value = "";
  }
}

function renderSummary() {
  const filtered = getFilteredItems();

  totalCount.textContent = filtered.length;
  pendingCount.textContent = filtered.filter((item) => item.status === "pending").length;
  failCount.textContent = filtered.filter((item) => item.status === "fail").length;
  successCount.textContent = filtered.filter((item) => item.status === "success").length;
}

function syncCalendarWithFilter() {
  if (!selectedMonth) return;

  const [year, month] = selectedMonth.split("-");
  calendarYear = Number(year);
  calendarMonth = Number(month) - 1;
}

function renderCalendar() {
  calendarTitle.textContent = `${calendarYear}년 ${calendarMonth + 1}월`;

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

function createCalendarCell(dateObj, isOtherMonth) {
  const dateKey = formatDateKey(dateObj);
  const todayKey = formatDateKey(new Date());
  const isToday = dateKey === todayKey;
  const isSelected = dateKey === selectedDate;

  const schedules = getSchedulesForDate(dateKey);
  const visibleSchedules = schedules.slice(0, 3);
  const moreCount = schedules.length - visibleSchedules.length;

  return `
    <div
      class="calendar-cell ${isOtherMonth ? "other-month" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected-date" : ""}"
      onclick="selectCalendarDate('${dateKey}')"
    >
      <div class="calendar-date">${dateObj.getDate()}</div>
      <div class="calendar-items">
        ${visibleSchedules.map((item) => `
          <div class="calendar-event ${item.status}" title="${escapeHtml(item.title)}">
            ${item.startDate === dateKey && item.startTime ? `[${item.startTime}] ` : ""}
            ${escapeHtml(item.title)}
          </div>
        `).join("")}
        ${moreCount > 0 ? `<div class="calendar-more">+ ${moreCount}개 더</div>` : ""}
      </div>
    </div>
  `;
}

function selectCalendarDate(dateKey) {
  selectedDate = dateKey;
  renderCalendar();
  renderSelectedDateSchedules();
}

function getSchedulesForDate(dateKey) {
  return items
    .filter((item) => item.type === "schedule")
    .filter((item) => isDateInScheduleRange(dateKey, item))
    .sort((a, b) => {
      const aTime = a.startTime || "00:00";
      const bTime = b.startTime || "00:00";
      return aTime.localeCompare(bTime);
    });
}

function renderSelectedDateSchedules() {
  if (!selectedDate) {
    calendarPopupOverlay.classList.add("hidden");
    selectedDateLabel.textContent = "날짜를 선택하세요.";
    selectedDateScheduleList.innerHTML = "";
    return;
  }

  const schedules = getSchedulesForDate(selectedDate);
  calendarPopupOverlay.classList.remove("hidden");
  selectedDateLabel.textContent = `${selectedDate} 일정`;

  if (schedules.length === 0) {
    selectedDateScheduleList.innerHTML = `
      <div class="empty-message">
        ${selectedDate}에는 등록된 일정이 없습니다.
      </div>
    `;
    return;
  }

  selectedDateScheduleList.innerHTML = schedules
    .map((item) => {
      return `
        <div class="selected-schedule-card">
          <button
            class="status-btn ${item.status}"
            onclick="toggleStatus(${item.id})"
            title="상태 변경"
          >
            ${getStatusSymbol(item.status)}
          </button>

          <div class="selected-schedule-content">
            <div class="selected-schedule-title">${escapeHtml(item.title)}</div>

            <div class="selected-schedule-meta">
              <span class="meta-badge">상태: ${getStatusText(item.status)}</span>
              <span class="meta-badge">진행 상태: ${getScheduleProgressText(item)}</span>
            </div>

            <div class="selected-schedule-time-block">
              <div><strong>시작</strong> : ${item.startDate}${item.startTime ? ` ${item.startTime}` : ""}</div>
              <div><strong>종료</strong> : ${item.endDate}${item.endTime ? ` ${item.endTime}` : ""}</div>
            </div>
          </div>

          <div class="selected-schedule-actions">
            <button class="edit-btn" onclick="startEdit(${item.id})">수정</button>
            <button class="delete-btn" onclick="deleteItem(${item.id})">삭제</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function isDateInScheduleRange(dateKey, schedule) {
  const current = new Date(`${dateKey}T00:00`);
  const start = new Date(`${schedule.startDate}T00:00`);
  const end = new Date(`${schedule.endDate}T00:00`);

  return current >= start && current <= end;
}

function formatDateKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function saveItems() {
  localStorage.setItem("planner_items_overlay_v1", JSON.stringify(items));
}

function loadItems() {
  const savedOverlay = localStorage.getItem("planner_items_overlay_v1");
  const savedV4 = localStorage.getItem("planner_items_v4");
  const savedV3 = localStorage.getItem("planner_items_v3");
  const savedV2 = localStorage.getItem("planner_items_v2");

  const target = savedOverlay || savedV4 || savedV3 || savedV2;

  if (!target) return [];

  try {
    const parsed = JSON.parse(target);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("데이터 불러오기 오류:", error);
    return [];
  }
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}