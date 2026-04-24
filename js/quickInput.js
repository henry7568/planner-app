// quickInput.js
import { formatDateKey } from "./utils.js";

const WEEKDAY_INDEX = {
  일요일: 0,
  일: 0,
  월요일: 1,
  월: 1,
  화요일: 2,
  화: 2,
  수요일: 3,
  수: 3,
  목요일: 4,
  목: 4,
  금요일: 5,
  금: 5,
  토요일: 6,
  토: 6,
};

const CATEGORY_HINTS = [
  ["업무", ["회의", "미팅", "보고", "업무", "출근", "면접"]],
  ["공부", ["과제", "공부", "강의", "시험", "제출", "복습"]],
  ["개인", ["병원", "운동", "청소", "정리", "예약"]],
  ["여가", ["카페", "약속", "친구", "영화", "여행", "게임"]],
];

const COLOR_BY_TAG = {
  업무: "blue",
  공부: "purple",
  개인: "green",
  여가: "orange",
};

export function parseQuickInput(rawText, baseDate = new Date()) {
  let text = String(rawText || "").trim();
  if (!text) return null;

  const dateResult = parseKoreanDate(text, baseDate);
  if (!dateResult) return null;
  text = dateResult.text;

  const timeResult = parseKoreanTime(text);
  if (timeResult) text = timeResult.text;

  text = text.replace(/\s+/g, " ").trim();
  if (!text) return null;

  const tag = inferTag(text);
  const type = dateResult.isDeadline && !timeResult ? "todo" : "schedule";

  return {
    type,
    title: text,
    dueDate: type === "todo" ? dateResult.date : "",
    dueTime: type === "todo" ? timeResult?.time || "" : "",
    startDate: type === "schedule" ? dateResult.date : "",
    startTime: type === "schedule" ? timeResult?.time || "" : "",
    tag,
    color: COLOR_BY_TAG[tag] || "blue",
  };
}

function parseKoreanDate(text, baseDate) {
  const base = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
  );
  const simple = [
    ["오늘", 0],
    ["내일", 1],
    ["모레", 2],
  ];

  for (const [keyword, offset] of simple) {
    if (text.includes(keyword)) {
      const date = addDays(base, offset);
      return {
        date: formatDateKey(date),
        isDeadline: text.includes("까지"),
        text: text.replace(keyword, "").replace("까지", "").trim(),
      };
    }
  }

  const weekdayPattern =
    "(일요일|월요일|화요일|수요일|목요일|금요일|토요일|일|월|화|수|목|금|토)";
  const weekMatch = text.match(
    new RegExp(`(이번주|다음주)\\s*${weekdayPattern}`),
  );
  if (weekMatch) {
    const weekOffset = weekMatch[1] === "다음주" ? 1 : 0;
    const date = getWeekdayDate(base, WEEKDAY_INDEX[weekMatch[2]], weekOffset);
    return {
      date: formatDateKey(date),
      isDeadline: text.includes("까지"),
      text: text.replace(weekMatch[0], "").replace("까지", "").trim(),
    };
  }

  const deadlineMatch = text.match(new RegExp(`${weekdayPattern}까지`));
  if (deadlineMatch) {
    const date = getNextWeekday(base, WEEKDAY_INDEX[deadlineMatch[1]]);
    return {
      date: formatDateKey(date),
      isDeadline: true,
      text: text.replace(deadlineMatch[0], "").trim(),
    };
  }

  const weekdayMatch = text.match(new RegExp(weekdayPattern));
  if (weekdayMatch) {
    const date = getNextWeekday(base, WEEKDAY_INDEX[weekdayMatch[1]]);
    return {
      date: formatDateKey(date),
      isDeadline: text.includes("까지"),
      text: text.replace(weekdayMatch[0], "").replace("까지", "").trim(),
    };
  }

  return null;
}

function parseKoreanTime(text) {
  const colonMatch = text.match(/(^|\s)([01]?\d|2[0-3]):([0-5]\d)(?=\s|$)/);
  if (colonMatch) {
    return {
      time: `${colonMatch[2].padStart(2, "0")}:${colonMatch[3]}`,
      text: text.replace(colonMatch[0], " ").trim(),
    };
  }

  const hourMatch = text.match(/(^|\s)(오전|오후)?\s*(\d{1,2})시\s*([0-5]?\d)?분?/);
  if (!hourMatch) return null;

  let hour = Number(hourMatch[3]);
  const minute = Number(hourMatch[4] || 0);

  if (hourMatch[2] === "오후" && hour < 12) hour += 12;
  if (hourMatch[2] === "오전" && hour === 12) hour = 0;
  if (!hourMatch[2] && hour >= 1 && hour <= 7) hour += 12;

  return {
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    text: text.replace(hourMatch[0], " ").trim(),
  };
}

function inferTag(title) {
  const hit = CATEGORY_HINTS.find(([, words]) =>
    words.some((word) => title.includes(word)),
  );
  return hit?.[0] || "";
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekdayDate(base, weekday, weekOffset) {
  const startOfWeek = addDays(base, -base.getDay() + weekOffset * 7);
  return addDays(startOfWeek, weekday);
}

function getNextWeekday(base, weekday) {
  const diff = (weekday - base.getDay() + 7) % 7;
  return addDays(base, diff);
}
