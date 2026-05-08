import { create } from 'zustand';

const useMedicineStore = create((set) => ({
  // 1. Initial State
  medicineInputValue: '',
  
  // 2. Actions (Replacing Reducers)
  setMedicineInputValue: (value) => set({ medicineInputValue: value }),
  clearMedicineInputValue: () => set({ medicineInputValue: '' }),
}));

export default useMedicineStore;