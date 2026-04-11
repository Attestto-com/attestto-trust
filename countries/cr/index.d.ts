/** PEM-encoded X.509 certificate strings for Costa Rica's national PKI. */

export declare const BANCO_CENTRAL_DE_COSTA_RICA_AGENTE_ELECTRONICO: string
export declare const CA_POLITICA_PERSONA_FISICA_COSTA_RICA_V2: string
export declare const CA_POLITICA_PERSONA_JURIDICA_COSTA_RICA_V2: string
export declare const CA_RAIZ_NACIONAL_COSTA_RICA_V2: string
export declare const CA_SINPE_PERSONA_FISICA_V2_2023: string
export declare const CA_SINPE_PERSONA_FISICA_V2: string
export declare const CA_SINPE_PERSONA_JURIDICA_V2: string

export interface CertEntry {
  name: string
  exportName: string
  pem: string
}

export declare const ALL_CERTS: CertEntry[]
