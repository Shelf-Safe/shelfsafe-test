import { resolveDashboardCommand } from './parsers/dashboardParser';
import { normalizeDashboardVoiceText } from './utility/dashboardUtil';
import { GLOBAL_COMMANDS, getPageVoiceModule, PAGE_ALIAS_MAP, POS_PROVIDER_ALIASES, routePathToPageId } from './registry';

const FILLER_WORDS = new Set([
  'please', 'could', 'would', 'can', 'you', 'me', 'the', 'a', 'an', 'to', 'for', 'on', 'in', 'at', 'my', 'this', 'that', 'now',
  'just', 'kindly', 'hey', 'hi', 'show', 'open', 'go', 'take', 'bring', 'move', 'navigate', 'into', 'with'
]);

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTokens(text) {
  return normalize(text).split(' ').filter(Boolean);
}

function normalizeForVoice(text) {
  return normalizeDashboardVoiceText(text || '');
}

function isDashboardSyncRequest(text) {
  const normalized = normalizeForVoice(text);
  return normalized.includes('sync inventory')
    || normalized.includes('press sync inventory')
    || normalized.includes('click sync inventory')
    || normalized === 'sync'
    || normalized.includes('run sync')
    || normalized.includes('start sync')
    || normalized.includes('refresh inventory')
    || normalized.includes('update inventory')
    || normalized.includes('refresh from pos');
}

function splitCompoundCommand(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[.;!?]+/g, ' , ')
    .replace(/\bafter that\b/g, ' then ')
    .replace(/\band after\b/g, ' then ')
    .replace(/\bnext\b/g, ' then ')
    .replace(/\bafterwards\b/g, ' then ')
    .split(/\s*(?:,|\band then\b|\bthen\b|\band\b|\balso\b)\s*/g)
    .map((part) => normalizeDashboardVoiceText(part))
    .map((part) => part.trim())
    .filter(Boolean);
}

function includesAlias(text, aliases = []) {
  const normalizedText = normalize(text);
  for (let i = 0; i < aliases.length; i += 1) {
    const alias = aliases[i];
    if (normalizedText.includes(normalize(alias))) return alias;
  }
  return '';
}

function aliasTokenScore(textTokens, alias) {
  const aliasTokens = toTokens(alias);
  if (!aliasTokens.length) return 0;

  const textJoined = textTokens.join(' ');
  const aliasJoined = aliasTokens.join(' ');
  if (textJoined.includes(aliasJoined)) return aliasTokens.length + 3;

  let score = 0;
  for (let i = 0; i < aliasTokens.length; i += 1) {
    if (textTokens.includes(aliasTokens[i])) score += 1;
  }

  return score === aliasTokens.length ? score : 0;
}

function bestAliasMatch(text, aliases = []) {
  const textTokens = toTokens(text);
  let best = { alias: '', score: 0 };

  for (let i = 0; i < aliases.length; i += 1) {
    const alias = aliases[i];
    const score = aliasTokenScore(textTokens, alias);
    if (score > best.score) {
      best = { alias, score };
    }
  }

  return best;
}

function cleanupExtractedValue(value) {
  const tokens = toTokens(value).filter((token) => !FILLER_WORDS.has(token));
  return tokens.join(' ').trim();
}

function extractValue(text, alias, pageAliases = []) {
  const normalizedText = normalize(text);
  const normalizedAlias = normalize(alias);
  const aliasIndex = normalizedText.indexOf(normalizedAlias);

  let rawValue = '';
  if (aliasIndex !== -1) {
    rawValue = normalizedText.slice(aliasIndex + normalizedAlias.length).trim();
  }

  if (!rawValue) {
    rawValue = normalizedText;
    for (let i = 0; i < pageAliases.length; i += 1) {
      rawValue = rawValue.replace(normalize(pageAliases[i]), ' ');
    }
    rawValue = rawValue.replace(normalizedAlias, ' ');
  }

  return cleanupExtractedValue(rawValue);
}

function detectExplicitPage(text) {
  let best = { pageId: '', score: 0 };
  const entries = Object.entries(PAGE_ALIAS_MAP);

  for (let i = 0; i < entries.length; i += 1) {
    const [pageId, aliases] = entries[i];
    const match = bestAliasMatch(text, aliases);
    if (match.score > best.score) {
      best = { pageId, score: match.score };
    }
  }

  return best.pageId || '';
}

function commandForText(text, commands, pageAliases = []) {
  let best = null;

  for (let i = 0; i < commands.length; i += 1) {
    const command = commands[i];
    const match = bestAliasMatch(text, command.aliases);
    if (!match.alias || match.score <= 0) continue;

    const candidate = {
      ...command,
      matchedAlias: match.alias,
      matchScore: match.score,
      value: command.needsValue ? extractValue(text, match.alias, pageAliases) : '',
    };

    if (!best || candidate.matchScore > best.matchScore) {
      best = candidate;
    }
  }

  return best;
}

function parsePosContext(text) {
  const providerEntries = Object.entries(POS_PROVIDER_ALIASES);

  for (let i = 0; i < providerEntries.length; i += 1) {
    const [providerKey, aliases] = providerEntries[i];
    const matchedAlias = includesAlias(text, aliases);
    if (matchedAlias) {
      return { type: 'POS_SELECT_PROVIDER', providerKey, matchedAlias };
    }
  }

  if (text.includes('email ')) {
    return { type: 'POS_SET_EMAIL', value: cleanupExtractedValue(text.split('email ')[1] || '') };
  }
  if (text.includes('username ')) {
    return { type: 'POS_SET_EMAIL', value: cleanupExtractedValue(text.split('username ')[1] || '') };
  }
  if (text.includes('password ')) {
    return { type: 'POS_SET_PASSWORD', value: cleanupExtractedValue(text.split('password ')[1] || '') };
  }
  if (includesAlias(text, ['sync inventory', 'sync now', 'connect now', 'submit'])) {
    return { type: 'POS_SUBMIT' };
  }
  if (includesAlias(text, ['cancel', 'close modal', 'close'])) {
    return { type: 'POS_CLOSE' };
  }

  return null;
}

function commandToResult(match) {
  if (!match) return { type: 'NO_MATCH' };
  if (match.route) return { type: 'NAVIGATE', route: match.route };
  return { type: match.action, value: match.value || '' };
}

function prependDashboardNavigationIfNeeded(result, runtime = {}) {
  const currentPage = routePathToPageId(runtime.routePath || '');
  if (currentPage === 'dashboard' || !result) return result;

  const appendSteps = [];
  if (result.type === 'BATCH' && Array.isArray(result.commands)) {
    appendSteps.push(...result.commands);
  } else if (result.type !== 'NAVIGATE') {
    appendSteps.push(result);
  }

  const requiresDashboard = appendSteps.some((step) => String(step?.type || '').startsWith('DASHBOARD_') || String(step?.type || '').startsWith('POS_'));
  if (!requiresDashboard) return result;

  return {
    type: 'BATCH',
    commands: [
      { type: 'NAVIGATE', route: '/dashboard', delayMs: 0 },
      ...appendSteps,
    ],
  };
}


function resolveSingleCommand(rawText, runtime = {}) {
  const text = normalize(rawText);
  const normalizedVoiceText = normalizeForVoice(rawText);
  if (!text) return { type: 'NO_MATCH' };

  if (String(runtime.activeContext || '').startsWith('pos-modal')) {
    const posMatch = parsePosContext(text);
    return posMatch || { type: 'NO_MATCH' };
  }

  if (isDashboardSyncRequest(normalizedVoiceText) && runtime.routePath !== '/dashboard') {
    return {
      type: 'BATCH',
      commands: [
        { type: 'NAVIGATE', route: '/dashboard', delayMs: 0 },
        { type: 'DASHBOARD_SYNC', delayMs: 900 },
      ],
    };
  }

  const explicitPage = isDashboardSyncRequest(normalizedVoiceText) ? 'dashboard' : detectExplicitPage(normalizedVoiceText);
  const currentPage = routePathToPageId(runtime.routePath || '');
  const targetPage = explicitPage || currentPage;

  if (explicitPage && normalize(normalizedVoiceText) === normalize(explicitPage)) {
    return currentPage === explicitPage ? { type: 'NO_MATCH' } : { type: 'NAVIGATE', route: explicitPage === 'dashboard' ? '/dashboard' : `/${explicitPage}` };
  }

  if (targetPage === 'dashboard') {
    const dashboardMatch = resolveDashboardCommand(normalizedVoiceText);
    if (dashboardMatch) {
      if (dashboardMatch.type === 'NAVIGATE' && currentPage === 'dashboard') {
        return { type: 'NO_MATCH' };
      }
      return prependDashboardNavigationIfNeeded(dashboardMatch, runtime);
    }
  }

  const globalMatch = commandForText(normalizedVoiceText, GLOBAL_COMMANDS);
  if (globalMatch) {
    return commandToResult(globalMatch);
  }

  const targetModule = getPageVoiceModule(targetPage);
  if (targetModule) {
    const pageMatch = commandForText(normalizedVoiceText, targetModule.commands || [], targetModule.aliases || []);
    if (pageMatch) {
      const result = commandToResult(pageMatch);
      return targetPage === 'dashboard' ? prependDashboardNavigationIfNeeded(result, runtime) : result;
    }
  }

  if (!explicitPage) {
    const fallbackPages = Object.keys(PAGE_ALIAS_MAP).filter((pageId) => pageId !== currentPage);
    for (let i = 0; i < fallbackPages.length; i += 1) {
      const pageId = fallbackPages[i];
      const pageModule = getPageVoiceModule(pageId);
      const fallbackMatch = commandForText(normalizedVoiceText, pageModule?.commands || [], pageModule?.aliases || []);
      if (fallbackMatch) {
        const result = commandToResult(fallbackMatch);
        return pageId === 'dashboard' ? prependDashboardNavigationIfNeeded(result, runtime) : result;
      }
    }
  }

  return { type: 'NO_MATCH' };
}

export function resolveVoiceCommand(rawText, runtime = {}) {
  const text = normalize(rawText);
  const normalizedVoiceText = normalizeForVoice(rawText);


  if (!text) return { type: 'NO_MATCH' };

  if (String(runtime.activeContext || '').startsWith('pos-modal')) {
    return resolveSingleCommand(normalizedVoiceText, runtime);
  }

  const parts = splitCompoundCommand(rawText);
  if (parts.length <= 1) {
    return resolveSingleCommand(normalizedVoiceText, runtime);
  }

  const commands = [];
  let simulatedRoutePath = runtime.routePath || '/dashboard';

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const resolved = resolveSingleCommand(part, { ...runtime, routePath: simulatedRoutePath });
    if (!resolved || resolved.type === 'NO_MATCH') continue;

    if (resolved.type === 'BATCH' && Array.isArray(resolved.commands)) {
      for (const nested of resolved.commands) {
        commands.push(nested);
        if (nested.type === 'NAVIGATE' && nested.route) {
          simulatedRoutePath = nested.route;
        }
      }
      continue;
    }

    commands.push(resolved);
    if (resolved.type === 'NAVIGATE' && resolved.route) {
      simulatedRoutePath = resolved.route;
    }
  }

  if (!commands.length) return { type: 'NO_MATCH' };
  if (commands.length === 1) return commands[0];

  return { type: 'BATCH', commands };
}
