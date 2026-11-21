import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { DESIGNS } from "../catalogue/designs.js";
import {
  civilDay, londonDay, easterSunday, nextLondonMidnight, selectPromotion, PROMOTIONS, EVERGREEN,
} from "../engine/seasonal-banner.js";

const available = new Set(DESIGNS.map(({ occasionId }) => occasionId));
const everyOccasion = new Set(PROMOTIONS.map(({ occasion }) => occasion));
const at = (date) => new Date(date);
const day = 86_400_000;
const selected = (date, options) => selectPromotion(at(date), { available, ...options }).id;
const promotion = (id) => PROMOTIONS.find((item) => item.id === id);

test("fixed and movable windows start and end on the UK civil dates", () => {
  const cases = [
    ["christmas", "2026-11-01", "2026-12-25"],
    ["valentines", "2026-01-25", "2026-02-14"],
    ["mothers-day", "2026-03-01", "2026-03-15"],
    ["easter", "2026-03-22", "2026-04-05"],
    ["st-george", "2026-04-16", "2026-04-23"],
    ["fathers-day", "2026-06-07", "2026-06-21"],
    ["halloween", "2026-10-14", "2026-10-31"],
  ];
  for (const [id, first, last] of cases) {
    const item = { ...promotion(id), enabled: true };
    const start = Date.parse(first) / day;
    const end = Date.parse(last) / day;
    assert.equal(item.start(2026, item.event(2026)), start, id);
    assert.equal(item.event(2026), end, id);
    const select = (instant) => selectPromotion(instant, { promotions: [item], available: everyOccasion }).id;
    const opening = nextLondonMidnight((start - 1) * day + 12 * 3600000);
    const expiry = nextLondonMidnight(end * day + 12 * 3600000);
    assert.equal(select(opening - 1), "evergreen");
    assert.equal(select(opening), id);
    assert.equal(select(expiry - 1), id);
    assert.equal(select(expiry), "evergreen");
  }
});

test("Gregorian Easter, Mothering Sunday and Father's Day span years and leap dates", () => {
  const cases = [
    [2024, [3,31], [3,10], [6,16]],
    [2025, [4,20], [3,30], [6,15]],
    [2026, [4,5], [3,15], [6,21]],
    [2028, [4,16], [3,26], [6,18]],
    [2038, [4,25], [4,4], [6,20]],
  ];
  for (const [year, easter, mother, father] of cases) {
    assert.equal(easterSunday(year), civilDay(year, ...easter));
    assert.equal(promotion("mothers-day").event(year), civilDay(year, ...mother));
    assert.equal(promotion("fathers-day").event(year), civilDay(year, ...father));
  }
  assert.equal(selected("2024-02-29T12:00Z"), "mothers-day");
});

test("midnight stays correct across GMT, BST and both clock changes", () => {
  for (const [now, expected] of [
    ["2026-03-28T00:00Z", "2026-03-29T00:00Z"],
    ["2026-03-29T00:00Z", "2026-03-29T23:00Z"],
    ["2026-10-24T23:00Z", "2026-10-26T00:00Z"],
    ["2026-10-26T00:00Z", "2026-10-27T00:00Z"],
    ["2026-12-31T23:59:59.999Z", "2027-01-01T00:00Z"],
  ]) {
    const next = nextLondonMidnight(Date.parse(now));
    assert.equal(next, Date.parse(expected));
    assert.notEqual(londonDay(next), londonDay(next - 1));
  }
  assert.equal(selected("2026-04-05T22:59:59.999Z"), "easter");
  assert.equal(selected("2026-04-05T23:00:00Z"), "evergreen");
  assert.equal(selected("2026-12-26T00:00:00Z"), "evergreen");
  assert.equal(selected("2026-02-15T00:00:00Z"), "evergreen");
});

test("nearest event, ties, overlap expiry and cross-year campaigns", () => {
  const easter = promotion("easter");
  const george = { ...promotion("st-george"), enabled: true };
  const options = { promotions: [easter, george], available: everyOccasion };
  assert.equal(selected("2038-04-22T22:00Z", options), "st-george");
  assert.equal(selected("2038-04-23T23:00Z", options), "easter");
  const tie = { ...george, event: easter.event, start: easter.start, priority: 0 };
  assert.equal(selected("2038-04-22T22:00Z", { ...options, promotions: [easter, tie] }), "st-george");
  const crossing = { ...easter, event: (year) => civilDay(year, 1, 3), start: (_year, event) => event - 9 };
  assert.equal(selected("2026-12-31T12:00Z", { ...options, promotions: [crossing] }), "easter");
});

test("missing cards or artwork, disabled entries and unsafe overrides fall through", () => {
  assert.deepEqual(PROMOTIONS.filter(({ enabled }) => !enabled).map(({ id }) => id), ["st-george", "halloween"]);
  assert.equal(selected("2026-10-25T12:00Z", { available: everyOccasion, override: "halloween" }), "evergreen");
  assert.equal(selected("2026-04-20T12:00Z"), "evergreen");
  assert.equal(selected("2026-12-01T12:00Z", { available: new Set() }), "evergreen");
  assert.equal(selected("2026-12-01T12:00Z", { missingArtwork: new Set(["christmas"]) }), "evergreen");
  assert.equal(selected("2026-12-01T12:00Z", { override: "unknown" }), "christmas");
  assert.equal(selected("2026-12-01T12:00Z", { override: "evergreen" }), "evergreen");
  assert.equal(selected("2026-08-01T12:00Z", { override: "christmas" }), "christmas");
  assert.equal(selected("2026-08-01T12:00Z", { override: "christmas", missingArtwork: new Set(["christmas"]) }), "evergreen");
});

test("artwork is bundled locally and enabled destinations have designs", () => {
  for (const item of [EVERGREEN, ...PROMOTIONS]) {
    const asset = new URL(item.artwork, new URL("../", import.meta.url));
    assert.ok(existsSync(asset));
    assert.match(readFileSync(asset, "utf8"), /viewBox="0 0 420 260"/);
    if (!item.enabled) continue;
    assert.ok(available.has(item.occasion));
    assert.match(item.href, /^\.\/cards\.html\?occasion=[a-z-]+#catalogue$/);
  }
});
