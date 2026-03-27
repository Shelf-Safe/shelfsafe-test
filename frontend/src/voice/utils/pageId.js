export function routePathToPageId(routePath = '') {
  if (routePath.includes('/inventory')) return 'inventory';
  if (routePath.includes('/reports')) return 'reports';
  if (routePath.includes('/profile')) return 'profile';
  if (routePath.includes('/settings')) return 'settings';
  return 'dashboard';
}
