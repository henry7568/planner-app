import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAcb3bXXjiqHpH7Ye5Gi7pd2iGdlMVdK4o",
  authDomain: "life-panner.firebaseapp.com",
  projectId: "life-panner",
  storageBucket: "life-panner.firebasestorage.app",
  messagingSenderId: "1034276885809",
  appId: "1:1034276885809:web:a58faf9dad849b76e4cc10",
  measurementId: "G-WM6VX5H744",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const STORAGE_KEY = "planner_items_tabs_local_backup_v1";

let currentUser = null;
let isRegisterMode = false;
let items = [];
let selectedFilterType = "";
let selectedFilterYear = "";
let selectedFilterMonth = "";
let currentTab = "dashboard";
let editingId = null;
let selectedDate = "";
let isAppInitialized = false;
let isRemoteLoading = false;
let saveTimer = null;
let timelineNowTimer = null;
let isEditingInPopup = false;

const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

let dashboardPage = 1;
const DASHBOARD_PAGE_SIZE = 10;

const authLoadingScreen = document.getElementById("authLoadingScreen");
const authSection = document.getElementById("authScreen");
const appSection = document.getElementById("appRoot");

const showLoginTabBtn = document.getElementById("showLoginTabBtn");
const showSignupTabBtn = document.getElementById("showSignupTabBtn");

const loginFormWrap = document.getElementById("loginFormWrap");
const signupFormWrap = document.getElementById("signupFormWrap");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupPasswordConfirm = document.getElementById("signupPasswordConfirm");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

const logoutBtn = document.getElementById("logoutBtn");
const currentUserEmail = document.getElementById("userEmailText");

const authMessage = document.getElementById("authMessage");

const bottomTabButtons = document.querySelectorAll(".bottom-tab-btn");
const tabSections = document.querySelectorAll(".tab-section");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const failCount = document.getElementById("failCount");
const successCount = document.getElementById("successCount");

const dashboardTodoCount = document.getElementById("dashboardTodoCount");
const dashboardScheduleCount = document.getElementById(
  "dashboardScheduleCount",
);
const dashboardTodayCount = document.getElementById("dashboardTodayCount");
const dashboardUrgentTodoCount = document.getElementById(
  "dashboardUrgentTodoCount",
);

const achievementRate = document.getElementById("achievementRate");
const achievementBarFill = document.getElementById("achievementBarFill");
const achievementDesc = document.getElementById("achievementDesc");

const itemType = document.getElementById("itemType");
const titleInput = document.getElementById("titleInput");
const itemColor = document.getElementById("itemColor");
const itemTag = document.getElementById("itemTag");
const plannerFormLauncher = document.getElementById("plannerFormLauncher");
const openPlannerFormBtn = document.getElementById("openPlannerFormBtn");
const plannerFormHome = document.getElementById("plannerFormHome");
const plannerFormCard = document.getElementById("plannerFormCard");
const plannerFormTitle = document.getElementById("plannerFormTitle");
const saveItemBtn = document.getElementById("saveItemBtn");
const closePlannerFormBtn = document.getElementById("closePlannerFormBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const editPopupOverlay = document.getElementById("editPopupOverlay");
const editPopupMount = document.getElementById("editPopupMount");
const closeEditPopupBtn = document.getElementById("closeEditPopupBtn");

const todoFields = document.getElementById("todoFields");
const scheduleFields = document.getElementById("scheduleFields");

const todoDueDate = document.getElementById("todoDueDate");
const todoDueTimeTrigger = document.getElementById("todoDueTimeTrigger");
const todoDueTimeMenu = document.getElementById("todoDueTimeMenu");
const todoDueTimeSearch = document.getElementById("todoDueTimeSearch");
const todoDueTimeOptions = document.getElementById("todoDueTimeOptions");
const todoDueTimeValue = document.getElementById("todoDueTimeValue");
const todoDueTimeCustom = document.getElementById("todoDueTimeCustom");
const todoRepeat = document.getElementById("todoRepeat");
const todoRepeatUntil = document.getElementById("todoRepeatUntil");
const todoWeeklyDaysWrap = document.getElementById("todoWeeklyDaysWrap");
const todoWeekdayInputs = document.querySelectorAll(".todo-weekday");
const todoRepeatIntervalWrap = document.getElementById(
  "todoRepeatIntervalWrap",
);
const todoRepeatInterval = document.getElementById("todoRepeatInterval");

const scheduleStartDate = document.getElementById("scheduleStartDate");
const scheduleStartTimeTrigger = document.getElementById(
  "scheduleStartTimeTrigger",
);
const scheduleStartTimeMenu = document.getElementById("scheduleStartTimeMenu");
const scheduleStartTimeSearch = document.getElementById(
  "scheduleStartTimeSearch",
);
const scheduleStartTimeOptions = document.getElementById(
  "scheduleStartTimeOptions",
);
const scheduleStartTimeValue = document.getElementById(
  "scheduleStartTimeValue",
);
const scheduleStartTimeCustom = document.getElementById(
  "scheduleStartTimeCustom",
);

const scheduleEndDate = document.getElementById("scheduleEndDate");
const scheduleEndTimeTrigger = document.getElementById(
  "scheduleEndTimeTrigger",
);
const scheduleEndTimeMenu = document.getElementById("scheduleEndTimeMenu");
const scheduleEndTimeSearch = document.getElementById("scheduleEndTimeSearch");
const scheduleEndTimeOptions = document.getElementById(
  "scheduleEndTimeOptions",
);
const scheduleEndTimeValue = document.getElementById("scheduleEndTimeValue");
const scheduleEndTimeCustom = document.getElementById("scheduleEndTimeCustom");

const scheduleRepeat = document.getElementById("scheduleRepeat");
const scheduleRepeatUntil = document.getElementById("scheduleRepeatUntil");
const scheduleWeeklyDaysWrap = document.getElementById(
  "scheduleWeeklyDaysWrap",
);
const scheduleWeekdayInputs = document.querySelectorAll(".schedule-weekday");
const scheduleRepeatIntervalWrap = document.getElementById(
  "scheduleRepeatIntervalWrap",
);
const scheduleRepeatInterval = document.getElementById(
  "scheduleRepeatInterval",
);

const typeFilter = document.getElementById("typeFilter");
const yearFilter = document.getElementById("yearFilter");
const monthFilter = document.getElementById("monthFilter");

const dashboardItemList = document.getElementById("dashboardItemList");
const todayList = document.getElementById("todayList");

const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");

const calendarPopupOverlay = document.getElementById("calendarPopupOverlay");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const selectedDateAllDay = document.getElementById("selectedDateAllDay");
const selectedDateTimeline = document.getElementById("selectedDateTimeline");
const selectedDateItemList = document.getElementById("selectedDateItemList");
const clearSelectedDateBtn = document.getElementById("clearSelectedDateBtn");

const summaryPopupOverlay = document.getElementById("summaryPopupOverlay");
const summaryPopupLabel = document.getElementById("summaryPopupLabel");
const summaryPopupList = document.getElementById("summaryPopupList");
const closeSummaryPopupBtn = document.getElementById("closeSummaryPopupBtn");
const summaryButtons = document.querySelectorAll("[data-summary]");

const popupItemType = document.getElementById("popupItemType");
const popupTitleInput = document.getElementById("popupTitleInput");

const popupQuickAddForm = document.getElementById("popupQuickAddForm");
const openPopupQuickAddBtn = document.getElementById("openPopupQuickAddBtn");
const closePopupQuickAddBtn = document.getElementById("closePopupQuickAddBtn");

const popupTodoFields = document.getElementById("popupTodoFields");
const popupTodoTimeTrigger = document.getElementById("popupTodoTimeTrigger");
const popupTodoTimeMenu = document.getElementById("popupTodoTimeMenu");
const popupTodoTimeSearch = document.getElementById("popupTodoTimeSearch");
const popupTodoTimeOptions = document.getElementById("popupTodoTimeOptions");
const popupTodoTimeValue = document.getElementById("popupTodoTimeValue");
const popupTodoTimeCustom = document.getElementById("popupTodoTimeCustom");
const popupTodoRepeat = document.getElementById("popupTodoRepeat");
const popupTodoRepeatUntil = document.getElementById("popupTodoRepeatUntil");
const popupTodoWeeklyDaysWrap = document.getElementById(
  "popupTodoWeeklyDaysWrap",
);
const popupTodoWeekdayInputs = document.querySelectorAll(".popup-todo-weekday");
const popupTodoRepeatIntervalWrap = document.getElementById(
  "popupTodoRepeatIntervalWrap",
);
const popupTodoRepeatInterval = document.getElementById(
  "popupTodoRepeatInterval",
);

const popupScheduleFields = document.getElementById("popupScheduleFields");
const popupScheduleStartTimeTrigger = document.getElementById(
  "popupScheduleStartTimeTrigger",
);
const popupScheduleStartTimeMenu = document.getElementById(
  "popupScheduleStartTimeMenu",
);
const popupScheduleStartTimeSearch = document.getElementById(
  "popupScheduleStartTimeSearch",
);
const popupScheduleStartTimeOptions = document.getElementById(
  "popupScheduleStartTimeOptions",
);
const popupScheduleStartTimeValue = document.getElementById(
  "popupScheduleStartTimeValue",
);
const popupScheduleStartTimeCustom = document.getElementById(
  "popupScheduleStartTimeCustom",
);

const popupScheduleEndTimeTrigger = document.getElementById(
  "popupScheduleEndTimeTrigger",
);
const popupScheduleEndTimeMenu = document.getElementById(
  "popupScheduleEndTimeMenu",
);
const popupScheduleEndTimeSearch = document.getElementById(
  "popupScheduleEndTimeSearch",
);
const popupScheduleEndTimeOptions = document.getElementById(
  "popupScheduleEndTimeOptions",
);
const popupScheduleEndTimeValue = document.getElementById(
  "popupScheduleEndTimeValue",
);
const popupScheduleEndTimeCustom = document.getElementById(
  "popupScheduleEndTimeCustom",
);

const popupScheduleEndDate = document.getElementById("popupScheduleEndDate");
const popupScheduleRepeat = document.getElementById("popupScheduleRepeat");
const popupScheduleRepeatUntil = document.getElementById(
  "popupScheduleRepeatUntil",
);
const popupScheduleWeeklyDaysWrap = document.getElementById(
  "popupScheduleWeeklyDaysWrap",
);
const popupScheduleWeekdayInputs = document.querySelectorAll(
  ".popup-schedule-weekday",
);
const popupScheduleRepeatIntervalWrap = document.getElementById(
  "popupScheduleRepeatIntervalWrap",
);
const popupScheduleRepeatInterval = document.getElementById(
  "popupScheduleRepeatInterval",
);

const popupAddItemBtn = document.getElementById("popupAddItemBtn");

const deleteEditingItemBtn = document.getElementById("deleteEditingItemBtn");

const timePickerRegistry = {};

initAuth();
initAppOnce();

function initAuth() {
  showLoginTabBtn?.addEventListener("click", () => switchAuthTab("login"));
  showSignupTabBtn?.addEventListener("click", () => switchAuthTab("signup"));

  loginBtn?.addEventListener("click", handleLogin);
  signupBtn?.addEventListener("click", handleSignup);

  logoutBtn?.addEventListener("click", handleLogout);

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
      showAppUI(user);
      await loadRemotePlannerData(user.uid);
      renderAll();
    } else {
      showAuthUI();
      items = loadLocalBackup();
      renderAll();
    }
  });
}

function initAppOnce() {
  if (isAppInitialized) return;
  isAppInitialized = true;

  setupTabs();
  setupTimePickers();
  setupPlannerForm();

  saveItemBtn?.addEventListener("click", saveCurrentItem);

  openPlannerFormBtn?.addEventListener("click", () => {
    openPlannerFormCard();
  });

  closePlannerFormBtn?.addEventListener("click", () => {
    resetPlannerForm();

    if (isEditingInPopup) {
      closeEditPopup();
    } else {
      closePlannerFormCard();
    }
  });

  cancelEditBtn?.addEventListener("click", () => {
    resetPlannerForm();

    if (isEditingInPopup) {
      closeEditPopup();
    } else {
      closePlannerFormCard();
    }
  });

  deleteEditingItemBtn?.addEventListener("click", () => {
    deleteEditingItem();
  });

  closeEditPopupBtn?.addEventListener("click", () => {
    resetPlannerForm();
    closeEditPopup();
  });

  editPopupOverlay?.addEventListener("click", (e) => {
    if (e.target === editPopupOverlay) {
      resetPlannerForm();
      closeEditPopup();
    }
  });

  typeFilter?.addEventListener("change", (e) => {
    selectedFilterType = e.target.value;
    dashboardPage = 1;
    renderDashboard();
  });

  yearFilter?.addEventListener("change", (e) => {
    selectedFilterYear = e.target.value;
    dashboardPage = 1;
    renderMonthOptions();
    renderDashboard();
  });

  monthFilter?.addEventListener("change", (e) => {
    selectedFilterMonth = e.target.value;
    dashboardPage = 1;
    renderDashboard();
  });

  prevMonthBtn?.addEventListener("click", () => {
    calendarMonth -= 1;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    }
    renderCalendar();
  });

  nextMonthBtn?.addEventListener("click", () => {
    calendarMonth += 1;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear += 1;
    }
    renderCalendar();
  });

  clearSelectedDateBtn?.addEventListener("click", closeDatePopup);
  calendarPopupOverlay?.addEventListener("click", (e) => {
    if (e.target === calendarPopupOverlay) {
      closeDatePopup();
    }
  });

  closeSummaryPopupBtn?.addEventListener("click", closeSummaryPopup);
  summaryPopupOverlay?.addEventListener("click", (e) => {
    if (e.target === summaryPopupOverlay) {
      closeSummaryPopup();
    }
  });

  summaryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openSummaryPopup(button.dataset.summary);
    });
  });

  popupItemType?.addEventListener("change", updatePopupFields);
  popupTodoRepeat?.addEventListener("change", updatePopupTodoRepeatUI);
  popupScheduleRepeat?.addEventListener("change", updatePopupScheduleRepeatUI);
  popupAddItemBtn?.addEventListener("click", addItemFromSelectedDate);
  openPopupQuickAddBtn?.addEventListener("click", openPopupQuickAddForm);
  closePopupQuickAddBtn?.addEventListener("click", closePopupQuickAddForm);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllTimePickerMenus();
      closeDatePopup();
      closeSummaryPopup();
    }
  });

  document.addEventListener("click", handleDocumentClick);

  renderYearOptions();
  renderMonthOptions();
  renderAll();
  closePlannerFormCard();
}

function showAuthUI() {
  authLoadingScreen?.classList.add("hidden");

  authSection?.classList.remove("hidden");
  appSection?.classList.add("hidden");

  if (currentUserEmail) {
    currentUserEmail.textContent = "";
  }

  clearAuthError();
}

function showAppUI(user) {
  authLoadingScreen?.classList.add("hidden");

  authSection?.classList.add("hidden");
  appSection?.classList.remove("hidden");

  if (currentUserEmail) {
    currentUserEmail.textContent = user.email || "";
  }

  clearAuthError();
}

function switchAuthTab(mode) {
  const isLogin = mode === "login";

  loginFormWrap?.classList.toggle("hidden", !isLogin);
  signupFormWrap?.classList.toggle("hidden", isLogin);

  showLoginTabBtn?.classList.toggle("active", isLogin);
  showSignupTabBtn?.classList.toggle("active", !isLogin);

  clearAuthError();
}

async function handleLogin() {
  const email = loginEmail?.value.trim() || "";
  const password = loginPassword?.value || "";

  clearAuthError();

  if (!email || !password) {
    showAuthError("이메일과 비밀번호를 입력하세요.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);

    loginEmail.value = "";
    loginPassword.value = "";
  } catch (error) {
    showAuthError(getFirebaseAuthErrorMessage(error));
  }
}

async function handleSignup() {
  const email = signupEmail?.value.trim() || "";
  const password = signupPassword?.value || "";
  const confirm = signupPasswordConfirm?.value || "";

  clearAuthError();

  if (!email || !password || !confirm) {
    showAuthError("모든 항목을 입력하세요.");
    return;
  }

  if (password.length < 6) {
    showAuthError("비밀번호는 6자 이상이어야 합니다.");
    return;
  }

  if (password !== confirm) {
    showAuthError("비밀번호 확인이 일치하지 않습니다.");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);

    signupEmail.value = "";
    signupPassword.value = "";
    signupPasswordConfirm.value = "";
  } catch (error) {
    showAuthError(getFirebaseAuthErrorMessage(error));
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    alert("로그아웃 중 오류가 발생했습니다.");
    console.error(error);
  }
}

function showAuthError(message) {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.className = "auth-message error";
}

function clearAuthError() {
  if (!authMessage) return;
  authMessage.textContent = "";
  authMessage.className = "auth-message hidden";
}

function getFirebaseAuthErrorMessage(error) {
  const code = error?.code || "";

  if (code.includes("invalid-credential"))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (code.includes("email-already-in-use")) return "이미 가입된 이메일입니다.";
  if (code.includes("weak-password")) return "비밀번호가 너무 약합니다.";
  if (code.includes("invalid-email")) return "이메일 형식이 올바르지 않습니다.";
  if (code.includes("too-many-requests"))
    return "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
  if (code.includes("network-request-failed"))
    return "네트워크 연결을 확인하세요.";
  return "인증 처리 중 오류가 발생했습니다.";
}

async function loadRemotePlannerData(uid) {
  isRemoteLoading = true;
  try {
    const snapshot = await getDoc(
      doc(db, "users", uid, "plannerData", "default"),
    );
    if (snapshot.exists()) {
      const data = snapshot.data();
      items = Array.isArray(data.items) ? data.items : [];
    } else {
      items = loadLocalBackup();
      await savePlannerDataToCloud();
    }
  } catch (error) {
    console.error("원격 데이터 불러오기 오류:", error);
    items = loadLocalBackup();
  } finally {
    isRemoteLoading = false;
    saveLocalBackup();
  }
}

function queueSavePlannerData() {
  saveLocalBackup();

  if (!currentUser || isRemoteLoading) return;

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    savePlannerDataToCloud();
  }, 350);
}

async function savePlannerDataToCloud() {
  if (!currentUser || isRemoteLoading) return;

  try {
    await setDoc(
      doc(db, "users", currentUser.uid, "plannerData", "default"),
      {
        items,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("원격 데이터 저장 오류:", error);
  }
}

function saveLocalBackup() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("로컬 백업 저장 오류:", error);
  }
}

function loadLocalBackup() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("로컬 백업 불러오기 오류:", error);
    return [];
  }
}

function setupTabs() {
  bottomTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;

  bottomTabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  tabSections.forEach((section) => section.classList.add("hidden"));
  document.getElementById(`tab-${tabName}`)?.classList.remove("hidden");

  if (tabName !== "planner") {
    closeDatePopup();
    closePlannerFormCard();
  }

  renderCalendar();
  renderTodayList();

  if (tabName === "planner") {
    closePlannerFormCard();
  }
}

function createTimeOptions() {
  const list = [{ value: "", label: "시간 없음" }];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      list.push({ value, label: value });
    }
  }
  list.push({ value: "__custom__", label: "직접입력" });
  return list;
}

function registerTimePicker(key, config) {
  timePickerRegistry[key] = {
    ...config,
    options: createTimeOptions(),
    filteredOptions: createTimeOptions(),
  };

  config.trigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleTimePickerMenu(key);
  });

  config.search?.addEventListener("input", () => {
    filterTimePickerOptions(key, config.search.value);
  });

  config.custom?.addEventListener("input", () => {
    setTimePickerValue(key, config.custom.value, true);
  });

  renderTimePickerOptions(key);
  updateTimePickerTriggerText(key);
}

function setupTimePickers() {
  registerTimePicker("todoDue", {
    trigger: todoDueTimeTrigger,
    menu: todoDueTimeMenu,
    search: todoDueTimeSearch,
    optionsWrap: todoDueTimeOptions,
    valueInput: todoDueTimeValue,
    custom: todoDueTimeCustom,
  });

  registerTimePicker("scheduleStart", {
    trigger: scheduleStartTimeTrigger,
    menu: scheduleStartTimeMenu,
    search: scheduleStartTimeSearch,
    optionsWrap: scheduleStartTimeOptions,
    valueInput: scheduleStartTimeValue,
    custom: scheduleStartTimeCustom,
  });

  registerTimePicker("scheduleEnd", {
    trigger: scheduleEndTimeTrigger,
    menu: scheduleEndTimeMenu,
    search: scheduleEndTimeSearch,
    optionsWrap: scheduleEndTimeOptions,
    valueInput: scheduleEndTimeValue,
    custom: scheduleEndTimeCustom,
  });

  registerTimePicker("popupTodo", {
    trigger: popupTodoTimeTrigger,
    menu: popupTodoTimeMenu,
    search: popupTodoTimeSearch,
    optionsWrap: popupTodoTimeOptions,
    valueInput: popupTodoTimeValue,
    custom: popupTodoTimeCustom,
  });

  registerTimePicker("popupScheduleStart", {
    trigger: popupScheduleStartTimeTrigger,
    menu: popupScheduleStartTimeMenu,
    search: popupScheduleStartTimeSearch,
    optionsWrap: popupScheduleStartTimeOptions,
    valueInput: popupScheduleStartTimeValue,
    custom: popupScheduleStartTimeCustom,
  });

  registerTimePicker("popupScheduleEnd", {
    trigger: popupScheduleEndTimeTrigger,
    menu: popupScheduleEndTimeMenu,
    search: popupScheduleEndTimeSearch,
    optionsWrap: popupScheduleEndTimeOptions,
    valueInput: popupScheduleEndTimeValue,
    custom: popupScheduleEndTimeCustom,
  });
}

function toggleTimePickerMenu(key) {
  const picker = timePickerRegistry[key];
  if (!picker) return;

  const isOpen = !picker.menu.classList.contains("hidden");
  closeAllTimePickerMenus();

  if (!isOpen) {
    picker.menu.classList.remove("hidden");
    picker.search.value = "";
    filterTimePickerOptions(key, "");
    picker.search.focus();
  }
}

function closeAllTimePickerMenus() {
  Object.values(timePickerRegistry).forEach((picker) => {
    picker.menu.classList.add("hidden");
  });
}

function filterTimePickerOptions(key, keyword) {
  const picker = timePickerRegistry[key];
  if (!picker) return;

  const query = keyword.trim().toLowerCase();
  picker.filteredOptions = picker.options.filter((option) => {
    if (!query) return true;
    return option.label.toLowerCase().includes(query);
  });

  renderTimePickerOptions(key);
}

function renderTimePickerOptions(key) {
  const picker = timePickerRegistry[key];
  if (!picker) return;

  const currentValue = picker.valueInput.value;
  picker.optionsWrap.innerHTML = picker.filteredOptions
    .map((option) => {
      const active = currentValue === option.value ? "active" : "";
      const customClass = option.value === "__custom__" ? "custom" : "";
      return `
      <button
        type="button"
        class="time-picker-option ${active} ${customClass}"
        data-time-picker-option="${key}"
        data-value="${option.value}"
      >
        ${option.label}
      </button>
    `;
    })
    .join("");
}

function updateTimePickerTriggerText(key) {
  const picker = timePickerRegistry[key];
  if (!picker) return;

  const value = picker.valueInput.value;
  const customValue = picker.custom.value;

  if (value === "__custom__") {
    picker.custom.classList.remove("hidden");
    picker.trigger.textContent = customValue || "직접입력";
    return;
  }

  picker.custom.classList.add("hidden");

  if (!value) {
    picker.trigger.textContent = "시간 없음";
    return;
  }

  picker.trigger.textContent = value;
}

function setTimePickerValue(key, value, fromCustom = false) {
  const picker = timePickerRegistry[key];
  if (!picker) return;

  if (fromCustom) {
    picker.valueInput.value = "__custom__";
    updateTimePickerTriggerText(key);
    renderTimePickerOptions(key);
    return;
  }

  picker.valueInput.value = value;

  if (value === "__custom__") {
    picker.custom.classList.remove("hidden");
    picker.custom.focus();
  } else {
    picker.custom.value = "";
  }

  updateTimePickerTriggerText(key);
  renderTimePickerOptions(key);
}

function getTimeValue(key) {
  const picker = timePickerRegistry[key];
  if (!picker) return "";

  if (picker.valueInput.value === "__custom__") {
    return picker.custom.value || "";
  }
  return picker.valueInput.value || "";
}

function applyTimeValue(key, value) {
  const picker = timePickerRegistry[key];
  if (!picker) return;

  const hasExactOption = picker.options.some(
    (option) => option.value === value,
  );

  if (!value) {
    picker.valueInput.value = "";
    picker.custom.value = "";
    updateTimePickerTriggerText(key);
    renderTimePickerOptions(key);
    return;
  }

  if (hasExactOption) {
    picker.valueInput.value = value;
    picker.custom.value = "";
  } else {
    picker.valueInput.value = "__custom__";
    picker.custom.value = value;
  }

  updateTimePickerTriggerText(key);
  renderTimePickerOptions(key);
}

function setupPlannerForm() {
  itemType?.addEventListener("change", updatePlannerFields);
  todoRepeat?.addEventListener("change", updateTodoRepeatUI);
  scheduleRepeat?.addEventListener("change", updateScheduleRepeatUI);

  updatePlannerFields();
  updateTodoRepeatUI();
  updateScheduleRepeatUI();
  updatePopupTodoRepeatUI();
  updatePopupScheduleRepeatUI();
}

function updatePlannerFields() {
  if (itemType?.value === "todo") {
    todoFields?.classList.remove("hidden");
    scheduleFields?.classList.add("hidden");
  } else {
    todoFields?.classList.add("hidden");
    scheduleFields?.classList.remove("hidden");
  }

  updateTodoRepeatUI();
  updateScheduleRepeatUI();
}

function updateTodoRepeatUI() {
  const repeatValue = todoRepeat?.value;
  todoWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(itemType?.value === "todo" && repeatValue === "weekly_days"),
  );
  todoRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(itemType?.value === "todo" && repeatValue === "interval_days"),
  );
}

function updateScheduleRepeatUI() {
  const repeatValue = scheduleRepeat?.value;
  scheduleWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(itemType?.value === "schedule" && repeatValue === "weekly_days"),
  );
  scheduleRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(itemType?.value === "schedule" && repeatValue === "interval_days"),
  );
}

function updatePopupTodoRepeatUI() {
  popupTodoWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(
      popupItemType?.value === "todo" &&
      popupTodoRepeat?.value === "weekly_days"
    ),
  );
  popupTodoRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(
      popupItemType?.value === "todo" &&
      popupTodoRepeat?.value === "interval_days"
    ),
  );
}

function updatePopupScheduleRepeatUI() {
  popupScheduleWeeklyDaysWrap?.classList.toggle(
    "hidden",
    !(
      popupItemType?.value === "schedule" &&
      popupScheduleRepeat?.value === "weekly_days"
    ),
  );
  popupScheduleRepeatIntervalWrap?.classList.toggle(
    "hidden",
    !(
      popupItemType?.value === "schedule" &&
      popupScheduleRepeat?.value === "interval_days"
    ),
  );
}

function updatePopupFields() {
  if (popupItemType?.value === "todo") {
    popupTodoFields?.classList.remove("hidden");
    popupScheduleFields?.classList.add("hidden");
  } else {
    popupTodoFields?.classList.add("hidden");
    popupScheduleFields?.classList.remove("hidden");
  }

  updatePopupTodoRepeatUI();
  updatePopupScheduleRepeatUI();
}

function resetPopupQuickAddForm() {
  if (popupItemType) popupItemType.value = "todo";
  if (popupTitleInput) popupTitleInput.value = "";

  applyTimeValue("popupTodo", "");
  if (popupTodoRepeat) popupTodoRepeat.value = "none";
  if (popupTodoRepeatUntil) popupTodoRepeatUntil.value = "";
  if (popupTodoRepeatInterval) popupTodoRepeatInterval.value = "2";
  popupTodoWeekdayInputs.forEach((input) => {
    input.checked = false;
  });

  applyTimeValue("popupScheduleStart", "");
  applyTimeValue("popupScheduleEnd", "");
  if (popupScheduleEndDate) popupScheduleEndDate.value = selectedDate || "";
  if (popupScheduleRepeat) popupScheduleRepeat.value = "none";
  if (popupScheduleRepeatUntil) popupScheduleRepeatUntil.value = "";
  if (popupScheduleRepeatInterval) popupScheduleRepeatInterval.value = "2";
  popupScheduleWeekdayInputs.forEach((input) => {
    input.checked = false;
  });

  popupQuickAddForm?.classList.add("hidden");
  updatePopupFields();
}

function openPopupQuickAddForm() {
  popupQuickAddForm?.classList.remove("hidden");
  popupTitleInput?.focus();
}

function closePopupQuickAddForm() {
  popupQuickAddForm?.classList.add("hidden");
}

function renderAll() {
  renderYearOptions();
  renderMonthOptions();
  renderDashboard();
  renderTodayList();
  renderCalendar();
}

function saveCurrentItem() {
  const type = itemType?.value;
  const title = titleInput?.value.trim();

  if (!title) {
    alert("제목을 입력하세요.");
    titleInput?.focus();
    return;
  }

  if (editingId !== null) {
    saveEditedSingleItem(type, title);
    return;
  }

  if (type === "todo") {
    saveTodoSeries(title);
  } else {
    saveScheduleSeries(title);
  }
}

function saveEditedSingleItem(type, title) {
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";
  if (type === "todo") {
    const dueDate = todoDueDate?.value;
    const dueTime = getTimeValue("todoDue");
    const repeat = todoRepeat?.value;
    const repeatUntil = todoRepeatUntil?.value;
    const weeklyDays = [...todoWeekdayInputs]
      .filter((input) => input.checked)
      .map((input) => Number(input.value));
    const intervalDays = Math.max(1, Number(todoRepeatInterval?.value) || 1);

    if (!dueDate) {
      alert("기한 날짜를 입력하세요.");
      return;
    }

    if (repeat !== "none" && !repeatUntil) {
      alert("반복 종료일을 입력하세요.");
      return;
    }

    if (repeat === "weekly_days" && weeklyDays.length === 0) {
      alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
      return;
    }

    items = items.map((item) =>
      item.id === editingId
        ? {
            ...item,
            type: "todo",
            title,
            color,
            tag,
            dueDate,
            dueTime,
            repeat,
            repeatUntil,
            weeklyDays,
            intervalDays,
          }
        : item,
    );
  } else {
    const startDate = scheduleStartDate?.value;
    const startTime = getTimeValue("scheduleStart");
    const endDate = scheduleEndDate?.value;
    const endTime = getTimeValue("scheduleEnd");
    const repeat = scheduleRepeat?.value;
    const repeatUntil = scheduleRepeatUntil?.value;
    const weeklyDays = [...scheduleWeekdayInputs]
      .filter((input) => input.checked)
      .map((input) => Number(input.value));
    const intervalDays = Math.max(
      1,
      Number(scheduleRepeatInterval?.value) || 1,
    );

    if (!startDate || !endDate) {
      alert("시작 날짜와 종료 날짜를 입력하세요.");
      return;
    }

    const startDateTime = new Date(
      makeDateTime(startDate, startTime || "00:00"),
    );
    const endDateTime = new Date(makeDateTime(endDate, endTime || "23:59"));

    if (startDateTime > endDateTime) {
      alert("종료 시점은 시작 시점보다 뒤여야 합니다.");
      return;
    }

    if (repeat !== "none" && !repeatUntil) {
      alert("반복 종료일을 입력하세요.");
      return;
    }

    if (repeat === "weekly_days" && weeklyDays.length === 0) {
      alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
      return;
    }

    items = items.map((item) =>
      item.id === editingId
        ? {
            ...item,
            type: "schedule",
            title,
            color,
            tag,
            startDate,
            startTime,
            endDate,
            endTime,
            repeat,
            repeatUntil,
            weeklyDays,
            intervalDays,
          }
        : item,
    );
  }

  queueSavePlannerData();
  resetPlannerForm();
  renderAll();

  if (isEditingInPopup) {
    closeEditPopup();
  } else {
    closePlannerFormCard();
  }
}

function saveTodoSeries(title) {
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";
  const dueDate = todoDueDate?.value;
  const dueTime = getTimeValue("todoDue");
  const repeat = todoRepeat?.value;
  const repeatUntil = todoRepeatUntil?.value;
  const weeklyDays = [...todoWeekdayInputs]
    .filter((input) => input.checked)
    .map((input) => Number(input.value));
  const intervalDays = Math.max(1, Number(todoRepeatInterval?.value) || 1);

  if (!dueDate) {
    alert("기한 날짜를 입력하세요.");
    todoDueDate?.focus();
    return;
  }

  if (repeat !== "none" && !repeatUntil) {
    alert("반복 종료일을 입력하세요.");
    todoRepeatUntil?.focus();
    return;
  }

  if (
    repeat !== "none" &&
    new Date(`${repeatUntil}T00:00`) < new Date(`${dueDate}T00:00`)
  ) {
    alert("반복 종료일은 기한 날짜보다 뒤여야 합니다.");
    return;
  }

  if (repeat === "weekly_days" && weeklyDays.length === 0) {
    alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
    return;
  }

  const seriesItems = generateTodoSeries({
    title,
    color,
    tag,
    dueDate,
    dueTime,
    repeat,
    repeatUntil,
    weeklyDays,
    intervalDays,
  });

  items.push(...seriesItems);
  queueSavePlannerData();
  resetPlannerForm();
  renderAll();
  closePlannerFormCard();
}

function saveScheduleSeries(title) {
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";
  const startDate = scheduleStartDate?.value;
  const startTime = getTimeValue("scheduleStart");
  const endDate = scheduleEndDate?.value;
  const endTime = getTimeValue("scheduleEnd");
  const repeat = scheduleRepeat?.value;
  const repeatUntil = scheduleRepeatUntil?.value;
  const weeklyDays = [...scheduleWeekdayInputs]
    .filter((input) => input.checked)
    .map((input) => Number(input.value));
  const intervalDays = Math.max(1, Number(scheduleRepeatInterval?.value) || 1);

  if (!startDate || !endDate) {
    alert("시작 날짜와 종료 날짜를 입력하세요.");
    return;
  }

  const startDateTime = new Date(makeDateTime(startDate, startTime || "00:00"));
  const endDateTime = new Date(makeDateTime(endDate, endTime || "23:59"));

  if (startDateTime > endDateTime) {
    alert("종료 시점은 시작 시점보다 뒤여야 합니다.");
    return;
  }

  if (repeat !== "none" && !repeatUntil) {
    alert("반복 종료일을 입력하세요.");
    scheduleRepeatUntil?.focus();
    return;
  }

  if (
    repeat !== "none" &&
    new Date(`${repeatUntil}T00:00`) < new Date(`${startDate}T00:00`)
  ) {
    alert("반복 종료일은 시작 날짜보다 뒤여야 합니다.");
    return;
  }

  if (repeat === "weekly_days" && weeklyDays.length === 0) {
    alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
    return;
  }

  const seriesItems = generateScheduleSeries({
    title,
    color,
    tag,
    startDate,
    startTime,
    endDate,
    endTime,
    repeat,
    repeatUntil,
    weeklyDays,
    intervalDays,
  });

  items.push(...seriesItems);
  queueSavePlannerData();
  resetPlannerForm();
  renderAll();
  closePlannerFormCard();
}

function generateTodoSeries(base) {
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

function generateScheduleSeries(base) {
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

function dateDiffDays(startDateObj, endDateObj) {
  const start = new Date(startDateObj);
  const end = new Date(endDateObj);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function addDays(dateObj, days) {
  const next = new Date(dateObj);
  next.setDate(next.getDate() + days);
  return next;
}

function getOccurrenceDateKeys(
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

function moveCursor(dateObj, repeat) {
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

function addItemFromSelectedDate() {
  if (!selectedDate) {
    alert("먼저 날짜를 선택하세요.");
    return;
  }

  const type = popupItemType?.value;
  const title = popupTitleInput?.value.trim();

  if (!title) {
    alert("제목을 입력하세요.");
    popupTitleInput?.focus();
    return;
  }

  if (type === "todo") {
    const repeat = popupTodoRepeat?.value;
    const repeatUntil = popupTodoRepeatUntil?.value;
    const weeklyDays = [...popupTodoWeekdayInputs]
      .filter((input) => input.checked)
      .map((input) => Number(input.value));
    const intervalDays = Math.max(
      1,
      Number(popupTodoRepeatInterval?.value) || 1,
    );
    const dueTime = getTimeValue("popupTodo");

    if (repeat !== "none" && !repeatUntil) {
      alert("반복 종료일을 입력하세요.");
      popupTodoRepeatUntil?.focus();
      return;
    }

    if (
      repeat !== "none" &&
      new Date(`${repeatUntil}T00:00`) < new Date(`${selectedDate}T00:00`)
    ) {
      alert("반복 종료일은 선택한 날짜보다 뒤여야 합니다.");
      return;
    }

    if (repeat === "weekly_days" && weeklyDays.length === 0) {
      alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
      return;
    }

    const seriesItems = generateTodoSeries({
      title,
      dueDate: selectedDate,
      dueTime,
      repeat,
      repeatUntil,
      weeklyDays,
      intervalDays,
    });

    items.push(...seriesItems);
  } else {
    const endDate = popupScheduleEndDate?.value || selectedDate;
    const startTime = getTimeValue("popupScheduleStart");
    const endTime = getTimeValue("popupScheduleEnd");
    const repeat = popupScheduleRepeat?.value;
    const repeatUntil = popupScheduleRepeatUntil?.value;
    const weeklyDays = [...popupScheduleWeekdayInputs]
      .filter((input) => input.checked)
      .map((input) => Number(input.value));
    const intervalDays = Math.max(
      1,
      Number(popupScheduleRepeatInterval?.value) || 1,
    );

    const startDateTime = new Date(
      makeDateTime(selectedDate, startTime || "00:00"),
    );
    const endDateTime = new Date(makeDateTime(endDate, endTime || "23:59"));

    if (startDateTime > endDateTime) {
      alert("종료 시점은 시작 시점보다 뒤여야 합니다.");
      return;
    }

    if (repeat !== "none" && !repeatUntil) {
      alert("반복 종료일을 입력하세요.");
      popupScheduleRepeatUntil?.focus();
      return;
    }

    if (
      repeat !== "none" &&
      new Date(`${repeatUntil}T00:00`) < new Date(`${selectedDate}T00:00`)
    ) {
      alert("반복 종료일은 선택한 날짜보다 뒤여야 합니다.");
      return;
    }

    if (repeat === "weekly_days" && weeklyDays.length === 0) {
      alert("요일별 반복은 최소 1개 이상의 요일을 체크해야 합니다.");
      return;
    }

    const seriesItems = generateScheduleSeries({
      title,
      startDate: selectedDate,
      startTime,
      endDate,
      endTime,
      repeat,
      repeatUntil,
      weeklyDays,
      intervalDays,
    });

    items.push(...seriesItems);
  }

  queueSavePlannerData();
  renderAll();
  resetPopupQuickAddForm();
  openDatePopup(selectedDate);
}

function resetPlannerForm() {
  editingId = null;
  if (plannerFormTitle) plannerFormTitle.textContent = "항목 추가";
  if (saveItemBtn) saveItemBtn.textContent = "추가하기";
  cancelEditBtn?.classList.add("hidden");
  closePlannerFormBtn?.classList.remove("hidden");

  if (itemType) itemType.value = "todo";
  if (titleInput) titleInput.value = "";
  if (itemColor) itemColor.value = "blue";
  if (itemTag) itemTag.value = "";

  if (todoDueDate) todoDueDate.value = "";
  applyTimeValue("todoDue", "");
  if (todoRepeat) todoRepeat.value = "none";
  if (todoRepeatUntil) todoRepeatUntil.value = "";
  if (todoRepeatInterval) todoRepeatInterval.value = "2";
  todoWeekdayInputs.forEach((input) => {
    input.checked = false;
  });

  if (scheduleStartDate) scheduleStartDate.value = "";
  applyTimeValue("scheduleStart", "");
  if (scheduleEndDate) scheduleEndDate.value = "";
  applyTimeValue("scheduleEnd", "");
  if (scheduleRepeat) scheduleRepeat.value = "none";
  if (scheduleRepeatUntil) scheduleRepeatUntil.value = "";
  if (scheduleRepeatInterval) scheduleRepeatInterval.value = "2";
  scheduleWeekdayInputs.forEach((input) => {
    input.checked = false;
  });

  updatePlannerFields();
}

function startEdit(id) {
  const item = items.find((x) => x.id === id);
  closePlannerFormBtn?.classList.add("hidden");
  cancelEditBtn?.classList.remove("hidden");
  if (!item) return;

  editingId = id;
  if (plannerFormTitle) {
    plannerFormTitle.textContent =
      item.type === "todo" ? "할일 수정" : "일정 수정";
  }
  if (saveItemBtn) saveItemBtn.textContent = "수정 저장";
  cancelEditBtn?.classList.add("hidden");
  closePlannerFormBtn?.classList.remove("hidden");
  openPlannerFormCard();

  if (itemType) itemType.value = item.type;
  if (titleInput) titleInput.value = item.title;
  if (itemColor) itemColor.value = item.color || "blue";
  if (itemTag) itemTag.value = item.tag || "";

  if (item.type === "todo") {
    if (todoDueDate) todoDueDate.value = item.dueDate || "";
    applyTimeValue("todoDue", item.dueTime || "");
    if (todoRepeat) todoRepeat.value = item.repeat || "none";
    if (todoRepeatUntil) todoRepeatUntil.value = item.repeatUntil || "";
    if (todoRepeatInterval) todoRepeatInterval.value = item.intervalDays || 2;

    todoWeekdayInputs.forEach((input) => {
      input.checked = Array.isArray(item.weeklyDays)
        ? item.weeklyDays.includes(Number(input.value))
        : false;
    });
  } else {
    if (scheduleStartDate) scheduleStartDate.value = item.startDate || "";
    applyTimeValue("scheduleStart", item.startTime || "");
    if (scheduleEndDate) scheduleEndDate.value = item.endDate || "";
    applyTimeValue("scheduleEnd", item.endTime || "");
    if (scheduleRepeat) scheduleRepeat.value = item.repeat || "none";
    if (scheduleRepeatUntil) scheduleRepeatUntil.value = item.repeatUntil || "";
    if (scheduleRepeatInterval)
      scheduleRepeatInterval.value = item.intervalDays || 2;

    scheduleWeekdayInputs.forEach((input) => {
      input.checked = Array.isArray(item.weeklyDays)
        ? item.weeklyDays.includes(Number(input.value))
        : false;
    });
  }

  updatePlannerFields();
  openEditPopup();
}

function deleteItem(id) {
  const ok = confirm("정말 삭제할까요?");
  if (!ok) return;

  items = items.filter((item) => item.id !== id);

  if (editingId === id) {
    resetPlannerForm();
  }

  const dayItems = selectedDate ? getItemsForDate(selectedDate) : [];
  if (selectedDate && dayItems.length === 0) {
    closeDatePopup();
  }

  queueSavePlannerData();
  renderAll();
}

function toggleStatus(id) {
  const item = items.find((x) => x.id === id);
  if (!item) return;

  item.status = getNextStatus(item.status);
  queueSavePlannerData();
  renderAll();

  if (selectedDate) {
    openDatePopup(selectedDate);
  }
}

function handleDocumentClick(e) {
  const actionTarget = e.target.closest("[data-action]");
  const optionTarget = e.target.closest("[data-time-picker-option]");
  const pickerRoot = e.target.closest(".time-picker");

  if (optionTarget) {
    const key = optionTarget.dataset.timePickerOption;
    const value = optionTarget.dataset.value;
    setTimePickerValue(key, value, false);
    const picker = timePickerRegistry[key];
    if (value !== "__custom__") {
      picker.menu.classList.add("hidden");
    }
    return;
  }

  if (!pickerRoot) {
    closeAllTimePickerMenus();
  }

  if (!actionTarget) return;

  const action = actionTarget.dataset.action;

  if (action === "toggle-status") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    toggleStatus(id);
    return;
  }

  if (action === "open-edit-item") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    startEdit(id);
    return;
  }

  if (action === "delete-item") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    deleteItem(id);
    return;
  }

  if (action === "select-date") {
    const dateKey = actionTarget.dataset.date;
    if (!dateKey) return;
    selectCalendarDate(dateKey);
  }
}

function renderDashboard() {
  const filtered = sortItems(getFilteredItems());

  if (totalCount) totalCount.textContent = filtered.length;
  if (pendingCount)
    pendingCount.textContent = filtered.filter(
      (item) => item.status === "pending",
    ).length;
  if (failCount)
    failCount.textContent = filtered.filter(
      (item) => item.status === "fail",
    ).length;
  if (successCount)
    successCount.textContent = filtered.filter(
      (item) => item.status === "success",
    ).length;

  if (dashboardTodoCount)
    dashboardTodoCount.textContent = filtered.filter(
      (item) => item.type === "todo",
    ).length;
  if (dashboardScheduleCount)
    dashboardScheduleCount.textContent = filtered.filter(
      (item) => item.type === "schedule",
    ).length;

  const todayKey = formatDateKey(new Date());
  if (dashboardTodayCount) {
    dashboardTodayCount.textContent = filtered.filter((item) =>
      isItemOnDate(todayKey, item),
    ).length;
  }

  if (dashboardUrgentTodoCount) {
    dashboardUrgentTodoCount.textContent = filtered.filter((item) => {
      if (item.type !== "todo") return false;
      const diff = getTodoDiffMinutes(item);
      return diff >= 0 && diff <= 1440;
    }).length;
  }

  const rate = getAchievementRate(filtered);
  if (achievementRate) achievementRate.textContent = `${rate}%`;
  if (achievementBarFill) achievementBarFill.style.width = `${rate}%`;

  const completedBase = filtered.filter(
    (item) => item.status === "success" || item.status === "fail",
  ).length;
  if (achievementDesc) {
    achievementDesc.textContent =
      completedBase === 0
        ? "완료 / (완료 + 미완료) 기준 · 아직 계산할 항목이 없습니다."
        : `완료 / (완료 + 미완료) 기준 · ${completedBase}개 반영`;
  }

  if (!dashboardItemList) return;

  if (filtered.length === 0) {
    dashboardItemList.innerHTML = `
    <div class="empty-message">현재 표시할 항목이 없습니다.</div>
  `;
    return;
  }

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / DASHBOARD_PAGE_SIZE),
  );

  if (dashboardPage > totalPages) {
    dashboardPage = totalPages;
  }

  const startIndex = (dashboardPage - 1) * DASHBOARD_PAGE_SIZE;

  const visibleItems = filtered.slice(
    startIndex,
    startIndex + DASHBOARD_PAGE_SIZE,
  );

  dashboardItemList.innerHTML = `
  ${visibleItems.map((item) => renderCard(item)).join("")}

  <div class="pagination-wrap">

    <button
      class="secondary-btn"
      type="button"
      id="dashboardPrevPageBtn"
      ${dashboardPage === 1 ? "disabled" : ""}
    >
      이전
    </button>

    <span class="pagination-text">
      ${dashboardPage} / ${totalPages}
    </span>

    <button
      class="secondary-btn"
      type="button"
      id="dashboardNextPageBtn"
      ${dashboardPage === totalPages ? "disabled" : ""}
    >
      다음
    </button>

  </div>
`;

  document
    .getElementById("dashboardPrevPageBtn")
    ?.addEventListener("click", () => {
      if (dashboardPage > 1) {
        dashboardPage--;

        renderDashboard();

        requestAnimationFrame(() => {
          dashboardItemList?.closest(".card")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    });

  document
    .getElementById("dashboardNextPageBtn")
    ?.addEventListener("click", () => {
      if (dashboardPage < totalPages) {
        dashboardPage++;

        renderDashboard();

        requestAnimationFrame(() => {
          dashboardItemList?.closest(".card")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    });
}

function renderTodayList() {
  if (!todayList) return;

  const todayKey = formatDateKey(new Date());
  const todayItems = getItemsForDate(todayKey);

  if (todayItems.length === 0) {
    todayList.innerHTML = `<div class="empty-message">오늘 항목이 없습니다.</div>`;
    return;
  }

  todayList.innerHTML = todayItems.map((item) => renderCard(item)).join("");
}

function openSummaryPopup(type) {
  const filtered = getFilteredItems();
  const list = getSummaryList(type, filtered);

  const labelMap = {
    all: "전체 목록",
    pending: "대기 목록",
    fail: "미완료 목록",
    success: "완료 목록",
    todo: "할일 목록",
    schedule: "일정 목록",
    today: "오늘 포함 항목",
    urgent: "마감 임박 할일",
  };

  if (summaryPopupLabel) {
    summaryPopupLabel.textContent = labelMap[type] || "목록";
  }

  if (!summaryPopupList) return;

  if (list.length === 0) {
    summaryPopupList.innerHTML = `<div class="empty-message">표시할 항목이 없습니다.</div>`;
  } else {
    summaryPopupList.innerHTML = list
      .map((item) => renderSelectedCard(item))
      .join("");
  }

  summaryPopupOverlay?.classList.remove("hidden");
}

function closeSummaryPopup() {
  summaryPopupOverlay?.classList.add("hidden");
}

function getSummaryList(type, filtered) {
  const todayKey = formatDateKey(new Date());

  if (type === "all") return sortItems(filtered);
  if (type === "pending")
    return sortItems(filtered.filter((item) => item.status === "pending"));
  if (type === "fail")
    return sortItems(filtered.filter((item) => item.status === "fail"));
  if (type === "success")
    return sortItems(filtered.filter((item) => item.status === "success"));
  if (type === "todo")
    return sortItems(filtered.filter((item) => item.type === "todo"));
  if (type === "schedule")
    return sortItems(filtered.filter((item) => item.type === "schedule"));
  if (type === "today")
    return sortItems(filtered.filter((item) => isItemOnDate(todayKey, item)));
  if (type === "urgent") {
    return sortItems(
      filtered.filter((item) => {
        if (item.type !== "todo") return false;
        const diff = getTodoDiffMinutes(item);
        return diff >= 0 && diff <= 1440;
      }),
    );
  }

  return [];
}

function getFilteredItems() {
  let filtered = [...items];

  if (selectedFilterType) {
    filtered = filtered.filter((item) => item.type === selectedFilterType);
  }

  if (selectedFilterYear) {
    filtered = filtered.filter(
      (item) => getYearFromItem(item) === selectedFilterYear,
    );
  }

  if (selectedFilterMonth) {
    filtered = filtered.filter(
      (item) => getMonthFromItem(item) === selectedFilterMonth,
    );
  }

  return filtered;
}

function getAchievementRate(filteredItems) {
  const success = filteredItems.filter(
    (item) => item.status === "success",
  ).length;
  const fail = filteredItems.filter((item) => item.status === "fail").length;
  const base = success + fail;
  if (base === 0) return 0;
  return Math.round((success / base) * 100);
}

function renderCard(item) {
  const repeatIcon =
    item.repeat && item.repeat !== "none"
      ? `<span class="meta-icon repeat" title="${escapeHtml(getRepeatText(item.repeat, item.repeatUntil, item.weeklyDays, item.intervalDays))}">↻</span>`
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

function renderSelectedCard(item) {
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

function getRepeatText(
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
      ? `${dayText} 반복 · ${formatKoreanDate(repeatUntil)}까지`
      : `${dayText} 반복`;
  }

  if (repeat === "interval_days") {
    const text = `${intervalDays || 1}일마다`;
    return repeatUntil
      ? `${text} · ${formatKoreanDate(repeatUntil)}까지`
      : text;
  }

  const map = {
    daily: "매일",
    weekly: "매주",
    monthly: "매월",
  };

  return repeatUntil
    ? `${map[repeat]} · ${formatKoreanDate(repeatUntil)}까지`
    : map[repeat];
}

function renderYearOptions() {
  if (!yearFilter) return;

  const years = [...new Set(items.map((item) => getYearFromItem(item)))].sort();
  yearFilter.innerHTML = `<option value="">전체</option>`;

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = `${year.slice(2)}년`;
    if (year === selectedFilterYear) option.selected = true;
    yearFilter.appendChild(option);
  });

  if (selectedFilterYear && !years.includes(selectedFilterYear)) {
    selectedFilterYear = "";
    yearFilter.value = "";
  }
}

function renderMonthOptions() {
  if (!monthFilter) return;

  const months = getAvailableMonthsForYear(selectedFilterYear);
  monthFilter.innerHTML = `<option value="">전체</option>`;

  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = `${Number(month)}월`;
    if (month === selectedFilterMonth) option.selected = true;
    monthFilter.appendChild(option);
  });

  if (selectedFilterMonth && !months.includes(selectedFilterMonth)) {
    selectedFilterMonth = "";
    monthFilter.value = "";
  }
}

function getAvailableMonthsForYear(year) {
  let source = items;
  if (year) {
    source = items.filter((item) => getYearFromItem(item) === year);
  }
  return [...new Set(source.map((item) => getMonthFromItem(item)))].sort(
    (a, b) => Number(a) - Number(b),
  );
}

function getYearFromItem(item) {
  return item.type === "todo"
    ? item.dueDate.slice(0, 4)
    : item.startDate.slice(0, 4);
}

function getMonthFromItem(item) {
  return item.type === "todo"
    ? item.dueDate.slice(5, 7)
    : item.startDate.slice(5, 7);
}

function renderCalendar() {
  if (!calendarTitle || !calendarGrid) return;

  calendarTitle.textContent = `${String(calendarYear).slice(2)}년 ${calendarMonth + 1}월`;

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const prevMonthLastDay = new Date(calendarYear, calendarMonth, 0).getDate();

  const cells = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const dateObj = new Date(calendarYear, calendarMonth - 1, day);
    cells.push(createCalendarCell(dateObj, true));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(calendarYear, calendarMonth, day);
    cells.push(createCalendarCell(dateObj, false));
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (startWeekday + daysInMonth) + 1;
    const dateObj = new Date(calendarYear, calendarMonth + 1, nextDay);
    cells.push(createCalendarCell(dateObj, true));
  }

  calendarGrid.innerHTML = cells.join("");
}

function createCalendarCell(dateObj, isOtherMonth) {
  const dateKey = formatDateKey(dateObj);
  const todayKey = formatDateKey(new Date());
  const isToday = dateKey === todayKey;
  const isSelected = dateKey === selectedDate;

  const dayItems = getItemsForDate(dateKey);
  const visibleItems = dayItems.slice(0, 3);
  const moreCount = dayItems.length - visibleItems.length;

  return `
    <div class="calendar-cell ${isOtherMonth ? "other-month" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected-date" : ""}"
      data-action="select-date"
      data-date="${dateKey}">
      <div class="calendar-date">${dateObj.getDate()}</div>
      <div class="calendar-items">
        ${visibleItems
          .map(
            (item) => `
          <div class="calendar-event ${item.type} ${item.status} item-color-${item.color || "blue"}" title="${escapeHtml(item.title)}">
            <div class="calendar-event-top">
              <span class="calendar-type-badge ${item.type}">${item.type === "todo" ? "할일" : "일정"}</span>
              <span class="calendar-time">${getCalendarItemTime(item)}</span>
            </div>
            <div class="calendar-title">${escapeHtml(item.title)}</div>
          </div>
        `,
          )
          .join("")}
        ${moreCount > 0 ? `<div class="calendar-more">+ ${moreCount}개 더</div>` : ""}
      </div>
    </div>
  `;
}

function getCalendarItemTime(item) {
  return item.type === "todo"
    ? item.dueTime || "시간없음"
    : item.startTime || "시간없음";
}

function selectCalendarDate(dateKey) {
  selectedDate = dateKey;
  renderCalendar();
  openDatePopup(dateKey);
}

function openDatePopup(dateKey) {
  const dayItems = getItemsForDate(dateKey);

  if (selectedDateLabel) {
    selectedDateLabel.textContent = `${formatKoreanDate(dateKey)} 항목`;
  }

  renderSelectedDateAllDay(dateKey, dayItems);
  renderSelectedDateTimeline(dateKey, dayItems);
  renderSelectedDateExtraList(dateKey, dayItems);

  resetPopupQuickAddForm();
  if (popupScheduleEndDate) popupScheduleEndDate.value = dateKey;
  calendarPopupOverlay?.classList.remove("hidden");
}

function renderSelectedDateAllDay(dateKey, itemsForDate) {
  if (!selectedDateAllDay) return;

  const allDayItems = itemsForDate.filter((item) =>
    isAllDayTimelineItem(dateKey, item),
  );

  if (allDayItems.length === 0) {
    selectedDateAllDay.innerHTML = "";
    return;
  }

  selectedDateAllDay.innerHTML = `
    <div class="all-day-wrap">
      <div class="all-day-title">종일 일정</div>
      <div class="all-day-list">
        ${allDayItems.map((item) => renderAllDayItem(item)).join("")}
      </div>
    </div>
  `;
}

function isAllDayTimelineItem(dateKey, item) {
  if (item.type !== "schedule") return false;

  const noStartTime = !item.startTime;
  const noEndTime = !item.endTime;

  if (item.startDate < dateKey && item.endDate > dateKey) {
    return true;
  }

  if (item.startDate === dateKey && item.endDate > dateKey && noStartTime) {
    return true;
  }

  if (item.startDate < dateKey && item.endDate === dateKey && noEndTime) {
    return true;
  }

  if (
    item.startDate === dateKey &&
    item.endDate === dateKey &&
    noStartTime &&
    noEndTime
  ) {
    return true;
  }

  return false;
}

function renderAllDayItem(item) {
  const colorClass = `item-color-${item.color || "blue"}`;
  const repeatIcon =
    item.repeat && item.repeat !== "none"
      ? `<span class="all-day-repeat">↻</span>`
      : "";

  return `
    <div class="all-day-item ${colorClass}">
      <div class="all-day-main">
        <span class="all-day-type">일정</span>
        <span class="all-day-text">${escapeHtml(item.title)}</span>
        ${repeatIcon}
      </div>
      <div class="all-day-actions">
        <button class="edit-btn" data-action="edit-item" data-id="${item.id}" type="button">수정</button>
        <button class="delete-btn" data-action="delete-item" data-id="${item.id}" type="button">삭제</button>
      </div>
    </div>
  `;
}

function renderSelectedDateTimeline(dateKey, itemsForDate) {
  if (!selectedDateTimeline) return;

  const blocks = itemsForDate
    .filter((item) => !isAllDayTimelineItem(dateKey, item))
    .map((item) => buildTimelineBlock(dateKey, item))
    .filter(Boolean);

  if (blocks.length === 0) {
    selectedDateTimeline.innerHTML = `
      <div class="empty-message">이 날짜에는 시간 지정 항목이 없습니다.</div>
    `;
    return;
  }

  const laidOutBlocks = layoutTimelineBlocks(blocks);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const nowLineHtml = buildCurrentTimeLine(dateKey);

  selectedDateTimeline.innerHTML = `
    <div id="timelineBoard" class="timeline-board">
      <div class="timeline-scroll-area">
        <div class="timeline-hour-column">
          ${hours
            .map(
              (hour) => `
            <div class="timeline-hour-label">${formatHourLabel(hour)}</div>
          `,
            )
            .join("")}
        </div>

        <div id="timelineGridWrap" class="timeline-grid-wrap">
          <div class="timeline-grid-lines">
            ${hours.map(() => `<div class="timeline-grid-line"></div>`).join("")}
          </div>

          ${nowLineHtml}

          <div class="timeline-block-layer">
            ${laidOutBlocks.map((block) => renderPositionedTimelineBlock(block)).join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  scrollTimelineToNow(dateKey);
  startTimelineNowAutoRefresh(dateKey);
}

function buildCurrentTimeLine(dateKey) {
  const todayKey = formatDateKey(new Date());

  if (dateKey !== todayKey) return "";

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeText = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return `
    <div id="timelineNowLine" class="timeline-now-line" style="top: ${currentMinutes}px;">
      <div class="timeline-now-dot"></div>
      <div class="timeline-now-stroke"></div>
      <div class="timeline-now-label">${currentTimeText}</div>
    </div>
  `;
}

function updateTimelineNowLine(dateKey) {
  const todayKey = formatDateKey(new Date());
  const nowLine = document.getElementById("timelineNowLine");

  if (!nowLine) return;
  if (dateKey !== todayKey) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeText = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  nowLine.style.top = `${currentMinutes}px`;

  const label = nowLine.querySelector(".timeline-now-label");
  if (label) {
    label.textContent = currentTimeText;
  }
}

function startTimelineNowAutoRefresh(dateKey) {
  stopTimelineNowAutoRefresh();

  const todayKey = formatDateKey(new Date());
  if (dateKey !== todayKey) return;

  timelineNowTimer = setInterval(
    () => {
      updateTimelineNowLine(dateKey);
    },
    5 * 60 * 1000,
  );
}

function stopTimelineNowAutoRefresh() {
  if (timelineNowTimer) {
    clearInterval(timelineNowTimer);
    timelineNowTimer = null;
  }
}

function scrollTimelineToNow(dateKey) {
  const todayKey = formatDateKey(new Date());
  if (dateKey !== todayKey) return;

  requestAnimationFrame(() => {
    const scrollArea = document.querySelector(".timeline-scroll-area");
    if (!scrollArea) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const targetScrollTop = Math.max(currentMinutes - 180, 0);

    scrollArea.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });
  });
}

function buildTimelineBlock(dateKey, item) {
  if (item.type === "todo") {
    if (!item.dueTime) return null;

    const startMinutes = timeStringToMinutes(item.dueTime);
    const endMinutes = Math.min(startMinutes + 12, 1440);

    return {
      id: item.id,
      item,
      startMinutes,
      endMinutes,
      isTodoPoint: true,
    };
  }

  if (item.type === "schedule") {
    if (!isScheduleTimedOnDate(dateKey, item)) return null;

    let startMinutes = 0;
    let endMinutes = 1440;

    if (item.startDate === dateKey) {
      startMinutes = item.startTime ? timeStringToMinutes(item.startTime) : 0;
    }

    if (item.endDate === dateKey) {
      endMinutes = item.endTime ? timeStringToMinutes(item.endTime) : 1440;
    }

    if (item.startDate === dateKey && item.endDate === dateKey) {
      startMinutes = item.startTime ? timeStringToMinutes(item.startTime) : 0;

      endMinutes = item.endTime ? timeStringToMinutes(item.endTime) : 1440;
    }

    if (endMinutes <= startMinutes) {
      endMinutes = Math.min(startMinutes + 30, 1440);
    }

    return {
      id: item.id,
      item,
      startMinutes,
      endMinutes,
    };
  }

  return null;
}

function timeStringToMinutes(timeString) {
  const [hour, minute] = String(timeString).split(":").map(Number);
  return hour * 60 + minute;
}

function layoutTimelineBlocks(blocks) {
  const sorted = [...blocks].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return a.endMinutes - b.endMinutes;
  });

  const groups = [];
  let currentGroup = [];

  for (const block of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(block);
      continue;
    }

    const currentGroupEnd = Math.max(...currentGroup.map((x) => x.endMinutes));

    if (block.startMinutes < currentGroupEnd) {
      currentGroup.push(block);
    } else {
      groups.push(currentGroup);
      currentGroup = [block];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const result = [];

  groups.forEach((group) => {
    const columns = [];
    const laidOut = [];

    group.forEach((block) => {
      let assignedColumn = 0;

      while (true) {
        const lastEnd = columns[assignedColumn];

        if (lastEnd == null || lastEnd <= block.startMinutes) {
          columns[assignedColumn] = block.endMinutes;
          break;
        }

        assignedColumn++;
      }

      laidOut.push({
        ...block,
        column: assignedColumn,
      });
    });

    const totalColumns = Math.max(...laidOut.map((x) => x.column)) + 1;

    laidOut.forEach((block) => {
      result.push({
        ...block,
        totalColumns,
      });
    });
  });

  return result;
}

function renderPositionedTimelineBlock(block) {
  const item = block.item;
  const colorClass = `item-color-${item.color || "blue"}`;
  const repeatIcon =
    item.repeat && item.repeat !== "none"
      ? `<span class="timeline-repeat">↻</span>`
      : "";

  const top = block.startMinutes;
  const height = Math.max(block.endMinutes - block.startMinutes, 28);

  const widthPercent = 100 / block.totalColumns;
  const leftPercent = widthPercent * block.column;

  let timeText = "";

  if (item.type === "todo") {
    timeText = item.dueTime || "시간 없음";
  } else {
    const startText = formatTimelineTime(block.startMinutes);
    const endText = formatTimelineTime(block.endMinutes);
    timeText = `${startText} ~ ${endText}`;
  }

  if (block.isTodoPoint) {
    return `
    <div
      class="timeline-point ${colorClass}"
      style="
        top: ${top}px;
        left: calc(${leftPercent}% + 4px);
        width: calc(${widthPercent}% - 8px);
      "
    >
      <div class="timeline-point-dot"></div>
      <div class="timeline-point-content">
        <div class="timeline-point-main">
          <span class="timeline-type todo">할일</span>
          <span class="timeline-title">${escapeHtml(item.title)}</span>
          ${repeatIcon}
        </div>
        <div class="timeline-point-sub">
          <span class="timeline-time">${timeText}</span>
          ${item.tag ? `<span class="timeline-tag">${escapeHtml(item.tag)}</span>` : ""}
        </div>
        <div class="timeline-point-actions">
          <button class="edit-btn" data-action="edit-item" data-id="${item.id}" type="button">수정</button>
          <button class="delete-btn" data-action="delete-item" data-id="${item.id}" type="button">삭제</button>
        </div>
      </div>
    </div>
  `;
  }

  return `
  <div
    class="timeline-block ${colorClass}"
    style="
      top: ${top}px;
      height: ${height}px;
      left: calc(${leftPercent}% + 4px);
      width: calc(${widthPercent}% - 8px);
    "
  >
    <div class="timeline-block-main">
      <span class="timeline-type schedule">일정</span>
      <span class="timeline-title">${escapeHtml(item.title)}</span>
      ${repeatIcon}
    </div>

    <div class="timeline-block-sub">
      <span class="timeline-time">${timeText}</span>
      ${item.tag ? `<span class="timeline-tag">${escapeHtml(item.tag)}</span>` : ""}
    </div>

    <div class="timeline-block-actions">
      <button class="edit-btn" data-action="edit-item" data-id="${item.id}" type="button">수정</button>
      <button class="delete-btn" data-action="delete-item" data-id="${item.id}" type="button">삭제</button>
    </div>
  </div>
`;
}

function formatTimelineTime(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 1440));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  if (safeMinutes === 1440) return "24:00";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function renderSelectedDateExtraList(dateKey, itemsForDate) {
  if (!selectedDateItemList) return;

  const extraItems = itemsForDate.filter((item) => {
    if (item.type === "todo") {
      return !item.dueTime;
    }

    if (item.type === "schedule") {
      return !isScheduleTimedOnDate(dateKey, item);
    }

    return true;
  });

  if (extraItems.length === 0) {
    selectedDateItemList.innerHTML = "";
    return;
  }

  selectedDateItemList.innerHTML = `
    <div class="cardless-section-title">시간 미지정 / 종일 항목</div>
    ${extraItems.map((item) => renderSelectedCard(item)).join("")}
  `;
}

function isScheduleTimedOnDate(dateKey, item) {
  const isStartDate = item.startDate === dateKey;
  const isEndDate = item.endDate === dateKey;

  return (
    (isStartDate && !!item.startTime) ||
    (isEndDate && !!item.endTime) ||
    (item.startDate < dateKey && item.endDate > dateKey)
  );
}

function formatHourLabel(hour) {
  if (hour === 0) return "오전 12시";
  if (hour < 12) return `오전 ${hour}시`;
  if (hour === 12) return "오후 12시";
  return `오후 ${hour - 12}시`;
}

function renderTimelineItem(dateKey, item) {
  const colorClass = `item-color-${item.color || "blue"}`;
  const repeatIcon =
    item.repeat && item.repeat !== "none"
      ? `<span class="timeline-repeat">↻</span>`
      : "";

  let timeText = "";

  if (item.type === "todo") {
    timeText = item.dueTime || "시간 없음";
  } else {
    const startText =
      item.startDate === dateKey ? item.startTime || "00:00" : "00:00";

    const endText =
      item.endDate === dateKey ? item.endTime || "23:59" : "24:00";

    timeText = `${startText} ~ ${endText}`;
  }

  return `
    <div class="timeline-item ${colorClass}">
      <div class="timeline-item-main">
        <span class="timeline-type">${item.type === "todo" ? "할일" : "일정"}</span>
        <span class="timeline-title">${escapeHtml(item.title)}</span>
        ${repeatIcon}
      </div>
      <div class="timeline-item-sub">
        <span class="timeline-time">${timeText}</span>
        ${item.tag ? `<span class="timeline-tag">${escapeHtml(item.tag)}</span>` : ""}
      </div>
      <div class="timeline-item-actions">
        <button class="edit-btn" data-action="edit-item" data-id="${item.id}" type="button">수정</button>
        <button class="delete-btn" data-action="delete-item" data-id="${item.id}" type="button">삭제</button>
      </div>
    </div>
  `;
}

function closeDatePopup() {
  selectedDate = "";
  stopTimelineNowAutoRefresh();
  if (selectedDateAllDay) selectedDateAllDay.innerHTML = "";
  if (selectedDateTimeline) selectedDateTimeline.innerHTML = "";
  if (selectedDateItemList) selectedDateItemList.innerHTML = "";
  resetPopupQuickAddForm();
  calendarPopupOverlay?.classList.add("hidden");
  renderCalendar();
}

function getItemsForDate(dateKey) {
  return sortItems(items.filter((item) => isItemOnDate(dateKey, item)));
}

function isItemOnDate(dateKey, item) {
  if (item.type === "todo") return item.dueDate === dateKey;

  const target = new Date(`${dateKey}T00:00`);
  const start = new Date(`${item.startDate}T00:00`);
  const end = new Date(`${item.endDate}T00:00`);
  return target >= start && target <= end;
}

function sortItems(itemArray) {
  return [...itemArray].sort((a, b) => getSortDateTime(a) - getSortDateTime(b));
}

function getSortDateTime(item) {
  if (item.type === "todo") {
    return new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  }
  return new Date(makeDateTime(item.startDate, item.startTime || "00:00"));
}

function getTodoDiffMinutes(item) {
  const target = new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  const nowDate = new Date();
  return Math.floor((target - nowDate) / (1000 * 60));
}

function getTodoRemainText(item) {
  const target = new Date(makeDateTime(item.dueDate, item.dueTime || "23:59"));
  const nowDate = new Date();
  const diffMinutes = Math.floor((target - nowDate) / (1000 * 60));

  if (diffMinutes > 0) {
    const days = Math.floor(diffMinutes / (60 * 24));
    const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
    const minutes = diffMinutes % 60;

    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  }

  if (diffMinutes === 0) return "지금 마감";

  const pastMinutes = Math.abs(diffMinutes);
  const pastDays = Math.floor(pastMinutes / (60 * 24));
  const pastHours = Math.floor((pastMinutes % (60 * 24)) / 60);

  if (pastDays > 0) return `${pastDays}일 지남`;
  if (pastHours > 0) return `${pastHours}시간 지남`;
  return `${pastMinutes}분 지남`;
}

function getScheduleProgressText(item) {
  const nowDate = new Date();
  const start = new Date(
    makeDateTime(item.startDate, item.startTime || "00:00"),
  );
  const end = new Date(makeDateTime(item.endDate, item.endTime || "23:59"));

  if (nowDate < start) return "시작 전";
  if (nowDate > end) return "종료됨";
  return "진행 중";
}

function getNextStatus(currentStatus) {
  if (currentStatus === "pending") return "fail";
  if (currentStatus === "fail") return "success";
  return "pending";
}

function getStatusSymbol(status) {
  if (status === "fail") return "-";
  if (status === "success") return "✓";
  return "";
}

function getStatusText(status) {
  if (status === "fail") return "미완료";
  if (status === "success") return "완료";
  return "대기";
}

function getTodayString() {
  return formatDateKey(new Date());
}

function makeDateTime(date, time) {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

function formatDateKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatKoreanDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${year.slice(2)}년 ${Number(month)}월 ${Number(day)}일`;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openPlannerFormCard() {
  if (!plannerFormCard) return;

  isEditingInPopup = false;

  plannerFormLauncher?.classList.add("hidden");
  plannerFormCard.classList.remove("hidden");

  requestAnimationFrame(() => {
    plannerFormCard.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function closePlannerFormCard() {
  if (!plannerFormCard) return;

  isEditingInPopup = false;

  plannerFormCard.classList.add("hidden");
  plannerFormLauncher?.classList.remove("hidden");
}

function openEditPopup() {
  if (!plannerFormCard || !editPopupMount) return;

  isEditingInPopup = true;

  plannerFormLauncher?.classList.add("hidden");
  plannerFormCard.classList.remove("hidden");
  editPopupMount.appendChild(plannerFormCard);

  editPopupOverlay?.classList.remove("hidden");
}

function closeEditPopup() {
  if (!plannerFormCard || !plannerFormHome) return;

  isEditingInPopup = false;

  plannerFormHome.appendChild(plannerFormCard);
  plannerFormCard.classList.add("hidden");
  editPopupOverlay?.classList.add("hidden");

  plannerFormLauncher?.classList.remove("hidden");
}
