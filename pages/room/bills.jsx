import React from 'react';
import BillerDesk from '../../components/BillerDesk';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// The bill types this desk handles (the server also limits them to the user's own billing permissions).
const SLICES = ['bi'];

// Room desk's billing desk: IPD charges only (room stays + the inpatient doctor charge).
export default function RoomBillsPage() {
  return <BillerDesk title="IPD bills" slices={SLICES} />;
}

// NEXT.JS SECURITY GATE
RoomBillsPage.layout = 'dashboard';
RoomBillsPage.requiredPermissions = PAGE_ACCESS.roomBills;
