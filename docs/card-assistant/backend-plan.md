# Backend-ready preparation and delivery plan

Status: architecture only. The static implementation runs on visits in an open browser and does not send messages. No Railway project, PostgreSQL service, Resend integration, account verification, secrets, paid API, AI art generation, DNS or unattended scheduler is activated here. Keep this system entirely separate from EV Revival: separate project, database, secrets, account/consent scope, workers, storage budgets, logs and sender identity. Do not reuse that application's recipients, billing or infrastructure.

## Authenticated data and ownership

Use a reviewed OIDC/PKCE or first-party authenticated session (TLS, strict origin CORS, CSRF protection for cookies). Every contact, preference, draft, approval, media reference, cancellation and outbox operation must be scoped to the authenticated owner. Validate issuer/audience/expiry; UUID secrecy is not authorization. Reject cross-owner references and unknown input fields. An account email must be verified before notifications or delivery scheduling can be enabled; verification does not imply consent.

Suggested PostgreSQL entities:

- Users and verified account addresses; notification timezone, preferred local preparation/notification time, separate service/marketing preferences and recorded consent evidence.
- Contacts/occasions with minimal name/nickname, optional relationship and start year, optional recipient email, date/recurrence, template/style/opening preferences, optional owner-written greeting and review preference. `preparation_enabled` and **separate per-contact `recipient_delivery_opt_in` default false**. Storing an address or enabling preparation never enables delivery.
- Preparation occurrences with a unique `(owner_id, occasion_id, occurrence_year)` constraint, immutable generation revisions, source/preference digest, algorithm/template version, state, latest validated configuration, timestamps and manual-edit marker.
- Preparation jobs with UTC due time, occurrence date, source revision, lease expiry, attempts, next attempt, failure category and cancellation/tombstone marker.
- Approvals bound to an exact immutable card revision, recipient address and delivery schedule. Any card/date/template/address/schedule change invalidates approval. Preserve manual edits; show a diff and require explicit regeneration/approval rather than replacing them in the background.
- Delivery outbox with unique occurrence/revision/delivery-kind key, deterministic provider idempotency key, lease, attempts and provider IDs; append-only minimal sanitized events (`queued`, `accepted`, `delivered`, `failed`, `cancelled`, `unknown`). Keep a manual "marked sent" record separate from provider delivery proof.

Store lightweight template/card configurations. Refer to a versioned static theme/art manifest. Do not render/store a new image for every annual card. Do not generate AI artwork. Future owned photo assets must be referenced by immutable owned media/variant IDs, reused across annual revisions, never duplicated automatically or embedded in fragments. Respect the separate photo upload, private storage, lifecycle and revocable token architecture before enabling any photo scheduling.

## Endpoints and approval boundaries

All `/v1/me` endpoints require ownership checks and bounded schemas. Use ETags/If-Match on edits and request-scoped idempotency keys for creates/imports. Return uniform 404s for missing and other-owner records.

- `GET/POST/PATCH/DELETE /v1/me/occasions`: validated contacts/preferences; deletion immediately suppresses preparation/delivery and cancels outstanding jobs before asynchronous data cleanup.
- `GET/PATCH /v1/me/assistant-settings`: confirmed IANA timezone, local due time, lead days, notification opt-in and bounded retention. Changes invalidate/recompute unsent jobs.
- `POST /v1/me/occasions/import`, `GET /v1/me/export`: explicit reviewed import/export, no implicit upload of local data on login; bounded batches and collision/replacement preview. Invalid imports are atomic failures.
- `GET /v1/me/prepared-cards`, `GET/PATCH/DELETE /v1/me/prepared-cards/{id}`: editable drafts with optimistic versions, fitting result and clear state. Delete creates a minimal occurrence cancellation marker so the next scheduler scan does not recreate it.
- `POST /v1/me/occasions/{id}/prepare`, `/prepared-cards/{id}/regenerate`: idempotent manual preparation/retry. Regeneration preserves old revision/history and invalidates approval; warn before replacing edited content.
- `POST /v1/me/prepared-cards/{id}/approve`: bind explicit owner action to the exact validated card revision and destination; default mandatory before delivery.
- `POST /v1/me/prepared-cards/{id}/schedule`, `DELETE /.../schedule`: enable/cancel delivery only for a verified account and explicitly opted-in contact. Account-wide preferences cannot silently turn on recipient delivery for everyone. An opt-out/suppression check is mandatory immediately before sending.
- Verification request/confirm endpoints, account-address change (pause sends/reverify), notification preference endpoints, authenticated account deletion and recipient service opt-out without login using scoped signed tokens.
- Resend webhook endpoint: raw-body signature/time validation, unique event IDs and replay protection; bounce/complaint suppress further delivery. No public client can supply a provider key or arbitrary sender/header/template.

## Due-date scheduling and duplicate prevention

Use Railway scheduled jobs or a continuously running worker with a bounded five-minute discovery cadence. Persist future `next_prepare_at` UTC timestamps, indexed by active state/due time, so the scheduler queries a small due window rather than scanning every user/contact or performing per-user queries. Use the owner's confirmed IANA timezone. Compute the occurrence on that local calendar, subtract seven calendar days by default (or the saved lead interval), then resolve the preferred local time to UTC with current tzdata. DST gaps resolve to the first valid following instant; overlaps choose one documented instant and one occurrence key. A timezone is not a fixed offset.

Calculate ages/anniversary years from the chosen occurrence year and a valid, explicitly supplied start year. Missing years never produce invented numbers. 29 February recurs only on actual Gregorian leap days, including century rules; do not silently move it. Never infer a birth date/year from a card sending date or one-time scheduled year. A one-time occasion expires after its fixed scheduled year.

Claim jobs using `FOR UPDATE SKIP LOCKED` with short leases and transactional insertion/upsert of the unique occurrence row. Recheck contact existence, deletion/disable/cancellation flags, source revision and current timezone before committing. Concurrent workers/retries must return/update the same occurrence, not produce duplicate cards. Use generation revisions for changed dates/preferences, with explicit preservation/review of user edits. Sent revisions remain immutable and must not be regenerated as a second automatic send for that occasion/year.

Queue transient failures with bounded exponential backoff/jitter (for example 1m/5m/30m/2h, max five attempts), lease recovery and a dead-letter state. Persistent invalid preferences/template failures require user review, not endless expensive retries. Apply a documented catch-up window (for example 12 hours after the intended notification time), record missed jobs and skip stale backlog when enabling the feature. Suppression/cancellation markers outlive the occurrence plus retention, so cleanup does not recreate a cancelled card.

## Draft notifications and real delivery

Draft-prepared emails go to the verified **account owner**, only after separate service-notification opt-in. Include an authenticated Open Draft action, not a public editor URL containing private text. Do not email the recipient merely because preparation completed. Templates remain deterministic and appropriate; do not invent memories, personal facts or relationships.

Recipient delivery requires validated syntax, explicit per-contact opt-in, current approval by default, no suppression, the precise current immutable revision and a confirmed due time. If the owner elects future no-review delivery, require a separate, conspicuous confirmation per contact with an auditable consent revision; the saved local review preference alone is not that consent. Start with approval mandatory for all production delivery until that no-review path is separately reviewed and tested.

An atomic outbox and deterministic Resend idempotency key cover retries/crashes between provider acceptance and local commit. Verify the provider's current deduplication retention window before implementation. Retry 429/5xx/timeouts with Retry-After and bounded backoff only while deduplication remains guaranteed. Ambiguous sends past that window need reconciliation or an unknown state, not a new key that risks duplicates. Permanent 4xx do not retry. Provider acceptance is not confirmed delivery. Suppress on bounces/complaints, unsubscribe or recipient opt-out, and cancel queued jobs immediately. A handed-off email cannot be recalled; disclose that small cancellation race.

Provide email verification without enumeration, single-use hashed expiring tokens, reauthentication for address changes/deletion, signed unsubscribe/opt-out tokens and scanner-safe GET confirmation/POST mutation. Keep service messages separate from promotional marketing. Never add tracking pixels or silently subscribe either person to marketing. Account/recipient opt-out must be effective without a login. No test or development run sends to real recipients.

## Cost, privacy, retention and operations

Bound contacts (initially 500/account), generation batches, notification frequency, daily delivery quotas (for example 50/account/day), per-IP/account endpoint rates, image bytes/pixels and global API/storage/egress spend. Track lightweight counts, queue latency, retry/dead-letter rates and lease expiry; alert and provide independent preparation and delivery kill switches. No automatic AI calls or artwork purchases. Batch theme/config reads, cache immutable template metadata and avoid storing annual raster duplicates.

Local retention is configurable (7/30/90/365 days) and runs while the app is open. Backend retention must run independently: remove old unused drafts/history on the documented schedule, keep only minimal cancellation/idempotency markers through their required window, immediately suppress deleted contacts and delete live personal data/media within 24 hours. Backups expire within at most 30 days unless separately reviewed; replay deletions before workers resume after restore. Keep sanitized operational/delivery logs briefly (for example 30 days); never log raw card text, complete dates of birth, email addresses, access tokens or private media. Define legal consent-evidence and suppression retention separately with a reviewed purpose; do not retain deleted profiles indefinitely as "audit" data.

## Explicit activation checklist

- [ ] Separate Silent Hello Railway project, database, identities and budgets; no EV Revival coupling.
- [ ] Authenticated ownership/IDOR tests and verified account email.
- [ ] Explicit local import consent, service notification opt-in and separate per-contact recipient-delivery opt-in.
- [ ] Deterministic generation and real renderer fit validation for every supported design.
- [ ] Unique occurrence keys, revisions, stale-edit preservation, approval invalidation and deletion/cancellation races tested.
- [ ] Fake-clock tests for timezone/DST/year boundaries, leap centuries, missing years, milestones and one-time expiry.
- [ ] Worker leases, duplicate concurrent claims, crash recovery, retry/dead-letter and missed-window policies tested.
- [ ] Resend sandbox tests for idempotency, ambiguous timeouts, opt-outs, cancellation, verified webhooks and failure logs; no real recipients during development.
- [ ] Secure Open Draft action, recipient address validation, immutable approved delivery revisions and manual-vs-provider-sent distinction.
- [ ] Retention/export/deletion, backup restore suppression, monitoring, rate limits, quotas and kill switches tested.
- [ ] Real mobile/desktop review, existing editor/photo/reminder/v1–v5/recipient regression suite green.
- [ ] Separate owner approval to deploy infrastructure, verify sender DNS, activate paid services and enable any unattended job/delivery. None of those actions is authorized by this static local demo.
