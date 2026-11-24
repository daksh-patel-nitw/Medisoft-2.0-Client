import { create } from 'zustand';

// The header's refresh button spins from the click until the page reports that it has re-read its data
// (finishRefresh). A page that does not report back - it has no refresh handling, or its request was cancelled
// or failed on the way - would leave it spinning (and disabled) until a hard refresh. So every refresh also ends
// by itself after this long, and also when the user moves to another page.
const REFRESH_TIMEOUT_MS = 6000;

let timer = null;

const useRefreshStore = create((set) => ({
  refreshTick: 0,
  isGlobalRefreshing: false,

  triggerRefresh: () => {
    clearTimeout(timer);
    timer = setTimeout(() => set({ isGlobalRefreshing: false }), REFRESH_TIMEOUT_MS);
    set((state) => ({ refreshTick: state.refreshTick + 1, isGlobalRefreshing: true }));
  },

  finishRefresh: () => {
    clearTimeout(timer);
    set({ isGlobalRefreshing: false });
  },
}));

export default useRefreshStore;
