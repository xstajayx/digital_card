# Catalogue and interior artwork audit

Baseline is `2dd892c`, after PRs #60 and #61. The table inventories the 121 public card designs across 28 occasions using the same legacy themes and catalogue definitions as the static storefront. The interior columns describe automatic decoration. Older links with an explicit inside-art choice continue to use that choice.

| Total designs | Premium at baseline | Needing improvement at baseline | Upgraded here | Remaining | Technically blocked |
| --- | --- | --- | --- | --- | --- |
| 121 | 12 | 109 | 73 | 36 | 0 |

The follow-up introduces 69 original, individually commissioned gouache-style cover scenes. The production art was generated during development, reviewed per design and exported to local WebP files. New links explicitly store the stable `-cover-v2` ID. Historical asset IDs and unversioned automatic fallback remain available. The inventory identifies the 36 remaining designs.

## Cover additions

- **Tulip Market** uses a paper-wrapped market bouquet on a warm counter.
- **Forget Me Not** uses a quiet botanical study with soft foliage and blue flowers.
- **Snow Globe Train** uses a miniature train circling a snowy landscape.
- **Interlocking Rings** uses layered gold rings and restrained engraving-inspired foliage.

Each cover has a new explicit `-illustrated` artwork ID. Old IDs still point to their original assets. Empty historical cover fields retain their original fallback. No payload version or site hosting changes were necessary.

## Interior and creator treatment

The old automatic renderer repeated its motif across the corners and rotated the lower copy, including recognisable subjects. The revised renderer uses at most one upright corner and leaves the inside clean when there is no deliberate design match. Dense text suppresses the corner. The existing toggle stays available where a sketch can be shown. Coordinated seal colour and embossing still use the original occasion profiles.

The creator uses the selected design’s cover automatically. Photograph placement retains the cover and inside modes. Old links and drafts keep their stored choices. The card imprint reads **Silent Hello**, and flowers and Heart Jars use their existing recipient wordmark as the single mark.

## Visual review

- [New covers beside their original versions, with mobile examples](gift-art-review/covers.webp)
- [Curated catalogue capture](gift-art-review/catalogue.webp)
- [Interior before and after](gift-art-review/interior-before-after.webp)
- [Mobile inside pages and all six Cheeky & Clever sketches](gift-art-review/interiors.webp)
- [Desktop spreads showing both pages](gift-art-review/interiors-desktop.webp)
- [Creator controls](gift-art-review/creator.webp)
- [Card maker’s mark](gift-art-review/interiors.webp), [Digital Flowers](gift-art-review/flower-recipient.webp), and [Heart Jar](gift-art-review/jar-recipient.webp)

## Card-by-card inventory

| Stable ID | Name | Occasion | Cover status | Follow-up priority | Previous automatic motif | Current automatic motif |
| --- | --- | --- | --- | --- | --- | --- |
| `anniversary-toast` | Here’s to us | anniversary | Upgraded in follow-up | — | rose | Plain |
| `anniversary-roses` | Love, in every letter | anniversary | Upgraded in follow-up | — | rose | rose |
| `paired-swans` | Paired Swans | anniversary | Upgraded in follow-up | — | rose | Plain |
| `anniversary` | Still, always you | anniversary | Upgraded in follow-up | — | rose | hearts |
| `belated-coffee` | Better latte than never | belated-birthday | Upgraded in follow-up | — | botanical | coffee |
| `belated-snail` | Slow post, big love | belated-birthday | Upgraded in follow-up | — | botanical | Plain |
| `birthday-car` | A classic in every way | birthday | Upgraded in follow-up | — | birthday | Plain |
| `birthday-beer` | A pint of birthday cheer | birthday | Upgraded in follow-up | — | birthday | Plain |
| `birthday-books` | A very good chapter | birthday | Upgraded in follow-up | — | birthday | Plain |
| `birthday-coffee` | A whole latte love | birthday | Upgraded in follow-up | — | birthday | coffee |
| `birthday-gilded` | Botanical gold | birthday | Upgraded in follow-up | — | birthday | Plain |
| `champagne-stars` | Champagne Stars | birthday | Upgraded in follow-up | — | birthday | Plain |
| `dachshund-parade` | Dachshund Parade | birthday | Retain · premium | — | birthday | birthday |
| `birthday-tractor` | Field of birthday dreams | birthday | Upgraded in follow-up | — | birthday | Plain |
| `kayak-morning` | Kayak Morning | birthday | Retain · premium | — | birthday | Plain |
| `birthday-gin` | Let the good times be-gin | birthday | Upgraded in follow-up | — | birthday | Plain |
| `birthday-gaming` | Level up | birthday | Upgraded in follow-up | — | birthday | Plain |
| `birthday-baking` | Made with love | birthday | Upgraded in follow-up | — | birthday | Plain |
| `birthday-football` | Match-day wishes | birthday | Upgraded in follow-up | — | birthday | Plain |
| `birthday-midnight` | Midnight wishes | birthday | Upgraded in follow-up | — | birthday | Plain |
| `birthday-balloons` | Pastel party | birthday | Upgraded in follow-up | — | birthday | birthday |
| `birthday-pets` | Paws for celebration | birthday | Upgraded in follow-up | — | birthday | Plain |
| `peony-study` | Peony Study | birthday | Upgraded in follow-up | — | birthday | Plain |
| `record-day` | Record Day | birthday | Retain · premium | — | birthday | Plain |
| `birthday-fishing` | Reel-y good birthday | birthday | Upgraded in follow-up | — | birthday | Plain |
| `birthday-envelope` | Sealed golden wishes | birthday | Upgraded in follow-up | — | birthday | birthday |
| `birthday-garden` | The birthday garden | birthday | Upgraded in follow-up | — | birthday | Plain |
| `all-i-could-afford` | This Is All I Could Afford | birthday | Retain · premium | — | birthday | wallet |
| `birthday-music` | Your kind of happy | birthday | Upgraded in follow-up | — | birthday | Plain |
| `christening-bloom` | Blessings in bloom | christening | Upgraded in follow-up | — | botanical | Plain |
| `christening-dove` | Wings of kindness | christening | Upgraded in follow-up | — | botanical | Plain |
| `christmas-robin` | A robin’s hello | christmas | Upgraded in follow-up | — | mistletoe | mistletoe |
| `christmas-snow` | A winter’s hush | christmas | Upgraded in follow-up | — | winter | winter |
| `christmas-wreath` | At your door | christmas | Upgraded in follow-up | — | winter | mistletoe |
| `festive-orange` | Festive Orange | christmas | Improve · repeated outline frame | 1 | winter | Plain |
| `christmas` | Forest & wishes | christmas | Improve · shared library artwork | 1 | winter | winter |
| `happy-25th-december` | Happy 25th December | christmas | Retain · premium | — | winter | christmas-calendar |
| `christmas-village` | Home for the holidays | christmas | Improve · flat pack art | 1 | winter | Plain |
| `midnight-fox` | Midnight Fox | christmas | Improve · repeated outline frame | 1 | winter | Plain |
| `christmas-gold` | Midwinter gold | christmas | Improve · flat pack art | 1 | winter | Plain |
| `ribbon-bells` | Ribbon Bells | christmas | Improve · repeated outline frame | 1 | winter | Plain |
| `ski-lodge` | Ski Lodge | christmas | Upgraded in follow-up | — | winter | Plain |
| `snow-globe-train` | Snow Globe Train | christmas | Upgraded in this PR | — | winter | snow-globe |
| `christmas-gift` | Wrapped forest wishes | christmas | Upgraded in follow-up | — | winter | Plain |
| `congrats-ribbons` | Let the good news fly | congratulations | Upgraded in follow-up | — | celebrate | celebrate |
| `rising-sun` | Rising Sun | congratulations | Upgraded in follow-up | — | celebrate | Plain |
| `congrats` | You did it | congratulations | Upgraded in follow-up | — | celebrate | celebrate |
| `congrats-toast` | You earned this moment | congratulations | Upgraded in follow-up | — | celebrate | Plain |
| `happy-four-day-weekend` | Happy Four-Day Weekend | easter | Retain · premium | — | spring | slippers |
| `easter` | Hello, spring | easter | Improve · shared library artwork | 2 | spring | spring |
| `easter-meadow` | Spring in your step | easter | Improve · flat pack art | 2 | spring | spring |
| `diamond-rays` | Diamond Rays | engagement | Improve · repeated outline frame | 2 | hearts | Plain |
| `engagement-toast` | The loveliest yes | engagement | Improve · flat pack art | 2 | hearts | Plain |
| `engagement` | The next chapter | engagement | Improve · shared library artwork | 2 | hearts | Plain |
| `dad-tractor` | Outstanding in his field | fathers-day | Improve · flat pack art | 2 | botanical | Plain |
| `fathers-day` | Simply the best | fathers-day | Improve · shared library artwork | 2 | botanical | Plain |
| `dad-fishing` | The great catch | fathers-day | Improve · flat pack art | 2 | botanical | Plain |
| `friendship-pets` | My favourite companion | friendship | Improve · flat pack art | 2 | botanical | Plain |
| `friendship-coffee` | Our usual table | friendship | Improve · flat pack art | 2 | botanical | coffee |
| `friendship` | You’re my sunshine | friendship | Improve · shared library artwork | 2 | botanical | Plain |
| `well-tea` | A little comfort | get-well | Improve · flat pack art | 2 | botanical | coffee |
| `citrus-blossom` | Citrus Blossom | get-well | Upgraded in follow-up | — | botanical | Plain |
| `get-well` | Rest & little joys | get-well | Upgraded in follow-up | — | botanical | Plain |
| `good-luck` | A little good fortune | good-luck | Upgraded in follow-up | — | botanical | Plain |
| `luck-new-chapter` | Your next great chapter | good-luck | Upgraded in follow-up | — | botanical | Plain |
| `laurel-letter` | Laurel Letter | graduation | Upgraded in follow-up | — | celebrate | Plain |
| `graduation` | On to wonderful things | graduation | Upgraded in follow-up | — | celebrate | Plain |
| `graduation-world` | The world is waiting | graduation | Upgraded in follow-up | — | celebrate | Plain |
| `justbecause-book` | A small good thing | just-because | Upgraded in follow-up | — | botanical | Plain |
| `just-because` | Little lovely things | just-because | Upgraded in follow-up | — | botanical | Plain |
| `no-expense-spared` | No Expense Spared | just-because | Retain · premium | — | botanical | receipt |
| `justbecause-sea` | Postcard of a feeling | just-because | Upgraded in follow-up | — | botanical | Plain |
| `saving-the-planet` | Saving the Planet | just-because | Retain · premium | — | botanical | hero-tree |
| `youd-only-throw-it-away` | You'd Only Throw It Away | just-because | Retain · premium | — | botanical | recycling |
| `kids-gamer` | Birthday player one | kids-birthday | Upgraded in follow-up | — | birthday | Plain |
| `kids-party` | Little big party | kids-birthday | Upgraded in follow-up | — | birthday | birthday |
| `kids-dinosaur` | Roar, it’s your day | kids-birthday | Improve · flat pack art | 1 | birthday | Plain |
| `rocket-post` | Rocket Post | kids-birthday | Retain · premium | — | birthday | Plain |
| `love-rose-note` | A rose for your pocket | love | Improve · flat pack art | 2 | rose | rose |
| `love` | Blushing hearts | love | Improve · shared library artwork | 2 | rose | hearts |
| `love-letters` | Love letters | love | Improve · shared library artwork | 2 | rose | rose |
| `love-bookish` | My favourite story | love | Improve · flat pack art | 2 | rose | Plain |
| `birthday-milestone` | A golden chapter | milestone-birthday | Improve · shared library artwork | 1 | birthday | Plain |
| `milestone-toast` | A toast to you | milestone-birthday | Improve · flat pack art | 1 | birthday | Plain |
| `milestone-candles` | Light up your next chapter | milestone-birthday | Improve · flat pack art | 1 | birthday | Plain |
| `mothers-day` | A garden of love | mothers-day | Improve · shared library artwork | 1 | botanical | Plain |
| `mum-garden` | Love that keeps growing | mothers-day | Improve · flat pack art | 1 | botanical | Plain |
| `mum-baking` | The sweetest kind of love | mothers-day | Improve · flat pack art | 1 | botanical | Plain |
| `tulip-market` | Tulip Market | mothers-day | Upgraded in this PR | — | botanical | tulip |
| `baby-nest` | A little more love | new-baby | Improve · flat pack art | 1 | botanical | Plain |
| `new-baby` | Hello, little star | new-baby | Upgraded in follow-up | — | botanical | nursery |
| `moon-cradle` | Moon Cradle | new-baby | Retain · premium | — | botanical | nursery |
| `baby-moon` | Moonlight, little one | new-baby | Upgraded in follow-up | — | botanical | nursery |
| `home-cottage` | A little place called home | new-home | Upgraded in follow-up | — | botanical | Plain |
| `little-greenhouse` | Little Greenhouse | new-home | Retain · premium | — | botanical | Plain |
| `home-keys` | The keys to lovely | new-home | Upgraded in follow-up | — | botanical | Plain |
| `newyear-toast` | Here’s to what comes next | new-year | Upgraded in follow-up | — | celebrate | Plain |
| `midnight-fireworks` | Midnight Fireworks | new-year | Upgraded in follow-up | — | celebrate | Plain |
| `new-year` | Midnight magic | new-year | Improve · shared library artwork | 2 | celebrate | Plain |
| `retirement-fishing` | Gone fishing | retirement | Improve · flat pack art | 2 | botanical | Plain |
| `retirement-travel` | Out of office, into the world | retirement | Improve · flat pack art | 2 | botanical | Plain |
| `retirement-garden` | Time to grow | retirement | Improve · flat pack art | 2 | botanical | Plain |
| `sorry-letter` | A little note, a lot of heart | sorry | Improve · flat pack art | 2 | botanical | Plain |
| `sorry` | From the heart | sorry | Improve · shared library artwork | 2 | botanical | Plain |
| `forget-me-not` | Forget Me Not | sympathy | Upgraded in this PR | — | botanical | quiet-stem |
| `sympathy-dove` | Held in love | sympathy | Upgraded in follow-up | — | botanical | quiet-stem |
| `sympathy-lilies` | Quietly beside you | sympathy | Upgraded in follow-up | — | botanical | quiet-stem |
| `thank-you` | Kindness in bloom | thank-you | Upgraded in follow-up | — | botanical | Plain |
| `thanks-peonies` | Kindness, in full bloom | thank-you | Upgraded in follow-up | — | botanical | Plain |
| `olive-branch` | Olive Branch | thank-you | Upgraded in follow-up | — | botanical | Plain |
| `thanks-coffee` | Thanks a latte | thank-you | Upgraded in follow-up | — | botanical | coffee |
| `thanks-gold` | You’re golden | thank-you | Upgraded in follow-up | — | botanical | Plain |
| `thinking-of-you` | A note of comfort | thinking-of-you | Upgraded in follow-up | — | botanical | Plain |
| `thinking-coast` | Across the quiet miles | thinking-of-you | Upgraded in follow-up | — | botanical | Plain |
| `wildflower-post` | Wildflower Post | thinking-of-you | Upgraded in follow-up | — | botanical | Plain |
| `valentines-day` | Be my Valentine | valentines | Upgraded in follow-up | — | rose | hearts |
| `valentine-roses` | Love in bloom | valentines | Upgraded in follow-up | — | rose | rose |
| `wedding-gold` | Golden promises | wedding | Upgraded in follow-up | — | hearts | Plain |
| `interlocking-rings` | Interlocking Rings | wedding | Upgraded in this PR | — | hearts | rings |
| `wedding` | Together in bloom | wedding | Upgraded in follow-up | — | hearts | Plain |
| `wedding-arch` | Under the blossom arch | wedding | Upgraded in follow-up | — | hearts | Plain |
