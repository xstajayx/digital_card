# The Heart Jar

The Heart Jar is the third Silent Hello gift. Start at `jars.html`, choose one of six themes, and add 3–20 distinct notes in `jar-studio.html`. The creator and recipient use the same presentation controller. The receiver opens `jar-view.html`, picks a numbered heart, and reads its message. The numbered buttons are the accessible equivalent of picking a piece from the jar. Messages use a readable note panel. Returning recipients can revisit or continue without repeating the opening.

`engine/heart-jar.js` holds theme palettes, default wording, limits, the link codec, and progress storage. `app/jar-art.js` draws the original heart pieces using layered SVG paths. The CSS glass, cork, reflections and paper labels share a single implementation. CSS transforms handle the 3.3-second lid opening, settling, and the selected-heart reveal. Opening exposes the controls immediately, including when motion is reduced or animation fails.

## Link and storage

The version 1 `#j=` payload is bounded Base64URL UTF-8 JSON with a theme ID, a random 128-bit gift ID, four optional text fields and a list of notes. Notes are limited to 140 UTF-16 code units each. Fields and the complete 12,000-character URL limit are validated before sharing. Text is rendered in text nodes. Holding the link grants access to the gift and all its messages.

Representative URLs using full-width Unicode at the note limit are 1,867 characters for 3 hearts, 5,778 for 10, and 11,338 for 20. The URL can grow with longer optional fields or JSON escaping. The editor asks for shorter text if the complete URL would exceed the cap. Some messaging apps may impose lower limits.

Only the indexes of opened hearts are saved under the gift ID. No note text is written to progress storage. Progress stays in that browser, and the gift still works when storage is unavailable. Sender notes stay in the open editor. The browser warns before leaving an edited jar where it supports leave prompts.

## Hosting boundary

All routes and assets are relative and work under `/digital_card/` without a backend. A future optional Railway API could hold saved gift libraries or sync progress. Scoped uploads and R2 credentials belong on the server. Static share links and local progress do not depend on either service.

## Checks

Run `node tests/heart-jar.mjs` and `python -u tests/heart-jar.py`. Set `CARD_ARTIFACT_DIR` to keep mobile and desktop captures.

[Mobile and desktop review screenshots](./heart-jar-review/) show the collection, creator and recipient.
