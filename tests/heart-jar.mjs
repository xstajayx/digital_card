import test from "node:test";
import assert from "node:assert/strict";
import { JAR_THEMES, encodeJar, decodeJar, noteError, newJarId, NOTE_LIMIT, MAX_LINK_LENGTH, saveHearts, readHearts } from "../engine/heart-jar.js";

const gift = { id: "1".repeat(32), theme: "love", recipient: "To Jamie 🩷", title: "Treasures",
  greeting: "Hello, 世界!", signature: "Stacey", notes: ["One 👋", "<img src=x>", "Three\nnotes"] };
test("all themes and note counts round-trip and fit representative project URLs", () => {
  assert.equal(JAR_THEMES.length, 6);
  assert.notEqual(newJarId(), newJarId());
  for (const theme of JAR_THEMES) {
    const input = { ...gift, theme: theme.id };
    assert.deepEqual(decodeJar(encodeJar(input)), input);
  }
  for (const count of [3, 10, 20]) {
    const notes = Array.from({ length: count }, (_, index) => `${index} ` + "心".repeat(NOTE_LIMIT - String(index).length - 1));
    const input = { ...gift, notes };
    const url = "https://xstajayx.github.io/digital_card/jar-view.html#j=" + encodeJar(input);
    assert.ok(url.length < MAX_LINK_LENGTH);
    console.log(`${count} hearts, full-width Unicode at the note limit: ${url.length} URL characters`);
  }
});
test("malformed, unknown, duplicate, empty and oversized data are rejected", () => {
  for (const invalid of ["", "a".repeat(12001), "*", "e30"])
    assert.throws(() => decodeJar(invalid));
  assert.throws(() => encodeJar({ ...gift, notes: ["one", "two"] }), /3–20/);
  assert.throws(() => encodeJar({ ...gift, notes: Array.from({ length: 21 }, (_, i) => String(i)) }), /3–20/);
  assert.throws(() => encodeJar({ ...gift, theme: "../bad" }), /unavailable/);
  assert.throws(() => encodeJar({ ...gift, notes: ["One", "One", "Two"] }), /already/);
  assert.throws(() => encodeJar({ ...gift, notes: ["One", " ", "Two"] }), /Write/);
  assert.match(noteError("x".repeat(141), []), /140/);
  assert.throws(() => encodeJar({ ...gift, notes: Array.from({ length: 20 }, (_, i) => `${i}` + "\u0000".repeat(130)) }), /too long/);
});
test("progress persists independently and fails safely when storage is blocked", () => {
  const storage = new Map();
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  assert.equal(saveHearts(gift, new Set([1])), true);
  assert.equal(saveHearts(gift, new Set([0, 1])), true);
  assert.deepEqual([...readHearts(gift)].sort(), [0, 1]);
  assert.deepEqual([...readHearts({ ...gift, id: "2".repeat(32) })], []);
  delete globalThis.localStorage;
  assert.equal(saveHearts(gift, new Set([2])), false);
  assert.equal(readHearts(gift).size, 0);
});
