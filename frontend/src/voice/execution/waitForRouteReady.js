export async function waitForRouteReady({ runtimeStore, targetRoute, timeoutMs = 4000, pollMs = 80, signal } = {}) {
  if (!runtimeStore || !targetRoute) return false;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (signal?.aborted) return false;
    const routePath = runtimeStore.getState?.().routePath || '';
    if (routePath === targetRoute) return true;
    await new Promise((resolve) => window.setTimeout(resolve, pollMs));
  }
  return false;
}
