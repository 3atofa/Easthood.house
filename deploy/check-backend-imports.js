#!/usr/bin/env node
/**
 * Backend import checker.
 *
 * The backend is ESM with no build step and no type checker, so a typo'd
 * path or a renamed export is not caught until the moment that file is
 * first imported at runtime — which, for a controller, may be the first
 * time a visitor hits that endpoint in production.
 *
 * This walks every relative import in backend/src and proves the target
 * exists and actually exports the names being imported.
 *
 * Run:  node deploy/check-backend-imports.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'backend', 'src');

/** Comments must go before parsing, or a comma inside one splits a name. */
const stripComments = source =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');

const walk = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walk(full)
      : entry.name.endsWith('.js')
        ? [full]
        : [];
  });

const files = walk(SRC);

// ---- what each file exports ----
const exports = new Map();

for (const file of files) {
  const source = stripComments(fs.readFileSync(file, 'utf8'));
  const names = new Set();

  // export const/function/class NAME
  for (const m of source.matchAll(
    /^export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/gm
  )) {
    names.add(m[1]);
  }

  // export const { A, B } = pkg   /   export { A, B as C }
  for (const m of source.matchAll(/^export\s+(?:const\s*)?\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }

  if (/^export\s+default/m.test(source)) {
    names.add('default');
  }

  exports.set(file, names);
}

// ---- check every relative import ----
// One statement at a time: the clause may not contain another `from`.
const STATEMENT =
  /^import\s+(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]\s*;?/gm;

const problems = [];
let checked = 0;

for (const file of files) {
  const source = stripComments(fs.readFileSync(file, 'utf8'));

  for (const m of source.matchAll(STATEMENT)) {
    const [, clause = '', spec] = m;

    if (!spec.startsWith('.')) {
      continue;
    }

    checked++;

    const target = path.resolve(path.dirname(file), spec);
    const rel = path.relative(ROOT, file);

    if (!exports.has(target)) {
      problems.push(`${rel}: path does not exist -> ${spec}`);
      continue;
    }

    const named = clause.match(/\{([^}]*)\}/);

    if (!named) {
      continue;
    }

    for (const part of named[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0]?.trim();

      if (name && !exports.get(target).has(name)) {
        problems.push(`${rel}: "${name}" is not exported by ${spec}`);
      }
    }
  }
}

console.log(`files: ${files.length}   relative imports checked: ${checked}`);

if (problems.length) {
  console.error('\nPROBLEMS:');
  problems.forEach(p => console.error('  -', p));
  process.exit(1);
}

console.log('OK — every relative import resolves and every named import exists.');
