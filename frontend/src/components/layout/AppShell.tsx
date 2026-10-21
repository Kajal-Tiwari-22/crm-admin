'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import InvoiceModal from '@/components/common/InvoiceModal';
import JobCardModal from '@/components/common/JobCardModal';
import PaymentReceiptModal from '@/components/common/PaymentReceiptModal';
import QuickActionModal from '@/components/common/QuickActionModal';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 antialiased">
      {/* Sticky Dealership Sidebar on the left */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Modals Mounted at Root */}
      <InvoiceModal />
      <JobCardModal />
      <PaymentReceiptModal />
      <QuickActionModal />
    </div>
  );
}
