import React from 'react';
import BillerDesk from '../../components/BillerDesk';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// Any biller role: sees and marks billed whichever of doctor / medicine / lab / IPD charges their own permissions cover.
export default function BillingBillsPage() {
  return <BillerDesk title="Patient bills" />;
}

// NEXT.JS SECURITY GATE
BillingBillsPage.layout = 'dashboard';
BillingBillsPage.requiredPermissions = PAGE_ACCESS.billingBills;
