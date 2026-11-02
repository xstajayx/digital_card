# Silent Hello

An animated greeting-card studio built with static HTML, CSS and JavaScript. Create a personal card, choose a design and illustration, and send a self-contained link. No account, backend, build step, analytics, photo upload or GIF export.

## Run locally

```bash
cd /workspace/digital_card
python3 -m http.server 8000
```

Serve over HTTP: themes, JavaScript modules and fonts cannot reliably load from `file://`. All application assets are local. No application keys or environment variables are required.

## Validate

The prepared cloud environment already includes Python 3.12, Node 24, Playwright and system Chromium. On a new development machine:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m playwright install --with-deps chromium
```

Run from the checkout:

```bash
node tests/data.mjs
python3 -u tests/browser.py
```

The browser suite starts and stops its own local server under the GitHub Pages `/digital_card/` prefix. It uses `/usr/bin/chromium` when available, otherwise Playwright's Chromium. Optional configuration:

- `CARD_CHROMIUM_PATH`: Chromium executable override.
- `CARD_ARTIFACT_DIR`: screenshot and JSON-results directory (cloud default: `/workspace/onboarding/polished-studio`).
- `CARD_TEST_URL`: existing server override, including its trailing `/digital_card/` prefix.

Checks cover 360×800, 390×844, 768×1024 and 1440×900; every occasion/design; all six fonts; measured fitting; illustration geometry; sharing; old links; invalid input; keyboard use; reduced motion; text scaling; and local asset errors. Native sharing and WhatsApp are intercepted. No test sends a message. CI runs these commands and uploads screenshots; it never deploys the site.

## Catalogue and illustrations

`themes/themes.json` is the ordered allowlist of 28 design IDs. Each `themes/<designId>/` contains a `theme.json` and `theme.css`. The 23 occasions are grouped by `occasionId`; Birthday, Love and Christmas each have two designs. Existing design IDs remain valid.

A manifest has:

```json
{
  "id": "birthday-balloons",
  "occasionId": "birthday",
  "occasion": "Birthday",
  "name": "Pastel party",
  "greeting": "Happy Birthday",
  "group": "Celebrate",
  "symbol": "◒",
  "style": "party",
  "birthday": true,
  "milestone": false,
  "defaults": {"to": "Zoe", "message": "Have the loveliest birthday!", "from": "With love"},
  "palette": {"paper": "#fff6e9", "ink": "#443448", "accent": "#d787a7", "accent2": "#9ebdcc", "gold": "#e7ae43"},
  "defaultFontId": "fredoka",
  "features": {"opening": "balloons"}
}
```

Supported openings: `balloons`, `confetti`, `hearts`, `snow`, `flowers`, `stars`, `sparkles`, `fade`. Particles are deterministic, created only when the design changes, and stop after a few seconds. Typing, colour, illustration and font changes do not restart the opening. Reduced-motion preferences cancel motion immediately.

Add new designs to the allowlist, add their manifest/styles, and associate them with an illustration collection in `engine/illustrations.js`. Keep colours readable (at least 4.5:1 text contrast). Theme CSS decorates the editable palette rather than replacing its background/ink. The local six-font selector is global for every design.

The 36 transparent, original vectors in `stickers/library/` use descriptive IDs and labels. `LEGACY` maps all 43 previously accepted PNG-named IDs to matching artwork. `ILLUSTRATIONS` is the allowlist; arbitrary paths and external image URLs are never rendered. Original per-theme SVG paths are retained for compatibility but are not requested by the new renderer. Fonts retain their original OFL licences.

## Layout and fitting

Creator and recipient share one renderer and a responsive 3:5 canvas. Text uses natural word wrapping and preserves paragraph breaks. The signature follows the message; an optional illustration sits below in normal flex layout. Removing it gives its space back to the text. Gift links and watermark have reserved space.

Font measurements wait for the selected font and theme stylesheet, coalesce updates and check actual layout/text/artwork/gift bounds. Size adjusts from the preferred 14/16/18/20px setting down to a 14px minimum. Text is never shortened. If it cannot fit, sharing is blocked and the complete card text appears outside the canvas. Older received cards that overflow likewise offer the full text, without an internal scrollbar. Rem-based type respects browser text scaling.

## Sharing and compatibility

Cards using design defaults use version 3: a compact fixed-field array, optionally compressed using the browser's native `CompressionStream`, encoded as base64url in `view.html#c=…`. The fragment keeps message data out of HTTP requests and server logs. An uncompressed compact fallback is used when compression is unavailable or larger. Receiving compressed links requires a current browser with `DecompressionStream`.

Existing v1 and v2 `view.html?d=…` JSON links remain supported. Versions are validated, Unicode is preserved and decompression is bounded to 64 KiB. Editor limits: 120 characters for recipient, 6,000 for message, 160 for sender and 500 for gift URL; fit usually limits messages earlier. New share URLs have a 12,000-character ceiling. Optional gifts must use HTTPS and cannot contain a username/password. All displayed input uses text nodes.

A static site cannot generate tiny unique links without storage. Links contain the complete card and can still be long. Anyone with a link can read its message; do not use it for secrets. There are no trackers or external shorteners. Copy link has a selectable manual fallback; native share falls back to copying; WhatsApp has its own explicit action and popup-blocked feedback.

## Review and deploy

Review [AUDIT.md](AUDIT.md) and [docs/VALIDATION.md](docs/VALIDATION.md), inspect the screenshots and run both suites. Merge the feature pull request into `main` after review. Keep the existing GitHub Pages branch/root-folder settings: the root `index.html`, `view.html` and relative assets are ready to serve as-is. No build output, domain, DNS or Pages configuration changes are needed. To roll back, revert the merge commit; existing v1/v2 links remain supported by this branch.

## Silent Hello shop release

The storefront is `index.html`; the preserved five-step editor is `studio.html`. Shop links pass an allowlisted `design` query value into that editor. Run `python3 -u tests/shop.py` in addition to the existing suites. Two additional templates use interactive envelope and gift-box openings without changing the 13-field v3 codec. Drafts are saved only by explicit user action in local browser storage. AI is an honest availability notice, not a connected generator. See [the current delivery scope](docs/SILENT_HELLO_DELIVERY.md) for incomplete features and launch requirements.

## Universal opening release

Opening, wrapping palette, seal and celebration can now be chosen independently for all 28 designs. Enhanced cards use validated v4 framing around the unchanged 13-element v3 content array; old links retain their decoder paths. Optional local drafts persist these choices. Email and SMS prepare drafts with a copy fallback; nothing is automatically sent. Run `python3 -u tests/interactive.py` alongside the three existing commands. See [current delivery and limitations](docs/INTERACTIVE_DELIVERY.md) and [future backend specification](docs/INTERACTIVE_BACKEND.md). QR codes, additional opening mechanisms and media are not implemented.

## Physical folded-card release

Personalise now offers an opt-in paper-card journey: an addressed envelope extracts the actual illustrated cover, which opens to a separate handwritten inside page. Choose cover/inside art, cover greeting, six paper surfaces and signature style. Use close/reopen, full Replay, Skip or Read comfortably. Narrow layouts show a full-width reading page. New paper cards use validated v5 links and drafts; all v1–v4 paths remain available. Run `python3 -u tests/physical.py` in addition to the existing four commands. See [the physical-card delivery and compatibility notes](docs/PHYSICAL_CARD_DELIVERY.md). No backend, upload, paid service or DNS change is required.
