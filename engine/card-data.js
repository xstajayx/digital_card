import { sanitizeGiftUrl } from "./sanitize.js";
import { illustration } from "./illustrations.js";

export const FONTS = [
  "fredoka",
  "pacifico",
  "quicksand",
  "poppins",
  "nunito",
  "playfair",
];
export const LIMITS = { to: 120, message: 6000, from: 160, giftUrl: 500 };
export function birthdayNumber(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 120 ? String(n) : "";
}
export function ordinal(value) {
  const n = Number(value),
    last = n % 100;
  return `${n}${last >= 11 && last <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}
export function validateCard(raw, themes) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid card data.");
  if (raw.v != null && ![1, 2, 3].includes(raw.v))
    throw new Error("This card version is not supported yet.");
  const theme = themes.find((t) => t.id === raw.themeId);
  if (!theme) throw new Error("This card design is unavailable.");
  const text = (key) => {
    if (raw[key] == null) return "";
    // Preserve previously supported v1/v2 text. New cards have tighter editor limits.
    const limit = raw.v === 3 ? LIMITS[key] : 20000;
    if (typeof raw[key] !== "string" || raw[key].length > limit)
      throw new Error(`Invalid ${key}.`);
    return raw[key];
  };
  const color = (key) =>
    typeof raw[key] === "string" && /^#[0-9a-f]{6}$/i.test(raw[key])
      ? raw[key]
      : "";
  return {
    v: raw.v || 1,
    theme,
    themeId: theme.id,
    to: text("to"),
    message: text("message"),
    from: text("from"),
    fontId: FONTS.includes(raw.fontId) ? raw.fontId : "fredoka",
    paperOverride: color("paperOverride"),
    inkOverride: color("inkOverride"),
    watermark: raw.watermark !== false,
    giftUrl: sanitizeGiftUrl(raw.giftUrl),
    birthdayNumber:
      raw.birthdayNumberEnabled === false
        ? ""
        : birthdayNumber(raw.birthdayNumber),
    stickerId: illustration(theme.id, raw.stickerId) ? raw.stickerId : "",
    textSize: [14, 16, 18, 20].includes(raw.textSize) ? raw.textSize : 18,
  };
}
export function greetingFor(theme, name, enabled, number) {
  const age = birthdayNumber(number);
  const greeting =
    theme.birthday && enabled && age
      ? `Happy ${ordinal(age)} Birthday`
      : theme.greeting || theme.occasion;
  return `${greeting}${name.trim() ? `, ${name.trim()}` : ""}!`;
}
export function cardContent(current) {
  return {
    ...current,
    themeId: current.theme.id,
    recipient: current.to,
    headline: greetingFor(
      current.theme,
      current.to,
      current.birthdayNumberEnabled ?? !!current.birthdayNumber,
      current.birthdayNumber,
    ),
    birthdayNumber:
      (current.birthdayNumberEnabled ?? true)
        ? birthdayNumber(current.birthdayNumber)
        : "",
    giftUrl:
      (current.giftEnabled ?? true) ? sanitizeGiftUrl(current.giftUrl) : "",
  };
}
export async function loadThemes() {
  const request = async (path) => {
    const response = await fetch(new URL(path, import.meta.url));
    if (!response.ok)
      throw new Error(
        "Could not load card designs. Please refresh to try again.",
      );
    return response.json();
  };
  const ids = await request("../themes/themes.json");
  return Promise.all(
    ids.map(async (id) => {
      if (!/^[a-z0-9-]+$/.test(id))
        throw new Error("Invalid design catalogue.");
      return { ...(await request(`../themes/${id}/theme.json`)), id };
    }),
  );
}
export function contrastRatio(paper, ink) {
  const luminance = (hex) => {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map((n) => parseInt(n, 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const values = [luminance(paper), luminance(ink)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
