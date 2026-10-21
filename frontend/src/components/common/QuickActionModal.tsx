'use client';

import React from 'react';
import { useCRM } from '@/context/CRMContext';
import {
  X,
  ShoppingCart,
  Bike,
  UserPlus,
  Wrench,
  CreditCard,
  ArrowRight
} from 'lucide-react';

export default function QuickActionModal() {
  const { isQuickActionOpen, setIsQuickActionOpen, setActiveTab } = useCRM();

  if (!isQuickActionOpen) return null;

  const actions = [
    {
      title: 'Record New Sale & Handover',
      description: 'Generate customer invoice, select available scooty, set down payment & configure EMI.',
      icon: ShoppingCart,
      color: 'bg-emerald-500 text-white',
      badge: 'Sales Bay',
      targetTab: 'sales'
    },
    {
      title: 'Add Scooty to Inventory',
      description: 'Enter new chassis/VIN, motor number, battery serial, purchase price, supplier & taxes.',
      icon: Bike,
      color: 'bg-amber-500 text-white',
      badge: 'Stock',
      targetTab: 'inventory'
    },
    {
      title: 'Add New Customer Profile',
      description: 'Register customer details, ID documents, address & communication preferences.',
      icon: UserPlus,
      color: 'bg-blue-500 text-white',
      badge: 'CRM',
      targetTab: 'customers'
    },
    {
      title: 'Schedule Service / Job Card',
      description: 'Book 1st, 2nd, 3rd Free service milestone or paid repair checkup.',
      icon: Wrench,
      color: 'bg-indigo-500 text-white',
      badge: 'Service Bay',
      targetTab: 'services'
    },
    {
      title: 'Collect EMI Payment',
      description: 'Record monthly installment, partial payment, UPI/Cash receipt & update balance.',
      icon: CreditCard,
      color: 'bg-purple-500 text-white',
      badge: 'Accounts',
      targetTab: 'emi'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Showroom Quick Actions</h2>
            <p className="text-xs text-slate-500">Select an operational workflow to launch</p>
          </div>
          <button
            onClick={() => setIsQuickActionOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {actions.map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  setActiveTab(act.targetTab);
                  setIsQuickActionOpen(false);
                }}
                className="w-full text-left p-3.5 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`h-10 w-10 rounded-xl ${act.color} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 group-hover:text-amber-800 transition">
                        {act.title}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                        {act.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{act.description}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition" />
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
          Tip: You can also search anything directly using the global search bar in the header.
        </div>
      </div>
    </div>
  );
}
