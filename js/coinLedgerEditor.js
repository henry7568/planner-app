import {
  deleteCoinLedgerEntry,
  updateCoinLedgerEntry,
} from "./rewardLedgerActions.js";
import { normalizeRewardsData } from "./rewards.js";

let deps = {};
let editingCoinLedgerId = null;

export function configureCoinLedgerEditor(options = {}) {
  deps = options;
}

function getRefs() {
  return deps.refs || {};
}

function getRewardsData() {
  return deps.getRewardsData?.() || {};
}

function setRewardsData(nextData) {
  deps.setRewardsData?.(nextData);
}

function getCoinLedgerEntry(id) {
  return normalizeRewardsData(getRewardsData()).ledger.find(
    (entry) => entry.id === id,
  );
}

export function openCoinLedgerEditPopup(id) {
  const {
    coinLedgerDirectionInput,
    coinLedgerAmountInput,
    coinLedgerMemoInput,
    coinLedgerEditOverlay,
  } = getRefs();
  const entry = getCoinLedgerEntry(id);
  if (!entry) return;

  editingCoinLedgerId = id;
  if (coinLedgerDirectionInput) {
    coinLedgerDirectionInput.value =
      Number(entry.amount) < 0 ? "negative" : "positive";
  }
  if (coinLedgerAmountInput) {
    coinLedgerAmountInput.value = String(Math.abs(Number(entry.amount) || 0));
  }
  if (coinLedgerMemoInput) {
    coinLedgerMemoInput.value = entry.itemTitle || "";
  }

  coinLedgerEditOverlay?.classList.remove("hidden");
  requestAnimationFrame(() => coinLedgerAmountInput?.focus());
}

export function closeCoinLedgerEditPopup() {
  const { coinLedgerEditOverlay, coinLedgerEditForm } = getRefs();

  editingCoinLedgerId = null;
  coinLedgerEditOverlay?.classList.add("hidden");
  coinLedgerEditForm?.reset();
}

export function saveCoinLedgerEdit() {
  const {
    coinLedgerDirectionInput,
    coinLedgerAmountInput,
    coinLedgerMemoInput,
  } = getRefs();

  if (!editingCoinLedgerId) return;

  const amount = Number(coinLedgerAmountInput?.value || 0);
  const memo = coinLedgerMemoInput?.value.trim() || "코인 로그";
  const direction = coinLedgerDirectionInput?.value || "positive";

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("코인 수량을 1 이상으로 입력해주세요.");
    coinLedgerAmountInput?.focus();
    return;
  }

  setRewardsData(
    updateCoinLedgerEntry(getRewardsData(), editingCoinLedgerId, {
      amount,
      memo,
      direction,
    }),
  );

  closeCoinLedgerEditPopup();
  deps.queueSavePlannerData?.();
  deps.renderDashboard?.();
  deps.renderFinance?.();
}

export function deleteEditingCoinLedger() {
  if (!editingCoinLedgerId) return;

  const ok = confirm("이 코인 로그를 삭제할까요?");
  if (!ok) return;

  setRewardsData(deleteCoinLedgerEntry(getRewardsData(), editingCoinLedgerId));
  closeCoinLedgerEditPopup();
  deps.queueSavePlannerData?.();
  deps.renderDashboard?.();
  deps.renderFinance?.();
}
