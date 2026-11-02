# Physical greeting-card audit

Working baseline: 0d65781, merged into remote main at 5f25440 with identical source tree. This feature branch fast-forwards to that reviewed base. Reviewed current renderer/template, v3/v4 codec, state/drafts, opening picker/controller, editor and recipient lifecycle. Before implementation, all 14 data tests and 24 baseline browser groups passed; results are in PHYSICAL_CARD_DELIVERY.md.

Existing functionality: 28 designs and illustration allowlists, v1–v4 links, five-step editing, font/fitting safeguards, independent wrapping/effects, envelope/gift opening, native/copy/WhatsApp and email/SMS drafts, optional local drafts, keyboard/reduced-motion controls. Preserve these paths.

Confirmed gap: the envelope reveals a single surface containing headline, body, signature and illustration. There is no separately designed cover, inside-left/right page, physical hinge or close/reopen interaction. The current envelope insert is a generic representation, not the personalised folded card.

Implementation decision: introduce an opt-in v5 physical document and an additive renderer component. v1–v4 keep the existing viewer. Reuse the current text-fitting/message surface inside the physical right page; use local allowlisted art for independently editable cover and left page. The physical journey owns envelope, extraction and unfolding, rather than replaying unrelated particle effects. Existing effects are opt-in. Readable mobile/expanded views and complete-text fallback remain required. No backend, paid service, deployment or DNS action is involved.
