export const OCCASIONS = {
  birthday: {
    occasionId: "birthday",
    occasion: "Birthday",
    group: "Celebrate",
    symbol: "◒",
    greeting: "Happy Birthday",
    birthday: true,
    milestone: false,
    defaults: {
      to: "Zoe",
      message:
        "Here’s to another year of little adventures, big dreams, and all the things that make you smile.\n\nHave the loveliest birthday!",
      from: "With love",
    },
  },
  "kids-birthday": {
    occasionId: "kids-birthday",
    occasion: "Kids Birthday",
    group: "Celebrate",
    symbol: "☆",
    greeting: "Happy Birthday",
    birthday: true,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "A whole day of cake, wishes and wonderful surprises. Keep being your brilliant, magical self!",
      from: "With love",
    },
  },
  "milestone-birthday": {
    occasionId: "milestone-birthday",
    occasion: "Milestone Birthday",
    group: "Celebrate",
    symbol: "✧",
    greeting: "Happy Birthday",
    birthday: true,
    milestone: true,
    defaults: {
      to: "Friend",
      message:
        "A new chapter, a thousand possibilities. Here’s to the memories you’ve made and all the beautiful moments still to come.",
      from: "With love",
    },
  },
  love: {
    occasionId: "love",
    occasion: "Love",
    group: "Love & family",
    symbol: "♡",
    greeting: "With all my love",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "You make the ordinary days feel extraordinary.\n\nSo lucky to have you, today and always.",
      from: "With love",
    },
  },
  valentines: {
    occasionId: "valentines",
    occasion: "Valentine’s Day",
    group: "Love & family",
    symbol: "♡",
    greeting: "Happy Valentine’s Day",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "My favourite place is wherever you are. Thank you for filling my world with so much love.",
      from: "With love",
    },
  },
  anniversary: {
    occasionId: "anniversary",
    occasion: "Anniversary",
    group: "Love & family",
    symbol: "∞",
    greeting: "Happy Anniversary",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "Another year of choosing each other. Wishing you a lifetime of laughter, little adventures and love.",
      from: "With love",
    },
  },
  wedding: {
    occasionId: "wedding",
    occasion: "Wedding",
    group: "Love & family",
    symbol: "♧",
    greeting: "Happily ever after",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "May your life together be filled with small joys, great adventures and a love that keeps growing.",
      from: "With love",
    },
  },
  engagement: {
    occasionId: "engagement",
    occasion: "Engagement",
    group: "Love & family",
    symbol: "◇",
    greeting: "You’re engaged",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "What a wonderful beginning! Wishing you both a future as beautiful as the love you share.",
      from: "With love",
    },
  },
  "mothers-day": {
    occasionId: "mothers-day",
    occasion: "Mother’s Day",
    group: "Love & family",
    symbol: "❀",
    greeting: "Happy Mother’s Day",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "For every hug, every kind word, every little thing you do. Thank you for being you.\n\nYou are so loved.",
      from: "With love",
    },
  },
  "fathers-day": {
    occasionId: "fathers-day",
    occasion: "Father’s Day",
    group: "Love & family",
    symbol: "☕",
    greeting: "Happy Father’s Day",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "For the steady hand, the terrible jokes and the endless encouragement. Thank you for everything, Dad.",
      from: "With love",
    },
  },
  "new-baby": {
    occasionId: "new-baby",
    occasion: "New Baby",
    group: "Love & family",
    symbol: "☾",
    greeting: "Welcome, little one",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "Hello, tiny wonder. May your world be full of warmth, cuddles and the sweetest little discoveries.",
      from: "With love",
    },
  },
  "thank-you": {
    occasionId: "thank-you",
    occasion: "Thank You",
    group: "Everyday",
    symbol: "❀",
    greeting: "Thank you",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "Your kindness made a bigger difference than you know.\n\nThank you for showing up, being thoughtful, and being you.",
      from: "With love",
    },
  },
  congratulations: {
    occasionId: "congratulations",
    occasion: "Congratulations",
    group: "Celebrate",
    symbol: "✦",
    greeting: "Congratulations",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "Look at you go! You worked for this moment, and you deserve every bit of the joy. So proud of you.",
      from: "With love",
    },
  },
  graduation: {
    occasionId: "graduation",
    occasion: "Graduation",
    group: "Celebrate",
    symbol: "◇",
    greeting: "Congratulations, graduate",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "The next chapter is yours to write. Stay curious, be brave, and never stop being wonderfully you.",
      from: "With love",
    },
  },
  "good-luck": {
    occasionId: "good-luck",
    occasion: "Good Luck",
    group: "Everyday",
    symbol: "♧",
    greeting: "Good luck",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "A little extra luck for your next big step. Take a deep breath. You’ve got this, and I’m cheering for you.",
      from: "With love",
    },
  },
  "get-well": {
    occasionId: "get-well",
    occasion: "Get Well Soon",
    group: "Everyday",
    symbol: "☀",
    greeting: "Get well soon",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "Take things slowly, rest a little longer, and know that you’re being thought of with so much care.",
      from: "With love",
    },
  },
  "thinking-of-you": {
    occasionId: "thinking-of-you",
    occasion: "Thinking of You",
    group: "Everyday",
    symbol: "✉",
    greeting: "Thinking of you",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "No special reason. Just a little note to remind you that you matter, and you’re in my thoughts today.",
      from: "With love",
    },
  },
  sorry: {
    occasionId: "sorry",
    occasion: "Sorry",
    group: "Everyday",
    symbol: "♡",
    greeting: "I’m sorry",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "I’m sorry for the hurt I caused. You matter to me, and I hope we can find a way forward, one small step at a time.",
      from: "With love",
    },
  },
  friendship: {
    occasionId: "friendship",
    occasion: "Friendship",
    group: "Everyday",
    symbol: "☀",
    greeting: "So glad you’re in my life",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "Life is brighter, funnier and a whole lot better with you in it. Here’s to us and all our little adventures.",
      from: "With love",
    },
  },
  christmas: {
    occasionId: "christmas",
    occasion: "Christmas",
    group: "Seasonal",
    symbol: "♧",
    greeting: "Merry Christmas",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "May your days be cosy, your heart be light, and your home be filled with the people and things you love.",
      from: "With love",
    },
  },
  "new-year": {
    occasionId: "new-year",
    occasion: "New Year",
    group: "Seasonal",
    symbol: "✧",
    greeting: "Happy New Year",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "Here’s to fresh starts, unexpected joys and the courage to follow a new dream. Wishing you a wonderful year.",
      from: "With love",
    },
  },
  easter: {
    occasionId: "easter",
    occasion: "Easter",
    group: "Seasonal",
    symbol: "❀",
    greeting: "Happy Easter",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "A little sunshine, a little sweetness, and a fresh beginning. Wishing you a beautiful Easter.",
      from: "With love",
    },
  },
  "just-because": {
    occasionId: "just-because",
    occasion: "Just Because",
    group: "Everyday",
    symbol: "✉",
    greeting: "A little hello",
    birthday: false,
    milestone: false,
    defaults: {
      to: "Friend",
      message:
        "No occasion needed. Just sending a little happiness your way, because you make the world a nicer place.",
      from: "With love",
    },
  },
  "belated-birthday": {
    occasionId: "belated-birthday",
    occasion: "Belated Birthday",
    group: "Celebrate",
    symbol: "◷",
    greeting: "A Little Late, With Lots of Love",
    birthday: false,
    milestone: false,
    defaults: {
      to: "",
      from: "With love",
      message:
        "A little late to your birthday, but never short on love. I hope your year is full of wonderful things.",
    },
  },
  christening: {
    occasionId: "christening",
    occasion: "Christening",
    group: "Love & family",
    symbol: "✧",
    greeting: "A Day Full of Blessings",
    birthday: false,
    milestone: false,
    defaults: {
      to: "",
      from: "With love",
      message:
        "Wishing your little one a lifetime of kindness, wonder and love. What a beautiful beginning.",
    },
  },
  retirement: {
    occasionId: "retirement",
    occasion: "Retirement",
    group: "Celebrate",
    symbol: "☀",
    greeting: "Here’s to Your Next Chapter",
    birthday: false,
    milestone: false,
    defaults: {
      to: "",
      from: "With love",
      message:
        "More time for the things you love and the people who make you happy. Enjoy every moment of your next adventure.",
    },
  },
  "new-home": {
    occasionId: "new-home",
    occasion: "New Home",
    group: "Celebrate",
    symbol: "⌂",
    greeting: "Home Sweet Home",
    birthday: false,
    milestone: false,
    defaults: {
      to: "",
      from: "With love",
      message:
        "Here’s to the first cup of tea, the last unpacked box and all the lovely memories waiting to happen.",
    },
  },
  sympathy: {
    occasionId: "sympathy",
    occasion: "Sympathy",
    group: "Everyday",
    symbol: "❀",
    greeting: "With Deepest Sympathy",
    birthday: false,
    milestone: false,
    defaults: {
      to: "",
      from: "With love",
      message:
        "Thinking of you with love. There are no perfect words, but please know you are not alone.",
    },
  },
};
