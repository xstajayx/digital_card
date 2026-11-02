The creator rebuilt its pickers and replayed the card animation on every edit, while several illustration IDs showed the wrong object. This change adds a guided mobile/desktop studio, 23 occasions and 26 designs, coordinated local artwork, stable batched rendering and measured typography with explicit overflow feedback. Creator and recipient use the same proportional layout.

Sharing now supports native share, copy and WhatsApp with duplicate prevention and fallbacks. Compact, bounded v3 fragment payloads preserve Unicode and optional personalisation; existing v1/v2 links and all legacy theme/artwork IDs remain supported. Production Pages settings and `main` are untouched by this feature branch.

Validation: 12 data/codec/security tests and 24 browser check groups passed at 360×800, 390×844, 768×1024 and 1440×900. No JavaScript errors or missing local assets. Module syntax, SVG XML, formatting and whitespace checks passed. Audit, exact validation details, screenshots, limitations and merge/deployment instructions are in `AUDIT.md` and `docs/VALIDATION.md`.

Physical Android/iOS sharing and non-Chromium browsers still need manual checking; native/WhatsApp transports are intercepted by tests. No production deployment is included. Merge after review and keep the existing GitHub Pages branch/root configuration.
