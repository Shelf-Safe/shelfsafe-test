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

function conditionalImageUpload(req, res, next) {
  if (req.is('multipart/form-data')) {
    return upload.single('image')(req, res, next);
  }

  return next();
}

router.post('/resolve', conditionalImageUpload, resolveScanController);

export default router;
