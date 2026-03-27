export function createCommandQueue({ onExecute } = {}) {
  const queue = [];
  let running = false;

  async function drain() {
    if (running) return;
    running = true;

    while (queue.length) {
      const nextTask = queue.shift();
      try {
        await onExecute?.(nextTask.payload);
      } catch (error) {
        console.error('[Voice] command queue execution failed', error);
      } finally {
        nextTask.resolve?.();
      }
    }

    running = false;
  }

  return {
    enqueue(payload) {
      return new Promise((resolve) => {
        queue.push({ payload, resolve });
        drain();
      });
    },
    clear() {
      queue.length = 0;
    },
    size() {
      return queue.length;
    },
  };
}
