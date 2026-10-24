'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useCRM } from '@/context/CRMContext';
import { InventoryBatch, InventoryUnit, Vehicle } from '@/types/crm';
import { formatCurrency, formatDate } from '@/lib/storage';
import {
  Bike, Plus, Search, Download, X, Eye, Edit2, Trash2,
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
  Package, Zap, Filter, RefreshCw, Archive, PlusCircle,
  Hash, Calendar, IndianRupee, Lightbulb, Factory, Battery,
  ClipboardList, Tag, Layers
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type ModalMode = 'add' | 'edit' | 'view' | 'addUnits' | null;

interface UnitRow {
  chassisNumber: string;
  batterySerial: string;
  color: string;
  motorNumber: string;
}

interface BatchFormData {
  modelNumber: string;
  lightType: 'Single Light' | 'Double Light';
  companyName: string;
  batteryCompanyName: string;
  hsnCode: string;
  purchaseDate: string;
  purchaseCostPerUnit: string;
  quantity: string;
  invoiceNumber: string;
  supplierName: string;
  batteryWarrantyMonths: string;
  stockNotes: string;
  units: UnitRow[];
}

interface FieldError { [key: string]: string }

// ─── Color presets for quick-pick ─────────────────────────────────────────
const COLOR_PRESETS = ['White', 'Black', 'Red', 'Blue', 'Grey', 'Silver'];

const DISPATCH_MODELS: Record<string, string[]> = {
  'E-Scoot 207': ['White', 'Black'],
  'E-Scoot 504': ['White', 'Black', 'Red', 'Blue', 'Grey', 'Silver'],
  'E-Star Dx': ['Black', 'Grey', 'Silver', 'Red', 'White'],
  'E-Mate 306': ['Blue'],
  'E-Zap': ['Black', 'White', 'Grey', 'Silver', 'Red', 'Blue'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function emptyUnit(): UnitRow { return { chassisNumber: '', batterySerial: '', color: '', motorNumber: '' }; }

function defaultForm(): BatchFormData {
  return {
    modelNumber: '',
    lightType: 'Single Light',
    companyName: '',
    batteryCompanyName: '',
    hsnCode: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseCostPerUnit: '',
    quantity: '1',
    invoiceNumber: '',
    supplierName: '',
    batteryWarrantyMonths: '36',
    stockNotes: '',
    units: [emptyUnit()]
  };
}

function parsedQty(s: string): number { const n = parseInt(s, 10); return isNaN(n) ? 0 : n; }

function statusBadge(status: string) {
  switch (status) {
    case 'Active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Out of Stock': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'Archived': return 'bg-amber-100 text-amber-800 border-amber-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

// ─── Toast Notification ───────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-start gap-3 max-w-sm p-4 rounded-2xl shadow-xl border backdrop-blur-sm transition-all
      ${type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : 'bg-rose-50/95 border-rose-200 text-rose-800'}`}>
      {type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
      <p className="text-sm font-medium leading-snug flex-1">{msg}</p>
      <button onClick={onClose} className="shrink-0 hover:opacity-70 mt-0.5"><X className="h-4 w-4" /></button>
    </div>
  );
}

// ─── Field with error display ───────────────────────────────────────────────
function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
    </div>
  );
}

const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200 transition';
const inputErr = 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200';

// ─── Units Table inside Add Form ──────────────────────────────────────────
function UnitsTable({ units, setUnits, qty, modelNumber }: {
  units: UnitRow[];
  setUnits: (u: UnitRow[]) => void;
  qty: number;
  modelNumber: string;
}) {
  const colors = DISPATCH_MODELS[modelNumber] || COLOR_PRESETS;

  const updateUnit = (i: number, field: keyof UnitRow, val: string) => {
    const copy = [...units];
    copy[i] = { ...copy[i], [field]: val };
    setUnits(copy);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-amber-500" />
          Individual Unit Details <span className="font-normal text-slate-500">({units.length} of {qty} units)</span>
        </p>
        <p className="text-[10px] text-slate-400">Leave blank if chassis not yet assigned</p>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[32px_1fr_1fr_1fr_1fr] bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div className="p-2 text-center">#</div>
          <div className="p-2">Chassis No.</div>
          <div className="p-2">Battery Serial</div>
          <div className="p-2">Color</div>
          <div className="p-2">Motor No.</div>
        </div>
        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {units.map((u, i) => (
            <div key={i} className="grid grid-cols-[32px_1fr_1fr_1fr_1fr] items-center bg-white">
              <div className="p-2 text-center text-[10px] font-mono text-slate-400">{i + 1}</div>
              <div className="p-1">
                <input
                  type="text"
                  value={u.chassisNumber}
                  onChange={e => updateUnit(i, 'chassisNumber', e.target.value.toUpperCase())}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono placeholder-slate-300 focus:outline-none focus:border-amber-400 uppercase"
                  placeholder="Chassis / VIN"
                />
              </div>
              <div className="p-1">
                <input
                  type="text"
                  value={u.batterySerial}
                  onChange={e => updateUnit(i, 'batterySerial', e.target.value.toUpperCase())}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono placeholder-slate-300 focus:outline-none focus:border-amber-400 uppercase"
                  placeholder="Battery Serial"
                />
              </div>
              <div className="p-1">
                <select
                  value={u.color}
                  onChange={e => updateUnit(i, 'color', e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:border-amber-400"
                >
                  <option value="">Pick color</option>
                  {colors.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__other__">Other…</option>
                </select>
              </div>
              <div className="p-1">
                <input
                  type="text"
                  value={u.motorNumber}
                  onChange={e => updateUnit(i, 'motorNumber', e.target.value.toUpperCase())}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono placeholder-slate-300 focus:outline-none focus:border-amber-400 uppercase"
                  placeholder="Motor No. (opt)"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function InventoryView() {
  const { inventoryBatches, vehicles, addInventoryBatch, updateInventoryBatch, deleteInventoryBatch, addUnitsToInventoryBatch } = useCRM();

  // ── List state ────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCompany, setFilterCompany] = useState('All');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── Modal state ───────────────────────────────────────────────────────
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatch | null>(null);
  const [batchUnits, setBatchUnits] = useState<Vehicle[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // ── Form state ────────────────────────────────────────────────────────
  const [form, setForm] = useState<BatchFormData>(defaultForm());
  const [errors, setErrors] = useState<FieldError>({});
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Notifications ─────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error') => setToast({ msg, type }), []);

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  // ── Quantity sync: keep units array length in sync with qty field ──────
  useEffect(() => {
    if (modalMode === 'add' || modalMode === 'addUnits') {
      const n = parsedQty(form.quantity);
      if (n < 1) return;
      setForm(prev => {
        const cur = prev.units;
        if (cur.length === n) return prev;
        if (cur.length < n) {
          return { ...prev, units: [...cur, ...Array(n - cur.length).fill(null).map(emptyUnit)] };
        }
        return { ...prev, units: cur.slice(0, n) };
      });
    }
  }, [form.quantity, modalMode]);

  // ── Body scroll lock when any modal / dialog is open ──────────────────
  useEffect(() => {
    if (modalMode || deleteConfirmId) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [modalMode, deleteConfirmId]);

  // ── Fetch batch units for View modal ──────────────────────────────────
  const fetchBatchUnits = async (batchId: string) => {
    setLoadingUnits(true);
    try {
      const res = await fetch(`${BACKEND}/api/inventory-batches/${batchId}`);
      const json = await res.json();
      if (json.success) {
        setBatchUnits(json.data.units || []);
      }
    } catch {
      setBatchUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  // ── Open modal helpers ─────────────────────────────────────────────────
  const openAdd = () => {
    setForm(defaultForm());
    setErrors({});
    setModalMode('add');
  };

  const openView = (batch: InventoryBatch) => {
    setSelectedBatch(batch);
    setBatchUnits([]);
    fetchBatchUnits(batch.id);
    setModalMode('view');
  };

  const openEdit = (batch: InventoryBatch) => {
    setSelectedBatch(batch);
    setForm({
      modelNumber: batch.modelNumber,
      lightType: batch.lightType,
      companyName: batch.companyName,
      batteryCompanyName: batch.batteryCompanyName,
      hsnCode: batch.hsnCode,
      purchaseDate: batch.purchaseDate,
      purchaseCostPerUnit: String(batch.purchaseCostPerUnit),
      quantity: String(batch.quantity),
      invoiceNumber: batch.invoiceNumber,
      supplierName: batch.supplierName,
      batteryWarrantyMonths: String(batch.batteryWarrantyMonths || 36),
      stockNotes: batch.stockNotes,
      units: []
    });
    setErrors({});
    setModalMode('edit');
  };

  const openAddUnits = (batch: InventoryBatch) => {
    setSelectedBatch(batch);
    setForm({ ...defaultForm(), modelNumber: batch.modelNumber, companyName: batch.companyName, units: [emptyUnit()] });
    setErrors({});
    setModalMode('addUnits');
  };

  const closeModal = () => { setModalMode(null); setSelectedBatch(null); setErrors({}); };

  // ── Client-side validation ─────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: FieldError = {};
    if (!form.modelNumber.trim()) errs.modelNumber = 'Scooty model number is required.';
    if (!form.companyName.trim()) errs.companyName = 'Company name is required.';
    if (!form.purchaseDate) errs.purchaseDate = 'Purchase date is required.';
    const cost = parseFloat(form.purchaseCostPerUnit);
    if (isNaN(cost) || cost < 0) errs.purchaseCostPerUnit = 'Purchase cost must be ₹0 or more.';
    const qty = parsedQty(form.quantity);
    if (qty < 1 || !Number.isInteger(qty)) errs.quantity = 'Quantity must be a positive whole number.';
    if (modalMode !== 'edit') {
      // Check for duplicate chassis in same form submission
      const vins = form.units.map(u => u.chassisNumber.trim().toUpperCase()).filter(Boolean);
      const vinSet = new Set(vins);
      if (vinSet.size < vins.length) errs.units = 'Duplicate chassis numbers in this form.';
      const bsNos = form.units.map(u => u.batterySerial.trim().toUpperCase()).filter(Boolean);
      const bsSet = new Set(bsNos);
      if (bsSet.size < bsNos.length) errs.unitsBS = 'Duplicate battery serials in this form.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit add ─────────────────────────────────────────────────────────
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormLoading(true);
    const res = await addInventoryBatch({
      modelNumber: form.modelNumber.trim(),
      lightType: form.lightType,
      companyName: form.companyName.trim(),
      batteryCompanyName: form.batteryCompanyName.trim(),
      hsnCode: form.hsnCode.trim(),
      purchaseDate: form.purchaseDate,
      purchaseCostPerUnit: parseFloat(form.purchaseCostPerUnit),
      quantity: parsedQty(form.quantity),
      invoiceNumber: form.invoiceNumber.trim(),
      supplierName: form.supplierName.trim(),
      batteryWarrantyMonths: parseInt(form.batteryWarrantyMonths) || 36,
      stockNotes: form.stockNotes.trim(),
      units: form.units
    });
    setFormLoading(false);
    if (res.success) {
      showToast(`✅ ${res.message || 'Inventory batch added successfully!'}`, 'success');
      closeModal();
    } else {
      setErrors({ submit: res.message || 'Failed to add inventory.' });
    }
  };

  // ── Submit edit ────────────────────────────────────────────────────────
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    if (!form.modelNumber.trim() || !form.companyName.trim() || !form.purchaseDate) {
      setErrors({ submit: 'Model, company, and purchase date are required.' });
      return;
    }
    const cost = parseFloat(form.purchaseCostPerUnit);
    if (isNaN(cost) || cost < 0) { setErrors({ submit: 'Purchase cost must be ₹0 or more.' }); return; }
    setFormLoading(true);
    const res = await updateInventoryBatch(selectedBatch.id, {
      modelNumber: form.modelNumber.trim(),
      lightType: form.lightType,
      companyName: form.companyName.trim(),
      batteryCompanyName: form.batteryCompanyName.trim(),
      hsnCode: form.hsnCode.trim(),
      purchaseDate: form.purchaseDate,
      purchaseCostPerUnit: cost,
      invoiceNumber: form.invoiceNumber.trim(),
      supplierName: form.supplierName.trim(),
      batteryWarrantyMonths: parseInt(form.batteryWarrantyMonths) || 36,
      stockNotes: form.stockNotes.trim()
    });
    setFormLoading(false);
    if (res.success) {
      showToast('✅ Inventory batch updated successfully!', 'success');
      closeModal();
    } else {
      setErrors({ submit: res.message || 'Failed to update batch.' });
    }
  };

  // ── Submit add units ───────────────────────────────────────────────────
  const handleAddUnitsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    const validUnits = form.units.filter(u => u.chassisNumber.trim());
    if (!validUnits.length) { setErrors({ submit: 'Enter at least one chassis number.' }); return; }
    setFormLoading(true);
    const res = await addUnitsToInventoryBatch(selectedBatch.id, validUnits);
    setFormLoading(false);
    if (res.success) {
      showToast(`✅ ${res.message || 'Units added successfully!'}`, 'success');
      closeModal();
    } else {
      setErrors({ submit: res.message || 'Failed to add units.' });
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    const res = await deleteInventoryBatch(id);
    setDeleteLoading(false);
    setDeleteConfirmId(null);
    if (res.success) {
      showToast(res.archived ? '📦 Batch archived (sold units preserved).' : '🗑️ Batch deleted.', 'success');
    } else {
      showToast(res.message || 'Failed to delete batch.', 'error');
    }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!inventoryBatches.length) { showToast('No inventory data to export.', 'error'); return; }
    const headers = ['Batch Code', 'Model', 'Light Type', 'Company', 'Battery Co.', 'HSN Code', 'Purchase Date', 'Cost/Unit (₹)', 'Quantity', 'Available', 'Sold', 'Invoice No.', 'Supplier', 'Status'];
    const rows = inventoryBatches.map(b => [
      b.batchCode, b.modelNumber, b.lightType, b.companyName, b.batteryCompanyName,
      b.hsnCode, b.purchaseDate, b.purchaseCostPerUnit, b.quantity,
      b.availableQty, b.soldQty, b.invoiceNumber, b.supplierName, b.status
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `Inventory_Batches_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // ── Filtering / Pagination ─────────────────────────────────────────────
  const companies = Array.from(new Set(inventoryBatches.map(b => b.companyName).filter(Boolean)));

  const filtered = inventoryBatches.filter(b => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || [b.modelNumber, b.batchCode, b.companyName, b.hsnCode, b.invoiceNumber, b.supplierName]
      .some(s => (s || '').toLowerCase().includes(q));
    const matchStatus = filterStatus === 'All' || b.status === filterStatus;
    const matchCompany = filterCompany === 'All' || b.companyName === filterCompany;
    return matchSearch && matchStatus && matchCompany;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchTerm, filterStatus, filterCompany]);

  // ── KPI counts ─────────────────────────────────────────────────────────
  const totalQty = inventoryBatches.reduce((s, b) => s + (b.quantity || 0), 0);
  const totalAvail = inventoryBatches.reduce((s, b) => s + (b.availableQty || 0), 0);
  const totalSold = inventoryBatches.reduce((s, b) => s + (b.soldQty || 0), 0);
  const totalValue = inventoryBatches.reduce((s, b) => s + (b.purchaseCostPerUnit || 0) * (b.quantity || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bike className="h-6 w-6 text-amber-500" />
            Scooty Inventory Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Batch-level purchase tracking • Individual chassis & battery serial per unit • Real-time stock sync
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition">
            <Download className="h-3.5 w-3.5" />Export CSV
          </button>
          <button onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 text-xs font-bold shadow-md shadow-amber-500/25 transition">
            <Plus className="h-4 w-4" />Add Scooty to Inventory
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Purchased', value: totalQty, icon: Package, color: 'text-blue-600 bg-blue-50', border: 'border-blue-100' },
          { label: 'In Stock', value: totalAvail, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Units Sold', value: totalSold, icon: Zap, color: 'text-amber-600 bg-amber-50', border: 'border-amber-100' },
          { label: 'Total Purchase Value', value: formatCurrency(totalValue), icon: IndianRupee, color: 'text-violet-600 bg-violet-50', border: 'border-violet-100', isStr: true },
        ].map(({ label, value, icon: Icon, color, border, isStr }) => (
          <div key={label} className={`bg-white rounded-2xl border ${border} p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <span className={`h-8 w-8 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="text-xl font-black text-slate-900">{isStr ? value : value.toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>

      {/* ── Dispatch Reference ──────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
          <Tag className="h-4 w-4" />Available Models &amp; Colors (For Immediate Dispatch)
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(DISPATCH_MODELS).map(([model, colors]) => (
            <div key={model} className="bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="font-bold text-slate-900">{model}</span>
              <span className="text-slate-500 ml-1.5">{colors.join(', ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search & Filters ─────────────────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search model, batch code, company, HSN, invoice..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-amber-500">
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Archived">Archived</option>
          </select>
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-amber-500">
            <option value="All">All Companies</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <p className="text-xs text-slate-400 shrink-0">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* ── Inventory Table (Desktop) ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-3.5">Batch / Model</th>
                <th className="p-3.5">Light Type</th>
                <th className="p-3.5">Company</th>
                <th className="p-3.5">Battery Co.</th>
                <th className="p-3.5 text-center">Stock</th>
                <th className="p-3.5">HSN Code</th>
                <th className="p-3.5">Purchase Date</th>
                <th className="p-3.5 text-right">Cost/Unit</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length > 0 ? paginated.map(batch => (
                <tr key={batch.id} className="hover:bg-slate-50/60 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{batch.modelNumber}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{batch.batchCode}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="flex items-center gap-1">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-slate-700">{batch.lightType}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-800 font-medium">{batch.companyName}</td>
                  <td className="p-3.5 text-slate-600">{batch.batteryCompanyName || <span className="text-slate-300">—</span>}</td>
                  <td className="p-3.5 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-base font-black text-emerald-700">{batch.availableQty ?? batch.quantity}</span>
                      <span className="text-[10px] text-slate-400">of {batch.quantity} total</span>
                      {(batch.soldQty || 0) > 0 && <span className="text-[10px] text-amber-700 font-semibold">{batch.soldQty} sold</span>}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-700">{batch.hsnCode || <span className="text-slate-300">—</span>}</td>
                  <td className="p-3.5 text-slate-600">{formatDate(batch.purchaseDate)}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(batch.purchaseCostPerUnit)}</td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(batch.status)}`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openView(batch)} title="View Details"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openEdit(batch)} title="Edit Batch"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openAddUnits(batch)} title="Add More Stock"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition">
                        <PlusCircle className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(batch.id)} title="Delete / Archive"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="p-12 text-center">
                    <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium text-sm">No inventory batches found</p>
                    <p className="text-slate-300 text-xs mt-1">
                      {searchTerm || filterStatus !== 'All' ? 'Try adjusting your search or filters.' : 'Click "Add Scooty to Inventory" to get started.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Inventory Cards (Mobile) ──────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {paginated.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Package className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No inventory found</p>
          </div>
        )}
        {paginated.map(batch => (
          <div key={batch.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-900">{batch.modelNumber}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{batch.batchCode}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(batch.status)}`}>
                {batch.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-400">Company</span><p className="font-semibold text-slate-800 mt-0.5">{batch.companyName}</p></div>
              <div><span className="text-slate-400">Light Type</span><p className="font-semibold text-slate-800 mt-0.5">{batch.lightType}</p></div>
              <div><span className="text-slate-400">Stock</span><p className="font-bold text-emerald-700 mt-0.5">{batch.availableQty ?? batch.quantity} / {batch.quantity}</p></div>
              <div><span className="text-slate-400">Cost/Unit</span><p className="font-bold text-slate-900 mt-0.5">{formatCurrency(batch.purchaseCostPerUnit)}</p></div>
              <div><span className="text-slate-400">HSN Code</span><p className="font-mono text-slate-700 mt-0.5">{batch.hsnCode || '—'}</p></div>
              <div><span className="text-slate-400">Date</span><p className="text-slate-700 mt-0.5">{formatDate(batch.purchaseDate)}</p></div>
            </div>
            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <button onClick={() => openView(batch)} className="flex-1 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">View</button>
              <button onClick={() => openEdit(batch)} className="flex-1 py-1.5 text-xs font-semibold rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50">Edit</button>
              <button onClick={() => openAddUnits(batch)} className="flex-1 py-1.5 text-xs font-semibold rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50">+ Stock</button>
              <button onClick={() => setDeleteConfirmId(batch.id)} className="flex-1 py-1.5 text-xs font-semibold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">Page {page} of {totalPages} · {filtered.length} batches</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Bike className="h-5 w-5 text-amber-500" />
                    {modalMode === 'add' ? 'Add Scooty to Inventory' : 'Edit Inventory Batch'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {modalMode === 'add' ? 'Register a new purchase batch with individual unit details.' : `Editing: ${selectedBatch?.batchCode}`}
                  </p>
                </div>
                <button onClick={closeModal} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Error banner */}
              {errors.submit && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errors.submit}</span>
                </div>
              )}

              <form onSubmit={modalMode === 'add' ? handleAddSubmit : handleEditSubmit}
                className="p-5 space-y-5 text-xs">

                {/* ── Section 1: Core Details ──────────────────────────────── */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" />Scooter Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Scooty Model Number" error={errors.modelNumber} required>
                      <input type="text" value={form.modelNumber}
                        onChange={e => setForm(f => ({ ...f, modelNumber: e.target.value }))}
                        className={`${inputCls} ${errors.modelNumber ? inputErr : ''}`}
                        placeholder="e.g. E-Scoot 207, E-Zap" list="modelList" />
                      <datalist id="modelList">
                        {Object.keys(DISPATCH_MODELS).map(m => <option key={m} value={m} />)}
                      </datalist>
                    </Field>

                    <Field label="Light Type" error={errors.lightType}>
                      <select value={form.lightType}
                        onChange={e => setForm(f => ({ ...f, lightType: e.target.value as any }))}
                        className={inputCls}>
                        <option value="Single Light">Single Light</option>
                        <option value="Double Light">Double Light</option>
                      </select>
                    </Field>

                    <Field label="Company Name (Manufacturer)" error={errors.companyName} required>
                      <input type="text" value={form.companyName}
                        onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                        className={`${inputCls} ${errors.companyName ? inputErr : ''}`}
                        placeholder="e.g. Speed Volt India, Okaya EV" />
                    </Field>

                    <Field label="Battery Company Name">
                      <input type="text" value={form.batteryCompanyName}
                        onChange={e => setForm(f => ({ ...f, batteryCompanyName: e.target.value }))}
                        className={inputCls} placeholder="e.g. Amara Raja, Exide, Okaya" />
                    </Field>

                    <Field label="HSN Code">
                      <input type="text" value={form.hsnCode}
                        onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))}
                        className={`${inputCls} font-mono`} placeholder="e.g. 87116020 (leading zeros preserved)" />
                    </Field>

                    <Field label="Battery Warranty (months)">
                      <input type="number" min={0} value={form.batteryWarrantyMonths}
                        onChange={e => setForm(f => ({ ...f, batteryWarrantyMonths: e.target.value }))}
                        className={inputCls} />
                    </Field>
                  </div>
                </div>

                {/* ── Section 2: Purchase Details ──────────────────────────── */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5" />Purchase Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Purchase Date" error={errors.purchaseDate} required>
                      <input type="date" value={form.purchaseDate}
                        onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                        className={`${inputCls} ${errors.purchaseDate ? inputErr : ''}`} />
                    </Field>

                    <Field label="Purchase Cost per Unit (₹)" error={errors.purchaseCostPerUnit} required>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input type="number" min={0} step={0.01} value={form.purchaseCostPerUnit}
                          onChange={e => setForm(f => ({ ...f, purchaseCostPerUnit: e.target.value }))}
                          className={`${inputCls} pl-7 font-mono font-bold ${errors.purchaseCostPerUnit ? inputErr : ''}`}
                          placeholder="0" />
                      </div>
                    </Field>

                    <Field label="Quantity (units in this purchase)" error={errors.quantity} required>
                      <input type="number" min={1} step={1} value={form.quantity}
                        onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                        className={`${inputCls} font-mono font-bold ${errors.quantity ? inputErr : ''}`} />
                    </Field>

                    <Field label="Purchase Invoice Number">
                      <input type="text" value={form.invoiceNumber}
                        onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                        className={inputCls} placeholder="e.g. INV-2026-00123" />
                    </Field>

                    <Field label="Supplier / Distributor Name">
                      <input type="text" value={form.supplierName}
                        onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
                        className={inputCls} placeholder="Supplier company name" />
                    </Field>

                    <Field label="Stock Notes (optional)">
                      <input type="text" value={form.stockNotes}
                        onChange={e => setForm(f => ({ ...f, stockNotes: e.target.value }))}
                        className={inputCls} placeholder="Any additional notes" />
                    </Field>
                  </div>
                </div>

                {/* ── Section 3: Individual Unit Details (Add mode only) ────── */}
                {modalMode === 'add' && parsedQty(form.quantity) > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5" />Individual Unit Details
                    </p>
                    {errors.units && (
                      <p className="mb-2 text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{errors.units}</p>
                    )}
                    {errors.unitsBS && (
                      <p className="mb-2 text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{errors.unitsBS}</p>
                    )}
                    <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl">
                      <UnitsTable units={form.units}
                        setUnits={u => setForm(f => ({ ...f, units: u }))}
                        qty={parsedQty(form.quantity)}
                        modelNumber={form.modelNumber} />
                      <p className="text-[10px] text-amber-700 mt-2">
                        💡 Each chassis number must be globally unique. Battery serial must also be unique. Leave blank if not available at purchase time.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Footer buttons ─────────────────────────────────────────── */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {modalMode === 'add' && form.purchaseCostPerUnit && parsedQty(form.quantity) > 0 && (
                    <div className="text-xs text-slate-600">
                      Total batch value: <span className="font-black text-slate-900">
                        {formatCurrency(parseFloat(form.purchaseCostPerUnit || '0') * parsedQty(form.quantity))}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button type="button" onClick={closeModal}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold">
                      Cancel
                    </button>
                    <button type="submit" disabled={formLoading}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/25 flex items-center gap-2 transition">
                      {formLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                      {modalMode === 'add' ? 'Save to Inventory' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ADD UNITS MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {modalMode === 'addUnits' && selectedBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add Stock to Batch</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedBatch.batchCode} · {selectedBatch.modelNumber}</p>
                </div>
                <button onClick={closeModal} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>

              {errors.submit && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{errors.submit}</span>
                </div>
              )}

              <form onSubmit={handleAddUnitsSubmit} className="p-5 space-y-4">
                <Field label="How many new units to add?" error={errors.quantity}>
                  <input type="number" min={1} step={1} value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className={`${inputCls} font-mono font-bold w-32`} />
                </Field>

                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                  <UnitsTable units={form.units}
                    setUnits={u => setForm(f => ({ ...f, units: u }))}
                    qty={parsedQty(form.quantity)}
                    modelNumber={selectedBatch.modelNumber} />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                  <button type="button" onClick={closeModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={formLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md flex items-center gap-2">
                    {formLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Add Units to Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VIEW DETAIL MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {modalMode === 'view' && selectedBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedBatch.modelNumber}</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{selectedBatch.batchCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge(selectedBatch.status)}`}>
                    {selectedBatch.status}
                  </span>
                  <button onClick={closeModal} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Batch Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  {[
                    { label: 'Light Type', value: selectedBatch.lightType, icon: Lightbulb },
                    { label: 'Company', value: selectedBatch.companyName, icon: Factory },
                    { label: 'Battery Company', value: selectedBatch.batteryCompanyName || '—', icon: Battery },
                    { label: 'HSN Code', value: selectedBatch.hsnCode || '—', icon: Hash },
                    { label: 'Purchase Date', value: formatDate(selectedBatch.purchaseDate), icon: Calendar },
                    { label: 'Cost per Unit', value: formatCurrency(selectedBatch.purchaseCostPerUnit), icon: IndianRupee },
                    { label: 'Quantity', value: String(selectedBatch.quantity), icon: Package },
                    { label: 'Available', value: String(selectedBatch.availableQty ?? selectedBatch.quantity), icon: CheckCircle2 },
                    { label: 'Sold', value: String(selectedBatch.soldQty || 0), icon: Zap },
                    { label: 'Invoice No.', value: selectedBatch.invoiceNumber || '—', icon: ClipboardList },
                    { label: 'Supplier', value: selectedBatch.supplierName || '—', icon: Factory },
                    { label: 'Battery Warranty', value: `${selectedBatch.batteryWarrantyMonths} months`, icon: Battery },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-slate-400 flex items-center gap-1 mb-1"><Icon className="h-3 w-3" />{label}</p>
                      <p className="font-bold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                {selectedBatch.stockNotes && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs">
                    <p className="text-amber-700 font-semibold">Notes</p>
                    <p className="text-slate-700 mt-1">{selectedBatch.stockNotes}</p>
                  </div>
                )}

                {/* Total value */}
                <div className="bg-slate-900 rounded-xl p-4 text-xs text-white flex items-center justify-between">
                  <span className="text-slate-300">Total Batch Purchase Value</span>
                  <span className="text-xl font-black text-amber-400">
                    {formatCurrency(selectedBatch.purchaseCostPerUnit * selectedBatch.quantity)}
                  </span>
                </div>

                {/* Unit List */}
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-500" />Individual Units in this Batch
                  </p>
                  {loadingUnits ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                      <RefreshCw className="h-4 w-4 animate-spin" />Loading unit details…
                    </div>
                  ) : batchUnits.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 border border-slate-100 rounded-xl">
                      No individual unit records found. Units may not have been registered with chassis numbers at time of purchase.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-[28px_1fr_1fr_1fr_80px] bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <div className="p-2 text-center">#</div>
                        <div className="p-2">Chassis / VIN</div>
                        <div className="p-2">Battery Serial</div>
                        <div className="p-2">Color</div>
                        <div className="p-2 text-center">Status</div>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {batchUnits.map((u, i) => (
                          <div key={u.id} className="grid grid-cols-[28px_1fr_1fr_1fr_80px] items-center text-xs">
                            <div className="p-2 text-center text-[10px] font-mono text-slate-400">{i + 1}</div>
                            <div className="p-2 font-mono font-bold text-slate-800">{u.chassisVin}</div>
                            <div className="p-2 font-mono text-slate-600">{u.batterySerial || '—'}</div>
                            <div className="p-2 text-slate-600">{u.color || '—'}</div>
                            <div className="p-2 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(u.status)}`}>
                                {u.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                  <button onClick={() => { closeModal(); openEdit(selectedBatch); }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm flex items-center gap-1.5">
                    <Edit2 className="h-3.5 w-3.5" />Edit Batch
                  </button>
                  <button onClick={closeModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION DIALOG
      ══════════════════════════════════════════════════════════════════ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Delete Inventory Batch?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    If any units in this batch have been sold, the batch will be <strong>archived</strong> instead of deleted to preserve your sales records.
                  </p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                <Archive className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Unsold units will be permanently deleted. Sold units and their records are preserved.</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setDeleteConfirmId(null)} disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirmId)} disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md">
                  {deleteLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Yes, Delete / Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}