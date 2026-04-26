import { normalizeRewardsData } from "./rewards.js";

export function updateCoinLedgerEntry(
  rewardsData,
  entryId,
  { amount, memo = "", direction = "" } = {},
) {
  const normalized = normalizeRewardsData(rewardsData);
  const nextAmount = Math.max(0, Math.floor(Number(amount) || 0));

  if (!entryId || nextAmount <= 0) return normalized;

  return {
    ...normalized,
    ledger: normalized.ledger.map((entry) => {
      if (entry.id !== entryId) return entry;

      const isNegative =
        direction === "negative"
          ? true
          : direction === "positive"
            ? false
            : Number(entry.amount) < 0;
      const nextType = isNegative
        ? entry.type === "spend"
          ? "spend"
          : "fail_penalty"
        : entry.type === "fail_refund"
          ? "fail_refund"
          : "earn";

      return {
        ...entry,
        type: nextType,
        itemTitle: memo || entry.itemTitle || "코인 로그",
        amount: isNegative ? -nextAmount : nextAmount,
        updatedAt: Date.now(),
      };
    }),
  };
}

export function deleteCoinLedgerEntry(rewardsData, entryId) {
  const normalized = normalizeRewardsData(rewardsData);

  if (!entryId) return normalized;

  return {
    ...normalized,
    ledger: normalized.ledger.filter((entry) => entry.id !== entryId),
  };
}
