import { fileURLToPath } from 'node:url';
export default {
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  agentRules: false,
  webpack(config,{dev}) { if(dev) config.watchOptions={...config.watchOptions,poll:1000,aggregateTimeout:300,ignored:['**/node_modules/**','**/.next/**','**/.data/**']}; return config; },
  serverExternalPackages: ['@node-rs/argon2'],
  poweredByHeader: false,
  async headers() { return [{ source: '/:path*', headers: [
    {key:'Cache-Control',value:'private, no-store, max-age=0'},
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'same-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]}]; }
};
