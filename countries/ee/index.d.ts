/** PEM-encoded X.509 certificate strings for Estonia's national eID PKI (RIA / SK ID Solutions / Zetes). */

export declare const EE_CERTIFICATION_CENTRE_ROOT_CA: string
export declare const EE_GOVCA2018: string
export declare const EEGOVCA2025: string
export declare const EID_SK_2016: string
export declare const ESTEID_SK_2015: string
export declare const ESTEID2018: string
export declare const ESTEID2025: string
export declare const KLASS3_SK_2016: string
export declare const SK_ID_SOLUTIONS_EID_Q_2021E: string
export declare const SK_ID_SOLUTIONS_EID_Q_2021R: string
export declare const SK_ID_SOLUTIONS_EID_Q_2024E: string
export declare const SK_ID_SOLUTIONS_EID_Q_2024R: string
export declare const SK_ID_SOLUTIONS_ORG_2021E: string
export declare const SK_ID_SOLUTIONS_ORG_2021R: string
export declare const SK_ID_SOLUTIONS_ROOT_G1E: string
export declare const SK_ID_SOLUTIONS_ROOT_G1R: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
