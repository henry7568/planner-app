// productivityReport.js
import { escapeHtml, formatDateKey } from "./utils.js";
import { expandRecurringPlannerItemsInRange } from "./repeat.js";

let deps = {};
let reportRange = "week";

export function configureProductivityReportModule(config) {
  deps = config;
}

export function setProductivityReportRange(value) {
  reportRange = value === "month" ? "month" : "week";
}

export function getProductivityReportRange() {
  return reportRange;
}

function getItems() {
  return deps.getItems?.() || [];
}

function getProjects() {
  return deps.getProjects?.() || [];
}

function getRewardsData() {
  return deps.getRewardsData?.() || {};
}

function getRefs() {
  return deps.refs || {};
}

export function renderProductivityReport() {
  const { productivityReportCardBody, productivityReportRange } = getRefs();
  if (!productivityReportCardBody) return;

  if (productivityReportRange) {
    productivityReportRange.value = reportRange;
  }

  const report = buildProductivityReport(reportRange);

  productivityReportCardBody.innerHTML = `
    <div class="productivity-report-metrics">
      <div>
        <span>완료율</span>
        <strong>${report.successRate}%</strong>
      </div>
      <div>
        <span>실패율</span>
        <strong>${report.failRate}%</strong>
      </div>
      <div>
        <span>코인 순변동</span>
        <strong>${report.netCoins >= 0 ? "+" : ""}${report.netCoins.toLocaleString()}C</strong>
      </div>
    </div>
    <div class="productivity-report-copy">
      ${report.sentences.map((text) => `<p>${escapeHtml(text)}</p>`).join("")}
    </div>
  `;
}

export function buildProductivityReport(range = reportRange) {
  const { startKey, endKey } = getReportRange(range);
  const items = expandRecurringPlannerItemsInRange(getItems(), startKey, endKey);
  const completed = items.filter((item) => item.status === "success").length;
  const failed = items.filter((item) => item.status === "fail").length;
  const base = completed + failed;
  const successRate = base ? Math.round((completed / base) * 100) : 0;
  const failRate = base ? Math.round((failed / base) * 100) : 0;
  const mostDelayed = getMostDelayedItem(items);
  const topSuccess = getTopOutcomeGroup(items, "success");
  const topFail = getTopOutcomeGroup(items, "fail");
  const coinSummary = getCoinSummary(startKey, endKey);
  const label = range === "month" ? "이번 달" : "이번 주";

  return {
    successRate,
    failRate,
    netCoins: coinSummary.earned - coinSummary.penalty - coinSummary.spent,
    sentences: [
      `${label} 완료율은 ${successRate}%이고 실패율은 ${failRate}%입니다.`,
      mostDelayed
        ? `가장 오래 미뤄진 항목은 "${mostDelayed.title}"입니다. 작게 쪼개거나 일정 블록으로 옮겨보세요.`
        : "오래 미뤄진 pending 항목은 없습니다.",
      topSuccess
        ? `가장 성공 흐름이 좋은 영역은 ${topSuccess.label}입니다. 이미 잘 되는 패턴이니 난이도를 조금 올려도 좋습니다.`
        : "아직 성공 패턴을 판단할 만큼 완료 데이터가 많지 않습니다.",
      topFail
        ? `가장 자주 막힌 영역은 ${topFail.label}입니다. 다음 주에는 시작 시간을 먼저 예약해두는 편이 좋습니다.`
        : "반복적으로 실패한 태그나 프로젝트는 뚜렷하지 않습니다.",
      `코인은 획득 ${coinSummary.earned.toLocaleString()}C, 차감 ${coinSummary.penalty.toLocaleString()}C, 사용 ${coinSummary.spent.toLocaleString()}C입니다.`,
      getImprovementSuggestion(successRate, failRate, mostDelayed),
    ],
  };
}

function getReportRange(range) {
  const now = new Date();

  if (range === "month") {
    return {
      startKey: formatDateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
      endKey: formatDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }

  const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startKey: formatDateKey(start),
    endKey: formatDateKey(end),
  };
}

function getMostDelayedItem(items) {
  const todayKey = formatDateKey(new Date());
  return items
    .filter((item) => item.status === "pending")
    .map((item) => ({
      ...item,
      delayedDays: getDateDiffDays(item.type === "todo" ? item.dueDate : item.startDate, todayKey),
    }))
    .filter((item) => item.delayedDays > 0)
    .sort((a, b) => b.delayedDays - a.delayedDays)[0];
}

function getTopOutcomeGroup(items, status) {
  const projectMap = new Map(getProjects().map((project) => [project.id, project.name]));
  const groups = new Map();

  items
    .filter((item) => item.status === status)
    .forEach((item) => {
      const label = item.projectId
        ? `프로젝트 "${projectMap.get(item.projectId) || "이름 없음"}"`
        : item.tag
          ? `태그 "${item.tag}"`
          : "분류 없음";
      groups.set(label, (groups.get(label) || 0) + 1);
    });

  return [...groups.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)[0];
}

function getCoinSummary(startKey, endKey) {
  return (getRewardsData().ledger || []).reduce(
    (acc, entry) => {
      const dateKey = formatDateKey(new Date(Number(entry.createdAt) || Date.now()));
      if (dateKey < startKey || dateKey > endKey) return acc;
      const amount = Number(entry.amount) || 0;
      if (entry.type === "earn") acc.earned += Math.max(0, amount);
      if (entry.type === "fail_penalty") acc.penalty += Math.abs(Math.min(0, amount));
      if (entry.type === "spend") acc.spent += Math.abs(Math.min(0, amount));
      return acc;
    },
    { earned: 0, penalty: 0, spent: 0 },
  );
}

function getImprovementSuggestion(successRate, failRate, mostDelayed) {
  if (failRate >= 40) return "다음 주에는 하루 계획 수를 줄이고, 실패한 항목부터 오전 블록에 배치해보세요.";
  if (mostDelayed) return "다음 주 개선 제안: 오래 미룬 항목 1개를 30분 일정으로 먼저 고정해보세요.";
  if (successRate >= 80) return "다음 주 개선 제안: 잘 되는 태그는 보상을 낮추고 어려운 프로젝트에 보상을 더 몰아주세요.";
  return "다음 주 개선 제안: 마감 2일 전 항목을 먼저 처리하는 규칙을 시도해보세요.";
}

function getDateDiffDays(fromKey, toKey) {
  if (!fromKey || !toKey) return 0;
  const from = new Date(`${fromKey}T00:00`);
  const to = new Date(`${toKey}T00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}
