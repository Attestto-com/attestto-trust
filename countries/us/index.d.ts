/** PEM-encoded X.509 certificate strings for the US Federal PKI (FCPCA G2 + Federal Bridge / SSP intermediates). */

export declare const CERTIFICATION_AUTHORITIES: string
export declare const CERTIFICATION_AUTHORITIES_34E433CD: string
export declare const CERTIFICATION_AUTHORITIES_91272DA1: string
export declare const CONFIGURATION: string
export declare const DEPARTMENT_OF_THE_TREASURY: string
export declare const DIGICERT_FEDERAL_SSP_INTERMEDIATE_CA_G5: string
export declare const DIGICERT_FEDERAL_SSP_INTERMEDIATE_CA_G6: string
export declare const ENTRUST_MANAGED_PKI_FEDERAL_ROOT_CA_G2: string
export declare const FEDERAL_BRIDGE_CA_G4: string
export declare const FEDERAL_COMMON_POLICY_CA_G2: string
export declare const WIDEPOINT_ORC_SSP_5: string
export declare const WIDEPOINT_SSP_INTERMEDIATE_CA: string
export declare const WIDEPOINT_SSP_INTERMEDIATE_CA_2: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
