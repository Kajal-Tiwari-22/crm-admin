'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { ServiceRecord, ServiceStatus, ServicePartUsed } from '@/types/crm';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/storage';
import {
  Wrench,
  Plus,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  FileText,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';

export default function ServicesView() {
  const {
    services,
    vehicles,
    customers,
    spareParts,
    completeJobCard,
    scheduleService,
    setSelectedServiceForJobCard
  } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('All');

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [completingService, setCompletingService] = useState<ServiceRecord | null>(null);

  // Completion Form State
  const [odometerReading, setOdometerReading] = useState<number>(1250);
  const [technicianName, setTechnicianName] = useState<string>('Rahul Verma');
  const [workDone, setWorkDone] = useState<string>('BMS diagnostics run; front & rear brake calipers cleaned, tyre pressure adjusted to 32 psi.');
  const [labourCharge, setLabourCharge] = useState<number>(0);
  const [selectedParts, setSelectedParts] = useState<{ partId: string; quantity: number; isCovered: boolean }[]>([]);
  const [checklist, setChecklist] = useState({
    batteryHealthCheck: true,
    brakePadsAndFluid: true,
    tyrePressureAndTread: true,
    electricalWiringHarness: true,
    lightingAndHorn: true,
    suspensionAndSteering: true,
    bmsSoftwareUpdate: true
  });

  // Schedule Service Form State
  const [scheduleForm, setScheduleForm] = useState({
    customerId: customers[0]?.id || '',
    vehicleId: vehicles[0]?.id || '',
    serviceNumber: 1 as 1 | 2 | 3 | 'Paid',
    isFree: true,
    dueDate: new Date().toISOString().slice(0, 10),
    dueKm: 1000,
    customerComplaints: 'General scheduled checkup'
  });

  const filteredServices = services.filter(s => {
    const cust = customers.find(c => c.id === s.customerId);
    const veh = vehicles.find(v => v.id === s.vehicleId);

    const matchesSearch =
      s.jobCardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cust && cust.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (veh && veh.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (veh && veh.chassisVin.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All' ? true :
      statusFilter === 'ActionRequired' ? (s.status === 'Due' || s.status === 'Overdue') :
      s.status === statusFilter;

    const matchesMilestone =
      milestoneFilter === 'All' ? true :
      milestoneFilter === 'Free' ? s.isFree :
      milestoneFilter === 'Paid' ? !s.isFree :
      String(s.serviceNumber) === milestoneFilter;

    return matchesSearch && matchesStatus && matchesMilestone;
  });

  const handleOpenCompleteModal = (srv: ServiceRecord) => {
    setCompletingService(srv);
    setLabourCharge(srv.isFree ? 0 : 450);
    setOdometerReading(srv.dueKm || 1000);
    setSelectedParts([]);
  };

  const handleAddPartToCompletion = (partId: string) => {
    const part = spareParts.find(p => p.id === partId);
    if (!part) return;
    if (selectedParts.some(p => p.partId === partId)) return;

    setSelectedParts([...selectedParts, { partId, quantity: 1, isCovered: completingService?.isFree || false }]);
  };

  const handleRemovePartFromCompletion = (partId: string) => {
    setSelectedParts(selectedParts.filter(p => p.partId !== partId));
  };

  const handleFinalizeJobCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingService) return;

    const partsReplaced: ServicePartUsed[] = selectedParts.map(sp => {
      const part = spareParts.find(p => p.id === sp.partId)!;
      return {
        partId: sp.partId,
        partName: part.name,
        quantity: sp.quantity,
        unitPrice: part.sellingPrice,
        totalPrice: part.sellingPrice * sp.quantity,
        isCoveredUnderFreeService: sp.isCovered
      };
    });

    const partsCharge = partsReplaced.reduce((acc, p) => p.isCoveredUnderFreeService ? acc : acc + p.totalPrice, 0);
    const taxAmount = Math.round(((labourCharge + partsCharge) * 18) / 100);
    const totalCustomerPayable = labourCharge + partsCharge + taxAmount;

    completeJobCard(completingService.id, {
      odometerReading,
      technicianName,
      workDone,
      partsReplaced,
      labourCharge,
      partsCharge,
      taxAmount,
      totalCustomerPayable,
      inspectionChecklist: checklist
    });

    setCompletingService(null);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scheduleService({
      ...scheduleForm,
      status: 'Upcoming',
      scheduledDate: scheduleForm.dueDate,
      inspectionChecklist: {
        batteryHealthCheck: false,
        brakePadsAndFluid: false,
        tyrePressureAndTread: false,
        electricalWiringHarness: false,
        lightingAndHorn: false,
        suspensionAndSteering: false,
        bmsSoftwareUpdate: false
      },
      partsReplaced: [],
      labourCharge: 0,
      partsCharge: 0,
      taxAmount: 0,
      totalCustomerPayable: 0
    });
    setIsScheduleModalOpen(false);
  };

  const statusBadge = (st: ServiceStatus) => {
    switch (st) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Due':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Overdue':
        return 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse';
      case 'Upcoming':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'In Progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Missed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-amber-600" />
            Free & Paid Service Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track 3 Free Service milestones, periodic date/km intervals, EV battery health, job cards & cash receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(services, 'Service_Job_Cards_Report')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Book Service Slot
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Job Card #, Customer, VIN, Model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          <button
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({services.length})
          </button>
          <button
            onClick={() => setStatusFilter('ActionRequired')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'ActionRequired' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Due & Overdue
          </button>
          <button
            onClick={() => setStatusFilter('Completed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'Completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter('Upcoming')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'Upcoming' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800'
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Job Card</th>
                <th className="p-3.5">Customer & Contact</th>
                <th className="p-3.5">Vehicle</th>
                <th className="p-3.5">Milestone</th>
                <th className="p-3.5">Due Date & Km</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Customer Bill</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.length > 0 ? (
                filteredServices.map((srv) => {
                  const cust = customers.find(c => c.id === srv.customerId);
                  const veh = vehicles.find(v => v.id === srv.vehicleId);

                  return (
                    <tr key={srv.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {srv.jobCardNumber}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{cust?.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{cust?.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{veh?.brand} {veh?.model}</div>
                        <div className="text-[10px] font-mono text-slate-400">{veh?.chassisVin}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                          srv.isFree ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {srv.isFree ? `Free Service #${srv.serviceNumber}` : 'Paid Service'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{formatDate(srv.dueDate)}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{srv.dueKm} km threshold</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(srv.status)}`}>
                          {srv.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(srv.totalCustomerPayable)}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {srv.status !== 'Completed' ? (
                            <button
                              onClick={() => handleOpenCompleteModal(srv)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] shadow-2xs transition"
                            >
                              Work & Bill
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedServiceForJobCard(srv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition text-[11px]"
                            >
                              <Printer className="h-3 w-3 text-amber-600" />
                              <span>Job Card</span>
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
                    No service records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Job Card & Billing Modal */}
      {completingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl p-6 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Service Bay: Complete Job Card #{completingService.jobCardNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {completingService.isFree ? `Free Service Milestone #${completingService.serviceNumber}` : 'Paid Service'}
                </p>
              </div>
              <button
                onClick={() => setCompletingService(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFinalizeJobCard} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Odometer Reading (km) *</label>
                  <input
                    type="number"
                    required
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assigned EV Technician *</label>
                  <input
                    type="text"
                    required
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Complaints</label>
                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 italic">
                  "{completingService.customerComplaints}"
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Work Carried Out & Fixes *</label>
                <textarea
                  rows={2}
                  required
                  value={workDone}
                  onChange={(e) => setWorkDone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Details of servicing performed..."
                />
              </div>

              {/* Multi-point checklist */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 text-[11px] uppercase block">
                  EV Multi-Point Inspection Checklist
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(checklist).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                        className="rounded text-amber-600"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Spare Parts Replacement */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-950 text-[11px] uppercase">Spare Parts & Consumables</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddPartToCompletion(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="p-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                  >
                    <option value="">+ Add Part from Stock...</option>
                    {spareParts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.sellingPrice)}) - {p.currentStock} left</option>
                    ))}
                  </select>
                </div>

                {selectedParts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedParts.map((sp) => {
                      const part = spareParts.find(p => p.id === sp.partId)!;
                      return (
                        <div key={sp.partId} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                          <div>
                            <p className="font-bold text-slate-800">{part.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{formatCurrency(part.sellingPrice)} each</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sp.isCovered}
                                onChange={(e) => {
                                  setSelectedParts(selectedParts.map(item =>
                                    item.partId === sp.partId ? { ...item, isCovered: e.target.checked } : item
                                  ));
                                }}
                                className="rounded text-emerald-600"
                              />
                              <span>Warranty Free</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemovePartFromCompletion(sp.partId)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No spare parts replaced for this service.</p>
                )}
              </div>

              {/* Labour */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Labour Charges (₹)</label>
                  <input
                    type="number"
                    value={labourCharge}
                    onChange={(e) => setLabourCharge(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                  {completingService.isFree && (
                    <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">Free Service: Recommended ₹0 Labour</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompletingService(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                >
                  Finalize Service & Generate Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book / Schedule Service Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Schedule Service Appointment</h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer</label>
                <select
                  value={scheduleForm.customerId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, customerId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vehicle</label>
                <select
                  value={scheduleForm.vehicleId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, vehicleId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.chassisVin})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Service Type</label>
                  <select
                    value={scheduleForm.serviceNumber}
                    onChange={(e) => setScheduleForm({
                      ...scheduleForm,
                      serviceNumber: e.target.value === 'Paid' ? 'Paid' : Number(e.target.value) as 1 | 2 | 3,
                      isFree: e.target.value !== 'Paid'
                    })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value={1}>1st Free Service</option>
                    <option value={2}>2nd Free Service</option>
                    <option value={3}>3rd Free Service</option>
                    <option value="Paid">Paid Periodic Service</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Appointment / Due Date</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.dueDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, dueDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reported Issue / Complaints</label>
                <textarea
                  rows={2}
                  value={scheduleForm.customerComplaints}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, customerComplaints: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Brake noise, periodic general inspection"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  Schedule Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
