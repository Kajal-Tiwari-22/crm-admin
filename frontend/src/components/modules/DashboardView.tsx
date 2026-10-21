'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import {
  Bike,
  Users,
  Wrench,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Plus,
  ArrowRight,
  DollarSign,
  BatteryCharging,
  ShoppingCart,
  Send,
  FileText,
  Phone,
  MessageSquare,
  ChevronRight,
  Activity,
  Sparkles,
  RefreshCw,
  Percent,
  Check,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

export default function DashboardView() {
  const {
    kpis,
    vehicles,
    customers,
    services,
    emiSchedules,
    reminders,
    auditLogs,
    setActiveTab,
    setIsQuickActionOpen,
    setSelectedSaleForInvoice,
    setSelectedServiceForJobCard,
    setSelectedEMIForReceipt,
    sales,
    triggerReminderNotification,
    loadDemoData,
    syncToFirestore: syncToMongoDB,
    isMongoConnected,
    mongoDatabaseName,
    settings
  } = useCRM();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const handleQuickSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('');
    try {
      const res = await syncToMongoDB();
      setSyncStatusMsg(res.message);
      setTimeout(() => setSyncStatusMsg(''), 4000);
    } catch {
      setSyncStatusMsg('Sync encountered an issue');
      setTimeout(() => setSyncStatusMsg(''), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Due & Overdue Services (Prioritized by Overdue first)
  const dueServices = services
    .filter(s => s.status === 'Due' || s.status === 'Overdue')
    .sort((a, b) => (a.status === 'Overdue' ? -1 : 1));

  // Overdue and Due Installments
  const pendingInstallments = emiSchedules
    .flatMap(sch =>
      sch.installments
        .filter(i => i.status === 'Overdue' || i.status === 'Due')
        .map(inst => {
          const cust = customers.find(c => c.id === sch.customerId);
          const veh = vehicles.find(v => v.id === sch.vehicleId);
          return { sch, inst, cust, veh };
        })
    )
    .sort((a, b) => (a.inst.status === 'Overdue' ? -1 : 1))
    .slice(0, 4);

  // Financial Insights
  const avgSellingPrice = sales.length > 0 ? Math.round(kpis.monthlySalesAmount / sales.length) : 0;
  const financedCount = sales.filter(s => s.financingType !== 'Cash/Self').length;
  const cashCount = sales.length - financedCount;

  // Inventory Fleet calculations
  const longRangeCount = vehicles.filter(v => v.certifiedRangeKm >= 120).length;
  const standardRangeCount = vehicles.filter(v => v.certifiedRangeKm < 120).length;
  const highCapacityCount = vehicles.filter(v => v.batteryCapacityKwh >= 3.0).length;
  const showroomFloorCount = vehicles.filter(v => v.location === 'Showroom Floor').length;

  const totalStock = kpis.totalStockCount || 1;
  const availablePct = Math.round((kpis.availableStockCount / totalStock) * 100);
  const reservedPct = Math.round((kpis.reservedStockCount / totalStock) * 100);
  const soldPct = Math.round((kpis.soldStockCount / totalStock) * 100);

  // const isShowroomEmpty = vehicles.length === 0 && customers.length === 0;

  return (
    <div className="space-y-6">
      {/* 1. Executive Dealership Command Header */}
      {/* <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl shadow-slate-950/20 border border-slate-800">
      
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Showroom Hub
              </span>
              <span className="text-xs text-slate-400">
                {settings.branchName || 'VoltRider Central Showroom'} • {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {isMongoConnected && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  MongoDB Atlas: {mongoDatabaseName || 'auto-shop'}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              EV Dealership <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Operations HQ</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
              Unified command center for high-speed EV scooty inventory, customer KYC, 3 free-service maintenance milestones, and automated EMI follow-ups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsQuickActionOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Quick Operation</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 font-bold text-xs backdrop-blur-md transition cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4 text-emerald-400" />
              <span>New Vehicle Sale</span>
            </button>

            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-medium text-xs transition cursor-pointer"
              title="Push all changes to MongoDB Atlas"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'MongoDB Sync'}</span>
            </button>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="mt-4 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
        )}
      </div> */}

      {/* Clean Showroom Empty Onboarding Banner (Shows only when 0 records exist) */}
      {/* {isShowroomEmpty && (
        <div className="p-6 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <h3 className="font-black text-slate-900 text-base">Your Showroom CRM is Ready in Clean Dynamic State</h3>
            </div>
            <p className="text-xs text-slate-600 max-w-xl">
              All records are currently empty so you can enter real showroom inventory, customer profiles, and sales. Or populate with sample demonstration data anytime with one click!
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                loadDemoData();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <Zap className="h-4 w-4 fill-slate-950" />
              <span>Load 8 Sample EV Models & Demo Data</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Add First EV Scooty &rarr;
            </button>
          </div>
        </div>
      )} */}

      {/* 2. Four Core High-Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scooty Inventory Depot */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em]">Scooty Depot Stock</span>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Bike className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[28px] leading-none font-extrabold tracking-tight text-slate-900 tabular-nums">{kpis.totalStockCount}</span>
            <span className="text-[11px] font-semibold text-slate-500">Total Units</span>
          </div>

          {/* Visual Mini Allocation Bar */}
          <div className="mt-4 w-full h-1.5 rounded-full bg-slate-100 flex overflow-hidden ring-1 ring-inset ring-slate-200/60">
            <div style={{ width: `${availablePct}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`Available: ${kpis.availableStockCount}`} />
            <div style={{ width: `${reservedPct}%` }} className="bg-amber-400 h-full transition-all duration-500" title={`Reserved: ${kpis.reservedStockCount}`} />
            <div style={{ width: `${soldPct}%` }} className="bg-slate-400 h-full transition-all duration-500" title={`Sold: ${kpis.soldStockCount}`} />
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold tabular-nums">{kpis.availableStockCount} Available</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 font-semibold tabular-nums">{kpis.reservedStockCount} Reserved</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium tabular-nums">{kpis.soldStockCount} Sold</span>
          </div>
        </div>

        {/* Customer Garages */}
        <div
          onClick={() => setActiveTab('customers')}
          className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-300 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em]">Registered Customers</span>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[28px] leading-none font-extrabold tracking-tight text-slate-900 tabular-nums">{kpis.totalCustomersCount}</span>
            <span className="text-[11px] font-semibold text-slate-500">Verified Profiles</span>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-blue-700 font-semibold bg-blue-50/80 ring-1 ring-blue-100 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>KYC &amp; Aadhaar / PAN Storage</span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Multi-Vehicle Support</span>
            <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform duration-300 flex items-center gap-1">
              View CRM &rarr;
            </span>
          </div>
        </div>

        {/* Service Reminders & Milestones */}
        <div
          onClick={() => setActiveTab('services')}
          className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em]">Free Service Milestones</span>
            <div className={`h-10 w-10 rounded-xl ring-1 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${kpis.servicesOverdueCount > 0 ? 'bg-gradient-to-br from-rose-50 to-red-50 text-rose-600 ring-rose-100 animate-pulse' : 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 ring-amber-100'
              }`}>
              <Wrench className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[28px] leading-none font-extrabold tracking-tight text-slate-900 tabular-nums">{kpis.servicesDueCount + kpis.servicesOverdueCount}</span>
            <span className="text-[11px] font-semibold text-slate-500">Bays Scheduled</span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px]">
            {kpis.servicesOverdueCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 ring-1 ring-rose-100 font-bold tabular-nums">
                <AlertTriangle className="h-3.5 w-3.5" />
                {kpis.servicesOverdueCount} Overdue
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 font-semibold">
                <Check className="h-3.5 w-3.5" />
                Bay on Schedule
              </span>
            )}
            <span className="text-amber-800 font-semibold text-[11px] tabular-nums">{kpis.servicesDueCount} Due Now</span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Free #1, #2, #3 Rule Engine</span>
            <span className="text-amber-700 font-semibold group-hover:translate-x-0.5 transition-transform duration-300">Service Bay &rarr;</span>
          </div>
        </div>

        {/* EMI Follow-ups & Collections */}
        <div
          onClick={() => setActiveTab('emi')}
          className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:border-purple-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
        >
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-300 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em]">EMI &amp; Collections</span>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 text-purple-600 ring-1 ring-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[28px] leading-none font-extrabold tracking-tight text-slate-900 tabular-nums">{kpis.pendingEMICount}</span>
            <span className="text-[11px] font-semibold text-slate-500">Active EMIs</span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px]">
            {kpis.overdueEMICount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 ring-1 ring-rose-100 font-bold tabular-nums">
                <ShieldAlert className="h-3.5 w-3.5" />
                {kpis.overdueEMICount} Overdue Recovery
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 ring-1 ring-purple-100 font-semibold">
                Collections Up-to-Date
              </span>
            )}
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showroom Direct + Bank Loans</span>
            <span className="text-purple-700 font-semibold group-hover:translate-x-0.5 transition-transform duration-300">Receipts &rarr;</span>
          </div>
        </div>
      </div>

      {/* 3. Dealership Financial Overview & Fleet Inventory Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Performance Summary (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Financial Overview &amp; Net Margins</h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Real-time revenue, direct operational overheads, and dealer gross margins.</p>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-[11px] font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              <span>Full P&amp;L Report</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 3 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em] block">Invoiced Vehicle Revenue</span>
              <p className="text-[22px] leading-tight font-extrabold text-slate-900 mt-1.5 font-mono tabular-nums">{formatCurrency(kpis.monthlySalesAmount)}</p>
              <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="tabular-nums">{sales.length} delivered vehicles</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em] block">Operating Expenses</span>
              <p className="text-[22px] leading-tight font-extrabold text-rose-700 mt-1.5 font-mono tabular-nums">{formatCurrency(kpis.totalExpenses)}</p>
              <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Rent, Staff Salaries &amp; Utility</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200 ring-1 ring-emerald-100/60">
              <span className="text-[10px] font-semibold text-emerald-900 uppercase tracking-[0.08em] block">Estimated Net Profit</span>
              <p className="text-[22px] leading-tight font-extrabold text-emerald-700 mt-1.5 font-mono tabular-nums">{formatCurrency(kpis.estimatedNetProfit)}</p>
              <div className="mt-2 text-[10px] text-emerald-800 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="tabular-nums">Gross Margin: {formatCurrency(kpis.estimatedGrossMargin)}</span>
              </div>
            </div>
          </div>

          {/* Key Dealership Operational Ratios */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-[0.06em]">Avg. Vehicle Price</span>
              <p className="font-bold font-mono text-slate-900 mt-1 tabular-nums">{formatCurrency(avgSellingPrice)}</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-[0.06em]">Cash vs Finance</span>
              <p className="font-bold text-slate-900 mt-1 tabular-nums">{cashCount} Cash / {financedCount} Loan</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-[0.06em]">Active Leads</span>
              <p className="font-bold text-blue-700 mt-1 tabular-nums">{kpis.activeLeadsCount} Enquiries</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-[0.06em]">Spare Parts Alert</span>
              <p className={`font-bold mt-1 tabular-nums ${kpis.lowStockPartsCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {kpis.lowStockPartsCount} Parts Low
              </p>
            </div>
          </div>
        </div>

        {/* Fleet & Battery Breakdown (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 text-emerald-600 flex items-center justify-center">
                  <BatteryCharging className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">EV Fleet &amp; Battery Tech</h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 tabular-nums">
                {vehicles.length} Units
              </span>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold text-slate-800">Long Range (120+ Km Range)</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">{longRangeCount} Units</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">High-speed highway &amp; touring capable</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold text-slate-800">High Capacity (3.0+ kWh Pack)</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">{highCapacityCount} Units</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Extended 3 to 5-year battery warranty</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold">Showroom Floor Display</span>
                  <span className="font-mono font-bold tabular-nums shrink-0">{showroomFloorCount} Units</span>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">Ready for instant customer test ride</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('inventory')}
            className="w-full mt-5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-[11px] transition-all duration-200 text-center cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Manage Scooty Inventory</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Operational Priority Boards: Service Bay Due & Overdue EMIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due & Overdue Free Services */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">Services Due &amp; Customer Bay Alert</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">1st, 2nd, and 3rd Free Service follow-ups</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('services')}
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline whitespace-nowrap"
            >
              All Services &rarr;
            </button>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {dueServices.length > 0 ? (
              dueServices.slice(0, 4).map((srv) => {
                const veh = vehicles.find(v => v.id === srv.vehicleId);
                const cust = customers.find(c => c.id === srv.customerId);
                const isOverdue = srv.status === 'Overdue';

                return (
                  <div key={srv.id} className="py-3 px-2 -mx-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ring-1 ${isOverdue ? 'bg-rose-50 text-rose-800 ring-rose-100' : 'bg-amber-50 text-amber-800 ring-amber-100'
                          }`}>
                          {srv.status}
                        </span>
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {veh?.brand} {veh?.model}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({srv.jobCardNumber})</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5">
                        Customer: <strong className="text-slate-900 font-semibold">{cust?.name}</strong> • Phone: <span className="font-mono">{cust?.phone}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {srv.isFree ? `Free Service #${srv.serviceNumber}` : 'Periodic Paid'} • Due: {formatDate(srv.dueDate)} ({srv.dueKm} km rule)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cust?.phone && (
                        <a
                          href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hello ${cust.name}, this is a reminder from VoltRider EV Showroom that your EV Scooty (${veh?.brand || ''} ${veh?.model || ''}) is due for ${srv.isFree ? `Free Service #${srv.serviceNumber}` : 'Service'}. Please call us to book your slot.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 ring-1 ring-emerald-100 font-semibold transition-colors text-[11px] flex items-center gap-1"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setSelectedServiceForJobCard(srv);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-[11px] shadow-sm shadow-amber-500/20 transition-colors"
                      >
                        Job Card
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                No pending or overdue service records at this time.
              </div>
            )}
          </div>
        </div>

        {/* EMI Recovery & Collection Follow-ups */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-50 to-fuchsia-50 ring-1 ring-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">EMI Collections &amp; Recovery Radar</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Upcoming and overdue monthly installments</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('emi')}
              className="text-[11px] font-semibold text-purple-700 hover:text-purple-800 hover:underline whitespace-nowrap"
            >
              All EMIs &rarr;
            </button>
          </div>

          <div className="mt-2 divide-y divide-slate-100 text-xs">
            {pendingInstallments.length > 0 ? (
              pendingInstallments.map(({ sch, inst, cust, veh }, idx) => (
                <div key={idx} className="py-3 px-2 -mx-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ring-1 ${inst.status === 'Overdue' ? 'bg-rose-50 text-rose-800 ring-rose-100' : 'bg-amber-50 text-amber-800 ring-amber-100'
                        }`}>
                        {inst.status}
                      </span>
                      <span className="font-semibold text-slate-900 text-xs">{cust?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({sch.financeCompanyName || 'Showroom Direct'})</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      Vehicle: {veh?.brand} {veh?.model} • Installment #{inst.installmentNo}
                    </p>
                    <p className="text-slate-400 text-[10px] mt-0.5">Due Date: {formatDate(inst.dueDate)}</p>
                  </div>

                  <div className="flex items-center gap-3 sm:text-right shrink-0">
                    <div>
                      <span className="font-bold font-mono text-sm text-slate-900 block tabular-nums">{formatCurrency(inst.amount)}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Installment Amount</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedEMIForReceipt({ emi: sch, installmentNo: inst.installmentNo });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-[11px] shadow-sm shadow-purple-600/20 transition-colors"
                    >
                      Collect
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                No overdue EMI payments! All customer accounts in good standing.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Live Operational Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-slate-100 ring-1 ring-slate-200 text-slate-500 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">Real-time Showroom Activity Log</h3>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Audit History &rarr;
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {auditLogs.slice(0, 6).map((log) => (
            <div key={log.id} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-colors text-xs">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-bold text-amber-700 uppercase tracking-[0.06em]">{log.module}</span>
                <span className="font-mono tabular-nums">{log.timestamp.slice(11, 19)}</span>
              </div>
              <p className="font-semibold text-slate-900 mt-1.5">{log.action}</p>
              <p className="text-[10px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">{log.details}</p>
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 flex items-center justify-between">
                <span>By: {log.userName}</span>
                <span className="font-medium text-slate-600">{log.userRole}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
