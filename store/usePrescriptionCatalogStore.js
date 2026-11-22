import { create } from 'zustand';
import { apis } from '../services/commonServices';

// The lab tests and medicine names a doctor picks from. Both lists are small and
// the same for every patient, so they are read once per session and shared by
// the OPD and IPD pages instead of being re-fetched for every patient.
const usePrescriptionCatalogStore = create((set, get) => ({
  labs: [], // [{ _id, name }]
  medicines: [], // [{ _id, name, t: { name, freeQuantity: 'Y' | 'N' } }, ...]
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const [labs, medicines] = await Promise.all([apis.getRequest('/doctor/labs'), apis.getRequest('/doctor/mn')]);
      set({ labs: labs || [], medicines: medicines || [], loaded: true });
    } catch (error) {
      // already toasted by the http client; a later mount retries
    } finally {
      set({ loading: false });
    }
  },
}));

export default usePrescriptionCatalogStore;
