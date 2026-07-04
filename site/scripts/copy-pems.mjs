// Copies each country's current/*.pem into site/public/pems/<cc>/ so the built
// site can serve downloadable trust anchors at /pems/<cc>/<file>.
// Runs before `astro build` (see package.json). Source of truth is ../../countries.
import { mkdir, readdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '..');
const repoRoot = resolve(siteRoot, '..');
const countriesDir = join(repoRoot, 'countries');
const outRoot = join(siteRoot, 'public', 'pems');

const COUNTRIES = ['cr', 'br', 'ar'];

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
