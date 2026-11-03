import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  validDay,
  nextDate,
  localToday,
  validateOccasion,
  occurrence,
  readOccasions,
  saveOccasion,
  deleteOccasion,
  escapeText,
  foldLine,
  calendarEvent,
} from "../engine/occasions.js";
const sample = {
  id: "d17507da-8d84-49bd-a6a4-04b424c4b791",
  nickname: "Brother",
  kind: "birthday",
  month: 6,
  day: 15,
  annual: true,
  year: null,
  reminderDays: 7,
  revision: 0,
};
const memory = () => {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
};
const today = { year: 2026, month: 11, day: 3 };
test("birthdays and anniversaries save an explicit allowlist, never card messages", () => {
  const storage = memory();
  const saved = saveOccasion(
    {
      ...sample,
      message: "PRIVATE CARD",
      giftUrl: "https://private.example",
      email: "private@example.com",
    },
    storage,
  );
  const anniversary = saveOccasion(
    {
      ...sample,
      id: "anniversary-1234",
      nickname: "Mum & Dad",
      kind: "anniversary",
      annual: false,
      year: 2027,
      reminderDays: 14,
    },
    storage,
  );
  assert.equal(saved.revision, 1);
  assert.equal(anniversary.kind, "anniversary");
  assert.equal(readOccasions(storage).length, 2);
  assert.equal(storage.getItem(STORAGE_KEY).includes("PRIVATE"), false);
  assert.equal(storage.getItem(STORAGE_KEY).includes("email"), false);
  deleteOccasion(sample.id, storage);
  assert.deepEqual(readOccasions(storage), [anniversary]);
});
test("edit versions reject conflicts and deleted records; unrelated records survive", () => {
  const storage = memory();
  const saved = saveOccasion(sample, storage);
  const updated = saveOccasion({ ...saved, nickname: "Sibling" }, storage);
  assert.equal(updated.revision, 2);
  assert.throws(() => saveOccasion(saved, storage), /another tab/);
  deleteOccasion(sample.id, storage);
  assert.throws(() => saveOccasion(updated, storage), /deleted/);
});
test("storage failure and corrupt/unsupported records are not overwritten", () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, "{broken");
  assert.throws(() => readOccasions(storage), /not been overwritten/);
  assert.throws(() => saveOccasion(sample, storage));
  assert.equal(storage.getItem(STORAGE_KEY), "{broken");
  for (const raw of [
    { version: 2, items: [] },
    { version: 1, items: [sample, sample] },
    { version: 1, items: [{ ...sample, day: 32 }] },
  ]) {
    storage.setItem(STORAGE_KEY, JSON.stringify(raw));
    assert.throws(() => readOccasions(storage));
  }
  assert.throws(
    () =>
      readOccasions({
        getItem() {
          throw Error();
        },
      }),
    /unavailable/,
  );
  assert.throws(
    () =>
      saveOccasion(sample, {
        getItem() {
          return null;
        },
        setItem() {
          throw Error();
        },
      }),
    /could not save/,
  );
});
test("valid day/month, leap centuries and strict types", () => {
  assert.equal(validDay(2, 29), true);
  assert.equal(validDay(2, 29, 2025), false);
  assert.equal(validDay(2, 29, 2000), true);
  assert.equal(validDay(2, 29, 2100), false);
  for (const [month, day] of [
    [0, 1],
    [13, 1],
    [4, 31],
    [2, 30],
    [1, 0],
    [1, -1],
    [1, 1.2],
    ["2", 2],
    [1, NaN],
  ])
    assert.equal(validDay(month, day), false);
  for (const patch of [
    { nickname: "" },
    { nickname: "a\nb" },
    { nickname: "x".repeat(81) },
    { kind: "other" },
    { annual: "true" },
    { reminderDays: 3 },
    { id: "bad\r\nUID:x" },
    { day: 31, month: 4 },
    { annual: false, year: 2025, month: 2, day: 29 },
  ])
    assert.throws(() => validateOccasion({ ...sample, ...patch }));
});
test("next occurrence uses local calendar day, today and December rollover", () => {
  assert.deepEqual(nextDate(11, 3, today), today);
  assert.deepEqual(nextDate(6, 15, today), { year: 2027, month: 6, day: 15 });
  assert.deepEqual(nextDate(1, 1, { year: 2026, month: 12, day: 31 }), {
    year: 2027,
    month: 1,
    day: 1,
  });
  assert.deepEqual(localToday(new Date(2026, 10, 3, 23, 59)), today);
});
test("29 February skips non-leap years including 2100, without inventing a birthday", () => {
  assert.deepEqual(nextDate(2, 29, today), { year: 2028, month: 2, day: 29 });
  assert.deepEqual(nextDate(2, 29, { year: 2097, month: 3, day: 1 }), {
    year: 2104,
    month: 2,
    day: 29,
  });
  assert.deepEqual(nextDate(2, 29, { year: 2028, month: 2, day: 29 }), {
    year: 2028,
    month: 2,
    day: 29,
  });
});
test("one-time occasions expire and annual occasions advance", () => {
  assert.equal(
    occurrence({ ...sample, annual: false, year: 2026 }, today),
    null,
  );
  assert.deepEqual(occurrence(sample, today), {
    year: 2027,
    month: 6,
    day: 15,
  });
  assert.throws(
    () => calendarEvent({ ...sample, annual: false, year: 2026 }, { today }),
    /has passed/,
  );
});
test("RFC calendar contains stable UID, all-day exclusive dates, recurrence and optional alarm", () => {
  const text = calendarEvent(sample, {
    today,
    now: new Date("2026-11-03T23:55:00Z"),
  });
  assert.ok(text.endsWith("END:VCALENDAR\r\n"));
  assert.equal(text.replaceAll("\r\n", "").includes("\n"), false);
  for (const line of [
    "VERSION:2.0",
    "DTSTAMP:20261103T235500Z",
    "DTSTART;VALUE=DATE:20270615",
    "DTEND;VALUE=DATE:20270616",
    "RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15",
    "TRIGGER:-P7D",
    "ACTION:DISPLAY",
    `UID:${sample.id}@occasions.silenthello.local`,
  ])
    assert.ok(text.includes(line + "\r\n"), line);
  const once = calendarEvent(
    { ...sample, annual: false, year: 2027, month: 12, day: 31 },
    { today, alarm: false },
  );
  assert.ok(once.includes("DTEND;VALUE=DATE:20280101"));
  assert.equal(once.includes("RRULE:"), false);
  assert.equal(once.includes("VALARM"), false);
  const leap = calendarEvent({ ...sample, month: 2, day: 29 }, { today });
  assert.ok(leap.includes("DTEND;VALUE=DATE:20280301"));
  const update = calendarEvent({ ...sample, revision: 4 }, { today });
  assert.ok(update.includes(`UID:${sample.id}@occasions.silenthello.local`));
  assert.ok(update.includes("SEQUENCE:4"));
});
test("UTF-8 folding respects 75 octets without splitting codepoints; text cannot inject properties", () => {
  assert.equal(escapeText("a\\b,c;d\r\nx"), "a\\\\b\\,c\\;d\\nx");
  const line = "SUMMARY:" + "é漢👩🏽‍🚀".repeat(30);
  const folded = foldLine(line);
  for (const physical of folded.split("\r\n"))
    assert.ok(Buffer.byteLength(physical, "utf8") <= 75);
  assert.equal(folded.replace(/\r\n /g, ""), line);
  assert.equal(folded.includes("\ufffd"), false);
  const text = calendarEvent(
    { ...sample, nickname: "Café, 漢字; \\ 💌".repeat(4) },
    { today },
  );
  assert.ok(text.includes("\\,"));
  assert.ok(text.includes("\\;"));
});
