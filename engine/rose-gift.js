export const ROSE_ART = "blush-rose";
export const ROSE_LIMITS = { greeting: 100, message: 1000, signature: 100 };
export const DAY_MS = 86_400_000;
const FULL_BLOOM = {
  id: "bloom",
  day: 5,
  label: "In full bloom",
  alt: "A fully open blush-pink rose with layered petals and veined green leaves.",
};
const KEEPSAKE = { ...FULL_BLOOM, day: 14, label: "Your keepsake", keepsake: true };
const ROSE_STAGES = [
  { id: "bud", day: 0, label: "In bud", alt: "A partly closed blush rosebud on a green stem with two leaf sprigs." },
  { id: "opening", day: 2, label: "Beginning to open", alt: "Blush petals unfurling from the same rosebud." },
  FULL_BLOOM,
  KEEPSAKE,
];
const MAX_PAYLOAD = 10_000;
const ID_PATTERN = /^[0-9a-f]{32}$/;

export function newRoseId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function validateGift([version, art, id, mode, greeting, message, signature]) {
  if (version !== 1) throw new Error("This rose link uses an unsupported version.");
  if (art !== ROSE_ART) throw new Error("This rose artwork is unavailable.");
  if (typeof id !== "string" || !ID_PATTERN.test(id) || !["evolving", "everlasting"].includes(mode))
    throw new Error("This rose link is invalid.");
  const text = { greeting, message, signature };
  for (const [field, limit] of Object.entries(ROSE_LIMITS)) {
    if (typeof text[field] !== "string" || text[field].length > limit)
      throw new Error(`The ${field} must be ${limit} characters or fewer.`);
  }
  return { id, mode, ...text };
}

export function encodeRoseGift({ id, mode, greeting, message, signature }) {
  const data = [1, ROSE_ART, id, mode, greeting, message, signature];
  validateGift(data);
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeRoseGift(payload) {
  if (!payload) throw new Error("This rose link is missing its gift. Ask the sender for the complete link.");
  if (payload.length > MAX_PAYLOAD || !/^[A-Za-z0-9_-]+$/.test(payload))
    throw new Error("This rose link is invalid.");
  let data;
  try {
    const bytes = Uint8Array.from(atob(payload.replaceAll("-", "+").replaceAll("_", "/")), (char) =>
      char.charCodeAt(0),
    );
    data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("This rose link is invalid.");
  }
  if (!Array.isArray(data) || data.length !== 7)
    throw new Error("This rose link is invalid.");
  return validateGift(data);
}

export function readRoseState(raw, now) {
  if (!raw || !Number.isSafeInteger(raw.openedAt) || raw.openedAt <= 0 || raw.openedAt > now)
    return null;
  return { openedAt: raw.openedAt, kept: raw.kept === true };
}

export function roseStage(mode, state, now) {
  if (state?.kept) return { stage: KEEPSAKE, nextAt: null };
  if (mode === "everlasting") return { stage: FULL_BLOOM, nextAt: null };
  const openedAt = state?.openedAt ?? now;
  const age = Math.max(0, now - openedAt);
  const next = ROSE_STAGES.findIndex(({ day }) => age < day * DAY_MS);
  return next === -1
    ? { stage: KEEPSAKE, nextAt: null }
    : { stage: ROSE_STAGES[next - 1], nextAt: openedAt + ROSE_STAGES[next].day * DAY_MS };
}
