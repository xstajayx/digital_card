# Digital Card Studio audit

Baseline: `0648fb2` (main). Scope: both pages, all app/engine modules, local fonts, 15 theme manifests/styles and 43 SVG illustrations.

## Confirmed findings

| Finding | Impact | Resolution in this branch |
| --- | --- | --- |
| `ui.js` rebuilds both galleries on every notification; `state.set` always notifies. | Typing discards picker focus and repeats structural work. | Compare changed values, render structure only when its source changes, update selection in place. |
| Each UI update calls `setTheme`, `setContent`, and `setWatermark`; all invoke the iframe. | Three DOM passes, font measurements, random decor rebuilds and opening restarts per keystroke. | One batched controller update, coalesced content changes; replay only on design change or explicit action. |
| Theme clicks replace names and personal messages; sticker loading introduces nested notifications. | Lost writing and fragile rapid switching. | Synchronous allowlisted artwork metadata; preserve edited copy; version asynchronous CSS/font work. |
| Fit checks reset sizes on every ResizeObserver callback and inspect only root height/panel width. | Repeated layouts, late-font races, missed boundaries. | Debounced, versioned loaded-font measurements; measure text, layout, illustration and gift boundaries; never shrink below 14px. |
| Root uses `overflow:auto`; no reduced-motion rules. | Internally scrolling cards and unavoidable animations. | Fixed proportional canvas, explicit overflow feedback/full-text fallback, reduced-motion-aware finite animations. |
| Many named assets contain a different object (`tie-blue` is a mug; snowflake is a tree; diploma is a cap); several files are exact duplicates. | Misleading artwork choices. | Descriptive catalogue with coordinated local SVGs and legacy ID aliases. |
| Theme styles override palette paper colours and name text uses a low-contrast gradient. | Colour controls can disagree with rendered background; poor readability. | Palette-based surface styling, solid inherited ink and contrast feedback. |
| Only 15 occasions, almost all a slight gradient variation; no occasion/design distinction. | Limited choices and long flat gallery. | Data-driven occasions and distinct designs, including two Birthday, Love and Christmas designs. |
| Share payload repeats field names/default values, only supports copy/WhatsApp, and duplicate operations are possible. | Unnecessarily long links and unreliable mobile actions. | Versioned compact optional-compression codec, bounded decoding, native sharing, single-flight operations, clipboard/manual fallback. |
| Viewer is visually disconnected from creator; invalid data leaves an empty iframe. | Confusing recipient and error experience. | Shared visual language, recipient introduction, consistent canvas and actionable error/fallback states. |
| Old test suite has three widths, no keyboard/reduced-motion/update stability assertions. | Important regressions undetected. | Data/codec/asset checks plus four browser widths, visual artifacts and interaction/regression coverage. |

## Already working / preserved

No photo input, photo container, GIF exporter or vendor dependencies remain in the baseline. Paragraphs and Unicode already use `textContent`; gift links already reject non-HTTPS and credentials. Theme/font/illustration selection is allowlisted. Existing GitHub Pages relative paths and supported v1/v2 links are retained. No backend or build system is required.

## Delivery evidence

See `docs/VALIDATION.md` for executed results, artifacts, remaining limitations and merge/deployment instructions. No production settings are changed by this branch.
