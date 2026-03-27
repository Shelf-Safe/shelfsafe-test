export function pickVoiceEnv(name, fallback) {
  const value = import.meta.env[name];
  return value === undefined || value === null || value === '' ? fallback : value;
}
