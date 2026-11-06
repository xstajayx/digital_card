# Static illustrated catalogue

The public catalogue now has **91 designs / 28 occasions**: the original 28 design manifests plus 63 curated designs, composed from 39 reusable packs and 37 new original SVG scenes. Five added occasions: Belated Birthday, Christening, Retirement, New Home and Sympathy. All original design and illustration IDs remain valid.

## Content model

- `catalogue/occasions.js`: occasion groups, greetings, message suggestions and age flags.
- `catalogue/styles.js`: shared palette, font and layout recipes.
- `catalogue/art-packs.js`: local artwork IDs, descriptive labels, palette, font recommendations, coordinated envelope, effect and cover-name policy. Packs reuse vectors rather than embedding SVG in each design.
- `catalogue/designs.js`: curated design names, pack references, cover subtitles, relationship/recipient/tone tags. Each new design has a stable ID.
- `engine/catalogue.js`: composition, filtering and new-design recommendations. `loadThemes()` appends composed designs to the original manifest allowlist. The original manifests and defaults are unchanged.
- `stickers/packs/`: 37 local, transparent, original SVG scenes (200×180), each under 7 KiB. No remote images, fonts inside images, script, raster data or external references. Existing library art can be mixed into a pack.

Styles include floral, luxury, minimal, playful, traditional, coastal, romantic, cosy, gentle and modern. Interests include fishing, football, gaming, gardening, music, books, travel, coffee/tea, pets, countryside, beer, gin, baking, cars and tractors. Metadata also supports recipient types, relationships and tones; relationship/interest/style/mood filters are available in the shop. Recipient types currently support metadata and future curation rather than an additional shop control.

To add a pack, add safe SVG assets and an `ART_PACKS` entry, choosing a shipped `cssThemeId`. Add a curated `DESIGNS` entry referencing an occasion and pack. Run `node tests/catalogue.mjs` and `python3 -u tests/catalogue.py`. Do not rename published IDs: shared links depend on them. No content-generation command or build step is required.

## Static sendability contract

Every standard design, in every one of the 28 occasions, is shareable using **only GitHub Pages/static files**. The renderer and recipient resolve allowlisted local design/art IDs. New cards still use v5; existing v1–v5 readers and the compact 13-field base array are unchanged. No image bytes, SVG strings, catalogue metadata, remote image paths, media IDs or backend lookup go into a standard link. Ordinary links use the URL fragment and do not disclose messages in server requests. Native compression remains optional. These are complete card links, not short server-generated URLs.

The new-design defaults are applied only at initial creation or an explicit design choice. Decoding old cards never applies recommendations. Folded mode and the existing envelope → cover → inside flow stay in place, with an explicitly empty cover name. A sender-written inside message and chosen font survive subsequent design selection. My Occasions, Prepared Cards, local drafts and photo storage keys are unchanged.

## Hosted photos are separate

Photos still use the existing opt-in local editor and configured hosted backend. The independent backend allowlist retains its original 28 photo-supported designs. New illustrated designs do not silently become hosted-photo designs: publishing a photo on one explains that an original supported design must be selected, preserving the local edit. No backend-only occasion is introduced. It is the **photo/hosted transport**, not any ordinary occasion, that needs storage/API services.

`HOSTED_API`, CNAME, DNS and Pages settings are unchanged. Standard sharing never calls Railway. `tests/catalogue.py` blocks every non-local request and verifies card creation, copying the v5 link and receiving its full folded journey.

## Storefront

Featured collections lead into occasion browsing, with progressively disclosed style/relationship/interest/mood filters. All filters combine and have a clear empty state and reset. The grid is built once, with lazy local images; filtering preserves existing nodes. Quick preview uses the real folded renderer, with envelope/front/inside stage buttons and an allowlisted creator link. New design thumbnails use their recommended art, palette and cover font.

## Review and release

1. Review the content, [audit](AUDIT.md), [test evidence](VALIDATION.md), and committed mobile/desktop screenshots.
2. Run the commands in VALIDATION.md and wait for existing CI checks.
3. Merge the feature PR into `main` after review. Let the existing GitHub Pages deployment publish it; no settings, domain, DNS or backend deployment changes are needed for static cards.
4. Revert the merge to roll back this catalogue. Newly sent design IDs would need to be retained for long-term compatibility; avoid sending production links from unmerged previews.

No merge or deployment is performed by this change.

## Next content phase

Commission larger illustration sets, expand within the less-served categories, and conduct human editorial/accessibility review with real recipients. Current artwork is original vector illustration, not photography or licensed third-party art. Additional cover layouts can be introduced independently of stable packs/IDs. Extending hosted photo publication to new packs requires an explicit, separately tested backend allowlist update. No paid shop/checkout or URL-shortening service is introduced.
