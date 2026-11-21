export const CHEEKY_COLLECTION = {
  id: "cheeky-clever",
  name: "Cheeky & Clever",
  description: "For people who care enough to send a card, but refuse to get sentimental about it.",
};

const cards = [
  {
    id: "all-i-could-afford",
    occasionId: "birthday",
    name: "This Is All I Could Afford",
    cover: "This is all I could afford.",
    message: "Actually, that's a lie. I just didn't want to spend any money. Happy Birthday!",
    art: "A worn leather wallet with one lonely coin",
    colors: ["#f5eddd", "#352c25", "#a9644a", "#778579", "#b78b54"],
    font: "poppins",
  },
  {
    id: "no-expense-spared",
    occasionId: "just-because",
    name: "No Expense Spared",
    cover: "No expense spared.",
    message: "Not a single penny. You're welcome.",
    art: "A luxury gift box with a conspicuous zero-pound price tag",
    colors: ["#243d36", "#fff0d2", "#c9a267", "#8ea798", "#e3c68a"],
    font: "playfair",
  },
  {
    id: "youd-only-throw-it-away",
    occasionId: "just-because",
    name: "You'd Only Throw It Away",
    cover: "I was going to buy you a proper card…",
    message: "…but you'd only throw it away. I've saved us both the trouble.",
    art: "A decorated paper card falling towards a recycling bin",
    colors: ["#e9ede2", "#263d37", "#729280", "#d29369", "#a88851"],
    font: "poppins",
  },
  {
    id: "saving-the-planet",
    occasionId: "just-because",
    name: "Saving the Planet",
    cover: "Sending a digital card isn't being cheap.",
    message: "It's saving trees. I'm basically a hero. You're welcome.",
    art: "A woodland tree wearing a medal and a flowing superhero cape",
    colors: ["#f2eddc", "#2d4339", "#8b9b6e", "#a85342", "#c3a066"],
    font: "quicksand",
  },
  {
    id: "happy-25th-december",
    occasionId: "christmas",
    name: "Happy 25th December",
    cover: "Happy 25th December.",
    message: "Enjoy your bank holiday. Whatever you choose to call it.",
    art: "An official-looking calendar with the 25th circled in red",
    colors: ["#f3e8df", "#433439", "#9a504c", "#687e73", "#b4845c"],
    font: "playfair",
  },
  {
    id: "happy-four-day-weekend",
    occasionId: "easter",
    name: "Happy Four-Day Weekend",
    cover: "Happy four-day weekend!",
    message: "Apparently there's a religious holiday involved. Anyway, enjoy the lie-in.",
    art: "Four days marked off behind an alarm clock and a pair of slippers",
    colors: ["#eceaf3", "#34394d", "#777b9c", "#b28275", "#ba9668"],
    font: "poppins",
  },
];

export const CHEEKY_DESIGNS = cards.map(({ id, occasionId, name, cover, message }) => ({
  id, occasionId, name, greeting: cover, coverGreeting: cover, message, packId: id,
  collection: CHEEKY_COLLECTION.id,
  subtitle: CHEEKY_COLLECTION.name,
  relationships: ["friend", "family", "dad", "brother", "colleague"],
  recipientTypes: ["teen", "adult"],
  tones: ["funny", "playful"],
}));

export const CHEEKY_PACKS = Object.fromEntries(cards.map(({ id, art, colors, font }) => {
  const [paper, ink, accent, accent2, gold] = colors;
  return [id, {
    id,
    illustrationFamily: id,
    styleFamily: "minimal",
    palette: { paper, ink, accent, accent2, gold },
    fonts: [font],
    artwork: [
      { id, label: art, asset: `packs/${id}.svg` },
      { id: "envelope", label: "Envelope", asset: "library/envelope.svg" },
    ],
    envelope: { type: "envelope", tone: "theme", wrap: "plain", seal: true, effect: "fade" },
    coverName: "hidden",
    interests: [],
    tones: ["funny", "playful"],
  }];
}));
