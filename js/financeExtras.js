// financeExtras.js
import { escapeHtml, formatDateKey, formatMoney, makeId } from "./utils.js";
import { normalizeFinanceData, saveFinanceLocal } from "./storage.js";
import { COIN_KRW_VALUE, getCoinBalance } from "./rewards.js";

let deps = {};

export function configureFinanceExtrasModule(config) {
  deps = config;
}

function getRefs() {
  return deps.refs || {};
}

function getFinanceData() {
  return normalizeFinanceData(deps.getFinanceData?.());
}

function setFinanceData(value) {
  deps.setFinanceData?.(normalizeFinanceData(value));
}

function getRewardsData() {
  return deps.getRewardsData?.() || {};
}

export function renderFinanceExtras() {
  renderSubscriptionPanel();
  renderAssetGoalPanel();
  renderAssetGoalAssetOptions();
}

export function saveSubscriptionFromForm() {
  const refs = getRefs();
  const title = refs.financeSubscriptionTitle?.value.trim() || "";
  const amount = Math.max(0, Number(refs.financeSubscriptionAmount?.value) || 0);

  if (!title || amount <= 0) {
    alert("구독명과 금액을 입력하세요.");
    refs.financeSubscriptionTitle?.focus();
    return;
  }

  const data = getFinanceData();
  const editingId = refs.financeSubscriptionId?.value || "";
  const existing = data.subscriptions.find((item) => item.id === editingId);
  const now = Date.now();
  const nextBillingDate =
    refs.financeSubscriptionNextBillingDate?.value ||
    getNextBillingDateFromDay(Number(refs.financeSubscriptionBillingDay?.value) || 1);

  const payload = {
    id: editingId || makeId(),
    title,
    amount,
    category: refs.financeSubscriptionCategory?.value || "subscription",
    paymentMethod: refs.financeSubscriptionPaymentMethod?.value || "",
    billingCycle: refs.financeSubscriptionBillingCycle?.value || "monthly",
    billingDay: Math.max(
      1,
      Math.min(31, Number(refs.financeSubscriptionBillingDay?.value) || 1),
    ),
    nextBillingDate,
    memo: refs.financeSubscriptionMemo?.value.trim() || "",
    color: refs.financeSubscriptionColor?.value || "blue",
    isActive: refs.financeSubscriptionActive?.checked !== false,
    createdAt: Number(existing?.createdAt) || now,
    updatedAt: now,
  };

  const nextData = {
    ...data,
    subscriptions: editingId
      ? data.subscriptions.map((item) => (item.id === editingId ? payload : item))
      : [...data.subscriptions, payload],
  };

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  resetSubscriptionForm();
  renderFinanceExtras();
}

export function editSubscription(id) {
  const refs = getRefs();
  const item = getFinanceData().subscriptions.find((x) => x.id === id);
  if (!item) return;

  if (refs.financeSubscriptionId) refs.financeSubscriptionId.value = item.id;
  if (refs.financeSubscriptionTitle) refs.financeSubscriptionTitle.value = item.title || "";
  if (refs.financeSubscriptionAmount) refs.financeSubscriptionAmount.value = item.amount || "";
  if (refs.financeSubscriptionCategory) refs.financeSubscriptionCategory.value = item.category || "subscription";
  if (refs.financeSubscriptionPaymentMethod) refs.financeSubscriptionPaymentMethod.value = item.paymentMethod || "";
  if (refs.financeSubscriptionBillingCycle) refs.financeSubscriptionBillingCycle.value = item.billingCycle || "monthly";
  if (refs.financeSubscriptionBillingDay) refs.financeSubscriptionBillingDay.value = item.billingDay || 1;
  if (refs.financeSubscriptionNextBillingDate) refs.financeSubscriptionNextBillingDate.value = item.nextBillingDate || "";
  if (refs.financeSubscriptionMemo) refs.financeSubscriptionMemo.value = item.memo || "";
  if (refs.financeSubscriptionColor) refs.financeSubscriptionColor.value = item.color || "blue";
  if (refs.financeSubscriptionActive) refs.financeSubscriptionActive.checked = item.isActive !== false;
  if (refs.financeSubscriptionSaveBtn) refs.financeSubscriptionSaveBtn.textContent = "구독 수정";
  refs.financeSubscriptionCancelBtn?.classList.remove("hidden");
  refs.financeSubscriptionTitle?.focus();
}

export function resetSubscriptionForm() {
  const refs = getRefs();
  if (refs.financeSubscriptionId) refs.financeSubscriptionId.value = "";
  if (refs.financeSubscriptionTitle) refs.financeSubscriptionTitle.value = "";
  if (refs.financeSubscriptionAmount) refs.financeSubscriptionAmount.value = "";
  if (refs.financeSubscriptionCategory) refs.financeSubscriptionCategory.value = "subscription";
  if (refs.financeSubscriptionPaymentMethod) refs.financeSubscriptionPaymentMethod.value = "";
  if (refs.financeSubscriptionBillingCycle) refs.financeSubscriptionBillingCycle.value = "monthly";
  if (refs.financeSubscriptionBillingDay) refs.financeSubscriptionBillingDay.value = String(new Date().getDate());
  if (refs.financeSubscriptionNextBillingDate) refs.financeSubscriptionNextBillingDate.value = "";
  if (refs.financeSubscriptionMemo) refs.financeSubscriptionMemo.value = "";
  if (refs.financeSubscriptionColor) refs.financeSubscriptionColor.value = "blue";
  if (refs.financeSubscriptionActive) refs.financeSubscriptionActive.checked = true;
  if (refs.financeSubscriptionSaveBtn) refs.financeSubscriptionSaveBtn.textContent = "구독 추가";
  refs.financeSubscriptionCancelBtn?.classList.add("hidden");
}

export function deleteSubscription(id) {
  if (!confirm("이 구독을 삭제할까요?")) return;
  const data = getFinanceData();
  const nextData = {
    ...data,
    subscriptions: data.subscriptions.filter((item) => item.id !== id),
  };
  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  renderFinanceExtras();
}

export function addSubscriptionExpense(id) {
  const data = getFinanceData();
  const sub = data.subscriptions.find((item) => item.id === id);
  if (!sub) return;

  const date = sub.nextBillingDate || getNextBillingDateFromDay(sub.billingDay);
  const nextData = {
    ...data,
    expenses: [
      ...data.expenses,
      {
        id: makeId(),
        flowType: "expense",
        title: sub.title,
        amount: Number(sub.amount) || 0,
        category: sub.category || "subscription",
        subCategory: "",
        paymentMethod: sub.paymentMethod || "",
        merchant: sub.title,
        tag: "구독",
        color: sub.color || "blue",
        date,
        time: "",
        repeat: "none",
        repeatUntil: "",
        subscriptionId: sub.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    subscriptions: data.subscriptions.map((item) =>
      item.id === id
        ? {
            ...item,
            nextBillingDate: getNextBillingDateAfter(date, item.billingCycle, item.billingDay),
            updatedAt: Date.now(),
          }
        : item,
    ),
  };

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  renderFinanceExtras();
  deps.renderFinance?.();
}

export function saveAssetGoalFromForm() {
  const refs = getRefs();
  const title = refs.financeAssetGoalTitle?.value.trim() || "";
  const targetAmount = Math.max(0, Number(refs.financeAssetGoalTargetAmount?.value) || 0);

  if (!title || targetAmount <= 0) {
    alert("목표명과 목표 금액을 입력하세요.");
    refs.financeAssetGoalTitle?.focus();
    return;
  }

  const data = getFinanceData();
  const editingId = refs.financeAssetGoalId?.value || "";
  const existing = data.assetGoals.find((item) => item.id === editingId);
  const linkedAssetIds = [...(refs.financeAssetGoalLinkedAssets?.selectedOptions || [])].map(
    (option) => option.value,
  );
  const now = Date.now();
  const payload = {
    id: editingId || makeId(),
    title,
    targetAmount,
    currentAmount:
      linkedAssetIds.length > 0
        ? getLinkedAssetTotal(linkedAssetIds, data.assets)
        : Math.max(0, Number(refs.financeAssetGoalCurrentAmount?.value) || 0),
    linkedAssetIds,
    targetDate: refs.financeAssetGoalTargetDate?.value || "",
    category: refs.financeAssetGoalCategory?.value || "saving",
    memo: refs.financeAssetGoalMemo?.value.trim() || "",
    color: refs.financeAssetGoalColor?.value || "green",
    createdAt: Number(existing?.createdAt) || now,
    updatedAt: now,
  };

  const nextData = {
    ...data,
    assetGoals: editingId
      ? data.assetGoals.map((item) => (item.id === editingId ? payload : item))
      : [...data.assetGoals, payload],
  };

  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  resetAssetGoalForm();
  renderFinanceExtras();
}

export function editAssetGoal(id) {
  const refs = getRefs();
  const item = getFinanceData().assetGoals.find((x) => x.id === id);
  if (!item) return;

  if (refs.financeAssetGoalId) refs.financeAssetGoalId.value = item.id;
  if (refs.financeAssetGoalTitle) refs.financeAssetGoalTitle.value = item.title || "";
  if (refs.financeAssetGoalTargetAmount) refs.financeAssetGoalTargetAmount.value = item.targetAmount || "";
  if (refs.financeAssetGoalCurrentAmount) refs.financeAssetGoalCurrentAmount.value = item.currentAmount || "";
  if (refs.financeAssetGoalTargetDate) refs.financeAssetGoalTargetDate.value = item.targetDate || "";
  if (refs.financeAssetGoalCategory) refs.financeAssetGoalCategory.value = item.category || "saving";
  if (refs.financeAssetGoalMemo) refs.financeAssetGoalMemo.value = item.memo || "";
  if (refs.financeAssetGoalColor) refs.financeAssetGoalColor.value = item.color || "green";
  if (refs.financeAssetGoalLinkedAssets) {
    [...refs.financeAssetGoalLinkedAssets.options].forEach((option) => {
      option.selected = (item.linkedAssetIds || []).includes(option.value);
    });
  }
  if (refs.financeAssetGoalSaveBtn) refs.financeAssetGoalSaveBtn.textContent = "목표 수정";
  refs.financeAssetGoalCancelBtn?.classList.remove("hidden");
  refs.financeAssetGoalTitle?.focus();
}

export function resetAssetGoalForm() {
  const refs = getRefs();
  if (refs.financeAssetGoalId) refs.financeAssetGoalId.value = "";
  if (refs.financeAssetGoalTitle) refs.financeAssetGoalTitle.value = "";
  if (refs.financeAssetGoalTargetAmount) refs.financeAssetGoalTargetAmount.value = "";
  if (refs.financeAssetGoalCurrentAmount) refs.financeAssetGoalCurrentAmount.value = "";
  if (refs.financeAssetGoalTargetDate) refs.financeAssetGoalTargetDate.value = "";
  if (refs.financeAssetGoalCategory) refs.financeAssetGoalCategory.value = "saving";
  if (refs.financeAssetGoalMemo) refs.financeAssetGoalMemo.value = "";
  if (refs.financeAssetGoalColor) refs.financeAssetGoalColor.value = "green";
  if (refs.financeAssetGoalLinkedAssets) {
    [...refs.financeAssetGoalLinkedAssets.options].forEach((option) => {
      option.selected = false;
    });
  }
  if (refs.financeAssetGoalSaveBtn) refs.financeAssetGoalSaveBtn.textContent = "목표 추가";
  refs.financeAssetGoalCancelBtn?.classList.add("hidden");
}

export function deleteAssetGoal(id) {
  if (!confirm("이 목표 자산을 삭제할까요?")) return;
  const data = getFinanceData();
  const nextData = {
    ...data,
    assetGoals: data.assetGoals.filter((item) => item.id !== id),
  };
  setFinanceData(nextData);
  saveFinanceLocal(nextData);
  renderFinanceExtras();
}

function renderSubscriptionPanel() {
  const refs = getRefs();
  const listEl = refs.financeSubscriptionList;
  const summaryEl = refs.financeSubscriptionMonthlyTotalText;
  if (!listEl && !summaryEl) return;

  const subscriptions = getFinanceData().subscriptions || [];
  const activeSubscriptions = subscriptions.filter((item) => item.isActive !== false);
  const monthlyTotal = activeSubscriptions.reduce(
    (sum, item) => sum + getMonthlySubscriptionAmount(item),
    0,
  );

  if (summaryEl) summaryEl.textContent = formatMoney(monthlyTotal);
  if (!listEl) return;

  listEl.innerHTML = subscriptions.length
    ? subscriptions.map(renderSubscriptionCard).join("")
    : `<div class="empty-message compact-empty">등록된 구독이 없습니다.</div>`;
}

function renderSubscriptionCard(item) {
  const isSoon = getDateDiffDays(formatDateKey(new Date()), item.nextBillingDate) <= 7;
  const status = item.isActive === false ? "비활성" : isSoon ? "7일 이내" : "활성";

  return `
    <article class="finance-extra-card ${isSoon ? "is-soon" : ""}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.paymentMethod || "결제수단 없음")} · ${escapeHtml(item.billingCycle === "yearly" ? "연간" : "월간")}</span>
      </div>
      <div class="finance-extra-amount">
        <strong>${formatMoney(item.amount)}</strong>
        <span>${escapeHtml(item.nextBillingDate || "-")} · ${status}</span>
      </div>
      <div class="finance-extra-actions">
        <button class="secondary-btn" type="button" data-action="add-subscription-expense" data-id="${item.id}">지출로 추가</button>
        <button class="secondary-btn" type="button" data-action="edit-subscription" data-id="${item.id}">수정</button>
        <button class="secondary-btn" type="button" data-action="delete-subscription" data-id="${item.id}">삭제</button>
      </div>
    </article>
  `;
}

function renderAssetGoalPanel() {
  const refs = getRefs();
  const listEl = refs.financeAssetGoalList;
  const insightEl = refs.financeAssetGoalInsightText;
  if (!listEl && !insightEl) return;

  const data = getFinanceData();
  const goals = (data.assetGoals || []).map((goal) => ({
    ...goal,
    currentAmount: goal.linkedAssetIds?.length
      ? getLinkedAssetTotal(goal.linkedAssetIds, data.assets)
      : Number(goal.currentAmount) || 0,
  }));

  if (insightEl) {
    insightEl.textContent = getAssetGoalInsight(goals);
  }

  if (!listEl) return;

  listEl.innerHTML = goals.length
    ? goals.map(renderAssetGoalCard).join("")
    : `<div class="empty-message compact-empty">등록된 목표 자산이 없습니다.</div>`;
}

function renderAssetGoalCard(goal) {
  const progress = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0;
  const remain = Math.max(0, goal.targetAmount - goal.currentAmount);
  const daysLeft = goal.targetDate
    ? Math.max(0, getDateDiffDays(formatDateKey(new Date()), goal.targetDate))
    : 0;
  const monthlyNeeded = daysLeft > 0
    ? Math.ceil(remain / Math.max(1, Math.ceil(daysLeft / 30)))
    : remain;

  return `
    <article class="finance-extra-card finance-goal-card color-${escapeHtml(goal.color || "green")}">
      <div>
        <strong>${escapeHtml(goal.title)}</strong>
        <span>${escapeHtml(goal.category || "목표")} · ${daysLeft ? `${daysLeft}일 남음` : "목표일 없음"}</span>
      </div>
      <div class="finance-extra-amount">
        <strong>${progress}%</strong>
        <span>${formatMoney(goal.currentAmount)} / ${formatMoney(goal.targetAmount)}</span>
      </div>
      <div class="finance-extra-progress">
        <div style="width: ${Math.max(2, progress)}%"></div>
      </div>
      <div class="finance-extra-meta">
        <span>남은 금액 ${formatMoney(remain)}</span>
        <span>월 필요 저축액 ${formatMoney(monthlyNeeded)}</span>
      </div>
      <div class="finance-extra-actions">
        <button class="secondary-btn" type="button" data-action="edit-asset-goal" data-id="${goal.id}">수정</button>
        <button class="secondary-btn" type="button" data-action="delete-asset-goal" data-id="${goal.id}">삭제</button>
      </div>
    </article>
  `;
}

function renderAssetGoalAssetOptions() {
  const select = getRefs().financeAssetGoalLinkedAssets;
  if (!select) return;

  const selected = new Set([...select.selectedOptions].map((option) => option.value));
  select.innerHTML = (getFinanceData().assets || [])
    .filter((asset) => asset.id)
    .map(
      (asset) => `
        <option value="${asset.id}" ${selected.has(asset.id) ? "selected" : ""}>
          ${escapeHtml(asset.name || asset.title || "자산")} · ${formatMoney(asset.amount)}
        </option>
      `,
    )
    .join("");
}

function getAssetGoalInsight(goals) {
  if (!goals.length) {
    return "목표 자산을 추가하면 AI 보상 지갑과 비교해 보여드립니다.";
  }

  const hobbyBudget = getCoinBalance(getRewardsData()) * COIN_KRW_VALUE;
  const nearestGoal = [...goals].sort(
    (a, b) =>
      Math.max(0, (Number(a.targetAmount) || 0) - (Number(a.currentAmount) || 0)) -
      Math.max(0, (Number(b.targetAmount) || 0) - (Number(b.currentAmount) || 0)),
  )[0];
  const gap = Math.max(0, nearestGoal.targetAmount - nearestGoal.currentAmount);

  if (hobbyBudget >= gap && gap > 0) {
    return `AI 보상 지갑 예산이 ${nearestGoal.title}의 남은 금액을 넘었습니다.`;
  }

  return `AI 보상 지갑 예산은 ${formatMoney(hobbyBudget)} · 가장 가까운 목표까지 ${formatMoney(gap)} 남았습니다.`;
}

function getLinkedAssetTotal(assetIds, assets) {
  const idSet = new Set(assetIds || []);
  return (assets || [])
    .filter((asset) => idSet.has(asset.id))
    .reduce((sum, asset) => sum + (Number(asset.amount) || 0), 0);
}

function getMonthlySubscriptionAmount(item) {
  const amount = Number(item.amount) || 0;
  return item.billingCycle === "yearly" ? Math.round(amount / 12) : amount;
}

function getNextBillingDateFromDay(day) {
  const today = new Date();
  const safeDay = Math.max(1, Math.min(31, Number(day) || 1));
  let candidate = new Date(today.getFullYear(), today.getMonth(), safeDay);

  if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    candidate = new Date(today.getFullYear(), today.getMonth() + 1, safeDay);
  }

  return formatDateKey(candidate);
}

function getNextBillingDateAfter(dateKey, cycle, day) {
  const base = new Date(`${dateKey}T00:00`);
  const next = new Date(
    base.getFullYear() + (cycle === "yearly" ? 1 : 0),
    base.getMonth() + (cycle === "yearly" ? 0 : 1),
    Math.max(1, Math.min(31, Number(day) || base.getDate())),
  );
  return formatDateKey(next);
}

function getDateDiffDays(startKey, endKey) {
  if (!startKey || !endKey) return 9999;
  const start = new Date(`${startKey}T00:00`);
  const end = new Date(`${endKey}T00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}
