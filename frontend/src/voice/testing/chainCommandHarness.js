import { resolveChainVoiceIntent } from '../resolvers/chain/resolveChainVoiceIntent';

export async function runChainCommandTests(cases = [], runtime = {}) {
  const results = [];
  for (const input of cases) {
    const transcript = typeof input === 'string' ? input : input.transcript;
    const plan = await resolveChainVoiceIntent(transcript, runtime);
    results.push({ transcript, plan });
  }
  return results;
}

export function registerChainCommandHarness() {
  if (typeof window === 'undefined') return;
  window.__SHELFSAFE_CHAIN_TEST_HARNESS__ = {
    run: runChainCommandTests,
    sampleCases: [
      'open dashboard and connect pos to toshiba',
      'go to dashboard then open proair',
      'open dashboard and change pos to square',
    ],
  };
}
