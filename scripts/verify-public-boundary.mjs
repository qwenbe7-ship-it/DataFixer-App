import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

const commercialChannelPattern = [
  ['Fiv', 'err'].join(''),
  ['Up', 'work'].join(''),
].join('|');
const foundingPattern = ['founding', 'customer'].join('\\s+');
const salesChannelPattern = ['판매', '채널'].join('\\s*');
const firstFivePattern = ['첫', '5건'].join('\\s*');

const forbiddenContentRules = [
  {
    rule: 'commercial-strategy',
    pattern: new RegExp(`\\b(?:${commercialChannelPattern})\\b|\\$(?:29|69)\\b|₩39,?000|${salesChannelPattern}|${firstFivePattern}|${foundingPattern}`, 'i'),
  },
  { rule: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { rule: 'github-token', pattern: /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})\b/ },
  { rule: 'openai-token', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { rule: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { rule: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { rule: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
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

export function findForbiddenContent(files) {
  const findings = [];
  for (const file of files) {
    for (const { rule, pattern } of forbiddenContentRules) {
      if (pattern.test(file.content)) findings.push({ path: normalizePath(file.path), rule });
    }
  }
  return findings.sort((left, right) => left.path.localeCompare(right.path) || left.rule.localeCompare(right.rule));
}

function trackedPaths() {
  const output = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

function trackedTextFiles(paths) {
  const files = [];
  for (const path of paths) {
    const bytes = readFileSync(path);
    if (bytes.includes(0)) continue;
    files.push({ path, content: bytes.toString('utf8') });
  }
  return files;
}

function main() {
  const paths = trackedPaths();
  const forbiddenPaths = findForbiddenPaths(paths);
  const forbiddenContent = findForbiddenContent(trackedTextFiles(paths));
  if (forbiddenPaths.length > 0 || forbiddenContent.length > 0) {
    console.error('PUBLIC_BOUNDARY_FAIL');
    for (const path of forbiddenPaths) console.error(`- forbidden-path: ${path}`);
    for (const { path, rule } of forbiddenContent) console.error(`- forbidden-content(${rule}): ${path}`);
    process.exit(1);
  }
  console.log('PUBLIC_BOUNDARY_PASS');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
