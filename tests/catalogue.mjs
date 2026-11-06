import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  CATALOGUE_THEMES,
  ART_PACKS,
  OCCASIONS,
  designDefaults,
  designMetadata,
  matchesDesign,
  artPack,
} from "../engine/catalogue.js";
import {
  ILLUSTRATIONS,
  illustration,
  illustrationUrl,
} from "../engine/illustrations.js";
import {
  validateCard,
  cardContent,
  contrastRatio,
  FONTS,
} from "../engine/card-data.js";
import { encodeCard, decodeCard } from "../engine/share-codec.js";
import { defaultPhysical } from "../engine/physical-schema.js";
import { defaultOpening } from "../engine/openings/config.js";
const root = new URL("../", import.meta.url),
  read = (path) => readFileSync(new URL(path, root), "utf8");
const ids = JSON.parse(read("themes/themes.json"));
const legacy = ids.map((id) => JSON.parse(read(`themes/${id}/theme.json`)));
const themes = [...legacy, ...CATALOGUE_THEMES];

test("91 unique designs, 28 occasions, all original IDs and all requested categories", () => {
  assert.equal(themes.length, 91);
  assert.equal(new Set(themes.map((t) => t.id)).size, 91);
  assert.equal(new Set(themes.map((t) => t.occasionId)).size, 28);
  for (const id of ids) assert.ok(themes.find((t) => t.id === id));
  for (const id of [
    "birthday",
    "kids-birthday",
    "milestone-birthday",
    "belated-birthday",
    "anniversary",
    "wedding",
    "engagement",
    "new-baby",
    "christening",
    "congratulations",
    "retirement",
    "new-home",
    "thank-you",
    "good-luck",
    "get-well",
    "sympathy",
    "thinking-of-you",
    "friendship",
    "love",
    "valentines",
    "mothers-day",
    "fathers-day",
    "christmas",
    "new-year",
    "just-because",
  ]) {
    const group = themes.filter((t) => t.occasionId === id);
    assert.ok(group.length >= 2, id);
    assert.ok(
      new Set(group.map((t) => artPack(t)?.illustrationFamily || t.style))
        .size >= 2,
      id,
    );
  }
});
test("39 packs and 37 new scenes: small original SVGs, local allowlists, accurate metadata", () => {
  assert.equal(Object.keys(ART_PACKS).length, 39);
  const scenes = new Set();
  for (const pack of Object.values(ART_PACKS)) {
    assert.ok(pack.artwork.length >= 2);
    assert.ok(pack.fonts.every((f) => FONTS.includes(f)));
    assert.ok(
      contrastRatio(pack.palette.paper, pack.palette.ink) >= 4.5,
      pack.id,
    );
    assert.equal(pack.envelope.type, "envelope");
    assert.equal(pack.coverName, "hidden");
    assert.ok(existsSync(new URL(`themes/${pack.cssThemeId}/theme.css`, root)));
    for (const item of pack.artwork) {
      assert.match(item.id, /^[a-z0-9-]+$/);
      assert.doesNotMatch(item.label, /[·#]\s*\d/);
      const text = readFileSync(new URL(illustrationUrl(item)), "utf8");
      assert.ok(Buffer.byteLength(text) < 7000);
      assert.match(text, /viewBox="0 0 200 180"/);
      assert.doesNotMatch(
        text,
        /<script|<foreignObject|(?:href|src)=|onload=/i,
      );
      if (item.asset.startsWith("packs/")) scenes.add(item.asset);
    }
  }
  assert.equal(scenes.size, 37);
});
test("curated metadata enables style, relationship, recipient, interest and tone browsing", () => {
  for (const theme of CATALOGUE_THEMES) {
    const meta = designMetadata(theme);
    assert.ok(OCCASIONS[theme.occasionId]);
    assert.ok(meta.relationships.length);
    assert.ok(meta.recipientTypes.length);
    assert.ok(meta.tones.length);
    assert.equal(meta.staticSendable, true);
    assert.ok(meta.subtitle);
    assert.equal(ILLUSTRATIONS[theme.id][0].id, artPack(theme).artwork[0].id);
  }
  for (const interest of [
    "fishing",
    "football",
    "gaming",
    "gardening",
    "music",
    "books",
    "travel",
    "coffee",
    "beer",
    "gin",
    "baking",
    "cars",
    "tractors",
    "pets",
    "countryside",
  ])
    assert.ok(
      themes.some((t) => matchesDesign(t, { interest })),
      interest,
    );
  assert.ok(
    themes.filter((t) => matchesDesign(t, { collection: "luxury" })).length >=
      5,
  );
  assert.ok(
    themes.filter((t) => matchesDesign(t, { collection: "funny" })).length >= 5,
  );
  assert.ok(
    themes.filter((t) =>
      matchesDesign(t, { relationship: "grandad", interest: "fishing" }),
    ).length > 0,
  );
  assert.equal(
    themes.filter((t) => matchesDesign(t, { search: "<script>" })).length,
    0,
  );
});
test("every new card round-trips as compact v5 IDs without embedded artwork or API data", async () => {
  for (const theme of CATALOGUE_THEMES) {
    const fresh = designDefaults(theme);
    assert.equal(fresh.physicalConfig.coverName, "");
    assert.equal(fresh.openingConfig.tone, "theme");
    const raw = {
      ...cardContent({
        theme,
        ...theme.defaults,
        ...fresh,
        to: "Café 👩🏽‍🚀",
        from: "Me",
        textSize: 18,
        watermark: true,
      }),
      v: 5,
    };
    const card = validateCard(raw, themes);
    const payload = await encodeCard(card),
      decoded = validateCard(await decodeCard(payload), themes);
    assert.equal(decoded.themeId, theme.id);
    assert.equal(decoded.message, raw.message);
    assert.equal(decoded.physicalConfig.coverArt, fresh.stickerId);
    assert.ok(payload.length < 1600, theme.id + ": " + payload.length);
    const plain = JSON.parse(
      Buffer.from(
        (await encodeCard(card, { compress: false })).slice(3),
        "base64url",
      ).toString(),
    );
    assert.equal(plain.length, 4);
    assert.equal(plain[1].length, 13);
    assert.doesNotMatch(
      JSON.stringify(plain),
      /data:image|<svg|railway|mediaId|artwork|catalogue/,
    );
    assert.ok(illustration(theme.id, decoded.stickerId));
  }
});
test("old v1-v5 links retain original defaults; pack recommendations do not alter decoded documents", async () => {
  const base = {
    themeId: "birthday-balloons",
    to: "Friend",
    message: "Keep\n\nall of this 💛",
    from: "Me",
    fontId: "nunito",
    textSize: 18,
    watermark: true,
    stickerId: "pink-cake",
  };
  for (const v of [1, 2]) {
    const original = { ...base, v };
    const payload = Buffer.from(JSON.stringify(original)).toString("base64url");
    assert.equal(
      validateCard(await decodeCard(payload), themes).theme.id,
      base.themeId,
    );
  }
  for (const v of [3, 4, 5]) {
    const original = {
      ...base,
      v,
      ...(v >= 4 ? { openingConfig: defaultOpening() } : {}),
      ...(v === 5 ? { physicalConfig: defaultPhysical() } : {}),
    };
    const decoded = await decodeCard(await encodeCard(original));
    assert.equal(decoded.v, v);
    assert.equal(decoded.message, base.message);
    if (v === 5)
      assert.equal(Object.hasOwn(decoded.physicalConfig, "coverName"), false);
  }
});
test("art and template paths are allowlisted; invalid pack/art input never becomes an asset URL", () => {
  for (const theme of CATALOGUE_THEMES) {
    for (const stickerId of [
      "../../secret.svg",
      "https://bad.invalid/image.svg",
      "<img>",
      "__proto__",
    ])
      assert.equal(illustration(theme.id, stickerId), undefined);
    assert.throws(
      () =>
        validateCard(
          {
            v: 5,
            themeId: theme.id,
            openingConfig: defaultOpening(),
            physicalConfig: { ...defaultPhysical(), coverArt: "../../bad.svg" },
          },
          themes,
        ),
      /artwork/,
    );
  }
});
