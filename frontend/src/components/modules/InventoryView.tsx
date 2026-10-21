'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Vehicle, VehicleStatus } from '@/types/crm';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/storage';
import {
  Bike,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  X,
  Eye,
  Edit2
} from 'lucide-react';

export default function InventoryView() {
  const { vehicles, addVehicle, updateVehicle, suppliers } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<Vehicle | null>(null);

  // New Vehicle Form State
  const [newVehicle, setNewVehicle] = useState({
    brand: 'Ather Energy',
    model: 'Ather 450X',
    variant: 'Gen 3 Pro (3.7 kWh)',
    color: 'Space Grey',
    chassisVin: '',
    motorNumber: '',
    batterySerial: '',
    batteryCapacityKwh: 3.7,
    certifiedRangeKm: 150,
    purchasePrice: 122000,
    gstRate: 5,
    sellingPrice: 144999,
    purchaseDate: new Date().toISOString().slice(0, 10),
    supplierId: suppliers[0]?.id || 'sup-001',
    supplierInvoiceNo: '',
    status: 'Available' as VehicleStatus,
    batteryWarrantyMonths: 60,
    vehicleWarrantyMonths: 36,
    stockAgeDays: 0,
    location: 'Showroom Floor'
  });

  const [formError, setFormError] = useState('');

  // Filtering
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch =
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.chassisVin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.motorNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.batterySerial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.color.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'All' || v.status === selectedStatus;
    const matchesBrand = selectedBrand === 'All' || v.brand === selectedBrand;

    return matchesSearch && matchesStatus && matchesBrand;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newVehicle.chassisVin.trim()) {
      setFormError('Chassis / VIN number is strictly required');
      return;
    }
    if (!newVehicle.motorNumber.trim()) {
      setFormError('Motor number is strictly required');
      return;
    }
    if (!newVehicle.batterySerial.trim()) {
      setFormError('Battery serial number is strictly required');
      return;
    }

    const gstAmount = Math.round((newVehicle.purchasePrice * newVehicle.gstRate) / 100);
    const dealerMargin = newVehicle.sellingPrice - (newVehicle.purchasePrice + gstAmount);

    const result = addVehicle({
      ...newVehicle,
      gstAmount,
      dealerMargin
    });

    if (!result.success) {
      setFormError(result.message || 'Failed to add vehicle');
      return;
    }

    setIsAddModalOpen(false);
    // Reset form
    setNewVehicle({
      brand: 'Ather Energy',
      model: 'Ather 450X',
      variant: 'Gen 3 Pro (3.7 kWh)',
      color: 'Space Grey',
      chassisVin: '',
      motorNumber: '',
      batterySerial: '',
      batteryCapacityKwh: 3.7,
      certifiedRangeKm: 150,
      purchasePrice: 122000,
      gstRate: 5,
      sellingPrice: 144999,
      purchaseDate: new Date().toISOString().slice(0, 10),
      supplierId: suppliers[0]?.id || 'sup-001',
      supplierInvoiceNo: '',
      status: 'Available',
      batteryWarrantyMonths: 60,
      vehicleWarrantyMonths: 36,
      stockAgeDays: 0,
      location: 'Showroom Floor'
    });
  };

  const statusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Reserved':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Sold':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'In Transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Returned':
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title & Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bike className="h-6 w-6 text-amber-500" />
            Scooty Stock & Vehicle-Level Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual VIN, motor number, battery serial and margin tracking per scooty unit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(vehicles, 'Scooty_Inventory_Report')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Scooty Unit
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search VIN, Motor, Battery Serial, Model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Reserved">Reserved</option>
            <option value="Sold">Sold</option>
            <option value="In Transit">In Transit</option>
            <option value="Returned">Returned</option>
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="All">All Brands</option>
            <option value="Ather Energy">Ather Energy</option>
            <option value="Ola Electric">Ola Electric</option>
            <option value="TVS Motor">TVS Motor</option>
            <option value="Bajaj Auto">Bajaj Auto</option>
            <option value="Hero MotoCorp">Hero MotoCorp</option>
            <option value="Ampere">Ampere</option>
          </select>
        </div>
      </div>

      {/* Vehicle Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Brand & Model</th>
                <th className="p-3.5">Chassis / VIN</th>
                <th className="p-3.5">Motor & Battery Serial</th>
                <th className="p-3.5 text-right">Ex-Showroom Price</th>
                <th className="p-3.5 text-right">Dealer Margin</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Stock Age</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{v.brand} {v.model}</div>
                      <div className="text-[11px] text-slate-500">{v.variant} • {v.color}</div>
                      <div className="text-[10px] text-amber-700 font-semibold">{v.certifiedRangeKm} km range • {v.batteryCapacityKwh} kWh</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      {v.chassisVin}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] space-y-0.5">
                      <div><span className="text-slate-400">M:</span> {v.motorNumber}</div>
                      <div><span className="text-slate-400">B:</span> {v.batterySerial}</div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(v.sellingPrice)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                      +{formatCurrency(v.dealerMargin)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(v.status)}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`text-[11px] font-mono font-medium ${
                        v.stockAgeDays > 45 ? 'text-rose-600 font-bold' : 'text-slate-600'
                      }`}>
                        {v.stockAgeDays} days
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedVehicleForDetail(v)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                          title="View Vehicle Passport"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No vehicles found matching current search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Scooty Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add New Scooty Unit to Inventory</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Brand Name *</label>
                  <select
                    value={newVehicle.brand}
                    onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Ather Energy">Ather Energy</option>
                    <option value="Ola Electric">Ola Electric</option>
                    <option value="TVS Motor">TVS Motor</option>
                    <option value="Bajaj Auto">Bajaj Auto</option>
                    <option value="Hero MotoCorp">Hero MotoCorp</option>
                    <option value="Ampere">Ampere</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. Ather 450X, TVS iQube"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Variant / Spec *</label>
                  <input
                    type="text"
                    required
                    value={newVehicle.variant}
                    onChange={(e) => setNewVehicle({ ...newVehicle, variant: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. Gen 3 Pro 3.7kWh"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Color *</label>
                  <input
                    type="text"
                    required
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. Space Grey, Pearl White"
                  />
                </div>
              </div>

              {/* Crucial Identifiers */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                <p className="font-bold text-amber-900 text-[11px] uppercase tracking-wide">
                  Unique Vehicle Identifiers (Prevent Duplicates)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Chassis / VIN *</label>
                    <input
                      type="text"
                      required
                      value={newVehicle.chassisVin}
                      onChange={(e) => setNewVehicle({ ...newVehicle, chassisVin: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase"
                      placeholder="e.g. ME4AT450X..."
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Motor Number *</label>
                    <input
                      type="text"
                      required
                      value={newVehicle.motorNumber}
                      onChange={(e) => setNewVehicle({ ...newVehicle, motorNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono uppercase"
                      placeholder="e.g. ATH-PMSM-..."
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Battery Serial *</label>
                    <input
                      type="text"
                      required
                      value={newVehicle.batterySerial}
                      onChange={(e) => setNewVehicle({ ...newVehicle, batterySerial: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono uppercase"
                      placeholder="e.g. ATH-BAT37-..."
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Margins */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dealer Purchase Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newVehicle.purchasePrice}
                    onChange={(e) => setNewVehicle({ ...newVehicle, purchasePrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">GST Rate (%) *</label>
                  <input
                    type="number"
                    required
                    value={newVehicle.gstRate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, gstRate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Selling Ex-Showroom (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newVehicle.sellingPrice}
                    onChange={(e) => setNewVehicle({ ...newVehicle, sellingPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-amber-700"
                  />
                </div>
              </div>

              {/* Status and Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Initial Status</label>
                  <select
                    value={newVehicle.status}
                    onChange={(e) => setNewVehicle({ ...newVehicle, status: e.target.value as VehicleStatus })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Available">Available</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Reserved">Reserved</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Location</label>
                  <select
                    value={newVehicle.location}
                    onChange={(e) => setNewVehicle({ ...newVehicle, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Showroom Floor">Showroom Floor</option>
                    <option value="Warehouse">Warehouse Depot</option>
                    <option value="Service Bay">Service Bay</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Supplier</label>
                  <select
                    value={newVehicle.supplierId}
                    onChange={(e) => setNewVehicle({ ...newVehicle, supplierId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                >
                  Save Scooty to Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Passport Detail Drawer */}
      {selectedVehicleForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Vehicle Digital Passport</h3>
                <p className="text-[11px] text-slate-500">{selectedVehicleForDetail.brand} {selectedVehicleForDetail.model}</p>
              </div>
              <button
                onClick={() => setSelectedVehicleForDetail(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="flex justify-between">
                  <span className="text-slate-500">Chassis / VIN:</span>
                  <strong className="font-mono text-slate-900">{selectedVehicleForDetail.chassisVin}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Motor Number:</span>
                  <strong className="font-mono text-slate-900">{selectedVehicleForDetail.motorNumber}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Battery Serial:</span>
                  <strong className="font-mono text-slate-900">{selectedVehicleForDetail.batterySerial}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Battery Capacity:</span>
                  <strong className="text-slate-900">{selectedVehicleForDetail.batteryCapacityKwh} kWh ({selectedVehicleForDetail.certifiedRangeKm} km)</strong>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1">
                <p className="flex justify-between">
                  <span className="text-slate-600">Purchase Cost:</span>
                  <span className="font-mono">{formatCurrency(selectedVehicleForDetail.purchasePrice)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-600">GST ({selectedVehicleForDetail.gstRate}%):</span>
                  <span className="font-mono">{formatCurrency(selectedVehicleForDetail.gstAmount)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-600">Selling Price:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedVehicleForDetail.sellingPrice)}</span>
                </p>
                <p className="flex justify-between border-t border-amber-200 pt-1 font-bold">
                  <span className="text-amber-950">Showroom Margin:</span>
                  <span className="font-mono text-emerald-700">+{formatCurrency(selectedVehicleForDetail.dealerMargin)}</span>
                </p>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Battery Warranty: <strong className="text-slate-800">{selectedVehicleForDetail.batteryWarrantyMonths} Months</strong></p>
                <p>Vehicle Warranty: <strong className="text-slate-800">{selectedVehicleForDetail.vehicleWarrantyMonths} Months</strong></p>
                <p>Current Storage Location: <strong className="text-slate-800">{selectedVehicleForDetail.location}</strong></p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedVehicleForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
