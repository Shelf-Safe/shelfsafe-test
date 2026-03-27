export const DASHBOARD_PAGE_ALIASES = [
  'dashboard',
  'dashboard page',
  'home',
  'home page',
  'main page',
  'main screen',
  'main dashboard',
  'landing dashboard',
];

export const DASHBOARD_COMMAND_DATA = {
  navigate: {
    id: 'dashboard-open-page',
    aliases: [
      'open dashboard','go to dashboard','show dashboard','open home','go to home','show home','open home page','go to home page','show home page','open main page','go to main page','open main screen','go to main screen','take me to dashboard','take me home',
    ],
    route: '/dashboard',
  },
  disconnectPos: {
    id: 'dashboard-disconnect-pos',
    aliases: ['disconnect pos','disconnect','disconnect the pos','disconnect from pos','disconnect from the pos','remove pos','unlink pos','remove pos connection','disconnect point of sale'],
    action: 'DASHBOARD_DISCONNECT_POS',
  },
  sync: {
    id: 'dashboard-sync',
    aliases: ['sync inventory','sync','sync now','run sync','start sync','sync the inventory','sync shelf safe inventory','refresh inventory from pos','refresh from pos','update inventory','press sync inventory','press the sync inventory button','click sync inventory','connect and sync'],
    action: 'DASHBOARD_SYNC',
  },
  openPos: {
    id: 'dashboard-open-pos',
    aliases: ['change pos','open pos','open pos modal','connect pos','connect pos to','connect to pos','connect to pos to','change pos to','switch pos to','choose pos','pick pos','switch pos','open pos connection','change point of sale','connect point of sale'],
    action: 'DASHBOARD_OPEN_POS',
  },
  addMedication: {
    id: 'dashboard-add-medication',
    aliases: ['add medication','add medicine','new medication','create medication','add a medication','add a medicine'],
    route: '/inventory?add=1',
  },
  search: {
    id: 'dashboard-search',
    aliases: ['search','search for','find','find medication','find medicine','look for','search medication','search medicine','show medication','show medicine','locate medication'],
    action: 'DASHBOARD_SEARCH',
    needsValue: true,
  },
  clearSearch: {
    id: 'dashboard-clear-search',
    aliases: ['clear search', 'reset search', 'clear the search', 'clear filters', 'reset filters', 'show all items', 'show all medications'],
    action: 'DASHBOARD_CLEAR_SEARCH',
  },
  clearSort: {
    id: 'dashboard-clear-sort',
    aliases: ['clear sort', 'reset sort', 'remove sort', 'default sort'],
    action: 'DASHBOARD_CLEAR_SORT',
  },
  sortPriority: {
    id: 'dashboard-sort-priority',
    aliases: ['sort priority','sort by priority','sort urgency','sort by urgency','order by priority','order by urgency','priority sort','sort by priority high','sort by priority medium','sort by priority mid','sort by priority low','sort by priority med','set priority mid','set priority medium','set by priority mid','set by priority medium','set by priority med','set priority ascending','set priority descending','sort by priority ascending','sort by priority descending','priority high','priority medium','priority low'],
    action: 'DASHBOARD_SORT_PRIORITY',
  },
  sortExpiry: {
    id: 'dashboard-sort-expiry',
    aliases: ['sort expiry','sort by expiry','sort expiry date','sort by expiry date','order by expiry','order by expiry date','expiry sort','expiry ascending','expiry descending','sort by expiry ascending','sort by expiry descending','latest expiry','earliest expiry','expiry date ascending','expiry date descending','sort by expiry latest','sort by expiry earliest'],
    action: 'DASHBOARD_SORT_EXPIRY',
  },
  openMedication: {
    id: 'dashboard-open-medication',
    aliases: ['open medication','open medicine','open item','click medication','click medicine','click item','select medication','select medicine','touch medication','touch medicine','view medication','view medicine'],
    action: 'DASHBOARD_OPEN_ITEM',
    needsValue: true,
  },
  editMedication: {
    id: 'dashboard-edit-medication',
    aliases: ['edit','edit medication','edit medicine','edit item','modify medication','modify medicine','change medication','change medicine'],
    action: 'DASHBOARD_EDIT_ITEM',
    needsValue: true,
  },
  deleteMedication: {
    id: 'dashboard-delete-medication',
    aliases: ['delete','delete medication','delete medicine','remove medication','remove medicine','delete item','remove item'],
    action: 'DASHBOARD_DELETE_ITEM',
    needsValue: true,
  },
};
