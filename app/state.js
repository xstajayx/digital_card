export function createState(initial = {}) {
  const listeners = new Set();
  let state = {
    themes: [],
    theme: null,
    to: "",
    message: "",
    from: "",
    fontId: "fredoka",
    textSize: 18,
    watermark: true,
    giftEnabled: false,
    giftUrl: "",
    birthdayNumberEnabled: false,
    birthdayNumber: "",
    paperOverride: "",
    inkOverride: "",
    stickerId: "",
    fontChosen: false,
    ...initial,
  };
  return {
    get: () => ({ ...state }),
    set(partial) {
      const changed = Object.keys(partial).filter(
        (key) => !Object.is(state[key], partial[key]),
      );
      if (!changed.length) return;
      state = { ...state, ...partial };
      listeners.forEach((listener) => listener({ ...state }, changed));
    },
    subscribe(listener) {
      listeners.add(listener);
      listener({ ...state }, Object.keys(state));
      return () => listeners.delete(listener);
    },
  };
}
