import {
  readOccasions,
  writeOccasions,
  validateOccasion,
  occurrence,
  validDay,
} from "./occasions.js";
import { validateProfile } from "./contact-profile.js";
import { validateCard, ordinal } from "./card-data.js";
import { defaultPhysical } from "./physical-schema.js";
import { defaultOpening } from "./openings/config.js";
export const ASSISTANT_KEY = "silent-hello.prepared.v1";
export const BIRTHDAY_MILESTONES = [
  1, 16, 18, 21, 30, 40, 50, 60, 70, 80, 90, 100,
];
export const ANNIVERSARY_MILESTONES = [
  1, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70,
];
export function zonedDate(now = new Date(), zone = "Europe/London") {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  } catch {
    throw new Error("Choose a valid IANA timezone, for example Europe/London.");
  }
  const get = (k) => Number(parts.find((p) => p.type === k)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}
export const dateNumber = (d) =>
  Date.UTC(d.year, d.month - 1, d.day) / 86400000;
export const profileFor = (c) => validateProfile(c.profile || {}, c.nickname);
export function anniversaryYears(contact, date) {
  const p = profileFor(contact);
  return p.originYear === null ? null : date.year - p.originYear;
}
export function generatedCard(contact, date, themes, senderName = "") {
  contact = validateOccasion(contact);
  const p = profileFor(contact),
    years = anniversaryYears(contact, date),
    birthday = contact.kind === "birthday";
  if (
    !validDay(date.month, date.day, date.year) ||
    (years !== null && years < 0)
  )
    throw new Error("The occasion year is invalid.");
  const milestone =
    years !== null &&
    (birthday ? BIRTHDAY_MILESTONES : ANNIVERSARY_MILESTONES).includes(years);
  const appropriate = (t) =>
    birthday ? t.birthday : t.occasionId === "anniversary";
  let theme = themes.find((t) => t.id === p.themeId && appropriate(t));
  const recommended = birthday
    ? milestone
      ? years === 1
        ? "kids-party"
        : "birthday-milestone"
      : years !== null && years < 16
        ? "kids-party"
        : "birthday-balloons"
    : "anniversary";
  theme ??=
    themes.find((t) => t.id === recommended && appropriate(t)) ||
    themes.find(appropriate);
  if (!theme) throw new Error("No compatible card design is available.");
  const name = (contact.nickname || p.recipientName).trim(),
    number = years !== null && years > 0 ? years : null;
  const greeting = birthday
    ? `Happy ${number ? ordinal(number) + " " : ""}Birthday`
    : `Happy ${number ? ordinal(number) + " " : ""}Anniversary`;
  const values = {
    name,
    age: birthday ? number : null,
    ordinalAge: birthday && number ? ordinal(number) : null,
    years: !birthday ? number : null,
    ordinalYears: !birthday && number ? ordinal(number) : null,
  };
  let message = p.greeting;
  if (message) {
    message = message.replace(/\{([^{}]+)\}/g, (_, key) => {
      if (values[key] === null || values[key] === undefined)
        throw new Error(
          "This greeting needs a known year. Add a year or remove its age/year placeholder.",
        );
      return values[key];
    });
  } else
    message = `${greeting}, ${name}!\n\n${birthday ? (milestone ? "Wishing you a wonderful milestone and a year full of good things." : "Wishing you a lovely day and a year full of good things.") : "Wishing you a lovely anniversary and many happy moments ahead."}`;
  const folded = p.style === "folded",
    physical = folded
      ? { ...defaultPhysical(), coverGreeting: greeting }
      : null;
  const raw = {
    v: folded ? 5 : 4,
    themeId: theme.id,
    to: p.recipientName || name,
    message,
    from: senderName.trim() || "Warm wishes",
    fontId: theme.defaultFontId || "nunito",
    textSize: 18,
    watermark: true,
    stickerId: "",
    birthdayNumber: birthday && number && number <= 120 ? String(number) : "",
    birthdayNumberEnabled: birthday && !!number,
    openingConfig: defaultOpening(folded ? "envelope" : p.opening),
    ...(physical ? { physicalConfig: physical } : {}),
  };
  const card = validateCard(raw, themes);
  return { card: toRaw(card), years: number, milestone, themeId: theme.id };
}
export function toRaw(card) {
  const { theme, ...raw } = card;
  return { ...raw, themeId: card.themeId || theme?.id };
}
export function validateSettings(value = {}) {
  const zone =
    value.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "Europe/London";
  zonedDate(new Date(), zone);
  if (value.demo !== undefined && typeof value.demo !== "boolean")
    throw new Error("Choose whether local preparation is enabled.");
  const retentionDays = value.retentionDays ?? 90;
  if (![7, 30, 90, 365].includes(retentionDays))
    throw new Error("Choose a supported retention period.");
  const senderName = value.senderName ?? "";
  if (
    typeof senderName !== "string" ||
    senderName.length > 120 ||
    /[\r\n\u0000-\u001f]/.test(senderName)
  )
    throw new Error("Enter a sender name of at most 120 characters.");
  return {
    timezone: zone,
    demo: value.demo ?? false,
    retentionDays,
    senderName: senderName.trim(),
  };
}
function storageOr(storage) {
  try {
    return storage || localStorage;
  } catch {
    throw new Error(
      "Browser storage is unavailable. No preparation was saved.",
    );
  }
}
export function readAssistant(storage) {
  storage = storageOr(storage);
  try {
    const raw = storage.getItem(ASSISTANT_KEY);
    if (raw === null)
      return { version: 1, settings: validateSettings(), cards: [] };
    const doc = JSON.parse(raw);
    if (
      doc.version !== 1 ||
      !Array.isArray(doc.cards) ||
      doc.cards.length > 1000
    )
      throw Error();
    doc.settings = validateSettings(doc.settings);
    const ids = new Set();
    for (const c of doc.cards) {
      if (
        typeof c.id !== "string" ||
        ids.has(c.id) ||
        !["draft", "ready", "approved", "sent", "failed", "cancelled"].includes(
          c.status,
        ) ||
        !Number.isInteger(c.version) ||
        !Number.isFinite(c.updatedAt) ||
        !c.date ||
        !validDay(c.date.month, c.date.day, c.date.year) ||
        typeof c.contactId !== "string" ||
        typeof c.signature !== "string" ||
        (typeof c.card !== "object" && c.card !== null)
      )
        throw Error();
      ids.add(c.id);
    }
    return doc;
  } catch {
    throw new Error(
      "Prepared-card storage could not be read. Existing data has not been overwritten.",
    );
  }
}
export function writeAssistant(doc, storage) {
  storage = storageOr(storage);
  if (doc.cards.length > 1000)
    throw new Error(
      "Prepared storage has 1,000 records. Clean up history before preparing more.",
    );
  try {
    storage.setItem(ASSISTANT_KEY, JSON.stringify(doc));
  } catch {
    throw new Error(
      "The prepared-card change could not be saved. Storage may be full or blocked; previous data is unchanged.",
    );
  }
}
export function signature(contact, date, settings) {
  return JSON.stringify([
    contact.id,
    contact.kind,
    contact.month,
    contact.day,
    date.year,
    contact.nickname,
    profileFor(contact),
    settings.senderName,
    settings.timezone,
  ]);
}
export function reconcile(doc, contacts, now = new Date()) {
  const map = new Map(contacts.map((c) => [c.id, c])),
    today = zonedDate(now, doc.settings.timezone),
    cutoff = now.getTime() - doc.settings.retentionDays * 86400000;
  doc.cards = doc.cards.filter(
    (r) =>
      map.has(r.contactId) &&
      !(Math.max(r.updatedAt, dateNumber(r.date) * 86400000) < cutoff),
  );
  for (const r of doc.cards) {
    const c = map.get(r.contactId);
    if (r.status === "sent" || r.status === "cancelled") continue;
    const next = occurrence(c, today);
    if (
      !next ||
      next.year !== r.date.year ||
      (r.origin === "automatic" && !profileFor(c).automation)
    ) {
      r.status = "cancelled";
      r.error =
        "Occasion changed, passed or automatic preparation was disabled.";
      r.version++;
      r.updatedAt = now.getTime();
    } else if (
      r.signature !== signature(c, next, doc.settings) &&
      r.signaturePending !== signature(c, next, doc.settings)
    ) {
      r.status = "draft";
      r.stale = true;
      r.error =
        "Contact or preferences changed. Review and regenerate; edited text has been kept.";
      r.version++;
      r.signaturePending = signature(c, next, doc.settings);
    }
  }
  return doc;
}
export function prepareContact(
  contact,
  themes,
  { storage, now = new Date(), force = false, automatic = false } = {},
) {
  storage = storageOr(storage);
  const contacts = readOccasions(storage),
    current = contacts.find((c) => c.id === contact.id);
  if (!current)
    throw new Error("This recipient was deleted. No card was prepared.");
  const doc = reconcile(readAssistant(storage), contacts, now),
    today = zonedDate(now, doc.settings.timezone),
    date = occurrence(current, today);
  if (!date)
    throw new Error("This one-time occasion has passed. Edit its date first.");
  const id = `${current.id}:${date.year}`,
    sig = signature(current, date, doc.settings),
    old = doc.cards.find((r) => r.id === id);
  if (old?.status === "sent") return old;
  if (old && !force && (old.signature === sig || old.userEdited)) {
    writeAssistant(doc, storage);
    return old;
  }
  let result,
    error = "";
  try {
    result = generatedCard(current, date, themes, doc.settings.senderName);
  } catch (e) {
    error = e.message;
  }
  const entry = {
    id,
    contactId: current.id,
    date,
    signature: sig,
    version: (old?.version || 0) + 1,
    status: error ? "failed" : "draft",
    error,
    stale: false,
    userEdited: false,
    origin: automatic ? "automatic" : "manual",
    updatedAt: now.getTime(),
    createdAt: old?.createdAt || now.getTime(),
    card: result?.card || null,
    years: result?.years ?? null,
    milestone: result?.milestone || false,
  };
  doc.cards = doc.cards.filter((r) => r.id !== id);
  doc.cards.push(entry);
  writeAssistant(doc, storage);
  return entry;
}
export function prepareDue(
  themes,
  { storage, now = new Date(), limit = 20 } = {},
) {
  storage = storageOr(storage);
  const contacts = readOccasions(storage),
    doc = reconcile(readAssistant(storage), contacts, now);
  writeAssistant(doc, storage);
  if (!doc.settings.demo) return [];
  const today = zonedDate(now, doc.settings.timezone),
    prepared = [];
  for (const c of contacts) {
    const next = occurrence(c, today);
    if (!next || !profileFor(c).automation) continue;
    const days = dateNumber(next) - dateNumber(today);
    if (days < 0 || days > c.reminderDays) continue;
    const existing = doc.cards.find((r) => r.id === `${c.id}:${next.year}`);
    if (
      existing &&
      (existing.signature === signature(c, next, doc.settings) ||
        existing.hidden ||
        existing.status === "sent")
    )
      continue;
    prepared.push(prepareContact(c, themes, { storage, now, automatic: true }));
    if (prepared.length >= limit) break;
  }
  return prepared;
}
export function updatePrepared(
  id,
  version,
  patch,
  { storage, now = new Date() } = {},
) {
  storage = storageOr(storage);
  const contacts = readOccasions(storage),
    doc = reconcile(readAssistant(storage), contacts, now),
    r = doc.cards.find((c) => c.id === id);
  if (!r)
    throw new Error(
      "This card or recipient was deleted, or its retention period ended.",
    );
  if (r.version !== version)
    throw new Error(
      "This card changed in another view. Reload before saving or approving.",
    );
  if (r.stale || r.status === "cancelled")
    throw new Error(
      "The contact changed. Regenerate and review this card before continuing.",
    );
  if (r.status === "sent")
    throw new Error("A card marked sent is read-only. Its history is kept.");
  if (
    patch.status &&
    !["draft", "ready", "approved", "sent", "cancelled", "failed"].includes(
      patch.status,
    )
  )
    throw new Error("Unsupported card state.");
  if (patch.status === "approved" && r.status !== "ready")
    throw new Error("Preview and validate this card before approval.");
  if (patch.status === "sent" && r.status !== "approved")
    throw new Error("Approve this card before marking it sent.");
  if (patch.card) {
    r.card = patch.card;
    r.userEdited = true;
    r.status = "draft";
    r.stale = false;
  }
  if (patch.status) r.status = patch.status;
  if (patch.error !== undefined) r.error = String(patch.error).slice(0, 500);
  r.version++;
  r.updatedAt = now.getTime();
  writeAssistant(doc, storage);
  return r;
}
export function deletePrepared(id, storage) {
  const doc = readAssistant(storage),
    r = doc.cards.find((r) => r.id === id);
  if (r) {
    Object.assign(r, {
      status: "cancelled",
      hidden: true,
      card: null,
      signature: "",
      userEdited: false,
      error: "Cancelled by you",
      updatedAt: Date.now(),
      version: r.version + 1,
    });
  }
  writeAssistant(doc, storage);
}
export function exportContacts(storage) {
  return JSON.stringify({ version: 2, items: readOccasions(storage) }, null, 2);
}
export function importContacts(text, { replace = false, storage } = {}) {
  if (typeof text !== "string" || text.length > 2_000_000)
    throw new Error("Choose an occasion JSON export under 2 MB.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This is not valid occasion JSON.");
  }
  if (
    ![1, 2].includes(data.version) ||
    !Array.isArray(data.items) ||
    data.items.length > 500
  )
    throw new Error(
      "Choose a supported v1 or v2 occasion export (at most 500 records).",
    );
  const incoming = data.items.map(validateOccasion);
  if (new Set(incoming.map((c) => c.id)).size !== incoming.length)
    throw new Error("The import contains duplicate contact IDs.");
  const items = readOccasions(storage),
    map = new Map(items.map((i) => [i.id, i]));
  let added = 0,
    updated = 0;
  for (const c of incoming) {
    const old = map.get(c.id);
    if (old) {
      const a = { ...old, revision: 0 },
        b = { ...c, revision: 0 };
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      if (!replace)
        throw new Error(
          "An imported ID already exists with different data. Enable Replace matching IDs to confirm replacement.",
        );
      map.set(c.id, {
        ...c,
        ...(!c.profile && old.profile ? { profile: old.profile } : {}),
        revision: old.revision + 1,
      });
      updated++;
    } else {
      map.set(c.id, { ...c, revision: 1 });
      added++;
    }
  }
  writeOccasions([...map.values()], storage);
  return { added, updated };
}

export function purgePreparedContact(id, storage) {
  storage = storageOr(storage);
  if (storage.getItem(ASSISTANT_KEY) === null) return;
  const doc = readAssistant(storage);
  doc.cards = doc.cards.filter((card) => card.contactId !== id);
  writeAssistant(doc, storage);
}
