// The permission bits each page needs, in the same per-module, left-to-right
// format the server sends (index 0 = first permission of that module - see
// PERMISSION_MODULES in permissions.util.js for what each position means).
// Strings may be shorter than 32 chars; hasAccess() right-pads them with 0s.
//
// Used in two places so they can never disagree:
//   - each page: `SomePage.requiredPermissions = PAGE_ACCESS.xxx` (checked in _app.jsx)
//   - the sidebar: utils/sidebarConfig.js shows an item only if its page's bits are held
//
// All bits listed for a page are REQUIRED (the user must hold every one). A page may instead
// list an ARRAY of such objects: holding any ONE of them opens it (see hasAccess).
export const PAGE_ACCESS = {
  // A: viewDepartments (0)
  departments: { A: '10000000000000' },
  // A: viewRoles (10)
  rolePermissions: { A: '00000000001000' },
  // A: viewEmployees (4)
  manageRoles: { A: '00001000000000' },
  // A: viewLockouts (7)
  lockouts: { A: '00000001000000' },

  // D: viewOpdQueue (0) + viewAppointmentHistory (1) + diagnoseOpd (2) + viewLabResults (3, the lab + medicine lists)
  doctorOpd: { D: '1111' },
  // D: viewAppointmentHistory (1) + viewLabResults (3) + viewIpdQueue (4) + diagnoseIpd (5)
  doctorIpd: { D: '010111' },

  // PT: patientPortalAccess (0)
  patientAppointments: { PT: '1' },
  // PT: bookOwnAppointment (1)
  patientBookAppointment: { PT: '01' },
  // PAY: createPaymentOrder (1) - pending bills + pay online
  patientBills: { PAY: '01' },

  // R: registerPatient (0)
  receptionRegisterPatient: { R: '1000000' },
  // R: registerEmployee (7)
  receptionRegisterEmployee: { R: '00000001' },
  // R: viewDoctorsRolesAndFilterPatients (1) + viewDoctorTimingsAndBookAppointment (2)
  receptionBookAppointment: { R: '0110000' },
  // R: manageDeptAppointments (3) - today's booked patients: take vitals, cancel
  receptionAppointments: { R: '0001000' },
  // R: viewQueueScreen (4)
  receptionQueue: { R: '0000100' },
  // R: manageLockedOutPatients (5)
  receptionLockouts: { R: '0000010' },

  // P: viewMedicineCategories (0) + manageMedicines (2)
  pharmacyNewMedicine: { P: '101000' },
  // P: viewMedicinesAndPrescriptions (3)
  pharmacyInventory: { P: '000100' },
  // P: viewMedicinesAndPrescriptions (3) + viewMedicineNamesAndBillPrescriptions (4) + sellMedicine (5)
  // R: searchPatients (6) - the patient is found first
  pharmacyDispense: { P: '000111', R: '0000001' },

  // RM: viewRoomCategories (0) + manageRoomCategories (1) - add, edit and delete room categories
  roomCategories: { RM: '1100000000' },
  // RM: viewRoomCategories (0) + manageRooms (2) - add a room (the category is chosen from the list)
  roomAdd: { RM: '1010000000' },
  // RM: viewRoomCategories (0) + manageRooms (2) + viewRooms (3) - the rooms table with edit / delete
  roomList: { RM: '1011000000' },
  // RM: viewRoomCategories (0) + admitPatient (4) + viewAvailableRoomsByDepartment (8)
  // R: searchPatients (6) - the patient is found first
  roomAdmit: { RM: '1000100010', R: '0000001' },
  // RM: viewRoomPrescriptions (5) - admitted patients: ready for billing, discharge, cancel
  roomAdmissions: { RM: '0000010000' },

  // L: addLabTest (0)
  labNewTest: { L: '10000' },
  // L: manageLabTests (1)
  labTests: { L: '01000' },
  // L: viewPrescribedLabTests (2)
  // R: searchPatients (6) - the patient is found first
  labPatientTests: { L: '00100', R: '0000001' },
};

// ---- Biller pages: pending bills of a patient (POST /payment/bills/pending) and "mark paid"
// (PUT /payment/bills). PAY bits: createPaymentQr (0), createPaymentOrder (1), then the four
// billing permissions - doctor charges (2), medicines (3), lab (4), IPD (5). The patient is
// found first with the shared finder, which the API allows to anyone holding viewDoctorsRolesAnd
// FilterPatients (R 1) OR searchPatients (R 6) - so each page is open through either one.
const BILL_DOCTOR = '001000';
const BILL_MEDICINES = '000100';
const BILL_LAB = '000010';
const BILL_IPD = '000001';
const R_SEARCH = ['0100000', '0000001'];
const billPage = (...payBits) => payBits.flatMap((PAY) => R_SEARCH.map((R) => ({ PAY, R })));

PAGE_ACCESS.billingBills = billPage(BILL_DOCTOR, BILL_MEDICINES, BILL_LAB, BILL_IPD); // any biller
PAGE_ACCESS.receptionBills = billPage(BILL_DOCTOR);
PAGE_ACCESS.pharmacyBills = billPage(BILL_MEDICINES);
PAGE_ACCESS.labBills = billPage(BILL_LAB);
PAGE_ACCESS.roomBills = billPage(BILL_IPD);
