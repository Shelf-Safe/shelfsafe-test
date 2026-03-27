export function buildDashboardSimplePromptSection() {
  return `Dashboard page notes:
- This page mixes summary widgets with an action-required medication table.
- If the user mentions a POS provider such as Toshiba, NCR, or Square, that usually means opening or changing POS on the dashboard.
- Edit and delete should target a visible dashboard medication row whenever possible.
- Open, click, press, select, touch, or view followed by a medication name should map to DASHBOARD_OPEN_ITEM, not edit.
- If the user says connect/change/open POS plus a provider name, return the provider in providerKey or value when possible.`;
}
