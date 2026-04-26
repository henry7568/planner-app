import { escapeHtml, formatDateKey, formatKoreanDate } from "./utils.js";
import { sortItems } from "./calendar.js";
import { renderProjectTaskRow } from "./renderItems.js";

export function getProjectSectionStateKey(projectId, sectionKey) {
  return `${projectId || "unknown"}:${sectionKey || "section"}`;
}

export function clampPage(page, totalPages) {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

export function getPageSlice(list, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = clampPage(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages,
    visibleItems: list.slice(start, start + pageSize),
  };
}

export function renderPlannerPagination({
  page,
  totalPages,
  totalCount,
  action,
}) {
  if (totalPages <= 1) return "";

  return `
    <div class="planner-pagination">
      <button
        class="secondary-btn"
        type="button"
        data-action="${action}"
        data-direction="-1"
        ${page <= 1 ? "disabled" : ""}
      >
        이전
      </button>
      <span class="planner-pagination-text">${page} / ${totalPages} · 총 ${totalCount}개 연결</span>
      <button
        class="secondary-btn"
        type="button"
        data-action="${action}"
        data-direction="1"
        ${page >= totalPages ? "disabled" : ""}
      >
        다음
      </button>
    </div>
  `;
}

export function getProjectInboxItems(inboxItems, projectId) {
  return inboxItems
    .filter((item) => (item.projectId || "") === projectId && !item.convertedAt)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

export function getProjectTodos(items, projectId) {
  return sortItems(
    items.filter((item) => (item.projectId || "") === projectId && item.type === "todo"),
  );
}

export function getProjectSchedules(items, projectId) {
  return sortItems(
    items.filter(
      (item) => (item.projectId || "") === projectId && item.type === "schedule",
    ),
  );
}

export function getProjectResources(project) {
  return Array.isArray(project?.resources) ? project.resources : [];
}

export function renderPlannerInboxListHtml({
  inboxItems,
  projects,
  page,
  pageSize,
}) {
  const sortedInbox = inboxItems
    .slice()
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  const pagedInbox = getPageSlice(sortedInbox, page, pageSize);

  if (!sortedInbox.length) {
    return {
      page: pagedInbox.page,
      html:
        '<div class="empty-message">프로젝트를 추가하면 작업과 Inbox를 묶어서 볼 수 있습니다.</div>',
    };
  }

  const getProjectLabel = (projectId) =>
    projects.find((project) => project.id === projectId)?.name || "프로젝트 없음";

  const html = [
    pagedInbox.visibleItems.map((item) =>
      renderPlannerInboxEntry(item, getProjectLabel),
    ).join(""),
    renderPlannerPagination({
      page: pagedInbox.page,
      totalPages: pagedInbox.totalPages,
      totalCount: sortedInbox.length,
      action: "change-inbox-page",
    }),
  ].join("");

  return {
    page: pagedInbox.page,
    html,
  };
}

function renderPlannerInboxEntry(item, getProjectLabel) {
  const converted = Boolean(item.convertedAt);
  const projectName = item.projectId ? getProjectLabel(item.projectId) : "";
  const createdText = formatKoreanDate(
    formatDateKey(new Date(item.createdAt || Date.now())),
  );

  return `
    <div class="planner-inbox-entry ${converted ? "converted" : ""}">
      <div class="planner-inbox-entry-top">
        <div>
          <strong>${escapeHtml(item.title || "")}</strong>
          ${item.note ? `<p class="planner-inbox-note">${escapeHtml(item.note)}</p>` : ""}
        </div>
        <span class="meta-badge">${converted ? "전환 완료" : "수집됨"}</span>
      </div>
      <div class="item-meta compact-meta">
        ${projectName ? `<span class="tag-badge">${escapeHtml(projectName)}</span>` : ""}
        <span class="meta-badge compact">${createdText}</span>
      </div>
      <div class="planner-inbox-actions">
        ${
          converted
            ? `<span class="meta-badge">완료 ${item.convertedToType === "schedule" ? "일정" : "할일"}</span>`
            : `
              <button class="secondary-btn" type="button" data-action="convert-inbox-item" data-id="${item.id}" data-target-type="todo">할일</button>
              <button class="secondary-btn" type="button" data-action="convert-inbox-item" data-id="${item.id}" data-target-type="schedule">일정</button>
            `
        }
        <button class="secondary-btn" type="button" data-action="edit-inbox-item" data-id="${item.id}">수정</button>
        <button class="secondary-btn" type="button" data-action="delete-inbox-item" data-id="${item.id}">삭제</button>
      </div>
    </div>
  `;
}

export function renderPlannerProjectsListHtml({
  projects,
  inboxItems,
  items,
  page,
  pageSize,
}) {
  if (!projects.length) {
    return {
      page: 1,
      html:
        '<div class="empty-message">프로젝트를 추가하면 작업과 Inbox를 묶어서 볼 수 있습니다.</div>',
    };
  }

  const sortedProjects = projects
    .slice()
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  const pagedProjects = getPageSlice(sortedProjects, page, pageSize);

  const html = [
    pagedProjects.visibleItems
      .map((project) => renderProjectCard(project, inboxItems, items))
      .join(""),
    renderPlannerPagination({
      page: pagedProjects.page,
      totalPages: pagedProjects.totalPages,
      totalCount: sortedProjects.length,
      action: "change-project-page",
    }),
  ].join("");

  return {
    page: pagedProjects.page,
    html,
  };
}

function renderProjectCard(project, inboxItems, items) {
  const projectId = project.id;
  const inboxCount = getProjectInboxItems(inboxItems, projectId).length;
  const todoCount = getProjectTodos(items, projectId).length;
  const scheduleCount = getProjectSchedules(items, projectId).length;
  const resourceCount = getProjectResources(project).length;
  const totalCount = inboxCount + todoCount + scheduleCount + resourceCount;

  return `
    <article
      class="planner-project-entry project-summary-card clickable-item-card"
      style="--project-accent: ${escapeHtml(project.color || "#2563eb")}"
      data-action="open-project-detail"
      data-id="${escapeHtml(projectId)}"
      role="button"
      tabindex="0"
    >
      <div class="planner-project-entry-top">
        <div>
          <strong>${escapeHtml(project.name || "")}</strong>
          ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}
        </div>
        <span class="meta-badge">${totalCount}개</span>
      </div>
      <div class="item-meta compact-meta project-summary-meta">
        <span class="tag-badge">Inbox ${inboxCount}</span>
        <span class="tag-badge">할일 ${todoCount}</span>
        <span class="tag-badge">일정 ${scheduleCount}</span>
        <span class="tag-badge">리소스 ${resourceCount}</span>
      </div>
      <div class="planner-project-actions">
        <button class="secondary-btn" type="button" data-action="open-project-detail" data-id="${escapeHtml(projectId)}">열기</button>
        <button class="secondary-btn" type="button" data-action="edit-project" data-id="${escapeHtml(projectId)}">수정</button>
        <button class="secondary-btn" type="button" data-action="delete-project" data-id="${escapeHtml(projectId)}">삭제</button>
      </div>
    </article>
  `;
}

export function renderProjectDetailHtml({
  project,
  inboxItems,
  items,
  collapsedProjectSections,
  getStatusSymbol,
}) {
  const projectId = project.id;
  const projectInboxItems = getProjectInboxItems(inboxItems, projectId);
  const projectTodos = getProjectTodos(items, projectId);
  const projectSchedules = getProjectSchedules(items, projectId);
  const projectResources = getProjectResources(project);

  return `
    <div class="project-section-actions">
      <button class="secondary-btn" type="button" data-action="project-add-inbox" data-id="${projectId}">Inbox 추가</button>
      <button class="secondary-btn" type="button" data-action="project-add-task" data-id="${projectId}" data-target-type="todo">할일 추가</button>
      <button class="secondary-btn" type="button" data-action="project-add-task" data-id="${projectId}" data-target-type="schedule">일정 추가</button>
      <button class="secondary-btn" type="button" data-action="add-project-resource" data-id="${projectId}">리소스 추가</button>
    </div>
    <div class="project-section-list">
      ${renderProjectSection({
        projectId,
        sectionKey: "inbox",
        title: "Inbox",
        count: projectInboxItems.length,
        bodyHtml: projectInboxItems.length
          ? projectInboxItems.map(renderProjectInboxRow).join("")
          : renderProjectEmptyRow(),
        collapsedProjectSections,
      })}
      ${renderProjectSection({
        projectId,
        sectionKey: "todo",
        title: "할일",
        count: projectTodos.length,
        bodyHtml: projectTodos.length
          ? projectTodos.map((item) => renderProjectTaskRow(item, getStatusSymbol)).join("")
          : renderProjectEmptyRow(),
        collapsedProjectSections,
      })}
      ${renderProjectSection({
        projectId,
        sectionKey: "schedule",
        title: "일정",
        count: projectSchedules.length,
        bodyHtml: projectSchedules.length
          ? projectSchedules.map((item) => renderProjectTaskRow(item, getStatusSymbol)).join("")
          : renderProjectEmptyRow(),
        collapsedProjectSections,
      })}
      ${renderProjectSection({
        projectId,
        sectionKey: "resources",
        title: "리소스/링크",
        count: projectResources.length,
        bodyHtml: projectResources.length
          ? projectResources.map((resource) => renderProjectResourceRow(projectId, resource)).join("")
          : renderProjectEmptyRow(),
        collapsedProjectSections,
      })}
    </div>
  `;
}

function renderProjectSection({
  projectId,
  sectionKey,
  title,
  count,
  bodyHtml,
  collapsedProjectSections,
}) {
  const stateKey = getProjectSectionStateKey(projectId, sectionKey);
  const isCollapsed = Boolean(collapsedProjectSections[stateKey]);

  return `
    <section class="project-section ${isCollapsed ? "collapsed" : "expanded"}" data-project-section="${escapeHtml(sectionKey)}">
      <button
        class="project-section-header"
        type="button"
        data-action="toggle-project-section"
        data-project-id="${escapeHtml(projectId)}"
        data-section-key="${escapeHtml(sectionKey)}"
        aria-expanded="${isCollapsed ? "false" : "true"}"
      >
        <span class="project-section-caret" aria-hidden="true">${isCollapsed ? "+" : "-"}</span>
        <span class="project-section-title">${escapeHtml(title)}</span>
        <span class="project-section-count">${count}</span>
      </button>
      <div class="project-section-body ${isCollapsed ? "hidden" : ""}">
        ${bodyHtml}
      </div>
    </section>
  `;
}

function renderProjectEmptyRow() {
  return '<div class="project-section-empty">아직 항목이 없습니다.</div>';
}

function renderProjectInboxRow(item) {
  const createdText = formatKoreanDate(
    formatDateKey(new Date(item.createdAt || Date.now())),
  );

  return `
    <div class="project-section-row project-inbox-row">
      <div class="project-row-main">
        <strong>${escapeHtml(item.title || "")}</strong>
        ${item.note ? `<span>${escapeHtml(item.note)}</span>` : `<span>${createdText}</span>`}
      </div>
      <div class="project-row-actions">
        <button class="secondary-btn" type="button" data-action="convert-inbox-item" data-id="${item.id}" data-target-type="todo">할일</button>
        <button class="secondary-btn" type="button" data-action="convert-inbox-item" data-id="${item.id}" data-target-type="schedule">일정</button>
        <button class="secondary-btn" type="button" data-action="edit-inbox-item" data-id="${item.id}">수정</button>
      </div>
    </div>
  `;
}

function renderProjectResourceRow(projectId, resource) {
  const resourceId = resource.id || "";
  const label = resource.label || resource.title || resource.url || "리소스";
  const url = resource.url || "";

  return `
    <div class="project-section-row project-resource-row">
      <div class="project-row-main">
        <strong>${escapeHtml(label)}</strong>
        ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>` : ""}
      </div>
      <button class="secondary-btn" type="button" data-action="delete-project-resource" data-id="${escapeHtml(projectId)}" data-resource-id="${escapeHtml(resourceId)}">삭제</button>
    </div>
  `;
}

export function getPlannerProjectAccent(colorKey) {
  const map = {
    blue: "#2563eb",
    teal: "#0f766e",
    green: "#16a34a",
    orange: "#ea580c",
    red: "#dc2626",
    slate: "#475569",
  };

  return map[colorKey] || map.blue;
}

export function getPlannerProjectColorKeyByAccent(accent) {
  const normalizedAccent = String(accent || "").toLowerCase();
  const colorKeys = ["blue", "teal", "green", "orange", "red", "slate"];
  return (
    colorKeys.find(
      (colorKey) =>
        getPlannerProjectAccent(colorKey).toLowerCase() === normalizedAccent,
    ) || "blue"
  );
}
