import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const exactForbidden = new Set([
  'docs/step-12-product-pricing.md',
  'docs/step-13-sales-samples.md',
  'docs/step-14-sales-page.md',
  'docs/step-15-fiverr-listings.md',
  'docs/step-15-sales-channel.md',
  'docs/step-16-message-templates.md',
  'docs/step-16-order-delivery-sop.md',
  'docs/step-17-first-target-market.md',
  'docs/superpowers/specs/2026-09-01-datafixer-v1-design.md',
]);

const forbiddenPrefixes = ['public/strategy/', 'public/sales/', 'public/sales-demo/'];
const secretBasenamePatterns = [
  /^\.env(?:\.|$)/i,
  /^id_(?:rsa|dsa|ecdsa|ed25519)$/i,
  /\.(?:key|p12|pfx)$/i,
  /^credentials(?:\..+)?\.json$/i,
  /^service-account(?:\..+)?\.json$/i,
];

function normalizePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function findForbiddenPaths(paths) {
  return paths.map(normalizePath).filter((path) => {
    if (exactForbidden.has(path)) return true;
    if (forbiddenPrefixes.some((prefix) => path.startsWith(prefix))) return true;
    const basename = path.split('/').at(-1) ?? path;
    return secretBasenamePatterns.some((pattern) => pattern.test(basename));
  }).sort();
}

function trackedPaths() {
  const output = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

function main() {
  const forbidden = findForbiddenPaths(trackedPaths());
  if (forbidden.length > 0) {
    console.error('PUBLIC_BOUNDARY_FAIL');
    for (const path of forbidden) console.error(`- ${path}`);
    process.exit(1);
  }
  console.log('PUBLIC_BOUNDARY_PASS');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
