'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Supplier, PurchaseOrder } from '@/types/crm';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/storage';
import {
  Truck,
  Plus,
  Search,
  Download,
  Building,
  Phone,
  Mail,
  FileText,
  X,
  CheckCircle2
} from 'lucide-react';

export default function SuppliersView() {
  const { suppliers, purchaseOrders, addSupplier, createPurchaseOrder } = useCRM();

  const [activeSubTab, setActiveSubTab] = useState<'Suppliers' | 'PurchaseOrders'>('Suppliers');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);

  // New Supplier Form
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    suppliedCategories: ['Electric Scooters']
  });

  // New PO Form
  const [newPO, setNewPO] = useState({
    supplierId: suppliers[0]?.id || '',
    expectedDate: new Date().toISOString().slice(0, 10),
    items: [
      { description: 'OEM Vehicle Stock Units', quantity: 2, unitPrice: 120000, total: 240000 }
    ],
    status: 'Sent' as PurchaseOrder['status'],
    paymentStatus: 'Pending' as PurchaseOrder['paymentStatus']
  });

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name || !newSupplier.phone) return;

    addSupplier(newSupplier);
    setIsAddSupplierOpen(false);
    setNewSupplier({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstNumber: '',
      suppliedCategories: ['Electric Scooters']
    });
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === newPO.supplierId);
    if (!sup) return;

    const totalAmount = newPO.items.reduce((acc, item) => acc + item.total, 0);

    createPurchaseOrder({
      supplierId: newPO.supplierId,
      supplierName: sup.name,
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDate: newPO.expectedDate,
      items: newPO.items,
      totalAmount,
      status: newPO.status,
      paymentStatus: newPO.paymentStatus
    });

    setIsCreatePOOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-slate-700" />
            Suppliers & OEM Purchase Orders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage relationships with Ather, Ola, TVS depots and spare parts manufacturers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSubTab === 'Suppliers' ? (
            <button
              onClick={() => setIsAddSupplierOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add OEM Supplier
            </button>
          ) : (
            <button
              onClick={() => setIsCreatePOOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('Suppliers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'Suppliers'
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Suppliers Directory ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('PurchaseOrders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'PurchaseOrders'
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Purchase Orders ({purchaseOrders.length})
        </button>
      </div>

      {/* Content based on SubTab */}
      {activeSubTab === 'Suppliers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                  <p className="text-xs text-slate-500">Contact: <strong>{s.contactPerson}</strong></p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  GST: {s.gstNumber}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>{s.phone}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span>{s.email}</span>
                </p>
                <p className="text-[11px] text-slate-500 pt-1">{s.address}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Outstanding Due</span>
                  <span className="font-mono font-bold text-rose-700">{formatCurrency(s.balanceDue)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Purchases</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(s.totalPurchased)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">PO Number</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Order Date</th>
                <th className="p-3.5">Expected Delivery</th>
                <th className="p-3.5 text-right">Total Amount</th>
                <th className="p-3.5 text-center">Order Status</th>
                <th className="p-3.5 text-center">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.map((po) => (
                <tr key={po.id}>
                  <td className="p-3.5 font-mono font-bold text-slate-900">{po.poNumber}</td>
                  <td className="p-3.5 font-semibold text-slate-800">{po.supplierName}</td>
                  <td className="p-3.5 text-slate-600">{formatDate(po.orderDate)}</td>
                  <td className="p-3.5 text-slate-600">{formatDate(po.expectedDate)}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(po.totalAmount)}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      {po.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {po.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Add Supplier / OEM Partner</h3>
              <button
                onClick={() => setIsAddSupplierOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / OEM Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Ather Energy Depot"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newSupplier.contactPerson}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={newSupplier.gstNumber}
                    onChange={(e) => setNewSupplier({ ...newSupplier, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Address & Regional Depot</label>
                <textarea
                  rows={2}
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {isCreatePOOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Issue Purchase Order</h3>
              <button
                onClick={() => setIsCreatePOOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Supplier</label>
                <select
                  value={newPO.supplierId}
                  onChange={(e) => setNewPO({ ...newPO, supplierId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={newPO.expectedDate}
                    onChange={(e) => setNewPO({ ...newPO, expectedDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total PO Amount (₹)</label>
                  <input
                    type="number"
                    value={newPO.items[0].total}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewPO({
                        ...newPO,
                        items: [{ ...newPO.items[0], total: val, unitPrice: val / (newPO.items[0].quantity || 1) }]
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePOOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold"
                >
                  Issue PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
