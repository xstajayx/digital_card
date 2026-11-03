# Future persistent photo-card delivery

Status: design only. No server, bucket, API key, Railway service or public photo share is activated by this branch. Current photo cards are local previews; v1–v5 links cannot carry them. Do not remove the sender share gate until the complete path below works and its recipient implementation is reviewed separately.

## Deployment and ownership

Use Railway FastAPI for authenticated card/media operations, PostgreSQL for ownership, manifests, revisions and hashed sharing tokens, and private S3-compatible object storage for raster originals/derivatives. Do not store image base64 in JSON, fragments, localStorage or PostgreSQL rows. Keep all storage credentials, signing keys and provider secrets in backend environment bindings. Public JavaScript receives only authenticated API responses and short-lived, narrowly scoped capabilities. No bucket is public.

Use a reviewed OIDC/PKCE or secure same-origin session implementation. Validate issuer/audience/expiry and CSRF for cookie sessions. Scope every card, media and job query to the authenticated subject. A random media UUID is not authorization. Accept no client-supplied owner ID, arbitrary storage key, arbitrary image URL or remote image import. Keep occasions and reminder email consent separate: creating a photo card does not subscribe anyone to email or marketing.

## Proposed v6 manifest (not accepted by the current codecs)

```json
{
  "v": 6,
  "kind": "photo-memory",
  "themeId": "birthday-balloons",
  "to": "Maya",
  "message": "Your personal words",
  "from": "Alex",
  "openingConfig": { "type": "envelope", "tone": "blush", "wrap": "plain", "seal": true, "effect": "theme" },
  "physicalConfig": { "paper": "ivory", "coverGreeting": "A little birthday joy", "coverArt": "", "insideArt": "", "handwriting": "pacifico", "signature": "pacifico", "effects": false },
  "photo": {
    "mediaId": "server-owned-opaque-uuid",
    "variantId": "server-generated-card-derivative",
    "placement": "inside-left",
    "frame": "paper",
    "aspect": "portrait",
    "alt": "A favourite memory"
  }
}
```

This is a shape example, not a copy/paste replacement for all schema validators. The implementation must retain the complete existing bounded font, palette, message, gift and art fields and validate opening configuration against actual server enums. `kind` supports illustrated, photo-cover and photo-memory. A photo-cover cannot claim an inside-left placement. Media references must resolve to ready, owned raster variants; strip unknown properties and reject data/blob/http URLs. Crop geometry can be retained privately as bounded owner edit metadata, but recipients should receive an immutable rendered derivative matching the reviewed card layout. Do not rely on the recipient to download a large source and crop it.

Legacy v1–v5 fragment/query links continue through the current static decoder. A v6 persistent share is a distinct opaque capability, not a bigger fragment payload. Local IndexedDB draft version 1 is not a v6 share or an upload authorization.

## Suggested endpoints and upload lifecycle

| Endpoint | Contract |
| --- | --- |
| `POST /v1/me/media` | Authenticated, rate-limited multipart upload with a streaming byte cap. Allocate a quarantine media ID scoped to the owner. Return processing status, not a public URL. |
| `GET /v1/me/media/{id}` | Owner-only processing status, dimensions and permitted derivative IDs. |
| `DELETE /v1/me/media/{id}` | Owner-only removal; handle referenced cards explicitly, cancel jobs, delete source/derivatives according to lifecycle. |
| `POST /v1/me/cards` | Validate complete v6 manifest and owned ready media; create a private draft. Require idempotency key. |
| `GET/PATCH/DELETE /v1/me/cards/{id}` | Owner-only CRUD with revision/ETag and If-Match updates. No cross-user references. |
| `POST /v1/me/cards/{id}/shares` | Explicit Publish action; freeze a validated card revision and ready variants, return a new opaque URL. Idempotent request key, not inferred consent from local preview. |
| `DELETE /v1/me/cards/{id}/shares/{shareId}` | Revoke token, stop future retrieval and invalidate relevant caches. |
| `GET /v1/shared-cards/{token}` | Token-scoped read-only manifest for the frozen revision; no owner profile/source image/edit metadata. Unknown, expired and revoked shares return uniform errors. |
| `GET /v1/shared-cards/{token}/media/{variantId}` | Confirm that the exact variant belongs to that share; stream it or issue a short-lived read capability. Never accept an arbitrary storage key. |

For large uploads, a future signed PUT flow may use staging-only keys, exact size/type conditions and very short expiry, followed by authenticated completion. A signed PUT does not make a file trusted. Never issue a recipient URL before server validation succeeds.

The server must independently sniff signatures, parse dimensions before allocating decoded images, enforce byte/pixel/edge limits, reject SVG/GIF/animated WebP/APNG and malformed containers, decode in a sandboxed worker with memory/time budgets, remove EXIF/GPS and other unnecessary metadata, correct orientation and generate bounded sRGB raster derivatives. Client processing is a convenience and privacy measure, never a server security boundary. Quarantine failures and remove abandoned staging objects. Generate exact aspect variants; keep greetings/message zones outside image bounds. Deduplicate only within an owner scope to avoid cross-account presence leaks. Keep object keys opaque and prevent public ACLs.

## Private retrieval and tokens

Generate at least 256 bits of cryptographic entropy per sharing token and store only its hash. Tokens are bearer access: anyone with the link can read that card until expiry/revocation. Explain this before publication. Never log raw token paths, photo bytes or card text. Disable third-party analytics/pixels and use `Referrer-Policy: no-referrer`. Configure TLS, exact CORS origins, MIME allowlists, `X-Content-Type-Options: nosniff`, CSP and private cache headers. Manifests should not be globally cached. Private signed media URLs must expire quickly and cannot expose sources or list buckets; document the short revocation window of already issued URLs. No social crawler access to private text/photos by default.

A static recipient can later resolve an opaque token via the API, validate a v6 manifest, resolve only approved variant references and pass that data through an explicitly reviewed media adapter. Keep all existing opening controllers and book nodes. Ship that recipient integration separately with authorization tests; this PR intentionally does not alter recipient rendering.

## Storage, quotas and operational requirements

PostgreSQL tables should include users/subjects, owned media, processing jobs/leases, variants, private cards/revisions, share token hashes and deletion jobs. Use foreign keys, owner checks and transactional publication so a share cannot point to incomplete media. Workers need idempotent derivative keys/jobs, bounded retry/backoff and a dead-letter state. A failed/retried publish must not mint duplicate billable uploads or unexpected public shares.

Before activation choose and display conservative per-user byte, active-card and upload-rate quotas, plus per-IP/token retrieval budgets. Start with the local byte/pixel limits or stricter ones; never allow decompression bombs simply because transport bytes are small. Apply global storage/egress budgets and a kill switch. Verify authorization, request/body limits, rate limiting, decoder sandboxing, object lifecycle and costs before enabling production. Do not configure a paid service or DNS as part of this phase.

Delete abandoned quarantine uploads within 24 hours and unattached ready media within a documented short period (for example seven days). Explicit deletion/revocation suppresses access immediately; remove live objects/variants and private data within 24 hours, with bounded retries and failure alerts. Set backup expiry (no more than 30 days unless separately reviewed), provider retention, deletion replay after restore and minimal sanitized operational log retention. Do not retain photos as indefinite "audit" records. Offer authenticated export/deletion and explain local browser drafts are separately controlled by the user.

## Recommended next phase and acceptance gate

1. Implement authenticated ownership, quarantine upload and hardened image worker with private variants and lifecycle/quotas.
2. Implement immutable card revisions, opaque/revocable tokens and private retrieval; test IDOR, token guessing, expiry, cross-owner media, malicious images, retry/crash races, orphan cleanup and deletion.
3. Add a separately reviewed v6 recipient adapter, retaining the exact current envelope/book opening sequence, accessible reading, touch/keyboard and reduced motion; regress all v1–v5 links.
4. Test real mobile upload/retrieval, stale/missing variants, cache/revocation races, text fitting and costs in a nonproduction environment. Only then enable photo publication and replace the local-only notice. No automatic email or marketing is implied by any of these actions.
