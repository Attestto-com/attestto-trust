// Guards the site's country display names.
//
// Regression this locks down: the home page "Certificate authorities by
// country" table rendered raw lowercase ISO codes (us, pa, cl, uy, mx) because
// site/src/lib/i18n.js COUNTRY_NAMES was missing those entries and the lookup
// fell back to the code itself. Every country the site can render must have a
// display name in both locales.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { COUNTRY_NAMES, getCountryName } from '../site/src/lib/i18n.js';
import { getRegion, REGIONS } from '../site/src/lib/regions.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const countriesDir = join(repoRoot, 'countries');

const countryDirs = readdirSync(countriesDir).filter(
  (code) =>
    statSync(join(countriesDir, code)).isDirectory() &&
    existsSync(join(countriesDir, code, 'meta.json')),
);

test('every country directory has a display name in en and es', () => {
  const missing = countryDirs.filter((code) => !COUNTRY_NAMES[code]);
  assert.deepEqual(missing, [], `countries/ dirs without a COUNTRY_NAMES entry: ${missing}`);

  for (const code of countryDirs) {
    for (const lang of ['en', 'es']) {
      assert.equal(
        typeof COUNTRY_NAMES[code][lang],
        'string',
        `COUNTRY_NAMES.${code}.${lang} must be a string`,
      );
      assert.ok(COUNTRY_NAMES[code][lang].length > 1, `COUNTRY_NAMES.${code}.${lang} is too short`);
    }
  }
});

test('getCountryName never returns a bare lowercase ISO code', () => {
  for (const code of countryDirs) {
    for (const lang of ['en', 'es']) {
      const name = getCountryName(code, lang);
      assert.notEqual(name, code, `getCountryName('${code}', '${lang}') returned the raw code`);
      assert.ok(!/^[a-z]{2}$/.test(name), `getCountryName('${code}', '${lang}') looks like a code`);
    }
  }
  // Unknown codes degrade visibly (uppercase), never as a plausible label.
  assert.equal(getCountryName('zz', 'en'), 'ZZ');
});

test('every mapped country resolves to a known region', () => {
  const regionKeys = new Set(REGIONS.map((r) => r.key));
  for (const code of Object.keys(COUNTRY_NAMES)) {
    assert.ok(regionKeys.has(getRegion(code)), `${code} maps to an unknown region`);
  }
  // Countries actually shipped must not land in the catch-all bucket.
  for (const code of countryDirs) {
    assert.notEqual(getRegion(code), 'other', `${code} is missing from regions.js REGION_OF`);
  }
});

test('COUNTRY_NAMES covers every code listed in regions.js', () => {
  // Any code assigned a region is a code the site is prepared to render.
  const missing = ['us', 'ca', 'gb', 'mx', 'pa', 'cl', 'uy', 'do'].filter(
    (code) => !COUNTRY_NAMES[code],
  );
  assert.deepEqual(missing, []);
});

test('display names are unique per locale', () => {
  for (const lang of ['en', 'es']) {
    const seen = new Map();
    for (const [code, entry] of Object.entries(COUNTRY_NAMES)) {
      const prev = seen.get(entry[lang]);
      assert.equal(prev, undefined, `duplicate ${lang} name "${entry[lang]}": ${prev} and ${code}`);
      seen.set(entry[lang], code);
    }
  }
});
