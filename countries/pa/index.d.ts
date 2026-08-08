/** PEM-encoded X.509 certificate strings for Panama's national PKI (DNFE — Registro Público de Panamá). */

export declare const AUTORIDAD_CERTIFICADORA_DE_PANAMA: string
export declare const CA_DE_GOBIERNO_DE_PANAMA: string
export declare const CA_PANAMA_CLASE_2: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
