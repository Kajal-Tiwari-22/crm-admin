'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { ServiceRecord, ServicePartUsed } from '@/types/crm';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/storage';
import {
  Wrench,
  Plus,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  X,
  FileText,
  ShieldCheck,
  CheckSquare,
  Square,
  Eye,
  Pencil,
  CalendarDays
} from 'lucide-react';

export default function ServicesView() {
  const {
    services,
    vehicles,
    customers,
    spareParts,
    completeJobCard,
    scheduleService,
    setSelectedServiceForJobCard,
    syncFromMongoDB
  } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('All');
  const [serviceError, setServiceError] = useState('');
  const [savingService, setSavingService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [editForm, setEditForm] = useState({ dueDate: '', dueKm: '', customerComplaints: '' });
  const serviceLoadPromise = useRef<Promise<void> | null>(null);

  // Local override state to make Free-Service milestone chips clickable (toggle Pending ↔ Done)
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, 'Pending' | 'Done'>>({});

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [completingService, setCompletingService] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    if (!serviceLoadPromise.current) {
      serviceLoadPromise.current = (async () => {
        const response = await fetch('/api/services', {
          credentials: 'include'
        });
        const result = await response.json();
        if (!response.ok || (result && !Array.isArray(result) && !result.success)) {
          throw new Error(result.message || 'Could not load service schedule.');
        }
        const refreshResult = await syncFromMongoDB();
        if (!refreshResult.success) throw new Error(refreshResult.message);
      })().catch(reason => {
        setServiceError(reason instanceof Error ? reason.message : 'Could not load service schedule.');
      });
    }
  }, [syncFromMongoDB]);

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

    const status = serviceStatus(s);
    const matchesStatus = statusFilter === 'All' ||
      (statusFilter === 'ActionRequired' ? status !== 'Done' : status === statusFilter);

    const matchesMilestone =
      milestoneFilter === 'All' ? true :
      milestoneFilter === 'Free' ? s.isFree :
      milestoneFilter === 'Paid' ? !s.isFree :
      String(s.serviceNumber) === milestoneFilter;

    return matchesSearch && matchesStatus && matchesMilestone;
  }).sort((left, right) =>
    left.dueDate.localeCompare(right.dueDate) ||
    String(left.serviceNumber).localeCompare(String(right.serviceNumber))
  );

  function serviceStatus(service: ServiceRecord) {
    if (service.status === 'Completed') return 'Done';
    if (service.dueDate < new Date().toISOString().slice(0, 10)) return 'Overdue';
    return 'Pending';
  }

  // ── Helper: get toggle-able status (Done / Pending) ────────────────────
  function getToggleStatus(svc: ServiceRecord | undefined): 'Pending' | 'Done' | 'Not Scheduled' {
    if (!svc) return 'Not Scheduled';
    const base = serviceStatus(svc);
    if (base === 'Overdue') return localStatusOverrides[svc.id] || 'Pending';
    return localStatusOverrides[svc.id] || (base as 'Pending' | 'Done');
  }

  // ── Helper: toggle handler (Pending ↔ Done on click) ───────────────────
  const handleToggleServiceStatus = (svc: ServiceRecord | undefined) => {
    if (!svc) return;
    const current = localStatusOverrides[svc.id] || serviceStatus(svc);
    const next: 'Pending' | 'Done' = current === 'Done' ? 'Pending' : 'Done';
    setLocalStatusOverrides(prev => ({ ...prev, [svc.id]: next }));
    if (next === 'Done' && svc.status !== 'Completed') {
      markServiceDone(svc);
    }
  };

  // ── Per-customer free service lookup (Free #1 / #2 / #3) ───────────────
  const customerFreeServicesMap: Record<string, Record<1 | 2 | 3, ServiceRecord | undefined>> = {};
  customers.forEach(cust => {
    const freeSrv = services.filter(s => s.customerId === cust.id && s.isFree);
    customerFreeServicesMap[cust.id] = {
      1: freeSrv.find(s => s.serviceNumber === 1),
      2: freeSrv.find(s => s.serviceNumber === 2),
      3: freeSrv.find(s => s.serviceNumber === 3),
    };
  });

  const saveServiceEdits = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingService) return;
    setSavingService(true);
    setServiceError('');
    try {
      const response = await fetch(`/api/services/${editingService.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueDate: editForm.dueDate,
          dueKm: Number(editForm.dueKm),
          customerComplaints: editForm.customerComplaints
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not update service.');
      const refreshResult = await syncFromMongoDB();
      if (!refreshResult.success) throw new Error(refreshResult.message);
      setEditingService(null);
    } catch (reason) {
      setServiceError(reason instanceof Error ? reason.message : 'Could not update service.');
    } finally {
      setSavingService(false);
    }
  };

  const markServiceDone = async (service: ServiceRecord) => {
    setSavingService(true);
    setServiceError('');
    try {
      const response = await fetch(`/api/services/${service.id}/mark-done`, {
        method: 'PATCH',
        credentials: 'include'
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not mark service done.');
      const refreshResult = await syncFromMongoDB();
      if (!refreshResult.success) throw new Error(refreshResult.message);
    } catch (reason) {
      setServiceError(reason instanceof Error ? reason.message : 'Could not mark service done.');
    } finally {
      setSavingService(false);
    }
  };

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

  // ── Reusable chip renderer for the 3 new table columns ────────────────
  const renderFreeServiceChip = (svc: ServiceRecord | undefined, num: 1 | 2 | 3) => {
    const status = getToggleStatus(svc);
    const isDone = status === 'Done';
    const isMissing = status === 'Not Scheduled';
    return (
      <button
        type="button"
        onClick={() => handleToggleServiceStatus(svc)}
        disabled={isMissing || savingService}
        title={isMissing ? `Free Service #${num} not scheduled` : `Click to toggle — currently ${status}`}
        className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold border transition ${
          isMissing
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isDone
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
              : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
        }`}
      >
        {isDone ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : isMissing ? (
          <X className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )}
        <span>{isMissing ? 'N/A' : status}</span>
      </button>
    );
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
            onClick={() => setStatusFilter('Done')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'Done' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            Done
          </button>
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'Pending' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('Overdue')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'Overdue' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-800'
            }`}
          >
            Overdue
          </button>
        </div>
      </div>

      {serviceError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{serviceError}</span>
          <button type="button" onClick={() => setServiceError('')} className="font-bold">Dismiss</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Quick per-customer 3 Free Service Milestones overview
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            3 Free Service Milestones — Per Customer
          </h2>
          <p className="text-[10px] sm:text-[11px] text-slate-500">
            Tap any chip to toggle <span className="font-semibold text-emerald-700">Done</span> / <span className="font-semibold text-amber-700">Pending</span>
          </p>
        </div>

        <div className="space-y-2.5">
          {customers.map(cust => {
            const custVehicles = vehicles.filter(
              v => cust.vehicleIds.includes(v.id) || v.assignedCustomerId === cust.id
            );
            if (!custVehicles.length) return null;
            const veh = custVehicles[0];
            const freeSrv = customerFreeServicesMap[cust.id] || { 1: undefined, 2: undefined, 3: undefined };

            return (
              <div key={cust.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                <div className="mb-2 min-w-0">
                  <p className="font-bold text-slate-900 text-xs truncate">{cust.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    {veh.modelNumber || veh.model} · {veh.chassisVin}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map(num => {
                    const svc = freeSrv[num];
                    const status = getToggleStatus(svc);
                    const isDone = status === 'Done';
                    const isMissing = status === 'Not Scheduled';
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleToggleServiceStatus(svc)}
                        disabled={isMissing}
                        className={`group relative text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                          isMissing
                            ? 'bg-slate-50 border-dashed border-slate-200 cursor-not-allowed opacity-70'
                            : isDone
                              ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-500 hover:shadow-md'
                              : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Free #{num}
                          </span>
                          <span
                            className={`h-5 w-5 rounded-md flex items-center justify-center ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isMissing
                                  ? 'bg-slate-200 text-slate-400'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          </span>
                        </div>
                        <p
                          className={`text-sm font-bold ${
                            isMissing ? 'text-slate-400' : isDone ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {isMissing ? 'Not Scheduled' : status}
                        </p>
                        {svc ? (
                          <p className="text-[10px] text-slate-500 mt-0.5">Due: {formatDate(svc.dueDate)}</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">No record yet</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Services Table — with 3 new Free Service columns added
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-300 uppercase tracking-wider text-[10px]">
                <th className="border border-slate-300 px-3 py-3">Customer Name</th>
                <th className="border border-slate-300 px-3 py-3">Scooty Model</th>
                <th className="border border-slate-300 px-3 py-3">Chassis Number</th>
                <th className="border border-slate-300 px-3 py-3">Service Due Date</th>
                <th className="border border-slate-300 px-3 py-3">Service Type</th>
                {/* ── 3 NEW COLUMNS: Free Service Milestones ── */}
                <th className="border border-slate-300 px-2 py-3 text-center">Free #1</th>
                <th className="border border-slate-300 px-2 py-3 text-center">Free #2</th>
                <th className="border border-slate-300 px-2 py-3 text-center">Free #3</th>
                {/* ── Existing columns continue ── */}
                <th className="border border-slate-300 px-3 py-3 text-center">Status</th>
                <th className="border border-slate-300 px-3 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length > 0 ? (
                filteredServices.map((srv, rowIndex) => {
                  const cust = customers.find(c => c.id === srv.customerId);
                  const veh = vehicles.find(v => v.id === srv.vehicleId);
                  const currentStatus = serviceStatus(srv);
                  const custFreeSrv = customerFreeServicesMap[srv.customerId] || { 1: undefined, 2: undefined, 3: undefined };

                  return (
                    <tr key={srv.id} className={`${rowIndex % 2 ? 'bg-slate-50/60' : 'bg-white'} hover:bg-amber-50/60`}>
                      <td className="border border-slate-200 px-3 py-3 font-semibold text-slate-900">{cust?.name || 'Customer record unavailable'}</td>
                      <td className="border border-slate-200 px-3 py-3 font-semibold text-slate-900">{veh?.modelNumber || veh?.model || 'Scooter unavailable'}</td>
                      <td className="border border-slate-200 px-3 py-3 font-mono text-slate-700">{veh?.chassisVin || '—'}</td>
                      <td className="border border-slate-200 px-3 py-3 whitespace-nowrap text-slate-800">{formatDate(srv.dueDate)}</td>
                      <td className="border border-slate-200 px-3 py-3">
                        <span className={`inline-block rounded border px-2 py-1 font-bold text-[10px] ${
                          srv.isFree ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {srv.isFree ? `Free Service #${srv.serviceNumber}` : 'Paid Service'}
                        </span>
                        <span className="ml-2 text-slate-500">{srv.jobCardNumber}</span>
                      </td>

                      {/* ── 3 NEW COLUMNS: Free #1, #2, #3 toggle chips ── */}
                      <td className="border border-slate-200 px-2 py-2 text-center">
                        {renderFreeServiceChip(custFreeSrv[1], 1)}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-center">
                        {renderFreeServiceChip(custFreeSrv[2], 2)}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-center">
                        {renderFreeServiceChip(custFreeSrv[3], 3)}
                      </td>

                      <td className="border border-slate-200 px-3 py-3 text-center">
                        <span className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          currentStatus === 'Done'
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                            : currentStatus === 'Overdue'
                              ? 'border-rose-200 bg-rose-100 text-rose-800'
                              : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        <div className="flex min-w-[280px] flex-wrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedServiceForJobCard(srv)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          {srv.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingService(srv);
                                setEditForm({
                                  dueDate: srv.dueDate,
                                  dueKm: String(srv.dueKm),
                                  customerComplaints: srv.customerComplaints || ''
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 font-semibold text-blue-800 hover:bg-blue-100"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                          )}
                          {srv.status !== 'Completed' && (
                            <button
                              type="button"
                              disabled={savingService}
                              onClick={() => markServiceDone(srv)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Done
                            </button>
                          )}
                          {srv.status !== 'Completed' ? (
                            <button
                              onClick={() => handleOpenCompleteModal(srv)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1.5 font-bold text-slate-950 hover:bg-amber-600"
                            >
                              <Wrench className="h-3.5 w-3.5" /> Work & Bill
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 font-semibold text-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Done
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="border border-slate-200 p-8 text-center text-slate-400">
                    No service records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="my-4 w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <CalendarDays className="h-4 w-4 text-blue-600" /> Edit Service Schedule
                </h2>
                <p className="mt-1 text-xs text-slate-500">{editingService.jobCardNumber} · {editingService.isFree ? `Free Service ${editingService.serviceNumber}` : 'Paid Service'}</p>
              </div>
              <button type="button" onClick={() => setEditingService(null)} aria-label="Close edit service" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveServiceEdits} className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Service due date
                <input
                  type="date"
                  required
                  value={editForm.dueDate}
                  onChange={event => setEditForm(previous => ({ ...previous, dueDate: event.target.value }))}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Due at (km)
                <input
                  type="number"
                  min="0"
                  required
                  value={editForm.dueKm}
                  onChange={event => setEditForm(previous => ({ ...previous, dueKm: event.target.value }))}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Service notes / customer complaint
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={editForm.customerComplaints}
                  onChange={event => setEditForm(previous => ({ ...previous, customerComplaints: event.target.value }))}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setEditingService(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={savingService} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {savingService ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  &quot;{completingService.customerComplaints}&quot;
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