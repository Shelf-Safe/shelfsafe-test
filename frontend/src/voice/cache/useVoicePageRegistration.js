import { useEffect } from 'react';
import { useVoice } from '../VoiceContext';

export function useVoicePageSchema(pageId, schema) {
  const { registerVoicePageSchema } = useVoice();

  useEffect(() => {
    if (!pageId || !schema) return;
    registerVoicePageSchema(pageId, schema);
  }, [pageId, schema, registerVoicePageSchema]);
}

export function useVoicePageState(pageId, pageState) {
  const { updateVoicePageState } = useVoice();

  useEffect(() => {
    if (!pageId || !pageState) return;
    updateVoicePageState(pageId, pageState);
  }, [pageId, pageState, updateVoicePageState]);
}
