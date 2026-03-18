export const env = {
  port: Number(process.env.PORT || 6060),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  defaultOrgId: process.env.DEFAULT_ORG_ID || 'dummy01',
  healthCanadaApiBase:
    process.env.HEALTH_CANADA_API_BASE || 'https://health-products.canada.ca/api/drug',
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN || '',
  uploadScansToBlob: String(process.env.UPLOAD_SCANS_TO_BLOB || 'true').toLowerCase() !== 'false',
  scanBlobFolder: process.env.SCAN_BLOB_FOLDER || 'barcodes',
  decodeTimeoutMs: Number(process.env.DECODE_TIMEOUT_MS || 12000)
};
