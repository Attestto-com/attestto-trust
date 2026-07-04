// Build-time trust-data loader.
// Reads ../../../countries/<cc>/current/manifest.json, builds the CA hierarchy
// from issuer -> subject links, assigns URL-safe slugs, and computes a validity
// state for each certificate relative to the build date.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const countriesDir = join(repoRoot, 'countries');

// Static per-country presentation metadata. Authoritative sources noted where known.
export const COUNTRIES = [
  {
    code: 'cr',
    name: 'Costa Rica',
    flag: '\u{1F1E8}\u{1F1F7}',
    authority: 'BCCR (Banco Central de Costa Rica) / SINPE / MICITT Firma Digital',
    authorityUrl: 'https://www.firmadigital.go.cr/',
  },
  {
    code: 'br',
    name: 'Brazil',
    flag: '\u{1F1E7}\u{1F1F7}',
    authority: 'ITI (Instituto Nacional de Tecnologia da Informacao) / ICP-Brasil',
    authorityUrl: 'https://www.gov.br/iti/',
  },
  {
    code: 'ar',
    name: 'Argentina',
    flag: '\u{1F1E6}\u{1F1F7}',
    authority: 'Autoridad Certificante Raiz de la Republica Argentina',
    authorityUrl: 'https://www.argentina.gob.ar/jefatura/innovacion-publica/firma-digital',
  },
];

// The build "now". Validity chips are computed against this instant.
export const BUILD_DATE = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_WINDOW_DAYS = 90;

function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'cert';
}

// Best-effort repair of common UTF-8-read-as-Latin-1 mojibake (e.g. "RaÃ­z" -> "Raíz")
// for display only. The underlying manifest value is preserved everywhere it matters.
export function fixMojibake(str) {
  if (typeof str !== 'string') return str;
  if (!/Ã|Â| Â|Ã­|Ã©|Ã¡|Ã³|Ãº|Ã±/.test(str)) return str;
  try {
    const bytes = Uint8Array.from([...str].map((c) => c.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return decoded.includes('�') ? str : decoded;
  } catch {
    return str;
  }
}

export function validityState(cert, now = BUILD_DATE) {
  const from = new Date(cert.validFrom);
  const to = new Date(cert.validTo);
  const nowMs = now.getTime();
  const toMs = to.getTime();

  let state;
  if (nowMs > toMs) {
    state = 'expired';
  } else if (nowMs < from.getTime()) {
    state = 'pending';
  } else if (toMs - nowMs <= EXPIRING_WINDOW_DAYS * DAY_MS) {
    state = 'expiring';
  } else {
    state = 'valid';
  }

  const daysToExpiry = Math.round((toMs - nowMs) / DAY_MS);
  return { state, daysToExpiry };
}

export const VALIDITY_META = {
  valid: { label: 'Valid', tone: 'green' },
  expiring: { label: 'Expiring soon', tone: 'amber' },
  expired: { label: 'Expired', tone: 'red' },
  pending: { label: 'Not yet valid', tone: 'amber' },
};

export const ROLE_META = {
  root: { label: 'Root CA', tone: 'root' },
  intermediate: { label: 'Intermediate CA', tone: 'intermediate' },
  leaf: { label: 'End entity', tone: 'leaf' },
};

function readManifest(code) {
  const path = join(countriesDir, code, 'current', 'manifest.json');
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// Loads and enriches one country's certificates. Returns:
//   { code, name, flag, authority, authorityUrl, generatedAt, count,
//     certs: [...enriched], roots: [...tree] }
export function loadCountry(code) {
  const meta = COUNTRIES.find((c) => c.code === code);
  if (!meta) throw new Error(`Unknown country: ${code}`);
  const manifest = readManifest(code);

  const usedSlugs = new Set();
  const certs = manifest.certificates.map((c) => {
    let base = slugify(fixMojibake(c.subject));
    let slug = base;
    // Same subject CN can appear on multiple files (e.g. CR SINPE v2 + v2 2023).
    if (usedSlugs.has(slug)) {
      slug = `${base}-${c.sha256.slice(0, 8)}`;
    }
    usedSlugs.add(slug);

    const validity = validityState(c);
    return {
      ...c,
      subjectDisplay: fixMojibake(c.subject),
      issuerDisplay: fixMojibake(c.issuer),
      slug,
      validity,
      children: [],
      parent: null,
    };
  });

  // Link children to the parent whose subject === child.issuer.
  // A cert is a root if role==="root" or issuer===subject (self-signed).
  const bySubject = new Map();
  for (const cert of certs) {
    if (!bySubject.has(cert.subject)) bySubject.set(cert.subject, cert);
  }

  const roots = [];
  for (const cert of certs) {
    const isRoot = cert.role === 'root' || cert.issuer === cert.subject;
    const parent = isRoot ? null : bySubject.get(cert.issuer);
    if (parent && parent !== cert) {
      cert.parent = parent;
      parent.children.push(cert);
    } else {
      // Root, or an orphan whose issuer is not in the set: render at top level.
      cert.orphan = !isRoot && !parent;
      roots.push(cert);
    }
  }

  // Deterministic ordering: by role weight then subject.
  const roleWeight = { root: 0, intermediate: 1, leaf: 2 };
  const sortFn = (a, b) =>
    (roleWeight[a.role] ?? 9) - (roleWeight[b.role] ?? 9) ||
    a.subjectDisplay.localeCompare(b.subjectDisplay);
  roots.sort(sortFn);
  for (const cert of certs) cert.children.sort(sortFn);

  return {
    ...meta,
    generatedAt: manifest.generatedAt,
    count: manifest.count ?? certs.length,
    certs,
    roots,
  };
}

export function loadAllCountries() {
  return COUNTRIES.map((c) => loadCountry(c.code));
}

// Walk parent links from a cert up to its root, returning root -> ... -> cert.
export function chainOf(cert) {
  const path = [];
  let node = cert;
  const seen = new Set();
  while (node && !seen.has(node.slug)) {
    seen.add(node.slug);
    path.unshift(node);
    node = node.parent;
  }
  return path;
}

export function truncateMid(str, head = 8, tail = 8) {
  if (!str) return '';
  if (str.length <= head + tail + 1) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export function pemHref(code, file) {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/pems/${code}/${encodeURIComponent(file)}`;
}
