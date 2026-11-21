import { INTERIOR_MOTIFS } from "../catalogue/interior-art.js";

// Profile, wax base, raised wax highlight, embossing.
const profiles = {
  romance: ["#713249", "#a45063", "heart"],
  rose: ["#713249", "#a45063", "rose"],
  wedding: ["#9b7752", "#cca36d", "laurel"],
  christmas: ["#2b5649", "#518573", "snowflake"],
  "christmas-mistletoe": ["#2b5649", "#518573", "snowflake"],
  birthday: ["#97642c", "#d29d51", "star"],
  friendship: ["#49697a", "#7492a5", "leaf"],
  thanks: ["#9b774b", "#cdac71", "flower"],
  congratulations: ["#936d47", "#c49c6a", "laurel"],
  easter: ["#706388", "#a694b5", "flower"],
  george: ["#8d373b", "#bd5654", "rose"],
  general: ["#84673f", "#b7945e", "star"],
};
const occasionProfiles = {
  love: "romance", valentines: "romance", anniversary: "romance", wedding: "wedding", engagement: "wedding",
  christmas: "christmas", birthday: "birthday", "kids-birthday": "birthday", "milestone-birthday": "birthday",
  friendship: "friendship", "thank-you": "thanks", "mothers-day": "thanks",
  congratulations: "congratulations", graduation: "congratulations", "new-job": "congratulations",
  "new-year": "congratulations", easter: "easter", "st-george": "george",
};
const legacyProfiles = {
  "love-letters": "rose", "valentines-day": "romance",
  "birthday-balloons": "birthday", "birthday-midnight": "birthday", "birthday-milestone": "birthday",
  "birthday-envelope": "birthday", "kids-party": "birthday",
  "christmas-snow": "christmas", "christmas-gift": "christmas", congrats: "congratulations",
};
export function stationeryFor(themeId, design) {
  const suggested = design?.stationery || occasionProfiles[design?.occasionId] ||
    legacyProfiles[themeId] || occasionProfiles[themeId];
  const id = Object.hasOwn(profiles, suggested) ? suggested : "general";
  const [wax, light, stamp] = profiles[id];
  const motif = Object.hasOwn(INTERIOR_MOTIFS, themeId) ? INTERIOR_MOTIFS[themeId] : "";
  return {
    id, wax, light, stamp, motif,
    sealUrl: new URL(`../assets/stationery/seals.svg#${stamp}`, import.meta.url).href,
    motifUrl: motif ? new URL(`../assets/stationery/${motif}.svg`, import.meta.url).href : "",
  };
}
