const single = (id, name, description, species, colors, occasions) => ({
  id, name, description, kind: "single", occasions,
  heads: [{ species, colors, x: 180, y: 141, scale: 1, angle: -8 }],
});
const rosePink = ["#ffdfd9", "#d77787", "#9c4055"];
const roseRed = ["#ee7e7c", "#b82346", "#60132c"];
const roseIvory = ["#fffbee", "#e2cc9d", "#a48152"];
const sunflower = ["#ffe586", "#efa833", "#ae5b18"];
const tulip = ["#ffd1dd", "#e77b9f", "#a9456e"];
const lily = ["#fffef3", "#ead8c0", "#bbaa7e"];
const daisy = ["#fffffa", "#eee3ce", "#bfa98a"];
const orchid = ["#ebd2f3", "#ba76cf", "#743484"];

const bouquet = (id, name, description, wrap, occasions, recipe) => ({
  id, name, description, wrap, kind: "bouquet", occasions,
  heads: recipe.map(([species, colors, x, y, scale, angle]) => ({ species, colors, x, y, scale, angle })),
});

export const FLOWERS = [
  single("blush-rose", "Blush Rose", "Soft pink petals with a garden-rose heart.", "rose", rosePink, ["romantic", "just-because"]),
  single("classic-red-rose", "Classic Red Rose", "A deep crimson rose for saying it plainly.", "rose", roseRed, ["romantic"]),
  single("ivory-rose", "Ivory Rose", "Cream petals and a softly golden centre.", "rose", roseIvory, ["thank-you", "romantic"]),
  single("golden-sunflower", "Golden Sunflower", "A broad golden bloom with a warm seed head.", "sunflower", sunflower, ["birthday", "just-because"]),
  single("pink-tulip", "Pink Tulip", "A graceful pink cup on an arching green stem.", "tulip", tulip, ["thank-you", "romantic"]),
  single("white-lily", "White Lily", "Ivory petals that sweep outward into a star.", "lily", lily, ["thank-you", "just-because"]),
  single("spring-daisy", "Spring Daisy", "Fine white rays around a sunny centre.", "daisy", daisy, ["birthday", "just-because"]),
  single("purple-orchid", "Purple Orchid", "Violet petals with a richly coloured lip.", "orchid", orchid, ["thank-you", "romantic"]),
  bouquet("dozen-red-roses", "A Dozen Red Roses", "Twelve crimson blooms gathered in blush paper.", "#d9a9a3", ["romantic"], [
    ["rose", roseRed, 165, 60, .37, -15], ["rose", roseRed, 211, 66, .39, 22],
    ["rose", roseRed, 119, 83, .37, -32], ["rose", roseRed, 251, 96, .4, 38],
    ["rose", roseRed, 179, 102, .42, 8], ["rose", roseRed, 86, 121, .39, -40],
    ["rose", roseRed, 131, 132, .43, -18], ["rose", roseRed, 222, 132, .46, 29],
    ["rose", roseRed, 268, 144, .4, 35], ["rose", roseRed, 178, 148, .5, -12],
    ["rose", roseRed, 116, 181, .43, -30], ["rose", roseRed, 231, 180, .47, 19],
  ]),
  bouquet("pastel-garden-bouquet", "Pastel Garden Bouquet", "Garden roses, pale daisies and delicate pink tulips.", "#dec3b1", ["romantic", "thank-you"], [
    ["tulip", tulip, 129, 79, .53, -30], ["daisy", daisy, 202, 66, .46, 22],
    ["rose", roseIvory, 241, 109, .53, 38], ["daisy", daisy, 91, 138, .45, -35],
    ["rose", rosePink, 161, 111, .61, -13], ["tulip", tulip, 272, 153, .4, 48],
    ["rose", roseIvory, 123, 178, .53, -25], ["rose", rosePink, 213, 166, .64, 22],
  ]),
  bouquet("sunshine-bouquet", "Sunshine Bouquet", "Golden sunflowers and daisies with deep green foliage.", "#e7cc8e", ["birthday", "thank-you"], [
    ["daisy", daisy, 140, 62, .43, -30], ["daisy", daisy, 236, 74, .43, 25],
    ["sunflower", sunflower, 193, 108, .64, 14], ["daisy", daisy, 91, 119, .46, -32],
    ["sunflower", sunflower, 112, 162, .54, -28], ["daisy", daisy, 266, 143, .48, 38],
    ["sunflower", sunflower, 217, 174, .58, 25],
  ]),
  bouquet("spring-celebration", "Spring Celebration", "Pink and apricot tulips with a scatter of spring daisies.", "#bccba6", ["birthday", "just-because"], [
    ["tulip", tulip, 157, 65, .57, -10], ["tulip", ["#ffe1bf", "#efa36d", "#bd6247"], 204, 72, .57, 21],
    ["daisy", daisy, 93, 111, .52, -28], ["tulip", roseIvory, 244, 111, .55, 35],
    ["tulip", tulip, 129, 140, .62, -30], ["daisy", daisy, 177, 120, .44, 4],
    ["tulip", ["#ffc9cc", "#df7788", "#9c455d"], 259, 152, .55, 38],
    ["daisy", daisy, 204, 169, .59, 15],
  ]),
  bouquet("elegant-white-bouquet", "Elegant White Bouquet", "An understated arrangement of lilies, ivory roses and greenery.", "#cccfb7", ["thank-you", "romantic"], [
    ["lily", lily, 153, 75, .56, -27], ["rose", roseIvory, 215, 81, .54, 11],
    ["rose", roseIvory, 101, 129, .49, -33], ["lily", lily, 246, 124, .58, 28],
    ["rose", roseIvory, 166, 128, .58, -11], ["lily", lily, 117, 179, .51, -26],
    ["rose", roseIvory, 203, 174, .58, 15],
  ]),
  bouquet("wildflower-meadow", "Wildflower Meadow", "An airy mix of meadow daisies and colourful spring stems.", "#c1b7ce", ["just-because", "birthday"], [
    ["daisy", daisy, 126, 71, .36, -22], ["tulip", orchid, 182, 59, .47, 9],
    ["daisy", daisy, 234, 87, .36, 32], ["daisy", rosePink, 91, 119, .45, -42],
    ["daisy", ["#fff0af", "#edbd58", "#b58138"], 155, 116, .51, -12],
    ["tulip", tulip, 221, 143, .49, 30], ["daisy", daisy, 270, 136, .4, 37],
    ["daisy", daisy, 117, 165, .44, -27], ["daisy", orchid, 182, 171, .52, 13],
    ["daisy", rosePink, 244, 182, .37, 45],
  ]),
];

export function flowerProduct(id) {
  return FLOWERS.find((product) => product.id === id);
}
