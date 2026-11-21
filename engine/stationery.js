// Profile, wax base, raised wax highlight, embossing, interior sketch.
const profiles = {
  romance: ["#713249", "#a45063", "heart", "rose"],
  rose: ["#713249", "#a45063", "rose", "rose"],
  wedding: ["#9b7752", "#cca36d", "laurel", "hearts"],
  christmas: ["#2b5649", "#518573", "snowflake", "winter"],
  "christmas-mistletoe": ["#2b5649", "#518573", "snowflake", "mistletoe"],
  birthday: ["#97642c", "#d29d51", "star", "birthday"],
  friendship: ["#49697a", "#7492a5", "leaf", "botanical"],
  thanks: ["#9b774b", "#cdac71", "flower", "botanical"],
  congratulations: ["#936d47", "#c49c6a", "laurel", "celebrate"],
  easter: ["#706388", "#a694b5", "flower", "spring"],
  george: ["#8d373b", "#bd5654", "rose", "dragon"],
  general: ["#84673f", "#b7945e", "star", "botanical"],
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
  const [wax, light, stamp, motif] = profiles[id];
  return {
    id, wax, light, stamp, motif,
    sealUrl: new URL(`../assets/stationery/seals.svg#${stamp}`, import.meta.url).href,
    motifUrl: new URL(`../assets/stationery/${motif}.svg`, import.meta.url).href,
  };
}
