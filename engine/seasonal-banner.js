const DAY = 86_400_000;
const ukDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
});
export const civilDay = (year, month, day) => Date.UTC(year, month - 1, day) / DAY;
export function londonDay(instant) {
  const fields = Object.fromEntries(ukDate.formatToParts(instant).map(({ type, value }) => [type, Number(value)]));
  return civilDay(fields.year, fields.month, fields.day);
}

export function easterSunday(year) {
  // Gregorian computus (Meeus/Jones/Butcher).
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const l = (32 + 2 * e + 2 * Math.floor(c / 4) - h - c % 4) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const date = h + l - 7 * m + 114;
  return civilDay(year, Math.floor(date / 31), date % 31 + 1);
}
const fixed = (month, day) => (year) => civilDay(year, month, day);
const daysBefore = (days) => (_year, event) => event - days;
const fathersDay = (year) => {
  const june = civilDay(year, 6, 1);
  return june + (7 - new Date(june * DAY).getUTCDay()) % 7 + 14;
};
const mothersDay = (year) => easterSunday(year) - 21;

// Set to an enabled promotion ID or "evergreen" to pin a campaign.
export const MANUAL_PROMOTION = null;
const artwork = (id) => `./assets/seasonal/${id}.svg`;
export const EVERGREEN = {
  id: "evergreen", name: "Silent Hello", headline: "Send a Little Joy",
  description: "Beautiful digital cards for life’s big moments and little surprises.",
  cta: "Explore Greeting Cards", href: "./cards.html", artwork: artwork("evergreen"),
  alt: "An illustrated greeting card tucked into a sage-green envelope.",
};

function seasonal(id, occasion, name, start, event, priority, headline, description, cta, alt, enabled = true) {
  return {
    id, occasion, name, start, event, priority, headline, description, cta, alt, enabled,
    href: `./cards.html?occasion=${encodeURIComponent(occasion)}#catalogue`,
    artwork: artwork(id),
  };
}
export const PROMOTIONS = [
  seasonal("christmas", "christmas", "Christmas", fixed(11, 1), fixed(12, 25), 10,
    "A Little Christmas Magic", "Thoughtful Christmas cards with a little extra joy.", "Explore Christmas Cards",
    "A snowy fir and tiny lit windows inside a paper snow globe."),
  seasonal("valentines", "valentines", "Valentine’s Day", fixed(1, 25), fixed(2, 14), 20,
    "Send a Little Love", "Romantic, funny and heartfelt cards for someone special.", "Explore Valentine’s Cards",
    "A wax-sealed love letter with ribbon and pressed leaves."),
  seasonal("mothers-day", "mothers-day", "UK Mother’s Day", daysBefore(14), mothersDay, 30,
    "Make Her Day", "A thoughtful little something for someone who means so much.", "Explore Mother’s Day Cards",
    "Spring tulips and small blossoms in a ceramic jug."),
  seasonal("easter", "easter", "Easter", daysBefore(14), easterSunday, 40,
    "A Little Springtime Joy", "Bright Easter wishes, ready to share.", "Explore Easter Cards",
    "Hand-painted eggs and spring leaves nestled in a woven basket."),
  seasonal("st-george", "st-george", "St George’s Day", daysBefore(7), fixed(4, 23), 50,
    "Celebrate St George’s Day", "A thoughtful greeting with a little English flair.", "Explore St George’s Day Cards",
    "An engraved shield with a red cross and a sprig of oak.", false),
  seasonal("fathers-day", "fathers-day", "UK Father’s Day", daysBefore(14), fathersDay, 60,
    "Here’s to Dad", "From heartfelt thanks to a proper dad joke.", "Explore Father’s Day Cards",
    "A striped mug of tea beside a folded newspaper and reading glasses."),
  seasonal("halloween", "halloween", "Halloween", fixed(10, 14), fixed(10, 31), 70,
    "A Little Fright, A Lot of Fun", "Spooky, funny and wonderfully unexpected greetings.", "Explore Halloween Cards",
    "A glowing pumpkin lantern beneath a crescent moon.", false),
];

export function selectPromotion(instant, {
  promotions = PROMOTIONS,
  available,
  missingArtwork = new Set(),
  override = MANUAL_PROMOTION,
} = {}) {
  const day = londonDay(instant);
  const year = new Date(day * DAY).getUTCFullYear();
  const usable = promotions.filter((item) =>
    item.enabled && available?.has(item.occasion) && item.artwork && !missingArtwork.has(item.id),
  );
  if (override === "evergreen") return EVERGREEN;
  const pinned = usable.find((item) => item.id === override);
  if (pinned) return pinned;
  return usable.flatMap((item) => [year - 1, year, year + 1].map((eventYear) => {
    const event = item.event(eventYear);
    return { item, event, start: item.start(eventYear, event) };
  })).filter(({ start, event }) => start <= day && day <= event)
    .sort((a, b) => a.event - b.event || a.item.priority - b.item.priority)[0]?.item ?? EVERGREEN;
}

export function nextLondonMidnight(instant) {
  let low = Math.floor(Number(instant));
  let high = low + 26 * 60 * 60 * 1000;
  const today = londonDay(low);
  // London civil days are 23–25 hours. Find the first instant in the next one.
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (londonDay(middle) === today) low = middle;
    else high = middle;
  }
  return high;
}
