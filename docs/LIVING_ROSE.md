# The Living Rose

The implementation starts from `main` at `dca8b3664e1d266650fcf663f6840014f812f726` (merged PR #49). The storefront links to `rose.html`, and gift links open `rose-view.html#r=…`. The rose does not use the card editor, card codec or saved card drafts. The sender reuses the existing share controls.

## Gift links and timing

The version 1 URL fragment carries the local artwork ID, a randomly generated gift ID, the lifecycle mode and the sender’s three text fields. The gift ID stays stable across share actions for the same text and mode in an open creator. A different draft can have a different gift ID. The application adds no images to the link and makes no request containing the personal fields. Anyone with the complete link can read the note. The link is self-contained and its length depends on the note.

The first reveal starts the timeline for that gift in the recipient’s browser. The clock uses elapsed 24-hour days, independent of the local timezone.

| Elapsed days | Stage |
| --- | --- |
| 0–1 | Partly closed bud |
| 2–4 | Beginning to open |
| 5–13 | Full bloom |
| 14 onward | Keepsake in full bloom |

Everlasting gifts open in full bloom. **Keep this rose** immediately keeps either mode in full bloom, including gifts that were already saved. The message remains available in every stage. Stage boundaries and readable labels are in `engine/rose-gift.js`. The art changes at a stage boundary with a brief fade. Reduced-motion mode displays it immediately. Returning to a tab rechecks elapsed time so the rose can advance past stages missed while the tab was closed or suspended.

Only the first-open timestamp and the keepsake choice are saved in local storage under the gift ID. Different browsers and devices can have separate timelines. Clearing browser storage can reset the timeline and the keepsake choice. With storage blocked, the rose and note still work for the current visit. Preservation does not synchronise across devices. No server confirms delivery, opening or visits.

## Artwork

The original full-bloom image was created with OpenAI ImageGen for Silent Hello. The bud and opening images was edited from that same 1024×1536 reference using ImageGen, with the stem, leaf sequence, lighting and camera framing held as reference. The stages were inspected together for anatomical and visual consistency. The series uses three rendered stills from a common reference. The keepsake uses the same image as full bloom.

The repository ships opaque 480×720 and 960×1440 WebP derivatives of all three images. The 960px files serve as the shipped high-resolution set. No third-party stock, flower trademarks, remote art requests or runtime generation are used. Generated output is subject to the applicable OpenAI terms.

## Verification

```sh
node tests/rose.mjs
python -u tests/rose.py
```

The browser smoke test covers 320, 360, 390, 430, 768 and 1440px. It advances the browser clock, exercises the rose on separate sender and recipient pages and captures screenshots under the configured `CARD_ARTIFACT_DIR`. It intercepts native share and WhatsApp.
