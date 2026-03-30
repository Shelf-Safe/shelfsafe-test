export function createVoiceRuntimeStore(initialValue = {}) {
  let state = {
    activeContext: null,
    routePath: '/dashboard',
    listeningMode: 'single',
    lastHeard: '',
    sessionId: '',
    lastCommand: null,
    ...initialValue,
  };

  return {
    getState() {
      return { ...state };
    },
    patch(nextPatch = {}) {
      state = { ...state, ...nextPatch };
      return { ...state };
    },
    reset() {
      state = {
        activeContext: null,
        routePath: '/dashboard',
        listeningMode: 'single',
        lastHeard: '',
        sessionId: '',
        lastCommand: null,
      };
      return { ...state };
    },
  };
}
