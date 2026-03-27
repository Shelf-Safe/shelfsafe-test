import { DASHBOARD_COMMAND_DATA, DASHBOARD_PAGE_ALIASES } from './dashboardVoiceConfig';

export const dashboardVoice = {
  pageId: 'dashboard',
  aliases: DASHBOARD_PAGE_ALIASES,
  commands: Object.values(DASHBOARD_COMMAND_DATA),
};
