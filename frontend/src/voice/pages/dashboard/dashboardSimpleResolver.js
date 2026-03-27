import { DASHBOARD_COMMAND_DATA, DASHBOARD_PAGE_ALIASES } from './dashboardVoiceConfig';
import { buildDashboardSortPayload, buildDashboardSyncCommand, includesAnyDashboardPhrase, normalizeDashboardVoiceText } from '../../utility/dashboardUtil';
import { POS_PROVIDER_ALIASES } from '../../registry';

function normalize(text) {
  return normalizeDashboardVoiceText(text);
}

function toTokens(text) {
  return normalize(text).split(' ').filter(Boolean);
}

function aliasTokenScore(textTokens, alias) {
  const aliasTokens = toTokens(alias);
  if (!aliasTokens.length) return 0;

  const fullText = textTokens.join(' ');
  const aliasText = aliasTokens.join(' ');
  if (fullText.includes(aliasText)) return aliasTokens.length + 3;

  let score = 0;
  for (let i = 0; i < aliasTokens.length; i += 1) {
    if (textTokens.includes(aliasTokens[i])) score += 1;
  }

  return score === aliasTokens.length ? score : 0;
}

function cleanupValue(text) {
  return normalize(text)
    .replace(/^(for|named|called)\s+/, '')
    .replace(/\s+(please|now)$/g, '')
    .trim();
}

function extractValue(text, alias) {
  const normalizedText = normalize(text);
  const normalizedAlias = normalize(alias);
  const index = normalizedText.indexOf(normalizedAlias);

  let value = '';
  if (index !== -1) {
    value = normalizedText.slice(index + normalizedAlias.length).trim();
  }

  if (!value) {
    value = normalizedText.replace(normalizedAlias, ' ');
    for (let i = 0; i < DASHBOARD_PAGE_ALIASES.length; i += 1) {
      value = value.replace(normalize(DASHBOARD_PAGE_ALIASES[i]), ' ');
    }
  }

  return cleanupValue(value);
}

function getBestCommandMatch(text, commands) {
  const textTokens = toTokens(text);
  let best = null;

  for (let i = 0; i < commands.length; i += 1) {
    const command = commands[i];
    for (let j = 0; j < command.aliases.length; j += 1) {
      const alias = command.aliases[j];
      const score = aliasTokenScore(textTokens, alias);
      if (!score) continue;

      if (!best || score > best.score) {
        best = { command, alias, score };
      }
    }
  }

  return best;
}

function getProviderFromText(text) {
  const normalizedText = normalize(text);
  const providerEntries = Object.entries(POS_PROVIDER_ALIASES);

  for (let i = 0; i < providerEntries.length; i += 1) {
    const [providerKey, aliases] = providerEntries[i];
    for (let j = 0; j < aliases.length; j += 1) {
      const alias = normalize(aliases[j]);
      if (normalizedText.includes(alias)) {
        return { providerKey, matchedAlias: alias };
      }
    }
  }

  return null;
}

function stripDashboardLeadVerb(text, verbs = []) {
  let next = normalize(text);
  for (const verb of verbs) {
    const pattern = new RegExp(`^${verb}\\s+`);
    next = next.replace(pattern, '');
  }
  return cleanupValue(next);
}

function resolveQuickItemIntent(text) {
  const quickOpenPrefixes = ['open', 'click', 'press', 'select', 'touch', 'view'];
  const quickEditPrefixes = ['edit', 'change', 'modify'];
  const quickDeletePrefixes = ['delete', 'remove'];
  const quickSearchPrefixes = ['search', 'find', 'locate', 'look for'];

  const isPosPhrase = text.includes(' pos') || text.startsWith('pos ') || text.includes('dashboard') || text.includes('inventory') || text.includes('report');
  if (isPosPhrase) return null;

  for (const prefix of quickOpenPrefixes) {
    if (text === prefix || text.startsWith(`${prefix} pos`)) return null;
    if (text.startsWith(prefix + ' ')) {
      const value = stripDashboardLeadVerb(text, [prefix]);
      if (value) return { type: 'DASHBOARD_OPEN_ITEM', value };
    }
  }

  for (const prefix of quickEditPrefixes) {
    if (text.startsWith(prefix + ' ') && !text.includes(' pos')) {
      const value = stripDashboardLeadVerb(text, [prefix]);
      if (value) return { type: 'DASHBOARD_EDIT_ITEM', value };
    }
  }

  for (const prefix of quickDeletePrefixes) {
    if (text.startsWith(prefix + ' ') && !text.includes(' pos')) {
      const value = stripDashboardLeadVerb(text, [prefix]);
      if (value) return { type: 'DASHBOARD_DELETE_ITEM', value };
    }
  }

  for (const prefix of quickSearchPrefixes) {
    if (text.startsWith(prefix + ' ') && !text.includes(' pos')) {
      const value = stripDashboardLeadVerb(text, [prefix]);
      if (value) return { type: 'DASHBOARD_SEARCH', value };
    }
  }

  return null;
}

function wantsPrioritySort(text) {
  return text.includes('priority') || text.includes('urgency') || text.includes('sort by high') || text.includes('sort by mid') || text.includes('sort by low');
}

function wantsExpirySort(text) {
  return text.includes('expiry') || text.includes('expiration') || text.includes('date');
}

function wantsDashboardSync(text) {
  return includesAnyDashboardPhrase(text, DASHBOARD_COMMAND_DATA.sync.aliases)
    || includesAnyDashboardPhrase(text, ['sync inventory button','click the sync inventory button','press the sync inventory button','click sync inventory','press sync inventory','run sync','start sync','refresh from pos','refresh inventory','update inventory','connect and sync','connect pos and sync','go to dashboard and sync inventory','dashboard sync inventory','sync','sync inventory']);
}

function buildProviderBatch(providerMatch) {
  return {
    type: 'BATCH',
    commands: [
      { type: 'DASHBOARD_OPEN_POS', delayMs: 0 },
      { type: 'POS_SELECT_PROVIDER', providerKey: providerMatch.providerKey, matchedAlias: providerMatch.matchedAlias, autoSubmit: true, delayMs: 900 },
      { type: 'POS_SUBMIT', delayMs: 1500, autoSubmit: true },
      { type: 'DASHBOARD_SYNC', delayMs: 2300 },
    ],
  };
}

export function resolveDashboardCommand(rawText) {
  const text = normalize(rawText);
  if (!text) return null;

  const quickItemIntent = resolveQuickItemIntent(text);
  if (quickItemIntent) return quickItemIntent;

  const providerMatch = getProviderFromText(text);
  const wantsPosOpen =
    text.includes('change pos') ||
    text.includes('change point of sale') ||
    text.includes('open pos') ||
    text.includes('open point of sale') ||
    text.includes('switch pos') ||
    text.includes('switch point of sale') ||
    text.includes('choose pos') ||
    text.includes('pick pos') ||
    text.includes('connect pos') ||
    text.includes('connect to pos') ||
    text.includes('connect point of sale') ||
    text.includes('connect to point of sale');

  if (wantsPosOpen && providerMatch) return buildProviderBatch(providerMatch);
  if (wantsPosOpen) return { type: 'DASHBOARD_OPEN_POS' };

  if (text.includes('disconnect pos') || text === 'disconnect' || text.includes('unlink pos') || text.includes('remove pos connection')) {
    return { type: 'DASHBOARD_DISCONNECT_POS' };
  }

  if (wantsDashboardSync(text)) return buildDashboardSyncCommand();

  const clearSortMatch = getBestCommandMatch(text, [DASHBOARD_COMMAND_DATA.clearSort]);
  if (clearSortMatch) return { type: 'DASHBOARD_CLEAR_SORT' };

  const clearSearchMatch = getBestCommandMatch(text, [DASHBOARD_COMMAND_DATA.clearSearch]);
  if (clearSearchMatch) return { type: 'DASHBOARD_CLEAR_SEARCH' };

  if ((text.includes('sort') || wantsPrioritySort(text)) && wantsPrioritySort(text)) return buildDashboardSortPayload('DASHBOARD_SORT_PRIORITY', text);
  if ((text.includes('sort') || wantsExpirySort(text)) && wantsExpirySort(text)) return buildDashboardSortPayload('DASHBOARD_SORT_EXPIRY', text);

  const disconnectPriority = getBestCommandMatch(text, [DASHBOARD_COMMAND_DATA.disconnectPos]);
  if (disconnectPriority) return { type: 'DASHBOARD_DISCONNECT_POS' };

  const commands = Object.values(DASHBOARD_COMMAND_DATA);
  const best = getBestCommandMatch(text, commands);
  if (!best) return null;

  const { command, alias } = best;
  if (command.route) return { type: 'NAVIGATE', route: command.route };
  if (command.needsValue) {
    const value = extractValue(text, alias);
    if (!value) return null;
    return { type: command.action, value };
  }
  if (command.action === 'DASHBOARD_SORT_PRIORITY' || command.action === 'DASHBOARD_SORT_EXPIRY') return buildDashboardSortPayload(command.action, text);
  return { type: command.action };
}
