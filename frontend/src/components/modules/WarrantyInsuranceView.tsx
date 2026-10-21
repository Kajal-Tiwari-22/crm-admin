'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { WarrantyInsurance } from '@/types/crm';
import { formatDate, exportToCSV } from '@/lib/storage';
import {
  ShieldCheck,
  Search,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

export default function WarrantyInsuranceView() {
  const { warrantyInsurance } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const filteredPolicies = warrantyInsurance.filter(w => {
    const matchesSearch =
      w.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.chassisVin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.providerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'All' ? true : w.policyType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Warranty & Insurance Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor 5-year battery warranty State of Health (SoH), comprehensive zero-dep insurance policies and claim status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(warrantyInsurance, 'Warranty_Insurance_Policies')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Policy #, Customer, VIN, Insurance..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="All">All Coverage Types</option>
            <option value="Comprehensive Insurance">Comprehensive Insurance</option>
            <option value="Battery Warranty">Battery Warranty (5 Years)</option>
            <option value="Vehicle Warranty">OEM Vehicle Warranty</option>
          </select>
        </div>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPolicies.map((w) => (
          <div key={w.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {w.policyType}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1.5">{w.providerName}</h3>
                <p className="text-xs text-slate-500 font-mono">Policy Ref: {w.policyNumber}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {w.status}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <strong className="text-slate-900">{w.customerName}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Vehicle:</span>
                <strong className="text-slate-900">{w.vehicleModel}</strong>
              </p>
              <p className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-500">Chassis / VIN:</span>
                <strong className="text-slate-900">{w.chassisVin}</strong>
              </p>
            </div>

            <div className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 italic leading-snug">
              {w.coverageNotes}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Start: {formatDate(w.startDate)}</span>
              </span>
              <span className="font-semibold text-slate-800">
                Expires: {formatDate(w.endDate)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
