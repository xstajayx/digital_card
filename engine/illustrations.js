export const ILLUSTRATIONS = {
  "birthday-balloons": [
    {
      id: "cake-pink.png",
      label: "Birthday cake · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "cake-yellow.png",
      label: "Birthday cake · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "cake-blue.png",
      label: "Birthday cake · 3",
      asset: "illustration-3.svg",
    },
    {
      id: "cake-purple.png",
      label: "Birthday cake · 4",
      asset: "illustration-4.svg",
    },
  ],
  love: [
    {
      id: "heart-red.png",
      label: "Heart · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "heart-pink.png",
      label: "Heart · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "heart-purple.png",
      label: "Heart · 3",
      asset: "illustration-3.svg",
    },
    {
      id: "kiss-black.png",
      label: "Heart · 4",
      asset: "illustration-4.svg",
    },
  ],
  christmas: [
    {
      id: "tree-green.png",
      label: "Christmas tree · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "bauble-gold.png",
      label: "Christmas tree · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "snowflake-white.png",
      label: "Christmas tree · 3",
      asset: "illustration-3.svg",
    },
  ],
  "thank-you": [
    {
      id: "bouquet-pastel.png",
      label: "Thank-you flower · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "ribbon-soft.png",
      label: "Thank-you flower · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "sparkles-gold.png",
      label: "Thank-you flower · 3",
      asset: "illustration-3.svg",
    },
  ],
  congrats: [
    {
      id: "trophy-gold.png",
      label: "Celebration star · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "stars-blue.png",
      label: "Celebration star · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "confetti-pop.png",
      label: "Celebration star · 3",
      asset: "illustration-3.svg",
    },
  ],
  "kids-party": [
    {
      id: "balloons-rainbow.png",
      label: "Party balloon · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "hat-party.png",
      label: "Party balloon · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "animal-bear.png",
      label: "Party balloon · 3",
      asset: "illustration-3.svg",
    },
  ],
  "mothers-day": [
    {
      id: "flowers-rose.png",
      label: "Mother’s Day flower · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "heart-soft.png",
      label: "Mother’s Day flower · 2",
      asset: "illustration-2.svg",
    },
  ],
  "fathers-day": [
    {
      id: "tie-blue.png",
      label: "Father’s Day cup · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "mug-classic.png",
      label: "Father’s Day cup · 2",
      asset: "illustration-2.svg",
    },
  ],
  "new-baby": [
    {
      id: "pram-soft.png",
      label: "Baby bottle · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "bottle-mint.png",
      label: "Baby bottle · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "stars-baby.png",
      label: "Baby bottle · 3",
      asset: "illustration-3.svg",
    },
  ],
  "get-well": [
    {
      id: "bandage-red.png",
      label: "Get-well flower · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "tea-cup.png",
      label: "Get-well flower · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "heart-heal.png",
      label: "Get-well flower · 3",
      asset: "illustration-3.svg",
    },
  ],
  sorry: [
    {
      id: "heart-small.png",
      label: "Apology flower · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "note-soft.png",
      label: "Apology flower · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "flower-soft.png",
      label: "Apology flower · 3",
      asset: "illustration-3.svg",
    },
  ],
  "thinking-of-you": [
    {
      id: "cloud-soft.png",
      label: "Thinking-of-you envelope · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "heart-soft.png",
      label: "Thinking-of-you envelope · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "envelope-soft.png",
      label: "Thinking-of-you envelope · 3",
      asset: "illustration-3.svg",
    },
  ],
  graduation: [
    {
      id: "cap-black.png",
      label: "Graduation cap · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "diploma-white.png",
      label: "Graduation cap · 2",
      asset: "illustration-2.svg",
    },
    {
      id: "stars-gold.png",
      label: "Graduation cap · 3",
      asset: "illustration-3.svg",
    },
  ],
  anniversary: [
    {
      id: "heart-red.png",
      label: "Anniversary heart · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "kiss-pink.png",
      label: "Anniversary heart · 2",
      asset: "illustration-2.svg",
    },
  ],
  "good-luck": [
    {
      id: "star-gold.png",
      label: "Lucky star · 1",
      asset: "illustration-1.svg",
    },
    {
      id: "clover-green.png",
      label: "Lucky star · 2",
      asset: "illustration-2.svg",
    },
  ],
};
export function illustration(themeId, id) {
  return (ILLUSTRATIONS[themeId] || []).find((item) => item.id === id);
}
