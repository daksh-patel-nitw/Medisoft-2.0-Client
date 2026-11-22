import React from 'react';
import BillerDesk from '../../components/BillerDesk';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// The bill types this desk handles (the server also limits them to the user's own billing permissions).
const SLICES = ['ba'];

// Reception's billing desk: OPD doctor consultation charges only.
export default function ReceptionBillsPage() {
  return <BillerDesk title="Consultation bills" slices={SLICES} />;
}

// NEXT.JS SECURITY GATE
ReceptionBillsPage.layout = 'dashboard';
ReceptionBillsPage.requiredPermissions = PAGE_ACCESS.receptionBills;
