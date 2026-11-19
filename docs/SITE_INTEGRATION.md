# Site navigation and integration

Home presents cards and flowers as equal collections. The existing card catalogue moved to `cards.html`. The homepage forwards old `#catalogue` and `?occasion=…` bookmarks to it, keeping their query and fragment. Card and flower creators and recipient URLs retain their paths. Create Your Own opens the existing card studio from the collection. The previous AI information page remains reachable by its direct URL.

## Shared navigation

Public sender pages use a native `details` and `summary` menu with ordinary relative links. This keeps the menu usable before scripts load. `assets/site.css` supplies the common header, footer and focus styles. `app/site-menu.js` provides Escape and focus return, synchronises disclosure state, and closes the menu on navigation or restoration from browser history. Each page declares its active section in HTML. The navigation test checks the same link labels and order across all sender pages. Recipient pages retain their own minimal headers.

The editors use the browser’s leave-page warning when work is unsaved. A successful local card draft save or restore, photo draft operation, or prepared-card save resets the warning. Returning from a preview keeps the current form. Flower text remains in the open editor and is not written to a new browser-storage key. Browsers decide when to present their leave warning and can skip it on forced tab closure.

## Occasions

Existing birthday and anniversary records stay in browser storage with the existing export, restore, and deletion logic. **Download backup** saves a private JSON file. **Restore from backup** imports it and asks for opt-in before replacing matching records. Calendar reminders download an ICS file for import into the user’s calendar. Gift collection links pass only the public occasion category for card filtering and no personal data.

## Static hosting and optional services

Source pages and assets use relative paths under both a project prefix and a domain root. The homepage bouquet is a static export of the existing Pastel Garden Bouquet renderer, and the card uses the existing Peony Study illustration. Both work locally. The service worker caches public shell resources and does not cache recipient pages or personal content.

The optional hosted-card configuration remains in `app/hosted-config.js` and is disabled by default. A future Railway service can provide an authenticated or abuse-resistant API without becoming a dependency of the static collections, link codecs or local storage. R2 credentials and upload authorisation belong on that server. The browser should receive only necessary scoped asset access. No infrastructure configuration is needed for this change.

## Checks

Run `python -u tests/site-navigation.py` for the site under the `/digital_card/` prefix. Existing catalogue, creator, recipient, flower, occasion and assistant suites cover the linked journeys and compatibility. [Review screenshots](./site-review/) show the homepage before and after and the mobile menu.
