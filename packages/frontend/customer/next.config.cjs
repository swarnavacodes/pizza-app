/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    API_GATEWAY_URL: process.env.API_GATEWAY_URL ?? "http://localhost:4566/execute-api/1d9cc9c477/$default",
  },
  experimental: {
    appDir: true,
    clientComponentsHaveAuditedRestore: true,
    cpsShift: 2,
  },
  images: {
    domains: [],
  },
}