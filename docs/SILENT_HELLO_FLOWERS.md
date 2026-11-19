# Silent Hello Flowers

The storefront links to `flowers.html`. Each product opens `flower-studio.html?flower=<id>`, and shares use `rose-view.html` for both old and new gifts. `rose.html` still opens the Blush Rose creator. The card creator, viewer and format keep their existing routes and code.

## Collection and rendering

- `engine/flowers/catalogue.js` contains the eight singles and six bouquets, filter tags, colour palettes and bouquet recipes. A head supplies a species, palette, position, rotation and scale. Recipes are drawn back to front. Stem, foliage and paper wrapping are drawn first.
- `engine/flowers/artwork.js` contains the original vector petal paths and six species definitions. Each specifies closed and intermediate proportions, opening twist, timing, core treatment and ordered petal layers. All paths and palettes are local. The existing photographic Living Rose source assets are retained in the repository.
- `engine/flowers/render.js` builds one SVG with a stable viewBox. `renderFlowers(container, product, opened)` returns `draw(elapsedMs)` and `duration`. Each petal interpolates continuously between closed, intermediate and open poses. Bouquet heads have overlapping staggered timelines. The final frame uses the same shapes as the animation.
- `app/flower-presentation.js` is shared by the creator dialog and recipient page. It controls activation, replay, completion, reduced motion, fallbacks and message visibility. It returns a teardown function that cancels pending rendering. The catalogue and live editor use the same renderer in its open pose.

To add a flower, add a catalogue item with a stable ID and species, palette and occasion tags. To add a bouquet, compose a back-to-front list of heads in the 360 × 410 viewBox and check the finished silhouette and bud grouping at phone size. For a new species, add petal path data and stage proportions in the artwork module. Add a core treatment in the renderer if it needs one. Keep singles near 5–7 seconds and bouquets near 7–12 seconds.

## Links and recipient state

New links use `#f=` followed by bounded, unpadded Base64URL UTF-8 JSON with the six fields `[2, productId, id, greeting, message, signature]`. Text limits are 100, 1000 and 100 UTF-16 units respectively. The random ID stays stable across retransmission of the same composition from the same open creator. The product ID must exist in the local catalogue. Text renders as text nodes. The fragment is readable and forwardable by anyone with the complete link.

The original `#r=` v1 decoder still accepts both rose growth modes. Both map to the immediate Blush Rose animation. A legacy keepsake already saved in the same browser opens fully bloomed. New completion records contain only a marker under the product and gift ID. Blocked storage affects return behaviour only. There is no cross-device state.

## Verification

```sh
node tests/flowers.mjs
CARD_ARTIFACT_DIR=/tmp/silent-hello-artifacts python -u tests/flowers.py
```

The Chromium suite tests all 14 products from catalogue to recipient, selected desktop and mobile widths, keyboard preview, replay, legacy links, sharing fallbacks, rendering and animation faults, and reduced motion. It saves screenshots and ordered bloom frames under the artifact directory. Native share and WhatsApp are intercepted.

The focused Chromium run passed at 320, 360, 390, 430, 768 and 1440 px. The existing card creator regression also passed at 390 and 1440 px, including checks across 115 card designs. See [review screenshots and a sampled bouquet bloom](./flowers-review/).
