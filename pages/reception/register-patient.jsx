import React from 'react';
import MemberRegistrationForm from '../../components/MemberRegistrationForm';
import { PAGE_ACCESS } from '../../utils/pageAccess';

export default function RegisterPatientPage() {
  return <MemberRegistrationForm kind="patient" />;
}

// NEXT.JS SECURITY GATE
RegisterPatientPage.layout = 'dashboard';
RegisterPatientPage.requiredPermissions = PAGE_ACCESS.receptionRegisterPatient;
