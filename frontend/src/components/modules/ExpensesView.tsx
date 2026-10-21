'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Expense } from '@/types/crm';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/storage';
import {
  Receipt,
  Plus,
  Search,
  Download,
  Calendar,
  DollarSign,
  TrendingDown,
  X,
  CreditCard,
  Building,
  UserCheck
} from 'lucide-react';

export default function ExpensesView() {
  const { expenses, addExpense, currentStaff } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const [newExpenseForm, setNewExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'Rent' as Expense['category'],
    amount: 15000,
    paymentMethod: 'Bank Transfer' as Expense['paymentMethod'],
    paidTo: '',
    description: '',
    approvedBy: currentStaff.name
  });

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch =
      e.paidTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = categoryFilter === 'All' ? true : e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseForm.paidTo || newExpenseForm.amount <= 0) return;

    addExpense(newExpenseForm);
    setIsAddExpenseOpen(false);
    setNewExpenseForm({
      date: new Date().toISOString().slice(0, 10),
      category: 'Rent',
      amount: 15000,
      paymentMethod: 'Bank Transfer',
      paidTo: '',
      description: '',
      approvedBy: currentStaff.name
    });
  };

  return (
    <div className="space-y-6">
      {/* Title & Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-rose-600" />
            Showroom Operating Expenses & Cash Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record rent, staff payroll, EV charging electricity bills, marketing campaigns & daily refreshments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(expenses, 'Operating_Expenses_Report')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Log Showroom Expense
          </button>
        </div>
      </div>

      {/* Expense KPI Highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Monthly Expenses</span>
          <p className="text-2xl font-black text-rose-700 mt-2 font-mono">{formatCurrency(totalExpenseAmount)}</p>
          <p className="text-xs text-slate-400 mt-1">{expenses.length} operating payment vouchers logged</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Top Expense Head</span>
          <p className="text-xl font-bold text-slate-900 mt-2">Salaries & Showroom Rent</p>
          <p className="text-xs text-slate-400 mt-1">Core monthly dealership overheads</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Electricity & EV Charging</span>
          <p className="text-xl font-bold text-amber-800 mt-2">Commercial Tariff</p>
          <p className="text-xs text-slate-400 mt-1">Covers showroom fast-charging hubs</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search payee, description, voucher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="All">All Categories</option>
            <option value="Rent">Showroom Rent</option>
            <option value="Salaries">Staff Payroll</option>
            <option value="Electricity">Electricity & Charging</option>
            <option value="Marketing">Marketing & Local Ads</option>
            <option value="Showroom Maintenance">Maintenance & Repairs</option>
            <option value="Office & Tea">Tea & Refreshments</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Voucher #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Expense Category</th>
                <th className="p-3.5">Paid To</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5">Approved By</th>
                <th className="p-3.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5 font-mono font-bold text-slate-900">{exp.voucherNumber}</td>
                  <td className="p-3.5 text-slate-600">{formatDate(exp.date)}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-800">{exp.paidTo}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-rose-700">{formatCurrency(exp.amount)}</td>
                  <td className="p-3.5 text-slate-600 font-medium">{exp.paymentMethod}</td>
                  <td className="p-3.5 text-slate-500 text-[11px]">{exp.approvedBy}</td>
                  <td className="p-3.5 text-slate-600 max-w-xs truncate text-[11px]">{exp.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Log Operating Showroom Expense</h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={newExpenseForm.date}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newExpenseForm.category}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Rent">Showroom Rent</option>
                    <option value="Salaries">Staff Payroll</option>
                    <option value="Electricity">Electricity & Charging</option>
                    <option value="Marketing">Marketing / Ads</option>
                    <option value="Showroom Maintenance">Repairs & Maintenance</option>
                    <option value="Transport">Vehicle Logistics</option>
                    <option value="Office & Tea">Tea & Refreshments</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newExpenseForm.amount}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-rose-700"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={newExpenseForm.paymentMethod}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, paymentMethod: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">UPI (Google Pay/Paytm)</option>
                    <option value="Cash">Cash Voucher</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Paid To (Payee Name / Vendor) *</label>
                <input
                  type="text"
                  required
                  value={newExpenseForm.paidTo}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, paidTo: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Sunrise Properties / Electricity Board"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Bill Memo Details</label>
                <textarea
                  rows={2}
                  value={newExpenseForm.description}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Purpose of expense..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Save Expense Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
