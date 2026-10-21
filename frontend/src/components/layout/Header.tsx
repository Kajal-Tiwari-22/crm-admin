'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '@/context/CRMContext';
import { StaffRole } from '@/types/crm';
import {
  Search,
  Bell,
  Plus,
  Shield,
  X,
  ArrowRight,
  Database,
  LogOut,
  Wifi
} from 'lucide-react';

export default function Header() {
  const {
    currentRole,
    setCurrentRole,
    currentStaff,
    globalSearch,
    setGlobalSearch,
    vehicles,
    customers,
    sales,
    reminders,
    setActiveTab,
    setSelectedSaleForInvoice,
    setIsQuickActionOpen,
    syncToFirestore,
    isMongoConnected,
    logoutAdmin
  } = useCRM();

  const [isSyncing, setIsSyncing] = useState(false);

  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncToFirestore();
      alert(res.message);
    } catch (err: any) {
      alert(`Sync failed: ${err.message || err.toString()}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setIsRoleOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles: StaffRole[] = ['Owner', 'Manager', 'Sales Staff', 'Accountant', 'Service Technician'];

  // Global search filtering
  const query = globalSearch.trim().toLowerCase();
  const searchResults = query.length >= 2 ? {
    vehicles: vehicles.filter(v =>
      v.brand.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.chassisVin.toLowerCase().includes(query) ||
      v.motorNumber.toLowerCase().includes(query)
    ).slice(0, 3),
    customers: customers.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.customerCode.toLowerCase().includes(query)
    ).slice(0, 3),
    sales: sales.filter(s =>
      s.invoiceNumber.toLowerCase().includes(query) ||
      (s.registrationNumber && s.registrationNumber.toLowerCase().includes(query))
    ).slice(0, 3)
  } : null;

  const totalResultsCount = searchResults
    ? searchResults.vehicles.length + searchResults.customers.length + searchResults.sales.length
    : 0;

  const activeReminders = reminders.filter(r => r.status === 'Scheduled' || r.status === 'Sent').slice(0, 5);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Global Search Bar */}
      <div className="relative w-96">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Chassis / VIN, Customer, Phone, Invoice..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown */}
        {searchResults && totalResultsCount > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs">
            <div className="p-2 border-b border-slate-100 flex justify-between items-center text-[11px] font-semibold text-slate-400 uppercase">
              <span>Quick Search Results</span>
              <span>{totalResultsCount} found</span>
            </div>

            {/* Vehicles */}
            {searchResults.vehicles.length > 0 && (
              <div className="py-1">
                <span className="px-2 text-[10px] font-bold text-amber-700 uppercase">Vehicles</span>
                {searchResults.vehicles.map(v => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setActiveTab('inventory');
                      setGlobalSearch('');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{v.brand} {v.model}</p>
                      <p className="text-[10px] text-slate-500 font-mono">VIN: {v.chassisVin}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700">
                      {v.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Customers */}
            {searchResults.customers.length > 0 && (
              <div className="py-1 border-t border-slate-100">
                <span className="px-2 text-[10px] font-bold text-blue-700 uppercase">Customers</span>
                {searchResults.customers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveTab('customers');
                      setGlobalSearch('');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.phone}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{c.customerCode}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Sales */}
            {searchResults.sales.length > 0 && (
              <div className="py-1 border-t border-slate-100">
                <span className="px-2 text-[10px] font-bold text-emerald-700 uppercase">Invoices</span>
                {searchResults.sales.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSaleForInvoice(s);
                      setGlobalSearch('');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-slate-900 font-mono">{s.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-500">Reg: {s.registrationNumber || 'In progress'}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions: MongoDB Sync, Quick Add, Notifications, Role Switcher */}
      <div className="flex items-center gap-2.5">
        {/* MongoDB Atlas Real-Time Status & Sync Button */}
        <button
          onClick={handleCloudSync}
          disabled={isSyncing}
          title="Connected to MongoDB Atlas (auto-shop). Click to sync all showroom records."
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition shadow-2xs active:scale-95 cursor-pointer"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <Database className="h-3.5 w-3.5 text-emerald-700" />
          <span>{isSyncing ? 'Syncing to MongoDB...' : 'MongoDB Atlas (Live)'}</span>
        </button>

        {/* Quick Action Button */}
        <button
          onClick={() => setIsQuickActionOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 transition active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Quick Actions</span>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Bell className="h-4 w-4" />
            {activeReminders.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center">
                {activeReminders.length}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900">Notifications & Alerts</span>
                <button
                  onClick={() => {
                    setActiveTab('reminders');
                    setIsNotifOpen(false);
                  }}
                  className="text-[11px] text-amber-600 font-semibold hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto mt-1">
                {activeReminders.map(rem => (
                  <div key={rem.id} className="py-2.5">
                    <p className="font-semibold text-slate-900 leading-tight">{rem.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{rem.messageContent}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-amber-700 font-medium">{rem.customerPhone}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        📱 WhatsApp
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher (Simulates Owner, Manager, Sales, Accountant, Technician permissions) */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setIsRoleOpen(!isRoleOpen)}
            className="flex items-center gap-2 pl-3 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-left"
          >
            <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">{currentStaff.name}</p>
              <p className="text-[10px] font-semibold text-amber-600 mt-0.5">{currentRole}</p>
            </div>
          </button>

          {isRoleOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400">Switch Role View</p>
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => {
                    setCurrentRole(role);
                    setIsRoleOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition flex items-center justify-between ${
                    currentRole === role ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{role}</span>
                  {currentRole === role && <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>}
                </button>
              ))}

              <div className="my-1.5 border-t border-slate-100" />
              <button
                onClick={() => {
                  setIsRoleOpen(false);
                  logoutAdmin();
                }}
                className="w-full text-left px-3 py-2 rounded-lg font-semibold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Admin</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
