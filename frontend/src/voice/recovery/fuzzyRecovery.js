function normalize(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  return normalize(text).split(' ').filter(Boolean);
}

function soundex(text = '') {
  const cleaned = normalize(text).replace(/\s+/g, '');
  if (!cleaned) return '';
  const chars = cleaned.split('');
  const first = chars.shift();
  const map = {
    b: '1', f: '1', p: '1', v: '1',
    c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
    d: '3', t: '3',
    l: '4',
    m: '5', n: '5',
    r: '6',
  };
  let out = first;
  let lastCode = map[first] || '';
  for (const ch of chars) {
    const code = map[ch] || '';
    if (code && code !== lastCode) out += code;
    lastCode = code;
  }
  return (out + '000').slice(0, 4);
}

function levenshtein(a = '', b = '') {
  const x = normalize(a);
  const y = normalize(b);
  if (!x) return y.length;
  if (!y) return x.length;
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 0; i <= x.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= y.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= x.length; i += 1) {
    for (let j = 1; j <= y.length; j += 1) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[x.length][y.length];
}

function similarity(a = '', b = '') {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  const maxLen = Math.max(x.length, y.length);
  if (!maxLen) return 0;
  return 1 - (levenshtein(x, y) / maxLen);
}

function phraseWindows(tokens = [], maxSize = 4) {
  const windows = [];
  for (let size = 1; size <= Math.min(maxSize, tokens.length); size += 1) {
    for (let i = 0; i <= tokens.length - size; i += 1) {
      windows.push(tokens.slice(i, i + size).join(' '));
    }
  }
  return windows;
}

const ACTION_PHRASES = {
  search_medication: ['search', 'search for', 'find', 'look for', 'locate'],
  open_medication: ['open medication', 'open item', 'click medication', 'click item', 'select medication', 'view medication', 'open', 'click', 'press', 'select', 'view'],
  edit_medication: ['edit', 'change', 'modify'],
  delete_medication: ['delete', 'remove', 'delete item', 'remove item'],
  sync_inventory: ['sync', 'sync inventory', 'refresh inventory', 'update inventory'],
  connect_pos: ['change pos', 'open pos', 'connect pos', 'switch pos', 'pick pos'],
};

function actionTypeFor(page, intent) {
  const map = {
    dashboard: {
      search_medication: 'DASHBOARD_SEARCH',
      open_medication: 'DASHBOARD_OPEN_ITEM',
      edit_medication: 'DASHBOARD_EDIT_ITEM',
      delete_medication: 'DASHBOARD_DELETE_ITEM',
      sync_inventory: 'DASHBOARD_SYNC',
      connect_pos: 'DASHBOARD_OPEN_POS',
    },
    inventory: {
      search_medication: 'INVENTORY_SEARCH',
    },
  };
  return map[page]?.[intent] || '';
}

function getActionHints(transcript = '', allowedActions = []) {
  const normalized = normalize(transcript);
  const windows = phraseWindows(tokenize(normalized), 3);
  const hints = [];
  for (const intent of allowedActions || []) {
    const phrases = ACTION_PHRASES[intent] || [];
    let bestScore = 0;
    let bestPhrase = '';
    for (const phrase of phrases) {
      for (const windowPhrase of windows.length ? windows : [normalized]) {
        const score = Math.max(
          similarity(windowPhrase, phrase),
          soundex(windowPhrase) && soundex(phrase) && soundex(windowPhrase) === soundex(phrase) ? 0.82 : 0,
        );
        if (score > bestScore) {
          bestScore = score;
          bestPhrase = phrase;
        }
      }
    }
    if (bestScore > 0.45) hints.push({ intent, score: Number(bestScore.toFixed(3)), matchedPhrase: bestPhrase });
  }
  return hints.sort((a, b) => b.score - a.score).slice(0, 4);
}

function getMedicationHints(transcript = '', candidates = []) {
  const normalized = normalize(transcript);
  const tokens = tokenize(normalized);
  const windows = phraseWindows(tokens, 3);
  const uniqueCandidates = Array.from(new Set((candidates || []).filter(Boolean)));
  const scored = [];
  for (const candidate of uniqueCandidates) {
    const candidateNorm = normalize(candidate);
    const candidateTokens = tokenize(candidateNorm);
    const candidateCore = candidateTokens[0] || candidateNorm;
    let bestScore = Math.max(similarity(normalized, candidateNorm), similarity(normalized, candidateCore));
    let bestAgainst = normalized;
    for (const windowPhrase of windows) {
      const score = Math.max(
        similarity(windowPhrase, candidateNorm),
        similarity(windowPhrase, candidateCore),
        soundex(windowPhrase) && soundex(candidateCore) && soundex(windowPhrase) === soundex(candidateCore) ? 0.9 : 0,
      );
      if (score > bestScore) {
        bestScore = score;
        bestAgainst = windowPhrase;
      }
    }
    if (bestScore > 0.5) {
      scored.push({ name: candidate, score: Number(bestScore.toFixed(3)), matchedFrom: bestAgainst });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 6);
}

export function buildFuzzyRecoveryHints({ transcript = '', recoveryPayload = {} } = {}) {
  const actionHints = getActionHints(transcript, recoveryPayload.allowedActions || []);
  const candidates = [
    ...(recoveryPayload.candidateMedications || []),
    ...(recoveryPayload.knownMedicationNames || []),
    ...(recoveryPayload.posProviders || []),
  ];
  const entityHints = getMedicationHints(transcript, candidates);
  const bestAction = actionHints[0] || null;
  const bestEntity = entityHints[0] || null;
  return {
    actionHints,
    entityHints,
    bestAction,
    bestEntity,
    correctedTranscriptGuess: bestAction && bestEntity
      ? `${String(bestAction.intent || '').replace('_medication', '').replace('_', ' ')} ${bestEntity.name}`
      : '',
  };
}

export function tryDirectFuzzyResolution({ transcript = '', recoveryPayload = {} } = {}) {
  const hints = buildFuzzyRecoveryHints({ transcript, recoveryPayload });
  const page = recoveryPayload.page || 'dashboard';
  const action = hints.bestAction;
  const entity = hints.bestEntity;

  if (!action) return null;

  if (['sync_inventory', 'connect_pos'].includes(action.intent) && action.score >= 0.82) {
    const type = actionTypeFor(page, action.intent);
    if (!type) return null;
    return {
      type,
      route: '',
      value: entity?.name && action.intent === 'connect_pos' ? entity.name : '',
      sortDirection: '',
      priorityValue: '',
      confidence: Number(action.score.toFixed(3)),
      spokenResponse: '',
      normalizedText: hints.correctedTranscriptGuess || transcript,
      resolver: 'fuzzy',
      fuzzyHints: hints,
    };
  }

  if (entity && action.score >= 0.72 && entity.score >= 0.78) {
    const type = actionTypeFor(page, action.intent);
    if (!type) return null;
    return {
      type,
      route: '',
      value: entity.name,
      sortDirection: '',
      priorityValue: '',
      confidence: Number(((action.score + entity.score) / 2).toFixed(3)),
      spokenResponse: '',
      normalizedText: `${action.intent.replace('_medication', '').replace('_', ' ')} ${entity.name}`,
      resolver: 'fuzzy',
      fuzzyHints: hints,
    };
  }

  return null;
}
