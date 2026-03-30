import { resolveChainVoiceIntent } from '../resolvers/chain/resolveChainVoiceIntent';
import { createUtteranceStabilizer } from '../session/createUtteranceStabilizer';

export async function runChainCommandTests(cases = [], runtime = {}) {
  const results = [];
  for (const input of cases) {
    const transcript = typeof input === 'string' ? input : input.transcript;
    const plan = await resolveChainVoiceIntent(transcript, runtime);
    results.push({ transcript, plan });
  }
  return results;
}

export async function replayTranscriptFragments(fragments = []) {
  const commits = [];
  const stabilizer = createUtteranceStabilizer({
    onCommit: (payload) => commits.push(payload),
  });

  for (const fragment of fragments) {
    stabilizer.addFragment(fragment);
  }
  stabilizer.flush('replay_flush');
  return commits;
}

export function registerChainCommandHarness() {
  if (typeof window === 'undefined') return;
  window.__SHELFSAFE_CHAIN_TEST_HARNESS__ = {
    run: runChainCommandTests,
    replay: replayTranscriptFragments,
    sampleCases: [
      'open dashboard and connect pos to toshiba',
      'go to dashboard then open proair',
      'open dashboard and change pos to square',
      'edit advil',
      'go to reports and generate expiry report',
      'go to inventory and search tylenol',
      'connect pos square',
      'sync inventory',
      'delete motrin',
      'open inventory and show expired',
    ],
    sampleReplays: [
      [
        { transcript: 'connect', isFinal: false, sessionId: 'replay-1' },
        { transcript: 'connect pos', isFinal: false, sessionId: 'replay-1' },
        { transcript: 'connect pos to square', isFinal: true, sessionId: 'replay-1' },
      ],
      [
        { transcript: 'open dash', isFinal: false, sessionId: 'replay-2' },
        { transcript: 'open dashboard and connect pos to toshiba', isFinal: true, sessionId: 'replay-2' },
      ],
    ],
  };
}
