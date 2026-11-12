import React, { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { CRMProvider } from "@/context/CRMContext";
import AdminLoginGate from "@/components/auth/AdminLoginGate";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "MotorSHANDILYA EV Scooty Showroom CRM",
  description: "Complete EV Scooty Showroom Management System for vehicle inventory, sales, customer KYC, 3 free services, EMI tracking, automated reminders, and financial accounts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Huninn&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 leading-relaxed">
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-mono text-sm text-slate-500">Loading VoltRider EV CRM...</div>}>
          <CRMProvider>
            <AdminLoginGate>
              <AppShell>
                {children}
              </AppShell>
            </AdminLoginGate>
          </CRMProvider>
        </Suspense>
      </body>
    </html>
  );
}
