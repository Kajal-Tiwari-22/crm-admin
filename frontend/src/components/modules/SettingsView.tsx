'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { ShowroomSettings, StaffRole } from '@/types/crm';
import { exportToCSV } from '@/lib/storage';
import {
  Settings,
  Shield,
  Clock,
  Database,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Wifi
} from 'lucide-react';

export default function SettingsView() {
  const {
    settings,
    updateSettings,
    staff,
    auditLogs,
    resetDatabase,
    loadDemoData,
    exportDatabaseJSON,
    importDatabaseJSON,
    syncToFirestore: syncToMongoDB,
    syncFromFirestore: syncFromMongoDB
  } = useCRM();

  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const [activeTab, setActiveTab] = useState<'Profile' | 'ServiceIntervals' | 'StaffRoles' | 'AuditLogs' | 'Firebase'>('Profile');

  const [formData, setFormData] = useState<ShowroomSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleIntervalChange = (idx: number, field: string, value: number) => {
    const updated = [...formData.serviceIntervals];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData({ ...formData, serviceIntervals: updated });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const success = importDatabaseJSON(text);
      if (success) {
        alert('CRM Database restored successfully from backup JSON!');
      } else {
        alert('Failed to parse database backup file. Ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-700" />
            Showroom Settings, Permissions & Architecture
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure dealership profile, model-wise free-service interval policies, staff roles, and Firebase synchronization.
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            Settings Saved Successfully!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('Profile')}
          className={`px-3.5 py-2 rounded-xl font-bold transition ${
            activeTab === 'Profile' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Dealership Profile
        </button>
        <button
          onClick={() => setActiveTab('ServiceIntervals')}
          className={`px-3.5 py-2 rounded-xl font-bold transition ${
            activeTab === 'ServiceIntervals' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Model Free-Service Rules
        </button>
        <button
          onClick={() => setActiveTab('StaffRoles')}
          className={`px-3.5 py-2 rounded-xl font-bold transition ${
            activeTab === 'StaffRoles' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Staff & Roles ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab('AuditLogs')}
          className={`px-3.5 py-2 rounded-xl font-bold transition ${
            activeTab === 'AuditLogs' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('Firebase')}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
            activeTab === 'Firebase' ? 'bg-emerald-600 text-white font-black' : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          MongoDB Atlas Architecture
        </button>
      </div>

      {/* Tab 1: Dealership Profile */}
      {activeTab === 'Profile' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Showroom / Dealership Legal Name *</label>
              <input
                type="text"
                required
                value={formData.showroomName}
                onChange={(e) => setFormData({ ...formData, showroomName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Branch Name</label>
              <input
                type="text"
                value={formData.branchName}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Physical Address & Service Bay Location</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol}
                disabled
                className="w-full p-2.5 bg-slate-200/60 border border-slate-300 rounded-xl font-bold font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20"
            >
              <Save className="h-4 w-4" />
              Save Dealership Profile
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Model Service Intervals */}
      {activeTab === 'ServiceIntervals' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Model-Wise 3 Free-Service Interval Configuration</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Specify exact days and kilometres due for each electric scooter model per manufacturer warranty guidelines.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Model</th>
                  <th className="p-3">Service 1 (Days / Km)</th>
                  <th className="p-3">Service 2 (Days / Km)</th>
                  <th className="p-3">Service 3 (Days / Km)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.serviceIntervals.map((rule, idx) => (
                  <tr key={rule.model} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-bold text-slate-900">{rule.model}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={rule.service1Days}
                          onChange={(e) => handleIntervalChange(idx, 'service1Days', Number(e.target.value))}
                          className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-center"
                        />
                        <span className="text-slate-400">days /</span>
                        <input
                          type="number"
                          value={rule.service1Km}
                          onChange={(e) => handleIntervalChange(idx, 'service1Km', Number(e.target.value))}
                          className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-center"
                        />
                        <span className="text-slate-400">km</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={rule.service2Days}
                          onChange={(e) => handleIntervalChange(idx, 'service2Days', Number(e.target.value))}
                          className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-center"
                        />
                        <span className="text-slate-400">days /</span>
                        <input
                          type="number"
                          value={rule.service2Km}
                          onChange={(e) => handleIntervalChange(idx, 'service2Km', Number(e.target.value))}
                          className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-center"
                        />
                        <span className="text-slate-400">km</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={rule.service3Days}
                          onChange={(e) => handleIntervalChange(idx, 'service3Days', Number(e.target.value))}
                          className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-center"
                        />
                        <span className="text-slate-400">days /</span>
                        <input
                          type="number"
                          value={rule.service3Km}
                          onChange={(e) => handleIntervalChange(idx, 'service3Km', Number(e.target.value))}
                          className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-center"
                        />
                        <span className="text-slate-400">km</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20"
            >
              <Save className="h-4 w-4" />
              Save Service Policies
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Staff & Permissions */}
      {activeTab === 'StaffRoles' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Staff Directory & Role-Based Access Controls</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Authorized roles: Owner, Manager, Sales Staff, Accountant, and Service Technician.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Email & Login</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-bold text-slate-900">{s.name}</td>
                    <td className="p-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                        {s.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{s.email}</td>
                    <td className="p-3 font-mono text-slate-600">{s.phone}</td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'AuditLogs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System Audit Trail</h3>
              <p className="text-slate-500 text-xs mt-0.5">Immutable record of sales created, stock changes, and payments collected.</p>
            </div>
            <button
              onClick={() => exportToCSV(auditLogs, 'Audit_Logs_Export')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Export Logs
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User & Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                      {log.userName} <span className="text-[10px] text-slate-400 font-normal">({log.userRole})</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-700">{log.action}</td>
                    <td className="p-3 text-slate-600">{log.module}</td>
                    <td className="p-3 text-slate-700">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: MongoDB Atlas & Database Backup */}
      {activeTab === 'Firebase' && (
        <div className="space-y-6">
          {/* Architecture Overview */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 rounded-2xl text-white shadow-md">
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              <h2 className="text-lg font-black tracking-tight">MongoDB Atlas — Auto-Shop Database</h2>
            </div>
            <p className="text-xs text-emerald-50 mt-1 max-w-2xl font-medium leading-relaxed">
              All showroom records are stored in MongoDB Atlas cluster <strong>cluster0.sbghj.mongodb.net</strong>, database <strong>auto-shop</strong>.
              Real-time sync is powered by Socket.io. WhatsApp reminders dispatch via direct WhatsApp Web links.
            </p>
          </div>

          {/* MongoDB Collections Blueprint */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">MongoDB Atlas Collections (auto-shop)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {['vehicles','customers','sales','services','emiSchedules','reminders','leads','spareParts','suppliers','purchaseOrders','warrantyInsurance','expenses','settings','auditLogs'].map(col => (
                <div key={col} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <p className="font-bold font-mono text-emerald-700 text-[11px]">{col}</p>
                </div>
              ))}
            </div>
          </div>

          {/* MongoDB Atlas Synchronization */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">Live MongoDB Atlas Synchronization</h3>
                </div>
                <p className="text-slate-500 text-xs mt-0.5">
                  Cluster: <strong className="font-mono text-emerald-800">cluster0.sbghj.mongodb.net</strong> | Database: <strong className="font-mono">auto-shop</strong>
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Connected & Active
              </span>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              All showroom data (vehicles, customers, sales, EMI, reminders, leads, spare parts) is stored in MongoDB Atlas with real-time Socket.io sync. WhatsApp reminders are dispatched directly — no third-party SMS gateway required.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                disabled={isPushing}
                onClick={async () => {
                  setIsPushing(true);
                  try {
                    const res = await syncToMongoDB();
                    alert(res.message);
                  } catch (err: any) {
                    alert(`Sync failed: ${err.message || err.toString()}`);
                  } finally {
                    setIsPushing(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition shadow-xs active:scale-95 cursor-pointer"
              >
                <Database className="h-4 w-4" />
                <span>{isPushing ? 'Pushing to MongoDB Atlas...' : 'Push All Data to MongoDB Atlas'}</span>
              </button>

              <button
                disabled={isPulling}
                onClick={async () => {
                  setIsPulling(true);
                  try {
                    const res = await syncFromMongoDB();
                    alert(res.message);
                  } catch (err: any) {
                    alert(`Pull failed: ${err.message || err.toString()}`);
                  } finally {
                    setIsPulling(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold transition shadow-xs active:scale-95 cursor-pointer"
              >
                <Wifi className="h-4 w-4" />
                <span>{isPulling ? 'Fetching from MongoDB...' : 'Pull Latest Data from MongoDB Atlas'}</span>
              </button>
            </div>
          </div>

          {/* Backup / Export / Reset Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">Database Backup, Restore & Reset</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={exportDatabaseJSON}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition"
              >
                <Download className="h-4 w-4" />
                Download JSON Backup
              </button>

              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold transition cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Restore JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  if (confirm('Load sample EV demo showroom data (vehicles, customers, sales, and service schedules)?')) {
                    loadDemoData();
                    alert('Loaded sample EV showroom demo data successfully!');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-bold transition"
              >
                <Database className="h-4 w-4 text-emerald-600" />
                <span>Load Sample EV Demo Data</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Are you sure you want to wipe all records and start 100% clean/empty?')) {
                    resetDatabase();
                    alert('Showroom CRM reset to clean empty state!');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold transition"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Wipe & Start 100% Clean / Empty</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
