let deps = {};
let pickerYear = new Date().getFullYear();

export function configureCalendarPickerModule(options = {}) {
  deps = options;
}

function getPanel() {
  return deps.refs?.calendarDatePickerPanel || null;
}

function getCalendarState() {
  return deps.getCalendarState?.() || {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  };
}

export function openCalendarDatePicker() {
  const panel = getPanel();
  if (!panel) return;

  const { year } = getCalendarState();
  pickerYear = year;
  renderCalendarDatePicker();
  panel.classList.remove("hidden");
}

export function closeCalendarDatePicker() {
  getPanel()?.classList.add("hidden");
}

export function toggleCalendarDatePicker() {
  const panel = getPanel();
  if (!panel) return;

  if (panel.classList.contains("hidden")) {
    openCalendarDatePicker();
  } else {
    closeCalendarDatePicker();
  }
}

function renderCalendarDatePicker() {
  const panel = getPanel();
  if (!panel) return;

  const { year, month } = getCalendarState();
  const monthButtons = Array.from({ length: 12 }, (_, index) => {
    const isSelected = pickerYear === year && index === month;

    return `
      <button
        class="calendar-picker-month-btn ${isSelected ? "selected" : ""}"
        type="button"
        data-picker-action="select-month"
        data-month="${index}"
      >
        ${index + 1}월
      </button>
    `;
  });

  panel.innerHTML = `
    <div class="calendar-picker-header">
      <strong class="calendar-picker-month">${pickerYear}년</strong>
      <div>
        <button class="calendar-picker-arrow" type="button" data-picker-action="prev-year" aria-label="이전 년도">↑</button>
        <button class="calendar-picker-arrow" type="button" data-picker-action="next-year" aria-label="다음 년도">↓</button>
      </div>
    </div>
    <div class="calendar-picker-month-grid">
      ${monthButtons.join("")}
    </div>
    <div class="calendar-picker-footer">
      <button class="calendar-picker-link" type="button" data-picker-action="clear">삭제</button>
      <button class="calendar-picker-link" type="button" data-picker-action="today">오늘</button>
    </div>
  `;
}

function moveCalendarPickerYear(direction) {
  pickerYear += direction;
  renderCalendarDatePicker();
}

function moveCalendarToMonth(year, month) {
  if (!Number.isInteger(year) || !Number.isInteger(month)) return;
  if (month < 0 || month > 11) return;

  deps.setCalendarMonth?.(year, month);
  deps.clearSelectedDate?.();
  closeCalendarDatePicker();
  deps.closeDatePopup?.();
  deps.renderCalendar?.();
}

export function handleCalendarPickerAction(target) {
  const action = target.dataset.pickerAction || "";

  if (action === "prev-year") {
    moveCalendarPickerYear(-1);
    return;
  }

  if (action === "next-year") {
    moveCalendarPickerYear(1);
    return;
  }

  if (action === "select-month") {
    moveCalendarToMonth(pickerYear, Number(target.dataset.month));
    return;
  }

  if (action === "today") {
    const today = new Date();
    moveCalendarToMonth(today.getFullYear(), today.getMonth());
    return;
  }

  if (action === "clear") {
    closeCalendarDatePicker();
    deps.closeDatePopupAndClearProjectContext?.();
    deps.renderCalendar?.();
  }
}
