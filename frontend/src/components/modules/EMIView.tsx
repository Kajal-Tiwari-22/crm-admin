'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { EMISchedule, EMIInstallment, InstallmentStatus } from '@/types/crm';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/storage';
import {
  CreditCard,
  Plus,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  FileCheck,
  Building,
  Store
} from 'lucide-react';

export default function EMIView() {
  const {
    emiSchedules,
    vehicles,
    customers,
    recordEMIPayment,
    setSelectedEMIForReceipt
  } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [financeTypeFilter, setFinanceTypeFilter] = useState<'All' | 'ShowroomDirect' | 'FinanceCompany'>('All');
  const [selectedSchedule, setSelectedSchedule] = useState<EMISchedule | null>(null);

  // Collect Payment Modal State
  const [paymentModalState, setPaymentModalState] = useState<{
    emi: EMISchedule;
    installment: EMIInstallment;
  } | null>(null);

  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [collectNotes, setCollectNotes] = useState<string>('');
  const [paymentError, setPaymentError] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const filteredSchedules = emiSchedules.filter(sch => {
    const cust = customers.find(c => c.id === sch.customerId);
    const veh = vehicles.find(v => v.id === sch.vehicleId);

    const matchesSearch =
      (cust && cust.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cust && cust.phone.includes(searchTerm)) ||
      (veh && veh.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sch.loanAccountNo && sch.loanAccountNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sch.financeCompanyName && sch.financeCompanyName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      financeTypeFilter === 'All' ? true : sch.financeType === financeTypeFilter;

    return matchesSearch && matchesType;
  });

  const handleOpenPayment = (emi: EMISchedule, inst: EMIInstallment) => {
    setPaymentModalState({ emi, installment: inst });
    const remainingForThisInst = inst.amount - (inst.paidAmount || 0);
    setCollectAmount(remainingForThisInst);
    setCollectNotes(`Installment #${inst.installmentNo} collection`);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalState) return;
    setPaymentError('');
    setIsSubmittingPayment(true);

    const res = await recordEMIPayment({
      emiScheduleId: paymentModalState.emi.id,
      installmentNo: paymentModalState.installment.installmentNo,
      paidAmount: collectAmount,
      paymentMethod: collectMethod,
      notes: collectNotes
    });

    if (res.success) {
      setSelectedEMIForReceipt({
        emi: paymentModalState.emi,
        installmentNo: paymentModalState.installment.installmentNo
      });
      setPaymentModalState(null);
    } else {
      setPaymentError(res.message || 'Could not record payment.');
    }
    setIsSubmittingPayment(false);
  };

  const statusBadge = (st: InstallmentStatus) => {
    switch (st) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Due':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Overdue':
        return 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse';
      case 'Pending':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-purple-600" />
            EMI & Finance Payment Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Differentiate between Showroom Direct collections and Bank loans (IDFC, HDFC, L&T). Track installments & receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(emiSchedules, 'EMI_Schedules_Report')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Customer, Loan Ref, Bank, Vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFinanceTypeFilter('All')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              financeTypeFilter === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Loans ({emiSchedules.length})
          </button>
          <button
            onClick={() => setFinanceTypeFilter('ShowroomDirect')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              financeTypeFilter === 'ShowroomDirect' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            Showroom Direct Collections
          </button>
          <button
            onClick={() => setFinanceTypeFilter('FinanceCompany')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              financeTypeFilter === 'FinanceCompany' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-800 border border-purple-200'
            }`}
          >
            <Building className="h-3.5 w-3.5" />
            Bank / NBFC Financed
          </button>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Customer & Phone</th>
                <th className="p-3.5">Vehicle</th>
                <th className="p-3.5">Financier & Loan Ref</th>
                <th className="p-3.5 text-right">Financed Amount</th>
                <th className="p-3.5 text-right">Monthly EMI</th>
                <th className="p-3.5 text-right">Outstanding Balance</th>
                <th className="p-3.5 text-center">Collection Status</th>
                <th className="p-3.5 text-center">Installments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map((sch) => {
                  const cust = customers.find(c => c.id === sch.customerId);
                  const veh = vehicles.find(v => v.id === sch.vehicleId);
                  const overdueCount = sch.installments.filter(i => i.status === 'Overdue').length;
                  const paidCount = sch.installments.filter(i => i.status === 'Paid').length;

                  return (
                    <tr key={sch.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{cust?.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{cust?.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{veh?.brand} {veh?.model}</div>
                        <div className="text-[10px] font-mono text-slate-400">{veh?.chassisVin}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          {sch.financeType === 'ShowroomDirect' ? (
                            <Store className="h-3.5 w-3.5 text-amber-600" />
                          ) : (
                            <Building className="h-3.5 w-3.5 text-purple-600" />
                          )}
                          <span>{sch.financeCompanyName || 'Showroom Direct'}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">Ref: {sch.loanAccountNo}</div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(sch.totalFinancedAmount)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-purple-700">
                        {formatCurrency(sch.monthlyEmiAmount)}
                        <span className="block text-[10px] font-normal text-slate-400">× {sch.tenureMonths} Mo</span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-700">
                        {formatCurrency(sch.outstandingBalance)}
                      </td>
                      <td className="p-3.5 text-center">
                        {overdueCount > 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse border border-rose-200">
                            {overdueCount} Overdue
                          </span>
                        ) : sch.outstandingBalance === 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Fully Cleared
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {paidCount} / {sch.tenureMonths} Paid
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedSchedule(sch)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-purple-700 hover:bg-purple-50 font-bold transition text-[11px]"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No EMI schedules found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Detail Ledger Drawer */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                  {selectedSchedule.financeType === 'ShowroomDirect' ? 'Showroom Direct Collection' : 'Bank Financed'}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">
                  Installment Ledger: {selectedSchedule.loanAccountNo}
                </h3>
                <p className="text-xs text-slate-500">
                  Total Financed: {formatCurrency(selectedSchedule.totalFinancedAmount)} • Outstanding: {formatCurrency(selectedSchedule.outstandingBalance)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSchedule(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Installments Table */}
            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3 text-right">Paid (₹)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Method / Notes</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSchedule.installments.map((inst) => (
                    <tr key={inst.installmentNo} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-mono font-bold text-slate-800">#{inst.installmentNo}</td>
                      <td className="p-3 font-medium text-slate-800">{formatDate(inst.dueDate)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(inst.amount)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(inst.paidAmount)}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(inst.status)}`}>
                          {inst.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {inst.status === 'Paid' || inst.status === 'Partially Paid' ? (
                          <div>
                            <span className="font-semibold text-slate-900">{inst.paymentMethod || 'UPI'}</span>
                            <span className="block text-[10px] font-mono text-slate-400">Rec: {inst.receiptNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unpaid</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {inst.status !== 'Paid' ? (
                          <button
                            onClick={() => handleOpenPayment(selectedSchedule, inst)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                          >
                            Collect
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedEMIForReceipt({ emi: selectedSchedule, installmentNo: inst.installmentNo })}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:underline"
                          >
                            <Printer className="h-3 w-3" />
                            Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedSchedule(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {paymentModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Record EMI Payment Collection
              </h3>
              <button
                onClick={() => setPaymentModalState(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="mt-4 space-y-3 text-xs">
              {paymentError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-700">{paymentError}</p>}
              <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200">
                <p className="text-slate-600">Installment <strong className="text-slate-900">#{paymentModalState.installment.installmentNo}</strong></p>
                <p className="text-slate-600">Total Installment Due: <strong className="font-mono text-slate-900">{formatCurrency(paymentModalState.installment.amount)}</strong></p>
                <p className="text-slate-600">Due Date: <strong className="text-slate-900">{formatDate(paymentModalState.installment.dueDate)}</strong></p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount to Collect (₹) *</label>
                <input
                  type="number"
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method *</label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="Cash">Cash at Showroom Counter</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Receipt Notes / Reference</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. UTR #, Cheque #, or cashier remarks"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalState(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-60"
                >
                  {isSubmittingPayment ? 'Saving payment…' : 'Confirm & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
