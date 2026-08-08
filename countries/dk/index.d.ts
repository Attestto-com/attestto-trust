/** PEM-encoded X.509 certificate strings for Denmark's eIDAS qualified-trust PKI (Digitaliseringsstyrelsen Trusted List). */

export interface CertEntry {
  name: string
  exportName: string
  pem: string
  sha256: string
}

export declare const ALL_CERTS: CertEntry[]
