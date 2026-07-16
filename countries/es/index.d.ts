/** PEM-encoded X.509 certificate strings for Spain's national PKI (FNMT). */

export declare const AC_RAIZ_FNMT_RCM: string
export declare const AC_FNMT_Usuarios: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
