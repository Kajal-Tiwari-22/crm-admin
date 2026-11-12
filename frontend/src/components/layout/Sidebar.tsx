'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCRM } from '@/context/CRMContext';
import {
  LayoutDashboard,
  Bike,
  Users,
  ShoppingCart,
  Wrench,
  CreditCard,
  BellRing,
  UserCheck,
  Cpu,
  Truck,
  ShieldCheck,
  Receipt,
  BarChart3,
  Settings,
  Zap,
  AlertTriangle,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  const { kpis, settings, logoutAdmin } = useCRM();
  const pathname = usePathname();

  const navItems = [
    { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scooty', href: '/scooty', label: 'Scooty Inventory', icon: Bike, badge: kpis.availableStockCount, badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'customers', href: '/customers', label: 'Customers', icon: Users, badge: kpis.totalCustomersCount, badgeColor: 'bg-slate-100 text-slate-700' },
    { id: 'sales', href: '/sales', label: 'Sales & Deliveries', icon: ShoppingCart },
    { 
      id: 'services', 
      href: '/services',
      label: 'Services & Job Cards', 
      icon: Wrench, 
      badge: kpis.servicesDueCount + kpis.servicesOverdueCount > 0 ? `${kpis.servicesDueCount + kpis.servicesOverdueCount}` : undefined,
      badgeColor: kpis.servicesOverdueCount > 0 ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-amber-100 text-amber-800'
    },
    { 
      id: 'emi', 
      href: '/emi',
      label: 'EMI & Collections', 
      icon: CreditCard,
      badge: kpis.overdueEMICount > 0 ? `${kpis.overdueEMICount} Overdue` : undefined,
      badgeColor: 'bg-rose-100 text-rose-800'
    },
    { id: 'reminders', href: '/reminders', label: 'Reminders & Alerts', icon: BellRing },
    { id: 'leads', href: '/leads', label: 'Leads & Test Rides', icon: UserCheck, badge: kpis.activeLeadsCount, badgeColor: 'bg-blue-100 text-blue-800' },
    { 
      id: 'parts', 
      href: '/parts',
      label: 'Spare Parts & Stock', 
      icon: Cpu,
      badge: kpis.lowStockPartsCount > 0 ? `${kpis.lowStockPartsCount} Low` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { id: 'suppliers', href: '/suppliers', label: 'Suppliers & Purchases', icon: Truck },
    { id: 'warranty', href: '/warranty', label: 'Warranty & Insurance', icon: ShieldCheck },
    { id: 'expenses', href: '/expenses', label: 'Expenses & Accounts', icon: Receipt },
    { id: 'reports', href: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', href: '/settings', label: 'Staff & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 select-none z-30">
      {/* Brand Logo & Title (Fixed at Top) */}
      <div className="p-5 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Zap className="h-5 w-5 fill-white stroke-none" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
              MotorSHANDILYA <span className="text-amber-500">CRM</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Deen Dayak Tiwari · EV Showroom</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Dealership Management
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.id === 'dashboard' && pathname === '/') ||
            (item.id === 'scooty' && pathname === '/inventory');

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-amber-50 text-amber-900 shadow-xs border border-amber-200/60'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Fixed Bottom Section: Showroom Health & Logout Button */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/90 shrink-0 space-y-2">
        <div className="px-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="text-xs font-bold text-slate-800 truncate">{settings.branchName || 'Main EV Showroom'}</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">LIVE</span>
        </div>

        {/* Sticky Logout Button Fixed at Bottom */}
        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to sign out from the Showroom CRM?')) {
              logoutAdmin();
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 font-bold text-xs shadow-2xs transition-all active:scale-[0.98] cursor-pointer group"
          title="Sign Out from Showroom CRM"
        >
          <LogOut className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </aside>
  );
}
