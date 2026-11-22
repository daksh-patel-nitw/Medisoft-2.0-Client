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
    { key: 'viewLabResults', label: 'View lab tests & medicine names (for prescribing)' },
    { key: 'viewIpdQueue', label: 'View IPD queue' },
    { key: 'diagnoseIpd', label: 'Diagnose IPD patient' },
  ],
  L: [
    { key: 'addLabTest', label: 'Add lab test' },
    { key: 'manageLabTests', label: 'View / update / delete lab tests' },
    { key: 'viewPrescribedLabTests', label: 'View prescribed lab tests' },
    { key: 'updateLabPrescriptionStatus', label: 'Update prescription status' },
    { key: 'uploadLabReport', label: 'Upload lab report' },
  ],
  P: [
    { key: 'viewMedicineCategories', label: 'View medicine categories' },
    { key: 'manageMedicineCategories', label: 'Add / update / delete medicine category' },
    { key: 'manageMedicines', label: 'Add / update / delete / increment medicine' },
    { key: 'viewMedicinesAndPrescriptions', label: 'View medicines & pharmacy prescriptions' },
    { key: 'viewMedicineNamesAndBillPrescriptions', label: 'View medicine names & bill prescriptions' },
    { key: 'sellMedicine', label: 'Sell / dispense medicine' },
  ],
  PAY: [
    { key: 'createPaymentQr', label: 'Create payment QR (counter)' },
    { key: 'createPaymentOrder', label: 'Create payment order (patient)' },
    // The biller's per-charge-type bill access: which slices of a patient's pending bills
    // they see and which charges they can mark billed.
    { key: 'billDoctorCharges', label: 'View / mark billed: doctor consultation charges' },
    { key: 'billMedicines', label: 'View / mark billed: medicines' },
    { key: 'billLabTests', label: 'View / mark billed: lab tests' },
    { key: 'billIpd', label: 'View / mark billed: IPD (room stays + inpatient doctor)' },
  ],
  // First bit: the read-only patient.route.ts endpoints (appointment history,
  // prescriptions, bills, lab report download). Second: book your own appointment.
  PT: [
    { key: 'patientPortalAccess', label: 'Patient portal access (appointments, prescriptions, bills, lab reports)' },
    { key: 'bookOwnAppointment', label: 'Book own appointment (doctors, timings, book)' },
  ],
  R: [
    { key: 'registerPatient', label: 'Register patient' },
    { key: 'viewDoctorsRolesAndFilterPatients', label: 'View doctors, roles & departments, and search patients' },
    { key: 'viewDoctorTimingsAndBookAppointment', label: 'View doctor timings & book appointment' },
    { key: 'manageDeptAppointments', label: 'View / update / cancel department appointments' },
    { key: 'viewQueueScreen', label: 'View queue screen' },
    { key: 'manageLockedOutPatients', label: 'View / unlock locked-out patients' },
    { key: 'searchPatients', label: 'Search patients (by name, ID or mobile)' },
    { key: 'registerEmployee', label: 'Register employee' },
  ],
  RM: [
    { key: 'viewRoomCategories', label: 'View room categories' },
    { key: 'manageRoomCategories', label: 'Add / update / delete room category' },
    { key: 'manageRooms', label: 'Add / update / delete room' },
    { key: 'viewRooms', label: 'View rooms' },
    { key: 'admitPatient', label: 'Admit patient' },
    { key: 'viewRoomPrescriptions', label: 'View room admissions' },
    { key: 'dischargePatient', label: 'Discharge patient' },
    { key: 'cancelAdmission', label: 'Cancel admission' },
    { key: 'viewAvailableRoomsByDepartment', label: 'View available rooms by department' },
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

// Every module's bit string arrives from the server right-padded with zeros
// to this width (see PERMISSION_BIT_WIDTH in the server's permissions.util.ts),
// so a new permission appended on the server never shifts an existing bit.
export const PERMISSION_BIT_WIDTH = 32;

/**
 * Turns a bit string ("1011...", up to 32 chars) into an unsigned 32-bit
 * number. Shorter strings are right-padded with zeros first, so a page can
 * declare just the bits it cares about ("11110000001111") and still line up
 * with the server's padded strings. Left-most char = permission index 0.
 * Anything invalid (non-0/1 chars, too long, not a string) becomes 0 - i.e.
 * "no bits" - so bad input can only ever deny access, never grant it.
 */
export function toMask(bits) {
  if (typeof bits !== 'string' || bits.length > PERMISSION_BIT_WIDTH || !/^[01]*$/.test(bits)) return 0;
  return parseInt(bits.padEnd(PERMISSION_BIT_WIDTH, '0'), 2) >>> 0;
}

/**
 * True when `userPermissions` ({ A: "1111...", D: "...", ... } as received at
 * login / from /users/currentuser) holds every bit that `required` ({ A:
 * "11110000001111", ... }) asks for, in every module it names:
 *   (user & required) === required
 * `required` may also be an ARRAY of such objects: the user needs to satisfy ANY
 * one of them (e.g. a page several roles can open, each through different bits).
 * Fails closed: no/empty `required`, or a module the user lacks, is a deny.
 * This only decides what the UI shows - the server re-checks every request.
 */
export function hasAccess(userPermissions, required) {
  if (Array.isArray(required)) return required.some((option) => hasAccess(userPermissions, option));
  const modules = Object.entries(required || {});
  if (modules.length === 0) return false;
  return modules.every(([module, bits]) => {
    const need = toMask(bits);
    if (need === 0) return false; // a module listed with no bits is a config mistake, not "open to all"
    const have = toMask(userPermissions?.[module]);
    return ((have & need) >>> 0) === need;
  });
}

/**
 * Turns the per-module bit-string object `currentUser.permissions` or an
 * `/admin/roles` entry carries (e.g. { D: "110000...", A: "0000000001..." })
 * into a flat Set of human-readable keys. Decode once per currentUser/role,
 * not on every permission check.
 */
export function decodeToFlags(encoded = {}) {
  const flags = new Set();
  for (const [prefix, codes] of Object.entries(PERMISSION_MODULES)) {
    const bits = encoded?.[prefix];
    if (typeof bits !== 'string') continue;
    codes.forEach(({ key }, i) => {
      if (bits[i] === '1') flags.add(key);
    });
  }
  return flags;
}

/**
 * Inverse of decodeToFlags - turns the set of checked keys from the
 * permission picker back into the per-module, 32-bit-padded bit-string object
 * the POST/PUT /admin/roles body expects. Modules with nothing checked are
 * left out.
 */
export function encodeFlags(flagKeys) {
  const flagSet = flagKeys instanceof Set ? flagKeys : new Set(flagKeys);
  const encoded = {};
  for (const [prefix, codes] of Object.entries(PERMISSION_MODULES)) {
    const bits = codes.map(({ key }) => (flagSet.has(key) ? '1' : '0'));
    if (bits.includes('1')) {
      encoded[prefix] = bits.join('').padEnd(PERMISSION_BIT_WIDTH, '0');
    }
  }
  return encoded;
}
