# Audit of main

Base: `fff4bfd`, merge of assistant PR #37. Dedicated branch: `feat/creator-ux-redesign`.

The existing shop has 23 occasions and 28 designs with theme-based defaults/artwork. It supports filtered browsing, real preview and `studio.html?design=` entry. Preserve it.

`studio.html`/`app/ui.js` used Occasion, Design, Message, Personalise, Share. Large introductory copy delayed the controls, mobile preview was hidden until Share, and opening/physical/photo/palette controls accumulated in Personalise. Physical presentation existed behind an opt-in checkbox; To was automatically repeated on the physical cover.

`engine/card-renderer.js`, `engine/physical-card.js` and the opening engines already implement envelope extraction, the attached front cover, fold/unfold/close/replay, reduced motion and complete-message access. Retain the controllers and artwork. The new layout uses their existing preview-stage API.

`engine/card-data.js` and `engine/share-codec.js` support bounded v1/v2 query data and compact/compressed v3–v5 fragment links. v5 wraps physical fields independently from the inside message. Preserve those codecs. Add only optional physical cover-name semantics to distinguish new omitted names from historical default names, plus existing-font allowlist expansion.

`app/drafts.js` saves explicit lightweight local drafts. `app/photo-card.js`, `photo-image.js` and `photo-drafts.js` already validate raster media, crop/zoom/rotate, strip metadata, store blobs in IndexedDB and block unavailable sharing. Reuse these features. Keep the same iframe mounted to protect photo integration and state.

Occasions and the assistant are merged. Keep migration/import/export, calendar downloads, preference generation, local scheduling demo, retention and approval gates. Existing prepared editor handoff loads the full validated configuration and must remain editable without styling overwriting custom content.

Baseline validation started before implementation; browser suites ran against an immutable archive of exact main in `/tmp/creator-baseline/digital_card` so edits could not alter baseline results. Before screenshots use that same archive. The regression suites retain their original assertions; tests that deliberately exercise standard rendering now explicitly select it through retained advanced controls. New creator coverage verifies new defaults independently.
