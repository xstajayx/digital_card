# Expand the static card catalogue with curated art packs and folded previews

The shop had 28 designs and 23 occasions, with repeated cake/heart/bouquet artwork and no interest or relationship browsing. Add 63 curated designs, 39 reusable packs, 37 original vector scenes and five occasions, bringing the catalogue to **91 designs across 28 occasions**. Shared style recipes, occasion copy and pack assets compose designs without individual HTML pages or a build step.

- Add floral/gold/minimal, fishing, football, gaming, gardening, books, music, travel, pets, tea/coffee, beer/gin, baking, motoring, countryside, winter scenes and sympathy art. New categories: Belated Birthday, Christening, Retirement, New Home and Sympathy.
- Add featured collections and combined style/relationship/interest/mood filters. Rich thumbnails lead into actual envelope/front/inside quick previews and the existing simplified creator, with coordinated art/font/palette/envelope and recipient name off the cover by default.
- Keep every ordinary illustrated occasion static-sendable with compact local IDs. Preserve v1–v5 links, all original manifests and illustration aliases, folded opening flow, My Occasions/Prepared Cards and photo editing. Hosted photos remain separate and retain their existing backend allowlist. CNAME, DNS and Pages settings are unchanged.
- Reuse loaded stylesheets when switching packs sharing a layout, preventing stalled fit checks.

Validation: **54 Node tests passed**; all **12 existing Python regression scripts** plus the new static-only catalogue suite passed. Chromium covered mobile 360×800/390×844, tablet 768×1024 and desktop 1440×900 (existing suites cover additional sizes). The new suite blocks external/backend requests even with a configured unreachable API and confirms actual static-link sending and receiving, every added design/font/asset, filters, previews and age handling. No console errors or missing local assets. Backend: **25 passed, one PostgreSQL-only test skipped locally**; real local FastAPI/SQL/private-media browser integration passed. Existing PostgreSQL CI remains required. Syntax/whitespace checks passed.

Default new-card payloads measured 346–398 characters, referencing local art IDs. The 37 new vectors total 20,160 bytes. User-authored links remain subject to existing fit/size limits; no backend shortening service was introduced.

See [the audit](AUDIT.md), [content/static contract](README.md), [executed evidence and known limits](VALIDATION.md), and [screenshots](screenshots/). Mobile and desktop shop, folded previews and recipient examples are committed for review. Safari/Firefox and live Railway/R2 were not tested. A human editorial/artwork review and additional commissioned packs are recommended next.

Merge only after review and successful CI. The existing GitHub Pages deployment can publish the static files from main without settings or backend changes. Do not auto-merge or deploy.
