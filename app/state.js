export function createState() {
  const listeners = new Set();
  const state = {
    themes: [],
    theme: null,
    to: '',
    message: '',
    from: '',
    photo: null,
    watermark: true,
    giftEnabled: false,
    giftUrl: ''
  };

  function notify() {
    listeners.forEach((listener) => listener({ ...state }));
  }

  return {
    get() {
      return { ...state };
    },
    set(partial) {
      Object.assign(state, partial);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener({ ...state });
      return () => listeners.delete(listener);
    }
  };
}
