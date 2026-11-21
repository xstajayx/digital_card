# Homepage seasonal banner

The homepage renders an evergreen card banner in HTML. The browser selects at most one seasonal campaign, based on the Europe/London civil date. It loads the campaign’s local SVG before displaying it. No timer runs while the document is hidden, and the banner recalculates when the tab becomes visible or the page is restored.

## Schedule

| Campaign | First day | Last day, inclusive | Catalogue |
| --- | --- | --- | --- |
| Christmas | 1 November | 25 December | Enabled |
| Valentine’s Day | 25 January | 14 February | Enabled |
| UK Mother’s Day | 14 days before Mothering Sunday | Three Sundays before Easter | Enabled |
| Easter | 14 days before Easter Sunday | Easter Sunday | Enabled |
| St George’s Day | 16 April | 23 April | Disabled until cards exist |
| UK Father’s Day | 14 days before Father’s Day | Third Sunday of June | Enabled |
| Halloween | 14 October | 31 October | Disabled until cards exist |

Each campaign stops at midnight in London as the next day begins. During overlaps, the earliest eligible event wins. A lower `priority` number breaks ties. The scheduler handles adjacent event years and London’s 23- and 25-hour days. UTC integer days represent calendar labels internally, while the next actual UK midnight is resolved independently.

## Add or pin a campaign

1. Add an entry to `PROMOTIONS` in `engine/seasonal-banner.js`. Pick a stable ID, an occasion ID with designs in the existing catalogue, start and event functions, a tie-break priority, copy and descriptive alt text.
2. Save original artwork at `assets/seasonal/<id>.svg` with the 420 × 260 viewBox, and add its palette to `assets/seasonal-banner.css`.
3. Enable the entry once its destination has cards. Availability is checked against the modular design catalogue. A broken artwork request skips the affected promotion for that refresh.
4. For a temporary override, set `MANUAL_PROMOTION` to an enabled campaign ID or `"evergreen"`. An ineligible override falls back to the automatic schedule. Restore `null` for normal timing.

The site requires no server-side clock or scheduler. The browser’s clock supplies the current instant. Users with JavaScript disabled see the evergreen design and its working card link.

## Validation

Run `node tests/seasonal-banner.mjs` and `python -u tests/seasonal-banner.py`. Use `CARD_ARTIFACT_DIR` to save desktop and mobile captures. The browser tests use Chromium under the `/digital_card/` prefix and exercise populated CTA routes, expiry, restoration, and failover. [Review screenshots](./seasonal-review/) show representative layouts.
