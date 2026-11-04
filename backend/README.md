# Silent Hello hosted-card backend

This service adds private photo delivery to the existing GitHub Pages frontend. It is separate from EV Revival and starts with uploads disabled. Nothing in this repository provisions Railway, R2, DNS, email, payments or AI.

## Local development

Use Linux/Python 3.12 (or the Linux Docker image) and a dedicated PostgreSQL 17 database. The decoder intentionally requires Unix resource limits. Keep environment files and local photos outside any publicly served directory.

```sh
python -m venv /tmp/silent-hello-venv
. /tmp/silent-hello-venv/bin/activate
pip install -r backend/requirements-test-lock.txt
cp backend/.env.example /tmp/silent-hello-backend.env
# Edit that PRIVATE file: database credentials, a random stable token secret,
# frontend origin/path and local storage directory. Do not source untrusted files.
set -a
. /tmp/silent-hello-backend.env
set +a
python -m backend.silent_hello.cli migrate
python -m backend.silent_hello.cli owner-create
# Store/distribute the returned private owner key securely; it is printed once.
uvicorn backend.silent_hello.asgi:app --host 127.0.0.1 --port 8000 --workers 1 --limit-concurrency 16 --no-access-log --no-proxy-headers
```

Run the static frontend separately (`python -m http.server 8765`). After explicitly enabling local uploads, set only the public `HOSTED_API` URL in `app/hosted-config.js` to `http://127.0.0.1:8000`. The committed value is empty. Local storage must be outside the HTTP server root. Never put an owner key or R2 credential into JavaScript.

In the creator, choose a photo card and prepare it normally. At Preview & send, enter the privately provisioned owner key, confirm link access and create a hosted link. Only the edited derivative uploads. Existing share methods then use that short link. Edits invalidate the cached link until you explicitly publish again. Message/style-only republication reuses the same owned photo while creating a new immutable card. My hosted cards lists/removes owned publications. The private owner key stays in memory unless you explicitly choose tab-only sessionStorage. Closing/clearing the tab can lose that convenience copy; there is no account/key recovery service.

This is a controlled, owner-key pilot foundation, not unrestricted public sign-up. Keys are random 256-bit management capabilities, hashed in PostgreSQL, and never delivered to recipients. Provision keys only after deciding who may use the service. Anyone obtaining an owner key can manage that owner's cards; rotate by deleting/revoking that owner and provisioning a new one. OIDC/account recovery is a separate future phase.

## Implemented API

| Endpoint | Access and behavior |
| --- | --- |
| `GET /health` | Database connectivity; no private data |
| `GET /v1/config` | Public upload availability/limits and free retention months |
| `POST /v1/me/media` | Owner bearer key; raw JPEG/PNG/WebP body; Idempotency-Key required |
| `POST /v1/me/cards` | Owner key; strict hosted envelope containing existing v5 card and owned ready photo; immutable publication |
| `GET /v1/me/cards` | Owner-only bounded list with share URLs/expiry |
| `GET /v1/me/usage` | Owner bytes/card quota usage |
| `DELETE /v1/me/cards/{id}` | Immediate revocation and text scrubbing; last-reference photo deletion queued |
| `DELETE /v1/me/media/{id}` | Owner-only; active card references prevent deletion |
| `DELETE /v1/me` | Revoke key and all links, scrub cards, queue owned photos and metadata removal |
| `GET /v1/shared/{token}` | Account-free, token-scoped immutable manifest; uniform unavailable/expired/revoked response |
| `GET /v1/shared/{token}/photo` | Only the image associated with that token; private WebP response, no bucket/key/presigned URL |

Idempotency keys are 16–80 URL-safe characters; use a fresh UUID for each intentional upload/publication and reuse it for retries. The same key with different content fails with 409. Concurrent identical publication returns one card. Removed/expired publication retries cannot resurrect it. Upload idempotency metadata expires after seven days; publication tombstones outlast the maximum configured card retention. Media may be reused across cards owned by the same key; cross-owner reuse is rejected.

Backend card validation independently checks actual shipped designs/art, opening settings, text limits (including JS UTF-16 parity), fonts, colours, ages, HTTPS gift links and photo placements. `catalogue.json` is a generated allowlist, checked against the frontend by `tests/hosted.mjs`. Update both in the same change when adding designs.

## Security and resource limits

Streaming byte caps and a configurable total body timeout apply even without Content-Length. No multipart filenames, object keys, owner IDs or remote import URLs are accepted. JPEG/PNG/WebP must match their actual decoded format; animations, corrupt files, excessive dimensions and decompression bombs are rejected. A spawned decoder has stripped environment credentials, CPU/address-space limits and a parent-enforced timeout. It writes a fresh optimised WebP without EXIF/GPS/ICC metadata. This is bounded process isolation, not a claim of a complete kernel sandbox; keep Pillow/system libraries patched and use the non-root container/memory limits.

At most two upload bodies and one decoder run per web process. PostgreSQL row locks serialize owner quota/publish/delete changes; atomic database counters share limits across processes. Global byte reservation occurs before storage writes. Pending rows track deterministic opaque object keys across write/commit crashes. Rate limits use a keyed IP hash, never arbitrary caller X-Forwarded-For. Default Docker startup disables proxy-header trust. Behind Railway this can conservatively rate-limit a whole proxy address; only configure explicit verified trusted proxies after validating direct-ingress/header behavior. Never trust `*` without proving the boundary.

Production requires PostgreSQL, HTTPS origins, a long random stable server secret and private R2 settings. SQLite and memory/local storage are test/development adapters only. Exact CORS, bearer-only management, no cookies, no-store/nosniff/no-referrer headers, token-scoped retrieval and disabled access logs protect the publication path. Share tokens are HMAC-SHA256 outputs over random card IDs with a server-only secret and domain separator; only their hashes are stored. The key fingerprint prevents accidental secret changes on restart. Secret rotation needs a reviewed migration/reissue plan; it is not an edit to a public config file.

No server logs contain card text, image bytes, owner keys, object keys or share paths. Keep SDK HTTP debug logging disabled and redact capability URLs in platform/proxy logs. Anyone with a share link can read it. Revocation cannot retract bytes/screenshots already received or a request already in flight.

## Storage lifecycle and costs

See [operations, costs and backup policy](../docs/hosted-cards/operations.md). Retention/quotas are server settings, not dates embedded in JavaScript. Defaults: abandoned/unattached uploads 48 hours, unused internally generated images seven days, free hosted cards 12 calendar months. Paid retention is a provisional 24-month setting; no paid entitlement/API/Stripe path exists, so every current card receives free retention.

Cleanup runs in the web process every 15 minutes, in small batches. It first scrubs expired/revoked card rows, then deletes only unreferenced assets. Failed deletes back off and retry with sanitized failure markers. A kill switch stops new uploads without affecting valid existing reads or static legacy cards.

```sh
python -m backend.silent_hello.cli cleanup
python -m backend.silent_hello.cli metrics
python -m backend.silent_hello.cli reconcile-objects
# Follow nextCursor in bounded inventory reconciliation, if returned:
python -m backend.silent_hello.cli reconcile-objects --cursor 'RETURNED_CURSOR'
```

Never run destructive cleanup against an unverified database/bucket. Reconciliation only inspects the `media/` namespace and removes unknown objects older than the configured abandonment window. Normal writes are recorded in PostgreSQL before R2 receives bytes.

## Tests

```sh
pip install -r backend/requirements-test-lock.txt
python -m pytest backend/tests -q
# Real disposable PostgreSQL (database name must end with _test):
SH_TEST_DATABASE_URL=postgresql+psycopg://.../silent_hello_test python -m pytest backend/tests -q
# Backend + browser integration; install existing requirements-dev.txt/Chromium too:
SH_BROWSER_DATABASE_URL=postgresql+psycopg://.../silent_hello_browser_test python -u tests/hosted.py
node tests/hosted.mjs
```

The test database schemas are deliberately dropped/recreated. Never use production URLs. Unit tests use MemoryStorage and botocore Stubber; the browser integration uses real local FastAPI/PostgreSQL and private filesystem storage across separate browser contexts. These are not live Railway/R2 tests. Actual executed results and screenshots are in [hosted-card delivery evidence](../docs/hosted-cards/README.md).
