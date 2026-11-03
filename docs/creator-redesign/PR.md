# Simplify the card creator for mobile and desktop

The creator now follows Choose card → Front cover → Message → Style → Preview & send. Shop selections open Front cover directly; new cards use the existing matching envelope and folded presentation. Names stay on the envelope unless the sender explicitly adds an independent cover name.

## UX improvements

- Replace the tall introduction and scattered settings with concise tasks and a compact progress indicator.
- Give cover greeting, artwork and optional birthday age their own screen. Keep ordinals, custom greetings, names and personal messages intact while editing.
- Use To / Your message / From, with Suggest a message and Undo.
- Show six actual bundled font samples, coordinated palettes, illustrations, photo choices and effects. Keep contrast feedback and full-message fitting safeguards.
- Move text size, individual colours, watermark, gift link, paper/presentation, legacy opening controls, reset and photo-draft tools under More options. Put local draft actions in a compact disclosure.
- Add header/footer Preview card actions and a native near-full-screen mobile preview with envelope/cover/inside/full journey controls. Keep the same iframe mounted to preserve photos, unsaved edits and focus return.
- Use a balanced two-column desktop layout and one column on smaller screens, with keyboard-aware navigation, safe-area padding, large targets and text reflow.

## Before and after

| Mobile | Before | After |
| --- | --- | --- |
| Choose card | ![Before choose](https://raw.githubusercontent.com/xstajayx/digital_card/feat/creator-ux-redesign/docs/creator-redesign/screenshots/before-step1-390.png) | ![After choose](https://raw.githubusercontent.com/xstajayx/digital_card/feat/creator-ux-redesign/docs/creator-redesign/screenshots/after-step1-390.png) |
| Style | ![Before style](https://raw.githubusercontent.com/xstajayx/digital_card/feat/creator-ux-redesign/docs/creator-redesign/screenshots/before-step4-390.png) | ![After style](https://raw.githubusercontent.com/xstajayx/digital_card/feat/creator-ux-redesign/docs/creator-redesign/screenshots/after-step4-390.png) |

![Mobile actual cover preview](https://raw.githubusercontent.com/xstajayx/digital_card/feat/creator-ux-redesign/docs/creator-redesign/screenshots/preview-cover-390.png)
![Desktop message and live preview](https://raw.githubusercontent.com/xstajayx/digital_card/feat/creator-ux-redesign/docs/creator-redesign/screenshots/after-step3-1440.png)

All five steps have before/after screenshots at 390px and 1440px in [screenshots](https://github.com/xstajayx/digital_card/tree/feat/creator-ux-redesign/docs/creator-redesign/screenshots).

## Compatibility

Base main `fff4bfd` includes merged occasions #35, photo cards #36 and assistant #37. Preserve their storage, local-photo sharing restrictions, prepared-editor save/approval flow and calendar behavior.

No new URL version: optional bounded `physicalConfig.coverName` extends v5. Explicit empty hides the name; absence retains historical `For {recipient}`. Existing fonts now work in all folded text positions. Shared codecs, v1–v4 behavior, recipient HTML/controls/CSS, physical animations, photo runtime and occasion storage are unchanged. Restoring an old draft retains its saved presentation. New assistant folded drafts use the no-name default without rewriting existing prepared cards.

## Validation and limits

45 Node tests passed. All 10 existing Python regression suites and the new creator suite passed. Browser regressions passed 24 groups; creator checks covered all eight requested widths, landscape and 200% text. Final focused checks covered matching envelopes, immediate palette preview, artwork removal and names matching historical examples. Photo checks passed all seven sizes and preserve modal crop state.

See [actual commands/results](https://github.com/xstajayx/digital_card/blob/feat/creator-ux-redesign/docs/creator-redesign/test-results.txt) and [audit](https://github.com/xstajayx/digital_card/blob/feat/creator-ux-redesign/docs/creator-redesign/audit.md). Baseline ran from an immutable main archive. Existing legacy-renderer tests explicitly select the retained standard presentation and open relocated controls; new creator tests independently enforce folded defaults and the simplified journey.

Photos remain local previews until persistent media sharing is implemented; sharing still refuses photo payloads with a clear reason. Native/email/SMS/WhatsApp handoffs are intercepted in tests and do not prove delivery. Real-device keyboards and screen readers deserve a final hands-on pass. New optional v5 choices require the updated static viewer. No framework, infrastructure, AI, payments, deployment, merge, DNS or paid services are introduced.
