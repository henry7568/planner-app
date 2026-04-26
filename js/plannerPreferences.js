const DASHBOARD_HIDE_COMPLETED_KEY = "planner_dashboard_hide_completed_v1";
const PROJECT_SECTION_COLLAPSE_KEY = "planner_project_section_collapsed_v1";

export function loadDashboardHideCompletedPreference() {
  try {
    return localStorage.getItem(DASHBOARD_HIDE_COMPLETED_KEY) === "true";
  } catch (error) {
    console.error("완료 숨기기 설정을 불러오지 못했습니다:", error);
    return false;
  }
}

export function saveDashboardHideCompletedPreference(value) {
  try {
    localStorage.setItem(DASHBOARD_HIDE_COMPLETED_KEY, value ? "true" : "false");
  } catch (error) {
    console.error("완료 숨기기 설정을 저장하지 못했습니다:", error);
  }
}

export function loadProjectSectionCollapseState() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(PROJECT_SECTION_COLLAPSE_KEY) || "{}",
    );
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Project section state load failed.", error);
    return {};
  }
}

export function saveProjectSectionCollapseState(state) {
  try {
    localStorage.setItem(
      PROJECT_SECTION_COLLAPSE_KEY,
      JSON.stringify(state || {}),
    );
  } catch (error) {
    console.error("Project section state save failed.", error);
  }
}
