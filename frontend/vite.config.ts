import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({ mode }) => {
  // Load env file from ../.env (where backend .env usually lives)
  const env = loadEnv(mode, process.cwd() + '/..', '');
  const port = env.PORT || '8081';

  return {
    base: '/',
    plugins: [react()],
    define: {
      '__APP_VERSION__': JSON.stringify(packageJson.version),
    },
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${port}`,
          changeOrigin: true,
        }
      }
    }
  }
})
