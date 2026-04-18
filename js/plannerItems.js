// plannerItems.js
import { makeDateTime } from "./utils.js";
import { generateTodoSeries, generateScheduleSeries } from "./repeat.js";

export function saveEditedSingleItem({
  type,
  title,
  color,
  tag,
  editingId,
  items,
  todoDueDate,
  getTimeValue,
  todoRepeat,
  todoRepeatUntil,
  todoWeekdayInputs,
  todoRepeatInterval,
  scheduleStartDate,
  scheduleEndDate,
  scheduleRepeat,
  scheduleRepeatUntil,
  scheduleWeekdayInputs,
  scheduleRepeatInterval,
}) {
  if (type === "todo") {
    const dueDate = todoDueDate?.value;
    const dueTime = getTimeValue("todoDue");
    const repeat = todoRepeat?.value;
    const repeatUntil = todoRepeatUntil?.value;
    const weeklyDays = [...todoWeekdayInputs]
      .filter((input) => input.checked)
      .map((input) => Number(input.value));
    const intervalDays = Math.max(1, Number(todoRepeatInterval?.value) || 1);

    if (!dueDate) {
      alert("기한 날짜를 입력하세요.");
      return items;
    }

    if (repeat !== "none" && !repeatUntil) {
      alert("반복 종료일을 입력하세요.");
      return items;
    }

    if (repeat === "weekly_days" && weeklyDays.length === 0) {
      alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
      return items;
    }

    return items.map((item) =>
      item.id === editingId
        ? {
            ...item,
            type: "todo",
            title,
            color,
            tag,
            dueDate,
            dueTime,
            repeat,
            repeatUntil,
            weeklyDays,
            intervalDays,
          }
        : item,
    );
  }

  const startDate = scheduleStartDate?.value;
  const startTime = getTimeValue("scheduleStart");
  const endDate = scheduleEndDate?.value;
  const endTime = getTimeValue("scheduleEnd");
  const repeat = scheduleRepeat?.value;
  const repeatUntil = scheduleRepeatUntil?.value;
  const weeklyDays = [...scheduleWeekdayInputs]
    .filter((input) => input.checked)
    .map((input) => Number(input.value));
  const intervalDays = Math.max(1, Number(scheduleRepeatInterval?.value) || 1);

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
    return items;
  }

  if (repeat === "weekly_days" && weeklyDays.length === 0) {
    alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
    return items;
  }

  return items.map((item) =>
    item.id === editingId
      ? {
          ...item,
          type: "schedule",
          title,
          color,
          tag,
          startDate,
          startTime,
          endDate,
          endTime,
          repeat,
          repeatUntil,
          weeklyDays,
          intervalDays,
        }
      : item,
  );
}

export function saveTodoSeriesFromForm({
  items,
  title,
  color,
  tag,
  todoDueDate,
  getTimeValue,
  todoRepeat,
  todoRepeatUntil,
  todoWeekdayInputs,
  todoRepeatInterval,
}) {
  const dueDate = todoDueDate?.value;
  const dueTime = getTimeValue("todoDue");
  const repeat = todoRepeat?.value;
  const repeatUntil = todoRepeatUntil?.value;
  const weeklyDays = [...todoWeekdayInputs]
    .filter((input) => input.checked)
    .map((input) => Number(input.value));
  const intervalDays = Math.max(1, Number(todoRepeatInterval?.value) || 1);

  if (!dueDate) {
    alert("기한 날짜를 입력하세요.");
    todoDueDate?.focus();
    return items;
  }

  if (repeat !== "none" && !repeatUntil) {
    alert("반복 종료일을 입력하세요.");
    todoRepeatUntil?.focus();
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
    dueDate,
    dueTime,
    repeat,
    repeatUntil,
    weeklyDays,
    intervalDays,
  });

  return [...items, ...seriesItems];
}

export function saveScheduleSeriesFromForm({
  items,
  title,
  color,
  tag,
  scheduleStartDate,
  getTimeValue,
  scheduleEndDate,
  scheduleRepeat,
  scheduleRepeatUntil,
  scheduleWeekdayInputs,
  scheduleRepeatInterval,
}) {
  const startDate = scheduleStartDate?.value;
  const startTime = getTimeValue("scheduleStart");
  const endDate = scheduleEndDate?.value;
  const endTime = getTimeValue("scheduleEnd");
  const repeat = scheduleRepeat?.value;
  const repeatUntil = scheduleRepeatUntil?.value;
  const weeklyDays = [...scheduleWeekdayInputs]
    .filter((input) => input.checked)
    .map((input) => Number(input.value));
  const intervalDays = Math.max(1, Number(scheduleRepeatInterval?.value) || 1);

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
    scheduleRepeatUntil?.focus();
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

export function addItemFromSelectedDateData({
  items,
  selectedDate,
  popupItemType,
  popupTitleInput,
  popupItemColor,
  popupItemTag,
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

export function getNextStatus(currentStatus) {
  if (currentStatus === "pending") return "fail";
  if (currentStatus === "fail") return "success";
  return "pending";
}

export function getStatusSymbol(status) {
  if (status === "fail") return "-";
  if (status === "success") return "✓";
  return "";
}

export function getStatusText(status) {
  if (status === "fail") return "미완료";
  if (status === "success") return "완료";
  return "대기";
}

export function toggleItemStatus(items, id) {
  return items.map((item) =>
    item.id === id
      ? { ...item, status: getNextStatus(item.status) }
      : item,
  );
}

export function deleteItemById(items, id) {
  return items.filter((item) => item.id !== id);
}