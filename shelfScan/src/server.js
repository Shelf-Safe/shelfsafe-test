import app from './app.js';
import { env } from './config/env.js';

if (env.nodeEnv !== 'production' && !env.isVercel) {
  app.listen(env.port, () => {
    console.log(`ShelfSafe Scan API listening on http://localhost:${env.port}`);
  });
}

export default app;
