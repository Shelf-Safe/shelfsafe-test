function applyReplacements(value, replacements) {
  let next = value;
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

export function normalizeDashboardVoiceText(text) {
  let value = String(text || '').toLowerCase();
  value = value.replace(/[^a-z0-9\s]/g, ' ');

  const replacements = [
    [/\bstart by\b/g, 'sort by'],
    [/\bstart\b(?=\s+(priority|urgency|expiry|expiration|date|mid|medium|med|high|low|ascending|descending))/g, 'sort'],
    [/\bsorty by\b/g, 'sort by'],
    [/\bsorty\b(?=\s+(priority|urgency|expiry|expiration|date|mid|medium|med|high|low))/g, 'sort'],
    [/\bshort by\b/g, 'sort by'],
    [/\bshort\b(?=\s+(priority|urgency|expiry|expiration|date|mid|medium|med|high|low))/g, 'sort'],
    [/\bsoft by\b/g, 'sort by'],
    [/\bsoft\b(?=\s+(priority|urgency|expiry|expiration|date|mid|medium|med|high|low))/g, 'sort'],
    [/\bstop by\b/g, 'sort by'],
    [/\bstop\b(?=\s+(priority|urgency|expiry|expiration|date|mid|medium|med|high|low))/g, 'sort'],
    [/\btalk by\b/g, 'sort by'],
    [/\btalk\b(?=\s+(priority|urgency|expiry|expiration|date|mid|medium|med|high|low))/g, 'sort'],
    [/\bsalt by\b/g, 'sort by'],
    [/\bsalt\b(?=\s+(priority|urgency|expiry|expiration|date|mid|medium|med|high|low))/g, 'sort'],
    [/\bassault by\b/g, 'sort by'],
    [/\bassault\b(?=\s+(priority|urgency|expiry|expiration|date|mid|medium|med|high|low))/g, 'sort'],
    [/\bsong by\b/g, 'sort by'],
    [/\bsong\b(?=\s+(priority|urgency|expiry|expiration|date|mid|medium|med|high|low))/g, 'sort'],
    [/\bset by priority\b/g, 'sort by priority'],
    [/\bset priority\b/g, 'sort by priority'],
    [/\bpriority by\b/g, 'sort by priority'],
    [/\bcheck priority by\b/g, 'sort by priority'],
    [/\bpriority sort\b/g, 'sort by priority'],
    [/\bset expiry\b/g, 'sort by expiry'],
    [/\bexpiry date\b/g, 'sort by expiry'],
    [/\bchange the us\b/g, 'change pos'],
    [/\bchange us\b/g, 'change pos'],
    [/\bchange previous\b/g, 'change pos'],
    [/\bopen the us\b/g, 'open pos'],
    [/\bopen us\b/g, 'open pos'],
    [/\bconnect the us\b/g, 'connect pos'],
    [/\bconnect us\b/g, 'connect pos'],
    [/\bconnect to us\b/g, 'connect pos to'],
    [/\bconnect to the us\b/g, 'connect pos to'],
    [/\bchoose the us\b/g, 'choose pos'],
    [/\bchoose us\b/g, 'choose pos'],
    [/\bdisconnect the us\b/g, 'disconnect pos'],
    [/\bdisconnect us\b/g, 'disconnect pos'],
    [/\bpoint of sale\b/g, 'pos'],
    [/\bpos 2\b/g, 'pos to'],
    [/\bpos too\b/g, 'pos to'],
    [/\bpress sync\b/g, 'sync'],
    [/\bsync in ventory\b/g, 'sync inventory'],
    [/\bsink inventory\b/g, 'sync inventory'],
    [/\bsink in ventory\b/g, 'sync inventory'],
    [/\bsing inventory\b/g, 'sync inventory'],
    [/\bsync inventry\b/g, 'sync inventory'],
    [/\bsync inventor\b/g, 'sync inventory'],
    [/\bsink in ventre\b/g, 'sync inventory'],
    [/\bedit actual\b/g, 'edit advil'],
    [/\bdelete agave\b/g, 'delete advil'],
    [/\baddict\b(?=\s+[a-z0-9])/g, 'edit'],
    [/\bshock(?:ed)? by\b/g, 'sort by'],
    [/\bsoft priority by\b/g, 'sort by priority'],
    [/\bshort priority by\b/g, 'sort by priority'],
  ];

  value = applyReplacements(value, replacements);

  value = value.replace(/\bmeet\b/g, 'mid');
  value = value.replace(/\bmaid\b/g, 'mid');
  value = value.replace(/\bmediume\b/g, 'medium');
  value = value.replace(/\bmed\b/g, 'medium');
  value = value.replace(/\bmidium\b/g, 'medium');
  value = value.replace(/\bmiddle\b/g, 'medium');
  value = value.replace(/\bmake\b(?=\s*$)/g, 'mid');
  value = value.replace(/\bmake\b(?=\s+(ascending|descending|high|low|priority))/g, 'mid');
  value = value.replace(/\bmedium\b/g, 'mid');

  value = value.replace(/\bsort by hi\b/g, 'sort by high');
  value = value.replace(/\bsort by midium\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by medium\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by med\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by make\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by xfinity\b/g, 'sort by expiry');
  value = value.replace(/\bsort by priority meet\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by priority medium\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by priority med\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by priority make\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by urgency meet\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by urgency medium\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by urgency med\b/g, 'sort by priority mid');
  value = value.replace(/\bsort by mid\b/g, 'sort by priority mid');
  value = value.replace(/\bsort mid\b/g, 'sort by priority mid');
  value = value.replace(/\bset priority ascending\b/g, 'sort by priority ascending');
  value = value.replace(/\bset priority descending\b/g, 'sort by priority descending');
  value = value.replace(/\bset priority mid\b/g, 'sort by priority mid');
  value = value.replace(/\bset priority medium\b/g, 'sort by priority mid');
  value = value.replace(/\bset priority med\b/g, 'sort by priority mid');
  value = value.replace(/\bset by priority mid\b/g, 'sort by priority mid');
  value = value.replace(/\bset by priority medium\b/g, 'sort by priority mid');
  value = value.replace(/\bset by priority med\b/g, 'sort by priority mid');
  value = value.replace(/\bpriority ascending\b/g, 'sort by priority ascending');
  value = value.replace(/\bpriority descending\b/g, 'sort by priority descending');
  value = value.replace(/\bmid\b(?=\s*$)/g, 'sort by priority mid');
  value = value.replace(/\bmedium\b(?=\s*$)/g, 'sort by priority mid');
  value = value.replace(/\bhigh\b(?=\s*$)/g, 'sort by priority high');
  value = value.replace(/\blow\b(?=\s*$)/g, 'sort by priority low');

  value = value.replace(/\s+/g, ' ').trim();
  return value;
}

export function getSortDirectionFromText(text) {
  const normalized = normalizeDashboardVoiceText(text);

  if (
    normalized.includes('descending') ||
    normalized.includes('desc') ||
    normalized.includes('high to low') ||
    normalized.includes('highest first') ||
    normalized.includes('latest first') ||
    normalized.includes('latest') ||
    normalized.includes('farthest first') ||
    normalized.includes('newest first') ||
    normalized.includes('z to a')
  ) {
    return 'desc';
  }

  if (
    normalized.includes('ascending') ||
    normalized.includes('asc') ||
    normalized.includes('low to high') ||
    normalized.includes('lowest first') ||
    normalized.includes('soonest first') ||
    normalized.includes('earliest first') ||
    normalized.includes('earliest') ||
    normalized.includes('oldest first') ||
    normalized.includes('a to z')
  ) {
    return 'asc';
  }

  return '';
}

export function getPriorityValueFromText(text) {
  const normalized = normalizeDashboardVoiceText(text);
  if (normalized.includes('high')) return 'High';
  if (normalized.includes('mid')) return 'Mid';
  if (normalized.includes('low')) return 'Low';
  return '';
}

export function buildDashboardSortPayload(action, rawText) {
  return {
    type: action,
    sortDirection: getSortDirectionFromText(rawText),
    priorityValue: getPriorityValueFromText(rawText),
  };
}

export function includesAnyDashboardPhrase(text, phrases = []) {
  const normalizedText = normalizeDashboardVoiceText(text);
  for (let i = 0; i < phrases.length; i += 1) {
    const phrase = normalizeDashboardVoiceText(phrases[i]);
    if (phrase && normalizedText.includes(phrase)) return true;
  }
  return false;
}

export function buildDashboardSyncCommand() {
  return { type: 'DASHBOARD_SYNC' };
}
