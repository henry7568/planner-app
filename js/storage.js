// storage.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
}