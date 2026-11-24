import { create } from 'zustand';
import { apis } from '../services/commonServices';

// The qualifications a doctor can pick from (GET /users/degrees). The list never changes while the app is
// open, so it is read once and shared by every screen that has a degree dropdown.
const useDegreesStore = create((set, get) => ({
  degrees: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      set({ degrees: (await apis.getRequest('/users/degrees')) || [], loaded: true });
    } catch (error) {
      // already toasted by the http client; a later mount retries
    } finally {
      set({ loading: false });
    }
  },
}));

export default useDegreesStore;
