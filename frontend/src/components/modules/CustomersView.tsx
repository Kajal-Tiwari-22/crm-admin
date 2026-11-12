'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Customer } from '@/types/crm';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/storage';
import CustomerSaleForm from '@/components/modules/CustomerSaleForm';
import {
  Users,
  Plus,
  Search,
  Download,
  Phone,
  Mail,
  Bike,
  Wrench,
  CreditCard,
  FileCheck,
  Trash2,
  FileText,
  Paperclip,
  X,
  Archive,
  Edit2,
  ShieldCheck
} from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function CustomersView() {
  const {
    customers,
    addCustomerDocument,
    removeCustomerDocument,
    vehicles,
    sales,
    services,
    emiSchedules,
    warrantyInsurance,
    syncFromMongoDB,
    setSelectedSaleForInvoice,
    setSelectedServiceForJobCard
  } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [purchaseMethodFilter, setPurchaseMethodFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [purchaseFrom, setPurchaseFrom] = useState('');
  const [purchaseTo, setPurchaseTo] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', currentAddress: '', permanentAddress: '', panNumber: '' });
  const [actionError, setActionError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState('');

  // Document upload state
  const [docType, setDocType] = useState<'Aadhaar' | 'PAN' | 'DrivingLicense' | 'ElectricityBill' | 'Photo' | 'Other'>('Aadhaar');
  const [docTitle, setDocTitle] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;

  const activeCustomers = customers.filter(customer => !customer.archivedAt);
  const filteredCustomers = activeCustomers.filter(customer => {
    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    const matchingSale = customerSales.find(sale => {
      const vehicle = vehicles.find(item => item.id === sale.vehicleId);
      const haystack = `${vehicle?.modelNumber || vehicle?.model || ''} ${sale.invoiceNumber}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
    const matchesSearch = !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Boolean(matchingSale);
    const latestSale = customerSales.sort((a, b) => b.saleDate.localeCompare(a.saleDate))[0];
    const schedule = emiSchedules.find(item => item.customerId === customer.id);
    const outstanding = schedule?.outstandingBalance ?? latestSale?.remainingAmount ?? 0;
    const overdue = schedule?.installments.some(item =>
      item.status === 'Overdue' || (item.status !== 'Paid' && item.dueDate < new Date().toISOString().slice(0, 10))
    ) || false;
    const status = !latestSale ? 'No purchase' : outstanding <= 0 ? 'Paid' : overdue ? 'Overdue' : 'Upcoming';
    const matchesMethod = purchaseMethodFilter === 'All' || latestSale?.paymentMethod === purchaseMethodFilter;
    const matchesStatus = paymentStatusFilter === 'All' ||
      (paymentStatusFilter === 'Outstanding' ? outstanding > 0 : status === paymentStatusFilter);
    const matchesDate = (!purchaseFrom || Boolean(latestSale && latestSale.saleDate >= purchaseFrom)) &&
      (!purchaseTo || Boolean(latestSale && latestSale.saleDate <= purchaseTo));
    return matchesSearch && matchesMethod && matchesStatus && matchesDate;
  });

  const saveCustomerEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCustomer) return;
    setActionError('');
    try {
      const response = await fetch(`${BACKEND}/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          address: editForm.currentAddress,
          panNumber: editForm.panNumber.toUpperCase()
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Customer update failed.');
      await syncFromMongoDB();
      setEditingCustomer(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Customer update failed.');
    }
  };

  const archiveCustomer = async (customer: Customer) => {
    if (!window.confirm(`Archive ${customer.name}? Financial and service history will be preserved.`)) return;
    setActionError('');
    try {
      const response = await fetch(`${BACKEND}/api/customers/${customer.id}`, { method: 'DELETE', credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not archive customer.');
      await syncFromMongoDB();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not archive customer.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCustomer) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const sizeKb = `${Math.round(file.size / 1024)} KB`;
      
      addCustomerDocument(selectedCustomer.id, {
        name: file.name,
        type: docType,
        status: 'Verified',
        fileName: file.name,
        fileUrl: base64Data,
        fileSize: sizeKb,
        title: docTitle.trim() || `${docType} Document`,
        uploadedAt: new Date().toISOString()
      });

      setDocTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploadingDoc(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {saleSuccess && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span>Customer and scooter sale saved successfully. Invoice {saleSuccess}.</span>
          <button onClick={() => setSaleSuccess('')} className="font-bold text-emerald-900">Dismiss</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Customer Management & Vehicle Garages
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Searchable customer profiles with multi-vehicle ownership, service timelines, and EMI schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(activeCustomers.map(customer => ({
              customerCode: customer.customerCode,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              city: customer.city,
              currentAddress: customer.currentAddress || customer.address
            })), 'Showroom_Customers_Directory')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, phone, scooter model, or invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 transition"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[11px] font-semibold text-slate-500">Payment method
            <select value={purchaseMethodFilter} onChange={event => setPurchaseMethodFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
              <option value="All">All methods</option><option value="Full Payment">Full Payment</option><option value="Finance Company EMI">Finance Company EMI</option><option value="Showroom Installments">Showroom Installments</option>
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-500">Payment status
            <select value={paymentStatusFilter} onChange={event => setPaymentStatusFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
              <option value="All">All statuses</option><option value="Paid">Paid</option><option value="Upcoming">Upcoming</option><option value="Overdue">Overdue</option><option value="Outstanding">Outstanding balance</option>
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-500">Purchase date from
            <input type="date" value={purchaseFrom} onChange={event => setPurchaseFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" />
          </label>
          <label className="text-[11px] font-semibold text-slate-500">Purchase date to
            <input type="date" value={purchaseTo} onChange={event => setPurchaseTo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" />
          </label>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Scooter / Sale Date</th>
                <th className="p-3.5 text-right">Final Price</th>
                <th className="p-3.5">Payment / Balance</th>
                <th className="p-3.5">Next Due / Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => {
                  const ownedVehicles = vehicles.filter(v => c.vehicleIds.includes(v.id));
                  const customerSale = sales
                    .filter(sale => sale.customerId === c.id)
                    .sort((a, b) => b.saleDate.localeCompare(a.saleDate))[0];
                  const saleVehicle = customerSale && vehicles.find(vehicle => vehicle.id === customerSale.vehicleId);
                  const schedule = emiSchedules.find(item => item.customerId === c.id);
                  const openInstallments = schedule?.installments.filter(item => item.status !== 'Paid') || [];
                  const nextInstallment = openInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
                  const outstanding = schedule?.outstandingBalance ?? customerSale?.remainingAmount ?? 0;
                  const paymentStatus = !customerSale ? 'No purchase' : outstanding <= 0 ? 'Paid' :
                    nextInstallment?.status === 'Overdue' || (nextInstallment && nextInstallment.dueDate < new Date().toISOString().slice(0, 10)) ? 'Overdue' : 'Upcoming';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{c.customerCode}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="flex items-center gap-1.5 text-slate-700 font-medium"><Phone className="h-3 w-3 text-emerald-600" />{c.phone}</span>
                        {c.email && <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><Mail className="h-3 w-3 text-slate-400" />{c.email}</span>}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{saleVehicle ? `${saleVehicle.brand} ${saleVehicle.model}` : (ownedVehicles[0]?.model || '—')}</div>
                        <div className="mt-1 text-[10px] text-slate-500">{customerSale ? formatDate(customerSale.saleDate) : 'No sale recorded'}</div>
                        {customerSale && <div className="font-mono text-[10px] text-slate-400">{customerSale.invoiceNumber}</div>}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-800">{customerSale ? formatCurrency(customerSale.finalSellingPrice ?? customerSale.totalOnRoadPrice) : '—'}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-700">{customerSale?.paymentMethod || customerSale?.financingType || '—'}</div>
                        <div className="mt-1 text-[11px] text-rose-700">Balance: {formatCurrency(outstanding)}</div>
                      </td>
                      <td className="p-3.5">
                        <div>{nextInstallment ? formatDate(nextInstallment.dueDate) : '—'}</div>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${paymentStatus === 'Overdue' ? 'bg-rose-100 text-rose-700' : paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{paymentStatus}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap justify-center gap-1">
                          <button onClick={() => setSelectedCustomerId(c.id)} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50">View</button>
                          <button onClick={() => {
                            setEditingCustomer(c);
                            setEditForm({ name: c.name, phone: c.phone, email: c.email, currentAddress: c.currentAddress || c.address, permanentAddress: c.permanentAddress || '', panNumber: c.panNumber || '' });
                          }} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"><Edit2 className="inline h-3 w-3" /> Edit</button>
                          <button onClick={() => archiveCustomer(c)} className="rounded-lg border border-amber-200 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-50"><Archive className="inline h-3 w-3" /> Archive</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No customers found matching search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Full Profile Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {selectedCustomer.customerCode}
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">{selectedCustomer.name}</h2>
                <p className="text-xs text-slate-500">{selectedCustomer.city} • Preferred: {selectedCustomer.communicationPreference}</p>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-6 text-xs">
              {/* Contact & KYC Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Contact</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedCustomer.phone}</p>
                  <p className="text-slate-500">{selectedCustomer.email}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Identity Docs</span>
                  <p className="text-slate-700 mt-0.5">PAN: <strong className="font-mono">{selectedCustomer.panNumber ? `••••••${selectedCustomer.panNumber.slice(-4)}` : 'Not provided'}</strong></p>
                  <p className="text-slate-700">Aadhaar: <strong className="font-mono">{selectedCustomer.aadhaarNumber ? `••••••••${selectedCustomer.aadhaarNumber.slice(-4)}` : 'Not provided'}</strong></p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Address</span>
                  <p className="text-slate-700 mt-0.5 leading-snug">Current: {selectedCustomer.currentAddress || selectedCustomer.address || 'Not provided'}</p>
                  <p className="mt-1 leading-snug text-slate-700">Permanent: {selectedCustomer.permanentAddress || 'Not provided'}</p>
                </div>
              </div>

              {selectedCustomer.guarantorRequired && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                  <h3 className="mb-2 font-bold text-amber-950">Guarantor Details</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <p><span className="text-slate-500">Name</span><strong className="block">{selectedCustomer.guarantor?.name || '—'}</strong></p>
                    <p><span className="text-slate-500">Phone</span><strong className="block">{selectedCustomer.guarantor?.phone || '—'}</strong></p>
                    <p><span className="text-slate-500">Address</span><strong className="block">{selectedCustomer.guarantor?.address || '—'}</strong></p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm">Sale Invoices & Payment History</h3>
                {sales.filter(sale => sale.customerId === selectedCustomer.id).map(sale => (
                  <div key={sale.id} className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-mono font-bold text-slate-900">{sale.invoiceNumber}</p>
                        <p className="mt-1 text-[11px] text-slate-600">{sale.modelNumber || vehicles.find(vehicle => vehicle.id === sale.vehicleId)?.model} · {formatDate(sale.saleDate)} · {sale.paymentMethod || sale.financingType}</p>
                      </div>
                      <button onClick={() => setSelectedSaleForInvoice(sale)} className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-800">View invoice</button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                      <p>Final price<strong className="block text-slate-900">{formatCurrency(sale.finalSellingPrice ?? sale.totalOnRoadPrice)}</strong></p>
                      <p>Outstanding<strong className="block text-rose-700">{formatCurrency(sale.remainingAmount || 0)}</strong></p>
                      <p>Chassis<strong className="block break-all font-mono">{sale.chassisVin || vehicles.find(vehicle => vehicle.id === sale.vehicleId)?.chassisVin || '—'}</strong></p>
                      <p>Battery<strong className="block break-all font-mono">{sale.batterySerial || vehicles.find(vehicle => vehicle.id === sale.vehicleId)?.batterySerial || '—'}</strong></p>
                    </div>
                    {sale.paymentLedger?.map((payment, index) => (
                      <p key={index} className="mt-2 border-t border-emerald-100 pt-2 text-[11px] text-slate-600">
                        Payment received {formatCurrency(payment.amountPaid)} on {formatDate(payment.paymentDate)} via {payment.paymentMethod}; balance {formatCurrency(payment.outstandingBalance)}
                      </p>
                    ))}
                  </div>
                ))}
                {sales.every(sale => sale.customerId !== selectedCustomer.id) && <p className="text-xs text-slate-500">No sale has been recorded for this customer.</p>}
              </div>

              {/* KYC & Document Upload Section */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-blue-600" />
                      Customer KYC & Uploaded Documents ({selectedCustomer.documents?.length || 0})
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload Aadhaar card, PAN card, driving license, address proof, or customer photo.
                    </p>
                  </div>
                </div>

                {/* Upload Form */}
                <div className="p-3 rounded-xl bg-white border border-blue-100 mb-3 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Document Type</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="DrivingLicense">Driving License</option>
                      <option value="ElectricityBill">Address / Electricity Bill</option>
                      <option value="Photo">Customer Passport Photo</option>
                      <option value="Other">Other KYC Document</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Title / Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Front & Back Copy"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Select File (PDF/Image)</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 italic">
                      {isUploadingDoc ? 'Encoding document...' : 'Instant client upload & cloud sync ready'}
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents List */}
                <div className="space-y-2">
                  {selectedCustomer.documents && selectedCustomer.documents.length > 0 ? (
                    selectedCustomer.documents.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {doc.title || doc.name || doc.fileName || `${doc.type} Document`}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Type: <span className="font-semibold text-slate-700">{doc.type}</span> • Size: {doc.fileSize || 'N/A'} • {doc.uploadedAt ? formatDate(doc.uploadedAt) : 'Stored'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {doc.fileUrl ? (
                            <a
                              href={doc.fileUrl}
                              download={doc.fileName || `${selectedCustomer.name}_${doc.type}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition"
                            >
                              <Download className="h-3 w-3" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
                              No file attached
                            </span>
                          )}

                          {doc.id && (
                            <button
                              type="button"
                              onClick={() => removeCustomerDocument(selectedCustomer.id, doc.id!)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete Document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-400 text-xs italic bg-white/50 rounded-lg">
                      No documents uploaded yet. Select a file above to upload customer Aadhaar, PAN or Driving License.
                    </div>
                  )}
                </div>
              </div>

              {/* Owned Vehicles Garage */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <Bike className="h-4 w-4 text-amber-600" />
                  Vehicle Garage ({selectedCustomer.vehicleIds.length} Vehicles)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {vehicles.filter(v => selectedCustomer.vehicleIds.includes(v.id)).map(v => (
                    <div key={v.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900">{v.brand} {v.model}</p>
                          <p className="text-[11px] text-slate-500">{v.variant} • {v.color}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {v.status}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] font-mono text-slate-700 space-y-0.5">
                        <p>VIN: <strong>{v.chassisVin}</strong></p>
                        <p>Motor: {v.motorNumber}</p>
                        <p>Battery: {v.batterySerial}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Service Milestones */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-slate-700" />
                  Free & Paid Service History
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-2.5">Job Card</th>
                        <th className="p-2.5">Service Type</th>
                        <th className="p-2.5">Due / Done Date</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {services.filter(s => s.customerId === selectedCustomer.id).map(srv => (
                        <tr key={srv.id}>
                          <td className="p-2.5 font-mono font-bold text-slate-800">{srv.jobCardNumber}</td>
                          <td className="p-2.5">{srv.isFree ? `Free Service #${srv.serviceNumber}` : 'Paid Service'}</td>
                          <td className="p-2.5">{formatDate(srv.completedDate || srv.dueDate)}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {srv.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedServiceForJobCard(srv);
                              }}
                              className="text-amber-700 font-bold hover:underline"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Linked EMI Schedules */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  EMI & Finance Plans
                </h3>
                <div className="space-y-3">
                  {emiSchedules.filter(e => e.customerId === selectedCustomer.id).map(emi => (
                    <div key={emi.id} className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/20">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{emi.financeCompanyName || 'Showroom Direct'}</p>
                          <p className="text-[11px] text-slate-500 font-mono">Loan Ref: {emi.loanAccountNo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500 text-[11px]">Outstanding Balance</p>
                          <p className="font-mono font-bold text-rose-700">{formatCurrency(emi.outstandingBalance)}</p>
                        </div>
                      </div>
                      <div className="mt-3 divide-y divide-purple-100 border-t border-purple-100">
                        {emi.installments.map(inst => (
                          <div key={inst.installmentNo} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[11px]">
                            <span>#{inst.installmentNo} · Due {formatDate(inst.dueDate)} · {inst.status}</span>
                            <span className="font-mono">{formatCurrency(inst.paidAmount || 0)} / {formatCurrency(inst.amount)}</span>
                            <span className="text-slate-500">{inst.payments?.map(payment => `${formatDate(payment.paymentDate)} · ${payment.paymentMethod} · ${payment.receiptNumber}`).join(', ') || inst.receiptNumber || 'No payments'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" /> Warranty Information
                </h3>
                <div className="space-y-2">
                  {warrantyInsurance.filter(item => item.customerId === selectedCustomer.id).map(item => (
                    <div key={item.id} className="grid grid-cols-1 gap-2 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 sm:grid-cols-4">
                      <p className="font-semibold">{item.policyType}<span className="block text-[10px] font-normal text-slate-500">{item.vehicleModel || item.chassisVin}</span></p>
                      <p>Provider<strong className="block">{item.providerName || '—'}</strong></p>
                      <p>Coverage<strong className="block">{formatDate(item.startDate)} – {formatDate(item.endDate)}</strong></p>
                      <p>Status<strong className="block">{item.status}</strong></p>
                    </div>
                  ))}
                  {!warrantyInsurance.some(item => item.customerId === selectedCustomer.id) && <p className="text-xs text-slate-500">No warranty record found.</p>}
                </div>
              </div>

              {/* Notes */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                <span className="font-bold text-slate-800 text-[11px] block mb-1">Dealership Notes:</span>
                <p className="italic">{selectedCustomer.notes || 'No special notes recorded.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{actionError}</p>}

      {isAddCustomerOpen && (
        <CustomerSaleForm
          onClose={() => setIsAddCustomerOpen(false)}
          onSaved={invoiceNumber => {
            void syncFromMongoDB();
            setSaleSuccess(invoiceNumber);
            setIsAddCustomerOpen(false);
          }}
        />
      )}

      {editingCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={saveCustomerEdit} className="my-4 w-full max-w-2xl space-y-4 rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div><h2 className="font-bold text-slate-900">Edit Customer</h2><p className="text-xs text-slate-500">{editingCustomer.customerCode}</p></div>
              <button type="button" aria-label="Close" onClick={() => setEditingCustomer(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Name<input required className="mt-1 w-full rounded-xl border border-slate-200 p-2.5" value={editForm.name} onChange={event => setEditForm({ ...editForm, name: event.target.value })} /></label>
              <label className="text-xs font-semibold text-slate-700">Phone<input required inputMode="tel" className="mt-1 w-full rounded-xl border border-slate-200 p-2.5" value={editForm.phone} onChange={event => setEditForm({ ...editForm, phone: event.target.value })} /></label>
              <label className="text-xs font-semibold text-slate-700">Email<input type="email" className="mt-1 w-full rounded-xl border border-slate-200 p-2.5" value={editForm.email} onChange={event => setEditForm({ ...editForm, email: event.target.value })} /></label>
              <label className="text-xs font-semibold text-slate-700">PAN<input maxLength={10} pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 uppercase" value={editForm.panNumber} onChange={event => setEditForm({ ...editForm, panNumber: event.target.value.toUpperCase() })} /></label>
              <label className="text-xs font-semibold text-slate-700">Current Address<textarea rows={2} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5" value={editForm.currentAddress} onChange={event => setEditForm({ ...editForm, currentAddress: event.target.value })} /></label>
              <label className="text-xs font-semibold text-slate-700">Permanent Address<textarea rows={2} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5" value={editForm.permanentAddress} onChange={event => setEditForm({ ...editForm, permanentAddress: event.target.value })} /></label>
            </div>
            {actionError && <p role="alert" className="text-xs text-rose-600">{actionError}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setEditingCustomer(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
