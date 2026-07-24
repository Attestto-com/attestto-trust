/** PEM-encoded X.509 certificate strings for Chile's State PKI (Autoridad Certificadora del Estado de Chile — 2 roots + per-organismo CAs). */

export interface CertEntry {
  name: string
  exportName: string
  pem: string
  sha256: string
}

export declare const ALL_CERTS: CertEntry[]

/** Look up a certificate by its SHA-256 fingerprint (hex). */
export declare function getBySha256(hex: string): CertEntry | null
