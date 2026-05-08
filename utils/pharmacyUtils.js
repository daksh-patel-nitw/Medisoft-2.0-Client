import { toast } from 'react-toastify';

// ... the rest of your code (side_bar_utils, initialMedicineState, checkNewMedicine)
//---------------------------------------------- Panel-1 ----------------------------------------------

export const arr1 = ["name", "q", "t", "ps", "ps_u", "price"];
export const arr2 = [
  "Medicine Name",
  "Quantity/Unit",
  "Type",
  "Package Size",
  "Package Stock Quantity",
  "Price per 1 Unit",
];

export const initialMedicineState = arr1.reduce((acc, key) => {
  acc[key] = '';
  return acc;
}, {})

//To validate if all the values are filled or not.
export const checkNewMedicine = (formValues) => {
  let isValid = true;
  
  for(let i=0;i<arr1.length;i++){
    if (formValues[arr1[i]] === '') {
      toast.error(`Please fill the ${arr2[i]}`);
      isValid = false;
    }
  };

  return isValid;
}