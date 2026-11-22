import { create } from 'zustand';

// The overlay, once shown, stays up at least this long even if the server
// answers sooner, so a fast request doesn't just flash it.
export const MIN_VISIBLE_MS = 1000;

// `pending` is the number of create/update/delete requests currently in
// flight - a counter (not a boolean) so overlapping requests keep the overlay
// up until the last one finishes. `visible` is what the overlay actually
// follows: true from the first request until pending is 0 AND the minimum
// time has passed. Written by the shared http client's interceptors
// (services/httpClient.js), read by components/GlobalProgress.jsx.
let shownAt = 0;

const useApiLoadingStore = create((set, get) => ({
  pending: 0,
  visible: false,

  start: () => {
    if (get().pending === 0 && !get().visible) shownAt = Date.now();
    set((s) => ({ pending: s.pending + 1, visible: true }));
  },

  finish: () => {
    const pending = Math.max(0, get().pending - 1);
    set({ pending });
    if (pending > 0) return;

    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
    setTimeout(() => {
      // A request that started during the wait keeps the overlay up.
      if (get().pending === 0) set({ visible: false });
    }, remaining);
  },
}));

export default useApiLoadingStore;
