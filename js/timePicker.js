// timePicker.js

const timePickerRegistry = {};

function getRefs() {
  return window.AppRefs;
}

export function createTimeOptions() {
  const list = [{ value: "", label: "시간 없음" }];

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      list.push({ value, label: value });
    }
  }

  list.push({ value: "__custom__", label: "직접 입력" });
  return list;
}

export function registerTimePicker(key, config) {
  const requiredRefs = [
    config.trigger,
    config.menu,
    config.search,
    config.optionsWrap,
    config.valueInput,
    config.custom,
  ];

  if (requiredRefs.some((ref) => !ref)) {
    console.warn(`Time picker "${key}" skipped because its DOM is incomplete.`);
    return;
  }

  timePickerRegistry[key] = {
    ...config,
    options: createTimeOptions(),
    filteredOptions: createTimeOptions(),
  };

  config.trigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleTimePickerMenu(key);
  });

  config.search?.addEventListener("input", () => {
    filterTimePickerOptions(key, config.search.value);
  });

  config.custom?.addEventListener("input", () => {
    setTimePickerValue(key, config.custom.value, true);
  });

  renderTimePickerOptions(key);
  updateTimePickerTriggerText(key);
}

export function setupTimePickers() {
  const refs = getRefs();

  registerTimePicker("todoDue", {
    trigger: refs.todoDueTimeTrigger,
    menu: refs.todoDueTimeMenu,
    search: refs.todoDueTimeSearch,
    optionsWrap: refs.todoDueTimeOptions,
    valueInput: refs.todoDueTimeValue,
    custom: refs.todoDueTimeCustom,
  });

  registerTimePicker("scheduleStart", {
    trigger: refs.scheduleStartTimeTrigger,
    menu: refs.scheduleStartTimeMenu,
    search: refs.scheduleStartTimeSearch,
    optionsWrap: refs.scheduleStartTimeOptions,
    valueInput: refs.scheduleStartTimeValue,
    custom: refs.scheduleStartTimeCustom,
  });

  registerTimePicker("scheduleEnd", {
    trigger: refs.scheduleEndTimeTrigger,
    menu: refs.scheduleEndTimeMenu,
    search: refs.scheduleEndTimeSearch,
    optionsWrap: refs.scheduleEndTimeOptions,
    valueInput: refs.scheduleEndTimeValue,
    custom: refs.scheduleEndTimeCustom,
  });

  registerTimePicker("popupTodo", {
    trigger: refs.popupTodoTimeTrigger,
    menu: refs.popupTodoTimeMenu,
    search: refs.popupTodoTimeSearch,
    optionsWrap: refs.popupTodoTimeOptions,
    valueInput: refs.popupTodoTimeValue,
    custom: refs.popupTodoTimeCustom,
  });

  registerTimePicker("popupScheduleStart", {
    trigger: refs.popupScheduleStartTimeTrigger,
    menu: refs.popupScheduleStartTimeMenu,
    search: refs.popupScheduleStartTimeSearch,
    optionsWrap: refs.popupScheduleStartTimeOptions,
    valueInput: refs.popupScheduleStartTimeValue,
    custom: refs.popupScheduleStartTimeCustom,
  });

  registerTimePicker("popupScheduleEnd", {
    trigger: refs.popupScheduleEndTimeTrigger,
    menu: refs.popupScheduleEndTimeMenu,
    search: refs.popupScheduleEndTimeSearch,
    optionsWrap: refs.popupScheduleEndTimeOptions,
    valueInput: refs.popupScheduleEndTimeValue,
    custom: refs.popupScheduleEndTimeCustom,
  });
}

export function toggleTimePickerMenu(key) {
  const picker = timePickerRegistry[key];
  if (!picker?.menu || !picker?.search) return;

  const isOpen = !picker.menu.classList.contains("hidden");
  closeAllTimePickerMenus();

  if (!isOpen) {
    picker.menu.classList.remove("hidden");
    picker.search.value = "";
    filterTimePickerOptions(key, "");
    picker.search.focus();
  }
}

export function closeAllTimePickerMenus() {
  Object.values(timePickerRegistry).forEach((picker) => {
    picker.menu?.classList.add("hidden");
  });
}

export function filterTimePickerOptions(key, keyword) {
  const picker = timePickerRegistry[key];
  if (!picker?.optionsWrap || !picker?.valueInput) return;

  const query = keyword.trim().toLowerCase();

  picker.filteredOptions = picker.options.filter((option) => {
    if (!query) return true;
    return option.label.toLowerCase().includes(query);
  });

  renderTimePickerOptions(key);
}

export function renderTimePickerOptions(key) {
  const picker = timePickerRegistry[key];
  if (!picker?.valueInput || !picker?.custom || !picker?.trigger) return;

  const currentValue = picker.valueInput.value;

  picker.optionsWrap.innerHTML = picker.filteredOptions
    .map((option) => {
      const active = currentValue === option.value ? "active" : "";
      const customClass = option.value === "__custom__" ? "custom" : "";

      return `
        <button
          type="button"
          class="time-picker-option ${active} ${customClass}"
          data-time-picker-option="${key}"
          data-value="${option.value}"
        >
          ${option.label}
        </button>
      `;
    })
    .join("");
}

export function updateTimePickerTriggerText(key) {
  const picker = timePickerRegistry[key];
  if (!picker) return;

  const value = picker.valueInput.value;
  const customValue = picker.custom.value;

  if (value === "__custom__") {
    picker.custom.classList.remove("hidden");
    picker.trigger.textContent = customValue || "직접 입력";
    return;
  }

  picker.custom.classList.add("hidden");

  if (!value) {
    picker.trigger.textContent = "시간 없음";
    return;
  }

  picker.trigger.textContent = value;
}

export function setTimePickerValue(key, value, fromCustom = false) {
  const picker = timePickerRegistry[key];
  if (!picker) return;

  if (fromCustom) {
    picker.valueInput.value = "__custom__";
    updateTimePickerTriggerText(key);
    renderTimePickerOptions(key);
    return;
  }

  picker.valueInput.value = value;

  if (value === "__custom__") {
    picker.custom.classList.remove("hidden");
    picker.custom.focus();
  } else {
    picker.custom.value = "";
  }

  updateTimePickerTriggerText(key);
  renderTimePickerOptions(key);
}

export function getTimeValue(key) {
  const picker = timePickerRegistry[key];
  if (!picker) return "";

  if (picker.valueInput.value === "__custom__") {
    return picker.custom.value || "";
  }

  return picker.valueInput.value || "";
}

export function applyTimeValue(key, value) {
  const picker = timePickerRegistry[key];
  if (!picker) return;

  const hasExactOption = picker.options.some((option) => option.value === value);

  if (!value) {
    picker.valueInput.value = "";
    picker.custom.value = "";
    updateTimePickerTriggerText(key);
    renderTimePickerOptions(key);
    return;
  }

  if (hasExactOption) {
    picker.valueInput.value = value;
    picker.custom.value = "";
  } else {
    picker.valueInput.value = "__custom__";
    picker.custom.value = value;
  }

  updateTimePickerTriggerText(key);
  renderTimePickerOptions(key);
}

export function getTimePickerByKey(key) {
  return timePickerRegistry[key] || null;
}

