# Add secure hosted photo cards and private media delivery

Local photo cards could not travel to another device: their images existed only as browser blobs/IndexedDB drafts, and v1–v5 fragments intentionally cannot contain them. This adds an isolated FastAPI/PostgreSQL/private-R2 foundation and opt-in adapters for the existing creator and recipient.

## Implemented

- Operator-provisioned random owner keys, hashed server-side; no unrestricted signup/upload endpoint. Owner-scoped management, deletion and quotas; recipients need only the opaque share token.
- Streaming size/time caps, independent JPEG/PNG/WebP decode, animation/MIME/dimension checks, bounded credential-stripped subprocesses, fresh metadata-free WebP derivatives and private storage adapters.
- Immutable validated hosted envelopes containing the existing v5 card; idempotent publication, concurrency-safe owner/global quotas, per-minute/daily database rate limits and server-computed expiry. Message/style-only republication reuses the same owned photo.
- Token-scoped manifest/image reads, no public bucket URLs, exact CORS/security headers and no access logging. Failed/missing assets produce clear errors.
- Configurable 48-hour abandoned upload, seven-day unused generated image and 12-month free card policies. A provisional 24-month paid setting exists, but no paid entitlement/Stripe path is activated. Reference-aware deletion, bounded cleanup/backoff, orphan reconciliation and aggregate usage/cost reports.
- Explicit hosted publication in the existing share step; normal sharing methods use the prepared short link. Edits cannot silently share a stale publication. Fresh mobile/desktop recipients see the same envelope/book/message experience and attached photograph.

## Compatibility and limits

Base main `04b1349` includes merged PR #38. Legacy v1–v5 codecs, renderer, physical opening animations, photo editor/storage safeguards, drafts, occasions and assistant scheduling remain intact. A distinct hosted envelope `version: 1` wraps a validated v5 card; it is not a larger fragment schema. Existing static links make no backend request and work during an API outage. Assistant photo publication remains explicitly disabled.

Management is a controlled owner-key pilot, not account recovery/public sign-up. Hosted cards need the backend/photo to remain available. Source crop drafts remain local. Provider backup retention must be configured/verified separately; the conservative restore guard invalidates all restored hosted links/keys rather than resurrect deleted data. Selective disaster recovery is future work.

## Evidence

- All existing frontend suites executed; 48 Node tests pass including the new hosted checks.
- 26 backend tests pass on real local PostgreSQL; SQLite passes 25 and skips the PostgreSQL concurrency test.
- Real local FastAPI/PostgreSQL/filesystem browser integration passes with fresh 320/390/768/1440px recipient contexts, no owner credentials, immutable links, photo reuse, outage fallback, missing assets, deletion and physical cleanup.
- Docker image builds and its non-root bounded decoder passes with networking disabled. Runtime dependencies are pinned and dev tooling is excluded.
- R2 calls use MemoryStorage/botocore Stubber in tests. No live Railway/R2 deployment, bucket privacy/billing/backup validation is claimed. The test driver emits one Starlette/httpx deprecation warning.

![Hosted photo on mobile](https://raw.githubusercontent.com/xstajayx/digital_card/feat/secure-hosted-photo-cards/docs/hosted-cards/screenshots/inside-photo-390.png)
![Hosted photo and message on desktop](https://raw.githubusercontent.com/xstajayx/digital_card/feat/secure-hosted-photo-cards/docs/hosted-cards/screenshots/inside-message-1440.png)

[Actual commands/results](https://github.com/xstajayx/digital_card/blob/feat/secure-hosted-photo-cards/docs/hosted-cards/test-results.txt), [screenshots](https://github.com/xstajayx/digital_card/tree/feat/secure-hosted-photo-cards/docs/hosted-cards/screenshots), [API/local instructions](https://github.com/xstajayx/digital_card/blob/feat/secure-hosted-photo-cards/backend/README.md), [cost/retention/privacy operations](https://github.com/xstajayx/digital_card/blob/feat/secure-hosted-photo-cards/docs/hosted-cards/operations.md), and [approval/deployment checklist](https://github.com/xstajayx/digital_card/blob/feat/secure-hosted-photo-cards/docs/hosted-cards/deployment.md).

The illustrative pilot estimate is about £10.36/month using the documented configurable assumptions, suitable for a £10–£20 incremental target without a guaranteed cap. Validate actual provider prices/traffic and monitor thresholds before approval.

`HOSTED_API` is empty and uploads are off by default. No services, paid resources, DNS, payments, AI, email, merge or deployment are activated by this change.
