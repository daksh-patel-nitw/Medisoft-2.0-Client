import { create } from 'zustand';

const useRefreshStore = create((set) => ({
  refreshTick: 0,
  isGlobalRefreshing: false,
  
  triggerRefresh: () => set((state) => ({ 
    refreshTick: state.refreshTick + 1,
    isGlobalRefreshing: true 
  })),
  
  finishRefresh: () => set({ isGlobalRefreshing: false }) 
}));

export default useRefreshStore;