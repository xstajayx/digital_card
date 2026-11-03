# Personalised photo cards — local creator

**More than a message. A proper card, made personal.**

The existing five-step editor now supports traditional illustrated cards, photo cover cards and photo memory cards. Photos are processed only on this device. Photo cards are explicitly local previews: **photo sharing is disabled** until secure persistent media delivery exists. Illustrated cards retain all existing sharing, animations, drafts and v1–v5 compatibility.

## Use the creator

1. Choose a design and write the message/signature normally.
2. In **Personalise**, choose Photo cover or Photo memory under **A proper card, made personal**. The existing envelope/folded mode is enabled; no replacement opening animation is introduced.
3. Choose a still JPEG, PNG or WebP. Crop with the zoom and horizontal/vertical sliders, drag the crop preview on touch/pointer devices, rotate in 90° steps, or reset. Replace through the file picker and remove through Remove photo.
4. Choose a square/portrait crop and rectangle, rounded, paper mount or gold frame. Choose a framed/full cover with a separate greeting band, or an inside-left photo on a memory card. Edit the greeting, handwriting and paper using the existing physical-card controls.
5. Preview the original envelope → cover → inside journey. Desktop shows a photo on the left and handwriting on the right. Narrow screens retain a readable one-page view: **Inside photo page** and **Inside message page** select the two real pages without shrinking the handwriting or rebuilding the fold controller. Closing resets that page selection to the message view; reopening/replay retains the photo.
6. **Save photo draft** saves the processed source, crop settings and card to IndexedDB. The existing Save draft button also saves a photo draft while a photo type is selected. **Restore photo draft** in Personalise recovers it after refresh. **Delete photo draft** removes only the stored photo draft, leaving the current preview in memory.
7. Choose **Traditional illustrated card** to restore illustrations and share that version normally. It may remain a folded illustrated card; the existing physical toggle still controls that choice. No photo enters its link. Restore draft continues to restore the separate illustrated draft; restoring it exits photo mode.

Photo and illustrated drafts are separate, explicit snapshots. Each photo save replaces the one saved photo draft. The existing illustrated localStorage draft is not overwritten by saving a photo. Unsaved photos are lost on refresh. Anyone using this browser profile may access local drafts; clearing browser data/private browsing may remove them. There is no cloud backup, upload or recipient delivery in this phase.

## Safety and quality boundaries

- Validate actual raster signatures, MIME consistency and declared dimensions before decode. Reject SVG, GIF, animated APNG/WebP, multi-frame JPEG, malformed headers, inconsistent WebP dimensions and unsupported images.
- Limit source files to 10 MiB, 24 megapixels and 10,000 pixels per edge, with at least 64 pixels per edge. Extremely panoramic images are rejected if downsampling would leave fewer than 64 pixels on an edge.
- Decode through normal browser APIs, respect decoded orientation and re-encode a bounded, opaque, sRGB canvas. Normalised sources are lossless PNGs with at most 1,600 pixels on the long edge. Original files, file names, EXIF/GPS and other source metadata are not stored. PNG transparency is flattened onto white paper.
- Crop derivatives are local JPEG Blobs at up to 900×1,200 pixels; temporary object URLs are revoked on replacement/removal/page exit. Restoring a draft validates/re-encodes its source before changing the current card. The PNG source avoids additional lossy JPEG generations when restoring/re-cropping.
- Frame dimensions follow the selected aspect. Cover image and text zones are separate; existing text-fit checks and full-message reading remain available. Full-cover photos fill the available photo zone above a paper greeting band; check the card preview because that zone responds to available cover space.
- The real cover/inside-left nodes and the native reverse cover face own the image. It stays on the same `.paper-book` through extraction, unfold, close/reopen and replay. No floating card clone or photo layer outside the book is used.
- All share transports, including quick share, clipboard fallback, email/SMS drafts, native share and WhatsApp, hit the same photo guard. A missing photo is still a local photo mode and cannot silently produce an illustrated share link. An in-progress asynchronous traditional share is rechecked before returning a link.

These client limits are a browser safety/quality budget, not a substitute for future server-side validation. Very large allowed sources can still exceed a low-memory device's decoder capacity; a processing failure keeps the previous editable photo. The implementation targets modern browsers with Canvas, createImageBitmap, Blob URLs and IndexedDB; no extra runtime package is installed.

## Evidence and compatibility

- [Audit and compatibility boundary](audit.md)
- [Executed tests and runtime notes](test-results.txt)
- [Railway/private-storage/v6 architecture and recommended next phase](media-architecture.md)
- [Rendered screenshots](screenshots/photos)

Automated screenshots include deliberately rotated/zoomed crops to prove the editing controls, square gold covers, inside photo/message pages and a full-cover layout at 320, 360, 390, 412, 430, 768 and 1440px. The portrait fixture is a public-domain U.S. Navy photograph of Grace Hopper distributed with Matplotlib, used for testing only; fictional greeting names do not identify the photographed person. Additional showcase images present an upright, uncropped layout for review. Run `python docs/photo-cards/capture.py` to reproduce the showcases and the complete long-message reading check.

Existing recipient files, opening/folded renderers, shared preview, card-data schemas, sharing codecs and reminder runtime are unchanged. The old no-file-input test is updated for one sender-only raster input. The no-dynamic-HTML test explicitly audits PR #35's constant reminder template and still rejects interpolation/other HTML assignments. All existing suites plus the new image-unit and photo-browser suites are run; exact results and reruns are recorded rather than claiming unexecuted browser/platform coverage.

## Remaining limitations and next phase

One photo per local card; quarter-turn rotation, no collage, cloud sync, image download/print export or photo sharing. A small/low-resolution crop can still look soft. IndexedDB can be unavailable, evicted or full; there is no guarantee of persistence. Browser tab/refresh storage warnings remain visible. Native mobile/browser behavior beyond the emulated Chromium viewports still needs real-device checks.

The next phase is authenticated, owned media uploads, hardened server-side re-encoding, private variants, immutable v6 card revisions and opaque/revocable sharing tokens. Only after secure retrieval and a separately reviewed recipient media adapter work should photo sharing be enabled. Do not enlarge fragments with base64 images, publish arbitrary URLs, add public bucket access or embed API secrets in JavaScript. No service, DNS change, payment, AI functionality, deployment or merge is part of this change.


## Run validation

Install the existing development requirements, then run `node tests/data.mjs`, `node tests/occasions.mjs`, `node tests/photo.mjs` and the Python suites `browser`, `shop`, `interactive`, `physical`, `responsive`, `recipient`, `calendar_ics`, `occasions` and `photo` in `tests/`. The new photo suite uses the browser's own encoders and Python's standard library for fixtures; there is no new production or development image dependency. `CARD_ARTIFACT_DIR` selects the output directory. See the result log for the exact commands and the interrupted/resumed browser run.
