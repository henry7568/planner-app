// aiRecommendations.js
import { escapeHtml, formatDateKey } from "./utils.js";
import { expandRecurringPlannerItemsInRange } from "./repeat.js";

let deps = {};

const WORK_BLOCKS = [
  ["09:00", "10:00"],
  ["10:30", "11:30"],
  ["14:00", "15:00"],
  ["16:00", "17:00"],
  ["19:00", "20:00"],
];

export function configureAiRecommendationModule(config) {
  deps = config;
}

function getRefs() {
  return deps.refs || {};
}

function getItems() {
  return deps.getItems?.() || [];
}

function getProjects() {
  return deps.getProjects?.() || [];
}

function getIgnoredRecommendationIds() {
  return deps.getIgnoredRecommendationIds?.() || [];
}

function setIgnoredRecommendationIds(value) {
  deps.setIgnoredRecommendationIds?.(Array.isArray(value) ? value : []);
}

function queueSavePlannerData() {
  deps.queueSavePlannerData?.();
}

export function renderAiRecommendations() {
  const { aiRecommendationList } = getRefs();
  if (!aiRecommendationList) return;

  const recommendations = getVisibleRecommendations();

  aiRecommendationList.innerHTML = recommendations.length
    ? recommendations.map(renderRecommendationCard).join("")
    : `<div class="empty-message compact-empty">\uC9C0\uAE08 \uC801\uC6A9\uD560 \uCD94\uCC9C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>`;
}

export function getVisibleRecommendations() {
  const ignored = new Set(getIgnoredRecommendationIds());
  return generateAiRecommendations().filter((item) => !ignored.has(item.id));
}

export function ignoreAiRecommendation(id) {
  if (!id) return;
  const ignored = new Set(getIgnoredRecommendationIds());
  ignored.add(id);
  setIgnoredRecommendationIds([...ignored]);
  queueSavePlannerData();
  renderAiRecommendations();
}

export function generateAiRecommendations() {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 6);
  const weekEndKey = formatDateKey(weekEnd);
  const expanded = expandRecurringPlannerItemsInRange(
    getItems(),
    todayKey,
    weekEndKey,
  );
  const recommendations = [];

  getItems()
    .filter((item) => item.type === "todo" && item.status !== "success")
    .forEach((item) => {
      const dueDate = item.dueDate || todayKey;
      const diffDays = getDateDiffDays(todayKey, dueDate);
      const ageDays = Math.max(
        0,
        Math.floor(
          (Date.now() - (Number(item.createdAt) || Date.now())) / 86400000,
        ),
      );
      const project = getProjects().find((x) => x.id === item.projectId);
      const slot = findFreeSlot(expanded, todayKey, weekEndKey);

      if (diffDays >= 0 && diffDays <= 2) {
        recommendations.push(
          buildRecommendation({
            type: "schedule",
            title: `${item.title} \uCC98\uB9AC`,
            reason: `\uB9C8\uAC10\uC774 ${
              diffDays === 0 ? "\uC624\uB298" : `${diffDays}\uC77C \uD6C4`
            }\uC785\uB2C8\uB2E4.`,
            sourceItemId: item.id,
            priority: 95 - diffDays,
            slot,
          }),
        );
      }

      if (item.status === "fail") {
        recommendations.push(
          buildRecommendation({
            type: "schedule",
            title: `${item.title} \uB2E4\uC2DC \uC2DC\uB3C4`,
            reason:
              "\uBBF8\uC644\uB8CC \uC0C1\uD0DC\uB77C \uB2E4\uC2DC \uC2E4\uD589\uD560 \uC2DC\uAC04\uC744 \uC7A1\uB294 \uAC83\uC774 \uC88B\uC2B5\uB2C8\uB2E4.",
            sourceItemId: item.id,
            priority: 82,
            slot,
          }),
        );
      }

      if (item.status === "pending" && ageDays >= 7) {
        recommendations.push(
          buildRecommendation({
            type: "todo",
            title: `${item.title} \uCABC\uAC1C\uAE30`,
            reason: `${ageDays}\uC77C\uC9F8 \uB300\uAE30 \uC911\uC785\uB2C8\uB2E4. \uC791\uC740 \uD560\uC77C\uB85C \uB2E4\uC2DC \uC2DC\uC791\uD574\uBCF4\uC138\uC694.`,
            sourceItemId: item.id,
            priority: 72,
            slot,
          }),
        );
      }

      if (project && item.status === "pending") {
        recommendations.push(
          buildRecommendation({
            type: "schedule",
            title: `${project.name || "\uD504\uB85C\uC81D\uD2B8"} \uC9D1\uC911: ${item.title}`,
            reason:
              "\uD504\uB85C\uC81D\uD2B8\uC5D0 \uC5F0\uACB0\uB41C \uD56D\uBAA9\uC774\uB77C \uC6B0\uC120 \uC2DC\uAC04\uC744 \uD655\uBCF4\uD558\uB294 \uD3B8\uC774 \uC88B\uC2B5\uB2C8\uB2E4.",
            sourceItemId: item.id,
            priority: 68,
            slot,
          }),
        );
      }
    });

  return dedupeRecommendations(recommendations)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);
}

function buildRecommendation({ type, title, reason, sourceItemId, priority, slot }) {
  const suggestedDate = slot?.date || formatDateKey(new Date());

  return {
    id: `rec_${sourceItemId || "new"}_${type}_${suggestedDate}_${String(title || "").slice(0, 24)}`,
    type,
    title,
    reason,
    suggestedDate,
    suggestedStartTime: type === "schedule" ? slot?.startTime || "09:00" : "",
    suggestedEndTime: type === "schedule" ? slot?.endTime || "10:00" : "",
    sourceItemId,
    priority,
    createdAt: Date.now(),
  };
}

function dedupeRecommendations(list) {
  const map = new Map();
  list.forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return [...map.values()];
}

function findFreeSlot(expandedItems, startKey, endKey) {
  const cursor = new Date(`${startKey}T00:00`);
  const endDate = new Date(`${endKey}T00:00`);

  while (cursor <= endDate) {
    const dateKey = formatDateKey(cursor);
    const busy = expandedItems.filter(
      (item) => item.type === "schedule" && item.startDate === dateKey,
    );

    const block = WORK_BLOCKS.find(([startTime, endTime]) =>
      busy.every((item) =>
        !isTimeOverlapping(startTime, endTime, item.startTime, item.endTime),
      ),
    );

    if (block) {
      return {
        date: dateKey,
        startTime: block[0],
        endTime: block[1],
      };
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    date: startKey,
    startTime: "09:00",
    endTime: "10:00",
  };
}

function isTimeOverlapping(startA, endA, startB, endB) {
  if (!startB || !endB) return false;
  return startA < endB && startB < endA;
}

function getDateDiffDays(startKey, endKey) {
  const start = new Date(`${startKey}T00:00`);
  const end = new Date(`${endKey}T00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function renderRecommendationCard(item) {
  return `
    <article class="ai-rec-card">
      <div class="ai-rec-main">
        <span class="planner-section-eyebrow">${item.type === "schedule" ? "Schedule" : "Todo"}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.reason)}</p>
        <div class="item-meta compact-meta">
          <span class="meta-badge compact">${escapeHtml(item.suggestedDate)}</span>
          ${
            item.suggestedStartTime
              ? `<span class="meta-badge compact">${escapeHtml(item.suggestedStartTime)}-${escapeHtml(item.suggestedEndTime)}</span>`
              : ""
          }
          <span class="meta-badge compact">\uC6B0\uC120\uC21C\uC704 ${item.priority}</span>
        </div>
      </div>
      <div class="ai-rec-actions">
        <button class="primary-btn" type="button" data-action="apply-ai-recommendation" data-id="${escapeHtml(item.id)}">\uC801\uC6A9</button>
        <button class="secondary-btn" type="button" data-action="ignore-ai-recommendation" data-id="${escapeHtml(item.id)}">\uBB34\uC2DC</button>
      </div>
    </article>
  `;
}
