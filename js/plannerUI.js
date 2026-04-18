// plannerUI.js
export let plannerUiApi = {};

let deps = {};

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
      switchTab(button.dataset.tab);
    });
  });
}

export function switchTab(tabName) {
  const {
    bottomTabButtons,
    tabSections,
  } = getRefs();

  deps.setCurrentTab?.(tabName);

  bottomTabButtons?.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
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
  const {
    itemType,
    todoRepeat,
    scheduleRepeat,
  } = getRefs();

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
  const {
    itemType,
    todoFields,
    scheduleFields,
  } = getRefs();

  if (itemType?.value === "todo") {
    todoFields?.classList.remove("hidden");
    scheduleFields?.classList.add("hidden");
  } else {
    todoFields?.classList.add("hidden");
    scheduleFields?.classList.remove("hidden");
  }

  updateTodoRepeatUI();
  updateScheduleRepeatUI();
}

export function updateTodoRepeatUI() {
  const {
    itemType,
    todoRepeat,
    todoWeeklyDaysWrap,
    todoRepeatIntervalWrap,
  } = getRefs();

  const repeatValue = todoRepeat?.value;

  todoWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(itemType?.value === "todo" && repeatValue === "weekly_days"),
  );

  todoRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(itemType?.value === "todo" && repeatValue === "interval_days"),
  );
}

export function updateScheduleRepeatUI() {
  const {
    itemType,
    scheduleRepeat,
    scheduleWeeklyDaysWrap,
    scheduleRepeatIntervalWrap,
  } = getRefs();

  const repeatValue = scheduleRepeat?.value;

  scheduleWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(itemType?.value === "schedule" && repeatValue === "weekly_days"),
  );

  scheduleRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(itemType?.value === "schedule" && repeatValue === "interval_days"),
  );
}

export function updatePopupTodoRepeatUI() {
  const {
    popupItemType,
    popupTodoRepeat,
    popupTodoWeeklyDaysWrap,
    popupTodoRepeatIntervalWrap,
  } = getRefs();

  popupTodoWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(
      popupItemType?.value === "todo" &&
      popupTodoRepeat?.value === "weekly_days"
    ),
  );

  popupTodoRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(
      popupItemType?.value === "todo" &&
      popupTodoRepeat?.value === "interval_days"
    ),
  );
}

export function updatePopupScheduleRepeatUI() {
  const {
    popupItemType,
    popupScheduleRepeat,
    popupScheduleWeeklyDaysWrap,
    popupScheduleRepeatIntervalWrap,
  } = getRefs();

  popupScheduleWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(
      popupItemType?.value === "schedule" &&
      popupScheduleRepeat?.value === "weekly_days"
    ),
  );

  popupScheduleRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(
      popupItemType?.value === "schedule" &&
      popupScheduleRepeat?.value === "interval_days"
    ),
  );
}

export function updatePopupFields() {
  const {
    popupItemType,
    popupTodoFields,
    popupScheduleFields,
  } = getRefs();

  if (popupItemType?.value === "todo") {
    popupTodoFields?.classList.remove("hidden");
    popupScheduleFields?.classList.add("hidden");
  } else {
    popupTodoFields?.classList.add("hidden");
    popupScheduleFields?.classList.remove("hidden");
  }

  updatePopupTodoRepeatUI();
  updatePopupScheduleRepeatUI();
}

export function resetPopupQuickAddForm() {
  const {
    popupItemType,
    popupTitleInput,
    popupItemColor,
    popupItemTag,
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
}

export function openPopupQuickAddForm() {
  const {
    popupQuickAddForm,
    popupTitleInput,
    openPopupQuickAddBtn,
  } = getRefs();

  popupQuickAddForm?.classList.remove("hidden");
  openPopupQuickAddBtn?.classList.add("hidden");
  popupTitleInput?.focus();
}

export function closePopupQuickAddForm() {
  const {
    popupQuickAddForm,
    openPopupQuickAddBtn,
  } = getRefs();

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
}

export function openPlannerFormCard() {
  const {
    plannerFormCard,
    plannerFormLauncher,
  } = getRefs();

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
  const {
    plannerFormCard,
    plannerFormLauncher,
  } = getRefs();

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
  } = getRefs();

  if (!plannerFormCard || !editPopupMount) return;

  setIsEditingInPopup(true);

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

  const item = getItems().find((x) => x.id === id);
  if (!item) return;

  setEditingId(id);

  if (plannerFormTitle) {
    plannerFormTitle.textContent =
      item.type === "todo" ? "할일 수정" : "일정 수정";
  }

  if (saveItemBtn) saveItemBtn.textContent = "수정 저장";

  cancelEditBtn?.classList.remove("hidden");
  closePlannerFormBtn?.classList.add("hidden");
  deleteEditingItemBtn?.classList.remove("hidden");

  if (itemType) itemType.value = item.type;
  if (titleInput) titleInput.value = item.title;
  if (itemColor) itemColor.value = item.color || "blue";
  if (itemTag) itemTag.value = item.tag || "";

  if (item.type === "todo") {
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
    if (scheduleStartDate) scheduleStartDate.value = item.startDate || "";
    applyTimeValue("scheduleStart", item.startTime || "");
    if (scheduleEndDate) scheduleEndDate.value = item.endDate || "";
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
  openEditPopup();
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