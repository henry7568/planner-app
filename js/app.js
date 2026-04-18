import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  makeDateTime,
  formatDateKey,
  formatKoreanDate,
  makeId,
  escapeHtml,
  getTodayString,
  formatMoney,
} from "./utils.js";
import {
  loadRemotePlannerData,
  queueSavePlannerData,
  savePlannerDataToCloud,
  saveLocalBackup,
  loadLocalBackup,
  loadFinanceLocal,
  saveFinanceLocal,
} from "./storage.js";
import { initAuth } from "./auth.js";

import {
  setupTimePickers,
  closeAllTimePickerMenus,
  setTimePickerValue,
  getTimeValue,
  applyTimeValue,
  getTimePickerByKey,
} from "./timePicker.js";

import {
  generateTodoSeries,
  generateScheduleSeries,
  getRepeatText,
} from "./repeat.js";

import { renderCard, renderSelectedCard } from "./renderItems.js";

import {
  saveEditedSingleItem as saveEditedSingleItemModule,
  saveTodoSeriesFromForm,
  saveScheduleSeriesFromForm,
  addItemFromSelectedDateData,
  getNextStatus,
  getStatusSymbol,
  getStatusText,
  toggleItemStatus,
  deleteItemById,
} from "./plannerItems.js";

import {
  configureCalendarModule,
  renderCalendar,
  selectCalendarDate,
  openDatePopup,
  closeDatePopup,
  getItemsForDate,
  isItemOnDate,
  sortItems,
  getTodoDiffMinutes,
} from "./calendar.js";

import {
  configureDashboardModule,
  renderDashboard,
  renderTodayList,
  openSummaryPopup,
  closeSummaryPopup,
  renderYearOptions,
  renderMonthOptions,
} from "./dashboard.js";

import {
  configureFinanceModule,
  initFinance,
  saveFinanceBudget,
  renderFinance,
  saveFinanceExpense,
  syncFinanceSubCategoryOptions,
  deleteFinanceExpense,
  startEditFinanceExpense,
  deleteEditingFinanceExpense,
  handleFinancePageChange,
} from "./finance.js";

import {
  configureFinanceOcrModule,
  analyzeFinanceReceiptImage,
} from "./financeOcr.js";

import {
  configurePlannerUiModule,
  setupTabs,
  switchTab,
  setupPlannerForm,
  updatePlannerFields,
  updateTodoRepeatUI,
  updateScheduleRepeatUI,
  updatePopupTodoRepeatUI,
  updatePopupScheduleRepeatUI,
  updatePopupFields,
  resetPopupQuickAddForm,
  openPopupQuickAddForm,
  closePopupQuickAddForm,
  resetPlannerForm,
  openPlannerFormCard,
  closePlannerFormCard,
  openEditPopup,
  closeEditPopup,
  startEdit,
  deleteEditingItem,
} from "./plannerUI.js";

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

let selectedFilterType = "";
let selectedFilterYear = "";
let selectedFilterMonth = "";
let currentTab = "dashboard";
let editingId = null;
let selectedDate = "";
let isAppInitialized = false;
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
const openPopupQuickAddBtn = document.getElementById("openPopupQuickAddBtn");
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
const popupItemColor = document.getElementById("popupItemColor");
const popupItemTag = document.getElementById("popupItemTag");
const popupTodoDate = document.getElementById("popupTodoDate");
const popupScheduleStartDate = document.getElementById(
  "popupScheduleStartDate",
);

const popupQuickAddForm = document.getElementById("popupQuickAddForm");
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

const FINANCE_STORAGE_KEY = "planner_finance_local_v1";

let financeData = {
  monthlyBudgets: {},
  expenses: [],
};

const financeMonthKey = document.getElementById("financeMonthKey");
const financePeriodStartDay = document.getElementById("financePeriodStartDay");
const financeBudgetAmount = document.getElementById("financeBudgetAmount");
const financeSaveBudgetBtn = document.getElementById("financeSaveBudgetBtn");

const financeCurrentPeriodLabel = document.getElementById(
  "financeCurrentPeriodLabel",
);
const financeMonthlyBudgetText = document.getElementById(
  "financeMonthlyBudgetText",
);
const financeTotalBudgetText = document.getElementById(
  "financeTotalBudgetText",
);
const financeRemainingBudgetText = document.getElementById(
  "financeRemainingBudgetText",
);
const financeTodaySpentText = document.getElementById("financeTodaySpentText");
const financeMonthlySpentText = document.getElementById(
  "financeMonthlySpentText",
);
const financeBudgetProgressText = document.getElementById(
  "financeBudgetProgressText",
);
const financeBudgetProgressBar = document.getElementById(
  "financeBudgetProgressBar",
);

const financeExpenseDate = document.getElementById("financeExpenseDate");
const financeExpenseTitle = document.getElementById("financeExpenseTitle");
const financeExpenseAmount = document.getElementById("financeExpenseAmount");
const financeExpenseCategory = document.getElementById(
  "financeExpenseCategory",
);
const financeSaveExpenseBtn = document.getElementById("financeSaveExpenseBtn");

const financeExpenseList = document.getElementById("financeExpenseList");
const financeCategorySummaryList = document.getElementById(
  "financeCategorySummaryList",
);

let financeEditingExpenseId = null;
let financePage = 1;
const FINANCE_PAGE_SIZE = 10;

const financeCancelExpenseEditBtn = document.getElementById(
  "financeCancelExpenseEditBtn",
);
const financeDeleteExpenseBtn = document.getElementById(
  "financeDeleteExpenseBtn",
);
const financeAnalyzeReceiptBtn = document.getElementById(
  "financeAnalyzeReceiptBtn",
);
const financeReceiptImageInput = document.getElementById(
  "financeReceiptImageInput",
);
const financePrevPageBtn = document.getElementById("financePrevPageBtn");
const financeNextPageBtn = document.getElementById("financeNextPageBtn");
const financePageText = document.getElementById("financePageText");

let currentUser = null;
let items = [];
let isRemoteLoading = false;
let saveTimer = null;

window.AppState = {
  get currentUser() {
    return currentUser;
  },
  set currentUser(value) {
    currentUser = value;
  },

  get items() {
    return items;
  },
  set items(value) {
    items = value;
  },

  get isRemoteLoading() {
    return isRemoteLoading;
  },
  set isRemoteLoading(value) {
    isRemoteLoading = value;
  },

  get saveTimer() {
    return saveTimer;
  },
  set saveTimer(value) {
    saveTimer = value;
  },

  get selectedDate() {
    return selectedDate;
  },
  set selectedDate(value) {
    selectedDate = value;
  },
};

window.AppRefs = {
  authLoadingScreen,
  authSection,
  appSection,
  showLoginTabBtn,
  showSignupTabBtn,
  loginFormWrap,
  signupFormWrap,
  loginEmail,
  loginPassword,
  signupEmail,
  signupPassword,
  signupPasswordConfirm,
  loginBtn,
  signupBtn,
  logoutBtn,
  currentUserEmail,
  authMessage,

  todoDueTimeTrigger,
  todoDueTimeMenu,
  todoDueTimeSearch,
  todoDueTimeOptions,
  todoDueTimeValue,
  todoDueTimeCustom,

  scheduleStartTimeTrigger,
  scheduleStartTimeMenu,
  scheduleStartTimeSearch,
  scheduleStartTimeOptions,
  scheduleStartTimeValue,
  scheduleStartTimeCustom,

  scheduleEndTimeTrigger,
  scheduleEndTimeMenu,
  scheduleEndTimeSearch,
  scheduleEndTimeOptions,
  scheduleEndTimeValue,
  scheduleEndTimeCustom,

  popupTodoTimeTrigger,
  popupTodoTimeMenu,
  popupTodoTimeSearch,
  popupTodoTimeOptions,
  popupTodoTimeValue,
  popupTodoTimeCustom,

  popupScheduleStartTimeTrigger,
  popupScheduleStartTimeMenu,
  popupScheduleStartTimeSearch,
  popupScheduleStartTimeOptions,
  popupScheduleStartTimeValue,
  popupScheduleStartTimeCustom,

  popupScheduleEndTimeTrigger,
  popupScheduleEndTimeMenu,
  popupScheduleEndTimeSearch,
  popupScheduleEndTimeOptions,
  popupScheduleEndTimeValue,
  popupScheduleEndTimeCustom,
};

window.FirebaseRefs = {
  auth,
  db,
};

window.AppConfig = {
  STORAGE_KEY,
  FINANCE_STORAGE_KEY,
};

configureCalendarModule({
  refs: {
    calendarTitle,
    calendarGrid,
    calendarPopupOverlay,
    selectedDateLabel,
    selectedDateAllDay,
    selectedDateTimeline,
    selectedDateItemList,
    popupScheduleEndDate,
  },

  getItems: () => items,

  getSelectedDate: () => selectedDate,
  setSelectedDate: (value) => {
    selectedDate = value;
  },

  getCalendarYear: () => calendarYear,
  getCalendarMonth: () => calendarMonth,

  getTimelineNowTimer: () => timelineNowTimer,
  setTimelineNowTimer: (value) => {
    timelineNowTimer = value;
  },

  resetPopupQuickAddForm,
  renderAll,
});

configureDashboardModule({
  refs: {
    totalCount,
    pendingCount,
    failCount,
    successCount,
    dashboardTodoCount,
    dashboardScheduleCount,
    dashboardTodayCount,
    dashboardUrgentTodoCount,
    achievementRate,
    achievementBarFill,
    achievementDesc,
    dashboardItemList,
    todayList,
    summaryPopupLabel,
    summaryPopupList,
    summaryPopupOverlay,
    yearFilter,
    monthFilter,
  },

  dashboardPageSize: DASHBOARD_PAGE_SIZE,

  getItems: () => items,

  getSelectedFilterType: () => selectedFilterType,
  getSelectedFilterYear: () => selectedFilterYear,
  getSelectedFilterMonth: () => selectedFilterMonth,

  setSelectedFilterYear: (value) => {
    selectedFilterYear = value;
  },
  setSelectedFilterMonth: (value) => {
    selectedFilterMonth = value;
  },

  getDashboardPage: () => dashboardPage,
  setDashboardPage: (value) => {
    dashboardPage = value;
  },
});

configureFinanceModule({
  refs: {
    financeMonthKey,
    financePeriodStartDay,
    financeBudgetAmount,
    financeSaveBudgetBtn,

    financeCurrentPeriodLabel,
    financeMonthlyBudgetText,
    financeTotalBudgetText,
    financeRemainingBudgetText,
    financeTodaySpentText,
    financeMonthlySpentText,
    financeBudgetProgressText,
    financeBudgetProgressBar,

    financeExpenseDate,
    financeExpenseTitle,
    financeExpenseAmount,
    financeExpenseCategory,
    financeSaveExpenseBtn,
    financeExpenseList,
    financeCategorySummaryList,

    financeCancelExpenseEditBtn,
    financeDeleteExpenseBtn,
    financePrevPageBtn,
    financeNextPageBtn,
    financePageText,

    financeAnalyzeReceiptBtn,
    financeReceiptImageInput,

    financeListMonthFilter: document.getElementById("financeListMonthFilter"),
    financeListCategoryFilter: document.getElementById(
      "financeListCategoryFilter",
    ),
    financeListPaymentFilter: document.getElementById(
      "financeListPaymentFilter",
    ),
    financeListSearchInput: document.getElementById("financeListSearchInput"),

    financeExpenseTime: document.getElementById("financeExpenseTime"),
    financeExpenseColor: document.getElementById("financeExpenseColor"),
    financeExpensePaymentMethod: document.getElementById(
      "financeExpensePaymentMethod",
    ),
    financeExpenseMerchant: document.getElementById("financeExpenseMerchant"),
    financeExpenseTag: document.getElementById("financeExpenseTag"),
    financeExpenseMemo: document.getElementById("financeExpenseMemo"),
    financeExpenseSubCategory: document.getElementById(
      "financeExpenseSubCategory",
    ),
    financeExpenseFormCard: document.getElementById("financeExpenseFormCard"),
    financeExpenseListCard: document.getElementById("financeExpenseListCard"),
  },

  financePageSize: FINANCE_PAGE_SIZE,

  getFinanceData: () => financeData,
  setFinanceData: (value) => {
    financeData = value;
  },

  getFinanceEditingExpenseId: () => financeEditingExpenseId,
  setFinanceEditingExpenseId: (value) => {
    financeEditingExpenseId = value;
  },

  getFinancePage: () => financePage,
  setFinancePage: (value) => {
    financePage = value;
  },
});

configureFinanceOcrModule({
  refs: {
    financeAnalyzeReceiptBtn,
    financeReceiptImageInput,

    financeExpenseDate,
    financeExpenseTime: document.getElementById("financeExpenseTime"),
    financeExpenseTitle,
    financeExpenseAmount,
    financeExpenseCategory,
    financeExpenseSubCategory: document.getElementById(
      "financeExpenseSubCategory",
    ),
    financeExpensePaymentMethod: document.getElementById(
      "financeExpensePaymentMethod",
    ),
    financeExpenseMerchant: document.getElementById("financeExpenseMerchant"),
    financeExpenseMemo: document.getElementById("financeExpenseMemo"),
  },

  getFinanceData: () => financeData,
  setFinanceData: (value) => {
    financeData = value;
  },

  renderFinance,
  syncFinanceSubCategoryOptions,
});

configurePlannerUiModule({
  refs: {
    bottomTabButtons,
    tabSections,

    itemType,
    titleInput,
    itemColor,
    itemTag,

    plannerFormLauncher,
    openPlannerFormBtn,
    plannerFormHome,
    plannerFormCard,
    plannerFormTitle,
    saveItemBtn,
    closePlannerFormBtn,
    cancelEditBtn,
    openPopupQuickAddBtn,
    editPopupOverlay,
    editPopupMount,
    closeEditPopupBtn,

    todoFields,
    scheduleFields,

    todoDueDate,
    todoRepeat,
    todoRepeatUntil,
    todoWeeklyDaysWrap,
    todoWeekdayInputs,
    todoRepeatIntervalWrap,
    todoRepeatInterval,

    scheduleStartDate,
    scheduleEndDate,
    scheduleRepeat,
    scheduleRepeatUntil,
    scheduleWeeklyDaysWrap,
    scheduleWeekdayInputs,
    scheduleRepeatIntervalWrap,
    scheduleRepeatInterval,

    popupItemType,
    popupTitleInput,
    popupItemColor,
    popupItemTag,
    popupTodoDate,
    popupScheduleStartDate,
    popupQuickAddForm,
    closePopupQuickAddBtn,

    popupTodoFields,
    popupTodoRepeat,
    popupTodoRepeatUntil,
    popupTodoWeeklyDaysWrap,
    popupTodoWeekdayInputs,
    popupTodoRepeatIntervalWrap,
    popupTodoRepeatInterval,

    popupScheduleFields,
    popupScheduleEndDate,
    popupScheduleRepeat,
    popupScheduleRepeatUntil,
    popupScheduleWeeklyDaysWrap,
    popupScheduleWeekdayInputs,
    popupScheduleRepeatIntervalWrap,
    popupScheduleRepeatInterval,

    deleteEditingItemBtn,
  },

  getItems: () => items,
  setItems: (value) => {
    items = value;
  },

  getEditingId: () => editingId,
  setEditingId: (value) => {
    editingId = value;
  },

  getSelectedDate: () => selectedDate,

  getIsEditingInPopup: () => isEditingInPopup,
  setIsEditingInPopup: (value) => {
    isEditingInPopup = value;
  },

  setCurrentTab: (value) => {
    currentTab = value;
  },

  applyTimeValue,
  queueSavePlannerData,
  renderAll,
  renderCalendar,
  renderTodayList,
  closeDatePopup,
  getItemsForDate,
  openDatePopup,
});

initAuth({ renderAll });
initAppOnce();

function initAppOnce() {
  if (isAppInitialized) return;
  isAppInitialized = true;

  setupTabs();
  setupTimePickers();
  setupPlannerForm();

  initFinance();

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

  openPopupQuickAddBtn?.addEventListener("click", openPopupQuickAddForm);

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
  closePopupQuickAddBtn?.addEventListener("click", closePopupQuickAddForm);

  financeSaveBudgetBtn?.addEventListener("click", saveFinanceBudget);
  financeMonthKey?.addEventListener("change", renderFinance);
  financePeriodStartDay?.addEventListener("input", renderFinance);
  financeSaveExpenseBtn?.addEventListener("click", saveFinanceExpense);
  financeExpenseCategory?.addEventListener("change", () => {
    syncFinanceSubCategoryOptions(financeExpenseCategory?.value || "");
  });

  document
    .getElementById("financeAnalyzeReceiptBtn")
    ?.addEventListener("click", analyzeFinanceReceiptImage);

  document
    .getElementById("financeListMonthFilter")
    ?.addEventListener("change", renderFinance);
  document
    .getElementById("financeListCategoryFilter")
    ?.addEventListener("change", renderFinance);
  document
    .getElementById("financeListPaymentFilter")
    ?.addEventListener("change", renderFinance);
  document
    .getElementById("financeListSearchInput")
    ?.addEventListener("input", renderFinance);

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

function renderAll() {
  renderYearOptions();
  renderMonthOptions();
  renderDashboard();
  renderTodayList();
  renderCalendar();
  renderFinance();
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

function handleDocumentClick(e) {
  const actionTarget = e.target.closest("[data-action]");
  const optionTarget = e.target.closest("[data-time-picker-option]");
  const pickerRoot = e.target.closest(".time-picker");

  if (optionTarget) {
    const key = optionTarget.dataset.timePickerOption;
    const value = optionTarget.dataset.value;
    setTimePickerValue(key, value, false);
    const picker = getTimePickerByKey(key);
    if (value !== "__custom__" && picker) {
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

  if (action === "open-edit-item" || action === "edit-item") {
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
    return;
  }

  if (action === "delete-finance-expense") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    deleteFinanceExpense(id);
    return;
  }

  if (action === "open-edit-finance-expense") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    startEditFinanceExpense(id);
    return;
  }
}

function addItemFromSelectedDate() {
  const nextItems = addItemFromSelectedDateData({
    items,
    selectedDate,
    popupItemType,
    popupTitleInput,
    popupItemColor,
    popupItemTag,
    popupTodoDate,
    popupTodoRepeat,
    popupTodoRepeatUntil,
    popupTodoWeekdayInputs,
    popupTodoRepeatInterval,
    popupScheduleStartDate,
    popupScheduleEndDate,
    popupScheduleRepeat,
    popupScheduleRepeatUntil,
    popupScheduleWeekdayInputs,
    popupScheduleRepeatInterval,
    getTimeValue,
  });

  if (nextItems === items) return;

  items = nextItems;
  queueSavePlannerData();
  renderAll();
  resetPopupQuickAddForm();
  openDatePopup(selectedDate);
}

function saveEditedSingleItem(type, title) {
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";

  const nextItems = saveEditedSingleItemModule({
    type,
    title,
    color,
    tag,
    editingId,
    items,
    todoDueDate,
    getTimeValue,
    todoRepeat,
    todoRepeatUntil,
    todoWeekdayInputs,
    todoRepeatInterval,
    scheduleStartDate,
    scheduleEndDate,
    scheduleRepeat,
    scheduleRepeatUntil,
    scheduleWeekdayInputs,
    scheduleRepeatInterval,
  });

  if (nextItems === items) return;

  items = nextItems;
  queueSavePlannerData();
  resetPlannerForm();
  renderAll();

  if (isEditingInPopup) {
    closeEditPopup();
  } else {
    closePlannerFormCard();
  }

  if (selectedDate) {
    const dayItems = getItemsForDate(selectedDate);

    if (dayItems.length === 0) {
      closeDatePopup();
    } else {
      openDatePopup(selectedDate);
    }
  }
}

function saveTodoSeries(title) {
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";

  const nextItems = saveTodoSeriesFromForm({
    items,
    title,
    color,
    tag,
    todoDueDate,
    getTimeValue,
    todoRepeat,
    todoRepeatUntil,
    todoWeekdayInputs,
    todoRepeatInterval,
  });

  if (nextItems === items) return;

  items = nextItems;
  queueSavePlannerData();
  resetPlannerForm();
  renderAll();
  closePlannerFormCard();
}

function saveScheduleSeries(title) {
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";

  const nextItems = saveScheduleSeriesFromForm({
    items,
    title,
    color,
    tag,
    scheduleStartDate,
    getTimeValue,
    scheduleEndDate,
    scheduleRepeat,
    scheduleRepeatUntil,
    scheduleWeekdayInputs,
    scheduleRepeatInterval,
  });

  if (nextItems === items) return;

  items = nextItems;
  queueSavePlannerData();
  resetPlannerForm();
  renderAll();
  closePlannerFormCard();
}

function toggleStatus(id) {
  items = toggleItemStatus(items, id);
  queueSavePlannerData();
  renderAll();

  if (selectedDate) {
    openDatePopup(selectedDate);
  }
}

function deleteItem(id) {
  const ok = confirm("정말 삭제할까요?");
  if (!ok) return;

  items = deleteItemById(items, id);

  if (editingId === id) {
    resetPlannerForm();
  }

  queueSavePlannerData();
  renderAll();

  if (selectedDate) {
    const dayItems = getItemsForDate(selectedDate);

    if (dayItems.length === 0) {
      closeDatePopup();
    } else {
      openDatePopup(selectedDate);
    }
  }
}
