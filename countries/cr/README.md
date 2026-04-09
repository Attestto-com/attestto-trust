# Costa Rica — Firma Digital trust mirror

Mirror of the X.509 hierarchy that anchors Costa Rica's national Firma Digital, operated by **MICITT** (root) and **BCCR/SINPE** (issuing CAs).

Official source (often broken): <https://www.firmadigital.go.cr/Repositorio/>

## Hierarchy (2026-04)

```
CA RAIZ NACIONAL - COSTA RICA v2                    ← root (MICITT)
├── CA POLITICA PERSONA FISICA - COSTA RICA v2      ← natural persons branch
│   └── CA SINPE - PERSONA FISICA v2                ← issuing CA
│       └── (cédula-bound natural-person certs)
└── CA POLITICA PERSONA JURIDICA - COSTA RICA v2    ← legal persons branch
    └── CA SINPE - PERSONA JURIDICA v2              ← issuing CA
        └── BANCO CENTRAL DE COSTA RICA (AGENTE ELECTRONICO)
            └── (legal-person certs)
```

See [`current/manifest.json`](current/manifest.json) for SHA-256, subject, issuer, and validity for each file.

## Notes

- The official MICITT/BCCR repository serves the JURIDICA branch but **404s** the PERSONA FÍSICA `.crt` URLs at the time of writing — that's the gap this mirror fills.
- Certificates here were extracted from real signed PDFs using `scripts/extract-chain-from-pdf.mjs` (PAdES sigs embed the full chain).
- The root and both policy CAs expire **2031-02-25**. The SINPE issuing CAs and the BCCR Agente Electrónico cert rotate more frequently — when they do, follow the [Updating](../../README.md#updating-an-existing-country) flow in the top-level README.
