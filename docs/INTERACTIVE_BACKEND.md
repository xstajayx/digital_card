# Future Silent Hello service boundary — specification only

No service is deployed or exposed by this increment. Use a separate Silent Hello Railway project, never EV Revival credentials or services. Static cards and legacy links must continue working during service outages.

Minimum services: FastAPI worker/API; PostgreSQL with migrations for owners/cards/jobs/usage/delivery; private object storage for uploaded/generated media; background job worker for generation and scheduled email. Keep all provider credentials on the server through environment secrets. The public frontend must receive neither provider keys nor unrestricted upload permissions.

Proposed authenticated contracts:

- POST /api/ai/message: bounded occasion/tone/recipient-description input; editable text result. Validate lengths and moderation before provider calls.
- POST /api/ai/artwork: bounded prompt, style, aspect ratio and optional owned asset ID; returns 202 with opaque job ID. GET /api/jobs/{id} requires the same owner. Result contains owned asset references, never executable code.
- POST /api/ai/variations: owned source asset ID and bounded instructions. Photo-to-illustration additionally requires explicit recorded consent for identifiable photos. Reject unowned assets and unsupported MIME/content/dimensions/size; decode and re-encode raster images to strip metadata.
- POST /api/cards: validated future rich document and owned asset references; server creates an opaque, unguessable sharing token, stores a hash, and supports revocation/expiry/deletion. Public viewers access only the selected share document, not owner records.
- POST /api/delivery/email: owned card ID, verified sender context, recipient address and optional future schedule. Require entitlement, abuse controls, idempotency key and delivery audit. Verify provider webhooks before changing delivery state. Scheduled sends run in the worker, not browser timers.

Job responses: queued/running/succeeded/failed/cancelled; include a safe error code and retry guidance without prompts or private assets in logs. Enforce authenticated per-user rate limits, maximum concurrent jobs, budget ceilings, moderation, timeouts and cleanup. Reserve generation credits transactionally, settle on verified completion, and refund failed reservations idempotently. Paid credits require a separately approved server-side checkout/webhook implementation; no client entitlement flags.

Branded email is HTML/CSS with a static preview, sender label, clearly visible Open Your Card HTTPS button and complete fallback URL. Include meaningful alt text and a plain-text alternative. Escape names and content; allowlist the website origin. Do not embed JavaScript or expect card animation in an email client. Actual animation happens on the website after the link opens. Business identity, support/reporting route, consent and deletion policy require owner/legal review before launch.

Suggested server-only settings: DATABASE_URL, STORAGE_BUCKET, STORAGE_ENDPOINT, AI_PROVIDER_KEY, EMAIL_PROVIDER_KEY, PUBLIC_SITE_ORIGIN, MAX_GENERATION_COST, MAX_CONCURRENT_JOBS. These are future requirements, not requested credentials for this static release. Test authentication isolation, token entropy, content validation, cost accounting, retries, storage deletion and webhook signatures before exposing routes. Never automatically enable paid model calls or email delivery from this specification.
