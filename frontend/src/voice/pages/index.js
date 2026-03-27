import { dashboardVoice } from './dashboard';
import { inventoryVoice } from './inventory';
import { reportsVoice } from './reports';
import { profileVoice } from './profile';

export const PAGE_VOICE_MODULES = [dashboardVoice, inventoryVoice, reportsVoice, profileVoice];

export const PAGE_VOICE_BY_ID = PAGE_VOICE_MODULES.reduce((acc, pageModule) => {
  acc[pageModule.pageId] = pageModule;
  return acc;
}, {});
