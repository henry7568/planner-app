// renderItems.js
import { formatKoreanDate, escapeHtml } from "./utils.js";
import { getRepeatText } from "./repeat.js";

export function renderCard(item, getStatusSymbol) {
  const repeatIcon =
    item.repeat && item.repeat !== "none"
      ? `<span class="meta-icon repeat" title="${escapeHtml(
          getRepeatText(item.repeat, item.repeatUntil, item.weeklyDays, item.intervalDays),
        )}">↻</span>`
      : "";

  let detailMeta = "";

  if (item.type === "todo") {
    detailMeta = `
      <span class="meta-icon" title="할일">📝</span>
      <span class="meta-badge compact">${formatKoreanDate(item.dueDate)}${item.dueTime ? ` ${item.dueTime}` : ""}</span>
      ${item.tag ? `<span class="tag-badge">${escapeHtml(item.tag)}</span>` : ""}
      ${repeatIcon}
    `;
  } else {
    detailMeta = `
      <span class="meta-icon" title="일정">🗓️</span>
      <span class="meta-badge compact">${formatKoreanDate(item.startDate)}${item.startTime ? ` ${item.startTime}` : ""}</span>
      <span class="meta-badge compact">~ ${formatKoreanDate(item.endDate)}${item.endTime ? ` ${item.endTime}` : ""}</span>
      ${item.tag ? `<span class="tag-badge">${escapeHtml(item.tag)}</span>` : ""}
      ${repeatIcon}
    `;
  }

  return `
    <div
      class="item-card item-color-${item.color || "blue"} clickable-item-card"
      data-action="open-edit-item"
      data-id="${item.id}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <button
        class="status-btn ${item.status}"
        data-action="toggle-status"
        data-id="${item.id}"
        title="상태 변경"
        type="button"
      >
        ${getStatusSymbol(item.status)}
      </button>

      <div class="item-content">
        <div class="item-title">${escapeHtml(item.title)}</div>
        <div class="item-meta compact-meta">
          ${detailMeta}
        </div>
      </div>
    </div>
  `;
}

export function renderSelectedCard(item, getStatusSymbol) {
  const repeatLine =
    item.repeat && item.repeat !== "none"
      ? `<div><strong>↻ 반복</strong> : ${getRepeatText(item.repeat, item.repeatUntil, item.weeklyDays, item.intervalDays)}</div>`
      : "";

  const timeBlock =
    item.type === "todo"
      ? `
      <div class="selected-item-time-block">
        <div><strong>📝 기한</strong> : ${formatKoreanDate(item.dueDate)}${item.dueTime ? ` ${item.dueTime}` : ""}</div>
        ${repeatLine}
      </div>
    `
      : `
      <div class="selected-item-time-block">
        <div><strong>🗓️ 시작</strong> : ${formatKoreanDate(item.startDate)}${item.startTime ? ` ${item.startTime}` : ""}</div>
        <div><strong>🗓️ 종료</strong> : ${formatKoreanDate(item.endDate)}${item.endTime ? ` ${item.endTime}` : ""}</div>
        ${repeatLine}
      </div>
    `;

  return `
    <div
      class="selected-item-card clickable-item-card"
      data-action="open-edit-item"
      data-id="${item.id}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <button
        class="status-btn ${item.status}"
        data-action="toggle-status"
        data-id="${item.id}"
        title="상태 변경"
        type="button"
      >
        ${getStatusSymbol(item.status)}
      </button>

      <div class="selected-item-content">
        <div class="selected-item-title">${escapeHtml(item.title)}</div>
        ${timeBlock}
      </div>
    </div>
  `;
}