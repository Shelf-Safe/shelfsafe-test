import express from 'express';
import multer from 'multer';
import { resolveScanController } from '../controllers/scan.controller.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024
  }
});

router.post('/resolve', upload.single('image'), resolveScanController);

export default router;
