import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const productionCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

function datafixerBuildProvenance(): Plugin {
  const buildSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();

  if (buildSha && !/^[0-9a-f]{40}$/i.test(buildSha)) {
    throw new Error('VERCEL_GIT_COMMIT_SHA must be a full 40-character Git SHA');
  }

  return {
    name: 'datafixer-build-provenance',
    transformIndexHtml(html) {
      if (!buildSha) return html;
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: {
              name: 'datafixer-build-sha',
              content: buildSha,
            },
            injectTo: 'head',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), datafixerBuildProvenance()],
  worker: { format: 'es' },
  preview: {
    headers: {
      'Content-Security-Policy': productionCsp,
    },
  },
});
