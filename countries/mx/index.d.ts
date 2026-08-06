/** PEM-encoded X.509 certificate strings for Mexico's national e.firma / CSD PKI (Banco de México IES/ARC root · SAT issuing CAs). */

export declare const AC_SAT_AC5: string
export declare const AC_SAT_AC6: string
export declare const AC_SAT_AC7: string
export declare const AGENCIA_REGISTRADORA_CENTRAL_ARC5: string
export declare const AGENCIA_REGISTRADORA_CENTRAL_ARC6: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
