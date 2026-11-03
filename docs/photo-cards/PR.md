## Personalised photo cards — local previews

The existing creator now supports photo cover and photo memory cards with JPEG/PNG/WebP upload, crop/zoom/reposition, quarter-turn rotation, replace/remove, square/portrait frames and rectangular/rounded/paper/gold finishes. Cover photos have a separate greeting zone; memory photos use the inside-left page and the native reverse cover face. The same envelope, book, opening, close/reopen and replay controllers are retained. Narrow screens offer readable photo/message page views.

Processed, metadata-free source images and crop/card snapshots can be explicitly saved as IndexedDB photo drafts. Existing illustrated localStorage drafts remain separate. No image bytes, data URLs or blob URLs enter shared links or localStorage. Active photo modes, including missing images, are blocked in every sharing transport. Traditional illustrated cards retain v1–v5 sharing and recipient behavior.

## Review evidence

- [Creator guide, compatibility and limitations](https://github.com/xstajayx/digital_card/blob/feat/personalised-photo-cards/docs/photo-cards/README.md)
- [Audit of merged PR #35](https://github.com/xstajayx/digital_card/blob/feat/personalised-photo-cards/docs/photo-cards/audit.md)
- [Executed test results and environment interruption](https://github.com/xstajayx/digital_card/blob/feat/personalised-photo-cards/docs/photo-cards/test-results.txt)
- [Railway/private storage/v6 owned-media design and next phase](https://github.com/xstajayx/digital_card/blob/feat/personalised-photo-cards/docs/photo-cards/media-architecture.md)

| Photo cover · mobile | Photo memory · desktop |
| --- | --- |
| ![Local photo cover](https://github.com/xstajayx/digital_card/blob/feat/personalised-photo-cards/docs/photo-cards/screenshots/photos/showcase-cover-390.png?raw=true) | ![Photo and handwritten message](https://github.com/xstajayx/digital_card/blob/feat/personalised-photo-cards/docs/photo-cards/screenshots/photos/showcase-inside-1440.png?raw=true) |

The test photograph is a public-domain U.S. Navy portrait of Grace Hopper; greeting names are fictional. Additional screenshots prove rotated crops, inside page views and editor failure states across 320/360/390/412/430px, tablet and desktop.

## Validation and compatibility

New image-unit tests and Playwright checks cover raster/file limits, spoofed formats, crop geometry, upload, live controls, both physical photo surfaces, actual layout/text fitting, touch/keyboard/reduced motion, draft recovery/deletion/metadata stripping, missing photos, blocked storage, design switching and all sharing transports. Existing storefront, editor, codec, animation, reminder and recipient suites are exercised. An environment restart interrupted an earlier browser run; a fresh, complete, uninterrupted run then passed all 24 browser groups. See the recorded results for exact commands and limitations.

No recipient page, shared renderer, folded/opening controller, schema, codec or reminder runtime is modified. Test assertions that previously banned all uploads now check one sender-only raster picker and retain the dynamic HTML safety guard with an explicit audit of PR #35's constant template. New photo tests are included in CI.

## Limits and next phase

Photo cards are local previews only. One photo, modern browser APIs, 10 MiB/24 MP input budget, downsampled metadata-free source, quarter-turn rotation and browser-local IndexedDB storage. Browser data clearing/eviction/private browsing may lose drafts; low-resolution crops may look soft. No cloud sync, print export, HEIC/GIF/SVG, collage or photo publication.

The next phase requires authenticated owned media, server-side quarantine/validation/re-encoding, private object storage/variants, immutable v6 revisions and opaque/revocable sharing tokens, then a separately reviewed recipient media adapter. Until that works, keep the local-only share gate. No API secrets, infrastructure, paid service, AI functionality, DNS change, deployment or merge is introduced.
