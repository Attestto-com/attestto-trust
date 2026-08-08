/** PEM-encoded X.509 certificate strings for Sweden's eIDAS qualified-trust PKI (PTS Trusted List). */

export interface CertEntry {
  name: string
  exportName: string
  pem: string
  sha256: string
}

export declare const ALL_CERTS: CertEntry[]
