#!/usr/bin/env node
import process from 'node:process';

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

  return new URL(response.url).origin;
}

const failures = [];
for (const candidate of candidates) {
  try {
    const origin = await verifyCandidate(candidate);
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
