Recipients now see a discreet Silent Hello brand and one state-aware opening button above their card. Sharing controls and repeated introduction text are removed; the existing envelope → cover → inside animations, direct taps, close/reopen, reduced motion and legacy links are preserved. Replay appears after opening, and Read comfortably provides the complete message and signature.

The actual renderer button is moved into the recipient page, keeping the existing controller and focus behavior. Shared engine and creator files are unchanged.

Before/after and stage screenshots: [recipient redesign evidence](docs/recipient-redesign/README.md).

Validation: data tests and Playwright browser, shop, interactive, physical, responsive and recipient suites. The recipient suite covers 320/360/390/412/430px, tablet and desktop, v1–v5 links, long messages, keyboard/skip, reduced motion and overflow. Updated old assertions for intentionally removed recipient controls; added the recipient suite to CI.

No deployment or merge.
