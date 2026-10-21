'use client';

import React from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import { Printer, X, CheckCircle2 } from 'lucide-react';

export default function PaymentReceiptModal() {
  const { selectedEMIForReceipt, setSelectedEMIForReceipt, emiSchedules, customers, vehicles, settings } = useCRM();

  if (!selectedEMIForReceipt) return null;

  const { emi, installmentNo } = selectedEMIForReceipt;
  const installment = emi.installments.find(i => i.installmentNo === installmentNo);
  const customer = customers.find(c => c.id === emi.customerId);
  const vehicle = vehicles.find(v => v.id === emi.vehicleId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-8">
        {/* Controls */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Receipt #{installment?.receiptNumber || 'REC-PAYMENT'}
            </span>
            <span className="text-xs text-slate-500">Official Payment Voucher</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-amber-700 transition"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
            <button
              onClick={() => setSelectedEMIForReceipt(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="print-container p-8 font-sans text-slate-800 text-sm">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500 flex items-center justify-center text-white font-black text-base">
                  ⚡
                </div>
                <h1 className="text-xl font-black text-slate-900">{settings.showroomName}</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">{settings.address}, {settings.city}</p>
              <p className="text-xs text-slate-600 font-medium">GSTIN: {settings.gstNumber} | Ph: {settings.phone}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-900 font-bold text-xs uppercase rounded border border-emerald-200">
                Payment Receipt
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1 font-mono">{installment?.receiptNumber || 'REC-PENDING'}</p>
              <p className="text-xs text-slate-500">Date: {formatDate(installment?.paidDate || new Date().toISOString())}</p>
            </div>
          </div>

          {/* Body */}
          <div className="my-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500">Received From:</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{customer?.name}</p>
                <p className="text-slate-600">{customer?.phone}</p>
                <p className="text-slate-600">{customer?.city}</p>
              </div>
              <div>
                <p className="text-slate-500">Vehicle / Loan Account:</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{vehicle?.brand} {vehicle?.model}</p>
                <p className="text-slate-600">Financier: <strong className="text-slate-800">{emi.financeCompanyName || 'Showroom Direct'}</strong></p>
                <p className="text-slate-600 font-mono">Loan Ref: {emi.loanAccountNo}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Particulars</th>
                    <th className="p-3">Installment #</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">
                      Monthly EMI Installment Collection
                      <p className="text-[11px] text-slate-500 font-normal">Due Date: {formatDate(installment?.dueDate || '')}</p>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">#{installment?.installmentNo} / {emi.tenureMonths}</td>
                    <td className="p-3 font-semibold text-slate-800">{installment?.paymentMethod || 'UPI'}</td>
                    <td className="p-3 text-right font-bold font-mono text-base text-emerald-700">
                      {formatCurrency(installment?.paidAmount || installment?.amount || 0)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="p-3 text-right font-medium text-slate-600">Total Outstanding Balance Remaining:</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-800">
                      {formatCurrency(emi.outstandingBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Payment acknowledged & verified in showroom accounts ledger. Thank you!</span>
            </div>
          </div>

          {/* Signoff */}
          <div className="mt-8 pt-6 border-t border-slate-300 flex justify-between items-end text-xs">
            <div>
              <p className="text-slate-500">Customer Copy</p>
              <p className="text-[10px] text-slate-400">Keep safe for warranty & NOC claims</p>
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-900">For {settings.showroomName}</div>
              <p className="text-[10px] text-slate-500 mt-1">Authorized Cashier / Accounts Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
