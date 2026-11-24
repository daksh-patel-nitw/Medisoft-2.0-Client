import { create } from 'zustand';
import { apis } from '../services/commonServices';

// The hospital's departments (GET /room/departments), for the dropdowns on the room screens. Read once and shared.
const useRoomDepartmentsStore = create((set, get) => ({
  departments: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      set({ departments: (await apis.getRequest('/room/departments')) || [], loaded: true });
    } catch (error) {
      // already toasted by the http client; a later mount retries
    } finally {
      set({ loading: false });
    }
  },
}));

export default useRoomDepartmentsStore;
