export const GLOBAL_VOICE_CONFIG = {
  routes: {
    dashboard: '/dashboard',
    inventory: '/inventory',
    reports: '/reports',
    profile: '/profile',
    settings: '/settings',
  },
  synonyms: {
    search: ['search', 'find', 'look for'],
    edit: ['edit', 'update', 'modify', 'change'],
    delete: ['delete', 'remove'],
    open: ['open', 'view', 'show'],
    sync: ['sync', 'refresh', 'update inventory'],
  },
  posProviders: [
    'mckesson',
    'toshiba',
    'square',
    'ncr',
    'lightspeed',
    'lsretail',
    'oracle',
    'propel',
  ],
  commandSchemas: {
    dashboard: ['connect_pos', 'sync_inventory', 'search_medication', 'edit_medication', 'delete_medication'],
  },
};
