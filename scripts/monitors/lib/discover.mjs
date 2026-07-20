/**
 * Low-level network primitives shared by every country adapter: HTTPS-only
 * page fetch with TLS fingerprint capture, cheap HEAD-based change checks,
 * and full downloads with a sha256 alongside.
 */
import { request } from 'node:https'
import { createHash } from 'node:crypto'

const USER_AGENT = 'attestto-trust-monitor/1.0 (+https://github.com/Attestto-com/attestto-trust)'

export function toHttps(url) {
  return url.replace(/^http:\/\//i, 'https://')
}

/**
 * Fetch a page over HTTPS and capture the server's leaf TLS cert
 * fingerprint (sha256, hex, no colons). Never falls back to plaintext —
 * this is the source page for trust anchors, so a downgrade is a hard
 * failure rather than a quiet retry.
 */
export function fetchPageWithFingerprint(pageUrl) {
  const httpsUrl = toHttps(pageUrl)
  return new Promise((resolve, reject) => {
    const req = request(httpsUrl, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        fetchPageWithFingerprint(new URL(res.headers.location, httpsUrl).toString())
          .then(resolve, reject)
        return
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume()
        reject(new Error(`GET ${httpsUrl} -> HTTP ${res.statusCode}`))
        return
      }
      const cert = res.socket.getPeerCertificate?.()
      const tlsFingerprintSha256 = cert?.fingerprint256
        ? cert.fingerprint256.replace(/:/g, '').toLowerCase()
        : null
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        resolve({ html: Buffer.concat(chunks).toString('utf-8'), tlsFingerprintSha256 })
      })
    })
    req.on('error', reject)
    req.end()
  })
}

/** HEAD a URL; returns header snapshot or null if the request fails. */
export async function headSource(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return null
    return {
      contentLength: res.headers.get('content-length'),
      lastModified: res.headers.get('last-modified'),
      etag: res.headers.get('etag'),
    }
  } catch {
    return null
  }
}

/** GET a URL fully. Returns { buffer, sha256, headers }; throws on failure. */
export async function downloadSource(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const sha256 = createHash('sha256').update(buffer).digest('hex')
  return {
    buffer,
    sha256,
    headers: {
      contentLength: res.headers.get('content-length'),
      lastModified: res.headers.get('last-modified'),
      etag: res.headers.get('etag'),
    },
  }
}
