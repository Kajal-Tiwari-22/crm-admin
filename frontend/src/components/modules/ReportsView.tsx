'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/storage';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  CheckCircle2,
  Bike,
  Wrench,
  Receipt
} from 'lucide-react';

export default function ReportsView() {
  const {
    sales,
    vehicles,
    services,
    expenses,
    emiSchedules,
    customers,
    kpis
  } = useCRM();

  const [dateRange, setDateRange] = useState('This Month');

  // Calculations
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalOnRoadPrice, 0);
  const totalCashAndDownCollected = sales.reduce((acc, s) => acc + (s.bookingAmount + s.downPayment), 0);
  
  // Calculate service revenue
  const totalServiceRevenue = services.reduce((acc, s) => acc + s.totalCustomerPayable, 0);

  // Stock valuation of unsold vehicles
  const unsoldVehicles = vehicles.filter(v => v.status === 'Available' || v.status === 'Reserved');
  const totalStockValuation = unsoldVehicles.reduce((acc, v) => acc + v.purchasePrice, 0);

  // EMI collections
  const totalEmiCollected = emiSchedules.reduce((acc, sch) => acc + sch.totalPaidAmount, 0);
  const totalOutstandingReceivables = emiSchedules.reduce((acc, sch) => acc + sch.outstandingBalance, 0);

  // Total cash received into dealership bank/counters = Down payments + EMI collected + Service revenue
  const totalCashCollectedAllSources = totalCashAndDownCollected + totalEmiCollected + totalServiceRevenue;

  // Export full financial summary
  const handleExportFinancials = () => {
    const summary = [
      { Metric: 'Gross On-Road Sales Value', Value: totalSalesRevenue },
      { Metric: 'Cash & Down Payment Collected', Value: totalCashAndDownCollected },
      { Metric: 'Service Bay Revenue', Value: totalServiceRevenue },
      { Metric: 'EMI Collected So Far', Value: totalEmiCollected },
      { Metric: 'Outstanding Finance Receivables', Value: totalOutstandingReceivables },
      { Metric: 'Operating Overheads & Expenses', Value: kpis.totalExpenses },
      { Metric: 'Estimated Gross Dealer Margin', Value: kpis.estimatedGrossMargin },
      { Metric: 'Estimated Net Profit', Value: kpis.estimatedNetProfit },
      { Metric: 'Unsold Stock Inventory Valuation', Value: totalStockValuation }
    ];
    exportToCSV(summary, 'Dealership_Executive_Financial_Report');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-amber-600" />
            Executive Reports & Financial Statements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent breakdown: Distinguish sales revenue from cash collected and estimated profit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFinancials}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Executive CSV Summary
          </button>
        </div>
      </div>

      {/* 3 Pillar Financial Truth Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">1. Gross Vehicle Sales</span>
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          </div>
          <p className="text-3xl font-black text-slate-900 font-mono">{formatCurrency(totalSalesRevenue)}</p>
          <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
            <p className="flex justify-between">
              <span>Vehicles Sold:</span>
              <strong className="text-slate-800 font-mono">{sales.length} Units</strong>
            </p>
            <p className="flex justify-between">
              <span>Avg Selling Price:</span>
              <strong className="text-slate-800 font-mono">
                {sales.length ? formatCurrency(Math.round(totalSalesRevenue / sales.length)) : '₹0'}
              </strong>
            </p>
          </div>
        </div>

        {/* Pillar 2: Actual Cash Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase">2. Total Cash Collected</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-3xl font-black text-emerald-700 font-mono">{formatCurrency(totalCashCollectedAllSources)}</p>
          <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
            <p className="flex justify-between">
              <span>Down Payments:</span>
              <span className="font-mono text-slate-800">{formatCurrency(totalCashAndDownCollected)}</span>
            </p>
            <p className="flex justify-between">
              <span>EMI Installments:</span>
              <span className="font-mono text-slate-800">{formatCurrency(totalEmiCollected)}</span>
            </p>
            <p className="flex justify-between">
              <span>Service Bay Billing:</span>
              <span className="font-mono text-slate-800">{formatCurrency(totalServiceRevenue)}</span>
            </p>
          </div>
        </div>

        {/* Pillar 3: Estimated Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 bg-gradient-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950 uppercase">3. Estimated Net Profit</span>
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          </div>
          <p className="text-3xl font-black text-amber-800 font-mono">{formatCurrency(kpis.estimatedNetProfit)}</p>
          <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
            <p className="flex justify-between">
              <span>Gross Dealer Margin:</span>
              <span className="font-mono text-emerald-700 font-bold">+{formatCurrency(kpis.estimatedGrossMargin)}</span>
            </p>
            <p className="flex justify-between">
              <span>Operating Overheads:</span>
              <span className="font-mono text-rose-600 font-bold">-{formatCurrency(kpis.totalExpenses)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unsold Stock Valuation Report */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Unsold Stock Valuation & Capital Locked</h3>
              <p className="text-xs text-slate-500">Dealer purchase cost invested in currently held scooties.</p>
            </div>
            <span className="text-sm font-black font-mono text-slate-900">{formatCurrency(totalStockValuation)}</span>
          </div>

          <div className="mt-3 divide-y divide-slate-100 text-xs">
            {unsoldVehicles.map((v) => (
              <div key={v.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{v.brand} {v.model}</p>
                  <p className="text-[10px] text-slate-500 font-mono">VIN: {v.chassisVin} • Age: {v.stockAgeDays} days</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(v.purchasePrice)}</span>
                  <span className="block text-[10px] text-slate-400">Ex-dealer cost</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GST & Tax Liability Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">GST (5% EV) & Invoice Summaries</h3>
              <p className="text-xs text-slate-500">Output tax charged on customer invoices.</p>
            </div>
            <span className="text-sm font-black font-mono text-emerald-800">
              {formatCurrency(sales.reduce((acc, s) => acc + s.gstAmount, 0))}
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-100 text-xs">
            {sales.map((s) => {
              const veh = vehicles.find(v => v.id === s.vehicleId);
              return (
                <div key={s.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-slate-900">{s.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-500">{veh?.brand} {veh?.model}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700">+{formatCurrency(s.gstAmount)}</span>
                    <span className="block text-[10px] text-slate-400">HSN: 871160</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
