// storage.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let financeSaveTimer = null;
const FINANCE_BUDGET_VERSION = 2;

export function normalizePlannerData(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      projects: [],
      inboxItems: [],
      rewards: {
        coinVersion: 1,
        ledger: [],
      },
    };
  }

  const source = data && typeof data === "object" ? data : {};

  return {
    items: Array.isArray(source.items) ? source.items : [],
    projects: Array.isArray(source.projects) ? source.projects : [],
    inboxItems: Array.isArray(source.inboxItems) ? source.inboxItems : [],
    rewards: {
      coinVersion: Number(source.rewards?.coinVersion) || 1,
      ledger: Array.isArray(source.rewards?.ledger) ? source.rewards.ledger : [],
    },
  };
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

function buildLegacyMonthlyBudgets(budgetEntries) {
  return Object.entries(
    budgetEntries && typeof budgetEntries === "object" ? budgetEntries : {},
  ).reduce((acc, [monthKey, entry]) => {
    if (!entry || typeof entry !== "object") return acc;

    acc[monthKey] = {
      monthKey,
      startDay: Math.max(1, Math.min(31, Number(entry.startDay) || 1)),
      budget: Math.max(
        0,
        Number(entry.totalBudget ?? entry.budget ?? 0) || 0,
      ),
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

  return {
    budgetVersion: FINANCE_BUDGET_VERSION,
    budgetSettings: {
      defaultStartDay,
      autoApplyPreviousBudget:
        source?.budgetSettings?.autoApplyPreviousBudget !== false,
    },
    budgetEntries,
    monthlyBudgets: buildLegacyMonthlyBudgets(budgetEntries),
    expenses: Array.isArray(source?.expenses) ? source.expenses : [],
    assets: Array.isArray(source?.assets) ? source.assets : [],
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
      state.rewardsData = data.rewards;
    } else {
      const localData = loadLocalBackup();
      state.items = localData.items;
      state.projects = localData.projects;
      state.inboxItems = localData.inboxItems;
      state.rewardsData = localData.rewards;
      await savePlannerDataToCloud();
    }
  } catch (error) {
    console.error("원격 데이터 불러오기 오류:", error);
    const localData = loadLocalBackup();
    state.items = localData.items;
    state.projects = localData.projects;
    state.inboxItems = localData.inboxItems;
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
    console.error("원격 가계부 데이터 불러오기 오류:", error);
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
        expenses: Array.isArray(financeData?.expenses)
          ? financeData.expenses
          : [],
        assets: Array.isArray(financeData?.assets)
          ? financeData.assets
          : [],
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("원격 가계부 데이터 저장 오류:", error);
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
        rewards: state.rewardsData || { coinVersion: 1, ledger: [] },
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("원격 데이터 저장 오류:", error);
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
          rewards: state.rewardsData,
        }),
      ),
    );
  } catch (error) {
    console.error("로컬 백업 저장 오류:", error);
  }
}

export function loadLocalBackup() {
  const { STORAGE_KEY } = getConfig();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizePlannerData();
    const parsed = JSON.parse(raw);
    return normalizePlannerData(parsed);
  } catch (error) {
    console.error("로컬 백업 불러오기 오류:", error);
    return normalizePlannerData();
  }
}

export function loadFinanceLocal() {
  const { FINANCE_STORAGE_KEY } = getConfig();

  try {
    const raw = localStorage.getItem(FINANCE_STORAGE_KEY);

    if (!raw) {
      return normalizeFinanceData();
    }

    return normalizeFinanceData(JSON.parse(raw));
  } catch (error) {
    console.error("가계부 로컬 데이터 불러오기 오류:", error);
    return normalizeFinanceData();
  }
}

export function saveFinanceLocal(financeData) {
  const { FINANCE_STORAGE_KEY } = getConfig();
  const normalized = normalizeFinanceData(financeData);

  try {
    localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error("가계부 로컬 데이터 저장 오류:", error);
  }

  try {
    const state = getState();
    if (state) {
      state.financeData = normalized;
    }
  } catch (error) {
    console.error("가계부 상태 동기화 오류:", error);
  }

  queueSaveFinanceData();
}
