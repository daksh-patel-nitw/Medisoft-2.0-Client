import React from 'react';
import MemberRegistrationForm from '../../components/MemberRegistrationForm';
import { PAGE_ACCESS } from '../../utils/pageAccess';

export default function RegisterEmployeePage() {
  return <MemberRegistrationForm kind="employee" />;
}

// NEXT.JS SECURITY GATE
RegisterEmployeePage.layout = 'dashboard';
RegisterEmployeePage.requiredPermissions = PAGE_ACCESS.receptionRegisterEmployee;
