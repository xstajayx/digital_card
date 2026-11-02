# Universal interactive experience

Branch `feat/silent-hello-interactive-experience`. Reviewed default branch `main` at e6bd700 (the merge of the preceding shop release). Its source tree equals the tested e997958 baseline. No production merge, deployment, DNS, paid service or EV Revival action is included.

## Delivered

- Independent opening picker for all 28 designs: straight-to-card, luxury envelope or gift box. Multiple wrapping palettes, optional wax seal, striped/dotted gift wrap, recipient tag and separate selection of the eight original celebration effects. Design defaults remain available; changing text/font/colour does not replay the opening.
- Layered envelope with back, flap, front, seal and emerging card; layered gift box with ribbon, lid, front, tag and emerging card. Finite sequential animations, keyboard/touch controls, single activation, Replay, Skip, cancellation, timeout and missing-animation-API fallback. Completion event and explicit idle/ready/opening/revealed/complete states. Old template-defined envelope/gift cards retain their opening.
- Recipient introduction identifies the supplied sender. The same renderer and validated configuration drive preview and recipient. The actual message and fit safeguards are preserved.
- Version 4 URL payloads and validated local draft persistence for independent opening choices. All existing v1/v2/v3 decode paths remain supported. The compact v3 array is still exactly 13 elements. Cards using only design defaults continue to generate v3 links.
- Email and SMS draft composers with the entire card URL and selectable copy fallback. An explicit follow-up link opens the device handler; nothing is automatically sent. Native sharing uses `canShare` when available, with copy/manual fallback. Existing WhatsApp behavior remains. No claim of delivery to any app is made.

## Schema and lifecycle

v4 payload framing is `4u.<base64url>` or `4z.<base64url(deflate)>`. Decoded content is `[4, <unchanged compact v3 array>, <opening configuration>]`. The bounded decoder expands the nested old array and validates the new object before rendering. The existing 64 KiB decompression ceiling and 12,000-character share URL ceiling remain; URL-fragment content stays out of HTTP requests. A v4 recipient needs this release deployed; older receivers cannot understand a future version.

Configuration allowlists: type `none/envelope/gift-box`; tone `theme/ivory/blush/forest/midnight`; wrap `plain/striped/dots`; boolean seal; effect `theme` or one of the original eight effects. Unknown types, colours, wrapping, nonboolean seals and effects fail validation. No arbitrary HTML, CSS, image URL or animation code enters the payload.

The controller is separate from in-card effects. Opening selection resets only when the type/design changes or the user requests Replay; colour/tag changes update the existing cover. Celebration selection updates deterministic effect nodes and plays after reveal. The opening controller has guarded cancellation and a 3.5-second completion fallback. No animation resources run indefinitely.

## Actual checks

Baseline before implementation: 12 data tests and all 24 existing browser check groups passed.

After implementation:

- `node tests/data.mjs`: 14 passed, zero failed/skipped, including raw/compressed v4, legacy compatibility, strict opening validation and email/SMS URI safety.
- `python3 -u tests/browser.py`: all 24 preserved browser check groups passed, all 28 designs, no JavaScript errors or failed local assets.
- `python3 -u tests/shop.py`: four viewport groups passed; existing storefront, draft and template-opening workflow remains functional.
- `python3 -u tests/interactive.py`: four viewport groups passed at 360×800, 390×844, 768×1024 and 1440×900. Each exercises all 28 designs × three opening choices, touch emulation/keyboard, duplicate activation, replay/skip, v4 saved drafts/shared recipient, reduced motion, missing animation API and email/SMS fallback composition. This aggregates assertions, not 336 separately registered test cases.
- JavaScript syntax, formatting and whitespace checks are run before commit. There is no application build step.

Actual opening screenshots are captured in `/workspace/onboarding/interactive/`, including envelope ready/opening and gift recipient states. Selected captures are committed under docs/screenshots/interactive-*.png. Desktop and mobile are Chromium on Linux; physical devices, real email/SMS handlers, Snapchat app delivery, screen readers and other browser engines are not claimed as tested.

## Partial and deferred scope

QR generation/save/print, curtains, storybook, scratch, snow globe and candles are NOT IMPLEMENTED and are not offered as working controls. Photo editing/media persistence, undo/redo, server email/scheduling and AI generation remain deferred. Existing catalogue thumbnail generation is unchanged; its live preview still uses the actual shared renderer.

Direct Snapchat Creative Kit integration is NOT IMPLEMENTED. The official documentation request to developers.snap.com was blocked by the environment proxy (HTTP CONNECT 403), so current availability/registration requirements could not be verified. The UI explains native app-sheet/copy fallback and does not present a fake Snapchat-specific transport or claim app receipt.

Long URL cards cannot provide tiny persistent links, revocation or guaranteed SMS/email-client URI capacity. The complete copyable URL remains available even when an app handler is unsupported. Shared links are readable by anyone holding them. No personal photos are sent anywhere.

## Review and deploy

Review this focused branch against main, run all four test commands, inspect screenshots, and merge through a reviewed PR. Retain the existing static Pages root source. Deploy the whole increment before distributing v4 links. Old view.html query and fragment URLs remain supported. No CNAME, DNS, new secrets or runtime backend are needed. Roll back by reverting this increment; already distributed v4 links will require the newer decoder again, while v1–v3 remain readable by the preceding release. Do not advertise v4 links before review and deployment.

Next priority: a local QR encoder with capacity checks and independently decoded scan tests, real-device mail/SMS/native sharing checks, then additional opening mechanisms. Keep commercial launch/legal owner-review requirements from the previous release.
