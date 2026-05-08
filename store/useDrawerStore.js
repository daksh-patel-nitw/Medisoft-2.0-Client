import { create } from 'zustand';

const useDrawerStore = create((set) => ({
  isOpen: false,
  
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
}));

export default useDrawerStore;