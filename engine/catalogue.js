// The catalogue composes local content; no API, media upload or runtime HTML.
import { ART_PACKS } from "../catalogue/art-packs.js";
import { DESIGNS } from "../catalogue/designs.js";
import { OCCASIONS } from "../catalogue/occasions.js";
import { defaultPhysical } from "./physical-schema.js";

export { ART_PACKS, DESIGNS, OCCASIONS };
export const CATALOGUE_THEMES = DESIGNS.map((design) => {
  const occasion = OCCASIONS[design.occasionId],
    pack = ART_PACKS[design.packId];
  return {
    ...occasion,
    id: design.id,
    name: design.name,
    greeting: design.greeting,
    style: pack.styleFamily,
    defaultFontId: pack.fonts[0],
    palette: pack.palette,
    features: { opening: pack.effect },
    catalogue: {
      ...design,
      styleFamily: pack.styleFamily,
      styleLabel: pack.styleLabel,
      illustrationFamily: pack.illustrationFamily,
      interests: pack.interests,
      supportsMilestone: !!occasion.birthday,
      staticSendable: true,
    },
  };
});
export function catalogueDesign(id) {
  return CATALOGUE_THEMES.find((theme) => theme.id === id);
}
export function artPack(theme) {
  return ART_PACKS[theme.catalogue?.packId];
}
export function designMetadata(theme) {
  return (
    theme.catalogue || {
      id: theme.id,
      styleFamily: theme.style,
      styleLabel: theme.style,
      relationships: ["friend", "family"],
      recipientTypes: ["anyone"],
      interests: [],
      tones:
        theme.style === "party" || theme.style === "confetti"
          ? ["playful"]
          : ["heartfelt"],
      supportsMilestone: !!theme.birthday,
      staticSendable: true,
    }
  );
}
// Used only for NEW cards/design choices. Decoding v1-v5 never applies defaults.
export function designDefaults(theme) {
  const pack = artPack(theme);
  if (!pack) return {};
  return {
    stickerId: pack.artwork[0].id,
    fontId: pack.fonts[0],
    openingConfig: { ...pack.envelope },
    physicalConfig: {
      ...defaultPhysical(),
      coverName: "",
      coverArt: pack.artwork[0].id,
      handwriting: pack.fonts[0],
      signature: pack.fonts[0],
      effects: false,
    },
  };
}
export const FEATURED_COLLECTIONS = [
  {
    id: "curated",
    name: "The little details",
    description: "New illustrated cards, made for their kind of lovely.",
  },
  {
    id: "interests",
    name: "Their favourite things",
    description: "For book people, garden people, gamers and daydreamers.",
  },
  {
    id: "luxury",
    name: "A little golden",
    description: "Botanicals, candlelight and elegant celebrations.",
  },
  {
    id: "funny",
    name: "Send a little grin",
    description: "A gentle pun and a whole lot of affection.",
  },
  {
    id: "milestone",
    name: "A wonderful age",
    description: "Make their next chapter feel like a special one.",
  },
  {
    id: "winter",
    name: "Winter at the door",
    description: "Robins, snowy cottages and welcoming wreaths.",
  },
];
export function matchesCollection(theme, value) {
  const meta = designMetadata(theme);
  switch (value) {
    case "curated":
      return !!theme.catalogue;
    case "interests":
      return meta.interests.length > 0;
    case "luxury":
      return ["gold", "minimal"].includes(meta.styleFamily);
    case "funny":
      return meta.tones.includes("funny");
    case "milestone":
      return theme.milestone;
    case "winter":
      return theme.occasionId === "christmas";
    default:
      return !value || theme.group === value;
  }
}
export function matchesDesign(theme, filters) {
  const meta = designMetadata(theme);
  const words = [
    theme.name,
    theme.occasion,
    theme.greeting,
    meta.subtitle,
    meta.styleLabel,
    ...meta.interests,
    ...meta.relationships,
    ...meta.tones,
  ]
    .join(" ")
    .toLocaleLowerCase();
  return (
    (!filters.search ||
      words.includes(filters.search.trim().toLocaleLowerCase())) &&
    (!filters.occasion || theme.occasionId === filters.occasion) &&
    (!filters.style || meta.styleFamily === filters.style) &&
    (!filters.relationship ||
      meta.relationships.includes(filters.relationship)) &&
    (!filters.interest || meta.interests.includes(filters.interest)) &&
    (!filters.tone || meta.tones.includes(filters.tone)) &&
    (!filters.opening || theme.features.opening === filters.opening) &&
    matchesCollection(theme, filters.collection)
  );
}
