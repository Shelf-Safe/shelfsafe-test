export const DASHBOARD_VOICE_SCHEMA = {
  page: 'dashboard',
  entityType: 'medication',
  allowedIntents: [
    'connect_pos',
    'sync_inventory',
    'search_medication',
    'open_medication',
    'edit_medication',
    'delete_medication',
    'open_notification',
  ],
  controls: ['posProviderSelector','syncInventoryButton','alertsPanel','notificationsPanel','searchInput'],
  actions: [
    'DASHBOARD_OPEN_POS',
    'DASHBOARD_SYNC',
    'DASHBOARD_SEARCH',
    'DASHBOARD_CLEAR_SEARCH',
    'DASHBOARD_CLEAR_SORT',
    'DASHBOARD_OPEN_ITEM',
    'DASHBOARD_EDIT_ITEM',
    'DASHBOARD_DELETE_ITEM',
  ],
};
