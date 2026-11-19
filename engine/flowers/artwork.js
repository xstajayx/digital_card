const rosePetal = "M-5 7 C-20 2 -42 -14 -48 -36 C-56 -58 -46 -79 -26 -85 C-12 -91 -1 -80 12 -83 C37 -89 53 -70 48 -48 C45 -23 25 -4 8 5 Q1 11 -5 7Z";
const lilyPetal = "M-3 7 C-17 -14 -28 -39 -22 -66 C-20 -78 -6 -88 6 -99 C7 -80 26 -71 24 -53 C21 -32 12 -9 3 7Z";
const daisyPetal = "M-3 6 C-9 -16 -16 -46 -12 -66 C-10 -82 4 -88 11 -74 C19 -58 10 -22 3 6Z";
const sunflowerPetal = "M-2 7 C-13 -14 -23 -42 -17 -63 C-13 -75 -2 -82 4 -92 C18 -73 21 -53 14 -33 C10 -17 7 -6 2 7Z";
const orchidPetal = "M-5 7 C-22 -7 -56 -26 -53 -56 C-48 -84 -13 -97 9 -87 C37 -82 53 -65 44 -40 C34 -15 14 -7 5 7Z";
const tulipBack = "M0 27 C-26 6 -47 -20 -49 -54 C-52 -75 -37 -88 -19 -90 C-5 -94 6 -79 15 -77 C24 -81 43 -78 49 -59 C56 -31 32 9 0 27Z";
const tulipFront = "M0 26 C-30 17 -46 -11 -43 -42 C-42 -56 -31 -67 -22 -79 C-12 -67 -4 -67 7 -73 C24 -90 43 -59 42 -38 C43 -7 22 20 0 26Z";

function ring(count, path, size, offset, palette, spread, delay = 0) {
  return Array.from({ length: count }, (_, index) => ({
    path, size: size * (1 + Math.sin(index * 2.1) * .07),
    angle: offset + index * 360 / count + Math.sin(index * 2.7) * 4,
    palette, delay: delay + index % 4 * 95, spread,
  }));
}

export const SPECIES = {
  rose: {
    duration: 5600, closed: [.23, .62], middle: [.72, .91], twist: 32, core: "rose", sepal: true,
    petals: [
      ...ring(7, rosePetal, 1, 1, 0, 13, 0),
      ...ring(7, rosePetal, .77, 24, 1, 7, 320),
      ...ring(6, rosePetal, .53, 10, 2, 4, 680),
      ...ring(5, rosePetal, .3, 27, 1, 1, 960),
      ...ring(4, rosePetal, .16, 12, 2, 0, 1160),
    ],
  },
  sunflower: {
    duration: 5200, closed: [.31, .29], middle: [.78, .82], twist: 26, core: "seed",
    petals: [...ring(19, sunflowerPetal, 1.05, 12, 1, 11), ...ring(19, sunflowerPetal, .91, 3, 0, 10, 230)],
  },
  daisy: {
    duration: 5200, closed: [.19, .36], middle: [.65, .85], twist: 25, core: "gold",
    petals: [...ring(15, daisyPetal, 1, 3, 1, 9), ...ring(16, daisyPetal, .91, 15, 0, 7, 250)],
  },
  lily: {
    duration: 5400, closed: [.21, .42], middle: [.54, .91], twist: 37, core: "lily",
    petals: [...ring(3, lilyPetal, 1, 10, 1, 8), ...ring(3, lilyPetal, .98, 68, 0, 1, 350)],
  },
  orchid: {
    duration: 5600, closed: [.27, .43], middle: [.71, .78], twist: 34, core: "orchid",
    petals: [
      ...ring(3, orchidPetal, .83, 0, 1, 3),
      { path: orchidPetal, angle: -68, size: .98, palette: 0, delay: 290, spread: 6 },
      { path: orchidPetal, angle: 70, size: 1.01, palette: 0, delay: 440, spread: 6 },
    ],
  },
  tulip: {
    duration: 5400, closed: [.29, .82], middle: [.58, .97], twist: 20, core: null, sepal: true,
    petals: [
      { path: tulipBack, angle: -28, size: .95, palette: 1, delay: 0, spread: 11 },
      { path: tulipBack, angle: 31, size: .93, palette: 2, delay: 250, spread: 9 },
      { path: tulipBack, angle: 3, size: 1, palette: 0, delay: 460, spread: 6 },
      { path: tulipFront, angle: -31, size: .78, palette: 2, delay: 120, spread: 8 },
      { path: tulipFront, angle: 28, size: .8, palette: 1, delay: 420, spread: 12 },
      { path: tulipFront, angle: -5, size: .68, palette: 0, delay: 770, spread: 0 },
    ],
  },
};
