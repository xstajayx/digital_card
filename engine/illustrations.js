import { ART_PACKS } from "../catalogue/art-packs.js";
import { DESIGNS } from "../catalogue/designs.js";
// Local, transparent original vectors. Legacy payload IDs resolve only through this catalogue.
const COLLECTIONS = {
  birthday: [
    ["pink-cake", "Pink candle cake"],
    ["blue-cake", "Blue candle cake"],
    ["yellow-cake", "Yellow candle cake"],
    ["purple-cake", "Purple candle cake"],
    ["balloons", "Pastel balloons"],
    ["party-hat", "Striped party hat"],
  ],
  kids: [
    ["balloons", "Pastel balloons"],
    ["party-hat", "Striped party hat"],
    ["bear", "Birthday bear"],
    ["pink-cake", "Pink candle cake"],
  ],
  love: [
    ["red-heart", "Ruby heart"],
    ["pink-heart", "Blush heart"],
    ["purple-heart", "Lavender heart"],
    ["kiss", "Kiss mark"],
    ["rose", "Single rose"],
  ],
  christmas: [
    ["tree", "Decorated fir tree"],
    ["present", "Ribbon-wrapped present"],
    ["snowflake", "Winter snowflake"],
    ["bauble", "Rose gold bauble"],
  ],
  flowers: [
    ["flower", "Blush daisy"],
    ["bouquet", "Garden bouquet"],
    ["pink-heart", "Blush heart"],
  ],
  thanks: [
    ["bouquet", "Garden bouquet"],
    ["ribbon", "Appreciation ribbon"],
    ["stars", "Wishing stars"],
  ],
  dad: [
    ["tie", "Blue striped tie"],
    ["mug", "Favourite mug"],
    ["trophy", "Golden trophy"],
  ],
  baby: [
    ["pram", "Pastel pram"],
    ["bottle", "Mint baby bottle"],
    ["stars", "Dreamy stars"],
    ["bear", "Little teddy"],
  ],
  wedding: [
    ["rings", "Golden wedding rings"],
    ["bouquet", "Garden bouquet"],
    ["pink-heart", "Blush heart"],
  ],
  graduation: [
    ["cap", "Graduation cap"],
    ["diploma", "Rolled diploma"],
    ["stars", "Wishing stars"],
  ],
  congrats: [
    ["trophy", "Golden trophy"],
    ["stars", "Celebration stars"],
    ["fireworks", "Celebration burst"],
  ],
  well: [
    ["bandage", "Healing bandage"],
    ["tea", "Warm cup of tea"],
    ["pink-heart", "Caring heart"],
  ],
  sorry: [
    ["pink-heart", "Gentle heart"],
    ["envelope", "A heartfelt note"],
    ["flower", "Blush daisy"],
  ],
  thinking: [
    ["cloud", "Soft blue cloud"],
    ["pink-heart", "Caring heart"],
    ["envelope", "A heartfelt note"],
  ],
  luck: [
    ["stars", "Lucky stars"],
    ["clover", "Four-leaf clover"],
  ],
  friendship: [
    ["sun", "Little sunshine"],
    ["envelope", "A note for you"],
    ["bouquet", "Garden bouquet"],
  ],
  newyear: [
    ["fireworks", "New Year fireworks"],
    ["stars", "Midnight stars"],
    ["present", "A little present"],
  ],
  easter: [
    ["eggs", "Painted Easter eggs"],
    ["flower", "Spring daisy"],
    ["sun", "Spring sunshine"],
  ],
  general: [
    ["sun", "Little sunshine"],
    ["envelope", "A note for you"],
    ["flower", "Blush daisy"],
  ],
};
const THEME_COLLECTIONS = {
  "birthday-balloons": "birthday",
  "birthday-midnight": "birthday",
  "kids-party": "kids",
  "birthday-milestone": "birthday",
  love: "love",
  "love-letters": "love",
  "valentines-day": "love",
  anniversary: "love",
  wedding: "wedding",
  engagement: "wedding",
  "mothers-day": "flowers",
  "fathers-day": "dad",
  "new-baby": "baby",
  "thank-you": "thanks",
  congrats: "congrats",
  graduation: "graduation",
  "good-luck": "luck",
  "get-well": "well",
  "thinking-of-you": "thinking",
  sorry: "sorry",
  friendship: "friendship",
  christmas: "christmas",
  "christmas-snow": "christmas",
  "new-year": "newyear",
  easter: "easter",
  "just-because": "general",
};
const LEGACY = {
  "birthday-balloons": {
    "cake-pink.png": "pink-cake",
    "cake-yellow.png": "yellow-cake",
    "cake-blue.png": "blue-cake",
    "cake-purple.png": "purple-cake",
  },
  "kids-party": {
    "balloons-rainbow.png": "balloons",
    "hat-party.png": "party-hat",
    "animal-bear.png": "bear",
  },
  love: {
    "heart-red.png": "red-heart",
    "heart-pink.png": "pink-heart",
    "heart-purple.png": "purple-heart",
    "kiss-black.png": "kiss",
  },
  christmas: {
    "tree-green.png": "tree",
    "bauble-gold.png": "bauble",
    "snowflake-white.png": "snowflake",
  },
  "thank-you": {
    "bouquet-pastel.png": "bouquet",
    "ribbon-soft.png": "ribbon",
    "sparkles-gold.png": "stars",
  },
  congrats: {
    "trophy-gold.png": "trophy",
    "stars-blue.png": "stars",
    "confetti-pop.png": "fireworks",
  },
  "mothers-day": {
    "flowers-rose.png": "bouquet",
    "heart-soft.png": "pink-heart",
  },
  "fathers-day": {
    "tie-blue.png": "tie",
    "mug-classic.png": "mug",
  },
  "new-baby": {
    "pram-soft.png": "pram",
    "bottle-mint.png": "bottle",
    "stars-baby.png": "stars",
  },
  "get-well": {
    "bandage-red.png": "bandage",
    "tea-cup.png": "tea",
    "heart-heal.png": "pink-heart",
  },
  sorry: {
    "heart-small.png": "pink-heart",
    "note-soft.png": "envelope",
    "flower-soft.png": "flower",
  },
  "thinking-of-you": {
    "cloud-soft.png": "cloud",
    "heart-soft.png": "pink-heart",
    "envelope-soft.png": "envelope",
  },
  graduation: {
    "cap-black.png": "cap",
    "diploma-white.png": "diploma",
    "stars-gold.png": "stars",
  },
  anniversary: {
    "heart-red.png": "red-heart",
    "kiss-pink.png": "kiss",
  },
  "good-luck": {
    "star-gold.png": "stars",
    "clover-green.png": "clover",
  },
};
export const ILLUSTRATIONS = Object.fromEntries(
  Object.entries(THEME_COLLECTIONS).map(([theme, collection]) => [
    theme,
    COLLECTIONS[collection].map(([id, label]) => ({
      id,
      label,
      asset: `library/${id}.svg`,
    })),
  ]),
);
export function illustration(themeId, id) {
  const canonical = LEGACY[themeId]?.[id] || id;
  return (ILLUSTRATIONS[themeId] || []).find((item) => item.id === canonical);
}
export function illustrationUrl(item) {
  return new URL(`../stickers/${item.asset}`, import.meta.url).href;
}

ILLUSTRATIONS["birthday-envelope"] = ILLUSTRATIONS["birthday-balloons"];
ILLUSTRATIONS["christmas-gift"] = ILLUSTRATIONS.christmas;

// Additive allowlist: preserve every legacy collection and alias.
for (const design of DESIGNS)
  ILLUSTRATIONS[design.id] = ART_PACKS[design.packId].artwork;
