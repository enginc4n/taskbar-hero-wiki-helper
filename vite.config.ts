import { defineConfig } from 'vite';

const wikiProxy = {
  '/wiki-data': {
    target: 'https://www.taskbarhero.wiki',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/wiki-data/, '/data'),
  },
};

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  server: {
    port: 5173,
    proxy: wikiProxy,
  },
  preview: {
    proxy: wikiProxy,
  },
});
