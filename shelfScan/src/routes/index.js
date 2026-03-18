import express from 'express';
import scanRoutes from './scan.routes.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'shelfsafe-scan-api',
    time: new Date().toISOString()
  });
});

router.use('/scan', scanRoutes);

export default router;
