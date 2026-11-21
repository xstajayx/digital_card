import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalogueDesign } from "../engine/catalogue.js";
import { stationeryFor } from "../engine/stationery.js";
import { PAPERS, defaultPhysical, validatePhysical } from "../engine/physical-schema.js";
import { defaultOpening } from "../engine/openings/config.js";
import { encodeCard, decodeCard } from "../engine/share-codec.js";

test("stationery follows the actual design and never uses the sender's greeting or relationship", () => {
  const cases = [
    ["birthday-balloons", "star", "birthday"],
    ["birthday-garden", "star", "birthday"],
    ["love-letters", "rose", "rose"],
    ["love-rose-note", "rose", "rose"],
    ["christmas", "snowflake", "winter"],
    ["christmas-robin", "snowflake", "mistletoe"],
    ["friendship-coffee", "leaf", "botanical"],
    ["thank-you", "flower", "botanical"],
    ["congrats", "laurel", "celebrate"],
    ["easter", "flower", "spring"],
    ["st-george", "rose", "dragon"],
    ["unknown", "star", "botanical"],
  ];
  const seals = readFileSync(new URL("../assets/stationery/seals.svg", import.meta.url), "utf8");
  for (const [id, stamp, motif] of cases) {
    const stationery = stationeryFor(id, catalogueDesign(id)?.catalogue);
    assert.equal(stationery.stamp, stamp);
    assert.equal(stationery.motif, motif);
    assert.ok(seals.includes(`id="${stamp}"`));
    assert.match(readFileSync(new URL(stationery.motifUrl), "utf8"), /^<svg/);
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
  const old = { ...defaultPhysical(), insideArt: "blue-cake" };
  assert.deepEqual(validatePhysical(old, "birthday-balloons"), old);
  assert.deepEqual(validatePhysical({ ...old, insideDecoration: true }, "birthday-balloons"), old);
  assert.throws(() => validatePhysical({ ...old, insideDecoration: "false" }, "birthday-balloons"));
});
