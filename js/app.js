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
  getOccurrenceDateKeyFromItemId,
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
  applyRecurringScheduleEditScope,
  toggleRecurringScheduleSlotStatus,
  applyRecurringScheduleDeleteScope,
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
  saveFinanceAsset,
  resetFinanceExpenseForm,
  resetFinanceAssetForm,
  syncFinanceSubCategoryOptions,
  syncFinanceExpenseFormButtons,
  deleteFinanceExpense,
  deleteEditingFinanceExpense,
  deleteEditingFinanceAsset,
  startEditFinanceExpense,
  startEditFinanceAsset,
  handleFinancePageChange,
  openFinanceExpenseForm,
  openFinanceAssetForm,
  closeFinanceEditPopup,
} from "./finance.js";

import {
  configureFinanceOcrModule,
  analyzeFinanceReceiptImage,
  advanceFinanceOcrReviewQueue,
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

const GOOGLE_MAPS_API_KEY = "AIzaSyCnegQFRg--20jE4jGVThWTnhvOH4sMAiA";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const STORAGE_KEY = "planner_items_tabs_local_backup_v1";

let selectedFilterType = "";
let selectedFilterYear = "";
let selectedFilterMonth = "";
let currentTab = "home";
let currentHubGroup = "";
let editingId = null;
let selectedDate = "";
let isAppInitialized = false;
let timelineNowTimer = null;
let isEditingInPopup = false;
let scheduleDailyLocations = [];
let popupScheduleDailyLocations = [];
let activePlaceSelectMode = "single";

const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

let dashboardPage = 1;
const DASHBOARD_PAGE_SIZE = 5;

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
const dynamicLeftTabBtn = document.getElementById("dynamicLeftTabBtn");
const homeTabBtn = document.getElementById("homeTabBtn");
const dynamicRightTabBtn = document.getElementById("dynamicRightTabBtn");

const openScheduleHubBtn = document.getElementById("openScheduleHubBtn");
const openFinanceHubBtn = document.getElementById("openFinanceHubBtn");

const salaryGrossInput = document.getElementById("salaryGrossInput");
const salaryDeductionRateInput = document.getElementById(
  "salaryDeductionRateInput",
);
const salaryNonTaxableInput = document.getElementById("salaryNonTaxableInput");
const salaryBonusInput = document.getElementById("salaryBonusInput");

const salaryTotalPayText = document.getElementById("salaryTotalPayText");
const salaryTaxablePayText = document.getElementById("salaryTaxablePayText");
const salaryDeductionText = document.getElementById("salaryDeductionText");
const salaryNetPayText = document.getElementById("salaryNetPayText");

const HUB_TAB_MAP = {
  schedule: {
    left: {
      tab: "dashboard",
      label: "요약",
      icon: "📊",
    },
    right: {
      tab: "planner",
      label: "일정추가",
      icon: "➕",
    },
  },

  finance: {
    left: {
      tab: "finance",
      label: "대쉬보드",
      icon: "📊",
    },
    right: {
      tab: "salary",
      label: "유틸",
      icon: "🧰",
    },
  },
};

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
  assets: [],
};

const financeMonthKey = document.getElementById("financeMonthKey");
const financePeriodStartDay = document.getElementById("financePeriodStartDay");
const financeBudgetAmount = document.getElementById("financeBudgetAmount");
const financeSaveBudgetBtn = document.getElementById("financeSaveBudgetBtn");
const financeOpenExpenseFormBtn = document.getElementById(
  "financeOpenExpenseFormBtn",
);

const financeOpenAssetManageTabBtn = document.getElementById(
  "financeOpenAssetManageTabBtn",
);
const financeBackToDashboardBtn = document.getElementById(
  "financeBackToDashboardBtn",
);

const financeDashboardHomeSection = document.getElementById(
  "financeDashboardHomeSection",
);
const financeAssetManagePageSection = document.getElementById(
  "financeAssetManagePageSection",
);

const financeUtilityHomeSection = document.getElementById(
  "financeUtilityHomeSection",
);
const financeLedgerSection = document.getElementById("financeLedgerSection");
const financeSalarySection = document.getElementById("financeSalarySection");

const financeOpenLedgerSectionBtn = document.getElementById(
  "financeOpenLedgerSectionBtn",
);
const financeOpenSalarySectionBtn = document.getElementById(
  "financeOpenSalarySectionBtn",
);
const financeBackToUtilityHomeFromLedgerBtn = document.getElementById(
  "financeBackToUtilityHomeFromLedgerBtn",
);
const financeBackToUtilityHomeFromSalaryBtn = document.getElementById(
  "financeBackToUtilityHomeFromSalaryBtn",
);

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
const financeMonthlyIncomeText = document.getElementById(
  "financeMonthlyIncomeText",
);
const financeMonthlyNetText = document.getElementById("financeMonthlyNetText");
const financeBudgetProgressText = document.getElementById(
  "financeBudgetProgressText",
);
const financeBudgetProgressBar = document.getElementById(
  "financeBudgetProgressBar",
);
const financeSummaryTopCategoryText = document.getElementById(
  "financeSummaryTopCategoryText",
);
const financeSummaryExpenseCountText = document.getElementById(
  "financeSummaryExpenseCountText",
);

const financeExpenseFormCard = document.getElementById(
  "financeExpenseFormCard",
);
const financeTransactionType = document.getElementById(
  "financeTransactionType",
);
const financeExpenseDate = document.getElementById("financeExpenseDate");
const financeExpenseTime = document.getElementById("financeExpenseTime");
const financeExpenseTitle = document.getElementById("financeExpenseTitle");
const financeExpenseAmount = document.getElementById("financeExpenseAmount");
const financeExpenseCategory = document.getElementById(
  "financeExpenseCategory",
);
const financeExpenseSubCategory = document.getElementById(
  "financeExpenseSubCategory",
);
const financeExpensePaymentMethod = document.getElementById(
  "financeExpensePaymentMethod",
);
const financeExpenseMerchant = document.getElementById(
  "financeExpenseMerchant",
);
const financeExpenseTag = document.getElementById("financeExpenseTag");
const financeExpenseColor = document.getElementById("financeExpenseColor");
const financeExpenseRepeat = document.getElementById("financeExpenseRepeat");
const financeExpenseRepeatUntil = document.getElementById(
  "financeExpenseRepeatUntil",
);
const financeSaveExpenseBtn = document.getElementById("financeSaveExpenseBtn");

const financeExpenseListCard = document.getElementById(
  "financeExpenseListCard",
);
const financeExpenseList = document.getElementById("financeExpenseList");
const financeCategorySummaryList = document.getElementById(
  "financeCategorySummaryList",
);

const financeEditPopupOverlay = document.getElementById(
  "financeEditPopupOverlay",
);
const financeEditPopupMount = document.getElementById("financeEditPopupMount");
const closeFinanceEditPopupBtn = document.getElementById(
  "closeFinanceEditPopupBtn",
);

const financeAssetFormCard = document.getElementById("financeAssetFormCard");
const financeOpenAssetFormBtn = document.getElementById(
  "financeOpenAssetFormBtn",
);
const financeOpenExpenseFormFromAssetBtn = document.getElementById(
  "financeOpenExpenseFormFromAssetBtn",
);

const financeAssetCategory = document.getElementById("financeAssetCategory");
const financeAssetTitle = document.getElementById("financeAssetTitle");
const financeAssetAmount = document.getElementById("financeAssetAmount");
const financeAssetBaseDate = document.getElementById("financeAssetBaseDate");
const financeAssetRepeat = document.getElementById("financeAssetRepeat");
const financeAssetRepeatUntil = document.getElementById(
  "financeAssetRepeatUntil",
);
const financeAssetRepeatUntilToggleBtn = document.getElementById(
  "financeAssetRepeatUntilToggleBtn",
);
const financeAssetRepeatUntilNoneBtn = document.getElementById(
  "financeAssetRepeatUntilNoneBtn",
);
const financeSaveAssetBtn = document.getElementById("financeSaveAssetBtn");
const financeCancelAssetEditBtn = document.getElementById(
  "financeCancelAssetEditBtn",
);
const financeDeleteAssetBtn = document.getElementById("financeDeleteAssetBtn");
const financeTotalAssetText = document.getElementById("financeTotalAssetText");
const financeAssetList = document.getElementById("financeAssetList");
const financeAssetTransactionList = document.getElementById(
  "financeAssetTransactionList",
);

let financeEditingExpenseId = null;
let financeEditingAssetId = null;
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

const financeListMonthFilter = document.getElementById(
  "financeListMonthFilter",
);
const financeListFlowFilter = document.getElementById("financeListFlowFilter");
const financeListCategoryFilter = document.getElementById(
  "financeListCategoryFilter",
);
const financeListPaymentFilter = document.getElementById(
  "financeListPaymentFilter",
);
const financeListSortFilter = document.getElementById("financeListSortFilter");
const financeListSearchInput = document.getElementById(
  "financeListSearchInput",
);

const itemLocationAutocompleteMount = document.getElementById(
  "itemLocationAutocompleteMount",
);
const itemLocation = document.getElementById("itemLocation");
const itemLocationAddress = document.getElementById("itemLocationAddress");
const itemLocationPlaceId = document.getElementById("itemLocationPlaceId");

const popupItemLocation = document.getElementById("popupItemLocation");
const popupItemLocationAddress = document.getElementById(
  "popupItemLocationAddress",
);
const popupItemLocationPlaceId = document.getElementById(
  "popupItemLocationPlaceId",
);

const itemPlaceEmptyState = document.getElementById("itemPlaceEmptyState");
const itemPlaceChipWrap = document.getElementById("itemPlaceChipWrap");
const itemPlaceChip = document.getElementById("itemPlaceChip");
const itemPlaceChipText = document.getElementById("itemPlaceChipText");
const itemPlaceLink = document.getElementById("itemPlaceLink");
const openItemPlaceSearchBtn = document.getElementById(
  "openItemPlaceSearchBtn",
);
const changeItemPlaceBtn = document.getElementById("changeItemPlaceBtn");
const clearItemPlaceBtn = document.getElementById("clearItemPlaceBtn");

const popupPlaceEmptyState = document.getElementById("popupPlaceEmptyState");
const popupPlaceChipWrap = document.getElementById("popupPlaceChipWrap");
const popupPlaceChip = document.getElementById("popupPlaceChip");
const popupPlaceChipText = document.getElementById("popupPlaceChipText");
const popupPlaceLink = document.getElementById("popupPlaceLink");
const openPopupPlaceSearchBtn = document.getElementById(
  "openPopupPlaceSearchBtn",
);
const changePopupPlaceBtn = document.getElementById("changePopupPlaceBtn");
const clearPopupPlaceBtn = document.getElementById("clearPopupPlaceBtn");

const placeSearchModalOverlay = document.getElementById(
  "placeSearchModalOverlay",
);
const closePlaceSearchModalBtn = document.getElementById(
  "closePlaceSearchModalBtn",
);
const placeSearchModalTitle = document.getElementById("placeSearchModalTitle");
const placeSearchKeywordInput = document.getElementById(
  "placeSearchKeywordInput",
);
const placeSearchStatusText = document.getElementById("placeSearchStatusText");
const placeSearchResultList = document.getElementById("placeSearchResultList");

const scheduleDailyLocationList = document.getElementById(
  "scheduleDailyLocationList",
);
const popupScheduleDailyLocationList = document.getElementById(
  "popupScheduleDailyLocationList",
);
const openScheduleDailyLocationBtn = document.getElementById(
  "openScheduleDailyLocationBtn",
);
const openPopupScheduleDailyLocationBtn = document.getElementById(
  "openPopupScheduleDailyLocationBtn",
);

const appHomeLogoBtn = document.getElementById("appHomeLogoBtn");

const recurringEditScopeOverlay = document.getElementById(
  "recurringEditScopeOverlay",
);
const closeRecurringEditScopeBtn = document.getElementById(
  "closeRecurringEditScopeBtn",
);
const scopeOnlyThisBtn = document.getElementById("scopeOnlyThisBtn");
const scopeFutureBtn = document.getElementById("scopeFutureBtn");
const scopePastBtn = document.getElementById("scopePastBtn");
const scopeAllBtn = document.getElementById("scopeAllBtn");

const todoRepeatUntilToggleBtn = document.getElementById(
  "todoRepeatUntilToggleBtn",
);
const todoRepeatUntilNoneBtn = document.getElementById(
  "todoRepeatUntilNoneBtn",
);

const scheduleRepeatUntilToggleBtn = document.getElementById(
  "scheduleRepeatUntilToggleBtn",
);
const scheduleRepeatUntilNoneBtn = document.getElementById(
  "scheduleRepeatUntilNoneBtn",
);

const popupTodoRepeatUntilToggleBtn = document.getElementById(
  "popupTodoRepeatUntilToggleBtn",
);
const popupTodoRepeatUntilNoneBtn = document.getElementById(
  "popupTodoRepeatUntilNoneBtn",
);

const popupScheduleRepeatUntilToggleBtn = document.getElementById(
  "popupScheduleRepeatUntilToggleBtn",
);
const popupScheduleRepeatUntilNoneBtn = document.getElementById(
  "popupScheduleRepeatUntilNoneBtn",
);

const financeExpenseRepeatUntilToggleBtn = document.getElementById(
  "financeExpenseRepeatUntilToggleBtn",
);
const financeExpenseRepeatUntilNoneBtn = document.getElementById(
  "financeExpenseRepeatUntilNoneBtn",
);

const financeAssetManageSection = document.getElementById(
  "financeAssetManageSection",
);

const financeOpenAssetManageSectionBtn = document.getElementById(
  "financeOpenAssetManageSectionBtn",
);

let currentUser = null;
let items = [];
let isRemoteLoading = false;
let saveTimer = null;
let editingOccurrenceDateKey = "";
let pendingRecurringEditPayload = null;

let activePlaceTarget = "main";
let activeDailyLocationEditIndex = null;

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

  get financeData() {
    return financeData;
  },
  set financeData(value) {
    financeData = value;
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

window.setScheduleDailyLocations = function (value) {
  scheduleDailyLocations = Array.isArray(value) ? value : [];
  renderScheduleDailyLocationList("main");
};

window.setPopupScheduleDailyLocations = function (value) {
  popupScheduleDailyLocations = Array.isArray(value) ? value : [];
  renderScheduleDailyLocationList("popup");
};

window.showFinanceDashboardHome = showFinanceDashboardHome;
window.showFinanceAssetManagePage = showFinanceAssetManagePage;
window.showFinanceUtilityHome = showFinanceUtilityHome;
window.showFinanceLedgerSection = showFinanceLedgerSection;
window.showFinanceSalarySection = showFinanceSalarySection;

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
    financeOpenExpenseFormBtn,
    financeOpenAssetManageTabBtn,

    financeCurrentPeriodLabel,
    financeMonthlyBudgetText,
    financeTotalBudgetText,
    financeRemainingBudgetText,
    financeTodaySpentText,
    financeMonthlySpentText,
    financeMonthlyIncomeText,
    financeMonthlyNetText,
    financeBudgetProgressText,
    financeBudgetProgressBar,

    financeSummaryTopCategoryText,
    financeSummaryExpenseCountText,

    financeExpenseFormCard,
    financeTransactionType,
    financeExpenseDate,
    financeExpenseTime,
    financeExpenseTitle,
    financeExpenseAmount,
    financeExpenseCategory,
    financeExpenseSubCategory,
    financeExpensePaymentMethod,
    financeExpenseMerchant,
    financeExpenseTag,
    financeExpenseColor,
    financeExpenseRepeat,
    financeExpenseRepeatUntil,
    financeSaveExpenseBtn,
    financeCancelExpenseEditBtn,
    financeDeleteExpenseBtn,

    financeAssetFormCard,
    financeOpenAssetFormBtn,
    financeAssetCategory,
    financeAssetTitle,
    financeAssetAmount,
    financeAssetBaseDate,
    financeAssetRepeat,
    financeAssetRepeatUntil,
    financeAssetRepeatUntilToggleBtn,
    financeAssetRepeatUntilNoneBtn,
    financeSaveAssetBtn,
    financeCancelAssetEditBtn,
    financeDeleteAssetBtn,
    financeTotalAssetText,
    financeAssetList,
    financeAssetTransactionList,

    financeEditPopupOverlay,
    financeEditPopupMount,
    closeFinanceEditPopupBtn,

    financeExpenseListCard,
    financeExpenseList,
    financeCategorySummaryList,

    financeAnalyzeReceiptBtn,
    financeReceiptImageInput,

    financePrevPageBtn,
    financeNextPageBtn,
    financePageText,

    financeListMonthFilter,
    financeListFlowFilter,
    financeListCategoryFilter,
    financeListPaymentFilter,
    financeListSortFilter,
    financeListSearchInput,
  },

  getFinanceData: () => financeData,
  setFinanceData: (value) => {
    financeData = value;
  },

  getFinanceEditingExpenseId: () => financeEditingExpenseId,
  setFinanceEditingExpenseId: (value) => {
    financeEditingExpenseId = value;
  },

  getFinanceEditingAssetId: () => financeEditingAssetId,
  setFinanceEditingAssetId: (value) => {
    financeEditingAssetId = value;
  },

  getFinancePage: () => financePage,
  setFinancePage: (value) => {
    financePage = value;
  },

  financePageSize: FINANCE_PAGE_SIZE,
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
    itemLocation,
    itemLocationAddress,
    itemLocationPlaceId,

    popupItemLocation,
    popupItemLocationAddress,
    popupItemLocationPlaceId,

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
    syncRepeatUntilToggleState,
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
  syncPlaceUi,
  syncScheduleLocationMode,
  resetNestedTabState,
});

initAuth({ renderAll });
initAppOnce();

async function initAppOnce() {
  if (isAppInitialized) return;
  isAppInitialized = true;

  setupTabs();
  setupTimePickers();
  setupPlannerForm();

  initFinance();
  await initPlaceAutocompleteWidgets();

  bindPlaceUiEvents();
  syncPlaceUi("main");
  syncPlaceUi("popup");
  syncScheduleLocationMode("main");
  syncScheduleLocationMode("popup");

  deleteEditingItemBtn?.addEventListener("click", () => {
    handleDeleteCurrentItem();
  });

  closeRecurringEditScopeBtn?.addEventListener(
    "click",
    closeRecurringEditScopePopup,
  );

  recurringEditScopeOverlay?.addEventListener("click", (e) => {
    if (e.target === recurringEditScopeOverlay) {
      closeRecurringEditScopePopup();
    }
  });

  scopeOnlyThisBtn?.addEventListener("click", () => {
    if (pendingRecurringEditPayload?.mode === "delete") {
      applyRecurringScheduleDelete("only_this");
    } else {
      applyRecurringScheduleScope("only_this");
    }
  });

  scopeFutureBtn?.addEventListener("click", () => {
    if (pendingRecurringEditPayload?.mode === "delete") {
      applyRecurringScheduleDelete("future");
    } else {
      applyRecurringScheduleScope("future");
    }
  });

  scopePastBtn?.addEventListener("click", () => {
    if (pendingRecurringEditPayload?.mode === "delete") {
      applyRecurringScheduleDelete("past");
    } else {
      applyRecurringScheduleScope("past");
    }
  });

  scopeAllBtn?.addEventListener("click", () => {
    if (pendingRecurringEditPayload?.mode === "delete") {
      applyRecurringScheduleDelete("all");
    } else {
      applyRecurringScheduleScope("all");
    }
  });

  appHomeLogoBtn?.addEventListener("click", () => {
    enterHomeTab();
  });

  scheduleStartDate?.addEventListener("change", () => {
    syncScheduleLocationMode("main");
  });

  scheduleEndDate?.addEventListener("change", () => {
    syncScheduleLocationMode("main");
  });

  popupScheduleStartDate?.addEventListener("change", () => {
    syncScheduleLocationMode("popup");
  });

  popupScheduleEndDate?.addEventListener("change", () => {
    syncScheduleLocationMode("popup");
  });

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

  openScheduleHubBtn?.addEventListener("click", () => {
    openHubGroup("schedule");
  });

  openFinanceHubBtn?.addEventListener("click", () => {
    openHubGroup("finance");
  });

  homeTabBtn?.addEventListener("click", () => {
    enterHomeTab();
  });

  [
    salaryGrossInput,
    salaryDeductionRateInput,
    salaryNonTaxableInput,
    salaryBonusInput,
  ].forEach((input) => {
    input?.addEventListener("input", calculateSalaryPreview);
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

  popupItemType?.addEventListener("change", () => {
    updatePopupFields();
    syncScheduleLocationMode("popup");
  });

  popupTodoRepeat?.addEventListener("change", updatePopupTodoRepeatUI);
  popupScheduleRepeat?.addEventListener("change", updatePopupScheduleRepeatUI);
  popupAddItemBtn?.addEventListener("click", addItemFromSelectedDate);
  closePopupQuickAddBtn?.addEventListener("click", closePopupQuickAddForm);

  financeSaveBudgetBtn?.addEventListener("click", saveFinanceBudget);
  financeOpenExpenseFormBtn?.addEventListener("click", openFinanceExpenseForm);
  financeOpenExpenseFormFromAssetBtn?.addEventListener("click", () => {
    showFinanceAssetManagePage();
    openFinanceExpenseForm();
  });
  financeOpenAssetFormBtn?.addEventListener("click", openFinanceAssetForm);
  financeSaveAssetBtn?.addEventListener("click", saveFinanceAsset);

  financeOpenAssetManageTabBtn?.addEventListener("click", () => {
    showFinanceAssetManagePage();
  });

  financeBackToDashboardBtn?.addEventListener("click", () => {
    showFinanceDashboardHome();
  });

  financeOpenLedgerSectionBtn?.addEventListener("click", () => {
    showFinanceLedgerSection();
  });

  financeOpenSalarySectionBtn?.addEventListener("click", () => {
    showFinanceSalarySection();
  });

  financeBackToUtilityHomeFromLedgerBtn?.addEventListener("click", () => {
    showFinanceUtilityHome();
  });

  financeBackToUtilityHomeFromSalaryBtn?.addEventListener("click", () => {
    showFinanceUtilityHome();
  });

  financeMonthKey?.addEventListener("change", renderFinance);
  financePeriodStartDay?.addEventListener("input", renderFinance);

  financeAssetRepeat?.addEventListener("change", () => {
    const showRepeatExtras = (financeAssetRepeat?.value || "none") !== "none";

    if (financeAssetRepeatUntil) {
      financeAssetRepeatUntil.disabled = !showRepeatExtras;
      if (!showRepeatExtras) {
        financeAssetRepeatUntil.value = "";
      }
    }

    syncRepeatUntilToggleState("financeAsset");
  });

  financeAssetRepeatUntilToggleBtn?.addEventListener("click", () => {
    const dateInput = financeAssetRepeatUntil;
    const valueBtn = financeAssetRepeatUntilNoneBtn;
    const toggleBtn = financeAssetRepeatUntilToggleBtn;

    if (!dateInput || !valueBtn || !toggleBtn) return;
    if ((financeAssetRepeat?.value || "none") === "none") return;

    const isNoneMode = dateInput.classList.contains("hidden");

    if (isNoneMode) {
      dateInput.classList.remove("hidden");
      valueBtn.classList.add("hidden");
      toggleBtn.textContent = "없음 사용";
      return;
    }

    dateInput.value = "";
    dateInput.classList.add("hidden");
    valueBtn.classList.remove("hidden");
    toggleBtn.textContent = "날짜 사용";
  });

  financeAssetRepeatUntilNoneBtn?.addEventListener("click", () => {
    const dateInput = financeAssetRepeatUntil;
    const valueBtn = financeAssetRepeatUntilNoneBtn;
    const toggleBtn = financeAssetRepeatUntilToggleBtn;

    if (!dateInput || !valueBtn || !toggleBtn) return;

    valueBtn.classList.add("hidden");
    dateInput.classList.remove("hidden");
    toggleBtn.textContent = "없음 사용";
  });

  financeSaveExpenseBtn?.addEventListener("click", () => {
    const result = saveFinanceExpense();

    if (result?.ok && result.mode === "create") {
      advanceFinanceOcrReviewQueue();
    }
  });

  financeTransactionType?.addEventListener("change", () => {
    syncFinanceExpenseFormButtons();
  });

  financeExpenseCategory?.addEventListener("change", () => {
    syncFinanceSubCategoryOptions(financeExpenseCategory?.value || "");
  });

  financeCancelExpenseEditBtn?.addEventListener("click", () => {
    resetFinanceExpenseForm();
  });

  financeDeleteExpenseBtn?.addEventListener("click", () => {
    deleteEditingFinanceExpense();
  });

  financeCancelAssetEditBtn?.addEventListener("click", () => {
    resetFinanceAssetForm();
  });

  financeDeleteAssetBtn?.addEventListener("click", () => {
    deleteEditingFinanceAsset();
  });

  closeFinanceEditPopupBtn?.addEventListener("click", () => {
    closeFinanceEditPopup();
  });

  financeEditPopupOverlay?.addEventListener("click", (e) => {
    if (e.target === financeEditPopupOverlay) {
      closeFinanceEditPopup();
    }
  });

  financeAnalyzeReceiptBtn?.addEventListener(
    "click",
    analyzeFinanceReceiptImage,
  );

  financeListMonthFilter?.addEventListener("change", renderFinance);
  financeListFlowFilter?.addEventListener("change", renderFinance);
  financeListCategoryFilter?.addEventListener("change", renderFinance);
  financeListPaymentFilter?.addEventListener("change", renderFinance);
  financeListSortFilter?.addEventListener("change", renderFinance);
  financeListSearchInput?.addEventListener("input", renderFinance);

  financePrevPageBtn?.addEventListener("click", () => {
    handleFinancePageChange(-1);
  });

  financeNextPageBtn?.addEventListener("click", () => {
    handleFinancePageChange(1);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllTimePickerMenus();
      closeDatePopup();
      closeSummaryPopup();
      closeFinanceEditPopup();
    }
  });

  document.addEventListener("click", handleDocumentClick);

  renderYearOptions();
  renderMonthOptions();
  calculateSalaryPreview();
  renderAll();
  closePlannerFormCard();
  enterHomeTab();
  bindRepeatUntilToggleControls();
}

function renderAll() {
  renderYearOptions();
  renderMonthOptions();
  renderDashboard();
  renderTodayList();
  renderCalendar();
  renderFinance();
}

function enterHomeTab() {
  currentHubGroup = "";

  if (dynamicLeftTabBtn) {
    dynamicLeftTabBtn.dataset.tab = "";
    dynamicLeftTabBtn.innerHTML = `
      <span class="tab-icon">◀</span>
      <span class="tab-text">왼쪽</span>
    `;
    dynamicLeftTabBtn.classList.add("hidden");
  }

  if (dynamicRightTabBtn) {
    dynamicRightTabBtn.dataset.tab = "";
    dynamicRightTabBtn.innerHTML = `
      <span class="tab-icon">▶</span>
      <span class="tab-text">오른쪽</span>
    `;
    dynamicRightTabBtn.classList.add("hidden");
  }

  switchTab("home");
}

function hideAllFinanceDashboardSections() {
  financeDashboardHomeSection?.classList.add("hidden");
  financeAssetManagePageSection?.classList.add("hidden");
}

function showFinanceDashboardHome() {
  hideAllFinanceDashboardSections();
  financeDashboardHomeSection?.classList.remove("hidden");
}

function showFinanceAssetManagePage() {
  hideAllFinanceDashboardSections();
  financeAssetManagePageSection?.classList.remove("hidden");
}

function hideAllFinanceUtilitySections() {
  financeUtilityHomeSection?.classList.add("hidden");
  financeLedgerSection?.classList.add("hidden");
  financeSalarySection?.classList.add("hidden");
}

function showFinanceUtilityHome() {
  hideAllFinanceUtilitySections();
  financeUtilityHomeSection?.classList.remove("hidden");
}

function showFinanceLedgerSection() {
  hideAllFinanceUtilitySections();
  financeLedgerSection?.classList.remove("hidden");
}

function showFinanceSalarySection() {
  hideAllFinanceUtilitySections();
  financeSalarySection?.classList.remove("hidden");
}

function resetNestedTabState(tabName) {
  if (tabName === "finance") {
    showFinanceDashboardHome();
    return;
  }

  if (tabName === "salary") {
    showFinanceUtilityHome();
    return;
  }

  if (tabName === "planner") {
    closePlannerFormCard();
  }
}

function openHubGroup(groupName) {
  const group = HUB_TAB_MAP[groupName];
  if (!group) return;

  currentHubGroup = groupName;

  if (dynamicLeftTabBtn) {
    dynamicLeftTabBtn.dataset.tab = group.left.tab;
    dynamicLeftTabBtn.innerHTML = `
      <span class="tab-icon">${group.left.icon}</span>
      <span class="tab-text">${group.left.label}</span>
    `;
    dynamicLeftTabBtn.classList.remove("hidden");
  }

  if (dynamicRightTabBtn) {
    dynamicRightTabBtn.dataset.tab = group.right.tab;
    dynamicRightTabBtn.innerHTML = `
      <span class="tab-icon">${group.right.icon}</span>
      <span class="tab-text">${group.right.label}</span>
    `;
    dynamicRightTabBtn.classList.remove("hidden");
  }

  switchTab(group.left.tab);
}

function calculateSalaryPreview() {
  const gross = Math.max(0, Number(salaryGrossInput?.value) || 0);
  const bonus = Math.max(0, Number(salaryBonusInput?.value) || 0);
  const nonTaxable = Math.max(0, Number(salaryNonTaxableInput?.value) || 0);
  const deductionRate = Math.max(
    0,
    Math.min(100, Number(salaryDeductionRateInput?.value) || 0),
  );

  const totalPay = gross + bonus;
  const taxablePay = Math.max(0, totalPay - nonTaxable);
  const deductionAmount = Math.round(taxablePay * (deductionRate / 100));
  const netPay = Math.max(0, totalPay - deductionAmount);

  if (salaryTotalPayText) {
    salaryTotalPayText.textContent = formatMoney(totalPay);
  }

  if (salaryTaxablePayText) {
    salaryTaxablePayText.textContent = formatMoney(taxablePay);
  }

  if (salaryDeductionText) {
    salaryDeductionText.textContent = formatMoney(deductionAmount);
  }

  if (salaryNetPayText) {
    salaryNetPayText.textContent = formatMoney(netPay);
  }
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
    const editingItem = items.find(
      (item) => item.id === String(editingId).split("__")[0],
    );

    const isRecurringScheduleEdit =
      editingItem &&
      editingItem.type === "schedule" &&
      editingItem.repeat &&
      editingItem.repeat !== "none" &&
      editingOccurrenceDateKey;

    if (isRecurringScheduleEdit) {
      openRecurringEditScopePopup({
        title,
        editingId,
        occurrenceDateKey: editingOccurrenceDateKey,
      });
      return;
    }

    saveEditedSingleItem(type, title);
    return;
  }

  if (type === "todo") {
    saveTodoSeries(title);
  } else {
    saveScheduleSeries(title);
  }
}

function handleDeleteCurrentItem() {
  if (!editingId) return;

  const baseItem = items.find(
    (item) => item.id === String(editingId).split("__")[0],
  );

  const isRecurringScheduleDelete =
    baseItem &&
    baseItem.type === "schedule" &&
    baseItem.repeat &&
    baseItem.repeat !== "none" &&
    editingOccurrenceDateKey;

  if (isRecurringScheduleDelete) {
    openRecurringDeleteScopePopup({
      mode: "delete",
      editingId,
      occurrenceDateKey: editingOccurrenceDateKey,
    });
    return;
  }

  deleteEditingItem();
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

    editingOccurrenceDateKey = getOccurrenceDateKeyFromItemId(id) || "";
    startEdit(id);
    openEditPopup();
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

  if (action === "open-edit-finance-expense") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    startEditFinanceExpense(id);
    return;
  }

  if (action === "open-edit-finance-asset") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    startEditFinanceAsset(id);
    return;
  }

  if (action === "select-place-result") {
    const index = Number(actionTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0) return;
    applyPlaceResultSelection(index);
    return;
  }

  if (action === "edit-daily-location") {
    const mode = actionTarget.dataset.mode === "popup" ? "popup" : "main";
    const index = Number(actionTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0) return;
    startEditDailyLocation(mode, index);
    return;
  }

  if (action === "remove-daily-location") {
    const mode = actionTarget.dataset.mode === "popup" ? "popup" : "main";
    const index = Number(actionTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0) return;
    removeDailyLocation(mode, index);
    return;
  }
}

function addItemFromSelectedDate() {
  const popupIsMultiDaySchedule =
    popupItemType?.value === "schedule" &&
    isMultiDayScheduleRange(
      popupScheduleStartDate?.value || "",
      popupScheduleEndDate?.value || "",
    );

  const normalizedDailyLocations = popupIsMultiDaySchedule
    ? normalizeDailyLocationEntries(
        popupScheduleDailyLocations,
        popupScheduleStartDate?.value || "",
        popupScheduleEndDate?.value || "",
      )
    : [];

  const primaryLocation = popupIsMultiDaySchedule
    ? getPrimaryLocationFromDailyLocations(normalizedDailyLocations)
    : {
        location: popupItemLocation?.value || "",
        locationAddress: popupItemLocationAddress?.value || "",
        locationPlaceId: popupItemLocationPlaceId?.value || "",
      };

  const nextItems = addItemFromSelectedDateData({
    items,
    selectedDate,
    popupItemType,
    popupTitleInput,
    popupItemColor,
    popupItemTag,
    popupItemLocation: { value: primaryLocation.location || "" },
    popupItemLocationAddress: { value: primaryLocation.locationAddress || "" },
    popupItemLocationPlaceId: { value: primaryLocation.locationPlaceId || "" },
    popupDailyLocations: normalizedDailyLocations,
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
  calculateSalaryPreview();
  renderAll();
  resetPopupQuickAddForm();
  openDatePopup(selectedDate);
}

function saveEditedSingleItem(type, title) {
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";

  const isMultiDaySchedule =
    type === "schedule" &&
    isMultiDayScheduleRange(
      scheduleStartDate?.value || "",
      scheduleEndDate?.value || "",
    );

  const normalizedDailyLocations =
    type === "schedule" && isMultiDaySchedule
      ? normalizeDailyLocationEntries(
          scheduleDailyLocations,
          scheduleStartDate?.value || "",
          scheduleEndDate?.value || "",
        )
      : [];

  const primaryLocation =
    type === "schedule" && isMultiDaySchedule
      ? getPrimaryLocationFromDailyLocations(normalizedDailyLocations)
      : getLocationPayload(
          itemLocation,
          itemLocationAddress,
          itemLocationPlaceId,
        );

  const nextItems = saveEditedSingleItemModule({
    type,
    title,
    color,
    tag,
    location: primaryLocation.location || "",
    locationAddress: primaryLocation.locationAddress || "",
    locationPlaceId: primaryLocation.locationPlaceId || "",
    dailyLocations: normalizedDailyLocations,
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
  const { location, locationAddress, locationPlaceId } = getLocationPayload(
    itemLocation,
    itemLocationAddress,
    itemLocationPlaceId,
  );

  const nextItems = saveTodoSeriesFromForm({
    items,
    title,
    color,
    tag,
    location,
    locationAddress,
    locationPlaceId,
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

  const isMultiDaySchedule = isMultiDayScheduleRange(
    scheduleStartDate?.value || "",
    scheduleEndDate?.value || "",
  );

  const normalizedDailyLocations = isMultiDaySchedule
    ? normalizeDailyLocationEntries(
        scheduleDailyLocations,
        scheduleStartDate?.value || "",
        scheduleEndDate?.value || "",
      )
    : [];

  const primaryLocation = isMultiDaySchedule
    ? getPrimaryLocationFromDailyLocations(normalizedDailyLocations)
    : getLocationPayload(
        itemLocation,
        itemLocationAddress,
        itemLocationPlaceId,
      );

  const nextItems = saveScheduleSeriesFromForm({
    items,
    title,
    color,
    tag,
    location: primaryLocation.location || "",
    locationAddress: primaryLocation.locationAddress || "",
    locationPlaceId: primaryLocation.locationPlaceId || "",
    dailyLocations: normalizedDailyLocations,
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
  const [targetId, occurrenceDateKey = ""] = String(id || "").split("__");
  const baseItem = items.find((item) => item.id === targetId);

  if (
    baseItem &&
    baseItem.type === "schedule" &&
    baseItem.repeat === "weekly_days" &&
    occurrenceDateKey
  ) {
    items = toggleRecurringScheduleSlotStatus(items, id);
  } else {
    items = toggleItemStatus(items, targetId);
  }

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

async function loadGoogleMapsPlacesLibrary() {
  if (window.google?.maps?.places?.PlaceAutocompleteElement) {
    return true;
  }

  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "여기에_구글맵_API_KEY") {
    console.warn("Google Maps API 키가 설정되지 않았습니다.");
    return false;
  }

  if (!document.getElementById("googleMapsScript")) {
    const script = document.createElement("script");
    script.id = "googleMapsScript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
  }

  if (window.google?.maps?.importLibrary) {
    await google.maps.importLibrary("places");
  }

  return !!window.google?.maps?.places?.PlaceAutocompleteElement;
}

async function initPlaceAutocompleteWidgets() {
  const loaded = await loadGoogleMapsPlacesLibrary();
  if (!loaded) return;

  createPlaceAutocompleteWidget({
    mode: "main",
    mountEl: itemLocationAutocompleteMount,
    locationInput: itemLocation,
    addressInput: itemLocationAddress,
    placeIdInput: itemLocationPlaceId,
    placeholder: "장소 검색",
  });

  createPlaceAutocompleteWidget({
    mode: "popup",
    mountEl: popupItemLocationAutocompleteMount,
    locationInput: popupItemLocation,
    addressInput: popupItemLocationAddress,
    placeIdInput: popupItemLocationPlaceId,
    placeholder: "장소 검색",
  });

  createPlaceAutocompleteWidget({
    mode: "modal",
    mountEl: placeModalAutocompleteMount,
    locationInput:
      activePlaceTarget === "popup" ? popupItemLocation : itemLocation,
    addressInput:
      activePlaceTarget === "popup"
        ? popupItemLocationAddress
        : itemLocationAddress,
    placeIdInput:
      activePlaceTarget === "popup"
        ? popupItemLocationPlaceId
        : itemLocationPlaceId,
    placeholder: "장소 검색",
  });
}

function createPlaceAutocompleteWidget({
  mode,
  mountEl,
  locationInput,
  addressInput,
  placeIdInput,
  placeholder = "장소 검색",
}) {
  if (!mountEl || !window.google?.maps?.places?.PlaceAutocompleteElement) {
    return;
  }

  mountEl.innerHTML = "";

  const autocompleteEl = new google.maps.places.PlaceAutocompleteElement({
    placeholder,
  });

  mountEl.appendChild(autocompleteEl);

  autocompleteEl.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  autocompleteEl.addEventListener("gmp-select", async (e) => {
    e.stopPropagation();

    const placePrediction = e.placePrediction;
    if (!placePrediction) return;

    const place = placePrediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "id"],
    });

    const selectedPlace = {
      label: place.displayName || "",
      address: place.formattedAddress || "",
      placeId: place.id || "",
    };

    if (mode === "modal") {
      const targetMode = activePlaceTarget === "popup" ? "popup" : "main";

      if (activePlaceSelectMode === "daily") {
        const dateInput = document.getElementById("placeSearchDateInput");
        const selectedDate = dateInput?.value || "";
        const { startDate, endDate } = getScheduleDateRange(targetMode);

        if (!selectedDate) {
          alert("적용 시작 날짜를 선택하세요.");
          dateInput?.focus();
          return;
        }

        const target = getScheduleDailyLocationsTarget(targetMode);
        const current = Array.isArray(target.list) ? [...target.list] : [];

        const next = normalizeDailyLocationEntries(
          [
            ...current.filter((item) => item.date !== selectedDate),
            {
              date: selectedDate,
              label: selectedPlace.label,
              address: selectedPlace.address,
              placeId: selectedPlace.placeId,
            },
          ],
          startDate,
          endDate,
        );

        target.set(next);
        renderScheduleDailyLocationList(targetMode);
        closePlaceSearchModal();
        return;
      }

      const uiRefs = getPlaceUiRefs(targetMode);

      if (uiRefs.locationInput) {
        uiRefs.locationInput.value = selectedPlace.label;
      }
      if (uiRefs.addressInput) {
        uiRefs.addressInput.value = selectedPlace.address;
      }
      if (uiRefs.placeIdInput) {
        uiRefs.placeIdInput.value = selectedPlace.placeId;
      }

      syncPlaceUi(targetMode);
      closePlaceSearchModal();
      return;
    }

    if (locationInput) {
      locationInput.value = selectedPlace.label;
    }

    if (addressInput) {
      addressInput.value = selectedPlace.address;
    }

    if (placeIdInput) {
      placeIdInput.value = selectedPlace.placeId;
    }

    finalizePlaceSelection(mode);
  });
}

function getLocationPayload(inputEl, addressEl, placeIdEl) {
  return {
    location: inputEl?.value || "",
    locationAddress: addressEl?.value || "",
    locationPlaceId: placeIdEl?.value || "",
  };
}

function bindPlaceUiEvents() {
  openItemPlaceSearchBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    activePlaceTarget = "main";
    activePlaceSelectMode = "single";
    openPlaceSearchModal("main");
  });

  changeItemPlaceBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    activePlaceTarget = "main";
    activePlaceSelectMode = "single";
    openPlaceSearchModal("main");
  });

  clearItemPlaceBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearPlaceSelection("main");
  });

  itemPlaceChip?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPlaceLink("main");
  });

  openPopupPlaceSearchBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    activePlaceTarget = "popup";
    activePlaceSelectMode = "single";
    openPlaceSearchModal("popup");
  });

  changePopupPlaceBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    activePlaceTarget = "popup";
    activePlaceSelectMode = "single";
    openPlaceSearchModal("popup");
  });

  clearPopupPlaceBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearPlaceSelection("popup");
  });

  popupPlaceChip?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPlaceLink("popup");
  });

  openScheduleDailyLocationBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    activePlaceTarget = "main";
    activePlaceSelectMode = "daily";
    openPlaceSearchModal("main");
  });

  openPopupScheduleDailyLocationBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    activePlaceTarget = "popup";
    activePlaceSelectMode = "daily";
    openPlaceSearchModal("popup");
  });

  closePlaceSearchModalBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closePlaceSearchModal();
  });

  placeSearchModalOverlay?.addEventListener("click", (e) => {
    if (e.target === placeSearchModalOverlay) {
      closePlaceSearchModal();
    }
  });

  placeSearchKeywordInput?.addEventListener("input", (e) => {
    searchPlaceResults(e.target.value);
  });
}

function getPlaceUiRefs(mode) {
  if (mode === "popup") {
    return {
      emptyState: popupPlaceEmptyState,
      chipWrap: popupPlaceChipWrap,
      chipText: popupPlaceChipText,
      link: popupPlaceLink,
      locationInput: popupItemLocation,
      addressInput: popupItemLocationAddress,
      placeIdInput: popupItemLocationPlaceId,
    };
  }

  return {
    emptyState: itemPlaceEmptyState,
    chipWrap: itemPlaceChipWrap,
    chipText: itemPlaceChipText,
    link: itemPlaceLink,
    locationInput: itemLocation,
    addressInput: itemLocationAddress,
    placeIdInput: itemLocationPlaceId,
  };
}

function openPlaceSearchModal(mode) {
  activePlaceTarget = mode;

  const dateRow = document.getElementById("placeSearchDateRow");
  const dateInput = document.getElementById("placeSearchDateInput");

  if (placeSearchModalTitle) {
    if (activePlaceSelectMode === "daily") {
      placeSearchModalTitle.textContent =
        activeDailyLocationEditIndex !== null
          ? "날짜별 장소 수정"
          : "날짜별 장소 선택";
    } else {
      placeSearchModalTitle.textContent = "항목 장소 선택";
    }
  }

  if (placeSearchKeywordInput) {
    placeSearchKeywordInput.value = "";
  }

  if (placeSearchStatusText) {
    placeSearchStatusText.textContent =
      activePlaceSelectMode === "daily" && activeDailyLocationEditIndex !== null
        ? "수정할 장소를 검색해서 다시 선택하세요."
        : "검색어를 입력하면 장소 목록이 표시됩니다.";
  }

  if (placeSearchResultList) {
    placeSearchResultList.innerHTML = `
      <div class="place-empty-result">검색어를 입력하세요.</div>
    `;
    placeSearchResultList._items = [];
  }

  if (activePlaceSelectMode === "daily") {
    const { startDate, endDate } = getScheduleDateRange(mode);
    const target = getScheduleDailyLocationsTarget(mode);
    const normalized = normalizeDailyLocationEntries(
      target.list,
      startDate,
      endDate,
    );

    dateRow?.classList.remove("hidden");

    if (dateInput) {
      dateInput.min = startDate || "";
      dateInput.max = endDate || "";

      const editingItem =
        activeDailyLocationEditIndex !== null
          ? normalized[activeDailyLocationEditIndex] || null
          : null;

      const preferredDate =
        editingItem?.date ||
        getNextAvailableDailyLocationDate(mode, normalized) ||
        startDate ||
        "";

      dateInput.value = preferredDate;
    }
  } else {
    dateRow?.classList.add("hidden");

    if (dateInput) {
      dateInput.value = "";
      dateInput.min = "";
      dateInput.max = "";
    }
  }

  placeSearchModalOverlay?.classList.remove("hidden");

  requestAnimationFrame(() => {
    if (activePlaceSelectMode === "daily" && !placeSearchKeywordInput?.value) {
      placeSearchKeywordInput?.focus();
      return;
    }

    placeSearchKeywordInput?.focus();
  });
}

function closePlaceSearchModal() {
  const dateRow = document.getElementById("placeSearchDateRow");
  const dateInput = document.getElementById("placeSearchDateInput");

  placeSearchModalOverlay?.classList.add("hidden");

  if (placeSearchKeywordInput) {
    placeSearchKeywordInput.value = "";
  }

  if (placeSearchStatusText) {
    placeSearchStatusText.textContent =
      "검색어를 입력하면 장소 목록이 표시됩니다.";
  }

  if (placeSearchResultList) {
    placeSearchResultList.innerHTML = `
      <div class="place-empty-result">검색어를 입력하세요.</div>
    `;
    placeSearchResultList._items = [];
  }

  dateRow?.classList.add("hidden");

  if (dateInput) {
    dateInput.value = "";
    dateInput.min = "";
    dateInput.max = "";
  }

  activeDailyLocationEditIndex = null;
}

function finalizePlaceSelection(mode) {
  syncPlaceUi(mode);
  closePlaceSearchModal();
}

function clearPlaceSelection(mode) {
  const { locationInput, addressInput, placeIdInput } = getPlaceUiRefs(mode);

  if (locationInput) locationInput.value = "";
  if (addressInput) addressInput.value = "";
  if (placeIdInput) placeIdInput.value = "";

  syncPlaceUi(mode);
}

async function applyPlaceResultSelection(index) {
  const items = Array.isArray(placeSearchResultList?._items)
    ? placeSearchResultList._items
    : [];

  const selected = items[index];
  const placePrediction = selected?.placePrediction;

  if (!placePrediction) return;

  try {
    const place = placePrediction.toPlace();

    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "id"],
    });

    const selectedPlace = {
      label: place.displayName || selected.label || "",
      address: place.formattedAddress || selected.secondaryText || "",
      placeId: place.id || "",
    };

    const targetMode = activePlaceTarget === "popup" ? "popup" : "main";

    if (activePlaceSelectMode === "daily") {
      addDailyLocationEntry(targetMode, selectedPlace);
      closePlaceSearchModal();
      return;
    }

    const uiRefs = getPlaceUiRefs(targetMode);

    if (uiRefs.locationInput) {
      uiRefs.locationInput.value = selectedPlace.label;
    }

    if (uiRefs.addressInput) {
      uiRefs.addressInput.value = selectedPlace.address;
    }

    if (uiRefs.placeIdInput) {
      uiRefs.placeIdInput.value = selectedPlace.placeId;
    }

    finalizePlaceSelection(targetMode);
  } catch (error) {
    console.error("장소 선택 반영 오류:", error);
    alert("선택한 장소를 반영하는 중 오류가 발생했습니다.");
  }
}

function syncPlaceUi(mode) {
  const { emptyState, chipWrap, chipText, link, locationInput, addressInput } =
    getPlaceUiRefs(mode);

  const location = locationInput?.value || "";
  const address = addressInput?.value || "";

  if (!location) {
    emptyState?.classList.remove("hidden");
    chipWrap?.classList.add("hidden");

    if (chipText) chipText.textContent = "";
    if (link) {
      link.classList.add("hidden");
      link.href = "#";
    }
    return;
  }

  emptyState?.classList.add("hidden");
  chipWrap?.classList.remove("hidden");

  if (chipText) {
    chipText.textContent = location;
  }

  if (link) {
    const query = encodeURIComponent(address || location);
    link.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
    link.classList.remove("hidden");
  }
}

function openPlaceLink(mode) {
  const { link } = getPlaceUiRefs(mode);
  if (!link || link.classList.contains("hidden")) return;
  window.open(link.href, "_blank", "noopener,noreferrer");
}

function updateBodyModalLock() {
  const hasOpenPopup = !!document.querySelector(".popup-overlay:not(.hidden)");
  document.body.classList.toggle("modal-open", hasOpenPopup);
  document.documentElement.classList.toggle("modal-open", hasOpenPopup);
}

function observePopupOverlayState() {
  const overlays = document.querySelectorAll(".popup-overlay");
  if (!overlays.length) {
    updateBodyModalLock();
    return;
  }

  const observer = new MutationObserver(() => {
    updateBodyModalLock();
  });

  overlays.forEach((overlay) => {
    observer.observe(overlay, {
      attributes: true,
      attributeFilter: ["class"],
    });
  });

  updateBodyModalLock();
}

function getScheduleDailyLocationsTarget(mode) {
  if (mode === "popup") {
    return {
      list: popupScheduleDailyLocations,
      set(value) {
        popupScheduleDailyLocations = value;
      },
      wrap: popupScheduleDailyLocationList,
    };
  }

  return {
    list: scheduleDailyLocations,
    set(value) {
      scheduleDailyLocations = value;
    },
    wrap: scheduleDailyLocationList,
  };
}

function renderScheduleDailyLocationList(mode) {
  const target = getScheduleDailyLocationsTarget(mode);
  const { startDate, endDate } = getScheduleDateRange(mode);
  const list = normalizeDailyLocationEntries(target.list, startDate, endDate);

  target.set(list);

  if (!target.wrap) return;

  if (!list.length) {
    target.wrap.innerHTML = `
      <div class="empty-message">아직 날짜별 장소가 없습니다.</div>
    `;
    return;
  }

  target.wrap.innerHTML = list
    .map(
      (item, index) => `
        <div class="daily-location-card">
          <div class="daily-location-card-top">
            <div class="daily-location-date">${formatKoreanDate(item.date)}부터</div>

            <div class="daily-location-actions">
              <button
                type="button"
                class="secondary-btn place-mini-btn"
                data-action="edit-daily-location"
                data-mode="${mode}"
                data-index="${index}"
              >
                수정
              </button>

              <button
                type="button"
                class="delete-btn"
                data-action="remove-daily-location"
                data-mode="${mode}"
                data-index="${index}"
              >
                삭제
              </button>
            </div>
          </div>

          <div class="daily-location-name">${escapeHtml(item.label || "")}</div>
          <div class="daily-location-address">${escapeHtml(item.address || "")}</div>
        </div>
      `,
    )
    .join("");
}

function addDailyLocationEntry(mode, place) {
  const target = getScheduleDailyLocationsTarget(mode);
  const { startDate, endDate } = getScheduleDateRange(mode);

  const dateInput = document.getElementById("placeSearchDateInput");
  const selectedDate = dateInput?.value || "";

  if (!startDate || !endDate) {
    alert("먼저 일정의 시작 날짜와 종료 날짜를 입력하세요.");
    return;
  }

  if (!selectedDate) {
    alert("적용 시작 날짜를 선택하세요.");
    dateInput?.focus();
    return;
  }

  if (selectedDate < startDate || selectedDate > endDate) {
    alert("선택한 날짜는 일정 기간 안에 있어야 합니다.");
    dateInput?.focus();
    return;
  }

  const current = Array.isArray(target.list) ? [...target.list] : [];
  const normalizedCurrent = normalizeDailyLocationEntries(
    current,
    startDate,
    endDate,
  );

  const nextBase =
    activeDailyLocationEditIndex !== null
      ? normalizedCurrent.filter(
          (_, index) => index !== activeDailyLocationEditIndex,
        )
      : normalizedCurrent.filter((item) => item.date !== selectedDate);

  const next = normalizeDailyLocationEntries(
    [
      ...nextBase.filter((item) => item.date !== selectedDate),
      {
        date: selectedDate,
        label: place.label || "",
        address: place.address || "",
        placeId: place.placeId || "",
      },
    ],
    startDate,
    endDate,
  );

  target.set(next);
  renderScheduleDailyLocationList(mode);
  activeDailyLocationEditIndex = null;
}

function removeDailyLocation(mode, index) {
  const target = getScheduleDailyLocationsTarget(mode);
  const { startDate, endDate } = getScheduleDateRange(mode);

  const current = normalizeDailyLocationEntries(
    target.list,
    startDate,
    endDate,
  );

  if (!Number.isInteger(index) || index < 0 || index >= current.length) {
    return;
  }

  const next = current.filter((_, currentIndex) => currentIndex !== index);

  target.set(next);
  renderScheduleDailyLocationList(mode);

  if (
    activePlaceSelectMode === "daily" &&
    activePlaceTarget === mode &&
    activeDailyLocationEditIndex === index
  ) {
    activeDailyLocationEditIndex = null;
  }
}

function getNextAvailableDailyLocationDate(mode, currentList) {
  const start =
    mode === "popup" ? popupScheduleStartDate?.value : scheduleStartDate?.value;

  const end =
    mode === "popup" ? popupScheduleEndDate?.value : scheduleEndDate?.value;

  if (!start || !end) return "";

  const used = new Set((currentList || []).map((item) => item.date));
  let cursor = new Date(`${start}T00:00`);
  const endDate = new Date(`${end}T00:00`);

  while (cursor <= endDate) {
    const key = formatDateKey(cursor);
    if (!used.has(key)) return key;
    cursor.setDate(cursor.getDate() + 1);
  }

  return "";
}

function getRepresentativeLocation(item) {
  if (Array.isArray(item.dailyLocations) && item.dailyLocations.length > 0) {
    const first = item.dailyLocations[0];
    const extraCount = item.dailyLocations.length - 1;
    return extraCount > 0
      ? `${first.label} 외 ${extraCount}곳`
      : first.label || "";
  }

  return item.location || "";
}

function startEditDailyLocation(mode, index) {
  const target = getScheduleDailyLocationsTarget(mode);
  const { startDate, endDate } = getScheduleDateRange(mode);
  const current = normalizeDailyLocationEntries(
    target.list,
    startDate,
    endDate,
  );
  const editingItem = current[index];

  if (!editingItem) return;

  activePlaceTarget = mode;
  activePlaceSelectMode = "daily";
  activeDailyLocationEditIndex = index;

  openPlaceSearchModal(mode);

  requestAnimationFrame(() => {
    const dateInput = document.getElementById("placeSearchDateInput");
    if (dateInput) {
      dateInput.value = editingItem.date || "";
    }

    if (placeSearchStatusText) {
      placeSearchStatusText.textContent = `${formatKoreanDate(editingItem.date)}부터 적용될 새 장소를 검색해서 선택하세요.`;
    }
  });
}

async function searchPlaceResults(keyword) {
  const query = String(keyword || "").trim();

  if (!query) {
    if (placeSearchStatusText) {
      placeSearchStatusText.textContent =
        "검색어를 입력하면 장소 목록이 표시됩니다.";
    }
    if (placeSearchResultList) {
      placeSearchResultList.innerHTML = `
        <div class="place-empty-result">검색어를 입력하세요.</div>
      `;
      placeSearchResultList._items = [];
    }
    return;
  }

  if (!window.google?.maps?.places?.AutocompleteSuggestion) {
    if (placeSearchStatusText) {
      placeSearchStatusText.textContent = "Places 검색 준비가 되지 않았습니다.";
    }
    return;
  }

  try {
    if (placeSearchStatusText) {
      placeSearchStatusText.textContent = "검색 중...";
    }

    const { suggestions } =
      await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
        {
          input: query,
          language: "ko",
        },
      );

    const items = Array.isArray(suggestions)
      ? suggestions.slice(0, 8).map((item) => {
          const prediction = item.placePrediction;
          return {
            label: prediction?.text?.toString?.() || "",
            secondaryText: prediction?.secondaryText?.toString?.() || "",
            placePrediction: prediction,
          };
        })
      : [];

    if (!items.length) {
      if (placeSearchStatusText) {
        placeSearchStatusText.textContent = "검색 결과가 없습니다.";
      }
      if (placeSearchResultList) {
        placeSearchResultList.innerHTML = `
          <div class="place-empty-result">일치하는 장소가 없습니다.</div>
        `;
        placeSearchResultList._items = [];
      }
      return;
    }

    if (placeSearchStatusText) {
      placeSearchStatusText.textContent = `${items.length}개의 장소를 찾았습니다.`;
    }

    if (placeSearchResultList) {
      placeSearchResultList.innerHTML = items
        .map(
          (item, index) => `
            <button
              type="button"
              class="place-result-card"
              data-action="select-place-result"
              data-index="${index}"
            >
              <div class="place-result-main">
                <div class="place-result-icon">📍</div>
                <div class="place-result-text">
                  <div class="place-result-name">${escapeHtml(item.label)}</div>
                  <div class="place-result-address">${escapeHtml(item.secondaryText)}</div>
                </div>
              </div>
            </button>
          `,
        )
        .join("");

      placeSearchResultList._items = items;
    }
  } catch (error) {
    console.error("장소 검색 오류:", error);
    if (placeSearchStatusText) {
      placeSearchStatusText.textContent = "장소 검색 중 오류가 발생했습니다.";
    }
    if (placeSearchResultList) {
      placeSearchResultList.innerHTML = `
        <div class="place-empty-result">장소 검색 중 오류가 발생했습니다.</div>
      `;
      placeSearchResultList._items = [];
    }
  }
}

function isMultiDayScheduleRange(startDate, endDate) {
  if (!startDate || !endDate) return false;
  return startDate !== endDate;
}

function getPrimaryLocationFromDailyLocations(dailyLocations) {
  if (!Array.isArray(dailyLocations) || dailyLocations.length === 0) {
    return {
      location: "",
      locationAddress: "",
      locationPlaceId: "",
    };
  }

  const sorted = [...dailyLocations].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const first = sorted[0] || {};

  return {
    location: first.label || "",
    locationAddress: first.address || "",
    locationPlaceId: first.placeId || "",
  };
}

function syncScheduleLocationMode(mode) {
  const isPopup = mode === "popup";

  const startInput = isPopup ? popupScheduleStartDate : scheduleStartDate;
  const endInput = isPopup ? popupScheduleEndDate : scheduleEndDate;

  const singleWrap = document.getElementById(
    isPopup ? "popupSingleLocationSection" : "singleLocationSection",
  );
  const dailyWrap = document.getElementById(
    isPopup
      ? "popupScheduleDailyLocationsSection"
      : "scheduleDailyLocationsSection",
  );
  const helperText = document.getElementById(
    isPopup ? "popupLocationModeHelperText" : "locationModeHelperText",
  );

  const locationInput = isPopup ? popupItemLocation : itemLocation;
  const locationAddressInput = isPopup
    ? popupItemLocationAddress
    : itemLocationAddress;
  const locationPlaceIdInput = isPopup
    ? popupItemLocationPlaceId
    : itemLocationPlaceId;

  const target = getScheduleDailyLocationsTarget(mode);
  const normalized = normalizeDailyLocationEntries(
    target.list,
    startInput?.value || "",
    endInput?.value || "",
  );

  target.set(normalized);

  const isMultiDay = isMultiDayScheduleRange(
    startInput?.value || "",
    endInput?.value || "",
  );

  if (!isMultiDay) {
    singleWrap?.classList.remove("hidden");
    dailyWrap?.classList.add("hidden");

    if (normalized.length > 0 && !locationInput?.value) {
      const primary = getPrimaryLocationFromDailyLocations(normalized);

      if (locationInput) locationInput.value = primary.location;
      if (locationAddressInput)
        locationAddressInput.value = primary.locationAddress;
      if (locationPlaceIdInput)
        locationPlaceIdInput.value = primary.locationPlaceId;
    }

    if (helperText) {
      helperText.textContent = "하루 일정은 기본 장소 기능을 사용합니다.";
    }

    syncPlaceUi(isPopup ? "popup" : "main");
    renderScheduleDailyLocationList(mode);
    return;
  }

  singleWrap?.classList.add("hidden");
  dailyWrap?.classList.remove("hidden");

  if (normalized.length === 0 && locationInput?.value && startInput?.value) {
    const seeded = [
      {
        date: startInput.value,
        label: locationInput.value || "",
        address: locationAddressInput?.value || "",
        placeId: locationPlaceIdInput?.value || "",
      },
    ];

    target.set(seeded);
  }

  if (helperText) {
    helperText.textContent =
      "여러 날 일정은 날짜별 장소 변경 시점 기준으로 자동 적용됩니다.";
  }

  renderScheduleDailyLocationList(mode);
  syncPlaceUi(isPopup ? "popup" : "main");
}

function getScheduleDateRange(mode) {
  if (mode === "popup") {
    return {
      startDate: popupScheduleStartDate?.value || "",
      endDate: popupScheduleEndDate?.value || "",
    };
  }

  return {
    startDate: scheduleStartDate?.value || "",
    endDate: scheduleEndDate?.value || "",
  };
}

function normalizeDailyLocationEntries(entries, startDate, endDate) {
  if (!Array.isArray(entries)) return [];

  const map = new Map();

  entries.forEach((entry) => {
    if (!entry || !entry.date) return;
    if (startDate && entry.date < startDate) return;
    if (endDate && entry.date > endDate) return;

    map.set(entry.date, {
      date: entry.date,
      label: entry.label || "",
      address: entry.address || "",
      placeId: entry.placeId || "",
    });
  });

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function getEffectiveDailyLocationForDate(dailyLocations, dateKey) {
  if (
    !Array.isArray(dailyLocations) ||
    dailyLocations.length === 0 ||
    !dateKey
  ) {
    return null;
  }

  const sorted = [...dailyLocations].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  let current = null;

  for (const entry of sorted) {
    if (entry.date <= dateKey) {
      current = entry;
      continue;
    }
    break;
  }

  return current;
}

function syncRepeatNoEndInput(repeatSelect, repeatUntilInput, noEndCheckbox) {
  if (!repeatSelect || !repeatUntilInput || !noEndCheckbox) return;

  const repeatValue = repeatSelect.value || "none";
  const isRepeatEnabled = repeatValue !== "none";

  noEndCheckbox.disabled = !isRepeatEnabled;

  if (!isRepeatEnabled) {
    noEndCheckbox.checked = false;
    repeatUntilInput.value = "";
    repeatUntilInput.disabled = true;
    return;
  }

  if (noEndCheckbox.checked) {
    repeatUntilInput.value = "";
    repeatUntilInput.disabled = true;
  } else {
    repeatUntilInput.disabled = false;
  }
}

function bindRepeatNoEndControls() {
  const controls = [
    [todoRepeat, todoRepeatUntil, todoRepeatNoEnd],
    [scheduleRepeat, scheduleRepeatUntil, scheduleRepeatNoEnd],
    [popupTodoRepeat, popupTodoRepeatUntil, popupTodoRepeatNoEnd],
    [popupScheduleRepeat, popupScheduleRepeatUntil, popupScheduleRepeatNoEnd],
    [
      financeExpenseRepeat,
      financeExpenseRepeatUntil,
      financeExpenseRepeatNoEnd,
    ],
  ];

  controls.forEach(([repeatSelect, repeatUntilInput, noEndCheckbox]) => {
    if (!repeatSelect || !repeatUntilInput || !noEndCheckbox) return;

    repeatSelect.addEventListener("change", () => {
      syncRepeatNoEndInput(repeatSelect, repeatUntilInput, noEndCheckbox);
    });

    noEndCheckbox.addEventListener("change", () => {
      syncRepeatNoEndInput(repeatSelect, repeatUntilInput, noEndCheckbox);
    });

    syncRepeatNoEndInput(repeatSelect, repeatUntilInput, noEndCheckbox);
  });
}

function closeRecurringEditScopePopup() {
  recurringEditScopeOverlay?.classList.add("hidden");
  pendingRecurringEditPayload = null;

  const titleEl = recurringEditScopeOverlay?.querySelector(".popup-title");
  const subTextEl = recurringEditScopeOverlay?.querySelector(".popup-subtext");

  if (titleEl) {
    titleEl.textContent = "반복 일정 적용 범위";
  }

  if (subTextEl) {
    subTextEl.textContent = "수정 내용을 어느 범위까지 적용할지 선택하세요.";
  }

  if (scopeOnlyThisBtn) {
    scopeOnlyThisBtn.textContent = "해당 일정에만 적용";
  }

  if (scopeFutureBtn) {
    scopeFutureBtn.textContent = "해당 일정 이후에 적용";
  }

  if (scopePastBtn) {
    scopePastBtn.textContent = "해당 일정 이전에 적용";
  }

  if (scopeAllBtn) {
    scopeAllBtn.textContent = "전체 일정에 적용";
  }
}

function openRecurringEditScopePopup(payload) {
  pendingRecurringEditPayload = payload;
  recurringEditScopeOverlay?.classList.remove("hidden");
}

function getEditedSchedulePayload(title) {
  return {
    type: "schedule",
    title,
    color: itemColor?.value || "blue",
    tag: itemTag?.value.trim() || "",
    location: itemLocation?.value || "",
    locationAddress: itemLocationAddress?.value || "",
    locationPlaceId: itemLocationPlaceId?.value || "",
    dailyLocations: Array.isArray(scheduleDailyLocations)
      ? scheduleDailyLocations.map((x) => ({ ...x }))
      : [],
    startDate: scheduleStartDate?.value || "",
    startTime: getTimeValue("scheduleStart"),
    endDate: scheduleEndDate?.value || "",
    endTime: getTimeValue("scheduleEnd"),
    repeat: scheduleRepeat?.value || "none",
    repeatUntil: scheduleRepeatUntil?.value || "",
    weeklyDays: [...scheduleWeekdayInputs]
      .filter((input) => input.checked)
      .map((input) => Number(input.value)),
    intervalDays: Math.max(1, Number(scheduleRepeatInterval?.value) || 1),
    isRecurring: (scheduleRepeat?.value || "none") !== "none",
  };
}

function applyRecurringScheduleScope(scope) {
  if (!pendingRecurringEditPayload) return;

  const { title, editingId, occurrenceDateKey } = pendingRecurringEditPayload;
  const editedData = getEditedSchedulePayload(title);

  items = applyRecurringScheduleEditScope({
    items,
    editingId,
    occurrenceDateKey,
    scope,
    editedData,
  });

  queueSavePlannerData();
  renderAll();
  resetPlannerForm();
  closeEditPopup();
  closeRecurringEditScopePopup();
}

function openRecurringDeleteScopePopup(payload) {
  pendingRecurringEditPayload = payload;

  const titleEl = recurringEditScopeOverlay?.querySelector(".popup-title");
  const subTextEl = recurringEditScopeOverlay?.querySelector(".popup-subtext");

  if (titleEl) {
    titleEl.textContent = "반복 일정 삭제 범위";
  }

  if (subTextEl) {
    subTextEl.textContent = "삭제를 어느 범위까지 적용할지 선택하세요.";
  }

  if (scopeOnlyThisBtn) {
    scopeOnlyThisBtn.textContent = "해당 일정만 삭제";
  }

  if (scopeFutureBtn) {
    scopeFutureBtn.textContent = "해당 일정 이후 삭제";
  }

  if (scopePastBtn) {
    scopePastBtn.textContent = "해당 일정 이전 삭제";
  }

  if (scopeAllBtn) {
    scopeAllBtn.textContent = "전체 일정 삭제";
  }

  recurringEditScopeOverlay?.classList.remove("hidden");
}

function applyRecurringScheduleDelete(scope) {
  if (!pendingRecurringEditPayload) return;

  const { editingId, occurrenceDateKey } = pendingRecurringEditPayload;

  items = applyRecurringScheduleDeleteScope({
    items,
    editingId,
    occurrenceDateKey,
    scope,
  });

  queueSavePlannerData();
  renderAll();
  resetPlannerForm();
  closeEditPopup();
  closeRecurringEditScopePopup();
}

const repeatUntilToggleMap = {
  todo: {
    repeatSelect: todoRepeat,
    input: todoRepeatUntil,
    toggleBtn: todoRepeatUntilToggleBtn,
    valueBtn: todoRepeatUntilNoneBtn,
  },
  schedule: {
    repeatSelect: scheduleRepeat,
    input: scheduleRepeatUntil,
    toggleBtn: scheduleRepeatUntilToggleBtn,
    valueBtn: scheduleRepeatUntilNoneBtn,
  },
  popupTodo: {
    repeatSelect: popupTodoRepeat,
    input: popupTodoRepeatUntil,
    toggleBtn: popupTodoRepeatUntilToggleBtn,
    valueBtn: popupTodoRepeatUntilNoneBtn,
  },
  popupSchedule: {
    repeatSelect: popupScheduleRepeat,
    input: popupScheduleRepeatUntil,
    toggleBtn: popupScheduleRepeatUntilToggleBtn,
    valueBtn: popupScheduleRepeatUntilNoneBtn,
  },
  finance: {
    repeatSelect: financeExpenseRepeat,
    input: financeExpenseRepeatUntil,
    toggleBtn: financeExpenseRepeatUntilToggleBtn,
    valueBtn: financeExpenseRepeatUntilNoneBtn,
  },
};

function syncRepeatUntilToggleState(key) {
  const config = repeatUntilToggleMap[key];
  if (!config) return;

  const isNoneMode = config.input?.classList.contains("hidden");

  if (isNoneMode) {
    config.input?.classList.add("hidden");
    config.valueBtn?.classList.remove("hidden");
    config.toggleBtn?.classList.remove("hidden");

    if (config.input) {
      config.input.disabled = true;
    }

    return;
  }

  config.input?.classList.remove("hidden");
  config.valueBtn?.classList.add("hidden");
  config.toggleBtn?.classList.remove("hidden");

  if (config.input) {
    config.input.disabled = false;
  }
}

function bindRepeatUntilToggleControls() {
  Object.entries(repeatUntilToggleMap).forEach(([key, config]) => {
    config.toggleBtn?.addEventListener("click", () => {
      if (config.input) {
        config.input.value = "";
      }
      syncRepeatUntilToggleState(key);
    });

    config.valueBtn?.addEventListener("click", () => {
      syncRepeatUntilToggleState(key);
      config.input?.classList.remove("hidden");
      config.valueBtn?.classList.add("hidden");
      config.toggleBtn?.classList.remove("hidden");
      if (config.input) {
        config.input.disabled = false;
        config.input.focus();
      }
    });

    config.repeatSelect?.addEventListener("change", () => {
      if ((config.repeatSelect?.value || "none") === "none" && config.input) {
        config.input.value = "";
      }
      syncRepeatUntilToggleState(key);
    });

    syncRepeatUntilToggleState(key);
  });
}
