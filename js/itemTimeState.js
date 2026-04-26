import { makeDateTime } from "./utils.js";

export function getItemDeadlineDateTime(item) {
  if (!item) return null;

  if (item.type === "todo") {
    if (!item.dueDate) return null;
    return new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  }

  if (item.type === "schedule") {
    const endDate = item.endDate || item.startDate;
    if (!endDate) return null;
    return new Date(makeDateTime(endDate, item.endTime || "23:59"));
  }

  return null;
}

export function isItemPastDeadline(item, now = new Date()) {
  if (!item || item.status === "success" || item.status === "fail") {
    return false;
  }

  const deadline = getItemDeadlineDateTime(item);
  return Boolean(deadline && !Number.isNaN(deadline.getTime()) && now > deadline);
}

export function getItemTimeStateClass(item) {
  return isItemPastDeadline(item) ? "is-past-deadline" : "";
}
