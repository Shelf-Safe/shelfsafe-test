export const PAGE_CATALOG = {
  dashboard: {
    pageId: 'dashboard',
    aliases: ['dashboard', 'home', 'main screen'],
    actions: [
      { type: 'DASHBOARD_SYNC', description: 'Sync the dashboard inventory from the connected POS.' },
      { type: 'DASHBOARD_OPEN_POS', description: 'Open the POS connection modal.' },
      { type: 'DASHBOARD_DISCONNECT_POS', description: 'Disconnect the current POS provider.' },
      { type: 'DASHBOARD_SEARCH', needsValue: true, valueLabel: 'search query', description: 'Search dashboard action items.' },
      { type: 'DASHBOARD_CLEAR_SEARCH', description: 'Clear the dashboard search field.' },
      { type: 'DASHBOARD_SORT_PRIORITY', needsSortDirection: true, needsPriorityValue: true, description: 'Sort dashboard by priority, optionally using a priority bucket.' },
      { type: 'DASHBOARD_SORT_EXPIRY', needsSortDirection: true, description: 'Sort dashboard by expiry date.' },
      { type: 'DASHBOARD_CLEAR_SORT', description: 'Clear dashboard sorting.' },
      { type: 'DASHBOARD_EDIT_ITEM', needsValue: true, valueLabel: 'medication name', description: 'Edit a dashboard medication row by name.' },
      { type: 'DASHBOARD_DELETE_ITEM', needsValue: true, valueLabel: 'medication name', description: 'Delete a dashboard medication row by name.' },
    ],
    promptGuidance: [
      'This page mixes summary widgets with an action-required medication table.',
      'Edit and delete should target a visible dashboard medication row whenever possible.',
      'Search on dashboard means searching the dashboard action list, not navigating away.',
      'If the user mentions a POS provider such as NCR or Square, prefer opening or changing the POS connection.',
      'If the request sounds like sync, refresh inventory, or update from POS, prefer DASHBOARD_SYNC.',
    ],
    recoveryExamples: [
      '"sir check advil" can mean DASHBOARD_SEARCH with value "Advil" when fuzzy hints or known medication names support Advil.',
      '"change pos ncr" should become DASHBOARD_OPEN_POS only if the app needs the modal first, otherwise use the closest supported POS flow action available in the frontend.',
      '"delete tylenol" should become DASHBOARD_DELETE_ITEM with value "Tylenol".',
    ],
  },
  inventory: {
    pageId: 'inventory',
    aliases: ['inventory', 'medications', 'medicine list', 'stock'],
    actions: [
      { type: 'INVENTORY_OPEN_ADD', description: 'Open the add medication flow.' },
      { type: 'INVENTORY_SHOW_EXPIRED', description: 'Show only expired medications.' },
      { type: 'INVENTORY_CLEAR_EXPIRED', description: 'Show all medications and clear the expired filter.' },
      { type: 'INVENTORY_SEARCH', needsValue: true, valueLabel: 'medication name or text', description: 'Search the inventory list.' },
    ],
    promptGuidance: [
      'This page is focused on the full medication list and inventory browsing actions.',
      'If the user names a medication, searching the inventory list is often the safest recovery.',
      'Expired and clear-expired actions should be used for status filtering commands.',
    ],
    recoveryExamples: [
      '"show expired meds" should become INVENTORY_SHOW_EXPIRED.',
      '"find tylenol" should become INVENTORY_SEARCH with value "Tylenol".',
    ],
  },
  reports: {
    pageId: 'reports',
    aliases: ['reports', 'report', 'analytics'],
    actions: [
      { type: 'REPORTS_OPEN_GENERATE', description: 'Open the generate report panel.' },
      { type: 'REPORTS_SEARCH', needsValue: true, valueLabel: 'report search text', description: 'Search the reports page.' },
    ],
    promptGuidance: [
      'This page is for report generation, browsing, and search.',
      'Prefer REPORTS_OPEN_GENERATE when the user asks to create or generate a report.',
    ],
    recoveryExamples: [
      '"generate expiry report" should map to REPORTS_OPEN_GENERATE if that is the closest supported action.',
    ],
  },
  profile: {
    pageId: 'profile',
    aliases: ['profile', 'account'],
    actions: [],
    promptGuidance: ['This page has limited voice actions. Prefer NO_MATCH unless the command is clearly global.'],
    recoveryExamples: [],
  },
  settings: {
    pageId: 'settings',
    aliases: ['settings'],
    actions: [],
    promptGuidance: ['This page has limited voice actions. Prefer NO_MATCH unless the command is clearly global.'],
    recoveryExamples: [],
  },
};

export function getPageCatalog(pageId = 'dashboard') {
  return PAGE_CATALOG[pageId] || PAGE_CATALOG.dashboard;
}
