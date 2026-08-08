// Copies each country's current/*.pem into site/public/pems/<cc>/ so the built
// site can serve downloadable trust anchors at /pems/<cc>/<file>.
// Runs before `astro build` (see package.json). Source of truth is ../../countries.
import { mkdir, readdir, copyFile, rm } from 'node:fs/promises';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '..');
const repoRoot = resolve(siteRoot, '..');
const countriesDir = join(repoRoot, 'countries');
const outRoot = join(siteRoot, 'public', 'pems');

// Discover live countries the same way the site loader does (site/src/lib/trust.js):
// a country is promoted once it has both meta.json and current/manifest.json.
// Deriving the list here (rather than hardcoding it) keeps pem downloads from
// silently going missing whenever a new country is promoted.
const COUNTRIES = readdirSync(countriesDir).filter((cc) => {
  const dir = join(countriesDir, cc);
  return (
    statSync(dir).isDirectory() &&
    existsSync(join(dir, 'meta.json')) &&
    existsSync(join(dir, 'current', 'manifest.json'))
  );
});

async function main() {
  // Clean previous output for a deterministic build.
  if (existsSync(outRoot)) {
    await rm(outRoot, { recursive: true, force: true });
  }

  let total = 0;
  for (const cc of COUNTRIES) {
    const srcDir = join(countriesDir, cc, 'current');
    if (!existsSync(srcDir)) {
      console.warn(`[copy-pems] skip ${cc}: ${srcDir} not found`);
      continue;
    }
    const destDir = join(outRoot, cc);
    await mkdir(destDir, { recursive: true });

    const files = (await readdir(srcDir)).filter((f) => f.endsWith('.pem'));
    for (const f of files) {
      await copyFile(join(srcDir, f), join(destDir, f));
      total++;
    }
    console.log(`[copy-pems] ${cc}: ${files.length} .pem files`);
  }
  console.log(`[copy-pems] done, ${total} files copied to public/pems/`);
}

main().catch((err) => {
  console.error('[copy-pems] failed:', err);
  process.exit(1);
});
