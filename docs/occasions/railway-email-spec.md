# Future email reminders: implementation specification

Status: architecture only. This branch contains no server, provider calls, API keys, email signup, automatic sends, Railway configuration or provisioned services. Implement and review this phase separately before offering email reminders. Service reminders must remain separate from promotional marketing.

## Deployment boundaries

A future Railway project would contain a FastAPI API, PostgreSQL database and a background scheduling/delivery worker built from the same versioned application image. Apply Alembic migrations as an explicit release step. A bounded scheduled task discovers due notifications; a worker consumes a durable PostgreSQL outbox. Neither the public static site nor request handlers send email directly. Railway and Resend credentials exist only as backend environment secrets. Use HTTPS, encrypted database connections/backups and separate least-privilege application/migration roles. Use structured monitoring with no email addresses, nicknames, access tokens, card text or provider bodies in application logs. No payment or paid infrastructure activation is part of this feature.

## Authentication and ownership

Use a reviewed OIDC provider with Authorization Code + PKCE and short-lived access tokens, or a secure first-party session behind an API gateway. Validate issuer, audience, expiry and signature server-side. Use exact CORS origins; cookie sessions additionally require Secure/HttpOnly/SameSite cookies and CSRF protection. No wildcard credentialed CORS. Every query and update is scoped to the authenticated subject; opaque UUIDs are not authorization. Return indistinguishable 404s for another user’s records. Email verification is mandatory even with an authenticated session; trust a provider’s verified-email claim only after configuring and checking its issuer and verification semantics.

A local list is never uploaded automatically on login. Provide a separate, explicit import preview showing exactly which nicknames and dates will be uploaded. Confirm import independently from enabling emails. Do not upload a local draft, card message, signature or share URL.

## Data model

- `users`: UUID, unique OIDC subject, encrypted/appropriately protected email, `email_verified_at`, `created_at`, `deleted_at`.
- `email_verifications`: user, token SHA-256 hash, expiry, consumed timestamp, attempt counters. Never persist raw tokens.
- `notification_preferences`: user, service-reminders opt-in boolean (default false), immutable opt-in evidence timestamp/source/policy version, IANA timezone, preferred local delivery time (default 09:00), preference revision, global suppression/unsubscribe state. Marketing consent uses a different resource/table and never follows from this flag.
- `occasions`: UUID, owner, nickname (1–80 Unicode characters, no control characters), kind (`birthday`/`anniversary`), month/day, annual flag, one-time occurrence year where applicable, reminder days (1/7/14), email-enabled flag (default false), revision, created/updated timestamps. Store no birth year, age, card message, recipient email or card link.
- `notification_outbox`: UUID, owner, occasion, occasion revision, preference revision, occurrence local date, local reminder date, scheduled UTC instant, status, attempt count, next attempt, claim lease expiry, provider idempotency key, provider message ID, accepted/delivered timestamps, sanitized error class. A unique constraint on `(occasion_id, occasion_revision, preference_revision, occurrence_local_date, notification_kind)` prevents duplicate jobs. Schedule changes atomically cancel superseded unsent jobs before creating replacements.
- `delivery_events`: minimal event ID, provider event ID (unique), outbox ID, normalized state (`accepted`, `delivered`, `bounced`, `complained`), timestamp and sanitized failure category. Provider acceptance is not a claim of delivery.

All mutation inputs use strict schemas and size limits. The server computes recurrence, UID, ownership, revision and due times; it does not trust client-supplied scheduling instants. Reject unknown fields such as card messages. Validate day/month against a leap year and one-time dates against their selected year. Maximum 500 active occasions per user.

## Endpoints

All `/v1/me/*` routes require authentication. Use `ETag`/`If-Match` for updates/deletes; return 412 on stale versions. Require `Idempotency-Key` on POST operations with bounded server-side replay storage; keys are scoped to subject + route and bound to the request hash.

| Method and path | Behavior |
| --- | --- |
| `GET /v1/me/occasions?cursor=…` | Paginated list, next occurrence and revision; no other users’ records. |
| `POST /v1/me/occasions` | Validate/store local fields; emails stay disabled until verified opt-in conditions hold. Return 201 + ETag. |
| `GET /v1/me/occasions/{id}` | Owner-only record + ETag. |
| `PATCH /v1/me/occasions/{id}` | Owner-only partial update with If-Match; atomically invalidate future jobs. |
| `DELETE /v1/me/occasions/{id}` | Delete record and cancel queued deliveries atomically; idempotent owner-scoped result. |
| `POST /v1/me/occasions/import` | Explicitly confirmed import, max 100 records/request; validate all or none, return duplicate decisions, never enable emails. |
| `GET /v1/me/notification-preferences` | Timezone, delivery time, verification and opt-in status. |
| `PATCH /v1/me/notification-preferences` | Explicit service opt-in/out, timezone/time; enabling requires a verified current email and recorded consent. |
| `POST /v1/me/email-verifications` | Rate-limited verification request for the account’s own address; generic result to prevent enumeration. |
| `POST /v1/email-verifications/confirm` | Single-use random token (at least 256 bits, 30-minute lifetime); consume atomically. Verification alone never opts in. |
| `POST /v1/me/email-change` | Reauthenticate; disable sends, verify new address, require explicit re-enable; do not silently carry opt-in across addresses. |
| `GET /v1/unsubscribe?token=…` | Render confirmation only; GET cannot unsubscribe because mail scanners prefetch links. No login required. |
| `POST /v1/unsubscribe` | Signed, purpose-bound unsubscribe token; idempotent suppression, cancel pending service reminders, no login. Support one-click List-Unsubscribe-Post where supported. |
| `GET /v1/me/export` | Authenticated export of owned reminder/preferences data. |
| `DELETE /v1/me` | Reauthenticate; immediately disable sends, revoke sessions/tokens, queue deletion and return deletion receipt. |
| `POST /v1/webhooks/resend` | Verify provider signature and timestamp on raw request body; reject replay/oversize bodies; unique provider event IDs deduplicate processing. No public client access to provider credentials. |

Do not place verification tokens in analytics URLs. Landing pages use no third-party assets and `Referrer-Policy: no-referrer`; scrub confirmation tokens from browser history after consumption. Validate redirects against an allowlist.

## Timezones, recurrence and scheduling

The static feature uses the device’s local date. The email phase must ask for and display an IANA timezone (for example Europe/London); a detected browser zone is merely a prefill that the user confirms. Do not use an ambiguous UTC offset. Store occasion dates as calendar dates, not UTC midnights.

For each next occurrence, subtract the selected 1/7/14 **calendar days in the user’s timezone**, then resolve the preferred local time to a UTC instant with an IANA-aware library. For a nonexistent DST wall time, use the first valid time after the gap. For an ambiguous time, use the earlier instant and keep one outbox key; never send twice. Keep tzdata current and recompute unsent jobs after timezone/time preference changes.

Annual dates recur on the specified day/month. A 29 February birthday recurs only in leap years, including the Gregorian century rule (2100 is not leap, 2000 is). Do not silently move it to February 28 or March 1. One-time occasions retain the explicitly selected occurrence year and expire afterward. They never roll forward when the user opens the application. The static application chooses the next valid occurrence when creating a new one-time record; a future import must preserve that chosen year.

Run a scheduler every five minutes. Lock a bounded set of due jobs with `FOR UPDATE SKIP LOCKED`, using UTC server time and persisted leases. Catch up only within a documented 12-hour window after the preferred reminder time; later jobs are marked missed, not delivered as stale reminders. When enabling emails after a due time, show the next eligible future reminder; do not immediately send a backlog. Build the next occurrence’s job after completion/expiry rather than adding 365 days. Backfill new eligible future jobs daily and after edits. A job is eligible only if the account is active, the current address is verified, global service opt-in is true, the occasion’s email flag is true, no suppression exists, and all stored revisions still match.

## Sending, idempotency and retries

Claim a job in a short database transaction. Immediately before sending, recheck current ownership, verification, consent, suppression, revisions and lateness. Persist a deterministic provider key from the outbox UUID; retry the same job with the same key. Do not hold a PostgreSQL transaction open during a network call. Store the provider message ID and acceptance state durably afterward; a crash between provider acceptance and commit must retry with the same idempotency key.

Use bounded exponential retry with jitter (for example 1m, 5m, 30m, 2h; maximum five attempts), respecting `Retry-After`, lateness deadlines and the provider’s documented idempotency retention window. Confirm that retention window against current Resend documentation before implementing. For ambiguous timeouts, retry only while deduplication is guaranteed; after the window, reconcile with provider records or mark the job unknown for review instead of risking a duplicate. Permanent 4xx failures do not retry. Rate limits, 5xx and network timeouts may retry. Worker leases allow recovery after a crash; every attempt is logged by job ID and sanitized category. Alert on stuck leases, rising unknown/missed counts and delivery errors.

Emails identify Silent Hello and the chosen service reminder, give a plain-text alternative, a card-shop link and an unsubscribe option. Escape nicknames in HTML and reject header controls. Do not email the recipient. Do not include the card message or a private card URL. No tracking pixels, unrelated offers or marketing copy. Verify a sender domain, configure SPF/DKIM/DMARC and test bounces in a separate future change; this PR does not alter DNS or activate Resend.

A verified bounce/complaint webhook suppresses further sends immediately. Unsubscribe is effective before any future send and cancels unsent outbox jobs. An already handed-off provider send cannot be recalled; disclose that small race if relevant. Resubscribing requires explicit authenticated action and current verification, never a click on an advertisement.

## Abuse limits and privacy/retention

Apply per-user and per-IP limits at the gateway and application: default 60 CRUD requests/minute/user, 10 writes/minute/user, 5 import requests/day/user, 3 verification emails/hour/address and 10/day/address with IP-level throttles. Start with at most 50 service reminders/day/account and a conservative global hourly send budget. Return 429 + Retry-After. Do not let clients choose arbitrary destination addresses for an occasion or arbitrary email templates. Require verified account ownership and explicit consent, audit abuse, and provide an operational global send kill switch. Store no IP address longer than required for rate limiting; hash/rotate identifiers if persistence is necessary.

Retain active occasion data until user deletion; clearly disclose this in the future privacy notice. Remove deleted occasions and unnecessary profile fields from live primary/replica stores within 24 hours. Pending jobs are cancelled immediately. Keep minimal pseudonymous delivery/error records for 30 days, then delete them. Verification tokens expire in 30 minutes and are purged within 24 hours. API idempotency records expire after 48 hours unless the send ambiguity policy requires a bounded longer reconciliation period. Operational backups expire within 30 days; replay deletions after any restore before sends resume. Maintain a minimal restricted suppression record/token hash where needed to honor unsubscribes, with a documented purpose and review schedule; do not retain a full deleted profile as a suppression mechanism. Require provider-side deletion/retention settings to match these commitments. Keep consent evidence only for a legally reviewed, explicitly disclosed period; do not invent an indefinite retention exception.

## Acceptance gates before activation

Verify authentication/IDOR isolation, opt-in defaults, verification/reverification, consent revocation, unsubscribe without login, account deletion, expired tokens, webhook replay protection, concurrent worker claims, the acceptance/commit crash case, retry deduplication, provider ambiguity, timezone/DST changes, leap centuries, annual and one-time dates, missed schedules and restore-time suppression. Use a fake clock and provider stub plus a provider sandbox. Do not enable production scheduling or automatic email delivery until these pass and a real authenticated backend, verified sender domain and verified user opt-in exist.
