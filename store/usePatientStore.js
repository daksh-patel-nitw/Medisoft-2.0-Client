import { create } from 'zustand';

const EMPTY_INPUTS = { pname: '', pid: '', mobile: '' };

// State behind the shared three-box patient finder (components/patientAutoComp.jsx).
//   inputValues - the text shown in the Name / ID / Mobile boxes
//   options     - the patients the last search returned (the dropdown list)
// Picking a patient fills ALL THREE boxes from that patient; clearing any box
// clears all three and the fetched list.
const usePatientStore = create((set) => ({
  inputValues: EMPTY_INPUTS,
  options: [],

  // typing in one box
  setPatientAutoComp: (key, val) => set((state) => ({
    inputValues: { ...state.inputValues, [key]: val },
  })),

  setPatientOptions: (options) => set({ options }),

  // a patient was picked: all three boxes show that patient's name, id and mobile; the list is done with
  selectPatient: (patient) => set({
    inputValues: {
      pname: patient?.pname ?? '',
      pid: patient?.pid ?? '',
      mobile: patient?.mobile ?? '',
    },
    options: [],
  }),

  // cleared: empty all three boxes and drop the fetched list
  clearPatient: () => set({ inputValues: EMPTY_INPUTS, options: [] }),
}));

export default usePatientStore;
