# Coordinated stationery

The folded-card renderer selects a seal and interior sketch through `engine/stationery.js`. To assign stationery to a new design, set its occasion in the catalogue. For a more specific treatment, set its optional `stationery` property to a profile ID from that module. The lookup uses the design profile first, then its occasion, any matching legacy theme, and finally the general profile.

Each profile pairs two wax colours with a symbol in `assets/stationery/seals.svg` and a line-art mask in the same directory. Keep new artwork decorative and local. The renderer places small sketches away from the text, hides right-page sketches when space is tight, and uses lower opacity on lined paper. If masks are unsupported or artwork cannot load, the gift can still be opened and read.

The creator’s **Inside decoration** checkbox applies to the entire folded interior. Turning it off stores the optional `physicalConfig.insideDecoration: false` field in existing drafts and v5 share links. Saved links that explicitly selected an illustration or chose a blank interior retain that choice. The seal still follows the profile. Paper, typography and opening controls use the existing renderer.

## Browser examples

- [Romance on plain paper](stationery-review/romance.webp)
- [Birthday on lined paper with a long message](stationery-review/birthday-lined.webp)
- [Christmas](stationery-review/christmas.webp)
- [Friendship](stationery-review/friendship.webp)
- [Decoration off](stationery-review/decoration-off.webp)

Run `node tests/stationery.mjs` for profile and share-data checks. Run `python tests/stationery.py` with Playwright and Chromium installed for creator-to-recipient browser checks. Set `CARD_ARTIFACT_DIR` to retain screenshots in a chosen location.
