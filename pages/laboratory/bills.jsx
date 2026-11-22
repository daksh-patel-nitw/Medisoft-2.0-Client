import React from 'react';
import BillerDesk from '../../components/BillerDesk';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// The bill types this desk handles (the server also limits them to the user's own billing permissions).
const SLICES = ['bl'];

// Laboratory's billing desk: lab-test charges only.
export default function LabBillsPage() {
  return <BillerDesk title="Lab bills" slices={SLICES} />;
}

// NEXT.JS SECURITY GATE
LabBillsPage.layout = 'dashboard';
LabBillsPage.requiredPermissions = PAGE_ACCESS.labBills;
