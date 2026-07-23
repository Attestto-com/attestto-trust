/** PEM-encoded X.509 certificate strings for Peru's national PKI (IOFE / INDECOPI): RENIEC, ONPE, PCM/ECERNEP. */

export declare const ECEP_ONPE_CA_ROOT_5: string
export declare const ECEP_ONPE_ELECTORAL_CA_ROOT_5: string
export declare const ECEP_RENIEC: string
export declare const ECERNEP_PERU_CA_ROOT_3: string
export declare const ECERNEP_PERU_CA_ROOT_5: string
export declare const ECERNEP_PERU_CA_ROOT_6: string
export declare const RENIEC_CERTIFICATION_AUTHORITY: string
export declare const RENIEC_HIGH_GRADE_CERTIFICATION_AUTHORITY: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
