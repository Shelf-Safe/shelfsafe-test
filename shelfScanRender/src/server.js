import app from './app.js';
import { env } from './config/env.js';
  
const port = process.env.PORT || env.port || 6060;

if (!env.isVercel) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`ShelfSafe Scan API listening on port ${port}`);
  });
}

export default app;