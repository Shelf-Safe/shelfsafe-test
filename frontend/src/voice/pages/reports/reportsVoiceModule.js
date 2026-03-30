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
      aliases: [
        'search report',
        'find report',
        'search reports',
        'look for report',
        'search history',
        'find in reports',
      ],
      action: 'REPORTS_SEARCH',
      needsValue: true,
    },
    {
      id: 'reports-email-report-structured',
      aliases: [
        'email me',
        'send me',
      ],
      action: 'REPORTS_EMAIL_REPORT',
      needsValue: true,
    },
    {
      id: 'reports-email-pdf',
      aliases: [
        'email report',
        'email this report',
        'email report to me',
        'send report to my email',
        'send this report to my email',
        'send pdf report to my email',
        'generate pdf and email it',
        'generate pdf report and send by email',
        'email pdf report',
      ],
      action: 'REPORTS_EMAIL_PDF',
    },
    {
      id: 'reports-email-report-structured',
      aliases: [
        'email me expiry reports in pdf',
        'email me stock reports in pdf',
        'email me expiry reports in csv',
        'email me stock reports in csv',
      ],
      action: 'REPORTS_EMAIL_REPORT',
    },
    
  ],
};