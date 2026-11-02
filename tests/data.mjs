import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  FONTS,
  LIMITS,
  birthdayNumber,
  ordinal,
  greetingFor,
  validateCard,
  contrastRatio,
} from "../engine/card-data.js";
import {
  ILLUSTRATIONS,
  illustration,
  illustrationUrl,
} from "../engine/illustrations.js";
import { sanitizeGiftUrl } from "../engine/sanitize.js";
import { encodeCard, decodeCard } from "../engine/share-codec.js";
import { createState } from "../app/state.js";
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const ids = JSON.parse(read("themes/themes.json"));
const themes = ids.map((id) => JSON.parse(read(`themes/${id}/theme.json`)));
const sample = {
  v: 3,
  themeId: ids[0],
  to: "Zoe 👩🏽‍🚀",
  message: "Café, 漢字 — “Hello!”\n\nAnother paragraph 💌",
  from: "With love",
  fontId: "pacifico",
  textSize: 16,
  watermark: false,
  giftUrl: "https://example.com/gift?a=1&b=2",
  birthdayNumber: "21",
  paperOverride: "#abcdef",
  inkOverride: "#123456",
  stickerId: "pink-cake",
};

test("catalogue has 23 occasions, 26 unique designs and all legacy theme IDs", () => {
  assert.equal(themes.length, 26);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(themes.map((t) => t.occasionId)).size, 23);
  for (const id of [
    "birthday-balloons",
    "kids-party",
    "thank-you",
    "love",
    "congrats",
    "christmas",
    "mothers-day",
    "fathers-day",
    "anniversary",
    "new-baby",
    "get-well",
    "good-luck",
    "sorry",
    "thinking-of-you",
    "graduation",
  ])
    assert.ok(ids.includes(id));
  for (const occasion of ["birthday", "love", "christmas"])
    assert.equal(themes.filter((t) => t.occasionId === occasion).length, 2);
});
test("all metadata, palettes and local assets are usable", () => {
  for (const theme of themes) {
    assert.equal(
      theme.id,
      ids.find((id) => id === theme.id),
    );
    assert.ok(
      theme.name &&
        theme.occasion &&
        theme.greeting &&
        theme.group &&
        theme.features.opening,
    );
    assert.ok(FONTS.includes(theme.defaultFontId));
    assert.ok(existsSync(new URL(`themes/${theme.id}/theme.css`, root)));
    assert.ok(
      contrastRatio(theme.palette.paper, theme.palette.ink) >= 4.5,
      theme.id,
    );
    for (const key of ["to", "message", "from"])
      assert.ok(theme.defaults[key].length <= LIMITS[key]);
    assert.ok(ILLUSTRATIONS[theme.id].length >= 2);
    const seen = new Set();
    for (const item of ILLUSTRATIONS[theme.id]) {
      assert.ok(!seen.has(item.id));
      seen.add(item.id);
      assert.doesNotMatch(item.label, /[·#]\s*\d/);
      const svg = readFileSync(fileURLToPath(illustrationUrl(item)), "utf8");
      assert.match(svg, /viewBox="0 0 200 180"/);
      assert.doesNotMatch(svg, /<script|<foreignObject|(?:href|src)=|onload=/i);
      assert.ok(Buffer.byteLength(svg) < 7000);
    }
  }
  for (const file of [
    "fredoka.ttf",
    "pacifico.ttf",
    "quicksand.ttf",
    "poppins.ttf",
    "nunito.ttf",
    "playfairdisplay.ttf",
  ])
    assert.ok(existsSync(new URL(`assets/fonts/${file}`, root)));
});
test("all legacy illustration identifiers migrate to the right object", () => {
  const mappings = {
    "birthday-balloons": {
      "cake-pink.png": "pink-cake",
      "cake-blue.png": "blue-cake",
      "cake-yellow.png": "yellow-cake",
      "cake-purple.png": "purple-cake",
    },
    love: {
      "heart-red.png": "red-heart",
      "heart-pink.png": "pink-heart",
      "heart-purple.png": "purple-heart",
      "kiss-black.png": "kiss",
    },
    christmas: {
      "tree-green.png": "tree",
      "bauble-gold.png": "bauble",
      "snowflake-white.png": "snowflake",
    },
    "thank-you": {
      "bouquet-pastel.png": "bouquet",
      "ribbon-soft.png": "ribbon",
      "sparkles-gold.png": "stars",
    },
    congrats: {
      "trophy-gold.png": "trophy",
      "stars-blue.png": "stars",
      "confetti-pop.png": "fireworks",
    },
    "kids-party": {
      "balloons-rainbow.png": "balloons",
      "hat-party.png": "party-hat",
      "animal-bear.png": "bear",
    },
    "mothers-day": {
      "flowers-rose.png": "bouquet",
      "heart-soft.png": "pink-heart",
    },
    "fathers-day": { "tie-blue.png": "tie", "mug-classic.png": "mug" },
    "new-baby": {
      "pram-soft.png": "pram",
      "bottle-mint.png": "bottle",
      "stars-baby.png": "stars",
    },
    "get-well": {
      "bandage-red.png": "bandage",
      "tea-cup.png": "tea",
      "heart-heal.png": "pink-heart",
    },
    sorry: {
      "heart-small.png": "pink-heart",
      "note-soft.png": "envelope",
      "flower-soft.png": "flower",
    },
    "thinking-of-you": {
      "cloud-soft.png": "cloud",
      "heart-soft.png": "pink-heart",
      "envelope-soft.png": "envelope",
    },
    graduation: {
      "cap-black.png": "cap",
      "diploma-white.png": "diploma",
      "stars-gold.png": "stars",
    },
    anniversary: { "heart-red.png": "red-heart", "kiss-pink.png": "kiss" },
    "good-luck": { "star-gold.png": "stars", "clover-green.png": "clover" },
  };
  for (const [theme, entries] of Object.entries(mappings))
    for (const [old, next] of Object.entries(entries))
      assert.equal(illustration(theme, old)?.id, next, `${theme}/${old}`);
  assert.equal(illustration("love", "../../etc/passwd"), undefined);
  assert.equal(illustration("love", "https://evil.example/a.svg"), undefined);
});
test("birthday ordinals and age bounds, including kids and milestones", () => {
  for (const [age, expected] of [
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [18, "18th"],
    [21, "21st"],
    [40, "40th"],
    [50, "50th"],
    [100, "100th"],
    [111, "111th"],
    [120, "120th"],
  ]) {
    assert.equal(ordinal(age), expected);
    for (const theme of themes.filter((t) => t.birthday))
      assert.ok(
        greetingFor(theme, "Zoe", true, String(age)).includes(expected),
      );
  }
  for (const value of ["", 0, -1, 121, 1.5, "bad"])
    assert.equal(birthdayNumber(value), "");
  assert.equal(greetingFor(themes[0], "", false, ""), "Happy Birthday!");
});
test("gift sanitization blocks credentials, non-HTTPS and oversized links", () => {
  for (const value of [
    "http://example.com",
    "javascript:alert(1)",
    "data:text/html,hi",
    "https://user:pass@example.com",
    "https://example.com/" + "x".repeat(501),
    null,
    {},
  ])
    assert.equal(sanitizeGiftUrl(value), "");
  assert.equal(
    sanitizeGiftUrl(" https://example.com/gift "),
    "https://example.com/gift",
  );
});
test("all six fonts, text sizes, colour overrides and safe defaults validate", () => {
  assert.equal(FONTS.length, 6);
  for (const fontId of FONTS)
    for (const textSize of [14, 16, 18, 20]) {
      const card = validateCard({ ...sample, fontId, textSize }, themes);
      assert.equal(card.fontId, fontId);
      assert.equal(card.textSize, textSize);
      assert.equal(card.paperOverride, sample.paperOverride);
    }
  const card = validateCard(
    {
      ...sample,
      stickerId: "../../evil",
      giftUrl: "javascript:alert(1)",
      fontId: "evil",
      paperOverride: "red;background:url(x)",
      birthdayNumber: "121",
    },
    themes,
  );
  assert.equal(card.stickerId, "");
  assert.equal(card.giftUrl, "");
  assert.equal(card.fontId, "fredoka");
  assert.equal(card.paperOverride, "");
  assert.equal(card.birthdayNumber, "");
});
test("bad fields, unknown versions/designs and over-limit text are rejected", () => {
  for (const raw of [
    null,
    [],
    {},
    { ...sample, v: 99 },
    { ...sample, themeId: "../../evil" },
    { ...sample, message: {} },
    { ...sample, to: "x".repeat(121) },
    { ...sample, message: "x".repeat(6001) },
  ])
    assert.throws(() => validateCard(raw, themes));
  assert.equal(
    validateCard({ ...sample, v: 2, message: "x".repeat(10000) }, themes)
      .message.length,
    10000,
  );
});
test("v3 raw and compressed links preserve all fields and Unicode", async () => {
  for (const compress of [false, true]) {
    const encoded = await encodeCard(sample, { compress });
    assert.match(encoded, /^3[uz]\.[A-Za-z0-9_-]+$/);
    assert.deepEqual(await decodeCard(encoded), sample);
  }
  const repetitive = { ...sample, message: "Happy birthday! ".repeat(80) };
  const raw = await encodeCard(repetitive, { compress: false }),
    compressed = await encodeCard(repetitive);
  assert.ok(compressed.length < raw.length / 2);
});
test("v1/v2 base64url JSON links and disabled-compression fallback work", async () => {
  for (const v of [1, 2]) {
    const card = { ...sample, v };
    const encoded = Buffer.from(JSON.stringify(card)).toString("base64url");
    assert.deepEqual(await decodeCard(encoded), card);
  }
  const stream = globalThis.CompressionStream;
  try {
    globalThis.CompressionStream = undefined;
    assert.match(await encodeCard(sample), /^3u\./);
  } finally {
    globalThis.CompressionStream = stream;
  }
});
test("malformed, invalid UTF-8 and decompression bombs fail within bounds", async () => {
  for (const raw of [
    "",
    "!!!!",
    "3u.eA",
    "3z.aaaa",
    Buffer.from([255, 254]).toString("base64url"),
    "a".repeat(40001),
  ])
    await assert.rejects(decodeCard(raw));
  const payload = await encodeCard({ ...sample, message: "x".repeat(60000) });
  // Construct a bomb directly: the encoder itself also enforces a byte ceiling.
  const { deflateSync } = await import("node:zlib");
  await assert.rejects(
    decodeCard(
      "3z." + deflateSync(Buffer.alloc(80000, 120)).toString("base64url"),
    ),
    /too large/,
  );
  await assert.rejects(
    encodeCard({ ...sample, message: "x".repeat(70000) }),
    /too large/,
  );
  assert.ok(payload.length < 500);
});
test("no-op state changes do not notify and unsubscribe works", () => {
  const state = createState();
  let calls = 0,
    last = [];
  const unsubscribe = state.subscribe((current, keys) => {
    calls++;
    last = keys;
  });
  state.set({ message: "" });
  assert.equal(calls, 1);
  state.set({ message: "Hello" });
  assert.equal(calls, 2);
  assert.deepEqual(last, ["message"]);
  unsubscribe();
  state.set({ message: "Bye" });
  assert.equal(calls, 2);
});
test("no photo/GIF controls or unsafe dynamic HTML remain in runtime code", () => {
  const source =
    read("index.html") +
    ["app", "engine"]
      .flatMap((dir) =>
        readdirSync(new URL(dir + "/", root))
          .filter((f) => /\.(js|html)$/.test(f))
          .map((f) => read(`${dir}/${f}`)),
      )
      .join("");
  assert.doesNotMatch(
    source,
    /type="file"|html2canvas|gif\.js|photoInput|photoData|wrapAndClampMessage|\.innerHTML\s*=/,
  );
});
