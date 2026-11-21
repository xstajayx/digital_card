# Coordinated stationery

The folded-card renderer selects a seal and interior sketch through `engine/stationery.js`. To assign stationery to a new design, set its occasion in the catalogue. For a more specific treatment, set its optional `stationery` property to a profile ID from that module. The lookup uses the design profile first, then its occasion, any matching legacy theme, and finally the general profile.

Each seal profile pairs two wax colours with a symbol in `assets/stationery/seals.svg`. The independent `interiorMotifs` mapping opts individual card IDs into upright local line art. Use one sketch that relates to the cover or leave the interior undecorated. The renderer positions the sketch in the upper-right corner, hides it when space is tight, and lowers its opacity on lined paper. If masks are unsupported or artwork cannot load, the gift can still be opened and read.

The creator’s **Inside decoration** checkbox applies to the entire folded interior. Turning it off stores the optional `physicalConfig.insideDecoration: false` field in existing drafts and v5 share links. Saved links that explicitly selected an illustration or chose a blank interior retain that choice. The seal still follows the profile. Paper, typography and opening controls use the existing renderer.

## Original rollout examples

- [Romance on plain paper](stationery-review/romance.webp)
- [Birthday on lined paper with a long message](stationery-review/birthday-lined.webp)
- [Christmas](stationery-review/christmas.webp)
- [Friendship](stationery-review/friendship.webp)
- [Decoration off](stationery-review/decoration-off.webp)

Run `node tests/stationery.mjs` for profile and share-data checks. Run `python tests/stationery.py` with Playwright and Chromium installed for creator-to-recipient browser checks. Set `CARD_ARTIFACT_DIR` to retain screenshots in a chosen location.
