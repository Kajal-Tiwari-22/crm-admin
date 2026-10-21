'use client';

import React from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import { Printer, X, CheckSquare, Square, Wrench, ShieldCheck } from 'lucide-react';

export default function JobCardModal() {
  const { selectedServiceForJobCard, setSelectedServiceForJobCard, vehicles, customers, settings } = useCRM();

  if (!selectedServiceForJobCard) return null;

  const service = selectedServiceForJobCard;
  const vehicle = vehicles.find(v => v.id === service.vehicleId);
  const customer = customers.find(c => c.id === service.customerId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl my-8">
        {/* Modal Controls (No Print) */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Job Card #{service.jobCardNumber}
            </span>
            <span className="text-xs text-slate-500">
              {service.isFree ? `Free Service Milestone #${service.serviceNumber}` : 'Paid Periodic Service'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-amber-700 transition"
            >
              <Printer className="h-4 w-4" />
              Print Job Card / Receipt
            </button>
            <button
              onClick={() => setSelectedServiceForJobCard(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="print-container p-8 md:p-10 font-sans text-slate-800 text-sm">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-300 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-black text-lg">
                  ⚡
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{settings.showroomName}</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">Authorized EV Service Bay & Diagnostics Center</p>
              <p className="text-xs text-slate-600 mt-1">{settings.address}, {settings.city} | Helpline: {settings.phone}</p>
            </div>
            <div className="md:text-right">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-900 font-bold text-xs uppercase tracking-wider rounded border border-blue-200">
                Service Job Card & Cash Memo
              </span>
              <p className="text-base font-bold text-slate-900 mt-2 font-mono">{service.jobCardNumber}</p>
              <p className="text-xs text-slate-600">Date: {formatDate(service.completedDate || service.scheduledDate)}</p>
              <p className="text-xs text-slate-600">Status: <strong className="text-amber-700 uppercase">{service.status}</strong></p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 text-[11px] text-amber-700">Vehicle & Odometer</h3>
              <p className="font-bold text-sm text-slate-900">{vehicle?.brand} {vehicle?.model} {vehicle?.variant}</p>
              <p className="text-slate-600 mt-0.5">VIN / Chassis: <strong className="font-mono text-slate-800">{vehicle?.chassisVin}</strong></p>
              <p className="text-slate-600">Current Odometer: <strong className="font-mono text-slate-900">{service.odometerReading ? `${service.odometerReading} km` : 'Pending entry'}</strong></p>
              <p className="text-slate-600">Assigned Technician: <strong className="text-slate-900">{service.technicianName || 'Workshop Foreman'}</strong></p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 text-[11px] text-amber-700">Customer Details</h3>
              <p className="font-bold text-sm text-slate-900">{customer?.name}</p>
              <p className="text-slate-600 mt-0.5">Phone: <strong className="text-slate-800">{customer?.phone}</strong></p>
              <p className="text-slate-600">Email: {customer?.email}</p>
              <p className="text-slate-600">Address: {customer?.address}</p>
            </div>
          </div>

          {/* Customer Reported Complaints & Work Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <h4 className="font-bold text-slate-900 text-xs uppercase mb-1">Customer Reported Complaints / Reason:</h4>
              <p className="text-xs text-slate-700 leading-relaxed italic bg-amber-50/50 p-2 rounded border border-amber-100">
                "{service.customerComplaints || 'Periodic scheduled EV maintenance checkup.'}"
              </p>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <h4 className="font-bold text-slate-900 text-xs uppercase mb-1">Diagnosis & Work Done:</h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2 rounded border border-slate-200">
                {service.workDone || 'Multi-point inspection carried out. Drivetrain cleaned, torque bolts verified, brake calipers adjusted.'}
              </p>
            </div>
          </div>

          {/* EV Multi-Point Inspection Checklist */}
          <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <h4 className="font-bold text-slate-900 text-xs uppercase mb-3 flex items-center gap-1.5">
              <Wrench className="h-4 w-4 text-amber-600" />
              Standard EV Multi-Point Diagnostics & Checklist
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(service.inspectionChecklist).map(([key, checked]) => (
                <div key={key} className="flex items-center gap-2 text-slate-700">
                  {checked ? (
                    <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-300 shrink-0" />
                  )}
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Parts Replaced & Bill of Materials */}
          <table className="w-full text-left border-collapse border border-slate-200 my-4 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-2.5 border-r border-slate-200">Part Description</th>
                <th className="p-2.5 text-center border-r border-slate-200 w-16">Qty</th>
                <th className="p-2.5 text-right border-r border-slate-200 w-24">Rate (₹)</th>
                <th className="p-2.5 text-center border-r border-slate-200 w-28">Free Warranty</th>
                <th className="p-2.5 text-right w-28">Payable (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {service.partsReplaced.length > 0 ? (
                service.partsReplaced.map((part, i) => (
                  <tr key={i}>
                    <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800">{part.partName}</td>
                    <td className="p-2.5 text-center border-r border-slate-200 font-mono">{part.quantity}</td>
                    <td className="p-2.5 text-right border-r border-slate-200 font-mono">{formatCurrency(part.unitPrice)}</td>
                    <td className="p-2.5 text-center border-r border-slate-200">
                      {part.isCoveredUnderFreeService ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">100% Free</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">Customer Paid</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-medium text-slate-900">
                      {part.isCoveredUnderFreeService ? formatCurrency(0) : formatCurrency(part.totalPrice)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-slate-400 italic">No parts replaced. Standard service checkup only.</td>
                </tr>
              )}
              {/* Labour */}
              <tr className="border-t border-slate-200">
                <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800" colSpan={3}>
                  Standard EV Labour & Technician Workshop Charges
                </td>
                <td className="p-2.5 text-center border-r border-slate-200">
                  {service.isFree ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">Free Labour</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">Billable</span>
                  )}
                </td>
                <td className="p-2.5 text-right font-mono font-medium text-slate-900">{formatCurrency(service.labourCharge)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
                <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-xs">Total Amount Payable by Customer:</td>
                <td className="p-2.5 text-right text-base text-amber-700 font-black font-mono">
                  {formatCurrency(service.totalCustomerPayable)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="mt-10 pt-6 border-t border-slate-300 grid grid-cols-2 text-center text-xs">
            <div>
              <div className="h-12 flex items-end justify-center font-bold text-slate-700">{service.technicianName || 'Rahul Verma'}</div>
              <p className="font-bold text-slate-800 mt-2">EV Service Technician</p>
              <p className="text-[10px] text-slate-500">Diagnosis & Work Quality Verified</p>
            </div>
            <div>
              <div className="h-12 flex items-end justify-center font-serif text-slate-400 italic">Customer Signature</div>
              <p className="font-bold text-slate-800 mt-2">{customer?.name}</p>
              <p className="text-[10px] text-slate-500">Received Vehicle in Satisfactory Condition</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
