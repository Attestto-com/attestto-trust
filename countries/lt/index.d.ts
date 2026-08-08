/** PEM-encoded X.509 certificate strings for Lithuania's eIDAS qualified-trust PKI (RRT Trusted List). */

export interface CertEntry {
  name: string
  exportName: string
  pem: string
  sha256: string
}

export declare const ALL_CERTS: CertEntry[]
