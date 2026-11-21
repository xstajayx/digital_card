import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CATALOGUE_THEMES, catalogueDesign } from "../engine/catalogue.js";
import { stationeryFor } from "../engine/stationery.js";
import { PAPERS, defaultPhysical, validatePhysical } from "../engine/physical-schema.js";
import { defaultOpening } from "../engine/openings/config.js";
import { encodeCard, decodeCard } from "../engine/share-codec.js";

test("stationery follows the actual design and never uses the sender's greeting or relationship", () => {
  const cases = [
    ["birthday-balloons", "star", "birthday"],
    ["birthday-garden", "star", "interiors/birthday-garden"],
    ["love-letters", "rose", "interiors/love-letters"],
    ["love-rose-note", "rose", "interiors/love-rose-note"],
    ["christmas", "snowflake", "winter"],
    ["christmas-robin", "snowflake", "interiors/christmas-robin"],
    ["friendship-coffee", "leaf", "interiors/friendship-coffee"],
    ["thank-you", "flower", "interiors/thank-you"],
    ["congrats", "laurel", "interiors/congrats"],
    ["easter", "flower", "interiors/easter"],
    ["st-george", "rose", "dragon"],
    ["moon-cradle", "star", "nursery"],
    ["forget-me-not", "star", "quiet-stem"],
    ["all-i-could-afford", "star", "wallet"],
    ["no-expense-spared", "star", "receipt"],
    ["youd-only-throw-it-away", "star", "recycling"],
    ["saving-the-planet", "star", "hero-tree"],
    ["happy-25th-december", "snowflake", "christmas-calendar"],
    ["happy-four-day-weekend", "flower", "slippers"],
    ["unknown", "star", ""],
  ];
  const seals = readFileSync(new URL("../assets/stationery/seals.svg", import.meta.url), "utf8");
  for (const [id, stamp, motif] of cases) {
    const stationery = stationeryFor(id, catalogueDesign(id)?.catalogue);
    assert.equal(stationery.stamp, stamp);
    assert.equal(stationery.motif, motif);
    assert.ok(seals.includes(`id="${stamp}"`));
    if (motif) assert.match(readFileSync(new URL(stationery.motifUrl), "utf8"), /^<svg/);
    else assert.equal(stationery.motifUrl, "");
  }
  assert.equal(stationeryFor("birthday-balloons", { occasionId: "birthday", relationships: ["partner"] }).stamp, "star");
});

test("old artwork preferences and every paper remain compatible with compact v5 links", async () => {
  assert.deepEqual(Object.keys(PAPERS).sort(), ["ivory", "kraft", "lined", "linen", "pastel", "textured", "white"]);
  for (const paper of Object.keys(PAPERS)) {
    const physicalConfig = { ...defaultPhysical(), paper, insideDecoration: false };
    const card = {
      physicalConfig, v: 5, themeId: "birthday-balloons", openingConfig: defaultOpening(),
      fontId: "nunito", textSize: 18, to: "To Alex", from: "Sam", message: "Line one.\n\nLine two.", watermark: true,
    };
    const payload = await encodeCard(card, { compress: false });
    assert.match(payload, /^5u\./);
    const reopened = await decodeCard(payload);
    assert.deepEqual(reopened.physicalConfig, physicalConfig);
    assert.equal(reopened.message, card.message);
  }
  const plain = { ...defaultPhysical(), insideArt: "" };
  assert.deepEqual(validatePhysical(plain, "birthday-balloons"), plain);
  const old = { ...defaultPhysical(), insideArt: "blue-cake" };
  assert.deepEqual(validatePhysical(old, "birthday-balloons"), old);
  assert.deepEqual(validatePhysical({ ...old, insideDecoration: true }, "birthday-balloons"), old);
  assert.throws(() => validatePhysical({ ...old, insideDecoration: "false" }, "birthday-balloons"));
});

test("all 127 public designs use distinct, local and upright interior sketches", () => {
  const legacy = JSON.parse(readFileSync(new URL("../themes/themes.json", import.meta.url)));
  const ids = [...legacy, ...CATALOGUE_THEMES.map(({ id }) => id)];
  assert.equal(ids.length, 127);
  const urls = new Set();
  const drawings = new Set();
  for (const id of ids) {
    const { motif, motifUrl } = stationeryFor(id, catalogueDesign(id)?.catalogue);
    assert.ok(motif && motif !== "botanical", id);
    assert.ok(motifUrl.startsWith(new URL("../assets/stationery/", import.meta.url).href), id);
    const svg = readFileSync(new URL(motifUrl), "utf8");
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /rotate\(|scale\(\s*-|matrix\(|<script|<foreignObject|\bhref=/i);
    assert.ok(!urls.has(motifUrl), id);
    assert.ok(!drawings.has(svg), id);
    urls.add(motifUrl);
    drawings.add(svg);
  }
});
