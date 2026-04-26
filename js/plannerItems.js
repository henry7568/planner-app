// plannerItems.js
import { makeDateTime, makeId, formatDateKey } from "./utils.js";

import {
  getPreviousOccurrenceDateKey,
  getNextOccurrenceDateKey,
  cloneScheduleForOccurrence,
  buildWeeklySlotDates, 
  moveWeeklySlotToNext,
  createNextRecurringMasterItem,
  hasSameRepeatOccurrence,
  isRecurringItem,
  isRecurringMasterItem,
} from "./repeat.js";

function parseReminderMinutes(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : -1;
}

function normalizePlannerColor(color) {
  const value = String(color || "").trim();
  const allowed = ["blue", "purple", "green", "orange", "red", "gray"];
  if (allowed.includes(value)) return value;
  if (value === "yellow") return "orange";
  return "blue";
}

export function saveEditedSingleItem({
  type,
  title,
  color,
  tag,
  projectId = "",
  reminderMinutes = 0,
  rewardDifficulty = "auto",
  location,
  locationAddress,
  locationPlaceId,
  dailyLocations = [],
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
  const targetId = String(editingId || "").split("__")[0];

  if (type === "todo") {
    const dueDate = todoDueDate?.value;
    const dueTime = getTimeValue("todoDue");
    const repeat = todoRepeat?.value || "none";
    const repeatUntil = todoRepeatUntil?.value || "";
    const weeklyDays = [...todoWeekdayInputs]
      .filter((input) => input.checked)
      .map((input) => Number(input.value));
    const intervalDays = Math.max(1, Number(todoRepeatInterval?.value) || 1);

    if (!dueDate) {
      alert("기한 날짜를 입력하세요.");
      return items;
    }

    if (repeat === "weekly_days" && weeklyDays.length === 0) {
      alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
      return items;
    }

    if (
      repeat !== "none" &&
      repeatUntil &&
      new Date(`${repeatUntil}T00:00`) < new Date(`${dueDate}T00:00`)
    ) {
      alert("반복 종료일은 기한 날짜보다 같거나 뒤여야 합니다.");
      return items;
    }

    return items.map((item) =>
      item.id === targetId
        ? {
            ...item,
            type: "todo",
            title,
            color,
            tag,
            projectId,
            reminderMinutes,
            rewardDifficulty,
            location,
            locationAddress,
            locationPlaceId,
            dueDate,
            dueTime,
            repeat,
            repeatUntil,
            weeklyDays,
            intervalDays,
            isRecurring: repeat !== "none",
            repeatGroupId:
              repeat !== "none"
                ? item.repeatGroupId || item.groupId || `repeat-${item.id}`
                : "",
            occurrenceDate: dueDate,
            isRepeatMaster: repeat !== "none" ? item.isRepeatMaster !== false : false,
          }
        : item,
    );
  }

  const startDate = scheduleStartDate?.value;
  const startTime = getTimeValue("scheduleStart");
  const endDate = scheduleEndDate?.value;
  const endTime = getTimeValue("scheduleEnd");
  const repeat = scheduleRepeat?.value || "none";
  const repeatUntil = scheduleRepeatUntil?.value || "";
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

  if (repeat === "weekly_days" && weeklyDays.length === 0) {
    alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
    return items;
  }

  if (
    repeat !== "none" &&
    repeatUntil &&
    new Date(`${repeatUntil}T00:00`) < new Date(`${startDate}T00:00`)
  ) {
    alert("반복 종료일은 시작 날짜보다 같거나 뒤여야 합니다.");
    return items;
  }

  return items.map((item) =>
    item.id === targetId
      ? {
          ...item,
          type: "schedule",
          title,
          color,
          tag,
          projectId,
          reminderMinutes,
          rewardDifficulty,
          location,
          locationAddress,
          locationPlaceId,
          dailyLocations: Array.isArray(dailyLocations) ? dailyLocations : [],
          startDate,
          startTime,
          endDate,
          endTime,
          repeat,
          repeatUntil,
          weeklyDays,
          intervalDays,
          isRecurring: repeat !== "none",
          repeatGroupId:
            repeat !== "none"
              ? item.repeatGroupId || item.groupId || `repeat-${item.id}`
              : "",
          occurrenceDate: startDate,
          isRepeatMaster: repeat !== "none" ? item.isRepeatMaster !== false : false,
        }
      : item,
  );
}

export function saveTodoSeriesFromForm({
  items,
  title,
  color,
  tag,
  projectId = "",
  reminderMinutes = 0,
  rewardDifficulty = "auto",
  location,
  locationAddress,
  locationPlaceId,
  todoDueDate,
  getTimeValue,
  todoRepeat,
  todoRepeatUntil,
  todoWeekdayInputs,
  todoRepeatInterval,
}) {
  const dueDate = todoDueDate?.value;
  const dueTime = getTimeValue("todoDue");
  const repeat = todoRepeat?.value || "none";
  const repeatUntil = todoRepeatUntil?.value || "";
  const weeklyDays = [...todoWeekdayInputs]
    .filter((input) => input.checked)
    .map((input) => Number(input.value));
  const intervalDays = Math.max(1, Number(todoRepeatInterval?.value) || 1);

  if (!dueDate) {
    alert("기한 날짜를 입력하세요.");
    todoDueDate?.focus();
    return items;
  }

  if (repeat === "weekly_days" && weeklyDays.length === 0) {
    alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
    return items;
  }

  if (
    repeat !== "none" &&
    repeatUntil &&
    new Date(`${repeatUntil}T00:00`) < new Date(`${dueDate}T00:00`)
  ) {
    alert("반복 종료일은 기한 날짜보다 같거나 뒤여야 합니다.");
    return items;
  }

  const nextItem = {
    id: makeId(),
    type: "todo",
    title,
    color,
    tag,
    projectId,
    reminderMinutes,
    rewardDifficulty,
    location,
    locationAddress,
    locationPlaceId,
    dueDate,
    dueTime,
    repeat,
    repeatUntil,
    weeklyDays: repeat === "weekly_days" ? weeklyDays : [],
    intervalDays: repeat === "interval_days" ? intervalDays : null,
    status: "pending",
    isRecurring: repeat !== "none",
    repeatGroupId: repeat !== "none" ? `repeat-${makeId()}` : "",
    occurrenceDate: dueDate,
    isRepeatMaster: repeat !== "none",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return [...items, nextItem];
}

export function saveScheduleSeriesFromForm({
  items,
  title,
  color,
  tag,
  projectId = "",
  reminderMinutes = 0,
  rewardDifficulty = "auto",
  location,
  locationAddress,
  locationPlaceId,
  dailyLocations = [],
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
  const repeat = scheduleRepeat?.value || "none";
  const repeatUntil = scheduleRepeatUntil?.value || "";
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

  if (repeat === "weekly_days" && weeklyDays.length === 0) {
    alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
    return items;
  }

  if (
    repeat !== "none" &&
    repeatUntil &&
    new Date(`${repeatUntil}T00:00`) < new Date(`${startDate}T00:00`)
  ) {
    alert("반복 종료일은 시작 날짜보다 같거나 뒤여야 합니다.");
    return items;
  }

  const nextItem = {
    id: makeId(),
    type: "schedule",
    title,
    color,
    tag,
    projectId,
    reminderMinutes,
    rewardDifficulty,
    location,
    locationAddress,
    locationPlaceId,
    dailyLocations: Array.isArray(dailyLocations) ? dailyLocations : [],
    startDate,
    startTime,
    endDate,
    endTime,
    repeat,
    repeatUntil,
    weeklyDays: repeat === "weekly_days" ? weeklyDays : [],
    intervalDays: repeat === "interval_days" ? intervalDays : null,
    repeatSlotDates:
      repeat === "weekly_days" ? buildWeeklySlotDates(startDate, weeklyDays) : {},
    repeatSlotStatuses:
      repeat === "weekly_days"
        ? Object.fromEntries(weeklyDays.map((day) => [String(day), "pending"]))
        : {},
    status: "pending",
    isRecurring: repeat !== "none",
    repeatGroupId: repeat !== "none" ? `repeat-${makeId()}` : "",
    occurrenceDate: startDate,
    isRepeatMaster: repeat !== "none",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return [...items, nextItem];
}

export function addItemFromSelectedDateData({
  items,
  selectedDate,
  popupItemType,
  popupTitleInput,
  popupItemColor,
  popupItemTag,
  popupReminderMinutes,
  popupItemProjectId,
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
  const color = normalizePlannerColor(popupItemColor?.value);
  const tag = popupItemTag?.value.trim() || "";
  const reminderMinutes = parseReminderMinutes(popupReminderMinutes?.value);
  const projectId = popupItemProjectId?.value || "";
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
    const repeat = popupTodoRepeat?.value || "none";
    const repeatUntil = popupTodoRepeatUntil?.value || "";
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

    if (repeat === "weekly_days" && weeklyDays.length === 0) {
      alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
      return items;
    }

    if (
      repeat !== "none" &&
      repeatUntil &&
      new Date(`${repeatUntil}T00:00`) < new Date(`${dueDate}T00:00`)
    ) {
      alert("반복 종료일은 기한 날짜보다 같거나 뒤여야 합니다.");
      return items;
    }

    return [
      ...items,
      {
        id: makeId(),
        type: "todo",
        title,
        color,
        tag,
        projectId,
        reminderMinutes,
        location,
        rewardDifficulty: "auto",
        locationAddress,
        locationPlaceId,
        dueDate,
        dueTime,
        repeat,
        repeatUntil,
        weeklyDays: repeat === "weekly_days" ? weeklyDays : [],
        intervalDays: repeat === "interval_days" ? intervalDays : null,
        status: "pending",
        isRecurring: repeat !== "none",
        repeatGroupId: repeat !== "none" ? `repeat-${makeId()}` : "",
        occurrenceDate: dueDate,
        isRepeatMaster: repeat !== "none",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
  }

  const startDate = popupScheduleStartDate?.value || selectedDate;
  const endDate = popupScheduleEndDate?.value || startDate;
  const startTime = getTimeValue("popupScheduleStart");
  const endTime = getTimeValue("popupScheduleEnd");
  const repeat = popupScheduleRepeat?.value || "none";
  const repeatUntil = popupScheduleRepeatUntil?.value || "";
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

  if (repeat === "weekly_days" && weeklyDays.length === 0) {
    alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
    return items;
  }

  if (
    repeat !== "none" &&
    repeatUntil &&
    new Date(`${repeatUntil}T00:00`) < new Date(`${startDate}T00:00`)
  ) {
    alert("반복 종료일은 시작 날짜보다 같거나 뒤여야 합니다.");
    return items;
  }

  return [
    ...items,
    {
      id: makeId(),
      type: "schedule",
      title,
      color,
      tag,
      projectId,
      reminderMinutes,
      location,
      rewardDifficulty: "auto",
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
      weeklyDays: repeat === "weekly_days" ? weeklyDays : [],
      intervalDays: repeat === "interval_days" ? intervalDays : null,
      repeatSlotDates:
        repeat === "weekly_days" ? buildWeeklySlotDates(startDate, weeklyDays) : {},
      repeatSlotStatuses:
        repeat === "weekly_days"
          ? Object.fromEntries(weeklyDays.map((day) => [String(day), "pending"]))
          : {},
      status: "pending",
      isRecurring: repeat !== "none",
      repeatGroupId: repeat !== "none" ? `repeat-${makeId()}` : "",
      occurrenceDate: startDate,
      isRepeatMaster: repeat !== "none",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
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

export function toggleRecurringSingleSlotStatus(items, id) {
  const [targetId, occurrenceDateKey = ""] = String(id || "").split("__");
  const targetDate = occurrenceDateKey;

  return items.map((item) => {
    if (item.id !== targetId) return item;
    if (!item.repeat || item.repeat === "none") return item;
    if (item.type !== "todo" && item.type !== "schedule") return item;
    if (item.repeat === "weekly_days" && item.type === "schedule") return item;
    if (!targetDate) return item;

    const currentDate = item.type === "todo" ? item.dueDate : item.startDate;
    if (currentDate !== targetDate) return item;

    const nextStatus = getNextStatus(item.status || "pending");

    return {
      ...item,
      status: nextStatus,
      updatedAt: Date.now(),
    };
  });
}

export function ensureNextRecurringItemAfterStatusChange(items, targetId) {
  const list = Array.isArray(items) ? items : [];
  const sourceId = String(targetId || "").split("__")[0];
  const changedItem = list.find((item) => item.id === sourceId);

  if (!changedItem) return list;
  if (!isRecurringMasterItem(changedItem)) return list;
  if ((changedItem.status || "pending") === "pending") return list;

  const nextItem = createNextRecurringMasterItem(changedItem);
  if (!nextItem) {
    return list.map((item) =>
      item.id === changedItem.id
        ? {
            ...item,
            isRepeatMaster: false,
            updatedAt: Date.now(),
          }
        : item,
    );
  }

  const hasExistingNext = list.some((item) =>
    hasSameRepeatOccurrence(item, nextItem),
  );

  return [
    ...list.map((item) =>
      item.id === changedItem.id
        ? {
            ...item,
            isRepeatMaster: false,
            updatedAt: Date.now(),
          }
        : item,
    ),
    ...(hasExistingNext ? [] : [nextItem]),
  ];
}

export function restoreRecurringItemAsPendingMaster(items, targetId) {
  const list = Array.isArray(items) ? items : [];
  const sourceId = String(targetId || "").split("__")[0];
  const changedItem = list.find((item) => item.id === sourceId);

  if (!changedItem) return list;
  if (!isRecurringItem(changedItem)) return list;
  if ((changedItem.status || "pending") !== "pending") return list;

  const repeatGroupId =
    changedItem.repeatGroupId || changedItem.groupId || `repeat-${changedItem.id}`;
  const changedDate =
    changedItem.occurrenceDate ||
    (changedItem.type === "todo" ? changedItem.dueDate : changedItem.startDate) ||
    "";

  return list
    .filter((item) => {
      if (item.id === changedItem.id) return true;
      if ((item.repeatGroupId || item.groupId || "") !== repeatGroupId) return true;
      if (item.isRepeatMaster !== true) return true;
      if ((item.status || "pending") !== "pending") return true;

      const itemDate =
        item.occurrenceDate ||
        (item.type === "todo" ? item.dueDate : item.startDate) ||
        "";

      return !changedDate || itemDate <= changedDate;
    })
    .map((item) =>
      item.id === changedItem.id
        ? {
            ...item,
            repeatGroupId,
            isRepeatMaster: true,
            updatedAt: Date.now(),
          }
        : item,
    );
}

export function deleteItemById(items, id) {
  return items.filter((item) => item.id !== id);
}

export function applyRecurringScheduleEditScope({
  items,
  editingId,
  occurrenceDateKey,
  scope,
  editedData,
}) {
  const targetId = String(editingId || "").split("__")[0];
  const targetItem = items.find((item) => item.id === targetId);

  if (!targetItem) return items;
  if (targetItem.type !== "schedule") return items;
  if (!targetItem.repeat || targetItem.repeat === "none") return items;

  const remainingItems = items.filter((item) => item.id !== targetId);

  if (scope === "all") {
    return [
      ...remainingItems,
      {
        ...targetItem,
        ...editedData,
        id: targetId,
        updatedAt: Date.now(),
      },
    ];
  }

  const prevOccurrence = getPreviousOccurrenceDateKey(targetItem, occurrenceDateKey);
  const nextOccurrence = getNextOccurrenceDateKey(targetItem, occurrenceDateKey);

  if (scope === "only_this") {
    const nextList = [...remainingItems];

    if (prevOccurrence) {
      nextList.push({
        ...targetItem,
        id: makeId(),
        repeatUntil: prevOccurrence,
        updatedAt: Date.now(),
      });
    }

    nextList.push(
      cloneScheduleForOccurrence(targetItem, occurrenceDateKey, {
        ...editedData,
        repeat: "none",
        repeatUntil: "",
        weeklyDays: [],
        intervalDays: null,
        isRecurring: false,
      }),
    );

    if (nextOccurrence) {
      nextList.push({
        ...targetItem,
        id: makeId(),
        startDate: nextOccurrence,
        updatedAt: Date.now(),
      });
    }

    return nextList;
  }

  if (scope === "future") {
    const nextList = [...remainingItems];

    if (prevOccurrence) {
      nextList.push({
        ...targetItem,
        id: makeId(),
        repeatUntil: prevOccurrence,
        updatedAt: Date.now(),
      });
    }

    nextList.push({
      ...targetItem,
      ...editedData,
      id: makeId(),
      startDate: occurrenceDateKey,
      updatedAt: Date.now(),
    });

    return nextList;
  }

  if (scope === "past") {
    const nextList = [...remainingItems];

    nextList.push({
      ...targetItem,
      ...editedData,
      id: makeId(),
      repeatUntil: occurrenceDateKey,
      updatedAt: Date.now(),
    });

    if (nextOccurrence) {
      nextList.push({
        ...targetItem,
        id: makeId(),
        startDate: nextOccurrence,
        updatedAt: Date.now(),
      });
    }

    return nextList;
  }

  return items;
}

export function applyRecurringScheduleDeleteScope({
  items,
  editingId,
  occurrenceDateKey,
  scope,
}) {
  const targetId = String(editingId || "").split("__")[0];
  const targetItem = items.find((item) => item.id === targetId);

  if (!targetItem) return items;
  if (targetItem.type !== "schedule") return items;
  if (!targetItem.repeat || targetItem.repeat === "none") return items;

  // weekly_days + 한 사이클 슬롯 방식은 예전 "분할 삭제"가 아니라
  // 슬롯 자체를 직접 갱신해야 달력과 목록이 같이 맞음
  if (
    targetItem.repeat === "weekly_days" &&
    targetItem.repeatSlotDates &&
    typeof targetItem.repeatSlotDates === "object"
  ) {
    const weekday = String(new Date(`${occurrenceDateKey}T00:00`).getDay());
    const currentSlotDate = targetItem.repeatSlotDates?.[weekday];

    if (!currentSlotDate || currentSlotDate !== occurrenceDateKey) {
      return items;
    }

    return items
      .map((item) => {
        if (item.id !== targetId) return item;

        const nextWeeklyDays = Array.isArray(item.weeklyDays)
          ? [...item.weeklyDays]
          : [];

        const nextSlotDates = {
          ...(item.repeatSlotDates || {}),
        };

        const nextSlotStatuses = {
          ...(item.repeatSlotStatuses || {}),
        };

        if (scope === "only_this") {
          nextSlotDates[weekday] = moveWeeklySlotToNext(currentSlotDate);
          nextSlotStatuses[weekday] = "pending";
        } else if (scope === "future" || scope === "past" || scope === "all") {
          delete nextSlotDates[weekday];
          delete nextSlotStatuses[weekday];

          const filteredWeeklyDays = nextWeeklyDays.filter(
            (day) => String(day) !== weekday,
          );

          // 해당 요일 슬롯이 전부 없어지면 일정 자체도 제거
          if (filteredWeeklyDays.length === 0 || scope === "all") {
            return null;
          }

          return {
            ...item,
            weeklyDays: filteredWeeklyDays,
            repeatSlotDates: nextSlotDates,
            repeatSlotStatuses: nextSlotStatuses,
            updatedAt: Date.now(),
          };
        }

        return {
          ...item,
          repeatSlotDates: nextSlotDates,
          repeatSlotStatuses: nextSlotStatuses,
          updatedAt: Date.now(),
        };
      })
      .filter(Boolean);
  }

  const remainingItems = items.filter((item) => item.id !== targetId);

  if (scope === "all") {
    return remainingItems;
  }

  const prevOccurrence = getPreviousOccurrenceDateKey(targetItem, occurrenceDateKey);
  const nextOccurrence = getNextOccurrenceDateKey(targetItem, occurrenceDateKey);

  if (scope === "only_this") {
    const nextList = [...remainingItems];

    if (prevOccurrence) {
      nextList.push({
        ...targetItem,
        id: makeId(),
        repeatUntil: prevOccurrence,
        updatedAt: Date.now(),
      });
    }

    if (nextOccurrence) {
      nextList.push({
        ...targetItem,
        id: makeId(),
        startDate: nextOccurrence,
        updatedAt: Date.now(),
      });
    }

    return nextList;
  }

  if (scope === "future") {
    const nextList = [...remainingItems];

    if (prevOccurrence) {
      nextList.push({
        ...targetItem,
        id: makeId(),
        repeatUntil: prevOccurrence,
        updatedAt: Date.now(),
      });
    }

    return nextList;
  }

  if (scope === "past") {
    const nextList = [...remainingItems];

    if (nextOccurrence) {
      nextList.push({
        ...targetItem,
        id: makeId(),
        startDate: nextOccurrence,
        updatedAt: Date.now(),
      });
    }

    return nextList;
  }

  return items;
}

export function toggleRecurringScheduleSlotStatus(items, id) {
  const [targetId, occurrenceDateKey = ""] = String(id || "").split("__");
  const targetDate = occurrenceDateKey;

  return items.map((item) => {
    if (item.id !== targetId) return item;
    if (item.type !== "schedule") return item;
    if (item.repeat !== "weekly_days") return item;
    if (!targetDate) return item;

    const weekday = String(new Date(`${targetDate}T00:00`).getDay());
    const currentSlotDate = item.repeatSlotDates?.[weekday];

    if (currentSlotDate !== targetDate) {
      return item;
    }

    const currentStatus = item.repeatSlotStatuses?.[weekday] || "pending";
    const nextStatus = getNextStatus(currentStatus);

    const nextSlotStatuses = {
      ...(item.repeatSlotStatuses || {}),
      [weekday]: nextStatus,
    };

    const nextSlotDates = {
      ...(item.repeatSlotDates || {}),
    };

    return {
      ...item,
      status: nextStatus,
      repeatSlotDates: nextSlotDates,
      repeatSlotStatuses: nextSlotStatuses,
      updatedAt: Date.now(),
    };
  });
}
