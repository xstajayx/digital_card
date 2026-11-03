# Professional card creator

The creator now follows **Choose card → Front cover → Message → Style → Preview & send**. Selecting a design in the shop enters Front cover directly. Names are preserved when switching designs, including names that match historical theme examples. Step navigation preserves the current message and custom cover greeting.

## What changed

- A compact header and five-step progress replace the tall promotional introduction. Occasion and design selection share one screen.
- New manual cards and newly generated folded assistant cards omit cover names. The envelope still uses the recipient's name. An explicit cover-name toggle allows independent text, editing and removal.
- New manual cards default to the existing folded presentation with a theme-matched envelope. Historical drafts and links keep their saved presentation until the sender explicitly changes it.
- The cover greeting, illustration and optional 1–120 age have their own screen. Blank age is valid; existing ordinal formatting handles teen exceptions and milestones.
- Message uses To, Your message and From. Suggest a message has an Undo action. Paragraphs, complete-message reading and fit checks remain.
- Six touch-friendly font choices use the actual locally bundled font assets. Choosing one updates the real folded inside and signature as well as the cover. Coordinated palettes, illustration choices, photos and celebration effects remain.
- More options contains manual text size, individual colours, watermark, gift link, paper, separate inside/signature settings, historical opening choices, reset and photo-draft tools. Low-contrast feedback stays beside palettes.
- Draft save/restore/delete use a compact Drafts disclosure. Photo drafts retain IndexedDB and existing metadata/size/format safeguards.
- Mobile preview is a native modal showing the actual live iframe, with envelope/cover/inside/full-journey controls, Escape dismissal and focus return. The iframe stays in place: opening preview does not reload it or discard photo state. Preview card is available in the header and editing footer.
- Desktop uses a balanced editing/preview grid above 1000px. Container queries keep a compact one-page preview portrait-shaped; photo-page switching follows the actual iframe width. Narrower widths use one column. The final screen retains working share methods, app fallbacks, privacy and fit errors.

## Compatibility and schema

No new URL version is introduced. The existing v5 physical configuration accepts an optional `coverName` string (maximum 120 characters). An explicit empty string means no cover name; a nonempty string is rendered as text. **Absent** means the previous `For {recipient}` behavior. Validation preserves that absence, so old v5 links and drafts are never silently converted. v1–v4 codecs and rendering remain unchanged.

The existing `handwriting` and `signature` allowlists now accept all six already bundled fonts. No old value changes. The physical renderer has only the cover-name conditional and two font-family mappings; animation/open/close/replay logic is unchanged. Recipient HTML, viewer controls and recipient CSS are unchanged.

Main at `fff4bfd` includes merged PR #37 (assistant), #36 (photos) and #35 (occasions). Assistant configurations continue through `?prepared=` and the existing save/approval checks. New generated folded configurations explicitly omit cover names; already prepared configurations are retained. Styling never replaces their greeting or message. No related unmerged implementation is required.

## Retained limits

Photos remain local previews until secure persistent media sharing exists. All photo share transports still refuse to create misleading links and display the existing reason. Traditional cards keep copy, native share, WhatsApp and email/SMS drafts; opening an app does not confirm delivery. Browser draft privacy and loss limits remain.

The new optional v5 fields require the updated static viewer to display the new cover-name preference and additional inside fonts. Existing deployed old viewers cannot be assumed to understand new optional choices. No deployment occurs in this task.

Automated Chromium checks cover mobile/tablet/desktop, landscape and text enlargement. Device-specific keyboards, third-party app handoff and assistive technology still merit hands-on verification on real devices; the test suite intercepts sharing rather than sending messages.

## Review evidence

- [Audit](audit.md)
- [Actual test results](test-results.txt)
- [Before/after screenshots](screenshots/)
- [Prepared pull request description](PR.md)
