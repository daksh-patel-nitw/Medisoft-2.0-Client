import React from 'react';
import BillerDesk from '../../components/BillerDesk';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// The bill types this desk handles (the server also limits them to the user's own billing permissions).
const SLICES = ['bm'];

// Pharmacy's billing desk: medicine charges only.
export default function PharmacyBillsPage() {
  return <BillerDesk title="Medicine bills" slices={SLICES} />;
}

// NEXT.JS SECURITY GATE
PharmacyBillsPage.layout = 'dashboard';
PharmacyBillsPage.requiredPermissions = PAGE_ACCESS.pharmacyBills;
