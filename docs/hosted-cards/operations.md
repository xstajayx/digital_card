# Operations, retention and cost controls

## Policy

All retention settings live on the server. Free expiry uses calendar-month addition, including leap-day clamping. The API returns the exact expiry timestamp and the frontend displays it. No indefinite storage is offered.

| Data | Default | Enforcement |
| --- | --- | --- |
| Pending/abandoned/unattached uploads | 48 hours | `SH_ABANDONED_HOURS`; cleanup of tracked objects |
| Unused generated derivatives | 7 days | `SH_GENERATED_DAYS`; internal classification, no AI generator is activated |
| Free published photo cards | 12 calendar months | `SH_FREE_MONTHS`; reads refuse at expiry, cleanup scrubs text/assets |
| Future paid cards | 24 calendar months | `SH_PAID_MONTHS` reserved for future server-owned entitlements; not selectable by today's clients |
| Backups | At most 30 days | `SH_BACKUP_RETENTION_DAYS` declares the cap; operator must configure/verify PostgreSQL provider retention to match |
| Rate-limit IP hashes/counters | Short windows | Expired counters are removed in bounded batches |
| Upload idempotency tombstones | 7 days | No message/photo content, bounded daily creation quotas |
| Card idempotency tombstones | Longest card policy plus grace | Prevent retry resurrection; contain resource IDs/fingerprints, not text/photos/tokens |
| Aggregate monthly cost counters | About 400 days | No owner/card identities; used for estimated usage reports |

Shared assets survive deletion of one card while another card still references them. Removing the last live card queues the image immediately. Owner deletion revokes all capabilities and scrubs live text immediately; healthy-service object cleanup normally runs within the next 15-minute batch. Provider failures can delay physical deletion; failures back off and must be monitored. Do not promise a deletion SLA during an outage.

R2 must have public access/r2.dev/custom public domains disabled. No originals are uploaded; only edited, server-validated derivatives exist there. Do not enable unbounded object versions or backup copies. Configure any R2 safety lifecycle only as a reviewed backstop: indiscriminate 48-hour deletion of the `media/` prefix would destroy active cards, so do not add such a rule. PostgreSQL reference-aware cleanup is authoritative.

## Budget controls

Initial defaults: 10 MiB request images, 24 megapixels/10,000px edges, 1600px/2 MiB output, 24KB card documents, 100 MiB/50 assets/25 active cards per owner, two GiB global reserved/ready media. Limits are configurable downward; increasing derivative dimensions/bytes above the current static adapter requires a coordinated code review.

Each owner gets at most ten upload attempts per minute, 50 new uploads/day and 25 new cards/day. Global new-upload/card budgets are 500/250 per day. Owners share write limits of 60/minute; each share has 240 reads/minute, global shares 600/minute and direct-IP budgets 600/minute. Daily counters use UTC windows. These conservative pilot defaults limit database/idempotency growth as well as storage. Provision owner keys to a small reviewed pilot first (for example ten owners).

`SH_UPLOADS_ENABLED=false` followed by a service restart pauses new uploads while preserving existing hosted reads, owner deletion and all static cards. Changing quotas/retention affects new publication and cleanup policy; it does not rewrite stored card expiry timestamps silently. No Redis, separate queue service, AI generation or automatically duplicated annual photo asset is required.

`python -m backend.silent_hello.cli metrics` emits aggregate storage/card counts, failed jobs, month-to-date requests/response bytes and `estimatedMonthlyGBP`. Prices are configurable planning assumptions, not live provider billing. Upload/read counters conservatively approximate storage requests and may include failed attempts/manifest reads; provider retries and real invoices remain authoritative. Photo response bytes provide an outbound-traffic estimate.

With a £10 fixed web/PostgreSQL planning allowance, two GiB at £0.012/GiB-month, 15,000 monthly write attempts at £3.50/million, 100,000 read requests at £0.30/million and five GiB API photo traffic at £0.05/GiB, the estimate is about **£10.36/month**. Actual Railway memory/CPU/database/plan floors, exchange rates, taxes, traffic and R2 free allowances vary. This is suitable for a £10–£20 incremental pilot target, not a guaranteed cap or provider quote. Validate current provider prices before approval. Large traffic or abuse can exceed it; a private bucket does not eliminate API-proxy egress costs.

## Monitoring thresholds

Check the usage report daily during the pilot and retain aggregate reports for month-end reconciliation. Suggested alerts/runbooks:

- Storage 70%: inspect growth; 80%: pause new uploads/review quotas. Full reservations automatically reject uploads.
- Estimated monthly run rate £15: investigate; £18: pause new uploads and obtain a budget decision. Check the provider invoice/billing alerts too.
- Repeated `cleanup_retries`/`cleanup_failed` logs, any deletion failure surviving two cleanup intervals, or database/object counts diverging: investigate promptly.
- Persistent 429s: inspect hashed-IP/shared-token abuse or overly broad trusted-proxy assumptions; do not simply remove limits.
- More than 1% 5xx, decoder timeout spikes, web memory over 75% of the container limit or database connections near seven: reduce limits/investigate before scaling paid resources.
- Reconcile private bucket inventory against tracked rows after crashes/restores and weekly during the pilot. Use bounded cursor pages.

Monitoring/log alerts must be configured by the operator during approved deployment; no paid alerting service is activated here. Never include raw card/share/owner tokens, messages, image bytes or capability URLs in alert payloads.

## GDPR-related handling and restoration

Hosted card text, names, edited photos and optional gift links are personal data chosen by the sender. Management uses a random pseudonymous owner ID/key hash. No recipient account, email, contact list, advertising identity or reminder/marketing consent is collected. IPs are transiently keyed-hashed for abuse limits; they are still treated as personal data. Document the controller, processing purposes, legal basis, processor agreements, regions/international transfer safeguards, rights contact and retention notices before production.

Owner-key holders can remove cards/media or delete all owned data. Local drafts remain on the user's device and require separate deletion. Losing the key does not grant anonymous management access; support must verify a deletion request using an independently established channel/operator records. Do not promise password recovery or identity verification that has not been built.

Backups are an infrastructure policy, not something an application environment variable can enforce remotely. Before enabling production, configure encrypted PostgreSQL backups with a verified expiry no longer than `SH_BACKUP_RETENTION_DAYS` (maximum 30), restricted access, and no indefinite exports/snapshots. Do not keep extra photo backups/versions by default. Real backup restoration is not tested against Railway in this task.

This release takes a deliberately conservative restore approach because it has no independent deletion ledger: **all restored hosted links and owner keys must be invalidated before traffic is restored**. This prevents a stale backup from resurrecting previously deleted capabilities or card text. Static v1–v5 links are unaffected. Existing hosted recipients need a newly issued link after such a disaster recovery; selective preservation requires a future independently retained deletion journal and a reviewed restore implementation.

Restore procedure (manual, not automatically executed):

1. Isolate restored infrastructure from public traffic; keep uploads off. Verify the database/bucket belongs only to Silent Hello.
2. Restore to the isolated database; verify schema/version and restore the original protected server secret. Do not enable reads yet.
3. Run `python -m backend.silent_hello.cli restore-guard --confirm-delete-all-hosted-data`. It scrubs all restored card text, revokes links/owner keys and queues media deletion. This is intentionally destructive and requires the explicit CLI flag.
4. Run reference-aware cleanup in bounded batches and inventory reconciliation. Verify deleted tokens cannot read manifests/photos.
5. Reprovision verified owners and validate limits/backups before enabling new publications. Do not reactivate old capability hashes manually.
6. Destroy the temporary restore/export copies within the declared backup window; record a minimal operational completion audit without card content.
