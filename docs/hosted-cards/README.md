# Secure hosted photo-card foundation

This branch adds a separately deployable FastAPI/PostgreSQL/private-R2 backend and a small opt-in adapter for the existing creator and recipient. No infrastructure is deployed, paid resource created, DNS changed or email/AI/payment activated. `HOSTED_API` is empty and uploads are disabled by default.

A provisioned sender can explicitly upload a cropped derivative and publish an immutable card. The API independently validates/rasterises the photo, strips metadata, checks ownership/quotas and returns an opaque short URL. A recipient with that URL needs no account. The photograph attaches to the existing physical card, with the same envelope, front cover, inside pages and replay. Old v1–v5 links keep their static decoder and never need a backend request.

Hosted documents wrap the existing validated v5 card in `version: 1` plus owned photo/layout metadata. No image, owner key or message is placed in the short URL. The legacy codecs, renderer, opening engines, local drafts, reminder data and assistant scheduling are not replaced. Photo drafts remain local; hosted publication is explicit and never an automatic annual assistant action.

Management uses privately provisioned high-entropy owner keys for a controlled pilot. There is no unrestricted signup/upload endpoint or claimed account recovery. Anyone with a share link can read it until expiry/deletion. The server holds all R2 credentials; recipients receive only token-scoped WebP responses. Private keys are never included in recipient requests.

Implemented protections include strict file/content/dimension/body limits, bounded credential-stripped decoder subprocesses, private storage adapters, owner/reference checks, opaque capabilities, CORS/security headers, database rate/byte/daily quotas, idempotent publication, immediate revocation, configurable lifecycle cleanup/retry, orphan reconciliation and aggregate cost reports. No Redis or additional worker service is required.

Retention defaults are 48 hours for abandoned/unattached uploads, seven days for unused generated derivatives, 12 calendar months for free hosted cards and a reserved 24-month paid policy. Paid publication is not implemented. Reference-aware deletion preserves assets still used by another card. Backup retention is a declared maximum of 30 days that the operator must enforce in the provider. This release's conservative restore guard invalidates all restored hosted links/keys rather than risk resurrecting deleted data; selective recovery is a future phase.

## Review and run

- [Audit and integration contract](audit.md)
- [Hosted API contract](api.md)
- [Backend/API/local development](../../backend/README.md)
- [Retention, costs, monitoring and GDPR-related handling](operations.md)
- [Step-by-step deployment checklist](deployment.md)
- [Actual executed test results](test-results.txt)
- [Screenshots](screenshots/)
- [Prepared PR description](PR.md)

## Remaining limitations

There are no live Railway/R2 credentials in this environment, so provider configuration, public-access denial, real billing, backup retention and real-device app handoff require the staging checks before production approval. Local integration uses real FastAPI/PostgreSQL plus private filesystem storage; R2 protocol tests use a botocore Stubber, not a real bucket. The subprocess bounds are not a full OS security sandbox. Keep dependencies patched and container limits enforced.

Owner keys are bearer management credentials. Lose one and support/operator verification is needed; expose one and its owner must be revoked/reprovisioned. Hosted cards are immutable; publish edits as a new link and remove the old publication. Browser-local source drafts are still needed for future crop editing. Unattended notifications, account sign-in, selective backup restoration and paid entitlements remain separate work. Static legacy cards survive API outages, but hosted cards necessarily require a reachable service and retained photo.
