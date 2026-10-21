'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Customer } from '@/types/crm';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/storage';
import {
  Users,
  Plus,
  Search,
  Download,
  Phone,
  Mail,
  MapPin,
  Bike,
  Wrench,
  CreditCard,
  FileCheck,
  ExternalLink,
  Upload,
  Trash2,
  FileText,
  Paperclip,
  X
} from 'lucide-react';

export default function CustomersView() {
  const {
    customers,
    addCustomer,
    addCustomerDocument,
    removeCustomerDocument,
    vehicles,
    sales,
    services,
    emiSchedules,
    setSelectedSaleForInvoice,
    setSelectedServiceForJobCard
  } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Document upload state
  const [docType, setDocType] = useState<'Aadhaar' | 'PAN' | 'DrivingLicense' | 'ElectricityBill' | 'Photo' | 'Other'>('Aadhaar');
  const [docTitle, setDocTitle] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;

  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'New Delhi',
    pincode: '110025',
    aadhaarNumber: '',
    panNumber: '',
    notes: '',
    communicationPreference: 'WhatsApp' as Customer['communicationPreference']
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name || !newCustomerForm.phone) return;

    addCustomer({
      ...newCustomerForm,
      documents: [],
      vehicleIds: []
    });

    setIsAddCustomerOpen(false);
    setNewCustomerForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: 'New Delhi',
      pincode: '110025',
      aadhaarNumber: '',
      panNumber: '',
      notes: '',
      communicationPreference: 'WhatsApp'
    });
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
            onClick={() => exportToCSV(customers, 'Showroom_Customers_Directory')}
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
            placeholder="Search by customer name, phone number, customer code, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">City & Address</th>
                <th className="p-3.5">EVs Owned</th>
                <th className="p-3.5">Documents Status</th>
                <th className="p-3.5 text-center">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => {
                  const ownedVehicles = vehicles.filter(v => c.vehicleIds.includes(v.id));

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{c.customerCode}</div>
                      </td>
                      <td className="p-3.5 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Phone className="h-3 w-3 text-emerald-600" />
                          <span>{c.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800">{c.city}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{c.address}</p>
                      </td>
                      <td className="p-3.5">
                        {ownedVehicles.length > 0 ? (
                          <div className="space-y-1">
                            {ownedVehicles.map(ov => (
                              <div key={ov.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium mr-1">
                                <Bike className="h-3 w-3 text-amber-600" />
                                <span>{ov.brand} {ov.model}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No vehicle purchased yet</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <FileCheck className="h-3 w-3" />
                          {c.documents.filter(d => d.status === 'Verified').length} / {c.documents.length} Verified
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50 font-bold transition text-xs"
                        >
                          View Profile & Docs
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
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
                  <p className="text-slate-700 mt-0.5">PAN: <strong className="font-mono">{selectedCustomer.panNumber || 'Not provided'}</strong></p>
                  <p className="text-slate-700">Aadhaar: <strong className="font-mono">{selectedCustomer.aadhaarNumber || 'Not provided'}</strong></p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Address</span>
                  <p className="text-slate-700 mt-0.5 leading-snug">{selectedCustomer.address || 'Showroom record'}</p>
                </div>
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
                    </div>
                  ))}
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

      {/* Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add New Customer Profile</h2>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="+91 98XXX XXXXX"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="name@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Aadhaar (Last 4 / Full)</label>
                  <input
                    type="text"
                    value={newCustomerForm.aadhaarNumber}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, aadhaarNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="XXXX-XXXX-9901"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    value={newCustomerForm.panNumber}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, panNumber: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Address & City</label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Street / Flat / Area"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Preferences / Notes</label>
                <textarea
                  rows={2}
                  value={newCustomerForm.notes}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Prefers fast charger installation at residence."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Create Customer Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
