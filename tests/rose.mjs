import test from "node:test";
import assert from "node:assert/strict";
import { DAY_MS, ROSE_ART, ROSE_LIMITS, newRoseId, encodeRoseGift, decodeRoseGift, readRoseState, roseStage } from "../engine/rose-gift.js";

const gift = {
  id: "23456789012345678901234567890123",
  mode: "evolving",
  greeting: "  To Stacey 🌹  ",
  message: "For you.\n\n想你！ <script>",
  signature: "",
};
const raw = (...items) => Buffer.from(JSON.stringify(items)).toString("base64url");

test("versioned gift round-trips verbatim, including blanks, Unicode and stable identity", () => {
  assert.deepEqual(decodeRoseGift(encodeRoseGift(gift)), gift);
  const blank = { ...gift, mode: "everlasting", greeting: "", message: "" };
  assert.deepEqual(decodeRoseGift(encodeRoseGift(blank)), blank);
  assert.match(newRoseId(), /^[a-f0-9]{32}$/);
  assert.notEqual(newRoseId(), newRoseId());
});

test("rejects unknown versions, art, invalid text, bad IDs and oversized links", () => {
  const fields = [gift.id, gift.mode, gift.greeting, gift.message, gift.signature];
  assert.throws(() => decodeRoseGift(raw(2, ROSE_ART, ...fields)), /unsupported version/);
  assert.throws(() => decodeRoseGift(raw(1, "../other", ...fields)), /artwork/);
  assert.throws(() => decodeRoseGift(raw(1, ROSE_ART, "wrong", ...fields.slice(1))), /invalid/);
  for (const payload of ["", "@", "e30", "a".repeat(10001)]) assert.throws(() => decodeRoseGift(payload));
  for (const [field, limit] of Object.entries(ROSE_LIMITS)) {
    assert.throws(() => encodeRoseGift({ ...gift, [field]: "x".repeat(limit + 1) }), new RegExp(field));
    assert.throws(() => encodeRoseGift({ ...gift, [field]: 123 }), new RegExp(field));
  }
  const longest = Object.fromEntries(Object.entries(ROSE_LIMITS).map(([field, limit]) => [field, "\u0000".repeat(limit)]));
  assert.deepEqual(decodeRoseGift(encodeRoseGift({ ...gift, ...longest })), { ...gift, ...longest });
});

test("lifecycle advances at exact elapsed UTC boundaries and handles long gaps", () => {
  const openedAt = Date.UTC(2026, 10, 19, 23, 45);
  const state = { openedAt, kept: false };
  for (const [day, name, next] of [[0, "bud", 2], [2, "opening", 5], [5, "bloom", 14], [10, "bloom", 14], [14, "bloom", null], [300000, "bloom", null]]) {
    const result = roseStage("evolving", state, openedAt + day * DAY_MS);
    assert.equal(result.stage.id, name);
    assert.equal(Boolean(result.stage.keepsake), day >= 14);
    assert.equal(result.nextAt, next === null ? null : openedAt + next * DAY_MS);
  }
  assert.equal(roseStage("evolving", state, openedAt + 2 * DAY_MS - 1).stage.id, "bud");
  assert.equal(roseStage("everlasting", state, openedAt + 99 * DAY_MS).stage.id, "bloom");
  for (const mode of ["evolving", "everlasting"]) {
    const { stage, nextAt } = roseStage(mode, { ...state, kept: true }, openedAt);
    assert.equal(stage.id, "bloom");
    assert.equal(stage.label, "Your keepsake");
    assert.equal(nextAt, null);
  }
});

test("invalid or future stored timestamps do not start the gift", () => {
  for (const openedAt of [undefined, Infinity, "123", -1, 1001, 1.1]) {
    assert.equal(readRoseState({ openedAt, kept: true }, 1000), null);
  }
  assert.deepEqual(readRoseState({ openedAt: 1000, kept: true }, 1000), { openedAt: 1000, kept: true });
  assert.equal(readRoseState({ openedAt: 1000, kept: "true" }, 1000).kept, false);
});
