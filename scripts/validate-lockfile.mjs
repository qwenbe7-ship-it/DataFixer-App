#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  let packagePath = 'package.json';
  let lockfilePath = 'package-lock.json';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--package') packagePath = argv[++i];
    else if (argv[i] === '--lockfile') lockfilePath = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return { packagePath, lockfilePath };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sameMap(actual = {}, expected = {}) {
  const a = Object.entries(actual).sort(([x], [y]) => x.localeCompare(y));
  const e = Object.entries(expected).sort(([x], [y]) => x.localeCompare(y));
  return JSON.stringify(a) === JSON.stringify(e);
}

function validate(packageJson, lock) {
  const errors = [];
  if (lock.lockfileVersion !== 3) {
    errors.push(`lockfileVersion must be exactly 3; got ${lock.lockfileVersion ?? 'missing'}`);
  }
  const packages = lock.packages;
  if (!packages || typeof packages !== 'object' || !packages['']) {
    errors.push('lockfile packages[""] root entry is missing');
    return errors;
  }
  const root = packages[''];
  if (lock.name !== packageJson.name || lock.version !== packageJson.version || root.name !== packageJson.name || root.version !== packageJson.version) {
    errors.push('lockfile project identity does not match package.json');
  }
  const expectedDeps = packageJson.dependencies ?? {};
  const expectedDev = packageJson.devDependencies ?? {};
  if (!sameMap(root.dependencies, expectedDeps)) errors.push('root dependencies do not exactly match package.json');
  if (!sameMap(root.devDependencies, expectedDev)) errors.push('root devDependencies do not exactly match package.json');

  const sheetJsSpec = expectedDeps.xlsx;
  const sheetJsVersionMatch = typeof sheetJsSpec === 'string'
    ? sheetJsSpec.match(/\/xlsx-(\d+\.\d+\.\d+)\.tgz$/)
    : null;

  for (const [packagePath, entry] of Object.entries(packages)) {
    if (!packagePath || !entry || typeof entry !== 'object' || typeof entry.resolved !== 'string') continue;
    let resolvedUrl;
    try {
      resolvedUrl = new URL(entry.resolved);
    } catch {
      errors.push(`${packagePath}: resolved is not a valid absolute URL (${entry.resolved})`);
      continue;
    }
    if (resolvedUrl.protocol !== 'https:') {
      errors.push(`${packagePath}: resolved URL must use https (${entry.resolved})`);
      continue;
    }
    if (resolvedUrl.hostname === 'cdn.sheetjs.com') {
      if (packagePath !== 'node_modules/xlsx' || entry.resolved !== sheetJsSpec) {
        errors.push(`${packagePath}: SheetJS CDN is only allowed for the pinned xlsx tarball (${entry.resolved})`);
      }
    } else if (resolvedUrl.hostname !== 'registry.npmjs.org') {
      errors.push(`${packagePath}: resolved outside trusted package hosts (${entry.resolved})`);
    }
  }

  for (const [name, spec] of Object.entries({ ...expectedDeps, ...expectedDev })) {
    const entry = packages[`node_modules/${name}`];
    if (!entry) {
      errors.push(`${name}: direct dependency entry missing`);
      continue;
    }
    if (String(spec).startsWith('https://')) {
      if (entry.resolved !== spec) errors.push(`${name}: resolved URL drift (${entry.resolved ?? 'missing'})`);
      if (name === 'xlsx' && sheetJsVersionMatch && entry.version !== sheetJsVersionMatch[1]) {
        errors.push(`${name}: locked version ${entry.version ?? 'missing'} does not match pinned tarball ${sheetJsVersionMatch[1]}`);
      }
    } else {
      if (entry.version !== spec) errors.push(`${name}: locked version ${entry.version ?? 'missing'} != ${spec}`);
      if (typeof entry.resolved !== 'string' || !entry.resolved.startsWith('https://registry.npmjs.org/')) {
        errors.push(`${name}: direct dependency resolved outside registry.npmjs.org (${entry.resolved ?? 'missing'})`);
      }
    }
    if (typeof entry.integrity !== 'string' || !entry.integrity.startsWith('sha512-')) {
      errors.push(`${name}: sha512 integrity missing`);
    }
  }
  return errors;
}

try {
  const { packagePath, lockfilePath } = parseArgs(process.argv.slice(2));
  const pkg = readJson(path.resolve(packagePath));
  const lock = readJson(path.resolve(lockfilePath));
  const errors = validate(pkg, lock);
  if (errors.length) {
    for (const error of errors) console.error(`FAIL ${error}`);
    process.exit(1);
  }
  console.log(`PASS lockfile validated directDependencies=${Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }).length}`);
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
