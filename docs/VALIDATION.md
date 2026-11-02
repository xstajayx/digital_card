# Review and validation

Feature branch: `feat/polished-card-studio`. Base: `0648fb2` on `main`.

## What changed

- A responsive, five-step creator: occasion, design, message, personalisation, preview/share. Desktop has a sticky preview; mobile has a safe-area-aware step bar and share shortcut. Searchable, keyboard-operable occasion/design/illustration buttons expose their selected state.
- 23 occasions and 26 designs. Birthday, Love and Christmas each have two distinct designs. Dark midnight Birthday and forest Christmas complement the light designs. Designs choose an initial font; an explicit user font choice persists between designs.
- 36 coordinated transparent vectors, totalling 21,668 bytes. All 43 legacy illustration IDs resolve to matching objects. The original SVG paths and all 15 original theme IDs remain available.
- One shared responsive 3:5 card renderer for creator and recipient. Flexible text and illustration layout, loaded-font measurements, 14px minimum, normal paragraph wrapping, explicit overflow feedback and full-text fallback. Empty optional names/message/signature are supported.
- One coalesced iframe update per content change, stable picker nodes, guarded asynchronous theme/font work and no opening replay while editing. Deterministic, finite balloons/confetti/hearts/snow/flowers/stars/sparkles respect reduced-motion preferences.
- Colour presets, custom colours and contrast warnings; birthday ordinals and prominent milestone ages; safe HTTPS gifts; copy/native/WhatsApp sharing with duplicate prevention and manual/popup fallbacks.
- Compact v3 fragment links with optional native compression and bounded decompression. Existing v1/v2 query links are accepted. No message storage, analytics, external images or shortener.

## Executed checks

Validation date: 2 November 2026. Python 3.12.14, Node 24.19.0, Playwright 1.62.0, system Chromium 154.0.8037.57 (Linux).

| Check | Result |
| --- | --- |
| `node tests/data.mjs` | 12 passed; 0 failed; 0 skipped |
| `python3 -u tests/browser.py` | 24 functional check groups passed across the viewports below; no JavaScript errors or failed local asset requests |
| All app/engine JavaScript parsed with `node --input-type=module --check` | Passed |
| All 79 retained/new SVG files parsed as XML | Passed |
| Python browser runner compilation | Passed |
| Pinned Prettier 3.6.2 source/style/manifest/workflow check | Passed |
| `git diff --check` | Passed |
| Application build | Not applicable: static files, no build step |
| GitHub Actions workflow | Added; remote execution is not claimed as locally verified |

Browser coverage: 360×800, 390×844, 768×1024 and 1440×900. Each viewport loads all 23 occasions and 26 designs, checks illustrated/unillustrated layouts, all six actual font families, Pacifico multiline copy, short/medium/overflowing messages, emoji/paragraphs, ordinals, colour controls, Reset Design, generated links and recipient parity. Desktop additionally selects every artwork choice in every design. Shared checks cover keyboard focus, 200% text scaling, reduced motion, rapid theme switching, empty optional fields, prominent milestone ages, native/copy/WhatsApp fallbacks, duplicate operations, old links and malformed/injection data. New and legacy artwork are validated against local files.

The test runner starts its own server with the `/digital_card/` prefix. It intercepts native sharing and WhatsApp instead of sending anything. Its pass groups are recorded in [browser-results.json](browser-results.json). The 24 groups aggregate multiple assertions; they are not an invented count of individual test cases.

## Actual visual artifacts

Captured from Chromium, then inspected during implementation. Selected unmodified screenshots are in [screenshots/](screenshots/):

- [Desktop studio](screenshots/desktop-studio.png)
- [Mobile preview and share](screenshots/mobile-share.png)
- [Mobile recipient](screenshots/mobile-recipient.png)
- [Tablet preview and share](screenshots/tablet-share.png)
- [Pacifico with Unicode and paragraphs](screenshots/pacifico-multiline.png)
- [Midnight Birthday](screenshots/birthday-midnight.png)
- [Forest Christmas](screenshots/christmas-forest.png)
- [Milestone birthday](screenshots/milestone-40.png)

Complete screenshots for all four sizes, including editor/recipient card-only pairs, are produced outside the checkout in `/workspace/onboarding/polished-studio/` (override with `CARD_ARTIFACT_DIR`). Card-only captures hide the surrounding fixed step bar so the artifact shows the card itself; full-page captures retain the real mobile navigation. Editor/recipient geometry, sizes, fonts, colour overrides and illustration positions are also compared by automated assertions. There is no historical pixel-baseline diff claim.

## Known limits and remaining external checks

- Automated browser execution is Chromium on Linux with mobile viewport emulation. Actual Android/iOS share sheets, touch keyboards, WhatsApp apps, Safari, Firefox and a screen-reader session were not exercised. Native/WhatsApp behavior is intercepted and its arguments/fallbacks tested.
- Compressed v3 links need a current receiving browser with `DecompressionStream`. Encoding falls back to uncompressed v3 when compression is unavailable. All previous supported v1/v2 links remain readable.
- Static links carry the complete card. They can be long; anyone holding one can read it. The 12,000-character share ceiling is deliberate. Overfull legacy cards offer full text outside the canvas rather than cutting words off or adding internal scrolling.
- Extra fonts were not added: the six existing licensed local fonts already cover distinct styles without extra downloads. The original TTFs and OFL licences are retained.
- GitHub API access is currently blocked by the environment proxy (`api.github.com`: HTTP CONNECT 403). A draft adds only that domain, preserving package-manager presets. PR creation needs this access; no production settings or DNS have been changed.

## Merge and deploy

1. Review the feature branch, this report, [the audit](../AUDIT.md), and screenshots. Run the two commands above; let the new read-only validation workflow complete when GitHub access permits.
2. Merge the pull request into `main` after review. Do not copy generated test artifacts into the site's root or introduce a build command.
3. Keep the existing GitHub Pages publishing source, branch and root folder. The root `index.html`, `view.html`, and all module/theme/font/sticker URLs remain relative to `/digital_card/`. No domain, DNS or Pages setting change is needed.
4. After the normal Pages publication, create and open a new card and a retained v1/v2 link. Exercise copy/native/WhatsApp on a physical phone before announcing the update widely.
5. To roll back, revert the merge commit. No backend, schema migration or stored user records need reversing.

## Changed files

[CHANGED_FILES.txt](CHANGED_FILES.txt) lists the complete added/modified paths for this delivery, including tests, assets, audit and screenshots. No user data, secrets or credential configuration is committed.
