import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(rootDir, 'src');
const testDataDir = path.resolve(rootDir, 'test');

function serveTestData(): Plugin {
  return {
    name: 'serve-test-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.startsWith('/test/')) return next();

        const rel = decodeURIComponent(url.slice('/test/'.length));
        if (!rel || rel.includes('..')) {
          res.statusCode = 400;
          res.end('Bad request');
          return;
        }

        const filePath = path.normalize(path.join(testDataDir, rel));
        const relative = path.relative(testDataDir, filePath);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) return next();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
  };
}

const wikiProxy = {
  '/wiki-data': {
    target: 'https://www.taskbarhero.wiki',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/wiki-data/, '/data'),
  },
};

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  plugins: [serveTestData()],
  server: {
    port: 5173,
    proxy: wikiProxy,
  },
  preview: {
    proxy: wikiProxy,
  },
});
