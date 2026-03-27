import { PAGE_CATALOG, getPageCatalog } from './pageCatalog.js';
import { buildBaseSimplePrompt } from './prompts/shared/baseSimplePrompt.js';
import { buildBaseChainPrompt } from './prompts/shared/baseChainPrompt.js';
import { buildDashboardSimplePromptSection } from './prompts/pages/dashboardSimplePrompt.js';
import { buildInventorySimplePromptSection } from './prompts/pages/inventorySimplePrompt.js';
import { buildCrossPageChainPromptSection } from './prompts/pages/crossPageChainPrompt.js';

const GLOBAL_ACTIONS = [
  { type: 'NAVIGATE', description: 'Navigate to another ShelfSafe page. Use route only when the user clearly asks to open another page.' },
  { type: 'GO_BACK', description: 'Go back to the previous page.' },
  { type: 'STOP_LISTENING', description: 'Stop the voice assistant.' },
  { type: 'NO_MATCH', description: 'Use only when the request cannot be recovered safely.' },
];

function actionLine(action) {
  const extras = [];
  if (action.needsValue) extras.push(`value required (${action.valueLabel || 'text'})`);
  if (action.needsSortDirection) extras.push('sortDirection optional: asc or desc');
  if (action.needsPriorityValue) extras.push('priorityValue optional: High, Mid, or Low');
  const suffix = extras.length ? ` [${extras.join('; ')}]` : '';
  return `- ${action.type}: ${action.description}${suffix}`;
}

function fieldGuide(mode = 'simple') {
  const common = [
    '- text: the raw speech transcript coming from speech-to-text. It may contain phonetic errors, split words, wrong words, or substitutions.',
    '- pageId: the logical ShelfSafe page where the user currently is.',
    '- currentRoute: the current frontend route.',
    '- recoveryPayload.allowedActions: the intent families that are actually valid on this page.',
    '- recoveryPayload.candidateMedications: medication names currently visible or immediately actionable on this page.',
    '- recoveryPayload.knownMedicationNames: additional known medication names that may not be visible right now, but are still relevant for recovery.',
    '- recoveryPayload.candidateAlerts: visible alert or action-item names when the page has them.',
    '- recoveryPayload.posProviders: valid POS providers that can be selected.',
    '- recoveryPayload.uiState: current UI conditions that affect what actions are possible.',
    '- recoveryPayload.runtime.lastCommandType: useful for follow-up or chained requests.',
    '- recoveryPayload.fuzzyHints: precomputed action and entity hints from a phonetic/fuzzy layer. Treat these as soft hints, not guaranteed truth.',
  ];
  if (mode === 'chain') {
    common.push('- For chain mode, you must return ordered execution steps.');
  }
  return common.join('\n');
}

function sharedFewShotExamples(mode = 'simple') {
  if (mode === 'chain') {
    return [
      'Example 1: Input text = "go to dashboard, change pos to toshiba". Output should be a CHAIN plan with NAVIGATE to /dashboard, DASHBOARD_OPEN_POS, POS_SELECT_PROVIDER with providerKey toshiba, then POS_SUBMIT.',
      'Example 2: Input text = "open reports and generate expiry report". Output should include NAVIGATE to /reports and REPORTS_OPEN_GENERATE.',
      'Example 3: If only one real action exists, do not force multiple steps.',
    ].join('\n');
  }

  return [
    'Example 1: Input text = "sir check advil" and fuzzy hints suggest action search_medication and medication Advil. Output should recover to a search action for Advil.',
    'Example 2: Input text = "fine tylenol". In this system, that usually means "find Tylenol" or "search Tylenol".',
    'Example 3: Input text = "delete motor in" with candidate medication Motrin. Output should recover to deleting Motrin if confidence is strong.',
    'Example 4: If the text is too ambiguous and no candidate is plausible, return NO_MATCH with low confidence and a short spokenResponse asking the user to repeat.',
  ].join('\n');
}

function pageSpecificInstructions(page, mode = 'simple') {
  if (mode === 'chain') {
    return {
      instructions: buildCrossPageChainPromptSection(),
      examples: '- Use ordered steps and preserve dependencies.',
    };
  }

  const pageSections = {
    dashboard: buildDashboardSimplePromptSection(),
    inventory: buildInventorySimplePromptSection(),
  };

  const instructions = pageSections[page.pageId]
    || (page.promptGuidance || []).map((line) => `- ${line}`).join('\n')
    || '- No special page instructions.';

  const examples = (page.recoveryExamples || []).length
    ? page.recoveryExamples.map((line) => `- ${line}`).join('\n')
    : '- No page-specific examples.';

  return { instructions, examples };
}

export function buildVoiceSystemPrompt(pageId = 'dashboard', mode = 'simple') {
  const currentPage = getPageCatalog(pageId);
  const pageActionLines = currentPage.actions.map(actionLine).join('\n');
  const globalLines = GLOBAL_ACTIONS.map(actionLine).join('\n');
  const pageGuide = Object.values(PAGE_CATALOG)
    .map((page) => `- ${page.pageId}: aliases ${page.aliases.join(', ')}`)
    .join('\n');
  const pageInfo = pageSpecificInstructions(currentPage, mode);
  const base = mode === 'chain' ? buildBaseChainPrompt() : buildBaseSimplePrompt();
  const decisionRules = mode === 'chain'
    ? [
        'Decision rules:',
        '1. Return CHAIN only when multiple ordered steps are needed.',
        '2. Steps must be executable by the frontend.',
        '3. If the user names a target page and then a page-specific task, navigate first and perform the page task second.',
        '4. For dashboard POS changes, include DASHBOARD_OPEN_POS before POS_SELECT_PROVIDER.',
        '4b. If a POS provider is named, include providerKey on POS_SELECT_PROVIDER.',
        '4c. For dashboard medication commands, open/click/press/select/view should map to DASHBOARD_OPEN_ITEM, not edit.',
        '5. confidence must be between 0 and 1.',
        '6. Never return markdown, commentary, code fences, or extra keys.',
      ].join('\n')
    : [
        'Decision rules:',
        '1. Choose exactly one action.',
        '2. Prefer a current-page action over navigation unless navigation is explicitly requested.',
        '3. Use candidateMedications first for visible-row actions like edit, delete, open, and page-level search.',
        '4. Use knownMedicationNames when the transcript likely contains a medication that is not visible but is still a known ShelfSafe entity.',
        '5. Use fuzzyHints when they align with the transcript and page context.',
        '6. Never invent a medication or POS provider that is not supported by the provided context unless the transcript itself is extremely clear.',
        '7. If the user seems to be asking for search, edit, delete, filter, sort, sync, or POS selection, map to the closest valid action for this page.',
        '8. For destructive actions like delete, still return the delete action; the app handles confirmation.',
        '9. confidence must be between 0 and 1.',
        '10. normalizedText must be your best cleaned interpretation of what the user intended to say.',
        '11. If recovery is too weak or multiple outcomes are equally plausible, return NO_MATCH with a short spokenResponse asking the user to repeat.',
        '12. Never return markdown, commentary, code fences, or extra keys.',
      ].join('\n');

  return [
    base,
    '',
    'What each field means:',
    fieldGuide(mode),
    '',
    'Global action catalog:',
    globalLines,
    '',
    'Available pages:',
    pageGuide,
    '',
    `Current page: ${currentPage.pageId}`,
    'Current page actions:',
    pageActionLines || '- none',
    '',
    'Current page recovery instructions:',
    pageInfo.instructions,
    '',
    'Shared recovery examples:',
    sharedFewShotExamples(mode),
    '',
    'Current page examples:',
    pageInfo.examples,
    '',
    decisionRules,
  ].join('\n');
}

export function buildVoiceUserPrompt({ text = '', currentRoute = '/dashboard', pageId = 'dashboard', recoveryPayload = null, mode = 'simple' } = {}) {
  return JSON.stringify({ mode, text, currentRoute, pageId, recoveryPayload }, null, 2);
}
