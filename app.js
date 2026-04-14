const STORAGE_KEY = "planner_items_tabs_v8";

const bottomTabButtons = document.querySelectorAll(".bottom-tab-btn");
const tabSections = document.querySelectorAll(".tab-section");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const failCount = document.getElementById("failCount");
const successCount = document.getElementById("successCount");

const dashboardTodoCount = document.getElementById("dashboardTodoCount");
const dashboardScheduleCount = document.getElementById("dashboardScheduleCount");
const dashboardTodayCount = document.getElementById("dashboardTodayCount");
const dashboardUrgentTodoCount = document.getElementById("dashboardUrgentTodoCount");

const achievementRate = document.getElementById("achievementRate");
const achievementBarFill = document.getElementById("achievementBarFill");
const achievementDesc = document.getElementById("achievementDesc");

const itemType = document.getElementById("itemType");
const titleInput = document.getElementById("titleInput");
const plannerFormTitle = document.getElementById("plannerFormTitle");
const saveItemBtn = document.getElementById("saveItemBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const todoFields = document.getElementById("todoFields");
const scheduleFields = document.getElementById("scheduleFields");

const todoDueDate = document.getElementById("todoDueDate");
const todoDueTime = document.getElementById("todoDueTime");
const todoRepeat = document.getElementById("todoRepeat");
const todoRepeatUntil = document.getElementById("todoRepeatUntil");

const scheduleStartDate = document.getElementById("scheduleStartDate");
const scheduleStartTime = document.getElementById("scheduleStartTime");
const scheduleEndDate = document.getElementById("scheduleEndDate");
const scheduleEndTime = document.getElementById("scheduleEndTime");
const scheduleRepeat = document.getElementById("scheduleRepeat");
const scheduleRepeatUntil = document.getElementById("scheduleRepeatUntil");

const typeFilter = document.getElementById("typeFilter");
const yearFilter = document.getElementById("yearFilter");
const monthFilter = document.getElementById("monthFilter");

const dashboardItemList = document.getElementById("dashboardItemList");
const todayList = document.getElementById("todayList");

const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");

const calendarPopupOverlay = document.getElementById("calendarPopupOverlay");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const selectedDateItemList = document.getElementById("selectedDateItemList");
const clearSelectedDateBtn = document.getElementById("clearSelectedDateBtn");

const summaryPopupOverlay = document.getElementById("summaryPopupOverlay");
const summaryPopupLabel = document.getElementById("summaryPopupLabel");
const summaryPopupList = document.getElementById("summaryPopupList");
const closeSummaryPopupBtn = document.getElementById("closeSummaryPopupBtn");
const summaryButtons = document.querySelectorAll("[data-summary]");

const popupItemType = document.getElementById("popupItemType");
const popupTitleInput = document.getElementById("popupTitleInput");

const popupTodoFields = document.getElementById("popupTodoFields");
const popupTodoTime = document.getElementById("popupTodoTime");
const popupTodoRepeat = document.getElementById("popupTodoRepeat");
const popupTodoRepeatUntil = document.getElementById("popupTodoRepeatUntil");

const popupScheduleFields = document.getElementById("popupScheduleFields");
const popupScheduleStartTime = document.getElementById("popupScheduleStartTime");
const popupScheduleEndTime = document.getElementById("popupScheduleEndTime");
const popupScheduleEndDate = document.getElementById("popupScheduleEndDate");
const popupScheduleRepeat = document.getElementById("popupScheduleRepeat");
const popupScheduleRepeatUntil = document.getElementById("popupScheduleRepeatUntil");

const popupAddItemBtn = document.getElementById("popupAddItemBtn");

let items = loadItems();
let selectedFilterType = "";
let selectedFilterYear = "";
let selectedFilterMonth = "";
let currentTab = "dashboard";
let editingId = null;
let selectedDate = "";

const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

init();

function init() {
  setupTabs();
  setupPlannerForm();

  saveItemBtn.addEventListener("click", saveCurrentItem);
  cancelEditBtn.addEventListener("click", resetPlannerForm);

  typeFilter.addEventListener("change", (e) => {
    selectedFilterType = e.target.value;
    renderDashboard();
  });

  yearFilter.addEventListener("change", (e) => {
    selectedFilterYear = e.target.value;
    renderMonthOptions();
    renderDashboard();
  });

  monthFilter.addEventListener("change", (e) => {
    selectedFilterMonth = e.target.value;
    renderDashboard();
  });

  prevMonthBtn.addEventListener("click", () => {
    calendarMonth -= 1;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
    calendarMonth += 1;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear += 1;
    }
    renderCalendar();
  });

  clearSelectedDateBtn.addEventListener("click", closeDatePopup);
  calendarPopupOverlay.addEventListener("click", (e) => {
    if (e.target === calendarPopupOverlay) {
      closeDatePopup();
    }
  });

  closeSummaryPopupBtn.addEventListener("click", closeSummaryPopup);
  summaryPopupOverlay.addEventListener("click", (e) => {
    if (e.target === summaryPopupOverlay) {
      closeSummaryPopup();
    }
  });

  summaryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openSummaryPopup(button.dataset.summary);
    });
  });

  popupItemType.addEventListener("change", updatePopupFields);
  popupAddItemBtn.addEventListener("click", addItemFromSelectedDate);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDatePopup();
      closeSummaryPopup();
    }
  });

  document.addEventListener("click", handleGlobalClick);

  renderYearOptions();
  renderMonthOptions();
  renderAll();
}

function setupTabs() {
  bottomTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;

  bottomTabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  tabSections.forEach((section) => section.classList.add("hidden"));
  document.getElementById(`tab-${tabName}`).classList.remove("hidden");

  if (tabName !== "planner") {
    closeDatePopup();
  }

  renderCalendar();
  renderTodayList();
}

function setupPlannerForm() {
  itemType.addEventListener("change", updatePlannerFields);
  updatePlannerFields();
}

function updatePlannerFields() {
  if (itemType.value === "todo") {
    todoFields.classList.remove("hidden");
    scheduleFields.classList.add("hidden");
  } else {
    todoFields.classList.add("hidden");
    scheduleFields.classList.remove("hidden");
  }
}

function updatePopupFields() {
  if (popupItemType.value === "todo") {
    popupTodoFields.classList.remove("hidden");
    popupScheduleFields.classList.add("hidden");
  } else {
    popupTodoFields.classList.add("hidden");
    popupScheduleFields.classList.remove("hidden");
  }
}

function resetPopupQuickAddForm() {
  popupItemType.value = "todo";
  popupTitleInput.value = "";

  popupTodoTime.value = "";
  popupTodoRepeat.value = "none";
  popupTodoRepeatUntil.value = "";

  popupScheduleStartTime.value = "";
  popupScheduleEndTime.value = "";
  popupScheduleEndDate.value = selectedDate || "";
  popupScheduleRepeat.value = "none";
  popupScheduleRepeatUntil.value = "";

  updatePopupFields();
}

function renderAll() {
  renderYearOptions();
  renderMonthOptions();
  renderDashboard();
  renderTodayList();
  renderCalendar();
}

function saveCurrentItem() {
  const type = itemType.value;
  const title = titleInput.value.trim();

  if (!title) {
    alert("제목을 입력하세요.");
    titleInput.focus();
    return;
  }

  if (editingId !== null) {
    saveEditedSingleItem(type, title);
    return;
  }

  if (type === "todo") {
    saveTodoSeries(title);
  } else {
    saveScheduleSeries(title);
  }
}

function saveEditedSingleItem(type, title) {
  if (type === "todo") {
    const dueDate = todoDueDate.value;
    const dueTime = todoDueTime.value;

    if (!dueDate) {
      alert("기한 날짜를 입력하세요.");
      return;
    }

    items = items.map((item) =>
      item.id === editingId
        ? {
            ...item,
            type: "todo",
            title,
            dueDate,
            dueTime
          }
        : item
    );
  } else {
    const startDate = scheduleStartDate.value;
    const startTime = scheduleStartTime.value;
    const endDate = scheduleEndDate.value;
    const endTime = scheduleEndTime.value;

    if (!startDate || !endDate) {
      alert("시작 날짜와 종료 날짜를 입력하세요.");
      return;
    }

    const startDateTime = new Date(makeDateTime(startDate, startTime || "00:00"));
    const endDateTime = new Date(makeDateTime(endDate, endTime || "23:59"));

    if (startDateTime > endDateTime) {
      alert("종료 시점은 시작 시점보다 뒤여야 합니다.");
      return;
    }

    items = items.map((item) =>
      item.id === editingId
        ? {
            ...item,
            type: "schedule",
            title,
            startDate,
            startTime,
            endDate,
            endTime
          }
        : item
    );
  }

  saveItems();
  resetPlannerForm();
  renderAll();
}

function saveTodoSeries(title) {
  const dueDate = todoDueDate.value;
  const dueTime = todoDueTime.value;
  const repeat = todoRepeat.value;
  const repeatUntil = todoRepeatUntil.value;

  if (!dueDate) {
    alert("기한 날짜를 입력하세요.");
    todoDueDate.focus();
    return;
  }

  if (repeat !== "none" && !repeatUntil) {
    alert("반복 종료일을 입력하세요.");
    todoRepeatUntil.focus();
    return;
  }

  if (repeat !== "none" && new Date(`${repeatUntil}T00:00`) < new Date(`${dueDate}T00:00`)) {
    alert("반복 종료일은 기한 날짜보다 뒤여야 합니다.");
    return;
  }

  const seriesItems = generateTodoSeries({
    title,
    dueDate,
    dueTime,
    repeat,
    repeatUntil
  });

  items.push(...seriesItems);
  saveItems();
  resetPlannerForm();
  renderAll();
}

function saveScheduleSeries(title) {
  const startDate = scheduleStartDate.value;
  const startTime = scheduleStartTime.value;
  const endDate = scheduleEndDate.value;
  const endTime = scheduleEndTime.value;
  const repeat = scheduleRepeat.value;
  const repeatUntil = scheduleRepeatUntil.value;

  if (!startDate || !endDate) {
    alert("시작 날짜와 종료 날짜를 입력하세요.");
    return;
  }

  const startDateTime = new Date(makeDateTime(startDate, startTime || "00:00"));
  const endDateTime = new Date(makeDateTime(endDate, endTime || "23:59"));

  if (startDateTime > endDateTime) {
    alert("종료 시점은 시작 시점보다 뒤여야 합니다.");
    return;
  }

  if (repeat !== "none" && !repeatUntil) {
    alert("반복 종료일을 입력하세요.");
    scheduleRepeatUntil.focus();
    return;
  }

  if (repeat !== "none" && new Date(`${repeatUntil}T00:00`) < new Date(`${startDate}T00:00`)) {
    alert("반복 종료일은 시작 날짜보다 뒤여야 합니다.");
    return;
  }

  const seriesItems = generateScheduleSeries({
    title,
    startDate,
    startTime,
    endDate,
    endTime,
    repeat,
    repeatUntil
  });

  items.push(...seriesItems);
  saveItems();
  resetPlannerForm();
  renderAll();
}

function generateTodoSeries(base) {
  const list = [];
  const groupId = makeId();
  const start = new Date(`${base.dueDate}T00:00`);
  const end = base.repeat === "none"
    ? new Date(`${base.dueDate}T00:00`)
    : new Date(`${base.repeatUntil}T00:00`);

  let cursor = new Date(start);

  while (cursor <= end) {
    list.push({
      id: makeId(),
      groupId,
      type: "todo",
      title: base.title,
      dueDate: formatDateKey(cursor),
      dueTime: base.dueTime || "",
      repeat: base.repeat,
      repeatUntil: base.repeat === "none" ? "" : base.repeatUntil,
      status: "pending",
      createdAt: getTodayString()
    });

    if (base.repeat === "none") break;
    cursor = moveCursor(cursor, base.repeat);
  }

  return list;
}

function generateScheduleSeries(base) {
  const list = [];
  const groupId = makeId();
  const baseStart = new Date(`${base.startDate}T00:00`);
  const baseEnd = new Date(`${base.endDate}T00:00`);
  const durationDays = dateDiffDays(baseStart, baseEnd);

  const limit = base.repeat === "none"
    ? new Date(`${base.startDate}T00:00`)
    : new Date(`${base.repeatUntil}T00:00`);

  let cursor = new Date(baseStart);

  while (cursor <= limit) {
    const currentEnd = addDays(cursor, durationDays);

    list.push({
      id: makeId(),
      groupId,
      type: "schedule",
      title: base.title,
      startDate: formatDateKey(cursor),
      startTime: base.startTime || "",
      endDate: formatDateKey(currentEnd),
      endTime: base.endTime || "",
      repeat: base.repeat,
      repeatUntil: base.repeat === "none" ? "" : base.repeatUntil,
      status: "pending",
      createdAt: getTodayString()
    });

    if (base.repeat === "none") break;
    cursor = moveCursor(cursor, base.repeat);
  }

  return list;
}

function moveCursor(dateObj, repeat) {
  const next = new Date(dateObj);

  if (repeat === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (repeat === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (repeat === "monthly") {
    const originalDate = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDate, lastDay));
  }

  return next;
}

function addItemFromSelectedDate() {
  if (!selectedDate) {
    alert("먼저 날짜를 선택하세요.");
    return;
  }

  const type = popupItemType.value;
  const title = popupTitleInput.value.trim();

  if (!title) {
    alert("제목을 입력하세요.");
    popupTitleInput.focus();
    return;
  }

  if (type === "todo") {
    const repeat = popupTodoRepeat.value;
    const repeatUntil = popupTodoRepeatUntil.value;

    if (repeat !== "none" && !repeatUntil) {
      alert("반복 종료일을 입력하세요.");
      popupTodoRepeatUntil.focus();
      return;
    }

    if (repeat !== "none" && new Date(`${repeatUntil}T00:00`) < new Date(`${selectedDate}T00:00`)) {
      alert("반복 종료일은 선택한 날짜보다 뒤여야 합니다.");
      return;
    }

    const seriesItems = generateTodoSeries({
      title,
      dueDate: selectedDate,
      dueTime: popupTodoTime.value,
      repeat,
      repeatUntil
    });

    items.push(...seriesItems);
  } else {
    const endDate = popupScheduleEndDate.value || selectedDate;
    const startTime = popupScheduleStartTime.value || "";
    const endTime = popupScheduleEndTime.value || "";
    const repeat = popupScheduleRepeat.value;
    const repeatUntil = popupScheduleRepeatUntil.value;

    const startDateTime = new Date(makeDateTime(selectedDate, startTime || "00:00"));
    const endDateTime = new Date(makeDateTime(endDate, endTime || "23:59"));

    if (startDateTime > endDateTime) {
      alert("종료 시점은 시작 시점보다 뒤여야 합니다.");
      return;
    }

    if (repeat !== "none" && !repeatUntil) {
      alert("반복 종료일을 입력하세요.");
      popupScheduleRepeatUntil.focus();
      return;
    }

    if (repeat !== "none" && new Date(`${repeatUntil}T00:00`) < new Date(`${selectedDate}T00:00`)) {
      alert("반복 종료일은 선택한 날짜보다 뒤여야 합니다.");
      return;
    }

    const seriesItems = generateScheduleSeries({
      title,
      startDate: selectedDate,
      startTime,
      endDate,
      endTime,
      repeat,
      repeatUntil
    });

    items.push(...seriesItems);
  }

  saveItems();
  renderAll();
  openDatePopup(selectedDate);
}

function resetPlannerForm() {
  editingId = null;
  plannerFormTitle.textContent = "항목 추가";
  saveItemBtn.textContent = "추가하기";
  cancelEditBtn.classList.add("hidden");

  itemType.value = "todo";
  titleInput.value = "";

  todoDueDate.value = "";
  todoDueTime.value = "";
  todoRepeat.value = "none";
  todoRepeatUntil.value = "";

  scheduleStartDate.value = "";
  scheduleStartTime.value = "";
  scheduleEndDate.value = "";
  scheduleEndTime.value = "";
  scheduleRepeat.value = "none";
  scheduleRepeatUntil.value = "";

  updatePlannerFields();
}

function startEdit(id) {
  const item = items.find((x) => x.id === id);
  if (!item) return;

  editingId = id;
  plannerFormTitle.textContent = item.type === "todo" ? "할일 수정" : "일정 수정";
  saveItemBtn.textContent = "수정 저장";
  cancelEditBtn.classList.remove("hidden");

  itemType.value = item.type;
  titleInput.value = item.title;

  if (item.type === "todo") {
    todoDueDate.value = item.dueDate || "";
    todoDueTime.value = item.dueTime || "";
    todoRepeat.value = "none";
    todoRepeatUntil.value = "";
  } else {
    scheduleStartDate.value = item.startDate || "";
    scheduleStartTime.value = item.startTime || "";
    scheduleEndDate.value = item.endDate || "";
    scheduleEndTime.value = item.endTime || "";
    scheduleRepeat.value = "none";
    scheduleRepeatUntil.value = "";
  }

  updatePlannerFields();
  switchTab("planner");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteItem(id) {
  const ok = confirm("정말 삭제할까요?");
  if (!ok) return;

  items = items.filter((item) => item.id !== id);

  if (editingId === id) {
    resetPlannerForm();
  }

  const dayItems = selectedDate ? getItemsForDate(selectedDate) : [];
  if (selectedDate && dayItems.length === 0) {
    closeDatePopup();
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

  if (selectedDate) {
    openDatePopup(selectedDate);
  }
}

function handleGlobalClick(e) {
  const actionTarget = e.target.closest("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;

  if (action === "toggle-status") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    toggleStatus(id);
    return;
  }

  if (action === "edit-item") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    startEdit(id);
    return;
  }

  if (action === "delete-item") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    deleteItem(id);
    return;
  }

  if (action === "select-date") {
    const dateKey = actionTarget.dataset.date;
    if (!dateKey) return;
    selectCalendarDate(dateKey);
  }
}

function getFilteredItems() {
  let filtered = [...items];

  if (selectedFilterType) {
    filtered = filtered.filter((item) => item.type === selectedFilterType);
  }

  if (selectedFilterYear) {
    filtered = filtered.filter((item) => getYearFromItem(item) === selectedFilterYear);
  }

  if (selectedFilterMonth) {
    filtered = filtered.filter((item) => getMonthFromItem(item) === selectedFilterMonth);
  }

  return filtered;
}

function renderDashboard() {
  const filtered = sortItems(getFilteredItems());

  const total = filtered.length;
  const pending = filtered.filter((item) => item.status === "pending").length;
  const fail = filtered.filter((item) => item.status === "fail").length;
  const success = filtered.filter((item) => item.status === "success").length;

  totalCount.textContent = total;
  pendingCount.textContent = pending;
  failCount.textContent = fail;
  successCount.textContent = success;

  dashboardTodoCount.textContent = filtered.filter((item) => item.type === "todo").length;
  dashboardScheduleCount.textContent = filtered.filter((item) => item.type === "schedule").length;

  const todayKey = formatDateKey(new Date());
  dashboardTodayCount.textContent = filtered.filter((item) => isItemOnDate(todayKey, item)).length;

  dashboardUrgentTodoCount.textContent = filtered.filter((item) => {
    if (item.type !== "todo") return false;
    const diff = getTodoDiffMinutes(item);
    return diff >= 0 && diff <= 1440;
  }).length;

  const rate = getAchievementRate(filtered);
  achievementRate.textContent = `${rate}%`;
  achievementBarFill.style.width = `${rate}%`;

  const completedBase = filtered.filter((item) => item.status === "success" || item.status === "fail").length;
  achievementDesc.textContent = completedBase === 0
    ? "완료 / (완료 + 미완료) 기준 · 아직 계산할 항목이 없습니다."
    : `완료 / (완료 + 미완료) 기준 · ${completedBase}개 반영`;

  if (filtered.length === 0) {
    dashboardItemList.innerHTML = `
      <div class="empty-message">
        현재 표시할 항목이 없습니다.
      </div>
    `;
    return;
  }

  dashboardItemList.innerHTML = filtered.map((item) => renderCard(item)).join("");
}

function renderTodayList() {
  const todayKey = formatDateKey(new Date());
  const todayItems = getItemsForDate(todayKey);

  if (todayItems.length === 0) {
    todayList.innerHTML = `
      <div class="empty-message">
        오늘 항목이 없습니다.
      </div>
    `;
    return;
  }

  todayList.innerHTML = todayItems.map((item) => renderCard(item)).join("");
}

function openSummaryPopup(type) {
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
    urgent: "마감 임박 할일"
  };

  summaryPopupLabel.textContent = labelMap[type] || "목록";

  if (list.length === 0) {
    summaryPopupList.innerHTML = `
      <div class="empty-message">
        표시할 항목이 없습니다.
      </div>
    `;
  } else {
    summaryPopupList.innerHTML = list.map((item) => renderSelectedCard(item)).join("");
  }

  summaryPopupOverlay.classList.remove("hidden");
}

function closeSummaryPopup() {
  summaryPopupOverlay.classList.add("hidden");
}

function getSummaryList(type, filtered) {
  const todayKey = formatDateKey(new Date());

  if (type === "all") return sortItems(filtered);
  if (type === "pending") return sortItems(filtered.filter((item) => item.status === "pending"));
  if (type === "fail") return sortItems(filtered.filter((item) => item.status === "fail"));
  if (type === "success") return sortItems(filtered.filter((item) => item.status === "success"));
  if (type === "todo") return sortItems(filtered.filter((item) => item.type === "todo"));
  if (type === "schedule") return sortItems(filtered.filter((item) => item.type === "schedule"));
  if (type === "today") return sortItems(filtered.filter((item) => isItemOnDate(todayKey, item)));
  if (type === "urgent") {
    return sortItems(filtered.filter((item) => {
      if (item.type !== "todo") return false;
      const diff = getTodoDiffMinutes(item);
      return diff >= 0 && diff <= 1440;
    }));
  }

  return [];
}

function getAchievementRate(filteredItems) {
  const success = filteredItems.filter((item) => item.status === "success").length;
  const fail = filteredItems.filter((item) => item.status === "fail").length;
  const base = success + fail;

  if (base === 0) return 0;
  return Math.round((success / base) * 100);
}

function renderCard(item) {
  const commonMeta = `
    <span class="meta-badge">종류: ${item.type === "todo" ? "할일" : "일정"}</span>
    <span class="meta-badge">상태: ${getStatusText(item.status)}</span>
    <span class="meta-badge">연도: ${getYearFromItem(item).slice(2)}년</span>
    <span class="meta-badge">월: ${Number(getMonthFromItem(item))}월</span>
  `;

  let detailMeta = "";

  if (item.type === "todo") {
    detailMeta = `
      <span class="meta-badge">기한: ${formatKoreanDate(item.dueDate)}${item.dueTime ? ` ${item.dueTime}` : ""}</span>
      <span class="meta-badge">남은 기한: ${getTodoRemainText(item)}</span>
      <span class="meta-badge">반복: ${getRepeatText(item.repeat, item.repeatUntil)}</span>
    `;
  } else {
    detailMeta = `
      <span class="meta-badge">기간: ${formatKoreanDate(item.startDate)}${item.startTime ? ` ${item.startTime}` : ""} ~ ${formatKoreanDate(item.endDate)}${item.endTime ? ` ${item.endTime}` : ""}</span>
      <span class="meta-badge">일정 상태: ${getScheduleProgressText(item)}</span>
      <span class="meta-badge">반복: ${getRepeatText(item.repeat, item.repeatUntil)}</span>
    `;
  }

  return `
    <div class="item-card">
      <button
        class="status-btn ${item.status}"
        data-action="toggle-status"
        data-id="${item.id}"
        title="상태 변경"
        type="button"
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
        <button class="edit-btn" data-action="edit-item" data-id="${item.id}" type="button">수정</button>
        <button class="delete-btn" data-action="delete-item" data-id="${item.id}" type="button">삭제</button>
      </div>
    </div>
  `;
}

function renderSelectedCard(item) {
  const timeBlock = item.type === "todo"
    ? `
      <div class="selected-item-time-block">
        <div><strong>기한</strong> : ${formatKoreanDate(item.dueDate)}${item.dueTime ? ` ${item.dueTime}` : ""}</div>
        <div><strong>남은 기한</strong> : ${getTodoRemainText(item)}</div>
        <div><strong>반복</strong> : ${getRepeatText(item.repeat, item.repeatUntil)}</div>
      </div>
    `
    : `
      <div class="selected-item-time-block">
        <div><strong>시작</strong> : ${formatKoreanDate(item.startDate)}${item.startTime ? ` ${item.startTime}` : ""}</div>
        <div><strong>종료</strong> : ${formatKoreanDate(item.endDate)}${item.endTime ? ` ${item.endTime}` : ""}</div>
        <div><strong>반복</strong> : ${getRepeatText(item.repeat, item.repeatUntil)}</div>
      </div>
    `;

  return `
    <div class="selected-item-card">
      <button
        class="status-btn ${item.status}"
        data-action="toggle-status"
        data-id="${item.id}"
        title="상태 변경"
        type="button"
      >
        ${getStatusSymbol(item.status)}
      </button>

      <div class="selected-item-content">
        <div class="selected-item-title">${escapeHtml(item.title)}</div>

        <div class="selected-item-meta">
          <span class="meta-badge">종류: ${item.type === "todo" ? "할일" : "일정"}</span>
          <span class="meta-badge">상태: ${getStatusText(item.status)}</span>
        </div>

        ${timeBlock}
      </div>

      <div class="selected-item-actions">
        <button class="edit-btn" data-action="edit-item" data-id="${item.id}" type="button">수정</button>
        <button class="delete-btn" data-action="delete-item" data-id="${item.id}" type="button">삭제</button>
      </div>
    </div>
  `;
}

function getRepeatText(repeat, repeatUntil) {
  if (!repeat || repeat === "none") return "없음";
  const map = { daily: "매일", weekly: "매주", monthly: "매월" };
  return repeatUntil ? `${map[repeat]} · ${formatKoreanDate(repeatUntil)}까지` : map[repeat];
}

function renderYearOptions() {
  const years = [...new Set(items.map((item) => getYearFromItem(item)))].sort();

  yearFilter.innerHTML = `<option value="">전체</option>`;

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = `${year.slice(2)}년`;
    if (year === selectedFilterYear) option.selected = true;
    yearFilter.appendChild(option);
  });

  if (selectedFilterYear && !years.includes(selectedFilterYear)) {
    selectedFilterYear = "";
    yearFilter.value = "";
  }
}

function renderMonthOptions() {
  const months = getAvailableMonthsForYear(selectedFilterYear);

  monthFilter.innerHTML = `<option value="">전체</option>`;

  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = `${Number(month)}월`;
    if (month === selectedFilterMonth) option.selected = true;
    monthFilter.appendChild(option);
  });

  if (selectedFilterMonth && !months.includes(selectedFilterMonth)) {
    selectedFilterMonth = "";
    monthFilter.value = "";
  }
}

function getAvailableMonthsForYear(year) {
  let source = items;
  if (year) {
    source = items.filter((item) => getYearFromItem(item) === year);
  }
  return [...new Set(source.map((item) => getMonthFromItem(item)))].sort((a, b) => Number(a) - Number(b));
}

function getYearFromItem(item) {
  if (item.type === "todo") return item.dueDate.slice(0, 4);
  return item.startDate.slice(0, 4);
}

function getMonthFromItem(item) {
  if (item.type === "todo") return item.dueDate.slice(5, 7);
  return item.startDate.slice(5, 7);
}

function renderCalendar() {
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

function createCalendarCell(dateObj, isOtherMonth) {
  const dateKey = formatDateKey(dateObj);
  const todayKey = formatDateKey(new Date());
  const isToday = dateKey === todayKey;
  const isSelected = dateKey === selectedDate;

  const dayItems = getItemsForDate(dateKey);
  const visibleItems = dayItems.slice(0, 3);
  const moreCount = dayItems.length - visibleItems.length;

  return `
    <div
      class="calendar-cell ${isOtherMonth ? "other-month" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected-date" : ""}"
      data-action="select-date"
      data-date="${dateKey}"
    >
      <div class="calendar-date">${dateObj.getDate()}</div>
      <div class="calendar-items">
        ${visibleItems.map((item) => `
          <div class="calendar-event ${item.type} ${item.status}" title="${escapeHtml(item.title)}">
            <div class="calendar-event-top">
              <span class="calendar-type-badge ${item.type}">${item.type === "todo" ? "할일" : "일정"}</span>
              <span class="calendar-time">${getCalendarItemTime(item)}</span>
            </div>
            <div class="calendar-title">${escapeHtml(item.title)}</div>
          </div>
        `).join("")}
        ${moreCount > 0 ? `<div class="calendar-more">+ ${moreCount}개 더</div>` : ""}
      </div>
    </div>
  `;
}

function getCalendarItemTime(item) {
  if (item.type === "todo") {
    return item.dueTime || "시간없음";
  }
  return item.startTime || "시간없음";
}

function selectCalendarDate(dateKey) {
  selectedDate = dateKey;
  renderCalendar();
  openDatePopup(dateKey);
}

function openDatePopup(dateKey) {
  const dayItems = getItemsForDate(dateKey);
  selectedDateLabel.textContent = `${formatKoreanDate(dateKey)} 항목`;

  if (dayItems.length === 0) {
    selectedDateItemList.innerHTML = `
      <div class="empty-message">
        ${formatKoreanDate(dateKey)}에는 등록된 항목이 없습니다.
      </div>
    `;
  } else {
    selectedDateItemList.innerHTML = dayItems.map((item) => renderSelectedCard(item)).join("");
  }

  resetPopupQuickAddForm();
  popupScheduleEndDate.value = dateKey;
  calendarPopupOverlay.classList.remove("hidden");
}

function closeDatePopup() {
  selectedDate = "";
  selectedDateItemList.innerHTML = "";
  resetPopupQuickAddForm();
  calendarPopupOverlay.classList.add("hidden");
  renderCalendar();
}

function getItemsForDate(dateKey) {
  return sortItems(items.filter((item) => isItemOnDate(dateKey, item)));
}

function isItemOnDate(dateKey, item) {
  if (item.type === "todo") {
    return item.dueDate === dateKey;
  }

  const target = new Date(`${dateKey}T00:00`);
  const start = new Date(`${item.startDate}T00:00`);
  const end = new Date(`${item.endDate}T00:00`);
  return target >= start && target <= end;
}

function dateDiffDays(a, b) {
  const aa = new Date(a);
  const bb = new Date(b);
  aa.setHours(0, 0, 0, 0);
  bb.setHours(0, 0, 0, 0);
  return Math.floor((bb - aa) / (1000 * 60 * 60 * 24));
}

function addDays(dateObj, days) {
  const d = new Date(dateObj);
  d.setDate(d.getDate() + days);
  return d;
}

function sortItems(itemArray) {
  return [...itemArray].sort((a, b) => getSortDateTime(a) - getSortDateTime(b));
}

function getSortDateTime(item) {
  if (item.type === "todo") {
    return new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  }
  return new Date(makeDateTime(item.startDate, item.startTime || "00:00"));
}

function getTodoDiffMinutes(item) {
  const target = new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  const nowDate = new Date();
  return Math.floor((target - nowDate) / (1000 * 60));
}

function getTodoRemainText(item) {
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
  if (status === "fail") return "미완료";
  if (status === "success") return "완료";
  return "대기";
}

function getTodayString() {
  return formatDateKey(new Date());
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

function formatKoreanDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${year.slice(2)}년 ${Number(month)}월 ${Number(day)}일`;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadItems() {
  const current = localStorage.getItem(STORAGE_KEY);
  const older1 = localStorage.getItem("planner_items_tabs_v7");
  const older2 = localStorage.getItem("planner_items_tabs_v6");
  const older3 = localStorage.getItem("planner_items_tabs_v5");
  const target = current || older1 || older2 || older3;

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
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}