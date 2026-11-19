import test from "node:test";
import assert from "node:assert/strict";
import { FLOWERS } from "../engine/flowers/catalogue.js";
import { SPECIES } from "../engine/flowers/artwork.js";
import { encodeRoseGift } from "../engine/rose-gift.js";
import { decodeFlowerGift, encodeFlowerGift, newGiftId, GIFT_LIMITS } from "../engine/flowers/gift.js";

const gift = { id: "23456789012345678901234567890123", greeting: "  To Stacey 🌹  ",
  message: "For you.\n\n想你！ <script>", signature: "" };
const raw = (record) => "f=" + Buffer.from(JSON.stringify(record)).toString("base64url");

test("all 14 products use authored species and stay within expected bloom durations", () => {
  assert.equal(FLOWERS.length, 14);
  assert.equal(new Set(FLOWERS.map(({ id }) => id)).size, 14);
  assert.equal(FLOWERS.filter(({ kind }) => kind === "bouquet").length, 6);
  assert.equal(FLOWERS.find(({ id }) => id === "dozen-red-roses").heads.length, 12);
  for (const product of FLOWERS) {
    assert.ok(product.description && product.occasions.length);
    const duration = Math.max(...product.heads.map(({ species }, index) =>
      SPECIES[species].duration + index * 310 + index % 2 * 90));
    assert.ok(duration >= (product.kind === "bouquet" ? 7000 : 5000));
    assert.ok(duration <= (product.kind === "bouquet" ? 12000 : 7000));
  }
});

test("every gift round-trips exact Unicode, HTML-like text, blanks and identity", () => {
  for (const { id: productId } of FLOWERS) {
    const expected = { ...gift, productId };
    assert.deepEqual(decodeFlowerGift("f=" + encodeFlowerGift(expected)), expected);
  }
  assert.match(newGiftId(), /^[a-f0-9]{32}$/);
  assert.notEqual(newGiftId(), newGiftId());
  const longest = Object.fromEntries(Object.entries(GIFT_LIMITS).map(([part, limit]) =>
    [part, "\u0000".repeat(limit)]));
  const expected = { ...gift, ...longest, productId: "elegant-white-bouquet" };
  assert.deepEqual(decodeFlowerGift("f=" + encodeFlowerGift(expected)), expected);
});

test("both previous rose growth modes map to the immediate blush gift", () => {
  for (const mode of ["evolving", "everlasting"])
    assert.deepEqual(decodeFlowerGift("r=" + encodeRoseGift({ ...gift, mode })),
      { ...gift, productId: "blush-rose", legacy: true });
});

test("malformed, unknown and oversized links and fields are rejected", () => {
  const record = [2, "blush-rose", gift.id, gift.greeting, gift.message, gift.signature];
  for (const fragment of ["", "f=@", "f=e30", "f=" + "a".repeat(10001)])
    assert.throws(() => decodeFlowerGift(fragment));
  assert.throws(() => decodeFlowerGift(raw([9, ...record.slice(1)])), /unsupported version/);
  assert.throws(() => decodeFlowerGift(raw([2, "../other", ...record.slice(2)])), /unavailable/);
  assert.throws(() => encodeFlowerGift({ ...gift, productId: "blush-rose", message: "x".repeat(1001) }), /1000/);
});
