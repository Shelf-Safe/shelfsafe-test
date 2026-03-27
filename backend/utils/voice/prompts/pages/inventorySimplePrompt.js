export function buildInventorySimplePromptSection() {
  return `Inventory page notes:
- This page is focused on medication list browsing and filtering.
- If a medication name is mentioned, INVENTORY_SEARCH is often the safest recovery.
- Show expired means INVENTORY_SHOW_EXPIRED. Clear expired means INVENTORY_CLEAR_EXPIRED.`;
}
