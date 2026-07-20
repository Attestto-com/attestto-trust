# Spain — FNMT trust mirror

Independent mirror of the X.509 hierarchy that anchors Spain's national PKI, operated by **FNMT-RCM** (Fábrica Nacional de Moneda y Timbre - Real Casa de la Moneda).

Official source: <https://www.cert.fnmt.es/descargas/certificados-de-raiz>

## Hierarchy (2026-07)

```
AC RAIZ FNMT-RCM                                    ← root (FNMT-RCM)
└── AC FNMT Usuarios                                ← issuing CA (Ceres / User Certificates)
    └── (NIF-bound natural/legal person certs)
```

See [`current/manifest.json`](current/manifest.json) for SHA-256, subject, issuer, and validity for each file.

## Notes

- Certificates here are the official test CA roots and intermediates used for validating development, test, and compliance environments.
- Spain's national infrastructure supports electronic signatures through the Fábrica Nacional de Moneda y Timbre (FNMT), which acts as one of the main qualified trust service providers.
- The root certificate `AC RAIZ FNMT-RCM` expires **2030-01-01**, and the intermediate `AC FNMT Usuarios` expires **2029-10-28**.
