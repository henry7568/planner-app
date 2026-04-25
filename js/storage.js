// storage.js
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let financeSaveTimer = null;
const FINANCE_BUDGET_VERSION = 3;

const DEFAULT_FINANCE_ACCOUNT_TEMPLATES = [
  { type: "living", name: "생활비 계좌", color: "#2563eb" },
  { type: "savings", name: "적금계좌", color: "#0f766e" },
  { type: "investment", name: "투자계좌", color: "#7c3aed" },
  { type: "leisure", name: "여가비 계좌", color: "#f59e0b" },
];

function makePlannerItemId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getState() {
  return window.AppState;
}

function getRefs() {
  return window.FirebaseRefs;
}

function getConfig() {
  return window.AppConfig;
}

export function normalizePlannerData(data) {
  if (Array.isArray(data)) {
    return {
      items: normalizePlannerItems(data),
      projects: [],
      inboxItems: [],
      routines: [],
      ignoredRecommendationIds: [],
      rewards: {
        coinVersion: 1,
        ledger: [],
      },
    };
  }

  const source = data && typeof data === "object" ? data : {};

  return {
    items: normalizePlannerItems(source.items),
    projects: Array.isArray(source.projects) ? source.projects : [],
    inboxItems: Array.isArray(source.inboxItems) ? source.inboxItems : [],
    routines: Array.isArray(source.routines) ? source.routines : [],
    ignoredRecommendationIds: Array.isArray(source.ignoredRecommendationIds)
      ? source.ignoredRecommendationIds
      : [],
    rewards: {
      coinVersion: Number(source.rewards?.coinVersion) || 1,
      ledger: Array.isArray(source.rewards?.ledger) ? source.rewards.ledger : [],
    },
  };
}

function getPlannerItemDateKey(item) {
  if (!item) return "";
  return item.type === "todo" ? item.dueDate || "" : item.startDate || "";
}

function normalizePlannerColor(color) {
  const value = String(color || "").trim();
  const allowed = ["blue", "purple", "green", "orange", "red", "gray"];
  if (allowed.includes(value)) return value;
  if (value === "yellow") return "orange";
  return value || "blue";
}

function isPlannerRecurringItem(item) {
  return Boolean(item?.repeat && item.repeat !== "none");
}

function normalizePlannerItem(item) {
  const source = item && typeof item === "object" ? item : {};
  const id = source.id || makePlannerItemId("planner");
  const repeatGroupId = isPlannerRecurringItem(source)
    ? source.repeatGroupId || source.groupId || `repeat-${id}`
    : source.repeatGroupId || "";
  const occurrenceDate =
    source.occurrenceDate ||
    source.occurrenceDateKey ||
    getPlannerItemDateKey(source);

  return {
    ...source,
    id,
    color: normalizePlannerColor(source.color),
    repeatGroupId,
    occurrenceDate,
    isRepeatMaster: isPlannerRecurringItem(source)
      ? source.isRepeatMaster !== false
      : false,
  };
}

function normalizePlannerItems(items) {
  const normalized = Array.isArray(items) ? items.map(normalizePlannerItem) : [];
  const recurringGroups = normalized.reduce((acc, item) => {
    if (!isPlannerRecurringItem(item) || !item.repeatGroupId) return acc;
    acc[item.repeatGroupId] = acc[item.repeatGroupId] || [];
    acc[item.repeatGroupId].push(item);
    return acc;
  }, {});
  const todayKey = new Date().toISOString().slice(0, 10);
  const masterIds = new Set();

  Object.values(recurringGroups).forEach((groupItems) => {
    const explicitMasters = groupItems.filter(
      (item) => item.isRepeatMaster === true && (item.status || "pending") === "pending",
    );
    const pendingItems = groupItems.filter(
      (item) => (item.status || "pending") === "pending",
    );
    const candidates = explicitMasters.length ? explicitMasters : pendingItems;

    if (candidates.length === 0) return;

    const sorted = [...candidates].sort((a, b) => {
      const aDate = getPlannerItemDateKey(a) || "9999-12-31";
      const bDate = getPlannerItemDateKey(b) || "9999-12-31";
      const aPast = aDate < todayKey;
      const bPast = bDate < todayKey;

      if (aPast !== bPast) return aPast ? 1 : -1;
      return aDate.localeCompare(bDate);
    });

    masterIds.add(sorted[0].id);
  });

  return normalized.map((item) => {
    if (!isPlannerRecurringItem(item)) return item;

    return {
      ...item,
      isRepeatMaster: masterIds.has(item.id),
    };
  });
}

function buildLegacyMonthlyBudgets(budgetEntries) {
  return Object.entries(
    budgetEntries && typeof budgetEntries === "object" ? budgetEntries : {},
  ).reduce((acc, [monthKey, entry]) => {
    if (!entry || typeof entry !== "object") return acc;

    acc[monthKey] = {
      monthKey,
      startDay: Math.max(1, Math.min(31, Number(entry.startDay) || 1)),
      budget: Math.max(0, Number(entry.totalBudget ?? entry.budget ?? 0) || 0),
      updatedAt: Number(entry.updatedAt) || Date.now(),
    };

    return acc;
  }, {});
}

function normalizeBudgetEntry(monthKey, entry, fallbackStartDay = 1) {
  const startDay = Math.max(
    1,
    Math.min(31, Number(entry?.startDay) || fallbackStartDay || 1),
  );
  const totalBudget = Math.max(
    0,
    Number(entry?.totalBudget ?? entry?.budget ?? 0) || 0,
  );
  const createdAt =
    Number(entry?.createdAt) || Number(entry?.updatedAt) || Date.now();
  const updatedAt = Number(entry?.updatedAt) || createdAt;

  return {
    monthKey,
    startDay,
    totalBudget,
    categoryBudgets:
      entry?.categoryBudgets && typeof entry.categoryBudgets === "object"
        ? entry.categoryBudgets
        : {},
    note: typeof entry?.note === "string" ? entry.note : "",
    createdAt,
    updatedAt,
  };
}

function makeDefaultFinanceAccountId(type) {
  return `account-${type}`;
}

function normalizeFinanceAccount(item, fallback = {}) {
  const now = Date.now();
  const type = item?.type || fallback.type || "custom";
  const createdAt = Number(item?.createdAt) || Number(fallback.createdAt) || now;

  return {
    id: item?.id || fallback.id || makeDefaultFinanceAccountId(type),
    name: item?.name || fallback.name || "사용자 계좌",
    type,
    balance: Number(item?.balance) || 0,
    color: item?.color || fallback.color || "#2563eb",
    memo: typeof item?.memo === "string" ? item.memo : "",
    createdAt,
    updatedAt: Number(item?.updatedAt) || createdAt,
  };
}

function buildDefaultFinanceAccounts() {
  return DEFAULT_FINANCE_ACCOUNT_TEMPLATES.map((item) =>
    normalizeFinanceAccount(
      {},
      {
        ...item,
        id: makeDefaultFinanceAccountId(item.type),
      },
    ),
  );
}

function ensureDefaultFinanceAccounts(accounts) {
  const normalized = Array.isArray(accounts)
    ? accounts.map((item) => normalizeFinanceAccount(item))
    : [];

  DEFAULT_FINANCE_ACCOUNT_TEMPLATES.forEach((template) => {
    if (!normalized.some((item) => item.type === template.type)) {
      normalized.push(
        normalizeFinanceAccount(
          {},
          {
            ...template,
            id: makeDefaultFinanceAccountId(template.type),
          },
        ),
      );
    }
  });

  return normalized;
}

function getDefaultFinanceAccountId(accounts, type = "living") {
  return (
    accounts.find((item) => item.type === type)?.id ||
    accounts[0]?.id ||
    ""
  );
}

function normalizeFinanceTransaction(item, accounts) {
  const now = Date.now();
  const createdAt = Number(item?.createdAt) || Number(item?.updatedAt) || now;
  const rawType = item?.type || item?.flowType || "expense";
  const type = [
    "income",
    "withdrawal",
    "transfer",
    "expense",
    "investment",
    "saving",
  ].includes(rawType)
    ? rawType
    : "expense";
  const flowType =
    type === "income" || type === "transfer" ? type : "expense";

  return {
    ...(item && typeof item === "object" ? item : {}),
    id: item?.id || `transaction-${now}-${Math.random().toString(36).slice(2)}`,
    type,
    flowType,
    title: item?.title || item?.merchant || "",
    amount: Math.max(0, Number(item?.amount) || 0),
    date: item?.date || "",
    time: item?.time || "",
    category: item?.category || "기타",
    subCategory: item?.subCategory || "",
    accountId: item?.accountId || getDefaultFinanceAccountId(accounts, "living"),
    targetAccountId: item?.targetAccountId || "",
    assetId: item?.assetId || "",
    paymentMethod: item?.paymentMethod || "",
    merchant: item?.merchant || "",
    tag: item?.tag || "",
    color: item?.color || "#2563eb",
    memo: item?.memo || "",
    repeat: item?.repeat || "none",
    repeatUntil: item?.repeatUntil || "",
    isRecurring: Boolean(item?.isRecurring ?? item?.repeat !== "none"),
    relationshipLedger:
      item?.relationshipLedger && typeof item.relationshipLedger === "object"
        ? {
            withWhom: item.relationshipLedger.withWhom || item.withWhom || "나",
            what: item.relationshipLedger.what || item.what || "",
            how: item.relationshipLedger.how || item.how || "",
            memo: item.relationshipLedger.memo || item.relationshipMemo || "",
          }
        : {
            withWhom: item?.withWhom || "나",
            what: item?.what || "",
            how: item?.how || "",
            memo: item?.relationshipMemo || "",
          },
    createdAt,
    updatedAt: Number(item?.updatedAt) || createdAt,
  };
}

function normalizeFinanceAsset(item, accounts) {
  const now = Date.now();
  const createdAt = Number(item?.createdAt) || Number(item?.updatedAt) || now;
  const name = item?.name || item?.title || "";
  const rawType = item?.type || item?.category || "other";
  const type =
    rawType === "stock" || rawType === "investment"
      ? "investment"
      : rawType === "deposit" || rawType === "saving" || rawType === "savings"
        ? "deposit_saving"
        : rawType || "other";

  return {
    ...(item && typeof item === "object" ? item : {}),
    id: item?.id || `asset-${now}-${Math.random().toString(36).slice(2)}`,
    financeAssetSchemaVersion: Number(item?.financeAssetSchemaVersion) || 3,
    source: item?.source || "finance-v2",
    type,
    category: type,
    name,
    title: item?.title || name,
    amount: Math.max(0, Number(item?.amount) || 0),
    accountId:
      item?.accountId ||
      getDefaultFinanceAccountId(
        accounts,
        type === "investment" ? "investment" : "savings",
      ),
    purpose: item?.purpose || item?.accountPurpose || "general",
    accountPurpose: item?.accountPurpose || item?.purpose || "general",
    memo: item?.memo || "",
    baseDate: item?.baseDate || item?.createdDate || "",
    repeat: item?.repeat || "none",
    repeatUntil: item?.repeatUntil || "",
    isRecurring: Boolean(item?.isRecurring ?? item?.repeat !== "none"),
    createdAt,
    updatedAt: Number(item?.updatedAt) || createdAt,
  };
}

function isFinanceV2Asset(item) {
  return (
    Number(item?.financeAssetSchemaVersion) >= 3 ||
    item?.source === "finance-v2"
  );
}

export function normalizeFinanceData(data) {
  const source = data && typeof data === "object" ? data : {};
  const rawBudgetEntries =
    source.budgetEntries && typeof source.budgetEntries === "object"
      ? source.budgetEntries
      : source.monthlyBudgets && typeof source.monthlyBudgets === "object"
        ? source.monthlyBudgets
        : {};

  const defaultStartDay = Math.max(
    1,
    Math.min(31, Number(source?.budgetSettings?.defaultStartDay) || 1),
  );

  const budgetEntries = Object.entries(rawBudgetEntries).reduce(
    (acc, [monthKey, entry]) => {
      if (!monthKey) return acc;
      acc[monthKey] = normalizeBudgetEntry(monthKey, entry, defaultStartDay);
      return acc;
    },
    {},
  );

  const accounts = source.accounts
    ? ensureDefaultFinanceAccounts(source.accounts)
    : buildDefaultFinanceAccounts();
  const rawTransactions = Array.isArray(source?.transactions)
    ? source.transactions
    : Array.isArray(source?.expenses)
      ? source.expenses
      : [];
  const transactions = rawTransactions.map((item) =>
    normalizeFinanceTransaction(item, accounts),
  );

  return {
    budgetVersion: FINANCE_BUDGET_VERSION,
    budgetSettings: {
      defaultStartDay,
      autoApplyPreviousBudget:
        source?.budgetSettings?.autoApplyPreviousBudget !== false,
    },
    budgetEntries,
    monthlyBudgets: buildLegacyMonthlyBudgets(budgetEntries),
    accounts,
    transactions,
    expenses: transactions,
    relationshipLedger:
      source?.relationshipLedger && typeof source.relationshipLedger === "object"
        ? source.relationshipLedger
        : {},
    assets: Array.isArray(source?.assets)
      ? source.assets
          .filter((item) => isFinanceV2Asset(item))
          .map((item) => normalizeFinanceAsset(item, accounts))
      : [],
    subscriptions: Array.isArray(source?.subscriptions)
      ? source.subscriptions
      : [],
    assetGoals: Array.isArray(source?.assetGoals) ? source.assetGoals : [],
    accountsMigratedAt: Number(source?.accountsMigratedAt) || Date.now(),
    balanceSyncedAt: Number(source?.balanceSyncedAt) || null,
  };
}

export async function loadRemotePlannerData(uid) {
  const state = getState();
  const { db } = getRefs();

  state.isRemoteLoading = true;

  try {
    const snapshot = await getDoc(
      doc(db, "users", uid, "plannerData", "default"),
    );

    if (snapshot.exists()) {
      const data = normalizePlannerData(snapshot.data());
      state.items = data.items;
      state.projects = data.projects;
      state.inboxItems = data.inboxItems;
      state.routines = data.routines;
      state.ignoredRecommendationIds = data.ignoredRecommendationIds;
      state.rewardsData = data.rewards;
    } else {
      const localData = loadLocalBackup();
      state.items = localData.items;
      state.projects = localData.projects;
      state.inboxItems = localData.inboxItems;
      state.routines = localData.routines;
      state.ignoredRecommendationIds = localData.ignoredRecommendationIds;
      state.rewardsData = localData.rewards;
      await savePlannerDataToCloud();
    }
  } catch (error) {
    console.error("원격 planner 데이터 불러오기 오류:", error);
    const localData = loadLocalBackup();
    state.items = localData.items;
    state.projects = localData.projects;
    state.inboxItems = localData.inboxItems;
    state.routines = localData.routines;
    state.ignoredRecommendationIds = localData.ignoredRecommendationIds;
    state.rewardsData = localData.rewards;
  } finally {
    state.isRemoteLoading = false;
    saveLocalBackup();
  }
}

export async function loadRemoteFinanceData(uid) {
  const state = getState();
  const { db } = getRefs();

  state.isRemoteLoading = true;

  try {
    const snapshot = await getDoc(
      doc(db, "users", uid, "financeData", "default"),
    );

    if (snapshot.exists()) {
      state.financeData = normalizeFinanceData(snapshot.data());
    } else {
      state.financeData = loadFinanceLocal();
      await saveFinanceDataToCloud();
    }
  } catch (error) {
    console.error("원격 finance 데이터 불러오기 오류:", error);
    state.financeData = loadFinanceLocal();
  } finally {
    state.isRemoteLoading = false;
    saveFinanceLocal(state.financeData);
  }
}

export function queueSaveFinanceData() {
  const state = getState();

  if (!state.currentUser || state.isRemoteLoading) return;

  clearTimeout(financeSaveTimer);
  financeSaveTimer = setTimeout(() => {
    saveFinanceDataToCloud();
  }, 350);
}

export async function saveFinanceDataToCloud() {
  const state = getState();
  const { db } = getRefs();

  if (!state.currentUser || state.isRemoteLoading) return;

  const financeData = normalizeFinanceData(state.financeData);

  try {
    await setDoc(
      doc(db, "users", state.currentUser.uid, "financeData", "default"),
      {
        budgetVersion: financeData.budgetVersion,
        budgetSettings: financeData.budgetSettings,
        budgetEntries: financeData.budgetEntries,
        monthlyBudgets: financeData.monthlyBudgets,
        accounts: financeData.accounts,
        transactions: financeData.transactions,
        expenses: financeData.expenses,
        relationshipLedger: financeData.relationshipLedger,
        assets: financeData.assets,
        subscriptions: financeData.subscriptions,
        assetGoals: financeData.assetGoals,
        accountsMigratedAt: financeData.accountsMigratedAt || Date.now(),
        balanceSyncedAt: financeData.balanceSyncedAt || null,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("원격 finance 데이터 저장 오류:", error);
  }
}

export function queueSavePlannerData() {
  const state = getState();

  saveLocalBackup();

  if (!state.currentUser || state.isRemoteLoading) return;

  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    savePlannerDataToCloud();
  }, 350);
}

export async function savePlannerDataToCloud() {
  const state = getState();
  const { db } = getRefs();

  if (!state.currentUser || state.isRemoteLoading) return;

  try {
    await setDoc(
      doc(db, "users", state.currentUser.uid, "plannerData", "default"),
      {
        items: state.items,
        projects: Array.isArray(state.projects) ? state.projects : [],
        inboxItems: Array.isArray(state.inboxItems) ? state.inboxItems : [],
        routines: Array.isArray(state.routines) ? state.routines : [],
        ignoredRecommendationIds: Array.isArray(state.ignoredRecommendationIds)
          ? state.ignoredRecommendationIds
          : [],
        rewards: state.rewardsData || { coinVersion: 1, ledger: [] },
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("원격 planner 데이터 저장 오류:", error);
  }
}

export function saveLocalBackup() {
  const state = getState();
  const { STORAGE_KEY } = getConfig();

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        normalizePlannerData({
          items: state.items,
          projects: state.projects,
          inboxItems: state.inboxItems,
          routines: state.routines,
          ignoredRecommendationIds: state.ignoredRecommendationIds,
          rewards: state.rewardsData,
        }),
      ),
    );
  } catch (error) {
    console.error("로컬 planner 백업 저장 오류:", error);
  }
}

export function loadLocalBackup() {
  const { STORAGE_KEY } = getConfig();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizePlannerData();
    return normalizePlannerData(JSON.parse(raw));
  } catch (error) {
    console.error("로컬 planner 백업 불러오기 오류:", error);
    return normalizePlannerData();
  }
}

export function loadFinanceLocal() {
  const { FINANCE_STORAGE_KEY } = getConfig();

  try {
    const raw = localStorage.getItem(FINANCE_STORAGE_KEY);
    if (!raw) return normalizeFinanceData();
    return normalizeFinanceData(JSON.parse(raw));
  } catch (error) {
    console.error("로컬 finance 데이터 불러오기 오류:", error);
    return normalizeFinanceData();
  }
}

export function saveFinanceLocal(financeData) {
  const { FINANCE_STORAGE_KEY } = getConfig();
  const normalized = normalizeFinanceData(financeData);

  try {
    localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error("로컬 finance 데이터 저장 오류:", error);
  }

  try {
    const state = getState();
    if (state) {
      state.financeData = normalized;
    }
  } catch (error) {
    console.error("finance 상태 동기화 오류:", error);
  }

  queueSaveFinanceData();
}
