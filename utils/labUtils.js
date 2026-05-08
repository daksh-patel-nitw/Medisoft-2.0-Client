export const arr1 = [ 'name',  'price',  'pat_details',  'normal','timing'];
export const arr2 = ["Test Name", "Test Price", "Required Details", "Normal Range", "Timings (Availability)"];

export const initialTestState=arr1.reduce(
  (obj, key) => ({ ...obj, [key]: key==='timing'?[]:'' }),
  {}
);