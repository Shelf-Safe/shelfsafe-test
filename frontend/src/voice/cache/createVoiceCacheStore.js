function now() {
  return Date.now();
}

const DEFAULT_STATE = {
  global: {
    routes: {},
    synonyms: {},
    posProviders: [],
    medicationAliases: {},
    commandSchemas: {},
  },
  pages: {},
  runtime: {
    currentRoute: '/dashboard',
    activePage: 'dashboard',
    focusedComponent: null,
    lastTranscript: '',
    lastNormalizedText: '',
    lastCommand: null,
    recentHistory: [],
    listeningMode: 'single',
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createVoiceCacheStore(initialState = {}) {
  let state = {
    ...clone(DEFAULT_STATE),
    ...clone(initialState),
  };

  function ensurePage(pageId) {
    if (!state.pages[pageId]) {
      state.pages[pageId] = {
        schema: {},
        state: {},
        updatedAt: now(),
      };
    }
    return state.pages[pageId];
  }

  return {
    getState() {
      return clone(state);
    },

    patchGlobal(nextGlobal = {}) {
      state.global = {
        ...state.global,
        ...clone(nextGlobal),
      };
      return clone(state.global);
    },

    registerPageSchema(pageId, schema = {}) {
      const page = ensurePage(pageId);
      page.schema = {
        ...page.schema,
        ...clone(schema),
      };
      page.updatedAt = now();
      return clone(page);
    },

    patchPageState(pageId, nextState = {}) {
      const page = ensurePage(pageId);
      page.state = {
        ...page.state,
        ...clone(nextState),
      };
      page.updatedAt = now();
      return clone(page);
    },

    patchRuntime(nextRuntime = {}) {
      state.runtime = {
        ...state.runtime,
        ...clone(nextRuntime),
      };
      return clone(state.runtime);
    },

    appendHistory(entry) {
      const history = [...state.runtime.recentHistory, { ...clone(entry), at: now() }];
      state.runtime.recentHistory = history.slice(-10);
      return clone(state.runtime.recentHistory);
    },

    getPage(pageId) {
      return clone(state.pages[pageId] || { schema: {}, state: {}, updatedAt: 0 });
    },

    resetPageState(pageId) {
      const page = ensurePage(pageId);
      page.state = {};
      page.updatedAt = now();
      return clone(page);
    },
  };
}
