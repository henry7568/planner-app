// repeat.js
import {
  makeId,
  getTodayString,
  formatDateKey,
} from "./utils.js";

export function dateDiffDays(startDateObj, endDateObj) {
  const start = new Date(startDateObj);
  const end = new Date(endDateObj);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function addDays(dateObj, days) {
  const next = new Date(dateObj);
  next.setDate(next.getDate() + days);
  return next;
}

export function moveCursor(dateObj, repeat) {
  const next = new Date(dateObj);

  if (repeat === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (repeat === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (repeat === "monthly") {
    const originalDate = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
    ).getDate();
    next.setDate(Math.min(originalDate, lastDay));
  }

  return next;
}

export function getOccurrenceDateKeys(
  startDateKey,
  repeat,
  repeatUntil,
  weeklyDays = [],
  intervalDays = 1,
) {
  const results = [];
  const start = new Date(`${startDateKey}T00:00`);
  const end =
    repeat === "none"
      ? new Date(`${startDateKey}T00:00`)
      : new Date(`${repeatUntil}T00:00`);

  if (repeat === "none") return [startDateKey];

  if (repeat === "daily") {
    let cursor = new Date(start);
    while (cursor <= end) {
      results.push(formatDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return results;
  }

  if (repeat === "weekly") {
    let cursor = new Date(start);
    while (cursor <= end) {
      results.push(formatDateKey(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return results;
  }

  if (repeat === "weekly_days") {
    let cursor = new Date(start);
    while (cursor <= end) {
      if (weeklyDays.includes(cursor.getDay())) {
        results.push(formatDateKey(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return results;
  }

  if (repeat === "monthly") {
    let cursor = new Date(start);
    while (cursor <= end) {
      results.push(formatDateKey(cursor));
      cursor = moveCursor(cursor, "monthly");
    }
    return results;
  }

  if (repeat === "interval_days") {
    let cursor = new Date(start);
    const step = Math.max(1, Number(intervalDays) || 1);
    while (cursor <= end) {
      results.push(formatDateKey(cursor));
      cursor.setDate(cursor.getDate() + step);
    }
    return results;
  }

  return [startDateKey];
}

export function generateTodoSeries(base) {
  const list = [];
  const groupId = makeId();

  const occurrenceDates = getOccurrenceDateKeys(
    base.dueDate,
    base.repeat,
    base.repeatUntil,
    base.weeklyDays || [],
    base.intervalDays || 1,
  );

  occurrenceDates.forEach((dateKey) => {
    list.push({
      id: makeId(),
      groupId,
      type: "todo",
      title: base.title,
      color: base.color || "blue",
      tag: base.tag || "",
      location: base.location || "",
      locationAddress: base.locationAddress || "",
      locationPlaceId: base.locationPlaceId || "",
      dueDate: dateKey,
      dueTime: base.dueTime || "",
      repeat: base.repeat,
      repeatUntil: base.repeat === "none" ? "" : base.repeatUntil,
      weeklyDays:
        base.repeat === "weekly_days" ? [...(base.weeklyDays || [])] : [],
      intervalDays:
        base.repeat === "interval_days" ? base.intervalDays || 1 : null,
      status: "pending",
      createdAt: getTodayString(),
    });
  });

  return list;
}

export function generateScheduleSeries(base) {
  const list = [];
  const groupId = makeId();
  const baseStart = new Date(`${base.startDate}T00:00`);
  const baseEnd = new Date(`${base.endDate}T00:00`);
  const durationDays = dateDiffDays(baseStart, baseEnd);

  const occurrenceDates = getOccurrenceDateKeys(
    base.startDate,
    base.repeat,
    base.repeatUntil,
    base.weeklyDays || [],
    base.intervalDays || 1,
  );

  occurrenceDates.forEach((startDateKey) => {
    const startDateObj = new Date(`${startDateKey}T00:00`);
    const currentEnd = addDays(startDateObj, durationDays);

    list.push({
      id: makeId(),
      groupId,
      type: "schedule",
      title: base.title,
      color: base.color || "blue",
      tag: base.tag || "",
      location: base.location || "",
      locationAddress: base.locationAddress || "",
      locationPlaceId: base.locationPlaceId || "",
      dailyLocations: Array.isArray(base.dailyLocations)
        ? base.dailyLocations.map((x) => ({ ...x }))
        : [],
      startDate: startDateKey,
      startTime: base.startTime || "",
      endDate: formatDateKey(currentEnd),
      endTime: base.endTime || "",
      repeat: base.repeat,
      repeatUntil: base.repeat === "none" ? "" : base.repeatUntil,
      weeklyDays:
        base.repeat === "weekly_days" ? [...(base.weeklyDays || [])] : [],
      intervalDays:
        base.repeat === "interval_days" ? base.intervalDays || 1 : null,
      status: "pending",
      createdAt: getTodayString(),
    });
  });

  return list;
}

export function getRepeatText(
  repeat,
  repeatUntil,
  weeklyDays = [],
  intervalDays = null,
) {
  if (!repeat || repeat === "none") return "없음";

  if (repeat === "weekly_days") {
    const dayMap = ["일", "월", "화", "수", "목", "금", "토"];
    const dayText =
      Array.isArray(weeklyDays) && weeklyDays.length > 0
        ? weeklyDays.map((day) => dayMap[day]).join(", ")
        : "요일 미선택";
    return repeatUntil
      ? `${dayText} 반복 · ${repeatUntil.slice(2, 4)}년 ${Number(repeatUntil.slice(5, 7))}월 ${Number(repeatUntil.slice(8, 10))}일까지`
      : `${dayText} 반복`;
  }

  if (repeat === "interval_days") {
    const text = `${intervalDays || 1}일마다`;
    return repeatUntil
      ? `${text} · ${repeatUntil.slice(2, 4)}년 ${Number(repeatUntil.slice(5, 7))}월 ${Number(repeatUntil.slice(8, 10))}일까지`
      : text;
  }

  const map = {
    daily: "매일",
    weekly: "매주",
    monthly: "매월",
  };

  return repeatUntil
    ? `${map[repeat]} · ${repeatUntil.slice(2, 4)}년 ${Number(repeatUntil.slice(5, 7))}월 ${Number(repeatUntil.slice(8, 10))}일까지`
    : map[repeat];
}

export function isRecurringItem(item) {
  return !!item && item.repeat && item.repeat !== "none";
}

export function isRecurringMasterItem(item) {
  if (!isRecurringItem(item)) return false;
  if (item.isRepeatMaster === false) return false;
  if (item.isRepeatMaster === true) return true;
  if (item.repeatSourceId || item.parentRepeatId) return false;
  if (item.groupId && !item.repeatGroupId && item.isRepeatMaster !== true) {
    return false;
  }
  return !item.groupId;
}

export function getRecurringItemBaseDate(item) {
  if (!item) return "";

  if (item.type === "todo") {
    return item.dueDate || "";
  }

  if (item.type === "schedule") {
    return item.startDate || "";
  }

  return "";
}

export function getSafeRepeatUntil(item) {
  if (item?.repeatUntil) {
    return item.repeatUntil;
  }

  return "9999-12-31";
}

export function isDateWithinRepeatBounds(dateKey, item) {
  const baseDate = getRecurringItemBaseDate(item);
  if (!baseDate || dateKey < baseDate) return false;

  const repeatUntil = getSafeRepeatUntil(item);
  if (repeatUntil && dateKey > repeatUntil) return false;

  return true;
}

export function matchesRecurringDate(dateKey, item) {
  if (!isRecurringItem(item)) return false;
  if (!isDateWithinRepeatBounds(dateKey, item)) return false;

  const baseDate = getRecurringItemBaseDate(item);
  const targetDate = new Date(`${dateKey}T00:00`);
  const baseDateObj = new Date(`${baseDate}T00:00`);

  const diffDays = Math.floor(
    (targetDate - baseDateObj) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return false;

  if (item.repeat === "daily") {
    return true;
  }

  if (item.repeat === "weekly") {
    return diffDays % 7 === 0;
  }

  if (item.repeat === "weekly_days") {
    const weeklyDays = Array.isArray(item.weeklyDays) ? item.weeklyDays : [];
    return weeklyDays.includes(targetDate.getDay());
  }

  if (item.repeat === "monthly") {
    return baseDateObj.getDate() === targetDate.getDate();
  }

  if (item.repeat === "interval_days") {
    const intervalDays = Math.max(1, Number(item.intervalDays) || 1);
    return diffDays % intervalDays === 0;
  }

  return false;
}

export function buildRecurringTodoOccurrence(item, dateKey) {
  return {
    ...item,
    id: `${item.id}__${dateKey}`,
    sourceId: item.id,
    occurrenceDateKey: dateKey,
    dueDate: dateKey,
    isVirtualOccurrence: true,
  };
}

export function buildRecurringScheduleOccurrence(item, occurrenceStartDateKey) {
  const baseStartDateObj = new Date(`${item.startDate}T00:00`);
  const baseEndDateObj = new Date(`${item.endDate}T00:00`);
  const occurrenceStartDateObj = new Date(`${occurrenceStartDateKey}T00:00`);

  const durationDays = dateDiffDays(baseStartDateObj, baseEndDateObj);
  const occurrenceEndDateObj = addDays(occurrenceStartDateObj, durationDays);

  return {
    ...item,
    id: `${item.id}__${occurrenceStartDateKey}`,
    sourceId: item.id,
    occurrenceDateKey: occurrenceStartDateKey,
    startDate: occurrenceStartDateKey,
    endDate: formatDateKey(occurrenceEndDateObj),
    isVirtualOccurrence: true,
  };
}

export function expandRecurringPlannerItemsInRange(
  sourceItems,
  rangeStartKey,
  rangeEndKey,
) {
  const items = Array.isArray(sourceItems) ? sourceItems : [];
  const expanded = [];

  items.forEach((item) => {
    if (!item) return;

    if (!isRecurringMasterItem(item)) {
      if (isRecurringItem(item) && (item.status || "pending") === "pending") {
        return;
      }
      expanded.push(item);
      return;
    }

    if (
      item.type === "schedule" &&
      item.repeat === "weekly_days" &&
      item.repeatSlotDates &&
      typeof item.repeatSlotDates === "object"
    ) {
      Object.entries(item.repeatSlotDates).forEach(([weekday, slotDate]) => {
        if (!slotDate) return;
        if (slotDate < rangeStartKey || slotDate > rangeEndKey) return;

        const occurrence = buildRecurringScheduleOccurrence(item, slotDate);
        const slotStatus =
          item.repeatSlotStatuses?.[String(weekday)] || "pending";

        expanded.push({
          ...occurrence,
          status: slotStatus,
          slotWeekday: Number(weekday),
        });
      });

      return;
    }

    const activeDateKey = getRecurringItemBaseDate(item);

    if (
      activeDateKey &&
      activeDateKey >= rangeStartKey &&
      activeDateKey <= rangeEndKey &&
      matchesRecurringDate(activeDateKey, item)
    ) {
      if (item.type === "todo") {
        expanded.push(buildRecurringTodoOccurrence(item, activeDateKey));
      } else if (item.type === "schedule") {
        expanded.push(buildRecurringScheduleOccurrence(item, activeDateKey));
      }
    }
  });

  return expanded;
}

export function getOccurrenceDateKeyFromItemId(itemId = "") {
  const text = String(itemId || "");
  const parts = text.split("__");
  return parts.length > 1 ? parts[1] : "";
}

export function getDateKeyBefore(dateKey) {
  const date = new Date(`${dateKey}T00:00`);
  date.setDate(date.getDate() - 1);
  return formatDateKey(date);
}

export function getDateKeyAfter(dateKey) {
  const date = new Date(`${dateKey}T00:00`);
  date.setDate(date.getDate() + 1);
  return formatDateKey(date);
}

export function getPreviousOccurrenceDateKey(baseItem, pivotDateKey) {
  if (!baseItem?.repeat || baseItem.repeat === "none" || !pivotDateKey) {
    return "";
  }

  const startDate = baseItem.type === "schedule"
    ? baseItem.startDate
    : baseItem.dueDate;

  if (!startDate || pivotDateKey <= startDate) {
    return "";
  }

  const cursorEnd = getDateKeyBefore(pivotDateKey);
  const candidates = getOccurrenceDateKeys(
    startDate,
    baseItem.repeat,
    baseItem.repeatUntil || cursorEnd,
    baseItem.weeklyDays || [],
    baseItem.intervalDays || 1,
  ).filter((dateKey) => dateKey < pivotDateKey);

  return candidates.length ? candidates[candidates.length - 1] : "";
}

export function getNextOccurrenceDateKey(baseItem, pivotDateKey) {
  if (!baseItem?.repeat || baseItem.repeat === "none" || !pivotDateKey) {
    return "";
  }

  const startDate = baseItem.type === "schedule"
    ? baseItem.startDate
    : baseItem.dueDate;

  if (!startDate) return "";

  const safeUntil = baseItem.repeatUntil || "9999-12-31";
  const pivot = new Date(`${pivotDateKey}T00:00`);
  let next = new Date(pivot);

  if (baseItem.repeat === "daily") {
    next.setDate(next.getDate() + 1);
    const nextKey = formatDateKey(next);
    return nextKey <= safeUntil ? nextKey : "";
  }

  if (baseItem.repeat === "weekly") {
    next.setDate(next.getDate() + 7);
    const nextKey = formatDateKey(next);
    return nextKey <= safeUntil ? nextKey : "";
  }

  if (baseItem.repeat === "monthly") {
    next = moveCursor(next, "monthly");
    const nextKey = formatDateKey(next);
    return nextKey <= safeUntil ? nextKey : "";
  }

  if (baseItem.repeat === "interval_days") {
    const intervalDays = Math.max(1, Number(baseItem.intervalDays) || 1);
    next.setDate(next.getDate() + intervalDays);
    const nextKey = formatDateKey(next);
    return nextKey <= safeUntil ? nextKey : "";
  }

  if (baseItem.repeat === "weekly_days") {
    const weeklyDays = Array.isArray(baseItem.weeklyDays)
      ? baseItem.weeklyDays.map(Number)
      : [];

    if (weeklyDays.length === 0) return "";

    for (let offset = 1; offset <= 7; offset += 1) {
      next = new Date(pivot);
      next.setDate(next.getDate() + offset);

      if (weeklyDays.includes(next.getDay())) {
        const nextKey = formatDateKey(next);
        return nextKey <= safeUntil ? nextKey : "";
      }
    }

    return "";
  }

  const candidates = getOccurrenceDateKeys(
    startDate,
    baseItem.repeat,
    safeUntil,
    baseItem.weeklyDays || [],
    baseItem.intervalDays || 1,
  ).filter((dateKey) => dateKey > pivotDateKey);

  return candidates.length ? candidates[0] : "";
}

export function getRepeatOccurrenceDateKey(item) {
  return getRecurringItemBaseDate(item);
}

export function getNextRepeatOccurrence(item) {
  if (!isRecurringItem(item)) return null;

  const currentDateKey = getRepeatOccurrenceDateKey(item);
  if (!currentDateKey) return null;

  const nextDateKey = getNextOccurrenceDateKey(item, currentDateKey);
  if (!nextDateKey) return null;

  if (item.type === "todo") {
    return {
      occurrenceDate: nextDateKey,
      dueDate: nextDateKey,
    };
  }

  if (item.type === "schedule") {
    const baseStart = new Date(`${item.startDate}T00:00`);
    const baseEnd = new Date(`${item.endDate}T00:00`);
    const nextStart = new Date(`${nextDateKey}T00:00`);
    const durationDays = dateDiffDays(baseStart, baseEnd);
    const nextEnd = addDays(nextStart, durationDays);

    return {
      occurrenceDate: nextDateKey,
      startDate: nextDateKey,
      endDate: formatDateKey(nextEnd),
    };
  }

  return null;
}

export function createNextRecurringMasterItem(item) {
  const nextOccurrence = getNextRepeatOccurrence(item);
  if (!nextOccurrence) return null;

  const repeatGroupId =
    item.repeatGroupId || item.groupId || `repeat-${item.id || makeId()}`;
  const createdAt = Date.now();
  const nextItem = {
    ...item,
    ...nextOccurrence,
    id: makeId(),
    repeatGroupId,
    repeatSourceId: item.id || "",
    parentRepeatId: item.id || "",
    occurrenceDate: nextOccurrence.occurrenceDate,
    isRepeatMaster: true,
    status: "pending",
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    failedAt: null,
    rewardPaidAt: null,
    rewardLedgerId: "",
    earnedCoins: 0,
  };

  delete nextItem.sourceId;
  delete nextItem.occurrenceDateKey;
  delete nextItem.isVirtualOccurrence;
  delete nextItem.slotWeekday;

  if (nextItem.type === "todo") {
    delete nextItem.startDate;
    delete nextItem.endDate;
    delete nextItem.startTime;
    delete nextItem.endTime;
  }

  return nextItem;
}

export function hasSameRepeatOccurrence(item, nextItem) {
  if (!item || !nextItem) return false;
  if (item.type !== nextItem.type) return false;
  if ((item.repeatGroupId || item.groupId || "") !== nextItem.repeatGroupId) {
    return false;
  }
  if (item.isRepeatMaster !== true) return false;
  if ((item.status || "pending") !== "pending") return false;

  const itemDate =
    item.occurrenceDate || (item.type === "todo" ? item.dueDate : item.startDate);
  const nextDate =
    nextItem.occurrenceDate ||
    (nextItem.type === "todo" ? nextItem.dueDate : nextItem.startDate);

  return itemDate === nextDate;
}

export function cloneScheduleForOccurrence(baseItem, occurrenceDateKey, overrides = {}) {
  const baseStart = new Date(`${baseItem.startDate}T00:00`);
  const baseEnd = new Date(`${baseItem.endDate}T00:00`);
  const occurrenceStart = new Date(`${occurrenceDateKey}T00:00`);
  const durationDays = dateDiffDays(baseStart, baseEnd);
  const occurrenceEnd = addDays(occurrenceStart, durationDays);

  return {
    ...baseItem,
    ...overrides,
    id: makeId(),
    startDate: occurrenceDateKey,
    endDate: formatDateKey(occurrenceEnd),
    repeat: overrides.repeat ?? "none",
    repeatUntil: overrides.repeatUntil ?? "",
    weeklyDays: overrides.weeklyDays ?? [],
    intervalDays: overrides.intervalDays ?? null,
    isRecurring: overrides.isRecurring ?? false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function getNextDateForWeekday(baseDateKey, weekday) {
  const baseDate = new Date(`${baseDateKey}T00:00`);
  const diff = (weekday - baseDate.getDay() + 7) % 7;
  baseDate.setDate(baseDate.getDate() + diff);
  return formatDateKey(baseDate);
}

export function buildWeeklySlotDates(startDateKey, weeklyDays = []) {
  const slotDates = {};

  weeklyDays.forEach((day) => {
    slotDates[String(day)] = getNextDateForWeekday(startDateKey, Number(day));
  });

  return slotDates;
}

export function moveWeeklySlotToNext(slotDateKey) {
  const next = new Date(`${slotDateKey}T00:00`);
  next.setDate(next.getDate() + 7);
  return formatDateKey(next);
}
