import { formatDateKey, makeDateTime } from "./utils.js";

const PLANNER_NOTIFICATION_ENABLED_KEY = "planner_notifications_enabled_v1";
const PLANNER_NOTIFICATION_SENT_KEY = "planner_notifications_sent_v1";
const PLANNER_NOTIFICATION_CHECK_MS = 30 * 1000;

let deps = {};
let plannerNotificationTimer = null;

export function configurePlannerNotifications(options = {}) {
  deps = options;
}

function getSettingsRefs() {
  return deps.refs || {};
}

function isPlannerNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

function arePlannerNotificationsEnabled() {
  try {
    return localStorage.getItem(PLANNER_NOTIFICATION_ENABLED_KEY) === "true";
  } catch (error) {
    console.error("알림 설정을 불러오지 못했습니다.", error);
    return false;
  }
}

function setPlannerNotificationsEnabled(isEnabled) {
  try {
    localStorage.setItem(
      PLANNER_NOTIFICATION_ENABLED_KEY,
      isEnabled ? "true" : "false",
    );
  } catch (error) {
    console.error("알림 설정을 저장하지 못했습니다.", error);
  }
}

function loadPlannerNotificationSentMap() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(PLANNER_NOTIFICATION_SENT_KEY) || "{}",
    );
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("알림 기록을 불러오지 못했습니다.", error);
    return {};
  }
}

function savePlannerNotificationSentMap(sentMap) {
  try {
    localStorage.setItem(
      PLANNER_NOTIFICATION_SENT_KEY,
      JSON.stringify(sentMap || {}),
    );
  } catch (error) {
    console.error("알림 기록을 저장하지 못했습니다.", error);
  }
}

export function syncPlannerNotificationSettingsUi() {
  const { settingsNotificationsToggle, settingsNotificationStatus } =
    getSettingsRefs();
  if (!settingsNotificationsToggle && !settingsNotificationStatus) return;

  if (!isPlannerNotificationSupported()) {
    if (settingsNotificationsToggle) {
      settingsNotificationsToggle.checked = false;
      settingsNotificationsToggle.disabled = true;
    }
    if (settingsNotificationStatus) {
      settingsNotificationStatus.textContent =
        "이 브라우저에서는 알림을 지원하지 않습니다.";
    }
    return;
  }

  if (Notification.permission === "denied") {
    if (settingsNotificationsToggle) {
      settingsNotificationsToggle.checked = false;
      settingsNotificationsToggle.disabled = true;
    }
    if (settingsNotificationStatus) {
      settingsNotificationStatus.textContent =
        "브라우저 설정에서 알림이 차단되어 있습니다.";
    }
    return;
  }

  const isEnabled =
    arePlannerNotificationsEnabled() && Notification.permission === "granted";

  if (settingsNotificationsToggle) {
    settingsNotificationsToggle.disabled = false;
    settingsNotificationsToggle.checked = isEnabled;
  }

  if (settingsNotificationStatus) {
    settingsNotificationStatus.textContent = isEnabled
      ? "작업별 알림 시간에 맞춰 브라우저 알림을 보냅니다."
      : "알림을 사용하려면 토글을 켜고 권한을 허용해 주세요.";
  }
}

export async function togglePlannerNotifications(shouldEnable) {
  if (!isPlannerNotificationSupported()) {
    alert("이 브라우저에서는 알림을 지원하지 않습니다.");
    syncPlannerNotificationSettingsUi();
    return;
  }

  if (!shouldEnable) {
    setPlannerNotificationsEnabled(false);
    stopPlannerNotificationLoop();
    syncPlannerNotificationSettingsUi();
    return;
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    setPlannerNotificationsEnabled(false);
    syncPlannerNotificationSettingsUi();
    alert("브라우저에서 알림 권한이 허용되지 않았습니다.");
    return;
  }

  setPlannerNotificationsEnabled(true);
  startPlannerNotificationLoop();
  checkPlannerNotifications();
  syncPlannerNotificationSettingsUi();
}

function stopPlannerNotificationLoop() {
  if (!plannerNotificationTimer) return;
  clearInterval(plannerNotificationTimer);
  plannerNotificationTimer = null;
}

export function startPlannerNotificationLoop() {
  syncPlannerNotificationSettingsUi();

  if (
    !isPlannerNotificationSupported() ||
    !arePlannerNotificationsEnabled() ||
    Notification.permission !== "granted"
  ) {
    stopPlannerNotificationLoop();
    return;
  }

  if (!plannerNotificationTimer) {
    plannerNotificationTimer = setInterval(
      checkPlannerNotifications,
      PLANNER_NOTIFICATION_CHECK_MS,
    );
  }

  checkPlannerNotifications();
}

function getDateKeyWithOffset(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return formatDateKey(date);
}

function getPlannerNotificationDateTime(item) {
  if (!item) return null;
  if (item.reminderMinutes == null || Number(item.reminderMinutes) < 0) {
    return null;
  }
  const reminderMinutes = Math.max(0, Number(item.reminderMinutes) || 0);
  let targetDateTime = null;

  if (item.type === "todo") {
    if (!item.dueDate) return null;
    targetDateTime = new Date(makeDateTime(item.dueDate, item.dueTime || "09:00"));
  } else if (item.type === "schedule") {
    if (!item.startDate) return null;
    targetDateTime = new Date(makeDateTime(item.startDate, item.startTime || "09:00"));
  }

  if (!targetDateTime) return null;
  targetDateTime.setMinutes(targetDateTime.getMinutes() - reminderMinutes);
  return targetDateTime;
}

export function parseReminderMinutes(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : -1;
}

function getPlannerNotificationKey(item, targetDateTime) {
  return [
    item.sourceId || item.id,
    item.id,
    item.type,
    targetDateTime.getTime(),
  ].join("|");
}

function collectPlannerNotificationCandidates() {
  const getItemsForDate = deps.getItemsForDate || (() => []);
  const dateKeys = [
    getDateKeyWithOffset(-1),
    getDateKeyWithOffset(0),
    getDateKeyWithOffset(1),
  ];
  const seen = new Set();

  return dateKeys
    .flatMap((dateKey) => getItemsForDate(dateKey))
    .filter((item) => {
      const key = item.id || `${item.type}-${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return item.status !== "success" && item.status !== "fail";
    });
}

function checkPlannerNotifications() {
  if (
    !isPlannerNotificationSupported() ||
    !arePlannerNotificationsEnabled() ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const nowMs = Date.now();
  const sentMap = loadPlannerNotificationSentMap();
  const staleBefore = nowMs - 7 * 24 * 60 * 60 * 1000;
  let changed = false;

  Object.entries(sentMap).forEach(([key, sentAt]) => {
    if (Number(sentAt) < staleBefore) {
      delete sentMap[key];
      changed = true;
    }
  });

  collectPlannerNotificationCandidates().forEach((item) => {
    const targetDateTime = getPlannerNotificationDateTime(item);
    if (!targetDateTime || Number.isNaN(targetDateTime.getTime())) return;

    const targetMs = targetDateTime.getTime();
    const diffMs = nowMs - targetMs;

    if (diffMs < 0 || diffMs > 5 * 60 * 1000) return;

    const notificationKey = getPlannerNotificationKey(item, targetDateTime);
    if (sentMap[notificationKey]) return;

    const typeText = item.type === "schedule" ? "일정" : "할일";
    const timeText = targetDateTime.toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const notification = new Notification(`${typeText} 알림`, {
        body: `${item.title || "제목 없음"}\n${timeText}`,
        tag: notificationKey,
        renotify: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("알림을 표시하지 못했습니다.", error);
      return;
    }

    sentMap[notificationKey] = nowMs;
    changed = true;
  });

  if (changed) {
    savePlannerNotificationSentMap(sentMap);
  }
}
