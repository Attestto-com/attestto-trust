/** PEM-encoded X.509 certificate strings for Italy's national eID PKI (CIE — Ministero dell'Interno). */

export declare const CIE_NATIONAL_ROOT_CA_2016: string
export declare const CIE_NATIONAL_ROOT_CA_2024: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
