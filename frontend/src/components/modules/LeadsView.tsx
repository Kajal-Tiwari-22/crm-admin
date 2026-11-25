'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Lead } from '@/types/crm';
import { formatDate, formatCurrency, exportToCSV } from '@/lib/storage';
import {
  UserCheck,
  Plus,
  Search,
  Download,
  Calendar,
  Phone,
  CheckCircle2,
  ArrowRight,
  X
} from 'lucide-react';

export default function LeadsView() {
  const { leads, createLead, updateLeadStatus, convertLeadToCustomer, setActiveTab } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    interestedModel: 'Ather 450X',
    source: 'Walk-in' as Lead['source'],
    status: 'New' as Lead['status'],
    assignedStaff: 'Sneha Dixit',
    testRideDate: '',
    followUpDate: new Date().toISOString().slice(0, 10),
    budget: 145000,
    notes: ''
  });

  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      l.interestedModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.leadCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'All' ? true : l.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.phone) return;

    createLead(newLeadForm);
    setIsAddLeadOpen(false);
    setNewLeadForm({
      name: '',
      phone: '',
      email: '',
      interestedModel: 'Ather 450X',
      source: 'Walk-in',
      status: 'New',
      assignedStaff: 'Sneha Dixit',
      testRideDate: '',
      followUpDate: new Date().toISOString().slice(0, 10),
      budget: 145000,
      notes: ''
    });
  };

  const handleConvert = (leadId: string) => {
    const cust = convertLeadToCustomer(leadId);
    if (cust) {
      alert(`Lead converted to Customer Profile: ${cust.name} (${cust.customerCode})!`);
      setActiveTab('customers');
    }
  };

  const statusBadge = (st: Lead['status']) => {
    switch (st) {
      case 'New':
        return 'bg-blue-100 text-blue-800';
      case 'Test Ride Booked':
        return 'bg-amber-100 text-amber-800';
      case 'Follow-up':
        return 'bg-purple-100 text-purple-800';
      case 'Converted':
        return 'bg-emerald-100 text-emerald-800';
      case 'Lost':
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-blue-600" />
            Leads & Test Ride Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track walk-in enquiries, test ride schedules, salesperson follow-ups, and convert leads to booked customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(leads, 'Leads_Enquiries_Report')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddLeadOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Lead
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search lead name, phone, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="All">All Pipeline Stages</option>
            <option value="New">New Enquiries</option>
            <option value="Test Ride Booked">Test Ride Booked</option>
            <option value="Follow-up">Under Follow-up</option>
            <option value="Converted">Converted to Sales</option>
            <option value="Lost">Lost / Dropped</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Lead Details</th>
                <th className="p-3.5">Interested Model</th>
                <th className="p-3.5">Source & Staff</th>
                <th className="p-3.5">Test Ride / Follow-up</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Notes</th>
                <th className="p-3.5 text-center">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{lead.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{lead.phone}</div>
                    <div className="text-[10px] text-slate-400">{lead.leadCode}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-semibold text-slate-800">{lead.interestedModel}</span>
                    {lead.budget && (
                      <span className="block text-[10px] text-emerald-700 font-mono">Budget: {formatCurrency(lead.budget)}</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="text-slate-700 font-medium">{lead.source}</div>
                    <div className="text-[10px] text-slate-400">{lead.assignedStaff}</div>
                  </td>
                  <td className="p-3.5 space-y-0.5">
                    {lead.testRideDate && (
                      <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Ride: {lead.testRideDate.replace('T', ' ')}</span>
                      </div>
                    )}
                    {lead.followUpDate && (
                      <div className="text-[10px] text-slate-500">
                        Follow-up: {formatDate(lead.followUpDate)}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600 max-w-xs truncate text-[11px]">
                    {lead.notes || 'No notes added'}
                  </td>
                  <td className="p-3.5 text-center">
                    {lead.status !== 'Converted' ? (
                      <button
                        onClick={() => handleConvert(lead.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Convert</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-bold">Converted ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Register Walk-in / Digital Lead</h3>
              <button
                onClick={() => setIsAddLeadOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer / Lead Name *</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Ananya Roy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="+91 98XXX XXXXX"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Interested Model</label>
                  <input
                    type="text"
                    value={newLeadForm.interestedModel}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, interestedModel: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. TVS iQube ST, Ather Rizta"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lead Source</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Walk-in">Walk-in Showroom</option>
                    <option value="Phone Enquiry">Phone Enquiry</option>
                    <option value="Website Lead">Website Lead</option>
                    <option value="Social Media">Social Media / Meta Ads</option>
                    <option value="Referral">Existing Customer Referral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Test Ride Slot (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newLeadForm.testRideDate}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, testRideDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Estimated Budget (₹)</label>
                  <input
                    type="number"
                    value={newLeadForm.budget}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, budget: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Discussion Notes</label>
                <textarea
                  rows={2}
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Wants test ride with spouse; comparing battery range with Honda Activa."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLeadOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Lead Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
