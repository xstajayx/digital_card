# Interior artwork audit

Baseline `c7162ae` includes merged PR #62. Its explicit motif map left 82 public designs plain and provided artwork to 39. The plain state also hid the creator’s **Inside decoration** checkbox. This review covers all 121 public designs and gives every design an individual upright sketch tied to its cover, title or occasion. The artwork includes 108 new SVGs and 13 retained sketches, including all six Cheeky & Clever designs.

New cards come with decoration on. The same card renderer handles the live creator preview and recipient view. The renderer uses a single upper-right corner and hides the sketch when it would compete with writing. Lined paper uses a lighter opacity. Existing saved **Off**, blank interiors and explicit older artwork choices keep their meaning. Historical links with automatic decoration use the design’s current sketch.

The browser audit exercises the live creator’s checkbox for every design and opens its shared link at 320 and 1440 px. It checks that the short-message illustration matches the creator, is upright and clears the greeting, body and signature. A dense multiline message verifies that ruled paper and the complete message remain available when the sketch is hidden.

[Five mobile and desktop recipient examples](stationery-review/all-designs-samples.webp)

| Card ID | Design | Interior on baseline | Coordinated motif | Creator toggle |
| --- | --- | --- | --- | --- |
| `anniversary-toast` | Here’s to us | Plain | [Clinking glasses on a wisteria terrace](../assets/stationery/interiors/anniversary-toast.svg) | On / Off |
| `anniversary-roses` | Love, in every letter | Decorated | [Rose and folded love letter](../assets/stationery/interiors/anniversary-roses.svg) | On / Off |
| `paired-swans` | Paired Swans | Plain | [A pair of swans on dawn water](../assets/stationery/interiors/paired-swans.svg) | On / Off |
| `anniversary` | Still, always you | Decorated | [Heart above the winding autumn lane](../assets/stationery/interiors/anniversary.svg) | On / Off |
| `belated-coffee` | Better latte than never | Decorated | [Coffee van with a takeaway cup](../assets/stationery/interiors/belated-coffee.svg) | On / Off |
| `belated-snail` | Slow post, big love | Plain | [Snail bringing a delayed letter](../assets/stationery/interiors/belated-snail.svg) | On / Off |
| `birthday-car` | A classic in every way | Plain | [Vintage convertible and roadside cypress](../assets/stationery/interiors/birthday-car.svg) | On / Off |
| `birthday-beer` | A pint of birthday cheer | Plain | [Pint with a stalk of barley](../assets/stationery/interiors/birthday-beer.svg) | On / Off |
| `birthday-books` | A very good chapter | Plain | [Open book and reading lamp](../assets/stationery/interiors/birthday-books.svg) | On / Off |
| `birthday-coffee` | A whole latte love | Decorated | [Latte and croissant](../assets/stationery/interiors/birthday-coffee.svg) | On / Off |
| `birthday-gilded` | Botanical gold | Plain | [Moth and gilded foliage](../assets/stationery/interiors/birthday-gilded.svg) | On / Off |
| `champagne-stars` | Champagne Stars | Plain | [Coupe beneath night stars](../assets/stationery/interiors/champagne-stars.svg) | On / Off |
| `dachshund-parade` | Dachshund Parade | Decorated | [Dachshund and party balloon](../assets/stationery/interiors/dachshund-parade.svg) | On / Off |
| `birthday-tractor` | Field of birthday dreams | Plain | [Tractor and the low harvest sun](../assets/stationery/interiors/birthday-tractor.svg) | On / Off |
| `kayak-morning` | Kayak Morning | Plain | [Paddler and mountain reflection](../assets/stationery/interiors/kayak-morning.svg) | On / Off |
| `birthday-gin` | Let the good times be-gin | Plain | [Gin glass with a lemon garnish](../assets/stationery/interiors/birthday-gin.svg) | On / Off |
| `birthday-gaming` | Level up | Plain | [Gamepad and a pixel sparkle](../assets/stationery/interiors/birthday-gaming.svg) | On / Off |
| `birthday-baking` | Made with love | Plain | [Whisk alongside a birthday cake](../assets/stationery/interiors/birthday-baking.svg) | On / Off |
| `birthday-football` | Match-day wishes | Plain | [Match ball and goal net](../assets/stationery/interiors/birthday-football.svg) | On / Off |
| `birthday-midnight` | Midnight wishes | Plain | [Candlelit cake and a crescent moon](../assets/stationery/interiors/birthday-midnight.svg) | On / Off |
| `birthday-balloons` | Pastel party | Decorated | [Party balloons trailing ribbon](../assets/stationery/birthday.svg) | On / Off |
| `birthday-pets` | Paws for celebration | Plain | [Paw print and little cake](../assets/stationery/interiors/birthday-pets.svg) | On / Off |
| `peony-study` | Peony Study | Plain | [Peony bloom with its spare leaf](../assets/stationery/interiors/peony-study.svg) | On / Off |
| `record-day` | Record Day | Plain | [Spinning record and music notes](../assets/stationery/interiors/record-day.svg) | On / Off |
| `birthday-fishing` | Reel-y good birthday | Plain | [Fishing rod and sunrise on the lake](../assets/stationery/interiors/birthday-fishing.svg) | On / Off |
| `birthday-envelope` | Sealed golden wishes | Decorated | [Folded envelope and wax seal](../assets/stationery/interiors/birthday-envelope.svg) | On / Off |
| `birthday-garden` | The birthday garden | Plain | [Garden lantern and summer posy](../assets/stationery/interiors/birthday-garden.svg) | On / Off |
| `all-i-could-afford` | This Is All I Could Afford | Decorated | [Empty wallet and single coin](../assets/stationery/wallet.svg) | On / Off |
| `birthday-music` | Your kind of happy | Plain | [Acoustic guitar with music notes](../assets/stationery/interiors/birthday-music.svg) | On / Off |
| `christening-bloom` | Blessings in bloom | Plain | [Baptismal font and a small stem](../assets/stationery/interiors/christening-bloom.svg) | On / Off |
| `christening-dove` | Wings of kindness | Plain | [Dove on a sunlit christening morning](../assets/stationery/interiors/christening-dove.svg) | On / Off |
| `christmas-robin` | A robin’s hello | Decorated | [Robin on a snowy holly branch](../assets/stationery/interiors/christmas-robin.svg) | On / Off |
| `christmas-snow` | A winter’s hush | Decorated | [Bare winter trees and crescent moon](../assets/stationery/interiors/christmas-snow.svg) | On / Off |
| `christmas-wreath` | At your door | Decorated | [Hand-tied wreath beside a window](../assets/stationery/interiors/christmas-wreath.svg) | On / Off |
| `festive-orange` | Festive Orange | Plain | [Clove-studded orange and festive holly](../assets/stationery/interiors/festive-orange.svg) | On / Off |
| `christmas` | Forest & wishes | Decorated | [Pine branch, snowflake and ornament](../assets/stationery/winter.svg) | On / Off |
| `happy-25th-december` | Happy 25th December | Decorated | [Circled 25 on a calendar](../assets/stationery/christmas-calendar.svg) | On / Off |
| `christmas-village` | Home for the holidays | Plain | [Lit cottage and evergreen](../assets/stationery/interiors/christmas-village.svg) | On / Off |
| `midnight-fox` | Midnight Fox | Plain | [Fox and clear winter moon](../assets/stationery/interiors/midnight-fox.svg) | On / Off |
| `christmas-gold` | Midwinter gold | Plain | [Engraved gold bauble and glints](../assets/stationery/interiors/christmas-gold.svg) | On / Off |
| `ribbon-bells` | Ribbon Bells | Plain | [Bell beside a curling ribbon](../assets/stationery/interiors/ribbon-bells.svg) | On / Off |
| `ski-lodge` | Ski Lodge | Plain | [Skis crossing a mountain scene](../assets/stationery/interiors/ski-lodge.svg) | On / Off |
| `snow-globe-train` | Snow Globe Train | Decorated | [Little locomotive inside a snow globe](../assets/stationery/snow-globe.svg) | On / Off |
| `christmas-gift` | Wrapped forest wishes | Plain | [Wrapped present and fir sprig](../assets/stationery/interiors/christmas-gift.svg) | On / Off |
| `congrats-ribbons` | Let the good news fly | Decorated | [Airborne ribbons and celebratory stars](../assets/stationery/interiors/congrats-ribbons.svg) | On / Off |
| `rising-sun` | Rising Sun | Plain | [Sun above two mountain ridges](../assets/stationery/interiors/rising-sun.svg) | On / Off |
| `congrats` | You did it | Decorated | [Summit flag and hiking boots](../assets/stationery/interiors/congrats.svg) | On / Off |
| `congrats-toast` | You earned this moment | Plain | [One celebratory coupe and confetti ribbon](../assets/stationery/interiors/congrats-toast.svg) | On / Off |
| `happy-four-day-weekend` | Happy Four-Day Weekend | Decorated | [A pair of slippers](../assets/stationery/slippers.svg) | On / Off |
| `easter` | Hello, spring | Decorated | [Meadow rabbit and painted egg](../assets/stationery/interiors/easter.svg) | On / Off |
| `easter-meadow` | Spring in your step | Decorated | [Spring posy and a decorated egg](../assets/stationery/interiors/easter-meadow.svg) | On / Off |
| `diamond-rays` | Diamond Rays | Plain | [Faceted diamond catching the light](../assets/stationery/interiors/diamond-rays.svg) | On / Off |
| `engagement-toast` | The loveliest yes | Plain | [Toast beside an open engagement ring box](../assets/stationery/interiors/engagement-toast.svg) | On / Off |
| `engagement` | The next chapter | Plain | [Open book and proposal ring box](../assets/stationery/interiors/engagement.svg) | On / Off |
| `dad-tractor` | Outstanding in his field | Plain | [Tractor and a little field sprig](../assets/stationery/interiors/dad-tractor.svg) | On / Off |
| `fathers-day` | Simply the best | Plain | [Bicycle and warmth from the workshop window](../assets/stationery/interiors/fathers-day.svg) | On / Off |
| `dad-fishing` | The great catch | Plain | [Fishing rod and a reed](../assets/stationery/interiors/dad-fishing.svg) | On / Off |
| `friendship-pets` | My favourite companion | Plain | [Sleeping-basket companions signalled by a paw](../assets/stationery/interiors/friendship-pets.svg) | On / Off |
| `friendship-coffee` | Our usual table | Decorated | [Two friends’ café table and a rainy window](../assets/stationery/interiors/friendship-coffee.svg) | On / Off |
| `friendship` | You’re my sunshine | Plain | [Picnic basket in afternoon sunshine](../assets/stationery/interiors/friendship.svg) | On / Off |
| `well-tea` | A little comfort | Decorated | [Steaming teacup by a wintry window](../assets/stationery/interiors/well-tea.svg) | On / Off |
| `citrus-blossom` | Citrus Blossom | Plain | [Citrus branch with a ripe lemon](../assets/stationery/interiors/citrus-blossom.svg) | On / Off |
| `get-well` | Rest & little joys | Plain | [Steaming soup and restorative tea](../assets/stationery/interiors/get-well.svg) | On / Off |
| `good-luck` | A little good fortune | Plain | [Little field mouse and four-leaf clover](../assets/stationery/interiors/good-luck.svg) | On / Off |
| `luck-new-chapter` | Your next great chapter | Plain | [Open gate and walking boots](../assets/stationery/interiors/luck-new-chapter.svg) | On / Off |
| `laurel-letter` | Laurel Letter | Plain | [Rolled diploma and a laurel sprig](../assets/stationery/interiors/laurel-letter.svg) | On / Off |
| `graduation` | On to wonderful things | Plain | [Graduation cap and sunlit college arch](../assets/stationery/interiors/graduation.svg) | On / Off |
| `graduation-world` | The world is waiting | Plain | [Globe and graduation cap](../assets/stationery/interiors/graduation-world.svg) | On / Off |
| `justbecause-book` | A small good thing | Plain | [Cat dozing beside an open book](../assets/stationery/interiors/justbecause-book.svg) | On / Off |
| `just-because` | Little lovely things | Plain | [Cherries and a short note](../assets/stationery/interiors/just-because.svg) | On / Off |
| `no-expense-spared` | No Expense Spared | Decorated | [Receipt for £0.00](../assets/stationery/receipt.svg) | On / Off |
| `justbecause-sea` | Postcard of a feeling | Plain | [A sailboat and a coastal flower](../assets/stationery/interiors/justbecause-sea.svg) | On / Off |
| `saving-the-planet` | Saving the Planet | Decorated | [Tree in a superhero cape](../assets/stationery/hero-tree.svg) | On / Off |
| `youd-only-throw-it-away` | You'd Only Throw It Away | Decorated | [Card landing in a recycling bin](../assets/stationery/recycling.svg) | On / Off |
| `kids-gamer` | Birthday player one | Plain | [Arcade cabinet and gamepad](../assets/stationery/interiors/kids-gamer.svg) | On / Off |
| `kids-party` | Little big party | Decorated | [Teddy bear and picnic party balloon](../assets/stationery/interiors/kids-party.svg) | On / Off |
| `kids-dinosaur` | Roar, it’s your day | Plain | [Party dinosaur beside a tiny cake](../assets/stationery/interiors/kids-dinosaur.svg) | On / Off |
| `rocket-post` | Rocket Post | Plain | [Rocket launching through space](../assets/stationery/interiors/rocket-post.svg) | On / Off |
| `love-rose-note` | A rose for your pocket | Decorated | [Rose slipped into a coat pocket](../assets/stationery/interiors/love-rose-note.svg) | On / Off |
| `love` | Blushing hearts | Decorated | [Heart-shaped lantern and evening stars](../assets/stationery/interiors/love.svg) | On / Off |
| `love-letters` | Love letters | Decorated | [Quill and ribbon-tied letter](../assets/stationery/interiors/love-letters.svg) | On / Off |
| `love-bookish` | My favourite story | Plain | [Open book with blossom](../assets/stationery/interiors/love-bookish.svg) | On / Off |
| `birthday-milestone` | A golden chapter | Plain | [Gilt book and birthday candlelight](../assets/stationery/interiors/birthday-milestone.svg) | On / Off |
| `milestone-toast` | A toast to you | Plain | [Art deco champagne tower and star glints](../assets/stationery/interiors/milestone-toast.svg) | On / Off |
| `milestone-candles` | Light up your next chapter | Plain | [Three distinctly shaped candles and sparkles](../assets/stationery/interiors/milestone-candles.svg) | On / Off |
| `mothers-day` | A garden of love | Plain | [Garden watering can and spring flowers](../assets/stationery/interiors/mothers-day.svg) | On / Off |
| `mum-garden` | Love that keeps growing | Plain | [Transplanted seedling and garden trowel](../assets/stationery/interiors/mum-garden.svg) | On / Off |
| `mum-baking` | The sweetest kind of love | Plain | [Rolling pin and a tiny heart](../assets/stationery/interiors/mum-baking.svg) | On / Off |
| `tulip-market` | Tulip Market | Decorated | [Tulip and two leaves](../assets/stationery/tulip.svg) | On / Off |
| `baby-nest` | A little more love | Plain | [Woven nest and the mother bird](../assets/stationery/interiors/baby-nest.svg) | On / Off |
| `new-baby` | Hello, little star | Decorated | [Nursery star mobile and teddy bear](../assets/stationery/interiors/new-baby.svg) | On / Off |
| `moon-cradle` | Moon Cradle | Decorated | [Crescent moon and small stars](../assets/stationery/nursery.svg) | On / Off |
| `baby-moon` | Moonlight, little one | Decorated | [Little rabbit on a crescent moon](../assets/stationery/interiors/baby-moon.svg) | On / Off |
| `home-cottage` | A little place called home | Plain | [Cottage with a climbing rose](../assets/stationery/interiors/home-cottage.svg) | On / Off |
| `little-greenhouse` | Little Greenhouse | Plain | [Glass greenhouse and seedling](../assets/stationery/interiors/little-greenhouse.svg) | On / Off |
| `home-keys` | The keys to lovely | Plain | [New front-door key and a dried sprig](../assets/stationery/interiors/home-keys.svg) | On / Off |
| `newyear-toast` | Here’s to what comes next | Plain | [Paired champagne glasses and fireworks](../assets/stationery/interiors/newyear-toast.svg) | On / Off |
| `midnight-fireworks` | Midnight Fireworks | Plain | [Two fireworks over the skyline](../assets/stationery/interiors/midnight-fireworks.svg) | On / Off |
| `new-year` | Midnight magic | Plain | [Midnight clock tower and fireworks](../assets/stationery/interiors/new-year.svg) | On / Off |
| `retirement-fishing` | Gone fishing | Plain | [Little fishing boat and line](../assets/stationery/interiors/retirement-fishing.svg) | On / Off |
| `retirement-travel` | Out of office, into the world | Plain | [Travel case and globe](../assets/stationery/interiors/retirement-travel.svg) | On / Off |
| `retirement-garden` | Time to grow | Plain | [Potting trowel and dahlia-like bloom](../assets/stationery/interiors/retirement-garden.svg) | On / Off |
| `sorry-letter` | A little note, a lot of heart | Plain | [Letter sealed with a pressed flower](../assets/stationery/interiors/sorry-letter.svg) | On / Off |
| `sorry` | From the heart | Plain | [Two hands reaching toward each other](../assets/stationery/interiors/sorry.svg) | On / Off |
| `forget-me-not` | Forget Me Not | Decorated | [Small, quiet flowering stem](../assets/stationery/quiet-stem.svg) | On / Off |
| `sympathy-dove` | Held in love | Decorated | [A dove carrying an olive sprig](../assets/stationery/interiors/sympathy-dove.svg) | On / Off |
| `sympathy-lilies` | Quietly beside you | Decorated | [White lily rendered as a quiet line drawing](../assets/stationery/interiors/sympathy-lilies.svg) | On / Off |
| `thank-you` | Kindness in bloom | Plain | [Wildflowers and a doorstep window](../assets/stationery/interiors/thank-you.svg) | On / Off |
| `thanks-peonies` | Kindness, in full bloom | Plain | [Wrapped peony with curling ribbon](../assets/stationery/interiors/thanks-peonies.svg) | On / Off |
| `olive-branch` | Olive Branch | Plain | [Olive foliage and a pair of olives](../assets/stationery/interiors/olive-branch.svg) | On / Off |
| `thanks-coffee` | Thanks a latte | Decorated | [Latte with the barista’s offered hand](../assets/stationery/interiors/thanks-coffee.svg) | On / Off |
| `thanks-gold` | You’re golden | Plain | [Sunbeam on a small ribbon-wrapped gift](../assets/stationery/interiors/thanks-gold.svg) | On / Off |
| `thinking-of-you` | A note of comfort | Plain | [Candle beside a folded note](../assets/stationery/interiors/thinking-of-you.svg) | On / Off |
| `thinking-coast` | Across the quiet miles | Plain | [Chalk cliffs and a small sailboat](../assets/stationery/interiors/thinking-coast.svg) | On / Off |
| `wildflower-post` | Wildflower Post | Plain | [Wildflower posy with butterfly](../assets/stationery/interiors/wildflower-post.svg) | On / Off |
| `valentines-day` | Be my Valentine | Decorated | [Pair of lovebirds with one heart](../assets/stationery/interiors/valentines-day.svg) | On / Off |
| `valentine-roses` | Love in bloom | Decorated | [Two roses from the Valentine garden](../assets/stationery/interiors/valentine-roses.svg) | On / Off |
| `wedding-gold` | Golden promises | Plain | [Joining hands and a diamond glint](../assets/stationery/interiors/wedding-gold.svg) | On / Off |
| `interlocking-rings` | Interlocking Rings | Decorated | [Pair of interlocking rings](../assets/stationery/rings.svg) | On / Off |
| `wedding` | Together in bloom | Plain | [Flower-strewn garden path and wedding blossom](../assets/stationery/interiors/wedding.svg) | On / Off |
| `wedding-arch` | Under the blossom arch | Plain | [Ceremony arch and floral posy](../assets/stationery/interiors/wedding-arch.svg) | On / Off |
