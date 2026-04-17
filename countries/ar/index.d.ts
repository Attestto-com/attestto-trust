/** PEM-encoded X.509 certificate strings for Argentina's national PKI. */

export declare const AC_RAIZ_REPUBLICA_ARGENTINA: string
export declare const AUTORIDAD_CERTIFICANTE_FIRMA_DIGITAL: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
