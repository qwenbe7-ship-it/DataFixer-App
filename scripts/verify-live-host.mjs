#!/usr/bin/env node
import process from 'node:process';

const expectedSha = process.env.DATAFIXER_EXPECTED_SHA?.trim();
if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) {
  console.error('LIVE_HOST_PROVENANCE_FAIL DATAFIXER_EXPECTED_SHA must be a full 40-character Git SHA');
  process.exit(2);
}

const configured = process.env.DATAFIXER_LIVE_URL?.trim();
const candidates = [
  configured,
  'https://data-fixer-app.vercel.app',
  'https://data-fixer-app-qwenbe.vercel.app',
  'https://data-fixer-app-git-main-qwenbe.vercel.app',
].filter((value, index, all) => value && all.indexOf(value) === index);

const requiredPermissions = ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()', 'usb=()'];

function assertHeader(headers, name, predicate, expected) {
  const value = headers.get(name);
  if (!value || !predicate(value)) {
    throw new Error(`${name} mismatch: expected ${expected}; received ${value ?? '<missing>'}`);
  }
}

function readBuildSha(body) {
  const metaTags = body.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== 'datafixer-build-sha') continue;
    return tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]?.trim() ?? '';
  }
  return '';
}

async function verifyCandidate(candidate) {
  const response = await fetch(candidate, {
    redirect: 'follow',
    headers: { 'user-agent': 'DataFixer-live-host-verifier/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (!body.includes('<title>DataFixer</title>')) {
    throw new Error('response is not the DataFixer application');
  }

  const buildSha = readBuildSha(body);
  if (!buildSha) {
    throw new Error('datafixer-build-sha provenance meta is missing');
  }
  if (buildSha.toLowerCase() !== expectedSha.toLowerCase()) {
    throw new Error(`deployed Git SHA mismatch: expected ${expectedSha}; received ${buildSha}`);
  }

  assertHeader(
    response.headers,
    'content-security-policy',
    (value) => value.toLowerCase().includes("frame-ancestors 'none'"),
    "frame-ancestors 'none'",
  );
  assertHeader(response.headers, 'x-content-type-options', (value) => value.toLowerCase() === 'nosniff', 'nosniff');
  assertHeader(response.headers, 'x-frame-options', (value) => value.toUpperCase() === 'DENY', 'DENY');
  assertHeader(response.headers, 'referrer-policy', (value) => value.toLowerCase() === 'no-referrer', 'no-referrer');
  assertHeader(
    response.headers,
    'permissions-policy',
    (value) => requiredPermissions.every((entry) => value.toLowerCase().includes(entry)),
    requiredPermissions.join(', '),
  );

  return { origin: new URL(response.url).origin, buildSha };
}

const failures = [];
for (const candidate of candidates) {
  try {
    const { origin, buildSha } = await verifyCandidate(candidate);
    console.error(`LIVE_HOST_PROVENANCE_PASS ${origin} sha=${buildSha}`);
    console.error(`LIVE_HOST_HEADERS_PASS ${origin}`);
    process.stdout.write(origin);
    process.exit(0);
  } catch (error) {
    failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const failure of failures) console.error(`LIVE_HOST_CANDIDATE_FAIL ${failure}`);
console.error('LIVE_HOST_HEADERS_FAIL no candidate passed the live-host contract');
process.exit(1);
