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