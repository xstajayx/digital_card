# Hosted photo-card integration audit

Base: `04b1349`, merged PR #38; includes creator #38, assistant #37, local photos #36 and occasions #35. Branch: `feat/secure-hosted-photo-cards`.

The creator already validates JPEG/PNG/WebP bytes, crops/rotates/rasterises images and removes metadata. Edited photos are object URLs inside the actual folded-book nodes. IndexedDB stores the local source/edit draft, independently from illustrated localStorage drafts. None of these browser-local URLs or blobs can resolve on another device.

`assertPhotoShareable` intentionally rejects all photo transports. v1–v5 codecs carry only bounded text/design/configuration; putting photographs in those fragments is neither reliable nor private. The recipient currently decodes legacy links and sends validated card data to the existing renderer. There is no media ownership, durable upload, hosted lookup or lifecycle service.

## Integration contract before implementation

- Add a separate, opt-in API configuration. Unconfigured/offline static illustrated links must keep their existing path, without API requests.
- Owner management uses operator-provisioned high-entropy bearer capabilities, scoped and hashed server-side. There is no unrestricted registration/upload endpoint. No account/password recovery claim is made.
- Upload the already cropped derivative, then independently verify/decode/optimise it on the server. Keep originals/local crop drafts on-device. Associate only ready media owned by the publishing owner.
- Store a hosted envelope (`version: 1`) containing the validated existing v5 card and a bounded photo layout/media reference. Do not change v1–v5 codecs or silently reinterpret historical cards.
- Explicitly publish immutable hosted records with an idempotency key. Recipient URLs contain only an opaque token. Resolve that token and token-scoped photo bytes through the API, never a public bucket/key.
- Reuse the same physical book, envelope controls, paper styling and photo placement. Add a recipient media adapter, not an editor or recipient redesign. Include inside-photo navigation when a narrow iframe displays one page.
- Keep local drafts and assistant prepared-card approval gates separate. No annual photo duplication or automated publication.
- Deployment remains disabled until private R2, PostgreSQL, exact CORS, owner provisioning, quotas, cleanup and the documented acceptance checks are configured and reviewed.
