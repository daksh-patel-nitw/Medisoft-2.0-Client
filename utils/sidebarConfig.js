// utils/sidebarConfig.js
export const sidebarMenus = {
  admin: [
    { label: "Organization Info", path: "/admin/organization", icon: "Domain" },
    { label: "Manage Roles", path: "/admin/roles", icon: "ManageAccounts" },

    { label: "New Registration", path: "/reception/register", icon: "PersonAdd" },
    { label: "Book Appointment", path: "/reception/book-appointment", icon: "EventAvailable" },

    { label: "Capture Vitals", path: "/reception/vitals", icon: "MonitorHeart" },

    { label: "New Medicine", path: "/pharmacy/newmedicine", icon: "AddBox" },
    { label: "Medicine Inventory", path: "/pharmacy/inventory", icon: "Inventory" },
    { label: "Dispense Medicines", path: "/pharmacy/dispense", icon: "LocalPharmacy" },

    { label: "Add New Test", path: "/laboratory/new-test", icon: "Biotech" },
    { label: "Manage Tests", path: "/laboratory/tests", icon: "Science" },
    { label: "Patient Lab Tests", path: "/laboratory/patient-tests", icon: "Assignment" },
  ],
  pharmacist: [
    { label: "New Medicine", path: "/pharmacy/newmedicine", icon: "AddBox" },
    { label: "Medicine List", path: "/pharmacy/updatemedicine", icon: "TableChart" },
  ]
};