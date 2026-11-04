# Deployment checklist — approval required before execution

No Railway service, database, bucket, DNS entry, paid plan or live secret is created by this branch. The code/default frontend remains disabled. This checklist is for a separately approved deployment.

## 1. Review readiness

- Review the security model, actual test evidence, privacy notice, pilot owner-key process and costs. Choose the operator/controller and rights-support contact.
- Accept the current limitations: no account/key recovery, no persistent source-image editing, no automatic assistant publication, no automatic email/payment/AI, and fail-closed backup restoration invalidating all hosted links/keys.
- Review pinned dependencies and vulnerability alerts; use Python 3.12/PostgreSQL 17 and a memory budget suitable for the capped subprocess decoder. Do not claim a complete kernel sandbox.
- Confirm this is a dedicated Silent Hello project, database, bucket and credentials, independent from EV Revival.

## 2. Configure private storage and database

- After explicit resource/budget approval, create the dedicated PostgreSQL database and private R2 bucket. Keep R2 public access, r2.dev and public custom domains disabled.
- Issue an R2 token restricted to this bucket with only required object read/write/delete and bucket-list permissions. No public ACL or account-management permission is required. The application never creates buckets.
- Choose approved processing regions, processor agreements, retention and transfer safeguards. Configure encrypted PostgreSQL backups with a verified maximum retention matching `SH_BACKUP_RETENTION_DAYS` (at most 30). Disable indefinite snapshots, unmanaged exports and R2 photo versions/backups.
- Use the private Railway database address; require provider-verified TLS for any public database connection. Never reuse EV Revival database credentials.
- Store credentials only as service environment secrets: `SH_DATABASE_URL`, `SH_R2_ACCESS_KEY`, `SH_R2_SECRET_KEY`, and a cryptographically random stable `SH_TOKEN_SECRET` of at least 48 characters. Do not print/copy secrets into issues, screenshots, GitHub Pages or logs. Keep the token secret recoverable in approved secret storage; accidental changes are rejected by the database fingerprint guard.
- Set `SH_ENVIRONMENT=production`, `SH_STORAGE_DRIVER=r2`, the exact HTTPS R2 account endpoint and bucket. Set the final GitHub Pages base URL including repository path in `SH_FRONTEND_URL`; `SH_CORS_ORIGINS` is the exact HTTPS origin without a path or wildcard.

## 3. Build and migrate

- Build from repository root with `backend/Dockerfile`. The runtime lockfile pins transitive dependencies; it excludes pytest/browser tooling. Use the non-root container and one Uvicorn worker, bounded connections/concurrency and no access logging. Do not mount local photo folders into the public static server.
- Keep `SH_UPLOADS_ENABLED=false` throughout setup. Apply `python -m backend.silent_hello.cli migrate` once as a controlled pre-start task; revision 1 uses a PostgreSQL transaction/advisory lock. Startup refuses an absent/incompatible schema.
- Start only in the approved environment. Check `/health`, private-bucket access and security headers. Do not trust arbitrary forwarded IP headers: default startup uses the immediate peer. Configure an explicit trusted proxy boundary only after verifying Railway's actual ingress/header behavior and any direct route.
- Configure provider/log settings to redact capability paths/query values and Authorization headers. Uvicorn access logs and SDK HTTP debug logging must stay off. No third-party analytics/tracking pixels belong on recipient pages.
- Set initial quotas/storage cap/daily budgets conservatively and configure the monitoring thresholds in [operations.md](operations.md). No external paid monitoring service is required by the code.

## 4. Verify against real staging services

The local automated tests do not replace these credentialed checks:

- Provision a single owner with the CLI; transmit the private key by an approved private channel. Verify invalid/unprovisioned keys cannot upload, list or delete.
- Upload real JPEG/PNG/WebP files. Inspect stored WebP dimensions and absence of EXIF/GPS/ICC. Verify large, animated, MIME-spoofed and invalid files fail without public objects.
- Confirm bucket/object URLs cannot be read anonymously and that listing is private. Confirm a share cannot request any other photo ID/key.
- Create a card; open its opaque link in a clean phone/browser and on desktop. Inspect envelope → front cover → inside message, attached photo, close/reopen, replay, touch/keyboard, reduced motion and readable complete-message access. Verify legacy v1–v5 links work with the API offline.
- Test retries, duplicate publication, quota/rate errors, missing assets, R2 outage, owner/card deletion, expiry, shared-asset references, and the uploads-off switch. Existing valid reads must continue when uploads are off.
- Run cleanup and inventory reconciliation; verify removed data really disappears and failed deletion jobs retry. Verify monthly usage/estimated cost reporting against provider counters.
- Exercise an isolated encrypted backup restore using the explicit restore-guard procedure before public traffic. Verify old/deleted capabilities do not reappear. Expire/destroy test backups within policy.

## 5. Enable deliberately

- Obtain the final approval for the reviewed services, budget, privacy/retention notices, live integration results and operating responsibilities.
- Set only the approved public API URL in `app/hosted-config.js` through the normal reviewed static-site release. It contains no key/secret. Do not take the API address from arbitrary query parameters or localStorage.
- Enable uploads server-side only after the exact CORS/frontend URL, quotas, backups, monitoring, owner provisioning and deletion tests pass. Start with a small controlled pilot, not open public registration.
- Existing static card links remain independent of the API. Roll back new uploads with `SH_UPLOADS_ENABLED=false`; valid hosted reads should stay available. Disabling/removing the frontend API URL also prevents hosted recipient resolution, so do not use that as a routine upload kill switch.
- Do not merge/deploy/change DNS or activate paid infrastructure automatically as part of this PR. No Stripe, Resend or AI activation is part of this release.
