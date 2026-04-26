// renderItems.js
import { formatKoreanDate, escapeHtml } from "./utils.js";
import { getRepeatText } from "./repeat.js";
import { getItemTimeStateClass } from "./itemTimeState.js";
import {
  FAILURE_PENALTY_RATE,
  assessTaskReward,
  getEarnedCoinsForTarget,
} from "./rewards.js";

function getProjectName(projectId) {
  const projects = window.AppState?.projects;
  if (!projectId || !Array.isArray(projects)) return "";
  return projects.find((project) => project.id === projectId)?.name || "";
}

function getReminderText(item) {
  const minutes = Number(item?.reminderMinutes);
  if (!Number.isFinite(minutes) || minutes < 0) return "";
  if (minutes === 0) return "알림 정시";
  if (minutes < 60) return `알림 ${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes
    ? `알림 ${hours}시간 ${restMinutes}분 전`
    : `알림 ${hours}시간 전`;
}

function renderReminderBadge(item) {
  const reminderText = getReminderText(item);
  return reminderText
    ? `<span class="meta-badge reminder-badge">${escapeHtml(reminderText)}</span>`
    : "";
}

export function renderCoinBadge(item, statusTargetId) {
  const reward = assessTaskReward(
    item,
    String(statusTargetId).split("__")[1] || "",
    window.AppState?.rewardsData,
  );
  const earned = getEarnedCoinsForTarget(
    window.AppState?.rewardsData,
    statusTargetId,
  );

  if (item.status === "success" && earned > 0) {
    return `
      <span class="coin-badge earned" title="완료로 획득한 취미 코인">
        <span class="coin-badge-label">획득</span>
        <strong><span class="coin-icon" aria-hidden="true"></span>+${earned.toLocaleString()}</strong>
      </span>
    `;
  }

  if (item.status === "fail") {
    const penalty = Math.max(1, Math.ceil(reward.coins * FAILURE_PENALTY_RATE));
    return `
      <span class="coin-badge penalty" title="실패 시 차감되는 취미 코인">
        <span class="coin-badge-label">차감</span>
        <strong><span class="coin-icon" aria-hidden="true"></span>-${penalty.toLocaleString()}</strong>
      </span>
    `;
  }

  return `
    <span class="coin-badge" title="AI가 판단한 완료 보상">
      <span class="coin-badge-label">보상</span>
      <strong><span class="coin-icon" aria-hidden="true"></span>${reward.coins.toLocaleString()}</strong>
    </span>
  `;
}

export function renderCard(item, getStatusSymbol) {
  const timeStateClass = getItemTimeStateClass(item);
  const repeatIcon =
    item.repeat && item.repeat !== "none"
      ? `<span class="meta-icon repeat" title="${escapeHtml(
          getRepeatText(
            item.repeat,
            item.repeatUntil,
            item.weeklyDays,
            item.intervalDays,
          ),
        )}">↻</span>`
      : "";

  const locationText =
    Array.isArray(item.dailyLocations) && item.dailyLocations.length > 0
      ? item.dailyLocations.length > 1
        ? `${item.dailyLocations[0].label} 외 ${item.dailyLocations.length - 1}곳`
        : item.dailyLocations[0].label || ""
      : item.location || "";

  const locationBadge = locationText
    ? `<span class="tag-badge">📍 ${escapeHtml(locationText)}</span>`
    : "";

  const projectName = getProjectName(item.projectId);
  const projectBadge = projectName
    ? `<span class="tag-badge">${escapeHtml(projectName)}</span>`
    : "";
  const reminderBadge = renderReminderBadge(item);

  let detailMeta = "";

  if (item.type === "todo") {
    detailMeta = `
      <span class="meta-icon" title="마감 작업">📝</span>
      <span class="meta-badge compact">${formatKoreanDate(item.dueDate)}${item.dueTime ? ` ${item.dueTime}` : ""}</span>
      ${projectBadge}
      ${item.tag ? `<span class="tag-badge">${escapeHtml(item.tag)}</span>` : ""}
      ${locationBadge}
      ${repeatIcon}
      ${reminderBadge}
    `;
  } else {
    const scheduleDateText = `${formatKoreanDate(item.startDate)}${item.startTime ? ` ${item.startTime}` : ""} ~ ${formatKoreanDate(item.endDate)}${item.endTime ? ` ${item.endTime}` : ""}`;

    detailMeta = `
      <span class="meta-icon" title="시간 작업">🗓️</span>
      <span class="meta-badge compact schedule-range-badge">${escapeHtml(scheduleDateText)}</span>
      ${projectBadge}
      ${item.tag ? `<span class="tag-badge">${escapeHtml(item.tag)}</span>` : ""}
      ${locationBadge}
      ${repeatIcon}
      ${reminderBadge}
    `;
  }

  const editTargetId = item.id;
  const statusTargetId = item.id;
  const coinBadge = renderCoinBadge(item, statusTargetId);

  return `
    <div
      class="item-card item-color-${item.color || "blue"} ${timeStateClass} clickable-item-card"
      data-action="open-edit-item"
      data-id="${editTargetId}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <button
        class="status-btn ${item.status}"
        data-action="toggle-status"
        data-id="${statusTargetId}"
        title="상태 변경"
        type="button"
      >
        ${getStatusSymbol(item.status)}
      </button>

      <div class="item-content">
        <div class="item-title">${escapeHtml(item.title)}</div>
        <div class="item-meta compact-meta">
          ${detailMeta}
          ${coinBadge}
        </div>
      </div>
    </div>
  `;
}

export function renderSelectedCard(item, getStatusSymbol) {
  const timeStateClass = getItemTimeStateClass(item);
  const locationText =
    Array.isArray(item.dailyLocations) && item.dailyLocations.length > 0
      ? item.dailyLocations
          .map((x) => `${formatKoreanDate(x.date)} · ${x.label}`)
          .join(" / ")
      : item.location || "";

  const projectName = getProjectName(item.projectId);
  const editTargetId = item.id;
  const statusTargetId = item.id;
  const isSchedule = item.type === "schedule";
  const dateText = isSchedule
    ? `${formatKoreanDate(item.startDate)}${item.startTime ? ` ${item.startTime}` : ""} ~ ${formatKoreanDate(item.endDate)}${item.endTime ? ` ${item.endTime}` : ""}`
    : `${formatKoreanDate(item.dueDate)}${item.dueTime ? ` ${item.dueTime}` : ""}`;
  const typeText = isSchedule ? "일정" : "할일";
  const reminderBadge = renderReminderBadge(item);

  return `
    <div
      class="selected-item-card selected-item-row project-section-row ${timeStateClass} clickable-item-card"
      data-action="open-edit-item"
      data-id="${editTargetId}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <button
        class="status-btn ${item.status}"
        data-action="toggle-status"
        data-id="${statusTargetId}"
        title="상태 변경"
        type="button"
      >
        ${getStatusSymbol(item.status)}
      </button>

      <div class="selected-item-content project-row-main">
        <div class="selected-item-title">${escapeHtml(item.title)}</div>
        <div class="selected-item-meta">
          <span class="timeline-type ${item.type === "todo" ? "todo" : "schedule"}">${typeText}</span>
          <span>${escapeHtml(dateText)}</span>
          ${item.repeat && item.repeat !== "none" ? `<span>↻ ${escapeHtml(getRepeatText(item.repeat, item.repeatUntil, item.weeklyDays, item.intervalDays))}</span>` : ""}
          ${reminderBadge}
          ${projectName ? `<span>${escapeHtml(projectName)}</span>` : ""}
          ${locationText ? `<span>📍 ${escapeHtml(locationText)}</span>` : ""}
          ${item.tag ? `<span class="timeline-tag">${escapeHtml(item.tag)}</span>` : ""}
        </div>
      </div>
    </div>
  `;
}

export function renderProjectTaskRow(item, getStatusSymbol) {
  const timeStateClass = getItemTimeStateClass(item);
  const isSchedule = item.type === "schedule";
  const primaryDate = isSchedule ? item.startDate : item.dueDate;
  const primaryTime = isSchedule ? item.startTime : item.dueTime;
  const secondaryDate = isSchedule ? item.endDate : "";
  const secondaryTime = isSchedule ? item.endTime : "";
  const dateText = isSchedule
    ? `${formatKoreanDate(primaryDate)}${primaryTime ? ` ${primaryTime}` : ""} ~ ${formatKoreanDate(secondaryDate)}${secondaryTime ? ` ${secondaryTime}` : ""}`
    : `${formatKoreanDate(primaryDate)}${primaryTime ? ` ${primaryTime}` : ""}`;
  const statusTargetId = item.id;
  const reminderBadge = renderReminderBadge(item);

  return `
    <div
      class="project-section-row project-task-row ${timeStateClass} clickable-item-card"
      data-action="open-edit-item"
      data-id="${escapeHtml(item.id)}"
      role="button"
      tabindex="0"
      title="클릭해서 수정"
    >
      <button
        class="status-btn ${item.status || "pending"} project-row-status"
        data-action="toggle-status"
        data-id="${escapeHtml(statusTargetId)}"
        title="상태 변경"
        type="button"
      >
        ${getStatusSymbol(item.status)}
      </button>
      <div class="project-row-main">
        <strong>${escapeHtml(item.title || "")}</strong>
        <span>${escapeHtml(dateText)}</span>
        ${reminderBadge}
      </div>
      ${item.tag ? `<span class="tag-badge project-row-tag">${escapeHtml(item.tag)}</span>` : ""}
    </div>
  `;
}
