export const reportsVoice = {
  pageId: 'reports',
  aliases: ['reports', 'report', 'analytics', 'report page'],
  commands: [
    {
      id: 'reports-generate',
      aliases: [
        'generate report',
        'create report',
        'make report',
        'new report',
        'open generate',
        'open report generator',
        'show generate panel',
        'generate a report',
      ],
      action: 'REPORTS_OPEN_GENERATE',
    },
    {
      id: 'reports-search',
      aliases: ['search report', 'find report', 'search reports', 'look for report', 'search history', 'find in reports'],
      action: 'REPORTS_SEARCH',
      needsValue: true,
    },
  ],
};
