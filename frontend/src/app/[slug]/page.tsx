'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';

// Core Module Views
import DashboardView from '@/components/modules/DashboardView';
import InventoryView from '@/components/modules/InventoryView';
import CustomersView from '@/components/modules/CustomersView';
import SalesView from '@/components/modules/SalesView';
import ServicesView from '@/components/modules/ServicesView';
import EMIView from '@/components/modules/EMIView';
import RemindersView from '@/components/modules/RemindersView';
import LeadsView from '@/components/modules/LeadsView';
import SparePartsView from '@/components/modules/SparePartsView';
import SuppliersView from '@/components/modules/SuppliersView';
import WarrantyInsuranceView from '@/components/modules/WarrantyInsuranceView';
import ExpensesView from '@/components/modules/ExpensesView';
import ReportsView from '@/components/modules/ReportsView';
import SettingsView from '@/components/modules/SettingsView';

function ModuleContent() {
  const params = useParams();
  const rawSlug = typeof params?.slug === 'string' ? params.slug.toLowerCase() : 'dashboard';

  switch (rawSlug) {
    case 'dashboard':
      return <DashboardView />;
    case 'scooty':
    case 'inventory':
      return <InventoryView />;
    case 'customers':
      return <CustomersView />;
    case 'sales':
      return <SalesView />;
    case 'services':
      return <ServicesView />;
    case 'emi':
      return <EMIView />;
    case 'reminders':
      return <RemindersView />;
    case 'leads':
      return <LeadsView />;
    case 'parts':
      return <SparePartsView />;
    case 'suppliers':
      return <SuppliersView />;
    case 'warranty':
      return <WarrantyInsuranceView />;
    case 'expenses':
      return <ExpensesView />;
    case 'reports':
      return <ReportsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
}

export default function ModulePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-mono text-sm">Loading module...</div>}>
      <ModuleContent />
    </Suspense>
  );
}
