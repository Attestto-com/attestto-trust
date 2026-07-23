/** PEM-encoded X.509 certificate strings for Latvia's eIDAS qualified-trust PKI (DDUK Trusted List). */

export interface CertEntry {
  name: string
  exportName: string
  pem: string
  sha256: string
}

export declare const ALL_CERTS: CertEntry[]
