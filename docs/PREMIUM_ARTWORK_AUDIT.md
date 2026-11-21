# Premium cover artwork audit

Baseline: `2c8438f` (includes coordinated stationery in PR #60). Reviewed 121 designs across 28 occasions, including 28 legacy themes and 93 catalogue entries. The design definitions reference 69 packs and 67 pack illustrations. Reviewing the unique pack and library artwork together exposed repetition that was less apparent when browsing one occasion at a time.

## Findings and priorities

| Family | Finding | Decision |
| --- | --- | --- |
| Cheeky & Clever | The wallet, price tag, discarded card and other illustrated props deliver the joke without extra decorations. | Retain all six as the benchmark. |
| Little Joys | All six older covers put a thin, framed outline where the subject should be telling a story. | First batch. Replace these six designs with complete scenes. |
| Winter Atelier | The train, lodge and fox suggest specific scenes, but share a small, framed silhouette treatment. Bells, orange and fireworks are simpler still. | Next batch candidate. Build around movement, wintry light and landscape. |
| Gilded Moments | Rings, the graduation cap and the diamond are legible but interchangeable with common symbols. Swans and the rising sun have more distinctive subject matter. | Keep the quiet formality. Prioritise rings, diamond and graduation. |
| Botanical Studio | Most use the same border and sparse line weight. Sympathy benefits from restraint. | Redraw peony, tulip and citrus first. Review sympathy separately. |
| Other catalogue packs | Stronger starting points include Robin Winter, Belated Snail, Wedding Arch and Winter Village. Repeated object art is most visible in coffee, gaming, travel, toast, music and new-home designs. | Keep characterful illustrations in place. Prioritise reused flat object packs and give each occasion its own context. |
| Legacy themes | Default library art is recognisable but often composed as a small sticker. Multiple themes share the same choices. | Review by art family, starting with default birthday, seasonal and life-event covers. Keep the existing stickers and IDs as saved-card choices. |

## Remaining weak covers to prioritise

- Winter scenes and symbols: `snow-globe-train`, `ski-lodge`, `midnight-fox`, `ribbon-bells`, `festive-orange` and `midnight-fireworks`.
- Formal and botanical outlines: `interlocking-rings`, `diamond-rays`, `laurel-letter`, `peony-study`, `tulip-market` and `citrus-blossom`.
- Reused objects: `birthday-coffee`, `belated-coffee`, `friendship-coffee`, `thanks-coffee`, `birthday-gaming`, `kids-gamer`, `retirement-travel`, `birthday-music`, `home-keys` and the shared toast artwork used by several milestone and congratulations designs.

## First batch

| Design ID | Art direction |
| --- | --- |
| `dachshund-parade` | Three dogs run through a peach birthday party with hats, trailing balloons and bunting. |
| `rocket-post` | A diagonal launch crosses stars and a ringed planet, with layered exhaust clouds and a large caption beneath. |
| `moon-cradle` | A sleeping bear and rabbit share a crescent cradle and stitched blanket in a lavender night. The existing cover greeting is Hello Little One. |
| `little-greenhouse` | Glowing windows, a garden and a curving path welcome the recipient home. The existing cover greeting is Home Sweet Home. |
| `record-day` | An angled turntable, vinyl grooves and a record sleeve on a warm listening-room palette. |
| `kayak-morning` | A tiny paddler crosses a lake at sunrise, with reflected colour, layered mountains and foreground firs. |

The original SVGs are under `stickers/illustrated/` and use no third-party assets. Existing DOM headings preserve editable and accessible cover text. Artwork metadata colours the cover and thumbnail only, so the original envelope, paper, fonts inside and coordinated seals continue through the existing renderer.

New designs use an additive `-illustrated` artwork ID in the existing compact link. Older IDs and SVGs keep their original appearance, including a historical empty cover selection that falls back to the old default. Artwork resolution continues through the local per-design allowlist.

## Review

- [All six before and after, with mobile examples](premium-artwork-review/before-after.webp)
- [Curated desktop catalogue capture alongside Cheeky & Clever](premium-artwork-review/catalogue.webp)

Browser coverage uses Chromium. Run `python tests/premium-artwork.py` to check the real catalogue, creator and recipient flow, including old and new cover IDs. Run `node tests/catalogue.mjs` for the full catalogue and compact-link tests.
