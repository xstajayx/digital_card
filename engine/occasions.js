// Local calendar dates: no birth year, card text, email address or share URL.
export const STORAGE_KEY = "silent-hello.occasions.v1";
const kinds = new Set(["birthday", "anniversary"]);
const encoder = new TextEncoder();
export function validDay(month, day, year = 2000) {
  if (
    ![month, day, year].every(Number.isInteger) ||
    year < 1900 ||
    year > 9998 ||
    month < 1 ||
    month > 12 ||
    day < 1
  )
    return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}
export function localToday(now = new Date()) {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}
const dateKey = ({ year, month, day }) => year * 10000 + month * 100 + day;
export function nextDate(month, day, today = localToday()) {
  if (!validDay(month, day))
    throw new Error(
      "Choose a valid day and month. February has at most 29 days.",
    );
  if (!validDay(today.month, today.day, today.year))
    throw new Error(
      "The current date is unavailable. Check your device clock.",
    );
  for (let year = today.year; year <= Math.min(today.year + 8, 9998); year++) {
    const date = { year, month, day };
    if (validDay(month, day, year) && dateKey(date) >= dateKey(today))
      return date;
  }
  throw new Error("This occasion is outside the supported calendar range.");
}
export function validateOccasion(input) {
  if (!input || typeof input !== "object" || !kinds.has(input.kind))
    throw new Error("Choose birthday or anniversary.");
  if (
    typeof input.nickname !== "string" ||
    !input.nickname.trim() ||
    input.nickname.trim().length > 80 ||
    /[\u0000-\u001f\u007f]/u.test(input.nickname)
  )
    throw new Error("Enter a nickname of 1–80 characters without line breaks.");
  if (!validDay(input.month, input.day))
    throw new Error(
      "Choose a valid day and month. February has at most 29 days.",
    );
  if (
    typeof input.annual !== "boolean" ||
    ![1, 7, 14].includes(input.reminderDays)
  )
    throw new Error("Choose a reminder interval of 1, 7 or 14 days.");
  if (typeof input.id !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(input.id))
    throw new Error("The occasion identifier is invalid.");
  if (
    !Number.isInteger(input.revision) ||
    input.revision < 0 ||
    input.revision > 1000000
  )
    throw new Error("The occasion version is invalid.");
  if (!input.annual && !validDay(input.month, input.day, input.year))
    throw new Error("This one-time occasion needs a valid year.");
  // Explicit allowlist: unknown fields, including card messages, never persist.
  return {
    id: input.id,
    nickname: input.nickname.trim(),
    kind: input.kind,
    month: input.month,
    day: input.day,
    annual: input.annual,
    year: input.annual ? null : input.year,
    reminderDays: input.reminderDays,
    revision: input.revision,
  };
}
export function occurrence(input, today = localToday()) {
  const item = validateOccasion(input);
  if (item.annual) return nextDate(item.month, item.day, today);
  return dateKey(item) >= dateKey(today)
    ? { year: item.year, month: item.month, day: item.day }
    : null;
}
export function title(item) {
  return `${item.nickname}’s ${item.kind === "birthday" ? "Birthday" : "Anniversary"}`;
}
function browserStorage(storage) {
  try {
    return storage || globalThis.localStorage;
  } catch {
    throw new Error(
      "Browser storage is unavailable. Allow local storage to save occasions on this device.",
    );
  }
}
export function readOccasions(storage) {
  let raw;
  try {
    storage = browserStorage(storage);
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    throw new Error(
      "Browser storage is unavailable. Allow local storage to save occasions on this device.",
    );
  }
  if (raw === null) return [];
  try {
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 500
    )
      throw new Error();
    const items = data.items.map(validateOccasion);
    if (new Set(items.map((i) => i.id)).size !== items.length)
      throw new Error();
    return items;
  } catch {
    throw new Error(
      "Your saved occasions could not be read. They have not been overwritten. Check this browser’s stored data before trying again.",
    );
  }
}
export function saveOccasion(input, storage) {
  storage = browserStorage(storage);
  const item = validateOccasion(input),
    items = readOccasions(storage);
  const index = items.findIndex((i) => i.id === item.id);
  if (index >= 0 && items[index].revision !== item.revision)
    throw new Error(
      "This occasion changed in another tab. Close this form and edit it again.",
    );
  if (index < 0 && item.revision !== 0)
    throw new Error(
      "This occasion was deleted in another tab. Close this form and add it again.",
    );
  if (index < 0 && items.length >= 500)
    throw new Error(
      "You have 500 occasions. Delete an occasion before adding another.",
    );
  const saved = { ...item, revision: item.revision + 1 };
  if (index < 0) items.push(saved);
  else items[index] = saved;
  write(items, storage);
  return saved;
}
function write(items, storage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      "This browser could not save the change. Storage may be full or blocked. Your previous occasions are unchanged.",
    );
  }
}
export function deleteOccasion(id, storage) {
  storage = browserStorage(storage);
  const items = readOccasions(storage);
  write(
    items.filter((i) => i.id !== id),
    storage,
  );
}
export function escapeText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
export function foldLine(line) {
  let result = "",
    count = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (count + bytes > 75) {
      result += "\r\n ";
      count = 1;
    }
    result += character;
    count += bytes;
  }
  return result;
}
const compactDate = (date) =>
  `${date.year}${String(date.month).padStart(2, "0")}${String(date.day).padStart(2, "0")}`;
export function calendarEvent(
  input,
  { today = localToday(), now = new Date(), alarm = true } = {},
) {
  const item = validateOccasion(input),
    start = occurrence(item, today);
  if (!start)
    throw new Error(
      "This one-time occasion has passed. Edit its date before downloading a calendar event.",
    );
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
    throw new Error("Check your device clock before downloading.");
  const next = new Date(Date.UTC(start.year, start.month - 1, start.day + 1));
  const end = {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Silent Hello//My Occasions//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${item.id}@occasions.silenthello.local`,
    `DTSTAMP:${now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `SEQUENCE:${item.revision}`,
    `DTSTART;VALUE=DATE:${compactDate(start)}`,
    `DTEND;VALUE=DATE:${compactDate(end)}`,
    `SUMMARY:${escapeText(title(item))}`,
    "DESCRIPTION:A personal occasion saved with Silent Hello.",
    "TRANSP:TRANSPARENT",
  ];
  if (item.annual)
    lines.push(
      `RRULE:FREQ=YEARLY;BYMONTH=${item.month};BYMONTHDAY=${item.day}`,
    );
  if (alarm)
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `TRIGGER:-P${item.reminderDays}D`,
      `DESCRIPTION:${escapeText(title(item))}`,
      "END:VALARM",
    );
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
export function downloadCalendar(item, options = {}) {
  const text = calendarEvent(item, options);
  let url;
  try {
    url = URL.createObjectURL(
      new Blob([text], { type: "text/calendar;charset=utf-8" }),
    );
    const link = document.createElement("a");
    if (!("download" in link)) throw new Error();
    link.href = url;
    link.download = `silent-hello-${item.kind}-${item.month}-${item.day}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    // Retain the URL long enough for Safari to begin consuming the file.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    if (url) URL.revokeObjectURL(url);
    throw new Error(
      "The calendar download could not start. Allow downloads for this site or try another browser.",
    );
  }
}
