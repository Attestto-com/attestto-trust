/** PEM-encoded X.509 certificate strings for Brazil's national PKI (ICP-Brasil). */

export declare const AC_RAIZ_ICP_BRASIL_V5: string
export declare const AC_RAIZ_ICP_BRASIL_V10: string
export declare const AC_RAIZ_ICP_BRASIL_V11: string
export declare const AC_RAIZ_ICP_BRASIL_V12: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
