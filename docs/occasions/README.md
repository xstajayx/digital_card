# My Occasions

A static, sender-facing list of birthdays and anniversaries, linked from the shop. It stores a nickname, date, annual/one-time choice and 1/7/14-day calendar reminder on the current browser/device. It stores no card messages, signatures, share links or email addresses. There is no backend, account signup, notification permission request or email delivery.

After a valid card link is prepared for sharing, the editor offers **Remember this occasion next year?** as an optional, dismissible action. The dialog prefills the recipient nickname and anniversary type where appropriate, but the date starts blank. Card creation and sharing do not depend on saving an occasion.

The received-card page, its controls, shared renderer, animations and sharing codecs are unchanged from main (`c3399a2` at the start of this branch).

## Behavior and calendar policy

- Upcoming dates are sorted chronologically using the device's local calendar date; ties use nickname. Today counts as an upcoming occurrence.
- Annual occasions find the next valid occurrence. 29 February recurs only on actual leap days, following the Gregorian century rule; it is never moved to 28 February or 1 March.
- An unchecked annual option saves a one-time date in the next valid occurrence year. That year stays fixed. Expired one-time occasions are listed separately and cannot be exported until their date is edited; they do not silently advance.
- Each occasion has a stable random UUID, revision and calendar UID. Editing increments the version. Unknown fields are not persisted. A bounded versioned localStorage document is validated on every read/write. Corrupt or unavailable storage produces an error without overwriting existing records. Stale-edit checks detect ordinary conflicting edits in another tab.
- Each `.ics` file uses RFC 5545 `VCALENDAR`/`VEVENT`, an all-day `DTSTART;VALUE=DATE`, exclusive next-day `DTEND`, UTC `DTSTAMP`, stable `UID`, `SEQUENCE`, and annual `RRULE` when selected. An optional `DISPLAY` alarm uses a negative 1/7/14-day duration. Lines use CRLF and are folded at 75 UTF-8 octets without splitting a code point. Text escapes backslashes, commas, semicolons and line breaks.
- Calendar export uses the next occurrence, not a birth year or the card's sending date. The alarm toggle changes only the downloaded file. Stored preferences remain unchanged.
- Download-start failures produce a meaningful message. A browser cannot prove that a file was saved, imported or an alert was enabled. Success text asks users to check downloads and imported calendar settings.
- Deleting/editing a local record does not change previously imported calendar events. The delete dialog explains this. Reimport and duplicate handling vary between calendar applications; stable UIDs and revisions help clients that support them, but this is not calendar synchronization.

## Privacy and limitations

Local records are readable by scripts on the same origin and by someone using the same browser profile; this is not encrypted cloud storage. No data is uploaded by this feature. Clearing browser data removes records; private-browsing records may disappear on close. Calendars are individual backups of selected occasions, not a full-list restore format. Browser storage can be blocked or full. Updates in other tabs refresh the list and stale revisions prevent ordinary overwrite conflicts; localStorage does not offer a cross-tab transactional database, so truly simultaneous writes remain a limitation.

The static site cannot send reminders by itself. Users must download/import a calendar event and check its alert. Actual Google Calendar, Apple Calendar and Outlook UI imports/alert delivery require manual verification; automated tests independently parse and round-trip the files but do not claim every calendar application honors imported alarms. All-day alert clock time is determined by the importing application's settings. Changing device timezone can change which occurrence counts as next.

The optional email phase is specified in [the Railway/FastAPI/PostgreSQL/Resend design](railway-email-spec.md). It requires authenticated ownership, verified email, separate service opt-in, explicit local import consent, durable idempotent jobs, timezone-aware scheduling, unsubscribe, deletion and retention controls. Nothing in that specification is activated by this branch.

## Screenshots and validation

Screenshots in [screenshots/occasions](screenshots/occasions) cover empty/populated lists and the reminder dialog at 320, 360, 390, 412, 430, 768 and 1440px, plus the editor reminder dialog. [Actual test results](test-results.txt) record executed checks and limitations.

Development dependencies are in `requirements-dev.txt`. The deployed feature has no third-party JavaScript dependency. Run:

```sh
node tests/data.mjs
node tests/occasions.mjs
python -u tests/calendar_ics.py
python -u tests/occasions.py
python -u tests/browser.py
python -u tests/shop.py
python -u tests/interactive.py
python -u tests/physical.py
python -u tests/responsive.py
python -u tests/recipient.py
```

The new unit, independent parser and browser checks are included in the existing CI workflow; its timeout budget is 30 minutes to accommodate the expanded suite. User-specific calendar import behavior and live email delivery are outside this static release.
