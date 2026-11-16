// Mirrors the per-module permission arrays declared in the server's
// Routes/*.route.ts files (adminPermissions, doctorPermissions, ...), in the
// same order. Order is the contract: the server only ever appends to a
// module's array, never reorders or inserts into it, so array index N here
// must always mean the same thing as index N on the server. If a module
// gains a new permission on the backend, append its label here too.
export const PERMISSION_MODULES = {
  A: [
    { key: 'viewDepartments', label: 'View departments' },
    { key: 'createDepartment', label: 'Create department' },
    { key: 'updateDepartment', label: 'Rename department' },
    { key: 'deleteDepartment', label: 'Delete department' },
    { key: 'viewEmployees', label: 'View employees' },
    { key: 'assignEmployeeRole', label: 'Assign employee role' },
    { key: 'removeEmployeeRole', label: 'Revoke employee role' },
    { key: 'viewLockouts', label: 'View locked-out accounts' },
    { key: 'updateLockout', label: 'Lock / unlock account' },
    { key: 'updateEmployeeDetails', label: 'Update employee details' },
    { key: 'viewRoles', label: 'View roles' },
    { key: 'createRole', label: 'Create role' },
    { key: 'updateRole', label: 'Update role permissions' },
    { key: 'deleteRole', label: 'Delete role' },
  ],
  D: [
    { key: 'viewOpdQueue', label: 'View OPD queue' },
    { key: 'viewAppointmentHistory', label: 'View appointment history' },
    { key: 'diagnoseOpd', label: 'Diagnose OPD patient' },
    { key: 'viewLabResults', label: 'View lab results' },
    { key: 'viewIpdQueue', label: 'View IPD queue' },
    { key: 'diagnoseIpd', label: 'Diagnose IPD patient' },
  ],
  L: [
    { key: 'addLabTest', label: 'Add lab test' },
    { key: 'viewLabTests', label: 'View lab tests' },
    { key: 'updateLabTest', label: 'Update lab test' },
    { key: 'deleteLabTest', label: 'Delete lab test' },
    { key: 'viewPrescribedLabTests', label: 'View prescribed lab tests' },
    { key: 'updateLabPrescriptionStatus', label: 'Update prescription status' },
    { key: 'uploadLabReport', label: 'Upload lab report' },
  ],
  P: [
    { key: 'viewMedicineCategories', label: 'View medicine categories' },
    { key: 'createMedicineCategory', label: 'Create medicine category' },
    { key: 'updateMedicineCategory', label: 'Update medicine category' },
    { key: 'deleteMedicineCategory', label: 'Delete medicine category' },
    { key: 'addMedicine', label: 'Add medicine' },
    { key: 'viewMedicines', label: 'View medicines' },
    { key: 'viewMedicineNames', label: 'View medicine names' },
    { key: 'updateMedicine', label: 'Update medicine' },
    { key: 'deleteMedicine', label: 'Delete medicine' },
    { key: 'incrementMedicineStock', label: 'Increment medicine stock' },
    { key: 'viewPrescriptions', label: 'View prescriptions' },
    { key: 'viewBillPrescriptions', label: 'View bill prescriptions' },
    { key: 'sellMedicine', label: 'Sell / dispense medicine' },
  ],
  PAY: [
    { key: 'createPaymentQr', label: 'Create payment QR (counter)' },
    { key: 'createPaymentOrder', label: 'Create payment order (patient)' },
  ],
  PT: [
    { key: 'viewOwnAppointmentHistory', label: 'View own appointment history' },
    { key: 'viewOwnPrescriptions', label: 'View own prescriptions' },
    { key: 'viewOwnPrescriptionHistory', label: 'View own prescription history' },
    { key: 'downloadOwnLabReport', label: 'Download own lab report' },
    { key: 'viewOwnBill', label: 'View own bill' },
    { key: 'viewOwnPendingBills', label: 'View own pending bills' },
    { key: 'markOwnBillsBilled', label: 'Mark own bills as billed' },
  ],
  R: [
    { key: 'addMember', label: 'Register patient / employee' },
    { key: 'viewDoctors', label: 'View doctors' },
    { key: 'viewRolesDepsSummary', label: 'View roles & departments list' },
    { key: 'filterPatients', label: 'Search / filter patients' },
    { key: 'viewDoctorTimings', label: 'View doctor timings' },
    { key: 'createAppointment', label: 'Book appointment' },
    { key: 'viewDeptAppointments', label: 'View department appointments' },
    { key: 'updateAppointment', label: 'Update appointment' },
    { key: 'deleteAppointment', label: 'Cancel appointment' },
    { key: 'viewQueueScreen', label: 'View queue screen' },
  ],
  RM: [
    { key: 'viewRoomCategories', label: 'View room categories' },
    { key: 'createRoomCategory', label: 'Create room category' },
    { key: 'updateRoomCategory', label: 'Update room category' },
    { key: 'deleteRoomCategory', label: 'Delete room category' },
    { key: 'admitPatient', label: 'Admit patient' },
    { key: 'viewRoomPrescriptions', label: 'View room admissions' },
    { key: 'dischargePatient', label: 'Discharge patient' },
    { key: 'cancelAdmission', label: 'Cancel admission' },
    { key: 'viewAvailableRoomsByDepartment', label: 'View available rooms by department' },
    { key: 'addRoom', label: 'Add room' },
    { key: 'viewRooms', label: 'View rooms' },
    { key: 'updateRoom', label: 'Update room' },
    { key: 'deleteRoom', label: 'Delete room' },
    { key: 'billRoomPrescription', label: 'Bill room admission' },
  ],
};

export const MODULE_LABELS = {
  A: 'Admin',
  D: 'Doctor',
  L: 'Laboratory',
  P: 'Pharmacy',
  PAY: 'Payment',
  PT: 'Patient',
  R: 'Reception',
  RM: 'Room',
};

/**
 * Turns the encoded bitmask strings `currentUser.permissions` or an
 * `/admin/roles` entry carries (e.g. ["D110000", "A00000000010000"]) into a
 * flat Set of human-readable keys. Decode once per currentUser/role, not on
 * every permission check.
 */
export function decodeToFlags(encoded = []) {
  const flags = new Set();
  for (const code of encoded) {
    const match = code.match(/^([A-Za-z]+)([01]+)$/);
    if (!match) continue;
    const [, prefix, bits] = match;
    const codes = PERMISSION_MODULES[prefix.toUpperCase()];
    if (!codes || bits.length !== codes.length) continue;
    bits.split('').forEach((bit, i) => {
      if (bit === '1') flags.add(codes[i].key);
    });
  }
  return flags;
}

/**
 * Inverse of decodeToFlags - turns the set of checked keys from the
 * permission picker back into the per-module bitmask strings the
 * POST/PUT /admin/roles body expects.
 */
export function encodeFlags(flagKeys) {
  const flagSet = flagKeys instanceof Set ? flagKeys : new Set(flagKeys);
  const encoded = [];
  for (const [prefix, codes] of Object.entries(PERMISSION_MODULES)) {
    const bits = codes.map(({ key }) => (flagSet.has(key) ? '1' : '0'));
    if (bits.includes('1')) {
      encoded.push(`${prefix}${bits.join('')}`);
    }
  }
  return encoded;
}
