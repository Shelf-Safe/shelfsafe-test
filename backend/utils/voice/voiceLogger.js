const DEBUG_ENABLED = String(process.env.VOICE_DEBUG_LOGS || 'false') === 'true';

function prefix(scope) {
  return `[Voice][${scope}]`;
}

export function createVoiceLogger(scope = 'General') {
  return {
    debug: (...args) => {
      if (!DEBUG_ENABLED) return;
      console.debug(prefix(scope), ...args);
    },
    info: (...args) => console.log(prefix(scope), ...args),
    warn: (...args) => console.warn(prefix(scope), ...args),
    error: (...args) => console.error(prefix(scope), ...args),
  };
}
