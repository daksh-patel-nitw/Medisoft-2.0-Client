import { create } from 'zustand';

const usePatientStore = create((set) => ({
  // 1. Initial State
  inputValues: { pname: '', pid: '', mobile: '' },
  options: [],
  activeAutoComplete: null,

  // 2. Actions (Replacing Reducers)
  setPatientAutoComp: (key, val) => set((state) => ({
    inputValues: { ...state.inputValues, [key]: val }
  })),
  
  setPatientOptions: (options) => set({ options }),
  
  setActiveAutoComplete: (active) => set({ activeAutoComplete: active }),
  
  clearPatient: () => set({
    inputValues: { pname: '', pid: '', mobile: '' },
    options: [],
    activeAutoComplete: null
  })
}));

export default usePatientStore;