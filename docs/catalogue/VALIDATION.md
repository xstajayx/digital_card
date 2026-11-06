# Executed validation

Base: `origin/main` at `58193ce`. Feature branch: `feat/static-art-catalogue`.

## Final outcomes

- **54 Node tests passed**, no failures/skips: existing data (17), occasions (9), photo (5), assistant (11), creator (3), hosted (3), and new catalogue (6).
- **All 12 existing Python regression scripts passed**: browser, shop, interactive, physical, responsive, recipient, calendar_ics, occasions, photo, assistant, creator and hosted.
- **New catalogue browser suite passed** at 360×800, 390×844, 768×1024 and 1440×900. It loads all 91 thumbnails, filters by style/relationship/interest/tone/occasion/collection, opens all three folded-preview stages, switches designs rapidly, creates/copies an actual v5 link, and opens a fresh recipient's envelope → cover → message journey. Every one of the 63 new covers is rendered, fitted with its loaded font and decoded illustration at each size. Milestone ordinals and empty cover names are checked.
- **Static/backend isolation passed** with a deliberately configured, unreachable hosted API. Every non-local request is blocked and recorded. Ordinary illustrated cards still create/share/open with **zero external/backend requests**, missing local assets, or console/page errors.
- Existing interactive checks now exercise **91 designs × three opening choices**, at four viewport sizes. Existing creator and physical checks also exercise all 91 designs. Other existing checks retain their original legacy fixtures, text/colour/font/geometry/XSS/old-link assertions and photo behavior.
- Hosted integration used a real local FastAPI service, SQL database and private filesystem adapter. Explicit consent/upload, link lifecycle, fresh recipients at 320/390/768/1440px, stale-edit gates, ownership, cleanup and backend-outage fallback passed. This is not a live Railway/R2 test.
- Backend unit suite: **25 passed, one skipped**. The skipped concurrency test requires PostgreSQL row locks; this machine used SQLite. Existing CI retains its PostgreSQL service and that check is required before merging. The R2 adapter test uses `Stubber`, not real cloud storage.
- Syntax checks passed for 44 application/engine/content modules. `git diff --check` passed. CNAME, codec/physical schemas, original manifests, backend policy/data, calendar/prepared/photo storage and hosted endpoint configuration have no changes.

## Commands

```sh
node tests/data.mjs
node tests/occasions.mjs
node tests/photo.mjs
node tests/assistant.mjs
node tests/creator.mjs
node tests/hosted.mjs
node tests/catalogue.mjs
```

Using the repository's pinned test dependencies installed outside the checkout, each of these ran with `PYTHONPATH=/tmp/catalogue-test-deps`:

```sh
python3 -u tests/browser.py
python3 -u tests/shop.py
python3 -u tests/interactive.py
python3 -u tests/physical.py
python3 -u tests/responsive.py
python3 -u tests/recipient.py
python3 -u tests/calendar_ics.py
python3 -u tests/occasions.py
python3 -u tests/photo.py
python3 -u tests/assistant.py
python3 -u tests/creator.py
python3 -u tests/hosted.py
python3 -u tests/catalogue.py
python3 -m pytest backend/tests -q
```

For the final backend command, an isolated `AWS_CONFIG_FILE` supplied a region for the inherited profile, retaining the environment's AWS profile guard. No credentials were read or added; the existing stub test supplies fake keys. This corrected an environment failure in the first run (24 passed, one failed, one skipped). The successful rerun was 25 passed/one skipped, with an existing Starlette test-client deprecation warning.

## Investigated intermediate failures

- A new UI test tried design selection from the cover-editing step. Corrected it to use the simplified creator's existing first-step picker; no UX restructuring was needed.
- Switching packs sharing a stylesheet could wait forever for a load event on an unchanged URL. The renderer now reuses an already-loaded sheet. The new suite has per-design fit timeouts. An earlier interactive run using cached pre-fix code was stopped, then rerun successfully.
- The interactive regression's old 28×3 count (84) correctly failed after expansion. Updated it to 91×3 (273), preserving all behavior checks. Other count-only assertions now expect 28 occasions/91 total designs.
- Shared style recipes were factored out of packs. A deep equality check verified all pack properties were identical before/after; catalogue data tests then passed again.

## Measured content size

- 37 new SVG scenes: **20,160 bytes total**; each below 7 KiB.
- Four content modules: **63,514 bytes total** (before HTTP compression), reusing existing local fonts and layout CSS.
- Default v5 fragment payloads for the new cards: **346–398 characters** with synthetic sender/recipient text. User-authored links vary and retain the existing 12,000-character ceiling and fit validation; no tiny/unique URL service is claimed.
- The grid is built once, thumbnails are lazy, images have dimensions, and filtering only updates visibility. No horizontal overflow was observed in the exercised mobile/tablet/desktop cases. These are local functional observations, not a production Lighthouse/network benchmark.

## Captured and visually inspected

- [Mobile shop](screenshots/shop-390.png)
- [Desktop shop](screenshots/shop-1440.png)
- [Mobile folded preview](screenshots/quick-preview-390.png)
- [Desktop folded preview](screenshots/quick-preview-1440.png)
- [Mobile recipient cover](screenshots/recipient-cover-390.png)
- [Desktop recipient inside](screenshots/recipient-inside-1440.png)

Additional 360px/tablet captures and raw command logs remain in `/workspace/onboarding/catalogue/` in this task's workspace. Sharing destinations were intercepted; no real email, SMS or WhatsApp message was sent.

## Limits

Chromium was executed; Safari, Firefox, physical-device readers and production custom-domain behavior were not tested. No live Railway/R2 calls, PostgreSQL locking test, Docker image rebuild, production merge or deployment was performed. New designs are static illustrations; their hosted-photo publication is deliberately not added to the independent backend allowlist. The six screenshots above and a focused human editorial review should be part of PR review.
