import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const useHttps = env.HTTPS === 'true';
  let httpsOption: { key: Buffer; cert: Buffer } | undefined;
  if (useHttps) {
    const keyPath = env.SSL_KEY_PATH || path.resolve(__dirname, '.cert/localhost-key.pem');
    const certPath = env.SSL_CERT_PATH || path.resolve(__dirname, '.cert/localhost.pem');
    try {
      httpsOption = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
    } catch {
      httpsOption = undefined;
    }
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      ...(httpsOption ? { https: httpsOption } : {})
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
