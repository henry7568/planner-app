// plannerUI.js
export let plannerUiApi = {};

let deps = {};

function syncPlaceUi(mode) {
  deps.syncPlaceUi?.(mode);
}

export function configurePlannerUiModule(config) {
  deps = config;
  plannerUiApi = {
    setupTabs,
    switchTab,
    setupPlannerForm,
    updatePlannerFields,
    updateTodoRepeatUI,
    updateScheduleRepeatUI,
    updatePopupTodoRepeatUI,
    updatePopupScheduleRepeatUI,
    updatePopupFields,
    resetPopupQuickAddForm,
    openPopupQuickAddForm,
    closePopupQuickAddForm,
    resetPlannerForm,
    openPlannerFormCard,
    closePlannerFormCard,
    openEditPopup,
    closeEditPopup,
    startEdit,
    deleteEditingItem,
  };
}

function getRefs() {
  return deps.refs || {};
}

function getItems() {
  return deps.getItems?.() || [];
}

function setItems(value) {
  deps.setItems?.(value);
}

function getEditingId() {
  return deps.getEditingId?.();
}

function setEditingId(value) {
  deps.setEditingId?.(value);
}

function getSelectedDate() {
  return deps.getSelectedDate?.() || "";
}

function getIsEditingInPopup() {
  return deps.getIsEditingInPopup?.() || false;
}

function setIsEditingInPopup(value) {
  deps.setIsEditingInPopup?.(value);
}

function applyTimeValue(key, value) {
  deps.applyTimeValue?.(key, value);
}

function queueSavePlannerData() {
  deps.queueSavePlannerData?.();
}

function renderAll() {
  deps.renderAll?.();
}

function renderCalendar() {
  deps.renderCalendar?.();
}

function renderTodayList() {
  deps.renderTodayList?.();
}

function closeDatePopup() {
  deps.closeDatePopup?.();
}

function getItemsForDate(dateKey) {
  return deps.getItemsForDate?.(dateKey) || [];
}

function openDatePopup(dateKey) {
  deps.openDatePopup?.(dateKey);
}

export function setupTabs() {
  const { bottomTabButtons } = getRefs();

  bottomTabButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.dataset.tab || "";
      if (!targetTab) return;
      switchTab(targetTab);
    });
  });
}

export function switchTab(tabName) {
  const { bottomTabButtons, tabSections } = getRefs();

  deps.setCurrentTab?.(tabName);
  deps.resetNestedTabState?.(tabName);

  bottomTabButtons?.forEach((btn) => {
    const btnTab = btn.dataset.tab || "";
    const isActive =
      btnTab === tabName ||
      (tabName === "finance" && btnTab === "finance") ||
      (tabName === "salary" && btnTab === "salary");

    btn.classList.toggle("active", isActive);
  });

  tabSections?.forEach((section) => section.classList.add("hidden"));
  document.getElementById(`tab-${tabName}`)?.classList.remove("hidden");

  if (tabName !== "planner") {
    closeDatePopup();
    closePlannerFormCard();
  }

  renderCalendar();
  renderTodayList();

  if (tabName === "planner") {
    closePlannerFormCard();
  }
}

export function setupPlannerForm() {
  const { itemType, todoRepeat, scheduleRepeat } = getRefs();

  itemType?.addEventListener("change", updatePlannerFields);
  todoRepeat?.addEventListener("change", updateTodoRepeatUI);
  scheduleRepeat?.addEventListener("change", updateScheduleRepeatUI);

  updatePlannerFields();
  updateTodoRepeatUI();
  updateScheduleRepeatUI();
  updatePopupTodoRepeatUI();
  updatePopupScheduleRepeatUI();
}

export function updatePlannerFields() {
  const { itemType, todoFields, scheduleFields } = getRefs();

  if (itemType?.value === "todo") {
    todoFields?.classList.remove("hidden");
    scheduleFields?.classList.add("hidden");
  } else {
    todoFields?.classList.add("hidden");
    scheduleFields?.classList.remove("hidden");
  }

  updateTodoRepeatUI();
  updateScheduleRepeatUI();

  if (itemType?.value === "schedule") {
    deps.syncScheduleLocationMode?.("main");
  }
}

export function updateTodoRepeatUI() {
  const {
    itemType,
    todoRepeat,
    todoRepeatUntil,
    todoWeeklyDaysWrap,
    todoRepeatIntervalWrap,
  } = getRefs();

  const repeatValue = todoRepeat?.value || "none";
  const isTodo = itemType?.value === "todo";
  const showRepeatExtras = isTodo && repeatValue !== "none";

  todoWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(isTodo && repeatValue === "weekly_days"),
  );

  todoRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(isTodo && repeatValue === "interval_days"),
  );

  if (todoRepeatUntil) {
    todoRepeatUntil.disabled = !showRepeatExtras;
  }

  if (!showRepeatExtras && todoRepeatUntil) {
    todoRepeatUntil.value = "";
  }

  deps.syncRepeatUntilToggleState?.("todo");
}

export function updateScheduleRepeatUI() {
  const {
    itemType,
    scheduleRepeat,
    scheduleRepeatUntil,
    scheduleWeeklyDaysWrap,
    scheduleRepeatIntervalWrap,
  } = getRefs();

  const repeatValue = scheduleRepeat?.value || "none";
  const isSchedule = itemType?.value === "schedule";
  const showRepeatExtras = isSchedule && repeatValue !== "none";

  scheduleWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(isSchedule && repeatValue === "weekly_days"),
  );

  scheduleRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(isSchedule && repeatValue === "interval_days"),
  );

  if (scheduleRepeatUntil) {
    scheduleRepeatUntil.disabled = !showRepeatExtras;
  }

  if (!showRepeatExtras && scheduleRepeatUntil) {
    scheduleRepeatUntil.value = "";
  }

  deps.syncRepeatUntilToggleState?.("schedule");
}

export function updatePopupTodoRepeatUI() {
  const {
    popupItemType,
    popupTodoRepeat,
    popupTodoRepeatUntil,
    popupTodoWeeklyDaysWrap,
    popupTodoRepeatIntervalWrap,
  } = getRefs();

  const repeatValue = popupTodoRepeat?.value || "none";
  const isTodo = popupItemType?.value === "todo";
  const showRepeatExtras = isTodo && repeatValue !== "none";

  popupTodoWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(isTodo && repeatValue === "weekly_days"),
  );

  popupTodoRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(isTodo && repeatValue === "interval_days"),
  );

  if (popupTodoRepeatUntil) {
    popupTodoRepeatUntil.disabled = !showRepeatExtras;
  }

  if (!showRepeatExtras && popupTodoRepeatUntil) {
    popupTodoRepeatUntil.value = "";
  }

  deps.syncRepeatUntilToggleState?.("popupTodo");
}

export function updatePopupScheduleRepeatUI() {
  const {
    popupItemType,
    popupScheduleRepeat,
    popupScheduleRepeatUntil,
    popupScheduleWeeklyDaysWrap,
    popupScheduleRepeatIntervalWrap,
  } = getRefs();

  const repeatValue = popupScheduleRepeat?.value || "none";
  const isSchedule = popupItemType?.value === "schedule";
  const showRepeatExtras = isSchedule && repeatValue !== "none";

  popupScheduleWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(isSchedule && repeatValue === "weekly_days"),
  );

  popupScheduleRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(isSchedule && repeatValue === "interval_days"),
  );

  if (popupScheduleRepeatUntil) {
    popupScheduleRepeatUntil.disabled = !showRepeatExtras;
  }

  if (!showRepeatExtras && popupScheduleRepeatUntil) {
    popupScheduleRepeatUntil.value = "";
  }

  deps.syncRepeatUntilToggleState?.("popupSchedule");
}

export function updatePopupFields() {
  const { popupItemType, popupTodoFields, popupScheduleFields } = getRefs();

  if (popupItemType?.value === "todo") {
    popupTodoFields?.classList.remove("hidden");
    popupScheduleFields?.classList.add("hidden");
  } else {
    popupTodoFields?.classList.add("hidden");
    popupScheduleFields?.classList.remove("hidden");
  }

  updatePopupTodoRepeatUI();
  updatePopupScheduleRepeatUI();

  if (popupItemType?.value === "schedule") {
    deps.syncScheduleLocationMode?.("popup");
  }
}

export function resetPopupQuickAddForm() {
  const {
    popupItemType,
    popupTitleInput,
    popupItemColor,
    popupItemTag,
    popupReminderMinutes,
    popupItemLocation,
    popupItemLocationAddress,
    popupItemLocationPlaceId,
    popupTodoDate,
    popupTodoRepeat,
    popupTodoRepeatUntil,
    popupTodoRepeatInterval,
    popupTodoWeekdayInputs,
    popupScheduleStartDate,
    popupScheduleEndDate,
    popupScheduleRepeat,
    popupScheduleRepeatUntil,
    popupScheduleRepeatInterval,
    popupScheduleWeekdayInputs,
    popupQuickAddForm,
    openPopupQuickAddBtn,
  } = getRefs();

  const selectedDate = getSelectedDate() || "";

  if (popupItemType) popupItemType.value = "todo";
  if (popupTitleInput) popupTitleInput.value = "";
  if (popupItemColor) popupItemColor.value = "blue";
  if (popupItemTag) popupItemTag.value = "";
  if (popupReminderMinutes) popupReminderMinutes.value = "-1";
  if (popupItemLocation) popupItemLocation.value = "";
  if (popupItemLocationAddress) popupItemLocationAddress.value = "";
  if (popupItemLocationPlaceId) popupItemLocationPlaceId.value = "";

  if (typeof window.setPopupScheduleDailyLocations === "function") {
    window.setPopupScheduleDailyLocations([]);
  }

  if (popupTodoDate) popupTodoDate.value = selectedDate;
  applyTimeValue("popupTodo", "");
  if (popupTodoRepeat) popupTodoRepeat.value = "none";
  if (popupTodoRepeatUntil) popupTodoRepeatUntil.value = "";
  if (popupTodoRepeatInterval) popupTodoRepeatInterval.value = "2";

  popupTodoWeekdayInputs?.forEach((input) => {
    input.checked = false;
  });

  if (popupScheduleStartDate) popupScheduleStartDate.value = selectedDate;
  if (popupScheduleEndDate) popupScheduleEndDate.value = selectedDate;
  applyTimeValue("popupScheduleStart", "");
  applyTimeValue("popupScheduleEnd", "");

  if (popupScheduleRepeat) popupScheduleRepeat.value = "none";
  if (popupScheduleRepeatUntil) popupScheduleRepeatUntil.value = "";
  if (popupScheduleRepeatInterval) popupScheduleRepeatInterval.value = "2";

  popupScheduleWeekdayInputs?.forEach((input) => {
    input.checked = false;
  });

  popupQuickAddForm?.classList.add("hidden");
  openPopupQuickAddBtn?.classList.remove("hidden");
  updatePopupFields();
  deps.syncRepeatUntilToggleState?.("popupTodo");
  deps.syncRepeatUntilToggleState?.("popupSchedule");
  syncPlaceUi("popup");
  deps.syncScheduleLocationMode?.("popup");
}

export function openPopupQuickAddForm() {
  const { popupQuickAddForm, popupTitleInput, openPopupQuickAddBtn } =
    getRefs();

  popupQuickAddForm?.classList.remove("hidden");
  openPopupQuickAddBtn?.classList.add("hidden");
  popupTitleInput?.focus();
}

export function closePopupQuickAddForm() {
  const { popupQuickAddForm, openPopupQuickAddBtn } = getRefs();

  popupQuickAddForm?.classList.add("hidden");
  openPopupQuickAddBtn?.classList.remove("hidden");
}

export function resetPlannerForm() {
  const {
    plannerFormCard,
    plannerFormTitle,
    saveItemBtn,
    cancelEditBtn,
    closePlannerFormBtn,
    deleteEditingItemBtn,

    itemType,
    titleInput,
    itemColor,
    itemTag,
    itemReminderMinutes,
    itemRewardDifficulty,
    itemProjectId,
    itemLocation,
    itemLocationAddress,
    itemLocationPlaceId,

    todoDueDate,
    todoRepeat,
    todoRepeatUntil,
    todoRepeatInterval,
    todoWeekdayInputs,

    scheduleStartDate,
    scheduleEndDate,
    scheduleRepeat,
    scheduleRepeatUntil,
    scheduleRepeatInterval,
    scheduleWeekdayInputs,
  } = getRefs();

  setEditingId(null);

  plannerFormCard?.classList.remove("selected-date-mode");
  plannerFormTitle?.classList.remove("hidden");

  if (plannerFormTitle) plannerFormTitle.textContent = "항목 추가";
  if (saveItemBtn) saveItemBtn.textContent = "추가하기";

  cancelEditBtn?.classList.add("hidden");
  closePlannerFormBtn?.classList.remove("hidden");
  deleteEditingItemBtn?.classList.add("hidden");

  if (itemType) itemType.value = "todo";
  if (titleInput) titleInput.value = "";
  if (itemColor) itemColor.value = "blue";
  if (itemTag) itemTag.value = "";
  if (itemReminderMinutes) itemReminderMinutes.value = "-1";
  if (itemRewardDifficulty) itemRewardDifficulty.value = "auto";
  if (itemProjectId) itemProjectId.value = "";
  if (itemLocation) itemLocation.value = "";
  if (itemLocationAddress) itemLocationAddress.value = "";
  if (itemLocationPlaceId) itemLocationPlaceId.value = "";

  if (typeof window.setScheduleDailyLocations === "function") {
    window.setScheduleDailyLocations([]);
  }

  if (todoDueDate) todoDueDate.value = "";
  applyTimeValue("todoDue", "");
  if (todoRepeat) todoRepeat.value = "none";
  if (todoRepeatUntil) todoRepeatUntil.value = "";
  if (todoRepeatInterval) todoRepeatInterval.value = "2";

  todoWeekdayInputs?.forEach((input) => {
    input.checked = false;
  });

  if (scheduleStartDate) scheduleStartDate.value = "";
  applyTimeValue("scheduleStart", "");
  if (scheduleEndDate) scheduleEndDate.value = "";
  applyTimeValue("scheduleEnd", "");
  if (scheduleRepeat) scheduleRepeat.value = "none";
  if (scheduleRepeatUntil) scheduleRepeatUntil.value = "";
  if (scheduleRepeatInterval) scheduleRepeatInterval.value = "2";

  scheduleWeekdayInputs?.forEach((input) => {
    input.checked = false;
  });

  updatePlannerFields();
  deps.syncRepeatUntilToggleState?.("todo");
  deps.syncRepeatUntilToggleState?.("schedule");
  syncPlaceUi("main");
  deps.syncScheduleLocationMode?.("main");
}

export function openPlannerFormCard() {
  const { plannerFormCard, plannerFormLauncher } = getRefs();

  if (!plannerFormCard) return;

  setIsEditingInPopup(false);

  plannerFormLauncher?.classList.add("hidden");
  plannerFormCard.classList.remove("hidden");

  requestAnimationFrame(() => {
    plannerFormCard.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

export function closePlannerFormCard() {
  const { plannerFormCard, plannerFormLauncher } = getRefs();

  if (!plannerFormCard) return;

  setIsEditingInPopup(false);

  plannerFormCard.classList.remove("selected-date-mode");
  plannerFormCard.classList.add("hidden");
  plannerFormLauncher?.classList.remove("hidden");
}

export function openEditPopup() {
  const {
    plannerFormCard,
    editPopupMount,
    editPopupOverlay,
    plannerFormLauncher,
    plannerFormPopupTitle,
    plannerFormPopupSubtext,
  } = getRefs();

  if (!plannerFormCard || !editPopupMount) return;

  setIsEditingInPopup(true);

  if (plannerFormPopupTitle) {
    plannerFormPopupTitle.textContent = getEditingId() ? "항목 수정" : "작업 추가";
  }

  if (plannerFormPopupSubtext) {
    plannerFormPopupSubtext.textContent = getEditingId()
      ? "현재 항목을 바로 수정할 수 있습니다."
      : "새 작업을 빠르게 추가합니다.";
  }

  plannerFormLauncher?.classList.add("hidden");
  plannerFormCard.classList.remove("hidden");
  editPopupMount.appendChild(plannerFormCard);

  editPopupOverlay?.classList.remove("hidden");
}

export function closeEditPopup() {
  const {
    plannerFormCard,
    plannerFormHome,
    editPopupOverlay,
    plannerFormLauncher,
  } = getRefs();

  if (!plannerFormCard || !plannerFormHome) return;

  setIsEditingInPopup(false);

  plannerFormHome.appendChild(plannerFormCard);
  plannerFormCard.classList.add("hidden");
  editPopupOverlay?.classList.add("hidden");

  plannerFormLauncher?.classList.remove("hidden");
}

export function startEdit(id) {
  const {
    plannerFormTitle,
    saveItemBtn,
    cancelEditBtn,
    closePlannerFormBtn,
    deleteEditingItemBtn,

    itemType,
    titleInput,
    itemColor,
    itemTag,
    itemReminderMinutes,
    itemRewardDifficulty,
    itemProjectId,
    itemLocation,
    itemLocationAddress,
    itemLocationPlaceId,

    todoDueDate,
    todoRepeat,
    todoRepeatUntil,
    todoRepeatInterval,
    todoWeekdayInputs,

    scheduleStartDate,
    scheduleEndDate,
    scheduleRepeat,
    scheduleRepeatUntil,
    scheduleRepeatInterval,
    scheduleWeekdayInputs,
  } = getRefs();

  const targetId = String(id || "").split("__")[0];
  const item = getItems().find((x) => x.id === targetId);
  if (!item) return;

  setEditingId(targetId);

  if (plannerFormTitle) {
    plannerFormTitle.textContent =
      item.type === "todo" ? "마감 작업 수정" : "시간 작업 수정";
  }

  if (saveItemBtn) saveItemBtn.textContent = "수정 저장";

  cancelEditBtn?.classList.remove("hidden");
  closePlannerFormBtn?.classList.add("hidden");
  deleteEditingItemBtn?.classList.remove("hidden");

  if (itemType) itemType.value = item.type;
  if (titleInput) titleInput.value = item.title || "";
  if (itemColor) itemColor.value = item.color || "blue";
  if (itemTag) itemTag.value = item.tag || "";
  if (itemReminderMinutes) {
    itemReminderMinutes.value =
      item.reminderMinutes == null
        ? "-1"
        : String(Math.max(-1, Number(item.reminderMinutes)));
  }
  if (itemRewardDifficulty) itemRewardDifficulty.value = item.rewardDifficulty || "auto";
  if (itemProjectId) itemProjectId.value = item.projectId || "";
  if (itemLocation) itemLocation.value = item.location || "";
  if (itemLocationAddress) itemLocationAddress.value = item.locationAddress || "";
  if (itemLocationPlaceId) itemLocationPlaceId.value = item.locationPlaceId || "";

  if (item.type === "todo") {
    if (typeof window.setScheduleDailyLocations === "function") {
      window.setScheduleDailyLocations([]);
    }

    if (todoDueDate) todoDueDate.value = item.dueDate || "";
    applyTimeValue("todoDue", item.dueTime || "");
    if (todoRepeat) todoRepeat.value = item.repeat || "none";
    if (todoRepeatUntil) todoRepeatUntil.value = item.repeatUntil || "";
    if (todoRepeatInterval) todoRepeatInterval.value = item.intervalDays || 2;

    todoWeekdayInputs?.forEach((input) => {
      input.checked = Array.isArray(item.weeklyDays)
        ? item.weeklyDays.includes(Number(input.value))
        : false;
    });
  } else {
    if (typeof window.setScheduleDailyLocations === "function") {
      window.setScheduleDailyLocations(
        Array.isArray(item.dailyLocations)
          ? item.dailyLocations.map((x) => ({ ...x }))
          : [],
      );
    }

    if (scheduleStartDate) scheduleStartDate.value = item.startDate || "";
    if (scheduleEndDate) scheduleEndDate.value = item.endDate || "";
    applyTimeValue("scheduleStart", item.startTime || "");
    applyTimeValue("scheduleEnd", item.endTime || "");
    if (scheduleRepeat) scheduleRepeat.value = item.repeat || "none";
    if (scheduleRepeatUntil) scheduleRepeatUntil.value = item.repeatUntil || "";
    if (scheduleRepeatInterval) {
      scheduleRepeatInterval.value = item.intervalDays || 2;
    }

    scheduleWeekdayInputs?.forEach((input) => {
      input.checked = Array.isArray(item.weeklyDays)
        ? item.weeklyDays.includes(Number(input.value))
        : false;
    });
  }

  updatePlannerFields();
  deps.syncRepeatUntilToggleState?.("todo");
  deps.syncRepeatUntilToggleState?.("schedule");
  syncPlaceUi("main");
  deps.syncScheduleLocationMode?.("main");
}

export function deleteEditingItem() {
  const editingId = getEditingId();
  if (!editingId) return;

  const ok = confirm("정말 삭제할까요?");
  if (!ok) return;

  const nextItems = getItems().filter((item) => item.id !== editingId);
  setItems(nextItems);

  queueSavePlannerData();
  resetPlannerForm();
  renderAll();

  if (getIsEditingInPopup()) {
    closeEditPopup();
  } else {
    closePlannerFormCard();
  }

  if (getSelectedDate()) {
    const dayItems = getItemsForDate(getSelectedDate());

    if (dayItems.length === 0) {
      closeDatePopup();
    } else {
      openDatePopup(getSelectedDate());
    }
  }
}

export function addItemFromSelectedDateData({
  items,
  selectedDate,
  popupItemType,
  popupTitleInput,
  popupItemColor,
  popupItemTag,
  popupItemLocation,
  popupItemLocationAddress,
  popupItemLocationPlaceId,
  popupDailyLocations = [],
  popupTodoDate,
  popupTodoRepeat,
  popupTodoRepeatUntil,
  popupTodoWeekdayInputs,
  popupTodoRepeatInterval,
  popupScheduleStartDate,
  popupScheduleEndDate,
  popupScheduleRepeat,
  popupScheduleRepeatUntil,
  popupScheduleWeekdayInputs,
  popupScheduleRepeatInterval,
  getTimeValue,
}) {
  if (!selectedDate) {
    alert("먼저 날짜를 선택하세요.");
    return items;
  }

  const type = popupItemType?.value;
  const title = popupTitleInput?.value.trim();
  const color = popupItemColor?.value || "blue";
  const tag = popupItemTag?.value.trim() || "";
  const location = popupItemLocation?.value || "";
  const locationAddress = popupItemLocationAddress?.value || "";
  const locationPlaceId = popupItemLocationPlaceId?.value || "";

  if (!title) {
    alert("제목을 입력하세요.");
    popupTitleInput?.focus();
    return items;
  }

  if (type === "todo") {
    const dueDate = popupTodoDate?.value || selectedDate;
    const repeat = popupTodoRepeat?.value;
    const repeatUntil = popupTodoRepeatUntil?.value;
    const weeklyDays = [...popupTodoWeekdayInputs]
      .filter((input) => input.checked)
      .map((input) => Number(input.value));
    const intervalDays = Math.max(1, Number(popupTodoRepeatInterval?.value) || 1);
    const dueTime = getTimeValue("popupTodo");

    if (!dueDate) {
      alert("기한 날짜를 입력하세요.");
      popupTodoDate?.focus();
      return items;
    }

    if (repeat !== "none" && !repeatUntil) {
      alert("반복 종료일을 입력하세요.");
      popupTodoRepeatUntil?.focus();
      return items;
    }

    if (
      repeat !== "none" &&
      new Date(`${repeatUntil}T00:00`) < new Date(`${dueDate}T00:00`)
    ) {
      alert("반복 종료일은 기한 날짜보다 뒤여야 합니다.");
      return items;
    }

    if (repeat === "weekly_days" && weeklyDays.length === 0) {
      alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
      return items;
    }

    const seriesItems = generateTodoSeries({
      title,
      color,
      tag,
      location,
      locationAddress,
      locationPlaceId,
      dueDate,
      dueTime,
      repeat,
      repeatUntil,
      weeklyDays,
      intervalDays,
    });

    return [...items, ...seriesItems];
  }

  const startDate = popupScheduleStartDate?.value || selectedDate;
  const endDate = popupScheduleEndDate?.value || startDate;
  const startTime = getTimeValue("popupScheduleStart");
  const endTime = getTimeValue("popupScheduleEnd");
  const repeat = popupScheduleRepeat?.value;
  const repeatUntil = popupScheduleRepeatUntil?.value;
  const weeklyDays = [...popupScheduleWeekdayInputs]
    .filter((input) => input.checked)
    .map((input) => Number(input.value));
  const intervalDays = Math.max(1, Number(popupScheduleRepeatInterval?.value) || 1);

  if (!startDate || !endDate) {
    alert("시작 날짜와 종료 날짜를 입력하세요.");
    return items;
  }

  const startDateTime = new Date(makeDateTime(startDate, startTime || "00:00"));
  const endDateTime = new Date(makeDateTime(endDate, endTime || "23:59"));

  if (startDateTime > endDateTime) {
    alert("종료 시점은 시작 시점보다 뒤여야 합니다.");
    return items;
  }

  if (repeat !== "none" && !repeatUntil) {
    alert("반복 종료일을 입력하세요.");
    popupScheduleRepeatUntil?.focus();
    return items;
  }

  if (
    repeat !== "none" &&
    new Date(`${repeatUntil}T00:00`) < new Date(`${startDate}T00:00`)
  ) {
    alert("반복 종료일은 시작 날짜보다 뒤여야 합니다.");
    return items;
  }

  if (repeat === "weekly_days" && weeklyDays.length === 0) {
    alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
    return items;
  }

  const seriesItems = generateScheduleSeries({
    title,
    color,
    tag,
    location,
    locationAddress,
    locationPlaceId,
    dailyLocations: Array.isArray(popupDailyLocations)
      ? popupDailyLocations.map((x) => ({ ...x }))
      : [],
    startDate,
    startTime,
    endDate,
    endTime,
    repeat,
    repeatUntil,
    weeklyDays,
    intervalDays,
  });

  return [...items, ...seriesItems];
}

