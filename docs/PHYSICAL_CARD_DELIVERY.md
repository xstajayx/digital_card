# A physical greeting-card experience

Feature branch: `feat/physical-greeting-card`. Reviewed main at `5f25440`, the merge of the preceding universal-opening release. Its source tree matched the tested `0d65781` baseline. This branch changes no production settings and performs no deployment, DNS, paid API or Railway action.

## The interaction

Opt in under Personalise → **A real paper-card moment**. Defaults provide an illustrated cover, coordinated inside-left illustration, ivory paper, Pacifico handwriting/signature, an envelope and no celebration effects. Nothing needs redesigning to use the experience.

1. The addressed envelope rests on a subtle neutral surface, with selected wrapping colour and optional wax seal.
2. Tap/click it or activate it with the keyboard. The seal releases and a triangular flap rotates open.
3. The actual folded-card DOM component lifts out of the pocket. The envelope recedes only after extraction; the emerging cover is the same component shown afterwards.
4. Tap the illustrated front cover. It rotates about its left hinge as the spread moves into position. Paper edges, layered borders, spine lighting and shadows support the fold.
5. Read the message and signature inside. Close/reopen without replaying the envelope, or use Replay for the complete journey. Skip goes directly to the inside.

There is no auto-closing timer. Optional celebrations play only after unfolding and never move the written page or intercept reading controls. No effects are enabled by default in paper mode.

## Component and editor

`engine/physical-card.js` and its stylesheet are additive. They reuse the existing measured message surface on the inside-right page. The front has separate greeting and artwork; the left page is blank or carries its own local illustration. Existing templates, artwork IDs/aliases, typography choices and palette controls remain available. The classic illustration selection can supply the default cover artwork. No artwork is downloaded from external services.

Paper choices: ivory, linen, white, kraft, soft pastel and premium textured. Every inside paper has a fixed readable ink colour with contrast above 4.5:1. Cover colours retain the existing colour controls and contrast warnings. Inside lettering offers Pacifico, Quicksand and Nunito; signature styling is independent. Cover lettering retains the global font choice. The six licensed original fonts and licences remain.

The editor offers Envelope, Front cover, Inside pages and Full journey preview actions. Inside text remains edited in the proven Message step. Turning paper mode off restores the existing animated renderer; the old envelope, gift and celebration controls remain usable.

On viewports wider than 500px **inside the card iframe**, the spread has two pages. Narrow layouts keep the inside-right page full width instead of scaling two pages to tiny text. The inside-left decorative artwork is not displayed on the narrow reading layout. **Read comfortably** offers all cover/inside words and the full signature in a clear, large-font dialog at any point. Its close control stays visible during scrolling; opening it scrolls the embedding page to the card through an origin/source-checked message.

Measured fitting waits for the body, signature and cover fonts. The inside never shrinks below the existing 14px minimum; the cover is measured independently. Overfull cover/message content is explicitly flagged, with a visible reading-view notice and complete text preserved. Sharing remains blocked until the printed layout fits, preserving existing safeguards. The expanded reader is a review/reading fallback, not an excuse to pretend that unfit printed content fits.

## v5 compatibility

The new format is `5u.<base64url>` or `5z.<base64url(deflate)>`, decoding to:

`[5, unchangedCompactV3Array, envelopeConfiguration, physicalConfiguration]`

Physical configuration has strictly validated paper, bounded cover greeting, allowlisted cover/inside artwork, inside handwriting, signature style and boolean effects preference. Folded cards require an envelope. The existing 64 KiB decoding and 12,000-character URL limits remain. Text uses text nodes; there is no user HTML, arbitrary CSS, executable payload or external asset URL.

v1/v2/v3/v4 decoding and the 13-field v3 array remain unchanged. Earlier cards keep their previous rendering path. Opting in during editing converts the current message, names and style into v5 only at sharing/saving time. Draft recovery retains the separate cover, inside and envelope choices. A v5 link needs this release deployed; do not distribute new v5 links before review and publication.

## Executed checks

Baseline: 14 data tests and all 24 existing browser check groups passed before implementation.

After implementation:

- `node tests/data.mjs`: 17 passed, zero failed/skipped. New checks cover v5 raw/compressed round trips, strict field/artwork validation, all six paper contrasts, required envelope configuration, sensible text limits and v4 preservation.
- `python3 -u tests/browser.py`: all 24 legacy groups passed across 360×800, 390×844, 768×1024 and 1440×900. All 28 designs, sharing, fonts, fitting, old URLs and invalid-data checks remain green.
- `python3 -u tests/interactive.py`: four universal-opening groups passed, including all 28 designs × three opening choices, old v4 links, touch/keyboard, replay/skip and missing-animation fallback.
- `python3 -u tests/shop.py`: all four storefront/draft/opening groups passed.
- `python3 -u tests/physical.py`: all four physical-journey groups passed, covering every existing design's physical defaults at all four sizes, same-node extraction, cover/unfold/close/reopen, complete Unicode/emoji/paragraphs/signature, six papers, v5 drafts/sharing/recipient, reduced motion, long-letter expanded reading and classic-mode restoration.
- JavaScript syntax, formatting and `git diff --check` are checked before commit. No application build is required.

The grouped browser outcomes contain many assertions; they are not claimed as hundreds of independently registered tests. Actual screenshots were captured for envelope, extraction, cover, unfolding, inside and recipient at each size under `/workspace/onboarding/physical/`. Selected unmodified captures accompany this report under `docs/screenshots/physical-*`. Desktop and mobile captures were visually inspected.

## Limits and review

This is one folded-paper/envelope style. There is no optional back-cover editor or photograph upload. Inside-left artwork is decorative and omitted on phones in favour of readable text. Very long letters remain available in Read comfortably but must be shortened to share a fitting printed layout. Envelope tags have limited space; the complete recipient name is retained on the cover, inside and expanded reader.

Browser checks use Chromium on Linux with touch emulation. Real phones, screen-reader sessions, Safari/Firefox and frame-rate benchmarks remain manual checks. Effects are finite browser-native animations with cancellation, duplicate-activation guards, reduced-motion handling and bounded completion fallbacks; no heavy 3D dependency is introduced. No backend or remote media storage is required.

Review this branch against main, inspect the new screenshots and run all five commands above. Merge through a PR after review; keep the existing GitHub Pages root settings and deploy the complete increment. Reverting the increment restores the preceding experience, but distributed v5 links require the newer decoder again. v1–v4 links remain supported. No merge or deployment is performed by this delivery.
