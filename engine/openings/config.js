export const OPENING_TYPES = ["none", "envelope", "gift-box"];
export const EFFECTS = [
  "theme",
  "balloons",
  "confetti",
  "hearts",
  "snow",
  "flowers",
  "stars",
  "sparkles",
  "fade",
];
export const TONES = {
  theme: null,
  ivory: ["#f6e9d6", "#d6b482", "#654d38"],
  blush: ["#e9bec7", "#c98690", "#60384a"],
  forest: ["#315a4c", "#d9ab70", "#fff3db"],
  midnight: ["#343752", "#c3ac78", "#fff3db"],
};
export function validateOpening(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !OPENING_TYPES.includes(value.type) ||
    !Object.hasOwn(TONES, value.tone) ||
    !["plain", "striped", "dots"].includes(value.wrap) ||
    typeof value.seal !== "boolean" ||
    !EFFECTS.includes(value.effect)
  )
    throw new Error("Invalid opening configuration.");
  return {
    type: value.type,
    tone: value.tone,
    wrap: value.wrap,
    seal: value.seal,
    effect: value.effect,
  };
}
export const defaultOpening = (type = "envelope") => ({
  type,
  tone: "ivory",
  wrap: "plain",
  seal: true,
  effect: "theme",
});
