const tabButtons = document.querySelectorAll(".tab-btn");
const tabSections = document.querySelectorAll(".tab-section");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const failCount = document.getElementById("failCount");
const successCount = document.getElementById("successCount");

const homeTodoCount = document.getElementById("homeTodoCount");
const homeScheduleCount = document.getElementById("homeScheduleCount");
const homeTodayScheduleCount = document.getElementById("homeTodayScheduleCount");
const homeUrgentTodoCount = document.getElementById("homeUrgentTodoCount");

const todoTitleInput = document.getElementById("todoTitleInput");
const todoDueDate = document.getElementById("todoDueDate");
const todoDueTime = document.getElementById("todoDueTime");
const saveTodoBtn = document.getElementById("saveTodoBtn");
const cancelTodoEditBtn = document.getElementById("cancelTodoEditBtn");
const todoFormTitle = document.getElementById("todoFormTitle");
const todoList = document.getElementById("todoList");

const scheduleTitleInput = document.getElementById("scheduleTitleInput");
const scheduleStartDate = document.getElementById("scheduleStartDate");
const scheduleStartTime = document.getElementById("scheduleStartTime");
const scheduleEndDate = document.getElementById("scheduleEndDate");
const scheduleEndTime = document.getElementById("scheduleEndTime");
const saveScheduleBtn = document.getElementById("saveScheduleBtn");
const cancelScheduleEditBtn = document.getElementById("cancelScheduleEditBtn");
const scheduleFormTitle = document.getElementById("scheduleFormTitle");

const typeFilter = document.getElementById("typeFilter");
const monthFilter = document.getElementById("monthFilter");
const allItemList = document.getElementById("allItemList");

const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");

const selectedDateLabel = document.getElementById("selectedDateLabel");
const selectedDateScheduleList = document.getElementById("selectedDateScheduleList");
const clearSelectedDateBtn = document.getElementById("clearSelectedDateBtn");
const calendarPopupOverlay = document.getElementById("calendarPopupOverlay");

let items = loadItems();
let selectedAllMonth = "";
let selectedAllType = "";
let currentTab = "home";

let todoEditingId = null;
let scheduleEditingId = null;

let selectedDate = "";

const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

init();

function init() {
  setupTabs();

  saveTodoBtn.addEventListener("click", saveTodo);
  cancelTodoEditBtn.addEventListener("click", resetTodoForm);

  saveScheduleBtn.addEventListener("click", saveSchedule);
  cancelScheduleEditBtn.addEventListener("click", resetScheduleForm);

  typeFilter.addEventListener("change", (e) => {
    selectedAllType = e.target.value;
    renderAllList();
  });

  monthFilter.addEventListener("change", (e) => {
    selectedAllMonth = e.target.value;
    renderAllList();

    if (selectedAllMonth) {
      const [year, month] = selectedAllMonth.split("-");
      calendarYear = Number(year);
      calendarMonth = Number(month) - 1;
    }

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

  renderMonthOptions();
  renderAll();
}

function setupTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.dataset.tab;
      currentTab = targetTab;

      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      tabSections.forEach((section) => section.classList.add("hidden"));
      document.getElementById(`tab-${targetTab}`).classList.remove("hidden");

      if (targetTab !== "schedule") {
        selectedDate = "";
        renderSelectedDateSchedules();
      }

      if (targetTab === "schedule") {
        renderCalendar();
        renderSelectedDateSchedules();
      }
    });
  });
}

function renderAll() {
  renderSummary();
  renderTodoList();
  renderMonthOptions();
  renderAllList();
  renderCalendar();
  renderSelectedDateSchedules();
}

function saveTodo() {
  const title = todoTitleInput.value.trim();
  const dueDate = todoDueDate.value;
  const dueTime = todoDueTime.value;

  if (!title) {
    alert("할일 제목을 입력하세요.");
    todoTitleInput.focus();
    return;
  }

  if (!dueDate) {
    alert("기한 날짜를 입력하세요.");
    todoDueDate.focus();
    return;
  }

  const newItem = {
    id: todoEditingId ?? Date.now(),
    type: "todo",
    title,
    dueDate,
    dueTime,
    status: getExistingStatus(todoEditingId),
    createdAt: getTodayString()
  };

  upsertItem(newItem);
  resetTodoForm();
}

function saveSchedule() {
  const title = scheduleTitleInput.value.trim();
  const startDate = scheduleStartDate.value;
  const startTime = scheduleStartTime.value;
  const endDate = scheduleEndDate.value;
  const endTime = scheduleEndTime.value;

  if (!title) {
    alert("일정 제목을 입력하세요.");
    scheduleTitleInput.focus();
    return;
  }

  if (!startDate || !endDate) {
    alert("시작 날짜와 종료 날짜를 입력하세요.");
    return;
  }

  const startDateTime = makeDateTime(startDate, startTime);
  const endDateTime = makeDateTime(endDate, endTime);

  if (new Date(startDateTime) > new Date(endDateTime)) {
    alert("종료 시점은 시작 시점보다 뒤여야 합니다.");
    return;
  }

  const newItem = {
    id: scheduleEditingId ?? Date.now(),
    type: "schedule",
    title,
    startDate,
    startTime,
    endDate,
    endTime,
    status: getExistingStatus(scheduleEditingId),
    createdAt: getTodayString()
  };

  upsertItem(newItem);
  resetScheduleForm();
}

function upsertItem(newItem) {
  const exists = items.some((item) => item.id === newItem.id);

  if (exists) {
    items = items.map((item) => (item.id === newItem.id ? newItem : item));
  } else {
    items.push(newItem);
  }

  saveItems();
  renderAll();
}

function getExistingStatus(id) {
  if (id === null) return "pending";
  const found = items.find((item) => item.id === id);
  return found ? found.status : "pending";
}

function resetTodoForm() {
  todoEditingId = null;
  todoFormTitle.textContent = "할일 추가";
  saveTodoBtn.textContent = "추가하기";
  cancelTodoEditBtn.classList.add("hidden");
  todoTitleInput.value = "";
  todoDueDate.value = "";
  todoDueTime.value = "";
}

function resetScheduleForm() {
  scheduleEditingId = null;
  scheduleFormTitle.textContent = "일정 추가";
  saveScheduleBtn.textContent = "추가하기";
  cancelScheduleEditBtn.classList.add("hidden");
  scheduleTitleInput.value = "";
  scheduleStartDate.value = "";
  scheduleStartTime.value = "";
  scheduleEndDate.value = "";
  scheduleEndTime.value = "";
}

function startEdit(id) {
  const item = items.find((x) => x.id === id);
  if (!item) return;

  if (item.type === "todo") {
    todoEditingId = id;
    todoFormTitle.textContent = "할일 수정";
    saveTodoBtn.textContent = "수정 저장";
    cancelTodoEditBtn.classList.remove("hidden");

    todoTitleInput.value = item.title;
    todoDueDate.value = item.dueDate || "";
    todoDueTime.value = item.dueTime || "";

    switchTab("todo");
  } else {
    scheduleEditingId = id;
    scheduleFormTitle.textContent = "일정 수정";
    saveScheduleBtn.textContent = "수정 저장";
    cancelScheduleEditBtn.classList.remove("hidden");

    scheduleTitleInput.value = item.title;
    scheduleStartDate.value = item.startDate || "";
    scheduleStartTime.value = item.startTime || "";
    scheduleEndDate.value = item.endDate || "";
    scheduleEndTime.value = item.endTime || "";

    switchTab("schedule");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchTab(tabName) {
  currentTab = tabName;

  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  tabSections.forEach((section) => {
    section.classList.add("hidden");
  });

  document.getElementById(`tab-${tabName}`).classList.remove("hidden");

  if (tabName !== "schedule") {
    selectedDate = "";
    renderSelectedDateSchedules();
  }

  if (tabName === "schedule") {
    renderCalendar();
    renderSelectedDateSchedules();
  }
}

function deleteItem(id) {
  const ok = confirm("정말 삭제할까요?");
  if (!ok) return;

  items = items.filter((item) => item.id !== id);

  if (todoEditingId === id) {
    resetTodoForm();
  }

  if (scheduleEditingId === id) {
    resetScheduleForm();
  }

  if (selectedDate) {
    const remains = getSchedulesForDate(selectedDate).filter((item) => item.id !== id);
    if (remains.length === 0) {
      selectedDate = "";
    }
  }

  saveItems();
  renderAll();
}

function toggleStatus(id) {
  const item = items.find((x) => x.id === id);
  if (!item) return;

  item.status = getNextStatus(item.status);
  saveItems();
  renderAll();
}

function renderSummary() {
  const total = items.length;
  const pending = items.filter((item) => item.status === "pending").length;
  const fail = items.filter((item) => item.status === "fail").length;
  const success = items.filter((item) => item.status === "success").length;

  totalCount.textContent = total;
  pendingCount.textContent = pending;
  failCount.textContent = fail;
  successCount.textContent = success;

  const todos = items.filter((item) => item.type === "todo");
  const schedules = items.filter((item) => item.type === "schedule");
  const todayKey = formatDateKey(new Date());

  homeTodoCount.textContent = todos.length;
  homeScheduleCount.textContent = schedules.length;
  homeTodayScheduleCount.textContent = schedules.filter((item) => isDateInScheduleRange(todayKey, item)).length;
  homeUrgentTodoCount.textContent = todos.filter((item) => getTodoDiffMinutes(item) >= 0 && getTodoDiffMinutes(item) <= 1440).length;
}

function renderTodoList() {
  const todos = sortItems(items.filter((item) => item.type === "todo"));

  if (todos.length === 0) {
    todoList.innerHTML = `
      <div class="empty-message">
        등록된 할일이 없습니다.
      </div>
    `;
    return;
  }

  todoList.innerHTML = todos.map((item) => renderCard(item)).join("");
}

function renderAllList() {
  const filtered = sortItems(getFilteredAllItems());

  if (filtered.length === 0) {
    allItemList.innerHTML = `
      <div class="empty-message">
        현재 표시할 항목이 없습니다.
      </div>
    `;
    return;
  }

  allItemList.innerHTML = filtered.map((item) => renderCard(item)).join("");
}

function getFilteredAllItems() {
  let filtered = [...items];

  if (selectedAllType) {
    filtered = filtered.filter((item) => item.type === selectedAllType);
  }

  if (selectedAllMonth) {
    filtered = filtered.filter((item) => getMonthKeyFromItem(item) === selectedAllMonth);
  }

  return filtered;
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

function renderMonthOptions() {
  const months = [...new Set(items.map((item) => getMonthKeyFromItem(item)))].sort();

  monthFilter.innerHTML = `<option value="">전체</option>`;

  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    if (month === selectedAllMonth) {
      option.selected = true;
    }
    monthFilter.appendChild(option);
  });

  if (selectedAllMonth && !months.includes(selectedAllMonth)) {
    selectedAllMonth = "";
    monthFilter.value = "";
  }
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

function renderSelectedDateSchedules() {
  if (!selectedDate || currentTab !== "schedule") {
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

function isDateInScheduleRange(dateKey, schedule) {
  const current = new Date(`${dateKey}T00:00`);
  const start = new Date(`${schedule.startDate}T00:00`);
  const end = new Date(`${schedule.endDate}T00:00`);
  return current >= start && current <= end;
}

function sortItems(itemArray) {
  return itemArray.sort((a, b) => new Date(getSortDate(a)) - new Date(getSortDate(b)));
}

function getSortDate(item) {
  if (item.type === "todo") {
    return makeDateTime(item.dueDate, item.dueTime || "00:00");
  }
  return makeDateTime(item.startDate, item.startTime || "00:00");
}

function getMonthKeyFromItem(item) {
  if (item.type === "todo") {
    return item.dueDate.slice(0, 7);
  }
  return item.startDate.slice(0, 7);
}

function getTodoDiffMinutes(item) {
  const target = new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  const nowDate = new Date();
  return Math.floor((target - nowDate) / (1000 * 60));
}

function getTodoRemainText(item) {
  const diffMinutes = getTodoDiffMinutes(item);

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

function formatDateKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function saveItems() {
  localStorage.setItem("planner_items_tabs_v1", JSON.stringify(items));
}

function loadItems() {
  const savedTabs = localStorage.getItem("planner_items_tabs_v1");
  const savedOverlay = localStorage.getItem("planner_items_overlay_v1");
  const savedV4 = localStorage.getItem("planner_items_v4");
  const savedV3 = localStorage.getItem("planner_items_v3");
  const savedV2 = localStorage.getItem("planner_items_v2");

  const target = savedTabs || savedOverlay || savedV4 || savedV3 || savedV2;

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