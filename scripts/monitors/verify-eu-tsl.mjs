import 'reflect-metadata'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { verifyXadesSignature, authorizeSigner } from './lib/verify-xades.mjs'
import { parseLotlPointers } from './lib/extract-lotl.mjs'
import { isFresh } from './lib/tsl-meta.mjs'
import { extractCertsFromTsl } from './lib/extract-tsl.mjs'
import { reconcile } from './lib/reconcile-current.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LOTL_URL = 'https://ec.europa.eu/tools/lotl/eu-lotl.xml'

function slug(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'cert'
}

export function selectDesiredCerts(certs) {
  const used = new Set()
  const out = []
  for (const c of certs) {
    let base = slug(c.subjectCN || 'cert')
    let name = base
    if (used.has(name)) name = `${base}-${(c.sha256 || '').slice(0, 8)}`
    used.add(name)
    out.push({ filename: `${name}.pem`, pem: c.pem })
  }
  return out
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.text()
}

function writeVerificationReport(root, p, signerCert, r, certCount, timestamp) {
  const dir = join(root, 'countries', p.iso2)
  mkdirSync(dir, { recursive: true })
  const subject = signerCert ? signerCert.subject : '(unknown)'
  const sha256 = signerCert
    ? Buffer.from(signerCert.rawData).toString('hex').slice(0, 64)
    : '(unknown)'
  const md = [
    `# TSL Verification Report — ${p.iso2.toUpperCase()}`,
    '',
    `**Generated:** ${timestamp}`,
    '',
    '## Signer Certificate',
    '',
    `- **Subject:** ${subject}`,
    `- **SHA-256 (raw DER, first 32 bytes):** ${sha256}`,
    '',
    '## Promoted Certificates',
    '',
    `- **Count:** ${certCount}`,
    '',
    '## Reconcile Summary',
    '',
    `- **Added:** ${r.added.length}`,
    `- **Archived:** ${r.archived.length}`,
    `- **Unchanged:** ${r.unchanged.length}`,
    '',
  ].join('\n')
  writeFileSync(join(dir, 'VERIFICATION.md'), md)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const only = args.filter((a) => !a.startsWith('--'))
  const timestamp = new Date().toISOString()

  const anchorPem = readFileSync(join(root, 'trust-anchors/eu-lotl/EC-LOTL-signer.pem'), 'utf8')
  const ecAnchor = [{ type: 'cert', value: anchorPem.replace(/-----[^-]+-----|\s+/g, '') }]

  const lotlXml = await fetchText(LOTL_URL)
  if (!isFresh(lotlXml)) throw new Error('LOTL is past NextUpdate — refresh or investigate')
  const lotlSig = await verifyXadesSignature(lotlXml)
  if (!lotlSig.valid) throw new Error(`LOTL signature invalid: ${lotlSig.reason}`)
  const lotlAuth = authorizeSigner(lotlSig.signerCert, ecAnchor, { allowChain: true })
  if (!lotlAuth.authorized) throw new Error('LOTL signer not the pinned EC anchor — refresh EC LOTL anchors from OJEU')

  let pointers = parseLotlPointers(lotlXml)
  if (only.length) pointers = pointers.filter((p) => only.includes(p.iso2))

  const summary = []
  for (const p of pointers) {
    try {
      const tslXml = await fetchText(p.tslUrl)
      if (!isFresh(tslXml)) {
        summary.push(`${p.iso2}: SKIP stale (past NextUpdate)`)
        continue
      }
      const sig = await verifyXadesSignature(tslXml)
      if (!sig.valid) {
        summary.push(`${p.iso2}: SKIP bad signature (${sig.reason})`)
        continue
      }
      const auth = authorizeSigner(sig.signerCert, p.signingIdentities, { allowChain: false })
      if (!auth.authorized) {
        summary.push(`${p.iso2}: SKIP signer not LOTL-declared`)
        continue
      }

      const { certs } = extractCertsFromTsl(Buffer.from(tslXml), { caOnly: true })
      const desired = selectDesiredCerts(certs)
      if (desired.length === 0) {
        summary.push(`${p.iso2}: SKIP zero granted CA certs`)
        continue
      }
      if (dryRun) {
        summary.push(`${p.iso2}: OK (dry-run) ${desired.length} certs`)
        continue
      }

      const currentDir = join(root, 'countries', p.iso2, 'current')
      const archiveDir = join(root, 'countries', p.iso2, 'archive', timestamp.slice(0, 10))
      const r = reconcile({ currentDir, archiveDir, desired })
      execFileSync('node', [join(root, 'scripts/refresh-manifest.mjs'), p.iso2], { cwd: root })
      writeVerificationReport(root, p, sig.signerCert, r, desired.length, timestamp)
      summary.push(`${p.iso2}: PROMOTED +${r.added.length} -${r.archived.length} =${r.unchanged.length}`)
    } catch (e) {
      summary.push(`${p.iso2}: SKIP error ${e.message}`)
    }
  }
  console.log('\n=== run summary ===\n' + summary.join('\n'))
}

// Only run as CLI entry point, not when imported as a module.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
