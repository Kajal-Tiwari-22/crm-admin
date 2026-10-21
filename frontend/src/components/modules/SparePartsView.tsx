'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { SparePart } from '@/types/crm';
import { formatCurrency, exportToCSV } from '@/lib/storage';
import {
  Cpu,
  Plus,
  Search,
  Download,
  AlertTriangle,
  ArrowUp,
  X,
  PackageCheck
} from 'lucide-react';

export default function SparePartsView() {
  const { spareParts, addSparePart, updateSparePartStock, suppliers } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);

  const [newPartForm, setNewPartForm] = useState({
    partNumber: '',
    name: '',
    category: 'Brake' as SparePart['category'],
    compatibleModels: ['Ather 450X', 'Ola S1 Pro', 'TVS iQube'],
    unitCost: 400,
    sellingPrice: 800,
    currentStock: 10,
    minStockLevel: 4,
    supplierId: suppliers[0]?.id || 'sup-001',
    shelfLocation: 'Bin A-1'
  });

  const filteredParts = spareParts.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = categoryFilter === 'All' ? true : p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartForm.name || !newPartForm.partNumber) return;

    addSparePart(newPartForm);
    setIsAddPartOpen(false);
    setNewPartForm({
      partNumber: '',
      name: '',
      category: 'Brake',
      compatibleModels: ['Ather 450X'],
      unitCost: 400,
      sellingPrice: 800,
      currentStock: 10,
      minStockLevel: 4,
      supplierId: suppliers[0]?.id || 'sup-001',
      shelfLocation: 'Bin A-1'
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="h-6 w-6 text-amber-600" />
            Spare Parts, Batteries & Accessories Depot
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage batteries, chargers, brake pads, tyres & OEM hardware. Automatically deducted on service job cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(spareParts, 'Spare_Parts_Inventory_Report')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddPartOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Spare Part
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search part name, part #, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="All">All Categories</option>
            <option value="Battery">Batteries & BMS</option>
            <option value="Charger">EV Smart Chargers</option>
            <option value="Brake">Brake Pads & Calipers</option>
            <option value="Tyre">EV Low Rolling Tyres</option>
            <option value="Electrical">Electrical Harness</option>
            <option value="Accessory">Accessories & Helmets</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Part Details</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Compatible EV Models</th>
                <th className="p-3.5 text-right">Cost Price</th>
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-center">Current Stock</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5 text-center">Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.map((p) => {
                const isLow = p.currentStock <= p.minStockLevel;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Part #: {p.partNumber}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-600">
                      {p.compatibleModels.join(', ')}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-slate-700">
                      {formatCurrency(p.unitCost)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(p.sellingPrice)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                        isLow ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isLow && <AlertTriangle className="h-3 w-3" />}
                        {p.currentStock} Units
                      </span>
                      {isLow && (
                        <span className="block text-[9px] text-rose-600 font-bold mt-0.5">Min: {p.minStockLevel}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium text-[11px]">
                      {p.shelfLocation}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateSparePartStock(p.id, 5)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                          title="Add 5 units"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => updateSparePartStock(p.id, 10)}
                          className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200"
                          title="Add 10 units"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Part Modal */}
      {isAddPartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Add New Spare Part / Accessory</h3>
              <button
                onClick={() => setIsAddPartOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Part Name *</label>
                <input
                  type="text"
                  required
                  value={newPartForm.name}
                  onChange={(e) => setNewPartForm({ ...newPartForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Ather Fast Charger 750W"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Part Number *</label>
                  <input
                    type="text"
                    required
                    value={newPartForm.partNumber}
                    onChange={(e) => setNewPartForm({ ...newPartForm, partNumber: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                    placeholder="e.g. ATH-CHG-750W"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newPartForm.category}
                    onChange={(e) => setNewPartForm({ ...newPartForm, category: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Battery">Battery Pack</option>
                    <option value="Charger">EV Charger</option>
                    <option value="Brake">Brake Parts</option>
                    <option value="Tyre">Tyres</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Accessory">Accessory</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dealer Cost (₹)</label>
                  <input
                    type="number"
                    value={newPartForm.unitCost}
                    onChange={(e) => setNewPartForm({ ...newPartForm, unitCost: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={newPartForm.sellingPrice}
                    onChange={(e) => setNewPartForm({ ...newPartForm, sellingPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-amber-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newPartForm.currentStock}
                    onChange={(e) => setNewPartForm({ ...newPartForm, currentStock: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={newPartForm.minStockLevel}
                    onChange={(e) => setNewPartForm({ ...newPartForm, minStockLevel: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={newPartForm.shelfLocation}
                    onChange={(e) => setNewPartForm({ ...newPartForm, shelfLocation: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="Rack B-2"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  Save Spare Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
