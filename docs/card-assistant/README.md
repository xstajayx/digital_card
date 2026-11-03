# A personal card assistant, local demonstration

Silent Hello can remember saved occasions and prepare an editable illustrated card using existing designs and a deterministic message library. It uses no AI API and sends nothing automatically. It cannot run while the browser is closed.

## Use it

In **My Occasions**, add a name or nickname, birthday/anniversary and date. Expand **Family & Friends · card preferences** for an optional real start year, relationship, future-use recipient email, existing preferred design, standard/folded style, compatible opening, default greeting, preparation flag and review preference. Folded cards use an envelope. Unknown years produce ordinary cards without a made-up age. The original one-time scheduled year is never used as a birth year.

The greeting supports `{name}`, `{age}`, `{ordinalAge}`, `{years}` and `{ordinalYears}`. Use age tokens only with a known birthday year and year tokens only with a known anniversary year. Invalid or incomplete templates produce a visible failed preparation, never invented values. Default curated messages are friendly and contain no fabricated memories or personal facts. All required birthday milestones and common anniversary milestones use actual existing designs/art.

Open **My Prepared Cards**. Set your optional signature, confirmed IANA timezone and history retention. Preparation on visits is **off by default** and also requires each contact's preparation flag. Eligible cards are prepared within the saved lead interval (seven days by default), at most 20 per visit. You can also prepare manually regardless of that flag. The shop runs the same opted-in local demo on visits. No unattended worker, verification email or recipient delivery is active.

Generated configurations start as drafts. The real card renderer checks narrow mobile and desktop fitting before they become ready. Preview also checks its current size. A long message remains a draft with every word kept and accessible reading available. Approve a ready card explicitly, then Share copies its normal v1–v5-compatible link; it does not confirm delivery. Mark as sent is a manual record, never a claim that Silent Hello sent an email.

Edit message/change design opens the existing five-step editor. **Save prepared changes** saves back to that prepared record and clears approval. Return to the dashboard to review/approve. The normal illustrated/photo drafts remain separate. A prepared editor also checks approval before sharing. Photos can still be edited/saved through PR #36's local workflow, but cannot become shareable assistant cards or be duplicated into annual records.

Regenerate using templates asks before replacing edited text and clears approval. Date/preference changes make an existing card stale; edited words are retained until you explicitly regenerate. Sent history is read-only. Stable contact/year IDs prevent duplicate annual cards. Deleting a prepared card removes its text and leaves a small hidden cancellation marker through the occurrence/retention period; explicit Prepare now may recreate it. Removing a contact purges its prepared records and excludes it from generation immediately.

## Data and privacy

Existing v1 records remain readable with preparation disabled and no invented year. First saving extended preferences writes an authoritative v2 document atomically and retains v1 for recovery. Corrupt/full storage errors do not overwrite prior data. Legacy edits preserve advanced preferences. Explicit person deletion also clears the corresponding legacy recovery entry and prepared cards; failures to clear recovery data are disclosed. No cloud migration happens.

Export/import your records as versioned private JSON. Exports include any names, dates, email and default greeting you saved, in plain text. Keep the file private. Imports validate the entire bounded file before writing, skip identical IDs and require the Replace matching IDs checkbox for conflicts; unrelated records remain. Calendar download still exports the next occasion with stable UID, annual recurrence/optional alarms and proper RFC 5545 formatting, without adding email or birth-year details to calendar descriptions.

Contacts/preferences use browser localStorage; prepared cards are lightweight configurations, not screenshots or duplicated photo assets. Anyone using this browser profile may access them. Clearing/evicting browser data or private browsing may lose them. Retention cleanup (7/30/90/365 days) runs on dashboard visits; future occurrences and cancellation markers are kept through their occurrence. This is not encrypted, synced or unattended storage. Multiple-tab stale updates are checked, but localStorage is not a transactional multi-user database. A future backend must enforce uniqueness/ownership transactionally.

## Review evidence

- [Compatibility audit and migration](audit.md)
- [Executed tests and screenshots](test-results.txt)
- [Screenshots](screenshots/assistant)
- [Railway/FastAPI/PostgreSQL/Resend plan and activation checklist](backend-plan.md)

All existing card renderers, codecs, recipient controls and photo runtime are preserved. The only prepared-editor integration is an explicit local draft handoff/save/approval guard. PR #35 calendar behavior remains intact. PR #36 is merged; persistent photo delivery remains a separate dependency and is never assumed by this generator.

## Known limits and next phase

One prepared card per occasion/year, curated text and existing illustrated assets only; no automatic artwork, new photo delivery or AI. Local failed preparations can be retried/regenerated manually; closed-browser retries and scheduling belong to the future backend. Review is always required for local sharing even if a different future review preference is saved. Recipient email is syntax-checked only, not verified or used. No real notifications, deliveries, account authentication, cloud backup, provider delivery logs or proof of sending exist here.

The next phase must implement authenticated owned records, confirmed timezone scheduling, indexed due jobs, unique occurrence revisions, durable retries/outbox, explicit approvals and per-contact delivery consent, verified notifications, opt-outs, deletion/retention and cost limits. The activation checklist must pass before any deployment, sender DNS, paid API or actual email. Keep Silent Hello completely separate from EV Revival.
