// storage.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let financeSaveTimer = null;
function getState() {
  return window.AppState;
}

function getRefs() {
  return window.FirebaseRefs;
}

function getConfig() {
  return window.AppConfig;
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
      const data = snapshot.data();
      state.items = Array.isArray(data.items) ? data.items : [];
    } else {
      state.items = loadLocalBackup();
      await savePlannerDataToCloud();
    }
  } catch (error) {
    console.error("원격 데이터 불러오기 오류:", error);
    state.items = loadLocalBackup();
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
      const data = snapshot.data();

      state.financeData = {
        monthlyBudgets:
          data && typeof data.monthlyBudgets === "object"
            ? data.monthlyBudgets
            : {},
        expenses: Array.isArray(data?.expenses) ? data.expenses : [],
        assets: Array.isArray(data?.assets) ? data.assets : [],
      };
    } else {
      state.financeData = loadFinanceLocal();
      await saveFinanceDataToCloud();
    }
  } catch (error) {
    console.error("원격 가계부 데이터 불러오기 오류:", error);
    state.financeData = loadFinanceLocal();
  } finally {
    state.isRemoteLoading = false;
    saveFinanceLocal(state.financeData || {
      monthlyBudgets: {},
      expenses: [],
      assets: [],
    });
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

  const financeData = state.financeData || {
    monthlyBudgets: {},
    expenses: [],
    assets: [],
  };

  try {
    await setDoc(
      doc(db, "users", state.currentUser.uid, "financeData", "default"),
      {
        monthlyBudgets:
          financeData && typeof financeData.monthlyBudgets === "object"
            ? financeData.monthlyBudgets
            : {},
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  } catch (error) {
    console.error("로컬 백업 저장 오류:", error);
  }
}

export function loadLocalBackup() {
  const { STORAGE_KEY } = getConfig();

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

export function loadFinanceLocal() {
  const { FINANCE_STORAGE_KEY } = getConfig();

  try {
    const raw = localStorage.getItem(FINANCE_STORAGE_KEY);

    if (!raw) {
      return {
        monthlyBudgets: {},
        expenses: [],
        assets: [],
      };
    }

    const parsed = JSON.parse(raw);

    return {
      monthlyBudgets:
        parsed && typeof parsed.monthlyBudgets === "object"
          ? parsed.monthlyBudgets
          : {},
      expenses: Array.isArray(parsed?.expenses) ? parsed.expenses : [],
      assets: Array.isArray(parsed?.assets) ? parsed.assets : [],
    };
  } catch (error) {
    console.error("가계부 로컬 데이터 불러오기 오류:", error);
    return {
      monthlyBudgets: {},
      expenses: [],
      assets: [],
    };
  }
}

export function saveFinanceLocal(financeData) {
  const { FINANCE_STORAGE_KEY } = getConfig();

  try {
    localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(financeData));
  } catch (error) {
    console.error("가계부 로컬 데이터 저장 오류:", error);
  }

  try {
    const state = getState();
    if (state) {
      state.financeData = {
        monthlyBudgets:
          financeData && typeof financeData.monthlyBudgets === "object"
            ? financeData.monthlyBudgets
            : {},
        expenses: Array.isArray(financeData?.expenses)
          ? financeData.expenses
          : [],
        assets: Array.isArray(financeData?.assets)
          ? financeData.assets
          : [],
      };
    }
  } catch (error) {
    console.error("가계부 상태 동기화 오류:", error);
  }

  queueSaveFinanceData();
}