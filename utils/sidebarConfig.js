import { hasAccess } from './permissions.util';
import { PAGE_ACCESS } from './pageAccess';

// Main menus mirror the folders under pages/ (admin, doctor, laboratory, pharmacy,
// reception); each main menu's children are the pages inside that folder.
// Every child is tied to the same permission bits its page checks
// (utils/pageAccess.js). Nothing here is per-role: what a user sees falls out
// of the bits they hold. `pages/auth` is not a menu (login screens).
//
// To add a page later: append a child to its folder's group (and its bits to
// PAGE_ACCESS). To add a folder: append a new group.
export const SIDEBAR_GROUPS = [
  {
    label: 'Admin',
    icon: 'AdminPanelSettings',
    children: [
      { label: 'Roles & Permissions', path: '/admin/role-permissions', icon: 'Security', access: PAGE_ACCESS.rolePermissions },
      { label: 'Departments', path: '/admin/departments', icon: 'Domain', access: PAGE_ACCESS.departments },
      { label: 'Manage Roles', path: '/admin/roles', icon: 'ManageAccounts', access: PAGE_ACCESS.manageRoles },
      { label: 'Lockouts', path: '/admin/lockouts', icon: 'Lock', access: PAGE_ACCESS.lockouts },
    ],
  },
  {
    label: 'My Care',
    icon: 'Favorite',
    children: [
      { label: 'Book Appointment', path: '/patient/book-appointment', icon: 'EventAvailable', access: PAGE_ACCESS.patientBookAppointment },
      { label: 'My Appointments', path: '/patient/appointments', icon: 'History', access: PAGE_ACCESS.patientAppointments },
      { label: 'Bills', path: '/patient/bills', icon: 'Receipt', access: PAGE_ACCESS.patientBills },
    ],
  },
  {
    label: 'Billing',
    icon: 'ReceiptLong',
    children: [
      { label: 'Patient Bills', path: '/billing/bills', icon: 'Receipt', access: PAGE_ACCESS.billingBills },
    ],
  },
  {
    label: 'Reception',
    icon: 'SupportAgent',
    children: [
      { label: 'Register Patient', path: '/reception/register-patient', icon: 'PersonAdd', access: PAGE_ACCESS.receptionRegisterPatient },
      { label: 'Register Employee', path: '/reception/register-employee', icon: 'Badge', access: PAGE_ACCESS.receptionRegisterEmployee },
      { label: 'Book Appointment', path: '/reception/book-appointment', icon: 'EventAvailable', access: PAGE_ACCESS.receptionBookAppointment },
      { label: "Today's Appointments", path: '/reception/appointments', icon: 'MonitorHeart', access: PAGE_ACCESS.receptionAppointments },
      { label: 'Patient Lockouts', path: '/reception/lockouts', icon: 'LockPerson', access: PAGE_ACCESS.receptionLockouts },
      { label: 'Queue Screen', path: '/reception/queue', icon: 'Tv', access: PAGE_ACCESS.receptionQueue },
      { label: 'Consultation Bills', path: '/reception/bills', icon: 'Receipt', access: PAGE_ACCESS.receptionBills },
    ],
  },
  {
    label: 'Doctor',
    icon: 'MedicalServices',
    children: [
      { label: 'OPD Patients', path: '/doctor/opd', icon: 'AssistWalker', access: PAGE_ACCESS.doctorOpd },
      { label: 'IPD Patients', path: '/doctor/ipd', icon: 'Hotel', access: PAGE_ACCESS.doctorIpd },
    ],
  },
  {
    label: 'Pharmacy',
    icon: 'LocalPharmacy',
    children: [
      { label: 'New Medicine', path: '/pharmacy/newmedicine', icon: 'AddBox', access: PAGE_ACCESS.pharmacyNewMedicine },
      { label: 'Medicine Inventory', path: '/pharmacy/inventory', icon: 'Inventory', access: PAGE_ACCESS.pharmacyInventory },
      { label: 'Dispense Medicines', path: '/pharmacy/dispense', icon: 'Medication', access: PAGE_ACCESS.pharmacyDispense },
      { label: 'Medicine Bills', path: '/pharmacy/bills', icon: 'Receipt', access: PAGE_ACCESS.pharmacyBills },
    ],
  },
  {
    label: 'Laboratory',
    icon: 'Biotech',
    children: [
      { label: 'Add New Test', path: '/laboratory/new-test', icon: 'Add', access: PAGE_ACCESS.labNewTest },
      { label: 'Manage Tests', path: '/laboratory/tests', icon: 'Science', access: PAGE_ACCESS.labTests },
      { label: 'Patient Lab Tests', path: '/laboratory/patient-tests', icon: 'Assignment', access: PAGE_ACCESS.labPatientTests },
      { label: 'Lab Bills', path: '/laboratory/bills', icon: 'Receipt', access: PAGE_ACCESS.labBills },
    ],
  },
  {
    label: 'Room',
    icon: 'MeetingRoom',
    children: [
      { label: 'Room Categories', path: '/room/categories', icon: 'Category', access: PAGE_ACCESS.roomCategories },
      { label: 'Add Room', path: '/room/add', icon: 'AddHome', access: PAGE_ACCESS.roomAdd },
      { label: 'Rooms', path: '/room/rooms', icon: 'Hotel', access: PAGE_ACCESS.roomList },
      { label: 'Admit Patient', path: '/room/admit', icon: 'HowToReg', access: PAGE_ACCESS.roomAdmit },
      { label: 'Admissions', path: '/room/admissions', icon: 'Bed', access: PAGE_ACCESS.roomAdmissions },
      { label: 'IPD Bills', path: '/room/bills', icon: 'Receipt', access: PAGE_ACCESS.roomBills },
    ],
  },
];

/**
 * The menu for this user's permissions: each main menu with only the
 * sub-pages they may open, and main menus left with no sub-pages dropped.
 * Rebuilt on every call (a handful of bitwise checks) rather than cached, so
 * a permission change can never leave a stale menu behind.
 */
export function getSidebarMenu(permissions) {
  return SIDEBAR_GROUPS
    .map((group) => ({
      ...group,
      children: group.children.filter((item) => hasAccess(permissions, item.access)),
    }))
    .filter((group) => group.children.length > 0);
}

/** First page the user can open (top sub-menu of the top main menu), or undefined. */
export function getFirstAccessiblePath(permissions) {
  return getSidebarMenu(permissions)[0]?.children[0]?.path;
}
