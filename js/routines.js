// routines.js
import { escapeHtml, formatDateKey, makeId } from "./utils.js";

let deps = {};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const ROUTINE_STATUSES = new Set(["success", "fail", "pending"]);

export function configureRoutineModule(config) {
  deps = config;
}

function getRefs() {
  return deps.refs || {};
}

function getRoutines() {
  return deps.getRoutines?.() || [];
}

function setRoutines(value) {
  deps.setRoutines?.(Array.isArray(value) ? value : []);
}

function queueSavePlannerData() {
  deps.queueSavePlannerData?.();
}

function renderAll() {
  deps.renderAll?.();
}

export function normalizeRoutine(routine) {
  const source = routine && typeof routine === "object" ? routine : {};
  const targetDays = Array.isArray(source.targetDays)
    ? source.targetDays.map(Number).filter((day) => day >= 0 && day <= 6)
    : [0, 1, 2, 3, 4, 5, 6];

  return {
    id: source.id || makeId(),
    title: String(source.title || "").trim(),
    color: source.color || "blue",
    tag: String(source.tag || "").trim(),
    targetDays: [...new Set(targetDays)].sort((a, b) => a - b),
    reminderTime: source.reminderTime || "",
    statusLog:
      source.statusLog && typeof source.statusLog === "object"
        ? Object.fromEntries(
            Object.entries(source.statusLog).filter(([, status]) =>
              ROUTINE_STATUSES.has(status),
            ),
          )
        : {},
    streak: Math.max(0, Number(source.streak) || 0),
    createdAt: Number(source.createdAt) || Date.now(),
    updatedAt: Number(source.updatedAt) || Date.now(),
  };
}

export function normalizeRoutines(routines) {
  return Array.isArray(routines)
    ? routines.map(normalizeRoutine).filter((routine) => routine.title)
    : [];
}

export function getRoutineStatusForDate(routine, dateKey) {
  return routine?.statusLog?.[dateKey] || "pending";
}

export function isRoutineTargetDate(routine, dateKey) {
  if (!dateKey) return false;
  const day = new Date(`${dateKey}T00:00`).getDay();
  return (routine.targetDays || []).includes(day);
}

export function getTodayRoutines(routines = getRoutines()) {
  const todayKey = formatDateKey(new Date());
  return normalizeRoutines(routines).filter((routine) =>
    isRoutineTargetDate(routine, todayKey),
  );
}

export function calculateRoutineStreak(routine, fromDateKey = formatDateKey(new Date())) {
  let cursor = new Date(`${fromDateKey}T00:00`);
  let streak = 0;

  for (let guard = 0; guard < 370; guard += 1) {
    const key = formatDateKey(cursor);

    if (isRoutineTargetDate(routine, key)) {
      const status = getRoutineStatusForDate(routine, key);
      if (status !== "success") break;
      streak += 1;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function upsertRoutineFromForm() {
  const {
    routineIdInput,
    routineTitleInput,
    routineColorSelect,
    routineTagInput,
    routineReminderTimeInput,
    routineDayInputs,
  } = getRefs();

  const title = routineTitleInput?.value.trim() || "";
  if (!title) {
    alert("루틴 제목을 입력하세요.");
    routineTitleInput?.focus();
    return;
  }

  const targetDays = [...(routineDayInputs || [])]
    .filter((input) => input.checked)
    .map((input) => Number(input.value));

  if (targetDays.length === 0) {
    alert("루틴을 실행할 요일을 1개 이상 선택하세요.");
    return;
  }

  const now = Date.now();
  const editingId = routineIdInput?.value || "";
  const routines = normalizeRoutines(getRoutines());

  const payload = normalizeRoutine({
    id: editingId || makeId(),
    title,
    color: routineColorSelect?.value || "blue",
    tag: routineTagInput?.value.trim() || "",
    targetDays,
    reminderTime: routineReminderTimeInput?.value || "",
    statusLog:
      routines.find((routine) => routine.id === editingId)?.statusLog || {},
    createdAt:
      routines.find((routine) => routine.id === editingId)?.createdAt || now,
    updatedAt: now,
  });
  payload.streak = calculateRoutineStreak(payload);

  setRoutines(
    editingId
      ? routines.map((routine) => (routine.id === editingId ? payload : routine))
      : [...routines, payload],
  );

  resetRoutineForm();
  queueSavePlannerData();
  renderAll();
}

export function editRoutine(id) {
  const routine = normalizeRoutines(getRoutines()).find((item) => item.id === id);
  if (!routine) return;

  const {
    routineIdInput,
    routineTitleInput,
    routineColorSelect,
    routineTagInput,
    routineReminderTimeInput,
    routineDayInputs,
    routineSaveBtn,
    routineCancelBtn,
  } = getRefs();

  if (routineIdInput) routineIdInput.value = routine.id;
  if (routineTitleInput) routineTitleInput.value = routine.title;
  if (routineColorSelect) routineColorSelect.value = routine.color;
  if (routineTagInput) routineTagInput.value = routine.tag;
  if (routineReminderTimeInput) routineReminderTimeInput.value = routine.reminderTime;
  routineDayInputs?.forEach((input) => {
    input.checked = routine.targetDays.includes(Number(input.value));
  });
  if (routineSaveBtn) routineSaveBtn.textContent = "루틴 수정";
  routineCancelBtn?.classList.remove("hidden");
  routineTitleInput?.focus();
}

export function resetRoutineForm() {
  const {
    routineIdInput,
    routineTitleInput,
    routineColorSelect,
    routineTagInput,
    routineReminderTimeInput,
    routineDayInputs,
    routineSaveBtn,
    routineCancelBtn,
  } = getRefs();

  if (routineIdInput) routineIdInput.value = "";
  if (routineTitleInput) routineTitleInput.value = "";
  if (routineColorSelect) routineColorSelect.value = "blue";
  if (routineTagInput) routineTagInput.value = "";
  if (routineReminderTimeInput) routineReminderTimeInput.value = "";
  routineDayInputs?.forEach((input) => {
    input.checked = true;
  });
  if (routineSaveBtn) routineSaveBtn.textContent = "루틴 추가";
  routineCancelBtn?.classList.add("hidden");
}

export function deleteRoutine(id) {
  const ok = confirm("이 루틴을 삭제할까요?");
  if (!ok) return;

  setRoutines(normalizeRoutines(getRoutines()).filter((routine) => routine.id !== id));
  queueSavePlannerData();
  renderAll();
}

export function setRoutineStatusForDate(id, dateKey, status) {
  if (!ROUTINE_STATUSES.has(status)) return;

  setRoutines(
    normalizeRoutines(getRoutines()).map((routine) => {
      if (routine.id !== id) return routine;

      const nextRoutine = {
        ...routine,
        statusLog: {
          ...(routine.statusLog || {}),
          [dateKey]: status,
        },
        updatedAt: Date.now(),
      };

      nextRoutine.streak =
        status === "fail" ? 0 : calculateRoutineStreak(nextRoutine, dateKey);

      return nextRoutine;
    }),
  );

  queueSavePlannerData();
  renderAll();
}

export function renderRoutinePanel() {
  const { routineTodayList, routineManageList } = getRefs();
  const routines = normalizeRoutines(getRoutines());
  const todayKey = formatDateKey(new Date());
  const todayRoutines = routines.filter((routine) =>
    isRoutineTargetDate(routine, todayKey),
  );

  if (routineTodayList) {
    routineTodayList.innerHTML = todayRoutines.length
      ? todayRoutines.map((routine) => renderTodayRoutine(routine, todayKey)).join("")
      : `<div class="empty-message compact-empty">오늘 실행할 루틴이 없습니다.</div>`;
  }

  if (routineManageList) {
    routineManageList.innerHTML = routines.length
      ? routines.map(renderRoutineManageItem).join("")
      : `<div class="empty-message compact-empty">아직 등록된 루틴이 없습니다.</div>`;
  }
}

function renderTodayRoutine(routine, dateKey) {
  const status = getRoutineStatusForDate(routine, dateKey);
  const dayText = (routine.targetDays || [])
    .map((day) => WEEKDAY_LABELS[day])
    .join(" ");

  return `
    <article class="routine-card color-${escapeHtml(routine.color)}" data-status="${status}">
      <div class="routine-card-main">
        <strong>${escapeHtml(routine.title)}</strong>
        <span>${escapeHtml(routine.tag || dayText || "루틴")}</span>
      </div>
      <div class="routine-card-meta">
        ${routine.reminderTime ? `<time>${escapeHtml(routine.reminderTime)}</time>` : ""}
        <span>${routine.streak}일 streak</span>
      </div>
      <div class="routine-status-actions">
        <button class="secondary-btn" type="button" data-action="routine-status" data-id="${routine.id}" data-date="${dateKey}" data-status="success">완료</button>
        <button class="secondary-btn" type="button" data-action="routine-status" data-id="${routine.id}" data-date="${dateKey}" data-status="fail">실패</button>
        <button class="secondary-btn" type="button" data-action="routine-status" data-id="${routine.id}" data-date="${dateKey}" data-status="pending">대기</button>
      </div>
    </article>
  `;
}

function renderRoutineManageItem(routine) {
  const dayText = (routine.targetDays || [])
    .map((day) => WEEKDAY_LABELS[day])
    .join(" ");

  return `
    <article class="routine-manage-item">
      <div>
        <strong>${escapeHtml(routine.title)}</strong>
        <span>${escapeHtml([routine.tag, dayText, routine.reminderTime].filter(Boolean).join(" · "))}</span>
      </div>
      <div class="routine-manage-actions">
        <button class="secondary-btn" type="button" data-action="edit-routine" data-id="${routine.id}">수정</button>
        <button class="secondary-btn" type="button" data-action="delete-routine" data-id="${routine.id}">삭제</button>
      </div>
    </article>
  `;
}
