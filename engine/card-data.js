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
export function validateCard(raw, themes) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid card data.");
  const theme = themes.find((t) => t.id === raw.themeId);
  if (!theme) throw new Error("Theme unavailable.");
  const text = (key) => {
    if (raw[key] == null) return "";
    if (typeof raw[key] !== "string" || raw[key].length > 20000)
      throw new Error("Invalid " + key + ".");
    return raw[key];
  };
  const color = (key) => (/^#[0-9a-f]{6}$/i.test(raw[key]) ? raw[key] : "");
  const n = Number(raw.birthdayNumber);
  const birthdayNumber =
    Number.isInteger(n) && n >= 1 && n <= 120 ? String(n) : "";
  return {
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
    birthdayNumber: raw.birthdayNumberEnabled === false ? "" : birthdayNumber,
    stickerId: illustration(theme.id, raw.stickerId) ? raw.stickerId : "",
    textSize: [14, 16, 18, 20].includes(raw.textSize) ? raw.textSize : 18,
  };
}
export function greetingFor(theme, name, enabled, number) {
  const n = Number(number),
    last = n % 100;
  const suffix =
    last >= 11 && last <= 13
      ? "th"
      : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  const greetings = {
    "birthday-balloons": "Happy Birthday",
    "kids-party": "Party Time",
    "thank-you": "Thank you",
    love: "All my love",
    congrats: "Congratulations",
    christmas: "Merry Christmas",
  };
  const greeting =
    theme.id.startsWith("birthday") && enabled && number
      ? `Happy ${number}${suffix} Birthday`
      : greetings[theme.id] || theme.occasion || "Hello";
  return `${greeting}, ${name || "Friend"}!`;
}
export async function loadThemes() {
  const ids = await (
    await fetch(new URL("../themes/themes.json", import.meta.url))
  ).json();
  return Promise.all(
    ids.map(async (id) => ({
      ...(await (
        await fetch(new URL(`../themes/${id}/theme.json`, import.meta.url))
      ).json()),
      id,
    })),
  );
}
