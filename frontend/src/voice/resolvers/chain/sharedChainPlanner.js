import { routePathToPageId } from '../../utils/pageId';
import { resolveVoiceCommand } from '../../parser';

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitByChainMarkers(text) {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/[.;!?]+/g, ' , ')
    .replace(/\bafter that\b/g, ' then ')
    .replace(/\band after\b/g, ' then ')
    .replace(/\bnext\b/g, ' then ')
    .replace(/\bafterwards\b/g, ' then ');

  return normalized
    .split(/\s*(?:,|\band then\b|\bthen\b|\band\b|\balso\b)\s*/g)
    .map((part) => normalize(part))
    .map((part) => part.trim())
    .filter(Boolean);
}

function inferChainPartsFromText(text) {
  const parts = splitByChainMarkers(text);
  return parts.length > 1 ? parts : [];
}

function flattenResolvedCommand(resolved, steps, routeState) {
  if (!resolved || resolved.type === 'NO_MATCH') return routeState;
  if (resolved.type === 'BATCH' && Array.isArray(resolved.commands)) {
    for (const nested of resolved.commands) {
      routeState = flattenResolvedCommand(nested, steps, routeState);
    }
    return routeState;
  }
  steps.push({ ...resolved });
  if (resolved.type === 'NAVIGATE' && resolved.route) return resolved.route;
  return routeState;
}

export function planChainLocally(transcript, runtime = {}) {
  const direct = resolveVoiceCommand(transcript, runtime);
  if (direct?.type === 'BATCH' && Array.isArray(direct.commands) && direct.commands.length > 1) {
    const steps = [];
    let simulatedRoutePath = runtime.routePath || '/dashboard';
    for (const command of direct.commands) {
      simulatedRoutePath = flattenResolvedCommand(command, steps, simulatedRoutePath);
    }
    return {
      type: 'CHAIN',
      steps,
      source: 'local-batch',
      normalizedText: normalize(transcript),
      confidence: 0.92,
      targetPageId: routePathToPageId(simulatedRoutePath),
    };
  }

  const parts = inferChainPartsFromText(transcript);
  if (!parts.length) {
    return null;
  }

  const steps = [];
  let simulatedRoutePath = runtime.routePath || '/dashboard';
  for (const part of parts) {
    const resolved = resolveVoiceCommand(part, { ...runtime, routePath: simulatedRoutePath });
    if (!resolved || resolved.type === 'NO_MATCH' || resolved.type === 'CHAIN') continue;
    simulatedRoutePath = flattenResolvedCommand(resolved, steps, simulatedRoutePath);
  }

  if (steps.length <= 1) return null;
  return {
    type: 'CHAIN',
    steps,
    source: 'local-chain',
    normalizedText: normalize(transcript),
    confidence: 0.88,
    targetPageId: routePathToPageId(simulatedRoutePath),
  };
}
