'use client';

import React, { Suspense } from 'react';
import DashboardView from '@/components/modules/DashboardView';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-mono text-sm">Loading Dashboard...</div>}>
      <DashboardView />
    </Suspense>
  );
}
