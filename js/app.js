import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
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
  bindPopupBackdropClose,
  setupFormAccessibilityGuard,
} from "./popupGuards.js";
import {
  createPlaceAutocompleteWidget,
  loadGoogleMapsPlacesLibrary,
} from "./placeAutocomplete.js";
import {
  getEffectiveDailyLocationForDate,
  getLocationPayload,
  getPrimaryLocationFromDailyLocations,
  isMultiDayScheduleRange,
  normalizeDailyLocationEntries,
} from "./placeUtils.js";
import { registerPlannerServiceWorker } from "./serviceWorkerRegistration.js";
import {
  configureVocabularyModule,
  normalizeVocabularyData,
  renderVocabulary,
} from "./vocabulary.js";

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

import {
  renderCard,
  renderSelectedCard,
} from "./renderItems.js";

import {
  clampPage,
  getPlannerProjectAccent,
  getPlannerProjectColorKeyByAccent,
  getProjectSectionStateKey,
  renderPlannerInboxListHtml,
  renderPlannerProjectsListHtml,
  renderProjectDetailHtml,
} from "./plannerProjects.js";

import {
  saveEditedSingleItem as saveEditedSingleItemModule,
  saveTodoSeriesFromForm,
  saveScheduleSeriesFromForm,
  addItemFromSelectedDateData,
  getNextStatus,
  getStatusSymbol,
  getStatusText,
  toggleItemStatus,
  setItemStatus,
  toggleRecurringSingleSlotStatus,
  setRecurringSingleSlotStatus,
  ensureNextRecurringItemAfterStatusChange,
  restoreRecurringItemAsPendingMaster,
  deleteItemById,
  applyRecurringScheduleEditScope,
  toggleRecurringScheduleSlotStatus,
  setRecurringScheduleSlotStatus,
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
  getTodoDiffMinutes,
} from "./calendar.js";
import {
  closeCalendarDatePicker,
  configureCalendarPickerModule,
  handleCalendarPickerAction,
  toggleCalendarDatePicker,
} from "./calendarPicker.js";

import {
  configurePlannerNotifications,
  parseReminderMinutes,
  startPlannerNotificationLoop,
  syncPlannerNotificationSettingsUi,
  togglePlannerNotifications,
} from "./plannerNotifications.js";

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
  saveFinanceAccount,
  resetFinanceAccountForm,
  deleteEditingFinanceAccount,
  startEditFinanceAccount,
  startEditFinanceExpense,
  startEditFinanceAsset,
  handleFinancePageChange,
  openFinanceEditPopup,
  openFinanceExpenseForm,
  openFinanceAssetForm,
  closeFinanceEditPopup,
  openFinanceExpenseFormForAsset,
  openFinanceAssetSummaryPopup,
  openFinanceOverviewSummaryPopup,
  handleFinanceAssetTransactionPageChange,
} from "./finance.js";

import {
  configureFinanceOcrModule,
  analyzeFinanceReceiptImage,
  advanceFinanceOcrReviewQueue,
  cancelFinanceOcrReview,
  isFinanceOcrReviewActive,
} from "./financeOcr.js";

import {
  normalizeRewardsData,
  applyStatusRewardTransition,
} from "./rewards.js";

import {
  closeCoinLedgerEditPopup,
  configureCoinLedgerEditor,
  deleteEditingCoinLedger,
  openCoinLedgerEditPopup,
  saveCoinLedgerEdit,
} from "./coinLedgerEditor.js";

import {
  loadDashboardHideCompletedPreference,
  loadProjectSectionCollapseState,
  saveDashboardHideCompletedPreference,
  saveProjectSectionCollapseState,
} from "./plannerPreferences.js";

import { parseQuickInput } from "./quickInput.js";

import {
  configureAiRecommendationModule,
  getVisibleRecommendations,
  ignoreAiRecommendation,
  renderAiRecommendations,
} from "./aiRecommendations.js";

import {
  configureFinanceExtrasModule,
  saveSubscriptionFromForm,
  resetSubscriptionForm,
  editSubscription,
  deleteSubscription,
  addSubscriptionExpense,
  saveAssetGoalFromForm,
  resetAssetGoalForm,
  editAssetGoal,
  deleteAssetGoal,
} from "./financeExtras.js";

import {
  configureProductivityReportModule,
  renderProductivityReport,
  setProductivityReportRange,
} from "./productivityReport.js";

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
let financeDashboardView = "dashboardHome";
let financeUtilityView = "utilityHome";
let plannerWorkspaceView = "home";
let financeDashboardHistory = [];
let financeUtilityHistory = [];
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
let hideCompletedDashboardItems = false;
const DASHBOARD_PAGE_SIZE = 5;
const PLANNER_INBOX_PAGE_SIZE = 3;
const PLANNER_PROJECT_PAGE_SIZE = 2;
let plannerInboxPage = 1;
let plannerProjectPage = 1;
let editingInboxId = null;
let editingProjectId = null;
let pendingInboxConversion = null;
let popupQuickAddProjectId = "";
let collapsedProjectSections = loadProjectSectionCollapseState();
const STATUS_LONG_PRESS_MS = 2000;
const STATUS_LONG_PRESS_MOVE_LIMIT = 12;
let statusLongPressTimer = null;
let statusLongPressPointer = null;
let isLeftCtrlPressed = false;

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
const openSettingsBtn = document.getElementById("openSettingsBtn");
const settingsPopupOverlay = document.getElementById("settingsPopupOverlay");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsNotificationsToggle = document.getElementById(
  "settingsNotificationsToggle",
);
const settingsNotificationStatus = document.getElementById(
  "settingsNotificationStatus",
);

const authMessage = document.getElementById("authMessage");

const bottomTabButtons = document.querySelectorAll(".bottom-tab-btn");
const dynamicLeftTabBtn = document.getElementById("dynamicLeftTabBtn");
const plannerInboxTabBtn = document.getElementById("plannerInboxTabBtn");
const plannerInboxTabBadge = document.getElementById("plannerInboxTabBadge");
const homeTabBtn = document.getElementById("homeTabBtn");
const plannerProjectTabBtn = document.getElementById("plannerProjectTabBtn");
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
      label: "작업추가",
      icon: "➕",
    },
  },

  finance: {
    left: {
      tab: "finance",
      label: "자산 홈",
      icon: "💰",
    },
    right: {
      tab: "salary",
      label: "가계부",
      icon: "🧾",
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
const coinBalanceText = document.getElementById("coinBalanceText");
const hobbyBudgetText = document.getElementById("hobbyBudgetText");
const coinLedgerList = document.getElementById("coinLedgerList");
const coinLedgerEditOverlay = document.getElementById("coinLedgerEditOverlay");
const closeCoinLedgerEditBtn = document.getElementById("closeCoinLedgerEditBtn");
const coinLedgerEditForm = document.getElementById("coinLedgerEditForm");
const coinLedgerDirectionInput = document.getElementById("coinLedgerDirectionInput");
const coinLedgerAmountInput = document.getElementById("coinLedgerAmountInput");
const coinLedgerMemoInput = document.getElementById("coinLedgerMemoInput");
const coinLedgerSaveBtn = document.getElementById("coinLedgerSaveBtn");
const coinLedgerCancelBtn = document.getElementById("coinLedgerCancelBtn");
const coinLedgerDeleteBtn = document.getElementById("coinLedgerDeleteBtn");
const productivityReportRange = document.getElementById(
  "productivityReportRange",
);
const productivityReportCardBody = document.getElementById(
  "productivityReportCardBody",
);

const itemType = document.getElementById("itemType");
const titleInput = document.getElementById("titleInput");
const itemColor = document.getElementById("itemColor");
const itemTag = document.getElementById("itemTag");
const itemReminderMinutes = document.getElementById("itemReminderMinutes");
const itemRewardDifficulty = document.getElementById("itemRewardDifficulty");
const plannerFormLauncher = document.getElementById("plannerFormLauncher");
const openPlannerFormBtn = document.getElementById("openPlannerFormBtn");
const plannerOverviewSection = document.getElementById(
  "plannerOverviewSection",
);
const plannerTabSection = document.getElementById("tab-planner");
const plannerFormHome = document.getElementById("plannerFormHome");
const plannerFormCard = document.getElementById("plannerFormCard");
const plannerFormTitle = document.getElementById("plannerFormTitle");
const saveItemBtn = document.getElementById("saveItemBtn");
const closePlannerFormBtn = document.getElementById("closePlannerFormBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const openPopupQuickAddBtn = document.getElementById("openPopupQuickAddBtn");
const editPopupOverlay = document.getElementById("editPopupOverlay");
const editPopupMount = document.getElementById("editPopupMount");
const plannerFormPopupTitle = document.getElementById("plannerFormPopupTitle");
const plannerFormPopupSubtext = document.getElementById("plannerFormPopupSubtext");
const closeEditPopupBtn = document.getElementById("closeEditPopupBtn");
const projectDetailOverlay = document.getElementById("projectDetailOverlay");
const projectDetailTitle = document.getElementById("projectDetailTitle");
const projectDetailDesc = document.getElementById("projectDetailDesc");
const projectDetailBody = document.getElementById("projectDetailBody");
const closeProjectDetailBtn = document.getElementById("closeProjectDetailBtn");

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
const vocabularyHomeCardMount = document.getElementById("vocabularyHomeCardMount");
const vocabularyMount = document.getElementById("vocabularyMount");
const todayAchievementRate = document.getElementById("todayAchievementRate");
const todayAchievementBarFill = document.getElementById(
  "todayAchievementBarFill",
);
const todayAchievementDesc = document.getElementById("todayAchievementDesc");
const dashboardHideCompletedCheckbox = document.getElementById(
  "dashboardHideCompletedCheckbox",
);
const timeAnalysisSummary = document.getElementById("timeAnalysisSummary");
const quickInputText = document.getElementById("quickInputText");
const quickInputParseBtn = document.getElementById("quickInputParseBtn");
const quickInputMessage = document.getElementById("quickInputMessage");
const aiRecommendationList = document.getElementById("aiRecommendationList");
const plannerWorkspaceHubSection = document.getElementById(
  "plannerWorkspaceHubSection",
);
const plannerInboxSection = document.getElementById("plannerInboxSection");
const plannerProjectSection = document.getElementById("plannerProjectSection");
const openPlannerInboxViewBtn = document.getElementById("openPlannerInboxViewBtn");
const openPlannerProjectViewBtn = document.getElementById(
  "openPlannerProjectViewBtn",
);
const plannerInboxTitleInput = document.getElementById("plannerInboxTitleInput");
const plannerInboxProjectSelect = document.getElementById(
  "plannerInboxProjectSelect",
);
const plannerInboxNoteInput = document.getElementById("plannerInboxNoteInput");
const plannerInboxAddBtn = document.getElementById("plannerInboxAddBtn");
const plannerInboxCancelEditBtn = document.getElementById(
  "plannerInboxCancelEditBtn",
);
const plannerInboxList = document.getElementById("plannerInboxList");
const plannerProjectNameInput = document.getElementById(
  "plannerProjectNameInput",
);
const plannerProjectColorSelect = document.getElementById(
  "plannerProjectColorSelect",
);
const plannerProjectDescriptionInput = document.getElementById(
  "plannerProjectDescriptionInput",
);
const plannerProjectAddBtn = document.getElementById("plannerProjectAddBtn");
const plannerProjectCancelEditBtn = document.getElementById(
  "plannerProjectCancelEditBtn",
);
const plannerProjectList = document.getElementById("plannerProjectList");
const itemProjectId = document.getElementById("itemProjectId");

const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarTitle = document.getElementById("calendarTitle");
const calendarTitleBtn = document.getElementById("calendarTitleBtn");
const calendarDatePickerPanel = document.getElementById(
  "calendarDatePickerPanel",
);
const calendarGrid = document.getElementById("calendarGrid");
const plannerCalendarSection = document.getElementById(
  "plannerCalendarSection",
);

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
const popupReminderMinutes = document.getElementById("popupReminderMinutes");
const popupItemProjectId = document.getElementById("popupItemProjectId");
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
  budgetVersion: 2,
  budgetSettings: {
    defaultStartDay: 1,
    autoApplyPreviousBudget: true,
  },
  budgetEntries: {},
  monthlyBudgets: {},
  expenses: [],
  assets: [],
  subscriptions: [],
  assetGoals: [],
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
const financeExpenseAccountId = document.getElementById("financeExpenseAccountId");
const financeExpenseTargetAccountGroup = document.getElementById(
  "financeExpenseTargetAccountGroup",
);
const financeExpenseTargetAccountId = document.getElementById(
  "financeExpenseTargetAccountId",
);
const financeExpenseAssetId = document.getElementById("financeExpenseAssetId");
const financeExpenseMemo = document.getElementById("financeExpenseMemo");
const financeOcrIncomeMode = document.getElementById("financeOcrIncomeMode");
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
const financeIncomeAssetLinkGroup = document.getElementById(
  "financeIncomeAssetLinkGroup",
);
const financeIncomeAssetTargetSelect = document.getElementById(
  "financeIncomeAssetTargetSelect",
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
const financeAssetPurpose = document.getElementById("financeAssetPurpose");
const financeAssetAccountId = document.getElementById("financeAssetAccountId");
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
const financeDashboardTotalAssetText = document.getElementById(
  "financeDashboardTotalAssetText",
);
const financeManageTotalAssetText = document.getElementById(
  "financeManageTotalAssetText",
);
const financeAssetRegisteredTotalText = document.getElementById(
  "financeAssetRegisteredTotalText",
);
const financeAssetTransactionNetText = document.getElementById(
  "financeAssetTransactionNetText",
);
const financeAssetRecurringMonthlyText = document.getElementById(
  "financeAssetRecurringMonthlyText",
);
const financeAssetLargestText = document.getElementById(
  "financeAssetLargestText",
);
const financeAssetLargestMetaText = document.getElementById(
  "financeAssetLargestMetaText",
);
const financeAssetSearchInput = document.getElementById(
  "financeAssetSearchInput",
);
const financeAssetCategoryFilter = document.getElementById(
  "financeAssetCategoryFilter",
);
const financeAssetSortFilter = document.getElementById(
  "financeAssetSortFilter",
);
const financeAssetCategorySummaryList = document.getElementById(
  "financeAssetCategorySummaryList",
);
const financeAssetList = document.getElementById("financeAssetList");
const financeAssetTransactionList = document.getElementById(
  "financeAssetTransactionList",
);
const financeAccountSplitCard = document.getElementById("financeAccountSplitCard");
const financeAccountLivingText = document.getElementById(
  "financeAccountLivingText",
);
const financeAccountLeisureText = document.getElementById(
  "financeAccountLeisureText",
);
const financeAccountLeisureTargetText = document.getElementById(
  "financeAccountLeisureTargetText",
);
const financeAccountLeisureGapText = document.getElementById(
  "financeAccountLeisureGapText",
);
const financeAccountSplitDesc = document.getElementById(
  "financeAccountSplitDesc",
);
const financeSubscriptionId = document.getElementById("financeSubscriptionId");
const financeSubscriptionTitle = document.getElementById("financeSubscriptionTitle");
const financeSubscriptionAmount = document.getElementById("financeSubscriptionAmount");
const financeSubscriptionCategory = document.getElementById("financeSubscriptionCategory");
const financeSubscriptionPaymentMethod = document.getElementById(
  "financeSubscriptionPaymentMethod",
);
const financeSubscriptionBillingCycle = document.getElementById(
  "financeSubscriptionBillingCycle",
);
const financeSubscriptionBillingDay = document.getElementById(
  "financeSubscriptionBillingDay",
);
const financeSubscriptionNextBillingDate = document.getElementById(
  "financeSubscriptionNextBillingDate",
);
const financeSubscriptionMemo = document.getElementById("financeSubscriptionMemo");
const financeSubscriptionColor = document.getElementById("financeSubscriptionColor");
const financeSubscriptionActive = document.getElementById("financeSubscriptionActive");
const financeSubscriptionSaveBtn = document.getElementById(
  "financeSubscriptionSaveBtn",
);
const financeSubscriptionCancelBtn = document.getElementById(
  "financeSubscriptionCancelBtn",
);
const financeSubscriptionMonthlyTotalText = document.getElementById(
  "financeSubscriptionMonthlyTotalText",
);
const financeSubscriptionList = document.getElementById("financeSubscriptionList");
const financeAssetGoalId = document.getElementById("financeAssetGoalId");
const financeAssetGoalTitle = document.getElementById("financeAssetGoalTitle");
const financeAssetGoalTargetAmount = document.getElementById(
  "financeAssetGoalTargetAmount",
);
const financeAssetGoalCurrentAmount = document.getElementById(
  "financeAssetGoalCurrentAmount",
);
const financeAssetGoalLinkedAssets = document.getElementById(
  "financeAssetGoalLinkedAssets",
);
const financeAssetGoalTargetDate = document.getElementById(
  "financeAssetGoalTargetDate",
);
const financeAssetGoalCategory = document.getElementById("financeAssetGoalCategory");
const financeAssetGoalMemo = document.getElementById("financeAssetGoalMemo");
const financeAssetGoalColor = document.getElementById("financeAssetGoalColor");
const financeAssetGoalSaveBtn = document.getElementById("financeAssetGoalSaveBtn");
const financeAssetGoalCancelBtn = document.getElementById(
  "financeAssetGoalCancelBtn",
);
const financeAssetGoalInsightText = document.getElementById(
  "financeAssetGoalInsightText",
);
const financeAssetGoalList = document.getElementById("financeAssetGoalList");
const financeAccountFormCard = document.getElementById("financeAccountFormCard");
const financeAccountId = document.getElementById("financeAccountId");
const financeAccountName = document.getElementById("financeAccountName");
const financeAccountType = document.getElementById("financeAccountType");
const financeAccountBalance = document.getElementById("financeAccountBalance");
const financeAccountColor = document.getElementById("financeAccountColor");
const financeAccountMemo = document.getElementById("financeAccountMemo");
const financeSaveAccountBtn = document.getElementById("financeSaveAccountBtn");
const financeCancelAccountEditBtn = document.getElementById(
  "financeCancelAccountEditBtn",
);
const financeDeleteAccountBtn = document.getElementById(
  "financeDeleteAccountBtn",
);
const financeAccountList = document.getElementById("financeAccountList");

let financeEditingExpenseId = null;
let financeEditingAssetId = null;
let financePage = 1;
const FINANCE_PAGE_SIZE = 10;

const financeCancelExpenseEditBtn = document.getElementById(
  "financeCancelExpenseEditBtn",
);
const financeSkipOcrReviewBtn = document.getElementById(
  "financeSkipOcrReviewBtn",
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
let projects = [];
let inboxItems = [];
let ignoredRecommendationIds = [];
let vocabularyData = normalizeVocabularyData();
let rewardsData = normalizeRewardsData();
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

  get projects() {
    return projects;
  },
  set projects(value) {
    projects = Array.isArray(value) ? value : [];
  },

  get inboxItems() {
    return inboxItems;
  },
  set inboxItems(value) {
    inboxItems = Array.isArray(value) ? value : [];
  },

  get ignoredRecommendationIds() {
    return ignoredRecommendationIds;
  },
  set ignoredRecommendationIds(value) {
    ignoredRecommendationIds = Array.isArray(value) ? value : [];
  },

  get vocabularyData() {
    return vocabularyData;
  },
  set vocabularyData(value) {
    vocabularyData = normalizeVocabularyData(value);
  },

  get rewardsData() {
    return rewardsData;
  },
  set rewardsData(value) {
    rewardsData = normalizeRewardsData(value);
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

configureCalendarPickerModule({
  refs: {
    calendarTitleBtn,
    calendarDatePickerPanel,
  },
  getCalendarState: () => ({
    year: calendarYear,
    month: calendarMonth,
  }),
  setCalendarMonth: (year, month) => {
    calendarYear = year;
    calendarMonth = month;
  },
  clearSelectedDate: () => {
    selectedDate = "";
  },
  closeDatePopup,
  closeDatePopupAndClearProjectContext,
  renderCalendar,
});

configurePlannerNotifications({
  refs: {
    settingsNotificationsToggle,
    settingsNotificationStatus,
  },
  getItemsForDate,
});

configureCoinLedgerEditor({
  refs: {
    coinLedgerEditOverlay,
    coinLedgerEditForm,
    coinLedgerDirectionInput,
    coinLedgerAmountInput,
    coinLedgerMemoInput,
  },
  getRewardsData: () => rewardsData,
  setRewardsData: (nextData) => {
    rewardsData = nextData;
  },
  queueSavePlannerData,
  renderDashboard,
  renderFinance,
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
    coinBalanceText,
    hobbyBudgetText,
    coinLedgerList,
    dashboardItemList,
    timeAnalysisSummary,
    todayList,
    todayAchievementRate,
    todayAchievementBarFill,
    todayAchievementDesc,
    summaryPopupLabel,
    summaryPopupList,
    summaryPopupOverlay,
    yearFilter,
    monthFilter,
  },

  dashboardPageSize: DASHBOARD_PAGE_SIZE,

  getItems: () => items,
  getProjectLabel,
  getRewardsData: () => rewardsData,

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
  shouldHideCompletedDashboardItems: () => hideCompletedDashboardItems,
});

configureProductivityReportModule({
  refs: {
    productivityReportRange,
    productivityReportCardBody,
  },
  getItems: () => items,
  getProjects: () => projects,
  getRewardsData: () => rewardsData,
});

configureVocabularyModule({
  refs: {
    vocabularyHomeCardMount,
    vocabularyMount,
  },
  getVocabularyData: () => vocabularyData,
  setVocabularyData: (value) => {
    vocabularyData = normalizeVocabularyData(value);
  },
  openVocabularyPage: () => switchTab("vocabulary"),
  openHomePage: enterHomeTab,
  queueSavePlannerData,
});

configureAiRecommendationModule({
  refs: {
    aiRecommendationList,
  },
  getItems: () => items,
  getProjects: () => projects,
  getIgnoredRecommendationIds: () => ignoredRecommendationIds,
  setIgnoredRecommendationIds: (value) => {
    ignoredRecommendationIds = Array.isArray(value) ? value : [];
  },
  queueSavePlannerData,
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
    financeExpenseAccountId,
    financeExpenseTargetAccountGroup,
    financeExpenseTargetAccountId,
    financeExpenseAssetId,
    financeExpenseMemo,
    financeOcrIncomeMode,
    financeExpenseDate,
    financeExpenseTime,
    financeExpenseTitle,
    financeExpenseAmount,
    financeExpenseMemo,
    financeExpenseCategory,
    financeExpenseSubCategory,
    financeExpensePaymentMethod,
    financeExpenseMerchant,
    financeIncomeAssetLinkGroup,
    financeIncomeAssetTargetSelect,
    financeExpenseTag,
    financeExpenseColor,
    financeExpenseRepeat,
    financeExpenseRepeatUntil,
    financeSaveExpenseBtn,
    financeSkipOcrReviewBtn,
    financeCancelExpenseEditBtn,
    financeDeleteExpenseBtn,

    financeAssetFormCard,
    financeOpenAssetFormBtn,
    financeAssetCategory,
    financeAssetPurpose,
    financeAssetAccountId,
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
    financeDashboardTotalAssetText,
    financeManageTotalAssetText,
    financeAssetRegisteredTotalText,
    financeAssetTransactionNetText,
    financeAssetRecurringMonthlyText,
    financeAssetLargestText,
    financeAssetLargestMetaText,
    financeAssetSearchInput,
    financeAssetCategoryFilter,
    financeAssetSortFilter,
    financeAssetCategorySummaryList,
    summaryPopupLabel,
    summaryPopupList,
    summaryPopupOverlay,
    financeAssetList,
    financeAssetTransactionList,
    financeAccountSplitCard,
    financeAccountLivingText,
    financeAccountLeisureText,
    financeAccountLeisureTargetText,
    financeAccountLeisureGapText,
    financeAccountSplitDesc,

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
    financeAccountFormCard,
    financeAccountId,
    financeAccountName,
    financeAccountType,
    financeAccountBalance,
    financeAccountColor,
    financeAccountMemo,
    financeSaveAccountBtn,
    financeCancelAccountEditBtn,
    financeDeleteAccountBtn,
    financeAccountList,
  },

  getFinanceData: () => financeData,
  getRewardsData: () => rewardsData,
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

configureFinanceExtrasModule({
  refs: {
    financeSubscriptionId,
    financeSubscriptionTitle,
    financeSubscriptionAmount,
    financeSubscriptionCategory,
    financeSubscriptionPaymentMethod,
    financeSubscriptionBillingCycle,
    financeSubscriptionBillingDay,
    financeSubscriptionNextBillingDate,
    financeSubscriptionMemo,
    financeSubscriptionColor,
    financeSubscriptionActive,
    financeSubscriptionSaveBtn,
    financeSubscriptionCancelBtn,
    financeSubscriptionMonthlyTotalText,
    financeSubscriptionList,
    financeAssetGoalId,
    financeAssetGoalTitle,
    financeAssetGoalTargetAmount,
    financeAssetGoalCurrentAmount,
    financeAssetGoalLinkedAssets,
    financeAssetGoalTargetDate,
    financeAssetGoalCategory,
    financeAssetGoalMemo,
    financeAssetGoalColor,
    financeAssetGoalSaveBtn,
    financeAssetGoalCancelBtn,
    financeAssetGoalInsightText,
    financeAssetGoalList,
    financeAccountFormCard,
    financeAccountId,
    financeAccountName,
    financeAccountType,
    financeAccountBalance,
    financeAccountColor,
    financeAccountMemo,
    financeSaveAccountBtn,
    financeCancelAccountEditBtn,
    financeDeleteAccountBtn,
    financeAccountList,
  },
  getFinanceData: () => financeData,
  setFinanceData: (value) => {
    financeData = value;
  },
  getRewardsData: () => rewardsData,
  isFinanceOcrReviewActive,
  renderFinance,
});

configureFinanceOcrModule({
  refs: {
    financeAnalyzeReceiptBtn,
    financeReceiptImageInput,

    financeExpenseFormCard,
    financeTransactionType,
    financeExpenseAccountId,
    financeOcrIncomeMode,
    financeExpenseDate,
    financeExpenseTime: document.getElementById("financeExpenseTime"),
    financeExpenseTitle,
    financeExpenseAmount,
    financeExpenseMemo,
    financeExpenseCategory,
    financeExpenseSubCategory: document.getElementById(
      "financeExpenseSubCategory",
    ),
    financeExpensePaymentMethod: document.getElementById(
      "financeExpensePaymentMethod",
    ),
    financeExpenseMerchant: document.getElementById("financeExpenseMerchant"),
    financeExpenseTag,
    financeExpenseColor,
    financeExpenseRepeat,
    financeExpenseRepeatUntil,
    financeIncomeAssetTargetSelect,
  },

  getFinanceData: () => financeData,
  setFinanceData: (value) => {
    financeData = value;
  },

  renderFinance,
  resetFinanceExpenseForm,
  openFinanceEditPopup,
  syncFinanceSubCategoryOptions,
  syncFinanceExpenseFormButtons,
});

configurePlannerUiModule({
  refs: {
    bottomTabButtons,
    tabSections,

    itemType,
    titleInput,
    itemColor,
    itemTag,
    itemReminderMinutes,
    itemRewardDifficulty,
    itemProjectId,
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
    plannerFormPopupTitle,
    plannerFormPopupSubtext,
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
    popupReminderMinutes,
    popupItemProjectId,
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
registerPlannerServiceWorker();
initAppOnce();

async function initAppOnce() {
  if (isAppInitialized) return;
  isAppInitialized = true;

  setupTabs();
  setupTimePickers();
  setupPlannerForm();
  setupFormAccessibilityGuard();
  observePopupOverlayState();

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

  bindPopupBackdropClose(recurringEditScopeOverlay, closeRecurringEditScopePopup);

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

  titleInput?.addEventListener("blur", () => {
    applyTitleShortcuts({
      titleInput,
      colorInput: itemColor,
      tagInput: itemTag,
      locationInput: itemLocation,
      locationAddressInput: itemLocationAddress,
      locationPlaceIdInput: itemLocationPlaceId,
      mode: "main",
    });
  });

  popupTitleInput?.addEventListener("blur", () => {
    applyTitleShortcuts({
      titleInput: popupTitleInput,
      colorInput: popupItemColor,
      tagInput: popupItemTag,
      locationInput: popupItemLocation,
      locationAddressInput: popupItemLocationAddress,
      locationPlaceIdInput: popupItemLocationPlaceId,
      mode: "popup",
    });
  });

  saveItemBtn?.addEventListener("click", saveCurrentItem);

  openPlannerFormBtn?.addEventListener("click", () => {
    openNewPlannerItemPopup();
  });

  openSettingsBtn?.addEventListener("click", openSettingsPopup);
  closeSettingsBtn?.addEventListener("click", closeSettingsPopup);
  bindPopupBackdropClose(settingsPopupOverlay, closeSettingsPopup);
  settingsNotificationsToggle?.addEventListener("change", () => {
    togglePlannerNotifications(Boolean(settingsNotificationsToggle.checked));
  });

  closePlannerFormBtn?.addEventListener("click", () => {
    clearPendingInboxConversion();
    resetPlannerForm();

    if (isEditingInPopup) {
      closeEditPopup();
    } else {
      closePlannerFormCard();
    }
  });

  cancelEditBtn?.addEventListener("click", () => {
    clearPendingInboxConversion();
    resetPlannerForm();

    if (isEditingInPopup) {
      closeEditPopup();
    } else {
      closePlannerFormCard();
    }
  });

  openPopupQuickAddBtn?.addEventListener("click", openPopupQuickAddForm);

  closeEditPopupBtn?.addEventListener("click", () => {
    clearPendingInboxConversion();
    resetPlannerForm();
    closeEditPopup();
  });

  bindPopupBackdropClose(editPopupOverlay, () => {
    clearPendingInboxConversion();
    resetPlannerForm();
    closeEditPopup();
  });
  closeProjectDetailBtn?.addEventListener("click", closeProjectDetailPopup);
  bindPopupBackdropClose(projectDetailOverlay, closeProjectDetailPopup);

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

  plannerInboxAddBtn?.addEventListener("click", addPlannerInboxItem);
  plannerInboxCancelEditBtn?.addEventListener("click", resetPlannerInboxForm);
  plannerProjectAddBtn?.addEventListener("click", addPlannerProject);
  plannerProjectCancelEditBtn?.addEventListener("click", resetPlannerProjectForm);
  closeCoinLedgerEditBtn?.addEventListener("click", closeCoinLedgerEditPopup);
  coinLedgerCancelBtn?.addEventListener("click", closeCoinLedgerEditPopup);
  coinLedgerSaveBtn?.addEventListener("click", saveCoinLedgerEdit);
  coinLedgerDeleteBtn?.addEventListener("click", deleteEditingCoinLedger);
  coinLedgerEditForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCoinLedgerEdit();
  });
  bindPopupBackdropClose(coinLedgerEditOverlay, closeCoinLedgerEditPopup);
  productivityReportRange?.addEventListener("change", (e) => {
    setProductivityReportRange(e.target.value);
    renderProductivityReport();
  });
  plannerInboxTabBtn?.addEventListener("click", () => {
    openPlannerWorkspaceFromBottom("inbox");
  });
  plannerProjectTabBtn?.addEventListener("click", () => {
    openPlannerWorkspaceFromBottom("project");
  });
  openPlannerInboxViewBtn?.addEventListener("click", showPlannerInboxView);
  openPlannerProjectViewBtn?.addEventListener("click", showPlannerProjectView);
  plannerInboxTitleInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPlannerInboxItem();
    }
  });
  plannerProjectNameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPlannerProject();
    }
  });
  quickInputParseBtn?.addEventListener("click", applyQuickInputToForm);
  quickInputText?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyQuickInputToForm();
    }
  });
  dashboardHideCompletedCheckbox?.addEventListener("change", () => {
    hideCompletedDashboardItems = Boolean(
      dashboardHideCompletedCheckbox.checked,
    );
    saveDashboardHideCompletedPreference(hideCompletedDashboardItems);
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

  calendarTitleBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleCalendarDatePicker();
  });

  calendarDatePickerPanel?.addEventListener("click", (event) => {
    event.stopPropagation();
    const target = event.target.closest("[data-picker-action]");
    if (!target) return;

    handleCalendarPickerAction(target);
  });

  document.addEventListener("click", (event) => {
    if (calendarDatePickerPanel?.classList.contains("hidden")) return;
    if (calendarDatePickerPanel?.contains(event.target)) return;
    if (calendarTitleBtn?.contains(event.target)) return;
    closeCalendarDatePicker();
  });
  document.addEventListener("pointerdown", handleStatusPointerDown);
  document.addEventListener("pointermove", handleStatusPointerMove);
  document.addEventListener("pointerup", cancelStatusLongPress);
  document.addEventListener("pointercancel", cancelStatusLongPress);
  document.addEventListener("pointerleave", cancelStatusLongPress);
  document.addEventListener("keydown", trackLeftCtrlKey);
  document.addEventListener("keyup", trackLeftCtrlKey);
  window.addEventListener("blur", () => {
    isLeftCtrlPressed = false;
    cancelStatusLongPress();
  });

  clearSelectedDateBtn?.addEventListener("click", closeDatePopupAndClearProjectContext);
  bindPopupBackdropClose(
    calendarPopupOverlay,
    closeDatePopupAndClearProjectContext,
  );

  closeSummaryPopupBtn?.addEventListener("click", closeSummaryPopup);
  bindPopupBackdropClose(summaryPopupOverlay, closeSummaryPopup);

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
  closePopupQuickAddBtn?.addEventListener("click", closePopupQuickAddFormAndClearProject);

  financeSaveBudgetBtn?.addEventListener("click", saveFinanceBudget);
  financeOpenExpenseFormBtn?.addEventListener("click", openFinanceExpenseForm);
  financeOpenExpenseFormFromAssetBtn?.addEventListener("click", () => {
    showFinanceAssetManagePage({ record: true });
    openFinanceExpenseForm();
  });
  financeOpenAssetFormBtn?.addEventListener("click", openFinanceAssetForm);
  financeSaveAssetBtn?.addEventListener("click", saveFinanceAsset);

  financeOpenAssetManageTabBtn?.addEventListener("click", () => {
    showFinanceAssetManagePage({ record: true });
  });

  financeBackToDashboardBtn?.addEventListener("click", () => {
    goBackFinanceDashboard();
  });

  financeOpenLedgerSectionBtn?.addEventListener("click", () => {
    showFinanceLedgerSection({ record: true });
  });

  financeOpenSalarySectionBtn?.addEventListener("click", () => {
    showFinanceSalarySection({ record: true });
  });

  financeBackToUtilityHomeFromLedgerBtn?.addEventListener("click", () => {
    goBackFinanceUtility();
  });

  financeBackToUtilityHomeFromSalaryBtn?.addEventListener("click", () => {
    goBackFinanceUtility();
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
    const wasOcrReviewActive = isFinanceOcrReviewActive();
    const result = saveFinanceExpense();

    if (result?.ok && wasOcrReviewActive) {
      advanceFinanceOcrReviewQueue();
    }
  });

  financeSkipOcrReviewBtn?.addEventListener("click", () => {
    if (!isFinanceOcrReviewActive()) return;

    advanceFinanceOcrReviewQueue();

    if (!isFinanceOcrReviewActive()) {
      resetFinanceExpenseForm();
    }
  });

  financeSaveAccountBtn?.addEventListener("click", saveFinanceAccount);
  financeCancelAccountEditBtn?.addEventListener(
    "click",
    resetFinanceAccountForm,
  );
  financeDeleteAccountBtn?.addEventListener("click", deleteEditingFinanceAccount);

  financeTransactionType?.addEventListener("change", () => {
    syncFinanceExpenseFormButtons();
  });

  financeOcrIncomeMode?.addEventListener("change", () => {
    const shouldUseAssetMode = financeOcrIncomeMode.value === "asset";
    if (financeExpenseFormCard) {
      financeExpenseFormCard.dataset.ocrIncomeAssetMode = shouldUseAssetMode
        ? "true"
        : "";
      if (!shouldUseAssetMode) {
        delete financeExpenseFormCard.dataset.ocrIncomeAssetMode;
      }
    }
    syncFinanceExpenseFormButtons();
  });

  financeExpenseCategory?.addEventListener("change", () => {
    syncFinanceSubCategoryOptions(financeExpenseCategory?.value || "");
  });

  financeCancelExpenseEditBtn?.addEventListener("click", () => {
    cancelFinanceOcrReview();
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
    cancelFinanceOcrReview();
    closeFinanceEditPopup();
  });

  bindPopupBackdropClose(financeEditPopupOverlay, () => {
    cancelFinanceOcrReview();
    closeFinanceEditPopup();
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
  financeAssetSearchInput?.addEventListener("input", renderFinance);
  financeAssetCategoryFilter?.addEventListener("change", renderFinance);
  financeAssetSortFilter?.addEventListener("change", renderFinance);
  financeSubscriptionSaveBtn?.addEventListener("click", saveSubscriptionFromForm);
  financeSubscriptionCancelBtn?.addEventListener("click", resetSubscriptionForm);
  financeAssetGoalSaveBtn?.addEventListener("click", saveAssetGoalFromForm);
  financeAssetGoalCancelBtn?.addEventListener("click", resetAssetGoalForm);

  financePrevPageBtn?.addEventListener("click", () => {
    handleFinancePageChange(-1);
  });

  financeNextPageBtn?.addEventListener("click", () => {
    handleFinancePageChange(1);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllTimePickerMenus();
      const closed = closeTopMostPopup();
      if (closed) return;
    }
  });

  document.addEventListener("click", handleDocumentClick);

  renderYearOptions();
  renderMonthOptions();
  calculateSalaryPreview();
  hideCompletedDashboardItems = loadDashboardHideCompletedPreference();
  if (dashboardHideCompletedCheckbox) {
    dashboardHideCompletedCheckbox.checked = hideCompletedDashboardItems;
  }
  renderAll();
  closePlannerFormCard();
  enterHomeTab();
  bindRepeatUntilToggleControls();
  startPlannerNotificationLoop();
}

function renderAll() {
  renderYearOptions();
  renderMonthOptions();
  renderDashboard();
  renderProductivityReport();
  renderVocabulary();
  renderTodayList();
  renderAiRecommendations();
  renderCalendar();
  repairOrphanedInboxConversions();
  renderPlannerWorkspace();
  renderFinance();
  syncPlannerNotificationSettingsUi();
  enforcePlannerWorkspaceVisibility();
}

function hideAllPlannerWorkspaceSections() {
  plannerWorkspaceHubSection?.classList.add("hidden");
  plannerInboxSection?.classList.add("hidden");
  plannerProjectSection?.classList.add("hidden");
}

function setPlannerWorkspaceMode(mode) {
  ["home", "inbox", "project"].forEach((name) => {
    plannerTabSection?.classList.toggle(
      `planner-workspace-mode-${name}`,
      mode === name,
    );
  });
}

function setPlannerScheduleSectionsVisible(isVisible) {
  [plannerOverviewSection, plannerFormHome, plannerCalendarSection].forEach(
    (section) => {
      section?.classList.toggle("hidden", !isVisible);
    },
  );
}

function forceHidePlannerTaskForms() {
  clearPendingInboxConversion();
  if (!editPopupOverlay?.classList.contains("hidden")) {
    closeEditPopup();
  }
  closePopupQuickAddFormAndClearProject();
  closeDatePopup();
  closePlannerFormCard();
  plannerFormCard?.classList.add("hidden");
  plannerFormCard?.classList.remove("selected-date-mode");
  plannerFormHome?.classList.add("hidden");
  popupQuickAddForm?.classList.add("hidden");
  calendarPopupOverlay?.classList.add("hidden");
}

function enforcePlannerWorkspaceVisibility() {
  setPlannerWorkspaceMode(plannerWorkspaceView);

  if (plannerWorkspaceView === "inbox") {
    setPlannerScheduleSectionsVisible(false);
    hideAllPlannerWorkspaceSections();
    plannerInboxSection?.classList.remove("hidden");
    forceHidePlannerTaskForms();
    return;
  }

  if (plannerWorkspaceView === "project") {
    setPlannerScheduleSectionsVisible(false);
    hideAllPlannerWorkspaceSections();
    plannerProjectSection?.classList.remove("hidden");
    forceHidePlannerTaskForms();
    return;
  }

  setPlannerScheduleSectionsVisible(true);
}

function hidePlannerScheduleSections() {
  setPlannerWorkspaceMode("home");
  setPlannerScheduleSectionsVisible(false);
  hideAllPlannerWorkspaceSections();
  closePopupQuickAddFormAndClearProject();
  closeDatePopup();
  closePlannerFormCard();
}

function showPlannerWorkspaceHome() {
  hideAllPlannerWorkspaceSections();
  plannerWorkspaceView = "home";
  setPlannerWorkspaceMode("home");
  setPlannerScheduleSectionsVisible(true);
  syncPlannerBottomShortcutState();
}

function showPlannerInboxView() {
  hideAllPlannerWorkspaceSections();
  plannerWorkspaceView = "inbox";
  setPlannerWorkspaceMode("inbox");
  setPlannerScheduleSectionsVisible(false);
  forceHidePlannerTaskForms();
  plannerInboxSection?.classList.remove("hidden");
  syncPlannerBottomShortcutState();
}

function showPlannerProjectView() {
  hideAllPlannerWorkspaceSections();
  plannerWorkspaceView = "project";
  setPlannerWorkspaceMode("project");
  setPlannerScheduleSectionsVisible(false);
  forceHidePlannerTaskForms();
  plannerProjectSection?.classList.remove("hidden");
  syncPlannerBottomShortcutState();
}

function getProjectById(projectId) {
  return projects.find((project) => project.id === projectId) || null;
}

function getProjectLabel(projectId) {
  return getProjectById(projectId)?.name || "프로젝트 없음";
}

function renderPlannerWorkspace() {
  renderPlannerProjectSelectOptions();
  updatePlannerInboxTabBadge();
  renderPlannerInbox();
  renderPlannerProjects();
}

function updatePlannerInboxTabBadge() {
  if (!plannerInboxTabBadge) return;

  const count = inboxItems.filter((item) => !item.convertedAt).length;
  plannerInboxTabBadge.textContent = count > 99 ? "99+" : String(count);
  plannerInboxTabBadge.classList.toggle("hidden", count === 0);
}

function renderPlannerProjectSelectOptions() {
  [itemProjectId, plannerInboxProjectSelect, popupItemProjectId].forEach((select) => {
    if (!select) return;

    const currentValue = select.value || "";
    select.innerHTML = '<option value="">프로젝트 없음</option>';

    projects
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ko"))
      .forEach((project) => {
        const option = document.createElement("option");
        option.value = project.id;
        option.textContent = project.name || "\uD504\uB85C\uC81D\uD2B8";
        select.appendChild(option);
      });

    select.value = projects.some((project) => project.id === currentValue)
      ? currentValue
      : "";
  });
}

function changePlannerInboxPage(direction) {
  const totalPages = Math.max(
    1,
    Math.ceil((inboxItems?.length || 0) / PLANNER_INBOX_PAGE_SIZE),
  );
  plannerInboxPage = clampPage(plannerInboxPage + direction, totalPages);
  renderPlannerInbox();
}

function changePlannerProjectPage(direction) {
  const totalPages = Math.max(
    1,
    Math.ceil((projects?.length || 0) / PLANNER_PROJECT_PAGE_SIZE),
  );
  plannerProjectPage = clampPage(plannerProjectPage + direction, totalPages);
  renderPlannerProjects();
}

function openSettingsPopup() {
  syncPlannerNotificationSettingsUi();
  settingsPopupOverlay?.classList.remove("hidden");
}

function closeSettingsPopup() {
  settingsPopupOverlay?.classList.add("hidden");
}

function renderPlannerInbox() {
  if (!plannerInboxList) return;

  const rendered = renderPlannerInboxListHtml({
    inboxItems,
    projects,
    page: plannerInboxPage,
    pageSize: PLANNER_INBOX_PAGE_SIZE,
  });

  plannerInboxPage = rendered.page;
  plannerInboxList.innerHTML = rendered.html;
}

function renderPlannerProjects() {
  if (!plannerProjectList) return;

  const rendered = renderPlannerProjectsListHtml({
    projects,
    inboxItems,
    items,
    page: plannerProjectPage,
    pageSize: PLANNER_PROJECT_PAGE_SIZE,
  });

  plannerProjectPage = rendered.page;
  plannerProjectList.innerHTML = rendered.html;
}

function openProjectDetailPopup(projectId) {
  const project = getProjectById(projectId);
  if (!project || !projectDetailOverlay || !projectDetailBody) return;

  if (projectDetailTitle) projectDetailTitle.textContent = project.name || "프로젝트";
  if (projectDetailDesc) projectDetailDesc.textContent = project.description || "";
  projectDetailBody.innerHTML = renderProjectDetailHtml({
    project,
    inboxItems,
    items,
    collapsedProjectSections,
    getStatusSymbol,
  });
  projectDetailOverlay.classList.remove("hidden");
}

function closeProjectDetailPopup() {
  projectDetailOverlay?.classList.add("hidden");
  if (projectDetailBody) projectDetailBody.innerHTML = "";
}

function refreshProjectDetailIfOpen(projectId) {
  if (projectDetailOverlay?.classList.contains("hidden")) return;
  if (!projectId || !getProjectById(projectId)) {
    closeProjectDetailPopup();
    return;
  }
  openProjectDetailPopup(projectId);
}

function addPlannerProject() {
  const name = plannerProjectNameInput?.value.trim() || "";
  const description = plannerProjectDescriptionInput?.value.trim() || "";
  const colorKey = plannerProjectColorSelect?.value || "blue";
  const nowMs = Date.now();

  if (!name) {
    alert("\uD504\uB85C\uC81D\uD2B8 \uC774\uB984\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
    plannerProjectNameInput?.focus();
    return;
  }

  if (editingProjectId) {
    projects = projects.map((project) =>
      project.id === editingProjectId
        ? {
            ...project,
            name,
            description,
            color: getPlannerProjectAccent(colorKey),
            updatedAt: nowMs,
          }
        : project,
    );
  } else {
    projects = [
      {
        id: makeId(),
        name,
        description,
        color: getPlannerProjectAccent(colorKey),
        createdAt: nowMs,
        updatedAt: nowMs,
      },
      ...projects,
    ];
    plannerProjectPage = 1;
  }

  resetPlannerProjectForm();
  queueSavePlannerData();
  renderPlannerWorkspace();
}

function editPlannerProject(id) {
  const project = getProjectById(id);
  if (!project) return;

  editingProjectId = id;
  if (plannerProjectNameInput) plannerProjectNameInput.value = project.name || "";
  if (plannerProjectDescriptionInput) {
    plannerProjectDescriptionInput.value = project.description || "";
  }
  if (plannerProjectColorSelect) {
    plannerProjectColorSelect.value = getPlannerProjectColorKeyByAccent(project.color);
  }
  if (plannerProjectAddBtn) {
    plannerProjectAddBtn.textContent = "\uD504\uB85C\uC81D\uD2B8 \uC218\uC815";
  }
  plannerProjectCancelEditBtn?.classList.remove("hidden");
  plannerProjectNameInput?.focus();
}

function resetPlannerProjectForm() {
  editingProjectId = null;
  if (plannerProjectNameInput) plannerProjectNameInput.value = "";
  if (plannerProjectDescriptionInput) plannerProjectDescriptionInput.value = "";
  if (plannerProjectColorSelect) plannerProjectColorSelect.value = "blue";
  if (plannerProjectAddBtn) {
    plannerProjectAddBtn.textContent = "\uD504\uB85C\uC81D\uD2B8 \uCD94\uAC00";
  }
  plannerProjectCancelEditBtn?.classList.add("hidden");
}
function addPlannerInboxItem() {
  const title = plannerInboxTitleInput?.value.trim() || "";
  const note = plannerInboxNoteInput?.value.trim() || "";
  const projectId = plannerInboxProjectSelect?.value || "";

  if (!title) {
    alert("Inbox에 넣을 내용을 입력해 주세요.");
    plannerInboxTitleInput?.focus();
    return;
  }

  if (editingInboxId) {
    inboxItems = inboxItems.map((item) =>
      item.id === editingInboxId
        ? {
            ...item,
            title,
            note,
            projectId,
            updatedAt: Date.now(),
          }
        : item,
    );
    editingInboxId = null;
  } else {
    inboxItems = [
      {
        id: makeId(),
        title,
        note,
        projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        convertedAt: null,
        convertedToType: "",
      },
      ...inboxItems,
    ];
    plannerInboxPage = 1;
  }

  resetPlannerInboxForm();

  queueSavePlannerData();
  renderPlannerWorkspace();
}

function editPlannerInboxItem(id) {
  const inboxItem = inboxItems.find((item) => item.id === id);
  if (!inboxItem) return;

  editingInboxId = id;
  if (plannerInboxTitleInput) plannerInboxTitleInput.value = inboxItem.title || "";
  if (plannerInboxNoteInput) plannerInboxNoteInput.value = inboxItem.note || "";
  if (plannerInboxProjectSelect) {
    plannerInboxProjectSelect.value = inboxItem.projectId || "";
  }
  if (plannerInboxAddBtn) plannerInboxAddBtn.textContent = "Inbox \uC218\uC815";
  plannerInboxCancelEditBtn?.classList.remove("hidden");
  plannerInboxTitleInput?.focus();
}

function resetPlannerInboxForm() {
  editingInboxId = null;
  if (plannerInboxTitleInput) plannerInboxTitleInput.value = "";
  if (plannerInboxNoteInput) plannerInboxNoteInput.value = "";
  if (plannerInboxProjectSelect) plannerInboxProjectSelect.value = "";
  if (plannerInboxAddBtn) plannerInboxAddBtn.textContent = "Inbox\uC5D0 \uB123\uAE30";
  plannerInboxCancelEditBtn?.classList.add("hidden");
}

function deletePlannerInboxItem(id) {
  inboxItems = inboxItems.filter((item) => item.id !== id);
  if (editingInboxId === id) {
    resetPlannerInboxForm();
  }
  if (pendingInboxConversion?.id === id) {
    clearPendingInboxConversion();
  }
  queueSavePlannerData();
  renderPlannerWorkspace();
}

function clearPendingInboxConversion() {
  pendingInboxConversion = null;
}

function completePendingInboxConversion(savedType) {
  if (!pendingInboxConversion?.id) return "";

  const pending = pendingInboxConversion;
  const inboxItem = inboxItems.find((item) => item.id === pending.id);
  if (!inboxItem) {
    clearPendingInboxConversion();
    return "";
  }

  const convertedToType =
    savedType === "schedule" || savedType === "todo"
      ? savedType
      : pending.targetType || "todo";

  inboxItems = inboxItems.map((item) =>
    item.id === pending.id
      ? {
          ...item,
          convertedAt: Date.now(),
          convertedToType,
          updatedAt: Date.now(),
        }
      : item,
  );
  clearPendingInboxConversion();
  return inboxItem.projectId || "";
}

function hasPlannerItemForConvertedInbox(inboxItem) {
  const convertedType = inboxItem.convertedToType || "todo";
  const sourceTitle = String(inboxItem.title || "").trim();
  const sourceProjectId = inboxItem.projectId || "";
  const convertedAt = Number(inboxItem.convertedAt) || 0;

  if (!sourceTitle || !convertedAt) return false;

  return items.some((item) => {
    const itemCreatedAt = Number(item.createdAt) || 0;

    return (
      item.type === convertedType &&
      String(item.title || "").trim() === sourceTitle &&
      (item.projectId || "") === sourceProjectId &&
      itemCreatedAt >= convertedAt - 60 * 1000
    );
  });
}

function repairOrphanedInboxConversions() {
  let changed = false;

  inboxItems = inboxItems.map((item) => {
    if (!item.convertedAt || hasPlannerItemForConvertedInbox(item)) {
      return item;
    }

    changed = true;
    return {
      ...item,
      convertedAt: null,
      convertedToType: "",
      updatedAt: Date.now(),
    };
  });

  if (changed) {
    queueSavePlannerData();
  }
}

function deletePlannerProject(id) {
  const shouldDelete = confirm("이 프로젝트를 삭제할까요? 연결된 작업의 프로젝트 지정은 해제됩니다.");
  if (!shouldDelete) return;

  if (editingProjectId === id) {
    resetPlannerProjectForm();
  }

  projects = projects.filter((project) => project.id !== id);
  inboxItems = inboxItems.map((item) =>
    item.projectId === id ? { ...item, projectId: "" } : item,
  );
  items = items.map((item) =>
    item.projectId === id ? { ...item, projectId: "" } : item,
  );

  if ((itemProjectId?.value || "") === id) {
    itemProjectId.value = "";
  }

  if ((plannerInboxProjectSelect?.value || "") === id) {
    plannerInboxProjectSelect.value = "";
  }

  queueSavePlannerData();
  renderAll();
}

function applyProjectToPlannerForm(projectId) {
  openProjectTaskPopup(projectId, "todo");
}

function closePopupQuickAddFormAndClearProject() {
  popupQuickAddProjectId = "";
  closePopupQuickAddForm();
}

function closeDatePopupAndClearProjectContext() {
  popupQuickAddProjectId = "";
  closeDatePopup();
}

function openProjectTaskPopup(projectId, targetType = "todo") {
  if (!getProjectById(projectId)) return;

  selectedDate = formatDateKey(new Date());
  popupQuickAddProjectId = projectId;
  resetPopupQuickAddForm();
  if (popupItemProjectId) popupItemProjectId.value = projectId;
  openDatePopup(selectedDate);
  openPopupQuickAddForm();
  if (popupItemType) popupItemType.value = targetType === "schedule" ? "schedule" : "todo";
  if (popupTodoDate) popupTodoDate.value = selectedDate;
  if (popupScheduleStartDate) popupScheduleStartDate.value = selectedDate;
  if (popupScheduleEndDate) popupScheduleEndDate.value = selectedDate;
  updatePopupFields();
  showPlannerProjectView();
  popupTitleInput?.focus();
}

function addInboxItemToProject(projectId) {
  if (!getProjectById(projectId)) return;

  const title = prompt("Inbox에 추가할 메모를 입력하세요.");
  if (!title || !title.trim()) return;

  inboxItems = [
    {
      id: makeId(),
      title: title.trim(),
      note: "",
      projectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      convertedAt: null,
      convertedToType: "",
    },
    ...inboxItems,
  ];
  queueSavePlannerData();
  renderPlannerWorkspace();
  refreshProjectDetailIfOpen(projectId);
}

function addProjectResource(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;

  const label = prompt("리소스 이름이나 메모를 입력하세요.");
  if (!label || !label.trim()) return;
  const url = prompt("링크가 있으면 입력하세요. 없으면 비워두세요.") || "";
  const resource = {
    id: makeId(),
    label: label.trim(),
    url: url.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  projects = projects.map((item) =>
    item.id === projectId
      ? {
          ...item,
          resources: [...(Array.isArray(item.resources) ? item.resources : []), resource],
          updatedAt: Date.now(),
        }
      : item,
  );
  queueSavePlannerData();
  renderPlannerWorkspace();
  refreshProjectDetailIfOpen(projectId);
}

function deleteProjectResource(projectId, resourceId) {
  if (!resourceId) return;

  projects = projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          resources: (Array.isArray(project.resources) ? project.resources : []).filter(
            (resource) => resource.id !== resourceId,
          ),
          updatedAt: Date.now(),
        }
      : project,
  );
  queueSavePlannerData();
  renderPlannerWorkspace();
  refreshProjectDetailIfOpen(projectId);
}

function toggleProjectSection(projectId, sectionKey) {
  const stateKey = getProjectSectionStateKey(projectId, sectionKey);
  collapsedProjectSections = {
    ...collapsedProjectSections,
    [stateKey]: !collapsedProjectSections[stateKey],
  };
  saveProjectSectionCollapseState(collapsedProjectSections);
  renderPlannerProjects();
  refreshProjectDetailIfOpen(projectId);
}

function openNewPlannerItemPopup() {
  resetPlannerForm();
  openEditPopup();
  titleInput?.focus();
}

function applyQuickInputToForm() {
  const parsed = parseQuickInput(quickInputText?.value || "");

  if (!parsed) {
    if (quickInputMessage) {
      quickInputMessage.textContent =
        "날짜 표현을 찾지 못했어요. 예: 내일 3시 카페 약속, 금요일까지 과제 제출";
    }
    openNewPlannerItemPopup();
    return;
  }

  resetPlannerForm();

  if (itemType) itemType.value = parsed.type;
  if (titleInput) titleInput.value = parsed.title;
  if (itemColor) itemColor.value = parsed.color || "blue";
  if (itemTag) itemTag.value = parsed.tag || "";
  if (itemRewardDifficulty) itemRewardDifficulty.value = "auto";

  if (parsed.type === "todo") {
    if (todoDueDate) todoDueDate.value = parsed.dueDate || "";
    applyTimeValue("todoDue", parsed.dueTime || "");
  } else {
    if (scheduleStartDate) scheduleStartDate.value = parsed.startDate || "";
    if (scheduleEndDate) scheduleEndDate.value = parsed.startDate || "";
    applyTimeValue("scheduleStart", parsed.startTime || "");
    applyTimeValue("scheduleEnd", "");
    syncScheduleLocationMode("main");
  }

  updatePlannerFields();
  openEditPopup();

  if (quickInputMessage) {
    quickInputMessage.textContent = "빠른 입력을 추가 폼에 채웠어요. 확인 후 저장해주세요.";
  }

  titleInput?.focus();
}

function applyAiRecommendation(id) {
  const recommendation = getVisibleRecommendations().find((item) => item.id === id);
  if (!recommendation) return;

  const now = Date.now();

  if (recommendation.type === "todo") {
    items = [
      ...items,
      {
        id: makeId(),
        type: "todo",
        title: recommendation.title,
        color: "blue",
        tag: "AI추천",
        projectId: "",
        reminderMinutes: 0,
        location: "",
        locationAddress: "",
        locationPlaceId: "",
        dueDate: recommendation.suggestedDate,
        dueTime: "",
        repeat: "none",
        repeatUntil: "",
        weeklyDays: [],
        intervalDays: null,
        status: "pending",
        isRecurring: false,
        sourceRecommendationId: recommendation.id,
        sourceItemId: recommendation.sourceItemId || "",
        createdAt: now,
        updatedAt: now,
      },
    ];
  } else {
    items = [
      ...items,
      {
        id: makeId(),
        type: "schedule",
        title: recommendation.title,
        color: "blue",
        tag: "AI추천",
        projectId: "",
        reminderMinutes: 0,
        location: "",
        locationAddress: "",
        locationPlaceId: "",
        dailyLocations: [],
        startDate: recommendation.suggestedDate,
        startTime: recommendation.suggestedStartTime || "09:00",
        endDate: recommendation.suggestedDate,
        endTime: recommendation.suggestedEndTime || "10:00",
        repeat: "none",
        repeatUntil: "",
        weeklyDays: [],
        intervalDays: null,
        status: "pending",
        isRecurring: false,
        sourceRecommendationId: recommendation.id,
        sourceItemId: recommendation.sourceItemId || "",
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  ignoredRecommendationIds = [
    ...new Set([...ignoredRecommendationIds, recommendation.id]),
  ];

  queueSavePlannerData();
  renderAll();
}

function convertInboxItemToPlanner(id, targetType) {
  const inboxItem = inboxItems.find((item) => item.id === id);
  if (!inboxItem || inboxItem.convertedAt) return;
  pendingInboxConversion = {
    id,
    targetType: targetType === "schedule" ? "schedule" : "todo",
  };

  resetPlannerForm();
  if (itemType) itemType.value = pendingInboxConversion.targetType;
  if (titleInput) titleInput.value = inboxItem.title || "";
  if (itemProjectId) itemProjectId.value = inboxItem.projectId || "";
  if (itemTag && !itemTag.value && inboxItem.note) {
    itemTag.value = inboxItem.note;
  }

  updatePlannerFields();
  openEditPopup();
  titleInput?.focus();
}

function closeTopMostPopup() {
  if (!calendarDatePickerPanel?.classList.contains("hidden")) {
    closeCalendarDatePicker();
    return true;
  }

  if (!placeSearchModalOverlay?.classList.contains("hidden")) {
    closePlaceSearchModal();
    return true;
  }

  if (!recurringEditScopeOverlay?.classList.contains("hidden")) {
    closeRecurringEditScopePopup();
    return true;
  }

  if (!financeEditPopupOverlay?.classList.contains("hidden")) {
    cancelFinanceOcrReview();
    closeFinanceEditPopup();
    return true;
  }

  if (!editPopupOverlay?.classList.contains("hidden")) {
    clearPendingInboxConversion();
    closeEditPopup();
    return true;
  }

  if (!projectDetailOverlay?.classList.contains("hidden")) {
    closeProjectDetailPopup();
    return true;
  }

  if (!popupQuickAddForm?.classList.contains("hidden")) {
    closePopupQuickAddFormAndClearProject();
    return true;
  }

  if (!calendarPopupOverlay?.classList.contains("hidden")) {
    closeDatePopup();
    return true;
  }

  if (!summaryPopupOverlay?.classList.contains("hidden")) {
    closeSummaryPopup();
    return true;
  }

  if (!settingsPopupOverlay?.classList.contains("hidden")) {
    closeSettingsPopup();
    return true;
  }

  return false;
}

function enterHomeTab() {
  currentHubGroup = "";
  financeDashboardHistory = [];
  financeUtilityHistory = [];
  financeDashboardView = "dashboardHome";
  financeUtilityView = "utilityHome";

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

  setPlannerBottomShortcutsVisible(false);
  hidePlannerScheduleSections();
  switchTab("home");
}

function hideAllFinanceDashboardSections() {
  financeDashboardHomeSection?.classList.add("hidden");
  financeAssetManagePageSection?.classList.add("hidden");
}

function pushFinanceDashboardHistory(viewKey) {
  if (!viewKey) return;
  if (financeDashboardHistory[financeDashboardHistory.length - 1] === viewKey) {
    return;
  }
  financeDashboardHistory.push(viewKey);
}

function pushFinanceUtilityHistory(viewKey) {
  if (!viewKey) return;
  if (financeUtilityHistory[financeUtilityHistory.length - 1] === viewKey) {
    return;
  }
  financeUtilityHistory.push(viewKey);
}

function showFinanceDashboardHome(options = {}) {
  const { record = false } = options;
  if (record && financeDashboardView !== "dashboardHome") {
    pushFinanceDashboardHistory(financeDashboardView);
  }
  hideAllFinanceDashboardSections();
  financeDashboardView = "dashboardHome";
  financeDashboardHomeSection?.classList.remove("hidden");
}

function showFinanceAssetManagePage(options = {}) {
  const { record = false } = options;
  if (record && financeDashboardView !== "assetManage") {
    pushFinanceDashboardHistory(financeDashboardView);
  }
  hideAllFinanceDashboardSections();
  financeDashboardView = "assetManage";
  financeAssetManagePageSection?.classList.remove("hidden");
}

function hideAllFinanceUtilitySections() {
  financeUtilityHomeSection?.classList.add("hidden");
  financeLedgerSection?.classList.add("hidden");
  financeSalarySection?.classList.add("hidden");
}

function showFinanceUtilityHome(options = {}) {
  const { record = false } = options;
  if (record && financeUtilityView !== "utilityHome") {
    pushFinanceUtilityHistory(financeUtilityView);
  }
  hideAllFinanceUtilitySections();
  financeUtilityView = "utilityHome";
  financeUtilityHomeSection?.classList.remove("hidden");
}

function showFinanceLedgerSection(options = {}) {
  const { record = false } = options;
  if (record && financeUtilityView !== "ledger") {
    pushFinanceUtilityHistory(financeUtilityView);
  }
  hideAllFinanceUtilitySections();
  financeUtilityView = "ledger";
  financeLedgerSection?.classList.remove("hidden");
}

function showFinanceSalarySection(options = {}) {
  const { record = false } = options;
  if (record && financeUtilityView !== "salaryCalc") {
    pushFinanceUtilityHistory(financeUtilityView);
  }
  hideAllFinanceUtilitySections();
  financeUtilityView = "salaryCalc";
  financeSalarySection?.classList.remove("hidden");
}

function goBackFinanceDashboard() {
  const previousView = financeDashboardHistory.pop();

  if (previousView === "assetManage") {
    showFinanceAssetManagePage();
    return;
  }

  showFinanceDashboardHome();
}

function goBackFinanceUtility() {
  const previousView = financeUtilityHistory.pop();

  if (previousView === "ledger") {
    showFinanceLedgerSection();
    return;
  }

  if (previousView === "salaryCalc") {
    showFinanceSalarySection();
    return;
  }

  showFinanceUtilityHome();
}

function setPlannerBottomShortcutsVisible(isVisible) {
  [plannerInboxTabBtn, plannerProjectTabBtn].forEach((button) => {
    button?.classList.toggle("hidden", !isVisible);
  });
}

function syncPlannerBottomShortcutState() {
  const isPlannerActive = currentTab === "planner";

  plannerInboxTabBtn?.classList.toggle(
    "active",
    isPlannerActive && plannerWorkspaceView === "inbox",
  );
  plannerProjectTabBtn?.classList.toggle(
    "active",
    isPlannerActive && plannerWorkspaceView === "project",
  );

  if (dynamicRightTabBtn?.dataset.tab === "planner") {
    dynamicRightTabBtn.classList.toggle(
      "active",
      isPlannerActive && plannerWorkspaceView === "home",
    );
  }
}

function openPlannerWorkspaceFromBottom(workspaceView) {
  switchTab("planner");

  if (workspaceView === "inbox") {
    showPlannerInboxView();
  } else if (workspaceView === "project") {
    showPlannerProjectView();
  } else {
    showPlannerWorkspaceHome();
  }

  syncPlannerBottomShortcutState();
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
    showPlannerWorkspaceHome();
  }
}

function openHubGroup(groupName) {
  const group = HUB_TAB_MAP[groupName];
  if (!group) return;

  currentHubGroup = groupName;
  financeDashboardHistory = [];
  financeUtilityHistory = [];
  setPlannerBottomShortcutsVisible(groupName === "schedule");

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
  const parsed = applyTitleShortcuts({
    titleInput,
    colorInput: itemColor,
    tagInput: itemTag,
    locationInput: itemLocation,
    locationAddressInput: itemLocationAddress,
    locationPlaceIdInput: itemLocationPlaceId,
    mode: "main",
    overwriteExisting: true,
  });
  const title = parsed.title;

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
    if (actionTarget.dataset.longPressHandled === "true") {
      delete actionTarget.dataset.longPressHandled;
      e.preventDefault();
      return;
    }
    toggleStatus(id, {
      forceStatus: e.ctrlKey && isLeftCtrlPressed ? "success" : "",
    });
    return;
  }

  if (action === "open-coin-ledger-edit") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    openCoinLedgerEditPopup(id);
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

  if (action === "convert-inbox-item") {
    const id = actionTarget.dataset.id;
    const targetType = actionTarget.dataset.targetType || "todo";
    if (!id) return;
    convertInboxItemToPlanner(id, targetType);
    return;
  }

  if (action === "edit-inbox-item") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    editPlannerInboxItem(id);
    return;
  }

  if (action === "delete-inbox-item") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    deletePlannerInboxItem(id);
    return;
  }

  if (action === "change-inbox-page") {
    changePlannerInboxPage(Number(actionTarget.dataset.direction) || 0);
    return;
  }

  if (action === "change-project-page") {
    changePlannerProjectPage(Number(actionTarget.dataset.direction) || 0);
    return;
  }

  if (action === "move-kanban-item") {
    const id = actionTarget.dataset.id;
    const kanbanStatus = actionTarget.dataset.kanbanStatus;
    moveKanbanItem(id, kanbanStatus);
    return;
  }

  if (action === "open-project-detail") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    openProjectDetailPopup(id);
    return;
  }

  if (action === "toggle-project-section") {
    const projectId = actionTarget.dataset.projectId;
    const sectionKey = actionTarget.dataset.sectionKey;
    if (!projectId || !sectionKey) return;
    toggleProjectSection(projectId, sectionKey);
    return;
  }

  if (action === "project-add-inbox") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    addInboxItemToProject(id);
    return;
  }

  if (action === "project-add-task") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    openProjectTaskPopup(id, actionTarget.dataset.targetType || "todo");
    return;
  }

  if (action === "add-project-resource") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    addProjectResource(id);
    return;
  }

  if (action === "delete-project-resource") {
    const id = actionTarget.dataset.id;
    const resourceId = actionTarget.dataset.resourceId;
    if (!id || !resourceId) return;
    deleteProjectResource(id, resourceId);
    return;
  }

  if (action === "delete-project") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    deletePlannerProject(id);
    return;
  }

  if (action === "edit-project") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    editPlannerProject(id);
    return;
  }

  if (action === "apply-ai-recommendation") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    applyAiRecommendation(id);
    return;
  }

  if (action === "ignore-ai-recommendation") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    ignoreAiRecommendation(id);
    return;
  }
  if (action === "add-subscription-expense") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    addSubscriptionExpense(id);
    return;
  }

  if (action === "edit-subscription") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    editSubscription(id);
    return;
  }

  if (action === "delete-subscription") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    deleteSubscription(id);
    return;
  }

  if (action === "edit-asset-goal") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    editAssetGoal(id);
    return;
  }

  if (action === "delete-asset-goal") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    deleteAssetGoal(id);
    return;
  }

  if (action === "apply-project-filter") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    applyProjectToPlannerForm(id);
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

  if (action === "open-edit-finance-account") {
    const id = actionTarget.dataset.id;
    if (!id) return;
    startEditFinanceAccount(id);
    return;
  }

  if (action === "quick-asset-cashflow") {
    const id = actionTarget.dataset.id;
    const flowType = actionTarget.dataset.flowType || "expense";
    if (!id) return;
    openFinanceExpenseFormForAsset(id, flowType);
    return;
  }

  if (action === "change-finance-asset-transaction-page") {
    handleFinanceAssetTransactionPageChange(
      Number(actionTarget.dataset.direction) || 0,
    );
    return;
  }

  if (action === "open-finance-asset-summary") {
    const summaryType = actionTarget.dataset.summaryType || "assets";
    openFinanceAssetSummaryPopup(summaryType);
    return;
  }

  if (action === "open-finance-overview-summary") {
    const summaryType = actionTarget.dataset.summaryType || "dashboard_assets";
    openFinanceOverviewSummaryPopup(summaryType);
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
  const projectContextId = popupQuickAddProjectId;

  applyTitleShortcuts({
    titleInput: popupTitleInput,
    colorInput: popupItemColor,
    tagInput: popupItemTag,
    locationInput: popupItemLocation,
    locationAddressInput: popupItemLocationAddress,
    locationPlaceIdInput: popupItemLocationPlaceId,
    mode: "popup",
    overwriteExisting: true,
  });

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
    popupReminderMinutes,
    popupItemProjectId: {
      value: popupQuickAddProjectId || popupItemProjectId?.value || "",
    },
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
  popupQuickAddProjectId = "";
  resetPopupQuickAddForm();
  if (projectContextId) {
    closeDatePopup();
    showPlannerProjectView();
  } else {
    openDatePopup(selectedDate);
  }
}

function saveEditedSingleItem(type, title) {
  const datePopupRefreshKey = selectedDate;
  const shouldRefreshDatePopup =
    !!datePopupRefreshKey && !calendarPopupOverlay?.classList.contains("hidden");
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";
  const projectId = itemProjectId?.value || "";
  const reminderMinutes = parseReminderMinutes(itemReminderMinutes?.value);
  const rewardDifficulty = itemRewardDifficulty?.value || "auto";

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
    projectId,
    reminderMinutes,
    rewardDifficulty,
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
  const convertedProjectId = completePendingInboxConversion(type);
  queueSavePlannerData();
  resetPlannerForm();
  renderAll();
  if (convertedProjectId) refreshProjectDetailIfOpen(convertedProjectId);

  if (isEditingInPopup) {
    closeEditPopup();
  } else {
    closePlannerFormCard();
  }

  if (shouldRefreshDatePopup) {
    refreshDatePopupAfterItemMutation(datePopupRefreshKey);
  }
}

function refreshDatePopupAfterItemMutation(dateKey) {
  if (!dateKey) return;

  requestAnimationFrame(() => {
    const dayItems = getItemsForDate(dateKey);

    if (dayItems.length === 0) {
      closeDatePopup();
      return;
    }

    selectedDate = dateKey;
    openDatePopup(dateKey);
  });
}

function saveTodoSeries(title) {
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";
  const projectId = itemProjectId?.value || "";
  const reminderMinutes = parseReminderMinutes(itemReminderMinutes?.value);
  const rewardDifficulty = itemRewardDifficulty?.value || "auto";
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
    projectId,
    reminderMinutes,
    rewardDifficulty,
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
  const convertedProjectId = completePendingInboxConversion("todo");
  queueSavePlannerData();
  resetPlannerForm();
  renderAll();
  if (convertedProjectId) refreshProjectDetailIfOpen(convertedProjectId);
  if (isEditingInPopup) {
    closeEditPopup();
  } else {
    closePlannerFormCard();
  }
}

function saveScheduleSeries(title) {
  const color = itemColor?.value || "blue";
  const tag = itemTag?.value.trim() || "";
  const projectId = itemProjectId?.value || "";
  const reminderMinutes = parseReminderMinutes(itemReminderMinutes?.value);
  const rewardDifficulty = itemRewardDifficulty?.value || "auto";

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
    projectId,
    reminderMinutes,
    rewardDifficulty,
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
  const convertedProjectId = completePendingInboxConversion("schedule");
  queueSavePlannerData();
  resetPlannerForm();
  renderAll();
  if (convertedProjectId) refreshProjectDetailIfOpen(convertedProjectId);
  if (isEditingInPopup) {
    closeEditPopup();
  } else {
    closePlannerFormCard();
  }
}

function parseTitleShortcuts(rawTitle) {
  const source = String(rawTitle || "").trim();

  if (!source) {
    return {
      title: "",
      location: "",
      tag: "",
      color: "",
      repeat: null,
      time: null,
      matched: false,
    };
  }

  const tokens = {
    "@": "",
    "#": "",
    "!": "",
    "~": "",
    "^": "",
  };

  const shortcutPattern =
    /(^|\s)([@#!~^])(?:"([^"]+)"|'([^']+)'|([^\s@#!~^]+))/g;

  const cleanTitle = source
    .replace(
      shortcutPattern,
      (match, spacing, prefix, doubleQuoted, singleQuoted, plain) => {
        const value = String(doubleQuoted || singleQuoted || plain || "").trim();

        if (value) {
          tokens[prefix] = value;
        }

        return spacing || "";
      },
    )
    .replace(/\s+/g, " ")
    .trim();

  const color = parseShortcutColor(tokens["!"]);
  const repeat = parseShortcutRepeat(tokens["~"]);
  const time = parseShortcutTime(tokens["^"]);

  return {
    title: cleanTitle,
    location: tokens["@"] || "",
    tag: tokens["#"] || "",
    color,
    repeat,
    time,
    matched: Boolean(
      tokens["@"] ||
        tokens["#"] ||
        tokens["!"] ||
        tokens["~"] ||
        tokens["^"],
    ),
  };
}

function applyTitleShortcuts({
  titleInput,
  colorInput,
  tagInput,
  locationInput,
  locationAddressInput,
  locationPlaceIdInput,
  mode = "main",
  overwriteExisting = false,
}) {
  const parsed = parseTitleShortcuts(titleInput?.value || "");

  if (!parsed.matched) {
    return parsed;
  }

  if (titleInput) {
    titleInput.value = parsed.title;
  }

  if (parsed.color && colorInput) {
    const hasColorValue = Boolean(colorInput.value);

    if (overwriteExisting || !hasColorValue) {
      colorInput.value = parsed.color;
    }
  }

  if (parsed.tag && tagInput) {
    const hasTagValue = Boolean(tagInput.value.trim());

    if (overwriteExisting || !hasTagValue) {
      tagInput.value = parsed.tag;
    }
  }

  if (parsed.location && locationInput) {
    const hasLocationValue = Boolean(locationInput.value.trim());

    if (overwriteExisting || !hasLocationValue) {
      locationInput.value = parsed.location;

      if (locationAddressInput) {
        locationAddressInput.value = "";
      }

      if (locationPlaceIdInput) {
        locationPlaceIdInput.value = "";
      }
    }
  }

  applyShortcutRepeat(parsed.repeat, mode);
  applyShortcutTime(parsed.time, mode);
  syncPlaceUi(mode);

  return parsed;
}

function parseShortcutColor(rawValue) {
  const normalized = normalizeShortcutValue(rawValue);

  if (!normalized) return "";

  const colorMap = {
    blue: "blue",
    bluee: "blue",
    blues: "blue",
    bluecolor: "blue",
    파랑: "blue",
    파란색: "blue",
    블루: "blue",
    purple: "purple",
    violet: "purple",
    보라: "purple",
    보라색: "purple",
    퍼플: "purple",
    green: "green",
    greencolor: "green",
    초록: "green",
    초록색: "green",
    초록빛: "green",
    그린: "green",
    orange: "orange",
    주황: "orange",
    주황색: "orange",
    오렌지: "orange",
    red: "red",
    빨강: "red",
    빨간색: "red",
    레드: "red",
    gray: "gray",
    grey: "gray",
    회색: "gray",
    그레이: "gray",
  };

  return colorMap[normalized] || "";
}

function parseShortcutRepeat(rawValue) {
  const source = String(rawValue || "").trim();
  const normalized = normalizeShortcutValue(source);

  if (!normalized) return null;

  const intervalMatch =
    normalized.match(/^(\d+)일마다$/) || normalized.match(/^every(\d+)days$/);

  if (intervalMatch) {
    return {
      type: "interval_days",
      intervalDays: Math.max(1, Number(intervalMatch[1]) || 1),
    };
  }

  if (["없음", "반복없음", "none", "off"].includes(normalized)) {
    return { type: "none" };
  }

  if (["매일", "daily", "everyday"].includes(normalized)) {
    return { type: "daily" };
  }

  if (["매주", "weekly", "everyweek"].includes(normalized)) {
    return { type: "weekly" };
  }

  if (["매월", "monthly", "everymonth"].includes(normalized)) {
    return { type: "monthly" };
  }

  const weekdaySet = parseShortcutWeekdays(normalized);

  if (weekdaySet.length > 0) {
    return {
      type: "weekly_days",
      weeklyDays: weekdaySet,
    };
  }

  return null;
}

function parseShortcutWeekdays(normalized) {
  const compact = String(normalized || "")
    .replaceAll("주중", "평일")
    .replaceAll("월요일", "월")
    .replaceAll("화요일", "화")
    .replaceAll("수요일", "수")
    .replaceAll("목요일", "목")
    .replaceAll("금요일", "금")
    .replaceAll("토요일", "토")
    .replaceAll("일요일", "일");

  const namedPresets = {
    평일: [1, 2, 3, 4, 5],
    주말: [0, 6],
    매일: [0, 1, 2, 3, 4, 5, 6],
  };

  if (namedPresets[compact]) {
    return namedPresets[compact];
  }

  const dayMap = {
    월: 1,
    화: 2,
    수: 3,
    목: 4,
    금: 5,
    토: 6,
    일: 0,
  };

  const values = [];

  for (const char of compact) {
    if (Object.hasOwn(dayMap, char) && !values.includes(dayMap[char])) {
      values.push(dayMap[char]);
    }
  }

  return values;
}

function parseShortcutTime(rawValue) {
  const source = String(rawValue || "").trim();

  if (!source) return null;

  const [startRaw, endRaw] = source.split("-").map((value) => value.trim());
  const start = normalizeShortcutTimeValue(startRaw);
  const end = normalizeShortcutTimeValue(endRaw);

  if (!start && !end) return null;

  return {
    start: start || "",
    end: end || "",
  };
}

function normalizeShortcutTimeValue(rawValue) {
  const source = String(rawValue || "").trim().toLowerCase();

  if (!source) return "";

  const compact = source.replace(/\s+/g, "");
  const periodMatch = compact.match(/^(오전|오후|am|pm)(\d{1,2})(?::?(\d{2}))?시?$/);

  if (periodMatch) {
    const [, period, hourText, minuteText] = periodMatch;
    let hour = Number(hourText);
    const minute = Number(minuteText || "0");

    if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59 || hour > 12) {
      return "";
    }

    const isPm = period === "오후" || period === "pm";

    if (hour === 12) {
      hour = isPm ? 12 : 0;
    } else if (isPm) {
      hour += 12;
    }

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const koreanMatch = compact.match(/^(\d{1,2})(?::?(\d{2}))?시$/);

  if (koreanMatch) {
    const hour = Number(koreanMatch[1]);
    const minute = Number(koreanMatch[2] || "0");

    if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
      return "";
    }

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  if (/^\d{1,2}$/.test(compact)) {
    const hour = Number(compact);

    if (hour > 23) return "";

    return `${String(hour).padStart(2, "0")}:00`;
  }

  if (/^\d{3,4}$/.test(compact)) {
    const padded = compact.padStart(4, "0");
    const hour = Number(padded.slice(0, 2));
    const minute = Number(padded.slice(2));

    if (hour > 23 || minute > 59) return "";

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const standardMatch = compact.match(/^(\d{1,2}):(\d{2})$/);

  if (standardMatch) {
    const hour = Number(standardMatch[1]);
    const minute = Number(standardMatch[2]);

    if (hour > 23 || minute > 59) return "";

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return "";
}

function normalizeShortcutValue(rawValue) {
  return String(rawValue || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function applyShortcutRepeat(parsedRepeat, mode) {
  if (!parsedRepeat?.type) return;

  const isPopup = mode === "popup";
  const currentType =
    (isPopup ? popupItemType?.value : itemType?.value) || "todo";

  const repeatSelect =
    currentType === "schedule"
      ? isPopup
        ? popupScheduleRepeat
        : scheduleRepeat
      : isPopup
        ? popupTodoRepeat
        : todoRepeat;

  const intervalInput =
    currentType === "schedule"
      ? isPopup
        ? popupScheduleRepeatInterval
        : scheduleRepeatInterval
      : isPopup
        ? popupTodoRepeatInterval
        : todoRepeatInterval;

  const weekdayInputs =
    currentType === "schedule"
      ? isPopup
        ? popupScheduleWeekdayInputs
        : scheduleWeekdayInputs
      : isPopup
        ? popupTodoWeekdayInputs
        : todoWeekdayInputs;

  if (repeatSelect) {
    repeatSelect.value = parsedRepeat.type;
  }

  if (intervalInput && parsedRepeat.type === "interval_days") {
    intervalInput.value = String(Math.max(1, parsedRepeat.intervalDays || 1));
  }

  if (weekdayInputs?.forEach) {
    const selectedDays = Array.isArray(parsedRepeat.weeklyDays)
      ? parsedRepeat.weeklyDays
      : [];

    weekdayInputs.forEach((input) => {
      input.checked =
        parsedRepeat.type === "weekly_days" &&
        selectedDays.includes(Number(input.value));
    });
  }

  if (isPopup) {
    if (currentType === "schedule") {
      updatePopupScheduleRepeatUI();
    } else {
      updatePopupTodoRepeatUI();
    }
    return;
  }

  if (currentType === "schedule") {
    updateScheduleRepeatUI();
  } else {
    updateTodoRepeatUI();
  }
}

function applyShortcutTime(parsedTime, mode) {
  if (!parsedTime || (!parsedTime.start && !parsedTime.end)) return;

  const isPopup = mode === "popup";
  const currentType =
    (isPopup ? popupItemType?.value : itemType?.value) || "todo";

  if (currentType === "schedule") {
    if (parsedTime.start) {
      applyTimeValue(
        isPopup ? "popupScheduleStart" : "scheduleStart",
        parsedTime.start,
      );
    }

    if (parsedTime.end) {
      applyTimeValue(
        isPopup ? "popupScheduleEnd" : "scheduleEnd",
        parsedTime.end,
      );
    }

    return;
  }

  if (parsedTime.start) {
    applyTimeValue(isPopup ? "popupTodo" : "todoDue", parsedTime.start);
  }
}

function isMobileStatusPointer(event) {
  if (!event) return false;
  if (event.pointerType === "touch" || event.pointerType === "pen") return true;
  return window.matchMedia?.("(pointer: coarse)")?.matches === true;
}

function getStatusActionButton(target) {
  return target?.closest?.("[data-action='toggle-status']") || null;
}

function clearStatusLongPressTimer() {
  if (statusLongPressTimer) {
    clearTimeout(statusLongPressTimer);
    statusLongPressTimer = null;
  }
}

function cancelStatusLongPress() {
  clearStatusLongPressTimer();
  statusLongPressPointer = null;
}

function handleStatusPointerDown(event) {
  const button = getStatusActionButton(event.target);
  if (!button || !button.dataset.id) return;
  if (!isMobileStatusPointer(event)) return;

  clearStatusLongPressTimer();
  statusLongPressPointer = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    button,
  };

  statusLongPressTimer = setTimeout(() => {
    const currentButton = statusLongPressPointer?.button;
    const id = currentButton?.dataset.id;
    if (!id) return;

    currentButton.dataset.longPressHandled = "true";
    toggleStatus(id, { forceStatus: "success" });
    cancelStatusLongPress();
  }, STATUS_LONG_PRESS_MS);
}

function handleStatusPointerMove(event) {
  if (!statusLongPressPointer) return;
  if (statusLongPressPointer.id !== event.pointerId) return;

  const movedX = Math.abs(event.clientX - statusLongPressPointer.x);
  const movedY = Math.abs(event.clientY - statusLongPressPointer.y);
  if (
    movedX > STATUS_LONG_PRESS_MOVE_LIMIT ||
    movedY > STATUS_LONG_PRESS_MOVE_LIMIT
  ) {
    cancelStatusLongPress();
  }
}

function trackLeftCtrlKey(event) {
  if (event.key !== "Control") return;
  if (event.location !== KeyboardEvent.DOM_KEY_LOCATION_LEFT) return;
  isLeftCtrlPressed = event.type === "keydown";
}

function toggleStatus(id, { forceStatus = "" } = {}) {
  const [targetId, occurrenceDateKey = ""] = String(id || "").split("__");
  const baseItem = items.find((item) => item.id === targetId);
  if (!baseItem) return;
  const targetKey = occurrenceDateKey
    ? `${targetId}__${occurrenceDateKey}`
    : targetId;
  let previousStatus = baseItem.status || "pending";
  let nextStatus = getNextStatus(previousStatus);

  if (
    baseItem &&
    baseItem.type === "schedule" &&
    baseItem.repeat === "weekly_days" &&
    occurrenceDateKey
  ) {
    const weekday = String(new Date(`${occurrenceDateKey}T00:00`).getDay());
    previousStatus = baseItem.repeatSlotStatuses?.[weekday] || "pending";
    nextStatus = forceStatus || getNextStatus(previousStatus);
    items = forceStatus
      ? setRecurringScheduleSlotStatus(items, id, nextStatus)
      : toggleRecurringScheduleSlotStatus(items, id);
  } else if (
    baseItem &&
    baseItem.repeat &&
    baseItem.repeat !== "none" &&
    occurrenceDateKey
  ) {
    previousStatus = baseItem.status || "pending";
    nextStatus = forceStatus || getNextStatus(previousStatus);
    items = forceStatus
      ? setRecurringSingleSlotStatus(items, id, nextStatus)
      : toggleRecurringSingleSlotStatus(items, id);
  } else {
    nextStatus = forceStatus || getNextStatus(previousStatus);
    items = forceStatus
      ? setItemStatus(items, targetId, nextStatus)
      : toggleItemStatus(items, targetId);
  }

  if (previousStatus === nextStatus) return;

  rewardsData = applyStatusRewardTransition({
    rewardsData,
    item: baseItem,
    targetKey,
    previousStatus,
    nextStatus,
  });

  items =
    nextStatus === "pending"
      ? restoreRecurringItemAsPendingMaster(items, targetId)
      : ensureNextRecurringItemAfterStatusChange(items, targetId);

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

async function initPlaceAutocompleteWidgets() {
  const loaded = await loadGoogleMapsPlacesLibrary(GOOGLE_MAPS_API_KEY);
  if (!loaded) return;

  createPlaceAutocompleteWidget({
    mode: "main",
    mountEl: itemLocationAutocompleteMount,
    placeholder: "장소 검색",
    onPlaceSelected: handleAutocompletePlaceSelection,
  });

  createPlaceAutocompleteWidget({
    mode: "popup",
    mountEl: popupItemLocationAutocompleteMount,
    placeholder: "장소 검색",
    onPlaceSelected: handleAutocompletePlaceSelection,
  });

  createPlaceAutocompleteWidget({
    mode: "modal",
    mountEl: placeModalAutocompleteMount,
    placeholder: "장소 검색",
    onPlaceSelected: handleAutocompletePlaceSelection,
  });
}

function handleAutocompletePlaceSelection({ mode, selectedPlace }) {
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

  const uiRefs = getPlaceUiRefs(mode);

  if (uiRefs.locationInput) {
    uiRefs.locationInput.value = selectedPlace.label;
  }

  if (uiRefs.addressInput) {
    uiRefs.addressInput.value = selectedPlace.address;
  }

  if (uiRefs.placeIdInput) {
    uiRefs.placeIdInput.value = selectedPlace.placeId;
  }

  finalizePlaceSelection(mode);
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

  bindPopupBackdropClose(placeSearchModalOverlay, closePlaceSearchModal);

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

let modalScrollY = 0;

function lockBodyScroll() {
  if (document.body.classList.contains("modal-open")) return;

  modalScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${modalScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockBodyScroll() {
  if (!document.body.classList.contains("modal-open")) return;

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, modalScrollY);
}

function updateBodyModalLock() {
  const hasOpenPopup = !!document.querySelector(".popup-overlay:not(.hidden)");
  if (hasOpenPopup) {
    lockBodyScroll();
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
    return;
  }

  unlockBodyScroll();
  document.body.classList.remove("modal-open");
  document.documentElement.classList.remove("modal-open");
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
    alert("먼저 작업의 시작 날짜와 종료 날짜를 입력하세요.");
    return;
  }

  if (!selectedDate) {
    alert("적용 시작 날짜를 선택하세요.");
    dateInput?.focus();
    return;
  }

  if (selectedDate < startDate || selectedDate > endDate) {
    alert("선택한 날짜는 작업 기간 안에 있어야 합니다.");
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
      helperText.textContent = "하루 작업은 기본 장소 기능을 사용합니다.";
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
      "여러 날 작업은 날짜별 장소 변경 시점 기준으로 자동 적용됩니다.";
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
    titleEl.textContent = "반복 작업 적용 범위";
  }

  if (subTextEl) {
    subTextEl.textContent = "수정 내용을 어느 범위까지 적용할지 선택하세요.";
  }

  if (scopeOnlyThisBtn) {
    scopeOnlyThisBtn.textContent = "해당 작업에만 적용";
  }

  if (scopeFutureBtn) {
    scopeFutureBtn.textContent = "해당 작업 이후에 적용";
  }

  if (scopePastBtn) {
    scopePastBtn.textContent = "해당 작업 이전에 적용";
  }

  if (scopeAllBtn) {
    scopeAllBtn.textContent = "전체 작업에 적용";
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
    projectId: itemProjectId?.value || "",
    reminderMinutes: parseReminderMinutes(itemReminderMinutes?.value),
    rewardDifficulty: itemRewardDifficulty?.value || "auto",
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
    titleEl.textContent = "반복 작업 삭제 범위";
  }

  if (subTextEl) {
    subTextEl.textContent = "삭제를 어느 범위까지 적용할지 선택하세요.";
  }

  if (scopeOnlyThisBtn) {
    scopeOnlyThisBtn.textContent = "해당 작업만 삭제";
  }

  if (scopeFutureBtn) {
    scopeFutureBtn.textContent = "해당 작업 이후 삭제";
  }

  if (scopePastBtn) {
    scopePastBtn.textContent = "해당 작업 이전 삭제";
  }

  if (scopeAllBtn) {
    scopeAllBtn.textContent = "전체 작업 삭제";
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
