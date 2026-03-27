export const inventoryVoice = {
  pageId: 'inventory',
  aliases: ['inventory', 'inventory page', 'medications', 'medicine list', 'stock'],
  commands: [
    { id: 'inventory-add-medication', aliases: ['add medication', 'add medicine', 'new medication', 'create medication'], action: 'INVENTORY_OPEN_ADD' },
    { id: 'inventory-show-expired', aliases: ['show expired', 'only expired', 'expired only', 'show only expired'], action: 'INVENTORY_SHOW_EXPIRED' },
    { id: 'inventory-clear-expired', aliases: ['show all inventory', 'clear expired filter', 'remove expired filter', 'show all medications'], action: 'INVENTORY_CLEAR_EXPIRED' },
    { id: 'inventory-clear-search', aliases: ['clear search', 'reset search', 'clear the search'], action: 'INVENTORY_CLEAR_SEARCH' },
    { id: 'inventory-next-page', aliases: ['next page', 'go to next page', 'page forward'], action: 'INVENTORY_NEXT_PAGE' },
    { id: 'inventory-prev-page', aliases: ['previous page', 'prior page', 'go back a page', 'page back'], action: 'INVENTORY_PREV_PAGE' },
    { id: 'inventory-filter-low', aliases: ['filter low stock', 'show low stock', 'only low stock', 'low stock'], action: 'INVENTORY_FILTER_LOW_STOCK' },
    { id: 'inventory-filter-expiring', aliases: ['filter expiring', 'show expiring', 'only expiring', 'expiring items'], action: 'INVENTORY_FILTER_EXPIRING' },
    { id: 'inventory-filter-expired', aliases: ['filter expired', 'show expired stock', 'expired stock'], action: 'INVENTORY_FILTER_EXPIRED_STATUS' },
    { id: 'inventory-filter-oos', aliases: ['filter out of stock', 'show out of stock', 'out of stock'], action: 'INVENTORY_FILTER_OUT_OF_STOCK' },
    { id: 'inventory-filter-instock', aliases: ['filter in stock', 'show in stock', 'in stock items'], action: 'INVENTORY_FILTER_IN_STOCK' },
    { id: 'inventory-search', aliases: ['search', 'find', 'look for', 'search inventory', 'search for'], action: 'INVENTORY_SEARCH', needsValue: true },
  ],
};
