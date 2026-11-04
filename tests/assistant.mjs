import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STORAGE_KEY,
  saveOccasion,
  readOccasions,
  deleteOccasion,
  calendarEvent,
} from "../engine/occasions.js";
import { CONTACTS_KEY, validateProfile } from "../engine/contact-profile.js";
import {
  generatedCard,
  prepareDue,
  prepareContact,
  readAssistant,
  writeAssistant,
  validateSettings,
  zonedDate,
  reconcile,
  updatePrepared,
  deletePrepared,
  exportContacts,
  importContacts,
  BIRTHDAY_MILESTONES,
  ANNIVERSARY_MILESTONES,
} from "../engine/card-assistant.js";
const themes = JSON.parse(
  readFileSync(new URL("../themes/themes.json", import.meta.url)),
).map((id) =>
  JSON.parse(
    readFileSync(new URL(`../themes/${id}/theme.json`, import.meta.url)),
  ),
);
const memory = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
};
const sample = {
  id: "contact-brother-123",
  nickname: "Brother",
  kind: "birthday",
  month: 6,
  day: 15,
  annual: true,
  year: null,
  reminderDays: 7,
  revision: 0,
};
const profile = { recipientName: "Sam", originYear: 2009, automation: true };
const now = new Date("2027-06-08T12:00:00Z");
function setup() {
  const storage = memory();
  saveOccasion({ ...sample, profile }, storage);
  const doc = readAssistant(storage);
  doc.settings = validateSettings({
    demo: true,
    timezone: "Europe/London",
    senderName: "Alex",
  });
  writeAssistant(doc, storage);
  return storage;
}
test("non-destructive v1 migration: defaults off, legacy year is not a birth year, IDs and calendars preserved", () => {
  const s = memory();
  const old = saveOccasion({ ...sample, annual: false, year: 2027 }, s),
    backup = s.getItem(STORAGE_KEY);
  assert.equal(readOccasions(s)[0].profile, undefined);
  saveOccasion({ ...old, profile }, s);
  assert.equal(s.getItem(STORAGE_KEY), backup);
  const c = readOccasions(s)[0];
  assert.equal(c.id, old.id);
  assert.equal(c.year, 2027);
  assert.equal(c.profile.originYear, 2009);
  assert.equal(JSON.parse(s.getItem(CONTACTS_KEY)).version, 2);
  assert.ok(
    calendarEvent(c, { today: { year: 2027, month: 1, day: 1 } }).includes(
      "VALUE=DATE:20270615",
    ),
  );
  const edited = saveOccasion(
    {
      ...sample,
      revision: c.revision,
      nickname: "Bro",
      annual: false,
      year: 2027,
    },
    s,
  );
  assert.equal(edited.profile.originYear, 2009);
});
test("milestone birthday example and every required birthday milestone select real designs", () => {
  for (const age of BIRTHDAY_MILESTONES) {
    const c = { ...sample, profile: { ...profile, originYear: 2027 - age } };
    const r = generatedCard(
      c,
      { year: 2027, month: 6, day: 15 },
      themes,
      "Alex",
    );
    assert.equal(r.years, age);
    assert.equal(r.milestone, true);
    assert.ok(themes.some((t) => t.id === r.themeId));
    assert.ok(r.card.message.includes(String(age)));
  }
  const c = generatedCard(
    { ...sample, profile },
    { year: 2027, month: 6, day: 15 },
    themes,
  );
  assert.equal(c.themeId, "birthday-milestone");
  assert.equal(c.card.physicalConfig.coverGreeting, "Happy 18th Birthday");
  assert.equal(c.card.physicalConfig.coverName, "");
  assert.equal(c.card.birthdayNumber, "18");
});
test("missing year never invents age; anniversary numbers and preferences are respected", () => {
  const plain = generatedCard(
    sample,
    { year: 2027, month: 6, day: 15 },
    themes,
  );
  assert.equal(plain.years, null);
  assert.equal(plain.card.birthdayNumber, "");
  for (const years of ANNIVERSARY_MILESTONES) {
    const r = generatedCard(
      {
        ...sample,
        kind: "anniversary",
        profile: { ...profile, originYear: 2027 - years },
      },
      { year: 2027, month: 6, day: 15 },
      themes,
    );
    assert.equal(r.years, years);
    assert.equal(r.themeId, "anniversary");
    assert.equal(r.milestone, true);
  }
  const r = generatedCard(
    {
      ...sample,
      profile: {
        ...profile,
        style: "standard",
        opening: "gift-box",
        themeId: "birthday-midnight",
        greeting: "Happy {ordinalAge} Birthday, {name}!",
      },
    },
    { year: 2027, month: 6, day: 15 },
    themes,
  );
  assert.equal(r.card.v, 4);
  assert.equal(r.card.openingConfig.type, "gift-box");
  assert.equal(r.themeId, "birthday-midnight");
  assert.ok(r.card.message.includes("18th"));
  assert.throws(
    () =>
      generatedCard(
        { ...sample, profile: { greeting: "Age {age}" } },
        { year: 2027, month: 6, day: 15 },
        themes,
      ),
    /known year/,
  );
});
test("profile validation rejects invalid year/email/template/physical opening combinations", () => {
  for (const p of [
    { originYear: 2100 },
    { originYear: 1899 },
    { recipientEmail: "x\r\nBcc:evil@x.com" },
    { recipientEmail: "bad" },
    { style: "folded", opening: "gift-box" },
    { greeting: "Hello {secret}" },
  ])
    assert.throws(() => validateProfile({ ...profile, ...p }));
  assert.throws(
    () =>
      saveOccasion(
        {
          ...sample,
          month: 2,
          day: 29,
          profile: { ...profile, originYear: 2009 },
        },
        memory(),
      ),
    /does not exist/,
  );
});
test("timezone and leap-day occurrence are calendar based; no non-leap invented dates", () => {
  assert.deepEqual(
    zonedDate(new Date("2027-06-08T23:30:00Z"), "Europe/London"),
    { year: 2027, month: 6, day: 9 },
  );
  assert.deepEqual(
    zonedDate(new Date("2027-06-08T00:30:00Z"), "America/Los_Angeles"),
    { year: 2027, month: 6, day: 7 },
  );
  assert.throws(() => zonedDate(now, "not/a-zone"));
  const s = setup();
  const c = readOccasions(s)[0];
  saveOccasion(
    { ...c, month: 2, day: 29, profile: { ...c.profile, originYear: 2000 } },
    s,
  );
  const r = prepareContact(c, themes, {
    storage: s,
    now: new Date("2027-12-01T00:00:00Z"),
  });
  assert.deepEqual(r.date, { year: 2028, month: 2, day: 29 });
  assert.equal(r.years, 28);
});
test("local due generation requires both opt-ins, obeys lead time and is idempotent by contact/year", () => {
  const s = setup();
  assert.equal(
    prepareDue(themes, { storage: s, now: new Date("2027-06-07T12:00:00Z") })
      .length,
    0,
  );
  assert.equal(prepareDue(themes, { storage: s, now }).length, 1);
  assert.equal(prepareDue(themes, { storage: s, now }).length, 0);
  assert.equal(readAssistant(s).cards.length, 1);
  assert.equal(readAssistant(s).cards[0].status, "draft");
  const doc = readAssistant(s);
  doc.settings.demo = false;
  writeAssistant(doc, s);
  assert.equal(prepareDue(themes, { storage: s, now }).length, 0);
});
test("date/preference edits invalidate approval and preserve manually edited text until explicit regeneration", () => {
  const s = setup();
  let r = prepareDue(themes, { storage: s, now })[0];
  r = updatePrepared(
    r.id,
    r.version,
    { card: { ...r.card, message: "My own words" } },
    { storage: s, now },
  );
  r = updatePrepared(r.id, r.version, { status: "ready" }, { storage: s, now });
  r = updatePrepared(
    r.id,
    r.version,
    { status: "approved" },
    { storage: s, now },
  );
  const c = readOccasions(s)[0];
  saveOccasion({ ...c, day: 16 }, s);
  const doc = reconcile(readAssistant(s), readOccasions(s), now);
  writeAssistant(doc, s);
  assert.equal(doc.cards[0].status, "draft");
  assert.equal(doc.cards[0].card.message, "My own words");
  assert.equal(doc.cards[0].stale, true);
  assert.throws(() =>
    updatePrepared(
      r.id,
      r.version,
      { status: "approved" },
      { storage: s, now },
    ),
  );
  const regenerated = prepareContact(c, themes, {
    storage: s,
    now,
    force: true,
  });
  assert.equal(regenerated.date.day, 16);
  assert.notEqual(regenerated.card.message, "My own words");
});
test("deleted contacts cannot prepare or continue a queued card; sent and cancellation states are safe", () => {
  const s = setup();
  let r = prepareDue(themes, { storage: s, now })[0];
  assert.throws(
    () =>
      updatePrepared(
        r.id,
        r.version,
        { status: "approved" },
        { storage: s, now },
      ),
    /Preview/,
  );
  r = updatePrepared(r.id, r.version, { status: "ready" }, { storage: s, now });
  r = updatePrepared(
    r.id,
    r.version,
    { status: "approved" },
    { storage: s, now },
  );
  r = updatePrepared(r.id, r.version, { status: "sent" }, { storage: s, now });
  assert.equal(prepareDue(themes, { storage: s, now }).length, 0);
  deleteOccasion(sample.id, s);
  assert.equal(
    reconcile(readAssistant(s), readOccasions(s), now).cards.length,
    0,
  );
  assert.throws(
    () => prepareContact(sample, themes, { storage: s, now }),
    /deleted/,
  );
});
test("deleting a prepared card suppresses automatic recreation; explicit manual preparation can restore it", () => {
  const s = setup();
  const r = prepareDue(themes, { storage: s, now })[0];
  deletePrepared(r.id, s);
  assert.equal(prepareDue(themes, { storage: s, now }).length, 0);
  assert.equal(readAssistant(s).cards[0].card, null);
  assert.ok(
    prepareContact(sample, themes, { storage: s, now, force: true }).card,
  );
});
test("contact exports/imports are bounded, atomic, deduplicated and require explicit replacement", () => {
  const s = setup(),
    text = exportContacts(s),
    target = memory();
  assert.deepEqual(importContacts(text, { storage: target }), {
    added: 1,
    updated: 0,
  });
  assert.deepEqual(importContacts(text, { storage: target }), {
    added: 0,
    updated: 0,
  });
  const change = JSON.parse(text);
  change.items[0].nickname = "Changed";
  assert.throws(
    () => importContacts(JSON.stringify(change), { storage: target }),
    /Replace/,
  );
  assert.deepEqual(
    importContacts(JSON.stringify(change), { storage: target, replace: true }),
    { added: 0, updated: 1 },
  );
  const before = target.getItem(CONTACTS_KEY);
  change.items.push({ ...change.items[0], id: "bad" });
  assert.throws(() =>
    importContacts(JSON.stringify(change), { storage: target, replace: true }),
  );
  assert.equal(target.getItem(CONTACTS_KEY), before);
});
test("corrupt or full stores retain existing data; retention keeps future cards and clears old history", () => {
  const s = setup();
  s.setItem("silent-hello.prepared.v1", "broken");
  assert.throws(() => readAssistant(s), /not been overwritten/);
  assert.equal(s.getItem("silent-hello.prepared.v1"), "broken");
  const q = setup();
  const r = prepareDue(themes, { storage: q, now })[0];
  const doc = readAssistant(q);
  doc.cards[0].updatedAt = 0;
  assert.equal(reconcile(doc, readOccasions(q), now).cards.length, 1);
  assert.equal(
    reconcile(doc, readOccasions(q), new Date("2028-07-01T00:00:00Z")).cards
      .length,
    0,
  );
  assert.throws(
    () =>
      writeAssistant(readAssistant(setup()), {
        setItem() {
          throw Error();
        },
      }),
    /could not be saved/,
  );
});
