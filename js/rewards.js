import { makeId } from "./utils.js";

const COIN_VERSION = 1;
const REWARD_LEDGER_LIMIT = 120;
export const COIN_KRW_VALUE = 1000;
export const FAILURE_PENALTY_RATE = 0.3;
const STATUS_LEDGER_TYPES = new Set([
  "earn",
  "revoke",
  "fail_penalty",
  "fail_refund",
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateDiffDays(fromKey, toKey) {
  const from = toDate(fromKey);
  const to = toDate(toKey);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function countMeaningfulWords(text) {
  return String(text || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2).length;
}

function getScheduleDurationHours(item) {
  if (item.type !== "schedule") return 0;

  const start = new Date(
    `${item.startDate || ""}T${item.startTime || "00:00"}`,
  );
  const end = new Date(`${item.endDate || ""}T${item.endTime || "23:59"}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  return Math.max(0.25, (end.getTime() - start.getTime()) / 3600000);
}

function getItemDateKey(item, occurrenceDateKey = "") {
  if (occurrenceDateKey) return occurrenceDateKey;
  if (item.type === "todo") return item.dueDate || "";
  return item.startDate || "";
}

function getTaskText(item) {
  return `${item.title || ""} ${item.tag || ""}`.toLowerCase();
}

function hasAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function getTaskCategory(item) {
  const text = getTaskText(item);
  const workKeywords = [
    "\uC54C\uBC14",
    "\uADFC\uBB34",
    "\uCD9C\uADFC",
    "\uC5C5\uBB34",
    "\uD68C\uC0AC",
    "\uD68C\uC758",
    "\uBBF8\uD305",
    "\uBA74\uC811",
    "\uBC1C\uD45C",
    "\uBCF4\uACE0",
    "\uD504\uB85C\uC81D\uD2B8",
    "\uACE0\uAC1D",
    "\uAC70\uB798\uCC98",
    "\uACFC\uC81C",
    "\uC2DC\uD5D8",
    "\uACF5\uBD80",
    "work",
    "shift",
    "meeting",
    "business",
    "client",
    "project",
    "deadline",
  ];
  const travelKeywords = [
    "\uC5EC\uD589",
    "\uAD00\uAD11",
    "\uD734\uAC00",
    "\uB180\uB7EC",
    "travel",
    "trip",
  ];
  const travelAdminKeywords = [
    "\uC608\uC57D",
    "\uD56D\uACF5",
    "\uBE44\uC790",
    "\uC5EC\uAD8C",
    "\uC219\uC18C",
    "\uACB0\uC81C",
    "\uD658\uBD88",
    "booking",
    "passport",
    "visa",
    "flight",
    "hotel",
  ];
  const socialKeywords = [
    "\uC57D\uC18D",
    "\uCE5C\uAD6C",
    "\uC9C0\uC778",
    "\uBAA8\uC784",
    "\uB370\uC774\uD2B8",
    "\uCE74\uD398",
    "\uC220",
    "\uBC25",
    "\uC0DD\uC77C",
    "friend",
    "date",
    "party",
    "coffee",
  ];

  const isWork = hasAnyKeyword(text, workKeywords);
  const isTravel = hasAnyKeyword(text, travelKeywords);
  const isTravelAdmin = isTravel && hasAnyKeyword(text, travelAdminKeywords);
  const isSocial = hasAnyKeyword(text, socialKeywords);
  const isPersonalLeisure = !isWork && (isSocial || isTravel);

  return {
    isWork,
    isTravel,
    isTravelAdmin,
    isSocial,
    isPersonalLeisure,
  };
}

function getUrgencyScore(item, occurrenceDateKey = "") {
  const targetKey = getItemDateKey(item, occurrenceDateKey);
  const daysLeft = getDateDiffDays(
    new Date().toISOString().slice(0, 10),
    targetKey,
  );

  if (!targetKey) return 0;
  if (daysLeft < 0) return 1;
  if (daysLeft <= 1) return 4;
  if (daysLeft <= 3) return 3;
  if (daysLeft <= 7) return 2;
  return item.dueTime || item.startTime ? 1 : 0;
}

function getImportanceScore(item) {
  const text = getTaskText(item);
  const category = getTaskCategory(item);
  let score = 0;

  if (item.projectId) score += 2;
  if (item.tag) score += 1;
  if (countMeaningfulWords(item.title) >= 3) score += 1;
  if (category.isWork) score += 3;

  [
    "중요",
    "핵심",
    "목표",
    "마감",
    "보고",
    "발표",
    "시험",
    "면접",
    "프로젝트",
    "공부",
    "운동",
    "병원",
    "세금",
    "important",
    "priority",
    "goal",
    "project",
    "deadline",
    "review",
    "report",
    "study",
    "workout",
  ].forEach((keyword) => {
    if (text.includes(keyword)) score += 1;
  });

  if (item.type === "schedule" && getScheduleDurationHours(item) >= 2) {
    score += 1;
  }

  if (category.isPersonalLeisure) {
    score = Math.min(score, category.isTravelAdmin ? 3 : 1);
  }

  return clamp(score, 0, 6);
}

function assessQuadrant(item, occurrenceDateKey = "") {
  const urgencyScore = getUrgencyScore(item, occurrenceDateKey);
  const importanceScore = getImportanceScore(item);
  const isUrgent = urgencyScore >= 3;
  const isImportant = importanceScore >= 3;

  if (isUrgent && isImportant) {
    return { quadrant: 1, baseScore: 9, label: "1사분면: 중요하고 긴급" };
  }

  if (!isUrgent && isImportant) {
    return { quadrant: 2, baseScore: 7, label: "2사분면: 중요하지만 덜 긴급" };
  }

  if (isUrgent && !isImportant) {
    return { quadrant: 3, baseScore: 4, label: "3사분면: 긴급하지만 덜 중요" };
  }

  return { quadrant: 4, baseScore: 2, label: "4사분면: 덜 중요하고 덜 긴급" };
}

function getKeywordScore(item) {
  const text = `${item.title || ""} ${item.tag || ""}`.toLowerCase();
  let score = 0;

  [
    "보고서",
    "발표",
    "시험",
    "면접",
    "프로젝트",
    "정산",
    "운동",
    "공부",
    "청소",
    "병원",
    "세금",
    "마감",
    "review",
    "report",
    "study",
    "workout",
    "project",
    "deadline",
  ].forEach((keyword) => {
    if (text.includes(keyword)) score += 1;
  });

  return clamp(score, 0, 4);
}

export function normalizeRewardsData(data) {
  const source = data && typeof data === "object" ? data : {};

  return {
    coinVersion: COIN_VERSION,
    ledger: Array.isArray(source.ledger) ? source.ledger : [],
  };
}

export function assessTaskReward(item, occurrenceDateKey = "") {
  const quadrant = assessQuadrant(item, occurrenceDateKey);
  const category = getTaskCategory(item);
  const wordScore = countMeaningfulWords(item.title) >= 3 ? 1 : 0;
  const detailScore = item.tag || item.projectId ? 1 : 0;
  const repeatPenalty = item.repeat && item.repeat !== "none" ? -1 : 0;
  const locationScore =
    item.location ||
    (Array.isArray(item.dailyLocations) && item.dailyLocations.length > 0)
      ? 1
      : 0;

  let timeScore = 0;
  if (item.type === "schedule") {
    const hours = getScheduleDurationHours(item);
    if (hours >= 1) timeScore += 1;
    if (hours >= 3) timeScore += 1;
  } else if (item.dueTime) {
    timeScore += 1;
  }

  const rawScore =
    quadrant.baseScore +
    wordScore +
    detailScore +
    locationScore +
    timeScore +
    clamp(getKeywordScore(item), 0, 2) +
    repeatPenalty;

  const maxScore = category.isPersonalLeisure
    ? quadrant.quadrant === 3
      ? 5
      : 3
    : 12;
  const score = clamp(rawScore, 1, maxScore);
  const coinTable = [0, 1, 2, 3, 4, 6, 8, 10, 12, 15, 18, 22, 26];
  const coins = coinTable[score] || 1;
  const difficulty =
    score >= 10 ? "legendary" : score >= 7 ? "hard" : score >= 4 ? "normal" : "light";

  return {
    coins,
    score,
    difficulty,
    quadrant: quadrant.quadrant,
    reason: [
      quadrant.label,
      category.isWork ? "업무/알바 중요도 보정" : "",
      category.isPersonalLeisure ? "사적 약속/여행 낮은 가치 보정" : "",
      item.type === "schedule" ? "일정" : "할일",
      item.repeat && item.repeat !== "none" ? "반복 보정" : "단일 작업",
      item.projectId ? "프로젝트 포함" : "",
      item.tag ? "태그 포함" : "",
    ].filter(Boolean),
  };
}

export function getRewardTargetKey(itemId, occurrenceDateKey = "") {
  return occurrenceDateKey ? `${itemId}__${occurrenceDateKey}` : itemId;
}

export function getCoinBalance(rewardsData) {
  return normalizeRewardsData(rewardsData).ledger.reduce((sum, entry) => {
    return sum + (Number(entry.amount) || 0);
  }, 0);
}

export function getEarnedCoinsForTarget(rewardsData, targetKey) {
  const earnedBalance = normalizeRewardsData(rewardsData).ledger
    .filter(
      (entry) =>
        entry.targetKey === targetKey &&
        (entry.type === "earn" || entry.type === "revoke"),
    )
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  return Math.max(0, earnedBalance);
}

function getFailurePenaltyForTarget(rewardsData, targetKey) {
  const penaltyBalance = normalizeRewardsData(rewardsData).ledger
    .filter(
      (entry) =>
        entry.targetKey === targetKey &&
        (entry.type === "fail_penalty" || entry.type === "fail_refund"),
    )
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  return Math.abs(Math.min(0, penaltyBalance));
}

function getFailurePenaltyAmount(item, targetKey) {
  const reward = assessTaskReward(item, targetKey.split("__")[1] || "");
  return Math.max(1, Math.ceil(reward.coins * FAILURE_PENALTY_RATE));
}

export function applyStatusRewardTransition({
  rewardsData,
  item,
  targetKey,
  previousStatus,
  nextStatus,
}) {
  const normalized = normalizeRewardsData(rewardsData);
  const ledger = normalized.ledger.filter(
    (entry) =>
      entry.targetKey !== targetKey || !STATUS_LEDGER_TYPES.has(entry.type),
  );

  if (nextStatus === "fail") {
    const penalty = getFailurePenaltyAmount(item, targetKey);
    ledger.unshift({
      id: makeId(),
      type: "fail_penalty",
      targetKey,
      itemId: item.id,
      itemTitle: item.title || "",
      amount: -penalty,
      rate: FAILURE_PENALTY_RATE,
      createdAt: Date.now(),
    });
  }

  if (nextStatus === "success") {
    const reward = assessTaskReward(item, targetKey.split("__")[1] || "");
    ledger.unshift({
      id: makeId(),
      type: "earn",
      targetKey,
      itemId: item.id,
      itemTitle: item.title || "",
      amount: reward.coins,
      difficulty: reward.difficulty,
      score: reward.score,
      createdAt: Date.now(),
    });
  }

  return {
    ...normalized,
    ledger: ledger.slice(0, REWARD_LEDGER_LIMIT),
  };
}

export function spendCoins(rewardsData, amount, memo = "") {
  const normalized = normalizeRewardsData(rewardsData);
  const spendAmount = Math.max(0, Math.floor(Number(amount) || 0));

  if (spendAmount <= 0) return normalized;
  if (spendAmount > getCoinBalance(normalized)) {
    throw new Error("보유 코인보다 많이 사용할 수 없습니다.");
  }

  return {
    ...normalized,
    ledger: [
      {
        id: makeId(),
        type: "spend",
        targetKey: "",
        itemId: "",
        itemTitle: memo || "취미생활 사용",
        amount: -spendAmount,
        createdAt: Date.now(),
      },
      ...normalized.ledger,
    ].slice(0, REWARD_LEDGER_LIMIT),
  };
}

export function updateCoinSpendEntry(rewardsData, entryId, amount, memo = "") {
  const normalized = normalizeRewardsData(rewardsData);
  const spendAmount = Math.max(0, Math.floor(Number(amount) || 0));

  if (!entryId || spendAmount <= 0) return normalized;

  return {
    ...normalized,
    ledger: normalized.ledger.map((entry) =>
      entry.id === entryId && entry.type === "spend"
        ? {
            ...entry,
            itemTitle: memo || "취미생활 사용",
            amount: -spendAmount,
            updatedAt: Date.now(),
          }
        : entry,
    ),
  };
}

export function deleteCoinSpendEntry(rewardsData, entryId) {
  const normalized = normalizeRewardsData(rewardsData);

  if (!entryId) return normalized;

  return {
    ...normalized,
    ledger: normalized.ledger.filter(
      (entry) => !(entry.id === entryId && entry.type === "spend"),
    ),
  };
}
