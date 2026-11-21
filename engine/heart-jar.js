export const JAR_THEMES = [
  { id: "love", title: "Love Notes", description: "Little ways to say I love you.", greeting: "A few things I love about you.", ink: "#7b344b", tint: "#eed4da", stamp: "✦", colors: ["#e8aab6", "#f4c6c3", "#e1bddf", "#f6dfca", "#f7eee0"] },
  { id: "friends", title: "Best Friends", description: "Inside jokes, favourite memories and little thank-yous.", greeting: "Here’s to us.", ink: "#445b79", tint: "#dce7ef", stamp: "✧", colors: ["#bcd9ee", "#ccc3e8", "#f2c6d6", "#c3e4d8", "#f7e5aa"] },
  { id: "birthday", title: "Birthday Wishes", description: "A pocketful of wishes for their day.", greeting: "Wishing you a wonderful birthday.", ink: "#77502b", tint: "#f2dfb9", stamp: "✹", colors: ["#f5db92", "#f2b791", "#e3badf", "#b7d6e7", "#ecb8c8"] },
  { id: "pick-me-up", title: "Little Pick-Me-Ups", description: "A few kind words for the days that need them.", greeting: "Here are some small things to hold on to.", ink: "#365b50", tint: "#d5e9dd", stamp: "✿", colors: ["#a9d8bd", "#edf0b3", "#e6d4ed", "#c0dce5", "#f3d3ba"] },
  { id: "amazing", title: "Reasons You’re Amazing", description: "Make a list of the things that make them, them.", greeting: "A few of my favourite things about you.", ink: "#654079", tint: "#e6d8ed", stamp: "✷", colors: ["#d7b6e8", "#c4b8e1", "#efbad3", "#f2d6a6", "#b9dfe0"] },
  { id: "just-because", title: "Just Because", description: "A small surprise, any day of the week.", greeting: "A little something to brighten your day.", ink: "#764b3d", tint: "#f3dfd0", stamp: "❋", colors: ["#f5ccb1", "#ebc0c9", "#c2e1ce", "#bdd7ee", "#f5e5b7", "#f7eee0"] },
];
export const HEART_MIN = 3;
export const HEART_MAX = 20;
export const NOTE_LIMIT = 140;
export const FIELD_LIMITS = { recipient: 60, title: 64, signature: 60, greeting: 120 };
export const MAX_LINK_LENGTH = 12000;

export function jarTheme(id) {
  return JAR_THEMES.find((theme) => theme.id === id);
}
export function newJarId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, "0")).join("");
}
export function noteError(value, notes, except = -1) {
  if (!value.trim()) return "Write a message for this heart.";
  if (value.length > NOTE_LIMIT) return `Use ${NOTE_LIMIT} characters or fewer.`;
  if (notes.some((note, index) => index !== except && note.trim() === value.trim()))
    return "This message is already in the jar.";
  return "";
}
function validate(record) {
  if (!Array.isArray(record) || record.length !== 8) throw new Error("This Heart Jar link is invalid.");
  const [version, theme, id, recipient, title, signature, greeting, notes] = record;
  if (version !== 1 || !jarTheme(theme)) throw new Error("This Heart Jar design or link version is unavailable.");
  if (typeof id !== "string" || !/^[0-9a-f]{32}$/.test(id)) throw new Error("This Heart Jar link is invalid.");
  const fields = { recipient, title, signature, greeting };
  for (const [key, limit] of Object.entries(FIELD_LIMITS)) {
    if (typeof fields[key] !== "string" || fields[key].length > limit)
      throw new Error(`The ${key} must be ${limit} characters or fewer.`);
  }
  if (!Array.isArray(notes) || notes.length < HEART_MIN || notes.length > HEART_MAX)
    throw new Error(`Add ${HEART_MIN}–${HEART_MAX} hearts to your jar.`);
  if (notes.some((note) => typeof note !== "string"))
    throw new Error("This Heart Jar contains an invalid note.");
  for (const [index, note] of notes.entries()) {
    const error = noteError(note, notes, index);
    if (error) throw new Error(error);
  }
  return { theme, id, ...fields, notes };
}
export function encodeJar({ theme, id, recipient, title, signature, greeting, notes }) {
  const record = [1, theme, id, recipient, title, signature, greeting, notes];
  validate(record);
  const bytes = new TextEncoder().encode(JSON.stringify(record));
  const payload = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  if (payload.length > MAX_LINK_LENGTH) throw new Error("This link is too long. Shorten a few messages and try again.");
  return payload;
}
export function decodeJar(payload) {
  if (!payload || payload.length > MAX_LINK_LENGTH || !/^[A-Za-z0-9_-]+$/.test(payload))
    throw new Error("This Heart Jar link is incomplete or invalid. Ask the sender for the complete link.");
  let record;
  try {
    const bytes = Uint8Array.from(atob(payload.replaceAll("-", "+").replaceAll("_", "/")), (char) => char.charCodeAt(0));
    record = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("This Heart Jar link is incomplete or invalid.");
  }
  return validate(record);
}
const key = (gift) => `silent-hello.jar.v1.${gift.id}`;
export function readHearts(gift) {
  try {
    const progress = JSON.parse(localStorage.getItem(key(gift)));
    return new Set(Array.isArray(progress) ? progress.filter((index) =>
      Number.isInteger(index) && index >= 0 && index < gift.notes.length) : []);
  } catch { return new Set(); }
}
export function saveHearts(gift, opened) {
  try {
    localStorage.setItem(key(gift), JSON.stringify([...readHearts(gift), ...opened].filter((index, i, list) => list.indexOf(index) === i)));
    return true;
  } catch { return false; }
}
