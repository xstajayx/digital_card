## Change

Add a sender-facing My Occasions page with local birthday/anniversary CRUD, chronological next occurrences, annual or one-time dates and 1/7/14-day reminder preferences. Each occasion can be downloaded as an RFC 5545 all-day calendar event with optional advance alarm. Leap-day dates use the next actual leap day.

After a valid card link is prepared, the editor offers an optional, dismissible reminder dialog. It prefills only the nickname/type; the sender must choose the actual date. The feature stores no card messages, signatures, share URLs or email addresses. The recipient page, its controls, shared renderer, animations, drafts and v1–v5 codecs are unchanged from main.

## Review evidence

- [Feature behavior, screenshots and limitations](https://github.com/xstajayx/digital_card/blob/feature/my-occasions/docs/occasions/README.md)
- [Actual test results](https://github.com/xstajayx/digital_card/blob/feature/my-occasions/docs/occasions/test-results.txt)
- [Future Railway / FastAPI / PostgreSQL / Resend specification](https://github.com/xstajayx/digital_card/blob/feature/my-occasions/docs/occasions/railway-email-spec.md)

| My Occasions (390px) | Optional sender dialog |
| --- | --- |
| ![Upcoming occasions](https://github.com/xstajayx/digital_card/blob/feature/my-occasions/docs/occasions/screenshots/occasions/upcoming-390.png?raw=true) | ![Date is explicitly chosen](https://github.com/xstajayx/digital_card/blob/feature/my-occasions/docs/occasions/screenshots/occasions/sender-dialog-390.png?raw=true) |

## Validation

New unit tests cover validation, recurrence, leap centuries, storage, conflicts and UTF-8 calendar folding/escaping. An independent Python iCalendar parser validates all-day dates, exclusive end dates, recurrence and alarms and round-trips files. Playwright covers CRUD, real calendar downloads, sender date confirmation, failures, keyboard use and 320/360/390/412/430px, tablet and desktop layouts. New tests are in CI alongside every existing repository suite. See the recorded results for executed commands and outcomes.

## Limits and future phase

Data stays on the current browser/device and can be lost when browser data is cleared. The static site sends no emails or browser notifications. Users must download/import calendar events and check alerts; application support and duplicate-import behavior vary. Already imported events are managed in the calendar separately from local edits/deletions. Ordinary stale edits are detected; localStorage is not a transactional multi-tab database.

Email remains architecture only: authenticated ownership, verified opt-in, timezone scheduling, durable idempotent delivery, retries, unsubscribe, deletion, abuse limits and retention. No secrets in public JavaScript, service activation, DNS changes, deployment or merge.
