/** PEM-encoded X.509 certificate strings for Greece's eIDAS qualified-trust PKI (EETT Trusted List). */

export interface CertEntry {
  name: string
  exportName: string
  pem: string
  sha256: string
}

export declare const ALL_CERTS: CertEntry[]

/** Look up a certificate by its SHA-256 fingerprint (hex). */
export declare function getBySha256(hex: string): CertEntry | null
