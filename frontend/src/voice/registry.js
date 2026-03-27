import { PAGE_VOICE_BY_ID, PAGE_VOICE_MODULES } from './pages';

export const GLOBAL_COMMANDS = [
  {
    id: 'go-dashboard',
    aliases: [
      'go to dashboard',
      'open dashboard',
      'take me to dashboard',
      'hit dashboard',
      'show dashboard',
      'switch to dashboard',
      'navigate to dashboard',
      'show me dashboard',
      'go to home',
      'open home',
      'show home',
      'go to home page',
      'open home page',
      'show home page',
      'go to main screen',
      'open main screen',
      'show main screen',
      'go to main page',
      'open main page',
      'show main page',
    ],
    route: '/dashboard',
  },
  {
    id: 'go-inventory',
    aliases: [
      'inventory',
      'go to inventory',
      'open inventory',
      'take me to inventory',
      'show inventory',
      'switch to inventory',
      'navigate to inventory',
      'show me inventory',
      'medication list',
      'medicine list',
    ],
    route: '/inventory',
  },
  {
    id: 'go-reports',
    aliases: [
      'reports',
      'go to reports',
      'open reports',
      'take me to reports',
      'show reports',
      'switch to reports',
      'navigate to reports',
      'show me reports',
    ],
    route: '/reports',
  },
  {
    id: 'go-profile',
    aliases: ['profile', 'go to profile', 'open profile', 'show profile', 'switch to profile', 'my account', 'account page'],
    route: '/profile',
  },
  {
    id: 'go-settings',
    aliases: ['settings', 'go to settings', 'open settings', 'show settings', 'switch to settings', 'preferences'],
    route: '/settings',
  },
  { id: 'go-back', aliases: ['go back', 'back', 'take me back', 'previous page'], action: 'GO_BACK' },
  { id: 'stop-listening', aliases: ['stop listening', 'cancel voice', 'cancel command', 'stop voice', 'end voice'], action: 'STOP_LISTENING' },
];

export const PAGE_ALIAS_MAP = PAGE_VOICE_MODULES.reduce((acc, pageModule) => {
  acc[pageModule.pageId] = pageModule.aliases || [];
  return acc;
}, {});

export const POS_PROVIDER_ALIASES = {
  mckesson: ['mckesson'],
  toshiba: ['toshiba', 'toshiba tcx'],
  square: ['square', 'square pos'],
  ncr: ['ncr'],
  lightspeed: ['lightspeed'],
  lsretail: ['ls retail', 'lsretail'],
  oracle: ['oracle', 'oracle retail'],
  propel: ['propel', 'propel os'],
};

export function routePathToPageId(routePath = '') {
  if (routePath.includes('/inventory')) return 'inventory';
  if (routePath.includes('/reports')) return 'reports';
  if (routePath.includes('/profile')) return 'profile';
  if (routePath.includes('/settings')) return 'settings';
  return 'dashboard';
}

export function getPageVoiceModule(pageId) {
  return PAGE_VOICE_BY_ID[pageId] || null;
}
