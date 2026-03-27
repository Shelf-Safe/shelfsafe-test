export function buildCrossPageChainPromptSection() {
  return `Chain planning notes:
- If the user says "go to dashboard, change pos to toshiba", plan two steps in order: NAVIGATE to /dashboard, then dashboard POS actions.
- Do not collapse a multi-step request into one action.
- Prefer stable, executable frontend actions such as NAVIGATE, DASHBOARD_OPEN_POS, POS_SELECT_PROVIDER, POS_SUBMIT, INVENTORY_SEARCH, REPORTS_OPEN_GENERATE.
- If a POS provider is named after a dashboard navigation, include DASHBOARD_OPEN_POS before POS_SELECT_PROVIDER.
- Keep the plan minimal but complete.
- If the current page is already the target page, do not add a redundant NAVIGATE step.
- For medication commands on dashboard, open/click/press/select/view should become DASHBOARD_OPEN_ITEM; edit should become DASHBOARD_EDIT_ITEM.`;
}
