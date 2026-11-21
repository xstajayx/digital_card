// Illustrated collections for the static folded-card catalogue.
import { CHEEKY_COLLECTION } from "./cheeky.js";
export const PREMIUM_COLLECTIONS = [
  {
    "id": "gilded-moments",
    "name": "Gilded Moments",
    "description": "Gold linework for the big days."
  },
  {
    "id": "botanical-studio",
    "name": "Botanical Studio",
    "description": "Soft colours and botanical illustrations."
  },
  {
    "id": "little-joys",
    "name": "Little Joys",
    "description": "Playful illustrations with a personal touch."
  },
  {
    "id": "winter-atelier",
    "name": "Winter Atelier",
    "description": "Winter scenes and warm festive details."
  },
  CHEEKY_COLLECTION,
];
const cards = [
  ["champagne-stars", "birthday", "Champagne Stars", "Happy Birthday", 0, []],
  ["interlocking-rings", "wedding", "Interlocking Rings", "Congratulations", 0, []],
  ["paired-swans", "anniversary", "Paired Swans", "Happy Anniversary", 0, []],
  ["diamond-rays", "engagement", "Diamond Rays", "You’re Engaged!", 0, []],
  ["laurel-letter", "graduation", "Laurel Letter", "You Did It", 0, []],
  ["rising-sun", "congratulations", "Rising Sun", "Congratulations", 0, []],
  ["peony-study", "birthday", "Peony Study", "Happy Birthday", 1, []],
  ["olive-branch", "thank-you", "Olive Branch", "Thank You", 1, []],
  ["forget-me-not", "sympathy", "Forget Me Not", "With Sympathy", 1, []],
  ["citrus-blossom", "get-well", "Citrus Blossom", "Feel Better Soon", 1, []],
  ["tulip-market", "mothers-day", "Tulip Market", "Happy Mother’s Day", 1, []],
  ["wildflower-post", "thinking-of-you", "Wildflower Post", "Thinking of You", 1, []],
  ["kayak-morning", "birthday", "Kayak Morning", "Happy Birthday", 2, ["outdoors", "kayaking"]],
  ["record-day", "birthday", "Record Day", "Happy Birthday", 2, ["music", "vinyl"]],
  ["dachshund-parade", "birthday", "Dachshund Parade", "Happy Birthday", 2, ["dogs", "pets"]],
  ["rocket-post", "kids-birthday", "Rocket Post", "Blast Off!", 2, []],
  ["moon-cradle", "new-baby", "Moon Cradle", "Hello Little One", 2, []],
  ["little-greenhouse", "new-home", "Little Greenhouse", "Home Sweet Home", 2, []],
  ["snow-globe-train", "christmas", "Snow Globe Train", "Merry Christmas", 3, []],
  ["ribbon-bells", "christmas", "Ribbon Bells", "Merry Christmas", 3, []],
  ["ski-lodge", "christmas", "Ski Lodge", "Christmas Wishes", 3, ["skiing", "winter"]],
  ["midnight-fox", "christmas", "Midnight Fox", "Merry Christmas", 3, []],
  ["festive-orange", "christmas", "Festive Orange", "Festive Wishes", 3, []],
  ["midnight-fireworks", "new-year", "Midnight Fireworks", "Happy New Year", 3, []],
];
const styles = ["gold", "floral", "playful", "heritage"];

export const PREMIUM_DESIGNS = cards.map(([id, occasionId, name, greeting, collection]) => ({
  id,
  occasionId,
  name,
  greeting,
  packId: id,
  collection: PREMIUM_COLLECTIONS[collection].id,
  subtitle: PREMIUM_COLLECTIONS[collection].name,
  relationships: ["friend", "family"],
  recipientTypes: ["anyone"],
  tones: [collection === 2 ? "playful" : "sentimental"],
}));

export const PREMIUM_PACKS = Object.fromEntries(
  cards.map(([id, , name, , collection, interests]) => [
    id,
    {
      id,
      illustrationFamily: id,
      styleFamily: styles[collection],
      artwork: [
        { id, label: name, asset: `packs/${id}.svg` },
        { id: "envelope", label: "Envelope", asset: "library/envelope.svg" },
      ],
      envelope: { type: "envelope", tone: "theme", wrap: "plain", seal: true, effect: "theme" },
      coverName: "hidden",
      interests,
      tones: [collection === 2 ? "playful" : "sentimental"],
    },
  ]),
);
