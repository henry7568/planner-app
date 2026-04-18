// utils.js

export function makeDateTime(date, time) {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

export function formatDateKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatKoreanDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${year.slice(2)}년 ${Number(month)}월 ${Number(day)}일`;
}

export function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getTodayString() {
  return formatDateKey(new Date());
}

export function formatMoney(value) {
  const safeValue = Number(value) || 0;
  return `${safeValue.toLocaleString("ko-KR")} 원`;
}