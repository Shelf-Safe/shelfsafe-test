export function buildRecoveryPayload({ transcript, cacheSnapshot }) {
  const runtime = cacheSnapshot?.runtime || {};
  const pageId = runtime.activePage || 'dashboard';
  const page = cacheSnapshot?.pages?.[pageId] || {};
  const schema = page.schema || {};
  const state = page.state || {};
  const global = cacheSnapshot?.global || {};

  const visibleMedications = Array.isArray(state.visibleMedications) ? state.visibleMedications : [];
  const knownMedicationNames = Array.isArray(state.knownMedicationNames) ? state.knownMedicationNames : [];

  return {
    page: pageId,
    transcript,
    currentRoute: runtime.currentRoute || '/dashboard',
    allowedActions: schema.allowedIntents || [],
    candidateMedications: visibleMedications.slice(0, 20),
    knownMedicationNames: knownMedicationNames.slice(0, 60),
    candidateAlerts: (state.alertNames || []).slice(0, 10),
    posProviders: global.posProviders || [],
    uiState: {
      posModalOpen: !!state.posModalOpen,
      syncAvailable: !!state.syncAvailable,
      notificationsOpen: !!state.notificationsOpen,
      selectedPosProvider: state.selectedPosProvider || null,
      searchVisible: state.searchVisible !== false,
      resultCount: Number(state.resultCount) || visibleMedications.length || 0,
    },
    runtime: {
      focusedComponent: runtime.focusedComponent || null,
      lastCommandType: runtime.lastCommand?.type || null,
      listeningMode: runtime.listeningMode || 'single',
    },
  };
}
