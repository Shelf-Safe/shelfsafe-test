export const env = {
  port: Number(process.env.PORT || 6060),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  defaultOrgId: process.env.DEFAULT_ORG_ID || 'dummy01',
  healthCanadaApiBase:
    process.env.HEALTH_CANADA_API_BASE || 'https://health-products.canada.ca/api/drug'
};
