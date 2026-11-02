# Silent Hello — first shop increment

Branch: `feat/silent-hello-shop`, based on `ca175e2` from the preceding studio feature branch. Production `main` was last observed at `0648fb2`; this delivery includes the preceding unmerged studio work. Review the cumulative diff before merging. No deployment or DNS action is included.

## Scope and status

| Requested capability | Status | Delivered / outstanding |
| --- | --- | --- |
| Phase 0 audit and baseline | COMPLETE | See SILENT_HELLO_AUDIT.md. Baseline: 12 data tests and 24 browser check groups passed before source changes. |
| Silent Hello brand and storefront | COMPLETE for this increment | Responsive homepage, navigation, mobile menu, catalogue, previews, customise links, how-it-works, FAQs and information links. No commercial promises or checkout. |
| Catalogue filtering | PARTIAL | Text search, occasion, collection and opening filters work. Recipient, age, mood, palette and dedicated style filters remain outstanding. |
| Existing editor, themes, artwork, fonts and links | COMPLETE preservation | Five steps, fitting, original theme files/IDs, SVGs/aliases, fonts/licences, gifts and all sharing actions retained. Editor moves to studio.html; view.html links keep their paths. |
| Design expansion | PARTIAL | Two additional templates, 28 total. Sealed golden wishes and Wrapped forest wishes introduce interactive openings. Fishing, gaming, retro, retirement and the rest of the requested expansion are not started. |
| Interactive openings | COMPLETE for first two mechanisms | Envelope flap and gift-box lift animate on activation. Tap/click, keyboard, Replay, Skip, reduced motion, guarded cancellation and completion events. Existing eight effects remain. Additional mechanisms not started. |
| Local drafts | COMPLETE | Explicit save, validated restore and deletion in this browser. No automatic persistence, account or cloud storage. Storage failures show feedback. |
| Advanced editor | NOT STARTED | Editable greeting, alignment/layout presets, undo/redo and opening selection independent of template need compatible schema design and tests. Existing controls are retained. |
| AI Studio | PARTIAL availability page only | ai.html honestly states no generation service exists. There is no simulated generation, prompt submission or model key. Provider/jobs/entitlements/moderation remain not started. |
| Media, backend, accounts, payments, scheduling and exports | NOT STARTED | Deliberately absent; free static creation works without them. |
| Legal notices | PARTIAL, owner review required | Static privacy/storage/cookie/terms/contact/AI notices explain actual behavior. Verified support identity and reporting address are owner requirements, not invented details. Not ready for commercial launch. |
| Pull request creation | BLOCKED BY EXTERNAL CONFIGURATION | Existing GitHub API proxy restriction may prevent gh from creating a PR. Branch push is separate from PR creation. |

## Architecture and compatibility

The shop consumes the same manifest catalogue and original illustration allowlist as the editor. Thumbnails are local CSS/SVG compositions; the preview modal uses the real shared renderer. Design selection is a validated query lookup, not an arbitrary asset URL. Preview initialization is shared and version-guarded.

The v1/v2/v3 codec and 13-element compact array are unchanged. New opening choices are properties of two new allowlisted templates, so the existing v3 theme ID carries them end-to-end. A v4 document is intentionally not introduced until user-editable fields require it. No photos or embedded media are added to URLs.

The additive opening controller exposes `reset(type, onReveal)`, maintains idle/ready/opening/revealed/complete states on `data-opening-state`, and emits `card-opening-complete`. Reset cancels stale animations; Skip bypasses or cancels an active reveal. Card content and overflow safeguards remain in the original renderer. There are no infinite effects.

Draft storage uses `silent-hello-draft-v1`. Restore resolves a current allowlisted theme and validates content through the existing validator. Drafts stay accessible to anyone using that browser; Save and Delete are explicit actions. Full reset of the browser's site storage also removes them.

## Executed validation

2 November 2026, Chromium on Linux:

- `node tests/data.mjs`: 12 passed, zero failed/skipped; legacy codec compatibility retained.
- `python3 -u tests/browser.py`: 24 check groups passed at 360×800, 390×844, 768×1024 and 1440×900, now including all 28 designs. No JavaScript errors or failed local assets.
- `python3 -u tests/shop.py`: four viewport groups exercise all thumbnails, filters, live preview, design routing, keyboard activation, Replay/Skip, reduced motion, save/reload/restore/delete drafts and v3 recipient opening compatibility.
- JavaScript syntax and whitespace checks are run before commit.

Screenshots were actually captured under `/workspace/onboarding/silent-hello/`; selected shop screenshots accompany this report. Existing full editor/recipient artifacts remain under `/workspace/onboarding/polished-studio/`. Mobile and desktop shop screenshots were visually inspected. Physical devices, screen readers, Safari/Firefox, native sharing apps and remote CI execution are not claimed as tested.

## Configuration, deployment and rollback

No new application environment variables, credentials or backend services are needed. Serve the repository root with a static HTTP server. `index.html` is the shop, `studio.html` is the editor, and `view.html` remains the recipient route. Relative module/font/theme/artwork paths support both the GitHub Pages `/digital_card/` prefix and a future root domain. No CNAME or DNS change is included.

Run all three test commands, review the cumulative feature diff and owner notices, then merge through a PR. Retain the current Pages branch/root settings. A future silenthello.co.uk domain requires a separate explicit deployment/DNS review. Roll back by reverting this increment (or the cumulative merge); no database migration exists. Existing share codecs remain intact.

## Later architecture boundary

Before Phase 3, define and test a v4 migration layer and explicit media storage references. Keep legacy URL cards functional. A separately deployed FastAPI service can use PostgreSQL migrations and private object storage; owner routes must be authenticated, public card tokens opaque/hashed, and expiry/revocation/deletion supported. Uploaded raster files need signature/dimension/size checks and metadata stripping. Never accept active SVG/HTML uploads.

AI requires server-held provider credentials, bounded async jobs, rate/cost limits, moderation, usage accounting and consent before processing identifiable photos. Payments require server-verified Checkout/webhooks and idempotent fulfilment. None of these routes, secrets or services is exposed by this static increment. Verified business details, legal review and abuse-handling procedures are prerequisites to commercial launch.
