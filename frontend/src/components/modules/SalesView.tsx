'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Sale, Vehicle, Customer, FinancingType } from '@/types/crm';
import { formatCurrency, formatDate, exportToCSV, parseCSV } from '@/lib/storage';
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Bike,
  X,
  AlertCircle,
  Upload,
  FileText,
  Paperclip
} from 'lucide-react';

function csvColumn(headers: string[], row: string[], ...names: string[]): string {
  const candidates = names.map(name => name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const index = headers.findIndex(header => candidates.includes(header.toLowerCase().replace(/[^a-z0-9]/g, '')));
  return index < 0 ? '' : (row[index] || '').trim();
}

export default function SalesView() {
  const { sales, vehicles, customers, emiSchedules, recordSale, setSelectedSaleForInvoice, uploadSaleInvoice } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [activeSaleIdForUpload, setActiveSaleIdForUpload] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Available vehicles only
  const availableVehicles = vehicles.filter(v => v.status === 'Available');

  // New Sale Form
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(availableVehicles[0]?.id || '');
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState<number>(2000);
  const [accessoriesAmount, setAccessoriesAmount] = useState<number>(3500);
  const [insuranceAmount, setInsuranceAmount] = useState<number>(5500);
  const [registrationAmount, setRegistrationAmount] = useState<number>(3500);
  const [bookingAmount, setBookingAmount] = useState<number>(5000);
  const [downPayment, setDownPayment] = useState<number>(35000);
  const [salespersonName, setSalespersonName] = useState<string>('Sneha Dixit');
  const [financingType, setFinancingType] = useState<FinancingType>('FinanceCompany');
  const [financeCompanyName, setFinanceCompanyName] = useState<string>('IDFC FIRST Bank');
  const [loanAccountRef, setLoanAccountRef] = useState<string>('');
  const [emiTenureMonths, setEmiTenureMonths] = useState<number>(18);
  const [handoverNotes, setHandoverNotes] = useState<string>('Vehicle delivered in perfect order. Fast charger handed over.');
  
  const [checklist, setChecklist] = useState({
    batteryFullyCharged: true,
    smartChargerHanded: true,
    twoKeysGiven: true,
    toolkitAndFirstAidGiven: true,
    ownerManualGiven: true,
    appPairedAndSetup: true,
    pdiTestRunCompleted: true,
    customerSignatureTaken: true
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!customers.some(customer => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(customers[0]?.id || '');
    }
  }, [customers, selectedCustomerId]);

  React.useEffect(() => {
    if (!vehicles.some(vehicle => vehicle.id === selectedVehicleId && vehicle.status === 'Available')) {
      setSelectedVehicleId(availableVehicles[0]?.id || '');
    }
  }, [vehicles, selectedVehicleId]);

  // Selected vehicle pricing calculation
  const targetVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const exShowroom = targetVehicle ? targetVehicle.sellingPrice : 0;
  const gstAmount = Math.round((exShowroom * 5) / 100);
  const totalOnRoadPrice = Math.max(0, exShowroom + gstAmount + accessoriesAmount + insuranceAmount + registrationAmount - discount);
  const financedAmount = financingType !== 'Cash/Self' ? Math.max(0, totalOnRoadPrice - (bookingAmount + downPayment)) : 0;

  const filteredSales = sales.filter(s => {
    const cust = customers.find(c => c.id === s.customerId);
    const veh = vehicles.find(v => v.id === s.vehicleId);
    return (
      s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cust && cust.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (veh && veh.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.registrationNumber && s.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleInvoiceDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSaleIdForUpload) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const sizeKb = `${Math.round(file.size / 1024)} KB`;

      uploadSaleInvoice(activeSaleIdForUpload, {
        fileName: file.name,
        fileUrl: base64Data,
        fileSize: sizeKb
      });

      setActiveSaleIdForUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const triggerUploadForSale = (saleId: string) => {
    setActiveSaleIdForUpload(saleId);
    fileInputRef.current?.click();
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedVehicleId) {
      setFormError('Please select a valid available vehicle from inventory');
      return;
    }
    if (!selectedCustomerId) {
      setFormError('Please select a customer');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordSale({
        customerId: selectedCustomerId,
        vehicleId: selectedVehicleId,
        saleDate,
        exShowroomPrice: exShowroom,
        discount,
        gstAmount,
        accessoriesAmount,
        insuranceAmount,
        registrationAmount,
        totalOnRoadPrice,
        bookingAmount,
        downPayment,
        financingType,
        financeCompanyName: financingType !== 'Cash/Self' ? financeCompanyName : undefined,
        loanAccountRef: financingType !== 'Cash/Self' ? loanAccountRef || `LN-EV-${Date.now().toString().slice(-4)}` : undefined,
        financedAmount,
        salespersonName,
        deliveryDate,
        deliveryChecklist: checklist,
        handoverNotes,
        emiTenureMonths,
        emiInterestRate: financingType === 'ShowroomDirect' ? 0 : 10.5
      });

      if (!res.success) {
        setFormError(res.message || 'Failed to finalize sale');
        return;
      }
      setIsNewSaleOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to finalize sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    let importedCount = 0;
    setIsImporting(true);
    try {
      const parsed = parseCSV(await file.text());
      if (parsed.length < 2) throw new Error('The CSV must include a header and at least one sale.');
      const [headers, ...rows] = parsed;
      const records = rows.map((row, index) => {
        const customerKey = csvColumn(headers, row, 'customerCode', 'customerId', 'Customer Code');
        const vehicleKey = csvColumn(headers, row, 'chassisVin', 'vehicleId', 'Chassis VIN');
        const customer = customers.find(item => item.customerCode.toLowerCase() === customerKey.toLowerCase() || item.id === customerKey);
        const vehicle = vehicles.find(item => item.chassisVin.toUpperCase() === vehicleKey.toUpperCase() || item.id === vehicleKey);
        const saleDate = csvColumn(headers, row, 'saleDate', 'Sale Date');
        const deliveryDate = csvColumn(headers, row, 'deliveryDate', 'Delivery Date') || saleDate;
        const financingType = csvColumn(headers, row, 'financingType', 'Financing Type') as FinancingType;
        const financeCompanyName = csvColumn(headers, row, 'financeCompanyName', 'Finance Company');
        const rawTenure = csvColumn(headers, row, 'emiTenureMonths', 'EMI Tenure Months');
        const rawInterestRate = csvColumn(headers, row, 'emiInterestRate', 'EMI Interest Rate');
        const emiTenureMonths = rawTenure ? Number(rawTenure) : 12;
        const emiInterestRate = rawInterestRate ? Number(rawInterestRate) : financingType === 'ShowroomDirect' ? 0 : 10.5;
        const amounts = {
          exShowroomPrice: Number(csvColumn(headers, row, 'exShowroomPrice', 'Ex-Showroom Price')),
          discount: Number(csvColumn(headers, row, 'discount', 'Discount')),
          gstAmount: Number(csvColumn(headers, row, 'gstAmount', 'GST Amount')),
          accessoriesAmount: Number(csvColumn(headers, row, 'accessoriesAmount', 'Accessories Amount')),
          insuranceAmount: Number(csvColumn(headers, row, 'insuranceAmount', 'Insurance Amount')),
          registrationAmount: Number(csvColumn(headers, row, 'registrationAmount', 'Registration Amount')),
          totalOnRoadPrice: Number(csvColumn(headers, row, 'totalOnRoadPrice', 'Total On-Road Price')),
          bookingAmount: Number(csvColumn(headers, row, 'bookingAmount', 'Booking Amount')),
          downPayment: Number(csvColumn(headers, row, 'downPayment', 'Down Payment'))
        };
        const rawChecklist = csvColumn(headers, row, 'deliveryChecklistJson', 'Delivery Checklist JSON');
        const defaultChecklist: Sale['deliveryChecklist'] = {
          batteryFullyCharged: false,
          smartChargerHanded: false,
          twoKeysGiven: false,
          toolkitAndFirstAidGiven: false,
          ownerManualGiven: false,
          appPairedAndSetup: false,
          pdiTestRunCompleted: false,
          customerSignatureTaken: false
        };
        let deliveryChecklist = defaultChecklist;
        if (rawChecklist) {
          try {
            const parsedChecklist = JSON.parse(rawChecklist);
            if (!parsedChecklist || typeof parsedChecklist !== 'object' || Array.isArray(parsedChecklist) ||
                Object.values(parsedChecklist).some(value => typeof value !== 'boolean')) {
              throw new Error('Checklist values must be booleans.');
            }
            deliveryChecklist = { ...defaultChecklist, ...parsedChecklist };
          } catch {
            throw new Error(`Row ${index + 2}: delivery checklist JSON is invalid.`);
          }
        }

        if (!customer || !vehicle || vehicle.status !== 'Available') {
          throw new Error(`Row ${index + 2}: customer or available vehicle could not be matched. Use customerCode and chassisVin from the CRM.`);
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate) || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
          throw new Error(`Row ${index + 2}: valid saleDate and deliveryDate are required (YYYY-MM-DD).`);
        }
        if (Number.isNaN(new Date(`${saleDate}T12:00:00`).getTime()) || Number.isNaN(new Date(`${deliveryDate}T12:00:00`).getTime())) {
          throw new Error(`Row ${index + 2}: saleDate and deliveryDate must be valid calendar dates.`);
        }
        if (!['Cash/Self', 'FinanceCompany', 'ShowroomDirect'].includes(financingType)) {
          throw new Error(`Row ${index + 2}: financingType must be Cash/Self, FinanceCompany, or ShowroomDirect.`);
        }
        if (financingType === 'FinanceCompany' && !financeCompanyName) {
          throw new Error(`Row ${index + 2}: financeCompanyName is required for finance-company sales.`);
        }
        if (financingType !== 'Cash/Self' &&
            (!Number.isInteger(emiTenureMonths) || emiTenureMonths < 1 || emiTenureMonths > 120 ||
             !Number.isFinite(emiInterestRate) || emiInterestRate < 0 || emiInterestRate > 100)) {
          throw new Error(`Row ${index + 2}: EMI tenure must be 1–120 months and interest rate must be 0–100.`);
        }
        if (Object.values(amounts).some(amount => !Number.isFinite(amount) || amount < 0) ||
            amounts.exShowroomPrice <= 0 || amounts.totalOnRoadPrice <= 0) {
          throw new Error(`Row ${index + 2}: all prices must be valid non-negative amounts and the sale price must be greater than zero.`);
        }

        return {
          rowNumber: index + 2,
          customerId: customer.id,
          vehicleId: vehicle.id,
          saleDate,
          deliveryDate,
          ...amounts,
          financingType,
          financeCompanyName,
          loanAccountRef: csvColumn(headers, row, 'loanAccountRef', 'Loan Account Ref'),
          salespersonName: csvColumn(headers, row, 'salespersonName', 'Salesperson') || 'Imported',
          registrationNumber: csvColumn(headers, row, 'registrationNumber', 'Registration Number'),
          handoverNotes: csvColumn(headers, row, 'handoverNotes', 'Handover Notes'),
          emiTenureMonths,
          emiInterestRate,
          deliveryChecklist
        };
      });

      const importedVehicles = new Set<string>();
      for (const record of records) {
        if (importedVehicles.has(record.vehicleId)) {
          throw new Error(`Row ${record.rowNumber}: the same vehicle appears more than once in this CSV.`);
        }
        importedVehicles.add(record.vehicleId);
      }

      if (!window.confirm(`This will record ${records.length} sale(s), update vehicle stock, and generate related payment/service records. Continue?`)) return;
      for (const record of records) {
        const { rowNumber, ...saleData } = record;
        const result = await recordSale(saleData);
        if (!result.success) throw new Error(`Row ${rowNumber}: ${result.message || 'Could not record sale.'}`);
        importedCount += 1;
      }
      setImportMessage(`Imported ${importedCount} sale(s) successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sales CSV import failed.';
      setImportMessage(importedCount ? `Imported ${importedCount} sale(s) before stopping: ${message}` : message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    const exportRows = sales.map(sale => {
      const customer = customers.find(item => item.id === sale.customerId);
      const vehicle = vehicles.find(item => item.id === sale.vehicleId);
      const schedule = emiSchedules.find(item => item.saleId === sale.id);
      return {
        customerCode: customer?.customerCode || '',
        chassisVin: vehicle?.chassisPending ? '' : vehicle?.chassisVin || sale.chassisVin || '',
        saleDate: sale.saleDate,
        deliveryDate: sale.deliveryDate || sale.saleDate,
        exShowroomPrice: sale.exShowroomPrice,
        discount: sale.discount,
        gstAmount: sale.gstAmount,
        accessoriesAmount: sale.accessoriesAmount,
        insuranceAmount: sale.insuranceAmount,
        registrationAmount: sale.registrationAmount,
        totalOnRoadPrice: sale.totalOnRoadPrice,
        bookingAmount: sale.bookingAmount,
        downPayment: sale.downPayment,
        financingType: sale.financingType,
        financeCompanyName: sale.financeCompanyName || '',
        loanAccountRef: sale.loanAccountRef || '',
        emiTenureMonths: schedule?.tenureMonths || '',
        emiInterestRate: schedule?.interestRateAnnual || '',
        salespersonName: sale.salespersonName,
        registrationNumber: sale.registrationNumber || '',
        handoverNotes: sale.handoverNotes || '',
        deliveryChecklistJson: JSON.stringify(sale.deliveryChecklist)
      };
    });
    exportToCSV(exportRows.length ? exportRows : [{
      customerCode: '',
      chassisVin: '',
      saleDate: '',
      deliveryDate: '',
      exShowroomPrice: '',
      discount: '',
      gstAmount: '',
      accessoriesAmount: '',
      insuranceAmount: '',
      registrationAmount: '',
      totalOnRoadPrice: '',
      bookingAmount: '',
      downPayment: '',
      financingType: '',
      financeCompanyName: '',
      loanAccountRef: '',
      emiTenureMonths: '',
      emiInterestRate: '',
      salespersonName: '',
      registrationNumber: '',
      handoverNotes: '',
      deliveryChecklistJson: ''
    }], 'Sales_Import_Template');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
            Sales & Delivery Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create sales orders, auto-generate tax invoices, calculate EMIs, and atomically mark stock as Sold.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            title="Import sales using customerCode and an available vehicle chassisVin. Import records real sales and updates stock."
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => {
              if (availableVehicles.length === 0) {
                alert('No vehicles currently Available in stock! Please add stock first.');
                return;
              }
              setIsNewSaleOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Vehicle Sale
          </button>
        </div>
      </div>

      {importMessage && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          <span>{importMessage}</span>
          <button onClick={() => setImportMessage('')} className="font-bold">Dismiss</button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Customer Name, Vehicle Model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Vehicle Delivered</th>
                <th className="p-3.5">Financing</th>
                <th className="p-3.5 text-right">On-Road Value</th>
                <th className="p-3.5 text-right">Down Payment</th>
                <th className="p-3.5 text-center">Handover Status</th>
                <th className="p-3.5 text-center">Tax Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length > 0 ? (
                filteredSales.map((s) => {
                  const cust = customers.find(c => c.id === s.customerId);
                  const veh = vehicles.find(v => v.id === s.vehicleId);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="font-bold font-mono text-slate-900">{s.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-400">{formatDate(s.saleDate)}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{cust?.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{cust?.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{veh?.brand} {veh?.model}</div>
                        <div className="text-[10px] font-mono text-slate-500">{veh?.chassisPending ? 'Chassis pending' : veh?.chassisVin}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-medium text-slate-800">{s.financingType}</span>
                        {s.financeCompanyName && (
                          <div className="text-[10px] text-slate-500">{s.financeCompanyName}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(s.totalOnRoadPrice)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(s.bookingAmount + s.downPayment)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {s.deliveryStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedSaleForInvoice(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition text-xs"
                            title="Generate & Print GST Invoice"
                          >
                            <Printer className="h-3.5 w-3.5 text-amber-600" />
                            <span>Print</span>
                          </button>

                          {s.uploadedInvoiceFile ? (
                            <a
                              href={s.uploadedInvoiceFile.fileUrl}
                              download={s.uploadedInvoiceFile.fileName}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold transition text-[11px]"
                              title={`Download ${s.uploadedInvoiceFile.fileName} (${s.uploadedInvoiceFile.fileSize || ''})`}
                            >
                              <Paperclip className="h-3 w-3" />
                              <span>Doc ({s.uploadedInvoiceFile.fileSize || 'PDF'})</span>
                            </a>
                          ) : (
                            <button
                              onClick={() => triggerUploadForSale(s.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 font-medium transition text-[11px]"
                              title="Attach scanned or signed invoice PDF/Image"
                            >
                              <Upload className="h-3 w-3" />
                              <span>Upload Doc</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal / Wizard */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl p-6 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Finalize EV Vehicle Sale & Handover</h2>
                <p className="text-xs text-slate-500">Atomically updates stock to SOLD, registers 3 free service milestones & EMI.</p>
              </div>
              <button
                onClick={() => setIsNewSaleOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSale} className="mt-4 space-y-4 text-xs">
              {/* Step 1: Customer & Vehicle Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Select Customer *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - {c.customerCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Select Available Scooty *</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {availableVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.brand} {v.model} ({v.color}) - {v.chassisPending ? 'Chassis pending' : `VIN: ${v.chassisVin}`} [{formatCurrency(v.sellingPrice)}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Pricing Breakdown */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  On-Road Pricing Calculation
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Ex-Showroom Base</label>
                    <input
                      type="text"
                      disabled
                      value={formatCurrency(exShowroom)}
                      className="w-full p-2 bg-slate-200/60 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">GST (5% EV)</label>
                    <input
                      type="text"
                      disabled
                      value={formatCurrency(gstAmount)}
                      className="w-full p-2 bg-slate-200/60 border border-slate-300 rounded-lg font-mono text-emerald-700 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Dealer Discount (₹)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-rose-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Accessories (₹)</label>
                    <input
                      type="number"
                      value={accessoriesAmount}
                      onChange={(e) => setAccessoriesAmount(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Insurance (₹)</label>
                    <input
                      type="number"
                      value={insuranceAmount}
                      onChange={(e) => setInsuranceAmount(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">RTO & HSRP (₹)</label>
                    <input
                      type="number"
                      value={registrationAmount}
                      onChange={(e) => setRegistrationAmount(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div className="col-span-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <span className="font-bold text-emerald-950 uppercase text-[11px]">Final On-Road Price:</span>
                    <span className="text-base font-black text-emerald-800 font-mono">{formatCurrency(totalOnRoadPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Payment & Financing */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
                <p className="font-bold text-amber-950 text-xs uppercase tracking-wide">
                  Payment Collection & Financing Mode
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                    <select
                      value={financingType}
                      onChange={(e) => setFinancingType(e.target.value as FinancingType)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="FinanceCompany">Bank / Finance Company Loan</option>
                      <option value="ShowroomDirect">Showroom Direct In-House EMI</option>
                      <option value="Cash/Self">Full Self / Cash Payment</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Booking Advance Paid (₹)</label>
                    <input
                      type="number"
                      value={bookingAmount}
                      onChange={(e) => setBookingAmount(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Down Payment Collected (₹)</label>
                    <input
                      type="number"
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
                    />
                  </div>
                </div>

                {financingType !== 'Cash/Self' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Financier Name</label>
                      <input
                        type="text"
                        value={financeCompanyName}
                        onChange={(e) => setFinanceCompanyName(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                        placeholder="e.g. IDFC FIRST Bank, HDFC"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tenure (Months)</label>
                      <select
                        value={emiTenureMonths}
                        onChange={(e) => setEmiTenureMonths(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value={10}>10 Months</option>
                        <option value={12}>12 Months</option>
                        <option value={18}>18 Months</option>
                        <option value={24}>24 Months</option>
                        <option value={36}>36 Months</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Financed Balance Amount</label>
                      <div className="p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-purple-700">
                        {formatCurrency(financedAmount)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Handover Checklist Signoff */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-800 text-xs uppercase block">Delivery Checklist & Verification</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.batteryFullyCharged}
                      onChange={(e) => setChecklist({ ...checklist, batteryFullyCharged: e.target.checked })}
                      className="rounded text-amber-600"
                    />
                    <span>Battery 100% Charged</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.smartChargerHanded}
                      onChange={(e) => setChecklist({ ...checklist, smartChargerHanded: e.target.checked })}
                      className="rounded text-amber-600"
                    />
                    <span>Smart Charger Handed</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.twoKeysGiven}
                      onChange={(e) => setChecklist({ ...checklist, twoKeysGiven: e.target.checked })}
                      className="rounded text-amber-600"
                    />
                    <span>2 Keys Given</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.toolkitAndFirstAidGiven}
                      onChange={(e) => setChecklist({ ...checklist, toolkitAndFirstAidGiven: e.target.checked })}
                      className="rounded text-amber-600"
                    />
                    <span>Tool Kit & First Aid</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSaleOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || availableVehicles.length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 text-white font-bold shadow-md shadow-emerald-500/20"
                >
                  {isSubmitting ? 'Finalizing Sale...' : 'Finalize Sale & Print Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden File Input for Scanned Invoice Document Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInvoiceDocUpload}
        accept="image/*,.pdf"
        className="hidden"
      />
    </div>
  );
}
