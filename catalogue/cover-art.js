// Edition two is the only new default for these designs. Historical IDs remain
// in their existing packs and library collections for saved cards and drafts.
const editions = {
  "birthday-baking": ["#e1c0a0", "#222d30", "playful"],
  "birthday-balloons": ["#dac6be", "#222d30", "landscape"],
  "birthday-beer": ["#202722", "#fff8e9", "home"],
  "birthday-books": ["#242120", "#fff8e9", "home"],
  "birthday-car": ["#e2beae", "#222d30", "landscape"],
  "birthday-coffee": ["#3a3532", "#fff8e9", "record"],
  "birthday-envelope": ["#452a24", "#fff8e9", "home"],
  "birthday-fishing": ["#c4c0c8", "#222d30", "landscape"],
  "birthday-football": ["#282e38", "#fff8e9", "landscape"],
  "birthday-gaming": ["#482e26", "#fff8e9", "launch"],
  "birthday-garden": ["#c9bc89", "#222d30", "home"],
  "birthday-gilded": ["#161e30", "#fff8e9", "home"],
  "birthday-gin": ["#c2c2c0", "#222d30", "home"],
  "birthday-midnight": ["#1a2540", "#fff8e9", "home"],
  "birthday-pets": ["#d8bdaa", "#222d30", "playful"],
  "birthday-tractor": ["#d4af84", "#222d30", "landscape"],
  "champagne-stars": ["#1c1627", "#fff8e9", "home"],
  "peony-study": ["#f0c4a0", "#222d30", "home"],
};

export const COVER_EDITIONS = Object.fromEntries(
  Object.entries(editions).map(([design, [paper, ink, layout]]) => [
    design,
    {
      id: `${design}-cover-v2`,
      label: "Illustrated cover",
      asset: `covers/${design}.webp`,
      cover: { paper, ink, layout },
    },
  ]),
);
