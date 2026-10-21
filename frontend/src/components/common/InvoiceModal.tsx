'use client';

import React from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import { Printer, X, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function InvoiceModal() {
  const { selectedSaleForInvoice, setSelectedSaleForInvoice, vehicles, customers, settings } = useCRM();

  if (!selectedSaleForInvoice) return null;

  const sale = selectedSaleForInvoice;
  const vehicle = vehicles.find(v => v.id === sale.vehicleId);
  const customer = customers.find(c => c.id === sale.customerId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl my-8">
        {/* Modal Controls (No Print) */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Tax Invoice #{sale.invoiceNumber}
            </span>
            <span className="text-xs text-slate-500">Official EV Handover Invoice</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-amber-700 transition"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
            <button
              onClick={() => setSelectedSaleForInvoice(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
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
              <p className="text-xs text-slate-500 mt-1">{settings.tagline}</p>
              <p className="text-xs text-slate-600 mt-1 max-w-md">{settings.address}, {settings.city}, {settings.state} - {settings.pincode}</p>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">GSTIN: <span className="font-mono text-slate-900 font-bold">{settings.gstNumber}</span> | Phone: {settings.phone}</p>
            </div>
            <div className="md:text-right">
              <span className="inline-block px-3 py-1 bg-amber-50 text-amber-900 font-bold text-xs uppercase tracking-wider rounded border border-amber-200">
                Vehicle Tax Invoice
              </span>
              <p className="text-base font-bold text-slate-900 mt-2">Invoice: {sale.invoiceNumber}</p>
              <p className="text-xs text-slate-600">Date: {formatDate(sale.saleDate)}</p>
              <p className="text-xs text-slate-600">Salesperson: {sale.salespersonName}</p>
              <p className="text-xs text-slate-600">Delivery Status: <strong className="text-emerald-700">{sale.deliveryStatus}</strong></p>
            </div>
          </div>

          {/* Customer & Vehicle Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] text-amber-700">Buyer Details</h3>
              <p className="font-bold text-sm text-slate-900">{customer?.name || 'Customer'}</p>
              <p className="text-slate-600 mt-0.5">{customer?.phone}</p>
              <p className="text-slate-600">{customer?.email}</p>
              <p className="text-slate-600 mt-1">{customer?.address}, {customer?.city} - {customer?.pincode}</p>
              <p className="text-slate-600 mt-1 font-mono">Aadhaar/PAN: {customer?.panNumber || customer?.aadhaarNumber || 'Verified'}</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] text-amber-700">Vehicle Identification</h3>
              <p className="font-bold text-sm text-slate-900">{vehicle?.brand} {vehicle?.model} - {vehicle?.variant}</p>
              <p className="text-slate-600">Color: <span className="font-medium text-slate-800">{vehicle?.color}</span> | Reg No: <span className="font-mono font-bold text-slate-900">{sale.registrationNumber || 'Under RTO Process'}</span></p>
              <div className="mt-2 space-y-0.5 font-mono text-[11px]">
                <p><span className="text-slate-500">Chassis/VIN:</span> <strong className="text-slate-900">{vehicle?.chassisVin}</strong></p>
                <p><span className="text-slate-500">Motor No:</span> <strong className="text-slate-900">{vehicle?.motorNumber}</strong></p>
                <p><span className="text-slate-500">Battery Serial:</span> <strong className="text-slate-900">{vehicle?.batterySerial}</strong></p>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <table className="w-full text-left border-collapse border border-slate-200 my-4 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3 border-r border-slate-200">Description / HSN (871160)</th>
                <th className="p-3 text-right border-r border-slate-200 w-28">Ex-Showroom</th>
                <th className="p-3 text-right border-r border-slate-200 w-24">GST (5%)</th>
                <th className="p-3 text-right border-r border-slate-200 w-28">Discount</th>
                <th className="p-3 text-right w-32">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3 border-r border-slate-200">
                  <p className="font-bold text-slate-900">{vehicle?.brand} {vehicle?.model} {vehicle?.variant}</p>
                  <p className="text-[11px] text-slate-500">Battery: {vehicle?.batteryCapacityKwh} kWh Li-ion | Range: {vehicle?.certifiedRangeKm} km</p>
                </td>
                <td className="p-3 text-right border-r border-slate-200 font-mono">{formatCurrency(sale.exShowroomPrice)}</td>
                <td className="p-3 text-right border-r border-slate-200 font-mono text-emerald-700">+{formatCurrency(sale.gstAmount)}</td>
                <td className="p-3 text-right border-r border-slate-200 font-mono text-rose-600">-{formatCurrency(sale.discount)}</td>
                <td className="p-3 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(sale.exShowroomPrice + sale.gstAmount - sale.discount)}
                </td>
              </tr>
              {sale.accessoriesAmount > 0 && (
                <tr>
                  <td className="p-3 border-r border-slate-200 font-medium text-slate-700">Showroom Genuine Accessory Pack & Helmet</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono">-</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono">-</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono">-</td>
                  <td className="p-3 text-right font-mono font-medium text-slate-900">{formatCurrency(sale.accessoriesAmount)}</td>
                </tr>
              )}
              {sale.insuranceAmount > 0 && (
                <tr>
                  <td className="p-3 border-r border-slate-200 font-medium text-slate-700">1-Yr Comprehensive + 5-Yr Third Party EV Insurance Policy</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono">-</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono">-</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono">-</td>
                  <td className="p-3 text-right font-mono font-medium text-slate-900">{formatCurrency(sale.insuranceAmount)}</td>
                </tr>
              )}
              {sale.registrationAmount > 0 && (
                <tr>
                  <td className="p-3 border-r border-slate-200 font-medium text-slate-700">RTO Smart Card Registration, HSRP Number Plate & Green Cess</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono">-</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono">-</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono">-</td>
                  <td className="p-3 text-right font-mono font-medium text-slate-900">{formatCurrency(sale.registrationAmount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
                <td colSpan={4} className="p-3 text-right text-xs uppercase tracking-wider">Total On-Road Value:</td>
                <td className="p-3 text-right text-base text-amber-700 font-black font-mono">{formatCurrency(sale.totalOnRoadPrice)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Payment & Financing Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-xs">
            <div>
              <h4 className="font-bold text-amber-950 uppercase text-[11px] mb-1">Settlement Summary</h4>
              <div className="space-y-1">
                <p className="flex justify-between">
                  <span className="text-slate-600">Booking Advance Paid:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(sale.bookingAmount)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-600">Down Payment Paid:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(sale.downPayment)}</span>
                </p>
                <p className="flex justify-between border-t border-amber-200 pt-1">
                  <span className="text-slate-800 font-semibold">Total Cash/Down Received:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(sale.bookingAmount + sale.downPayment)}</span>
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-amber-950 uppercase text-[11px] mb-1">Financing Details</h4>
              <p className="text-slate-700"><span className="text-slate-500">Method:</span> <strong className="text-slate-900">{sale.financingType}</strong></p>
              {sale.financingType !== 'Cash/Self' ? (
                <div className="space-y-0.5 mt-1">
                  <p><span className="text-slate-500">Financier:</span> <strong className="text-slate-900">{sale.financeCompanyName || 'In-House'}</strong></p>
                  <p><span className="text-slate-500">Loan Reference:</span> <strong className="font-mono">{sale.loanAccountRef || 'Pending Sanction No'}</strong></p>
                  <p><span className="text-slate-500">Financed Amount:</span> <strong className="font-mono text-amber-800">{formatCurrency(sale.financedAmount || 0)}</strong></p>
                </div>
              ) : (
                <p className="text-emerald-700 font-semibold mt-1">Full Payment Settled via Self/Cash/Direct Transfer</p>
              )}
            </div>
          </div>

          {/* Handover & Free Service Policy */}
          <div className="mt-4 p-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] space-y-1 text-slate-600">
            <p className="font-bold text-slate-800 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              Warranty & Service Policy Declaration:
            </p>
            <p>1. This electric vehicle comes with <strong className="text-slate-900">Three Free Services</strong>. Follow-up milestones are registered in the customer app and CRM portal.</p>
            <p>2. Battery Warranty is valid for <strong className="text-slate-900">{vehicle?.batteryWarrantyMonths || 60} Months</strong>, guaranteeing manufacturer State of Health (SoH) guidelines.</p>
            <p>3. PDI & Smart Charger delivery checklist verified and acknowledged by customer upon handover.</p>
          </div>

          {/* Signature Signoffs */}
          <div className="mt-10 pt-6 border-t border-slate-300 grid grid-cols-2 text-center text-xs">
            <div>
              <div className="h-12 flex items-end justify-center font-serif text-slate-400 italic">Customer Signature</div>
              <p className="font-bold text-slate-800 mt-2">{customer?.name}</p>
              <p className="text-[10px] text-slate-500">Customer Handover & Acceptance</p>
            </div>
            <div>
              <div className="h-12 flex items-end justify-center font-bold text-amber-700">For {settings.showroomName}</div>
              <p className="font-bold text-slate-800 mt-2">{sale.salespersonName}</p>
              <p className="text-[10px] text-slate-500">Authorized Dealership Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
