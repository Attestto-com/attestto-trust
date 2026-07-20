/**
 * Country-agnostic monitor orchestration (design spec stages 2-4):
 * diff discovered candidates against stored state, download only what
 * changed, extract candidate certs, and stage them for manual review.
 *
 * This never writes to countries/<iso2>/current/ — promotion out of
 * staging/ is a manual step (see the repo README's "Updating an existing
 * country" flow). A malicious/spoofed source page can, at worst, land a
 * bad file in staging/ for a human to reject; it can never become a
 * trusted anchor on its own.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { headSource, downloadSource, toHttps } from './discover.mjs'
import { certsFromFile, extractCertsFromZip } from './extract-certs.mjs'
import { extractCertsFromTsl } from './extract-tsl.mjs'
import { loadState, saveState } from './state.mjs'

const CERT_DIRECT_EXT = new Set(['pem', 'crt', 'cer', 'der', 'p7b', 'p7c'])
const TSL_EXT = new Set(['xml'])
const UNSUPPORTED_EXT = new Set(['rar'])

function extOf(filename) {
  const m = filename.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : ''
}

/**
 * Org/subject names come from third-party HTML or XML (e.g. Peru's TSL has
 * a TSP trade name of "RENIEC/PERU") and can't be trusted as path segments.
 * Collapse anything that would create or escape a directory.
 */
function sanitizeForFilename(name) {
  return name.replace(/[/\\]/g, '-').replace(/\s+/g, ' ').trim()
}

function runDate() {
  return new Date().toISOString().slice(0, 10)
}

function log(countryDir, line) {
  appendFileSync(join(countryDir, '.monitor.log'), `[${new Date().toISOString()}] ${line}\n`)
}

/** Map of "<ORG> - <CN>.pem" -> sha256, read from the existing manifest.json (if any). */
function loadExistingCurrentHashes(countryDir) {
  const byName = new Map()
  const manifestPath = join(countryDir, 'current', 'manifest.json')
  if (!existsSync(manifestPath)) return byName
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  for (const entry of manifest.certificates || []) {
    byName.set(entry.file, entry.sha256)
  }
  return byName
}

/**
 * @param {object} opts
 * @param {string} opts.iso2
 * @param {string} opts.countryDir - absolute path to countries/<iso2>
 * @param {string} opts.pageUrl
 * @param {string|null} opts.pageTlsFingerprintSha256
 * @param {Array<{url: string, org: string, filename: string}>} opts.candidates
 * @returns {Promise<{stagedCount: number, knownGaps: Array, stagingDir: string|null}>}
 */
export async function syncCountry({ iso2, countryDir, pageUrl, pageTlsFingerprintSha256, candidates }) {
  mkdirSync(countryDir, { recursive: true })
  const state = loadState(countryDir, pageUrl)

  if (
    pageTlsFingerprintSha256 &&
    state.pageTlsFingerprintSha256 &&
    pageTlsFingerprintSha256 !== state.pageTlsFingerprintSha256
  ) {
    log(
      countryDir,
      `WARNING: TLS fingerprint for ${pageUrl} changed (was ${state.pageTlsFingerprintSha256}, now ${pageTlsFingerprintSha256}) — verify this isn't a MITM/reissue before trusting anything staged this run`,
    )
  }
  state.pageUrl = pageUrl
  state.pageTlsFingerprintSha256 = pageTlsFingerprintSha256 ?? state.pageTlsFingerprintSha256

  const existingCurrentHashes = loadExistingCurrentHashes(countryDir)
  const stagingDir = join(countryDir, 'staging', runDate())
  const rawDir = join(countryDir, 'raw')
  mkdirSync(rawDir, { recursive: true })

  const knownGaps = []
  const stagedSummary = []
  const stagedHashesThisRun = new Set()
  const nowIso = () => new Date().toISOString()

  for (const { url, org, filename } of candidates) {
    const ext = extOf(filename)
    const prev = state.sources[url]

    if (UNSUPPORTED_EXT.has(ext)) {
      knownGaps.push({ org, url, filename, reason: `${ext}-unsupported` })
      state.sources[url] = { ...prev, org, filename, extension: ext, unsupported: true, lastSeen: nowIso() }
      continue
    }

    // Always fetch over HTTPS even if the page links http:// — a
    // network-position attacker owns the entire plaintext leg (including
    // any redirect), so relying on the server to redirect us to https
    // isn't a real security boundary for a trust-anchor source.
    const fetchUrl = toHttps(url)

    const head = await headSource(fetchUrl)
    const headUnchanged =
      prev &&
      head &&
      prev.contentLength &&
      head.contentLength === prev.contentLength &&
      ((head.etag && head.etag === prev.etag) ||
        (head.lastModified && head.lastModified === prev.lastModifiedHeader))

    if (headUnchanged) {
      state.sources[url] = { ...prev, lastSeen: nowIso() }
      continue
    }

    let downloaded
    try {
      downloaded = await downloadSource(fetchUrl)
    } catch (err) {
      log(countryDir, `WARNING: download failed for ${org} - ${filename} (${url}): ${err.message}`)
      continue
    }

    const changed = !prev || downloaded.sha256 !== prev.sha256
    state.sources[url] = {
      org,
      filename,
      extension: ext,
      sha256: downloaded.sha256,
      contentLength: downloaded.headers.contentLength,
      lastModifiedHeader: downloaded.headers.lastModified,
      etag: downloaded.headers.etag,
      firstSeen: prev?.firstSeen ?? nowIso(),
      lastChanged: changed ? nowIso() : prev?.lastChanged ?? nowIso(),
      lastSeen: nowIso(),
    }

    if (!changed) continue

    writeFileSync(join(rawDir, filename), downloaded.buffer)
    log(countryDir, `CHANGED: ${org} - ${filename} (${url})`)

    let certs, error, extractionSkips
    if (ext === 'zip') {
      ;({ certs, error } = extractCertsFromZip(downloaded.buffer))
    } else if (TSL_EXT.has(ext)) {
      ;({ certs, error, skipped: extractionSkips } = extractCertsFromTsl(downloaded.buffer))
    } else if (CERT_DIRECT_EXT.has(ext)) {
      certs = certsFromFile(downloaded.buffer, filename)
      error = null
    } else {
      log(countryDir, `WARNING: ${org} - ${filename} has an unrecognized extension (.${ext}) — downloaded to raw/ but not extracted`)
      continue
    }

    if (error) {
      log(countryDir, `WARNING: failed to extract ${org} - ${filename}: ${error}`)
      continue
    }

    // A TSL lists services deliberately excluded from staging (withdrawn,
    // not-under-supervision, unparseable) — surface those the same way as
    // an unsupported file extension: a persistent, visible gap, not a
    // silently dropped cert.
    for (const skip of extractionSkips || []) {
      knownGaps.push({ org: skip.org, url, filename: skip.serviceName, reason: skip.reason })
    }

    if (certs.length === 0) {
      log(countryDir, `WARNING: no certificates found inside ${org} - ${filename} — may be an unsupported container format, inspect raw/${filename} manually`)
      continue
    }

    for (const cert of certs) {
      // Dedup by content, not by source file: the same cert often appears
      // more than once across an org's bundles (e.g. a /PEM and a /CER copy
      // of the identical certificate inside one zip, or the same root
      // repeated across two vintages of a CA's bundle).
      if (stagedHashesThisRun.has(cert.sha256)) continue

      // A TSL's certs each belong to their own Trust Service Provider,
      // distinct from the single candidate-level org (the TSL document
      // itself) — prefer the cert's own org when the extractor set one.
      const effectiveOrg = cert.org ?? org
      const stagedName = sanitizeForFilename(`${effectiveOrg} - ${cert.subjectCN || cert.serialNumber}.pem`)
      const existingHash = existingCurrentHashes.get(stagedName)
      const status = !existingHash ? 'new' : existingHash === cert.sha256 ? 'unchanged' : 'rotation-candidate'
      if (status === 'unchanged') continue

      stagedHashesThisRun.add(cert.sha256)
      mkdirSync(stagingDir, { recursive: true })
      writeFileSync(join(stagingDir, stagedName), cert.pem)
      stagedSummary.push({
        org: effectiveOrg,
        stagedFile: stagedName,
        subject: cert.subjectCN,
        issuer: cert.issuerCN,
        serialNumber: cert.serialNumber,
        sha256: cert.sha256,
        validFrom: cert.validFrom,
        validTo: cert.validTo,
        role: cert.role,
        status,
        sourceUrl: url,
        sourceEntry: cert.sourceEntry,
        crossCheckReminder: `Verify this fingerprint independently against ${effectiveOrg}'s own published root/intermediate certificate before promoting to current/.`,
      })
    }
  }

  state.knownGaps = knownGaps
  state.lastRun = nowIso()
  saveState(countryDir, state)

  if (stagedSummary.length > 0) {
    writeFileSync(join(stagingDir, 'summary.json'), JSON.stringify(stagedSummary, null, 2) + '\n')
  }

  return {
    stagedCount: stagedSummary.length,
    knownGaps,
    stagingDir: stagedSummary.length > 0 ? stagingDir : null,
  }
}
