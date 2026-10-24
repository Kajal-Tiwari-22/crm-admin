import {
  Vehicle, Customer, Sale, ServiceRecord, EMISchedule,
  Reminder, Lead, SparePart, Supplier, PurchaseOrder,
  WarrantyInsurance, Expense, StaffUser, AuditLog, ShowroomSettings, InventoryBatch
} from '@/types/crm';
import {
  initialVehicles, initialCustomers, initialSales, initialServices,
  initialEMISchedules, initialReminders, initialLeads, initialSpareParts,
  initialSuppliers, initialPurchaseOrders, initialWarrantyInsurance,
  initialExpenses, initialStaff, initialAuditLogs, initialSettings
} from '@/data/seedData';

const STORAGE_KEY = 'EV_SHOWROOM_CRM_DB_CLEAN';

export interface CRMDatabase {
  vehicles: Vehicle[];
  inventoryBatches: InventoryBatch[];
  customers: Customer[];
  sales: Sale[];
  services: ServiceRecord[];
  emiSchedules: EMISchedule[];
  reminders: Reminder[];
  leads: Lead[];
  spareParts: SparePart[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  warrantyInsurance: WarrantyInsurance[];
  expenses: Expense[];
  staff: StaffUser[];
  auditLogs: AuditLog[];
  settings: ShowroomSettings;
}

export function getDefaultDatabase(): CRMDatabase {
  return {
    vehicles: [],
    inventoryBatches: [],
    customers: [],
    sales: [],
    services: [],
    emiSchedules: [],
    reminders: [],
    leads: [],
    spareParts: [],
    suppliers: [],
    purchaseOrders: [],
    warrantyInsurance: [],
    expenses: [],
    staff: initialStaff,
    auditLogs: [],
    settings: initialSettings
  };
}

export function getSampleDemoDatabase(): CRMDatabase {
  return {
    vehicles: initialVehicles,
    customers: initialCustomers,
    sales: initialSales,
    services: initialServices,
    emiSchedules: initialEMISchedules,
    reminders: initialReminders,
    leads: initialLeads,
    spareParts: initialSpareParts,
    suppliers: initialSuppliers,
    purchaseOrders: initialPurchaseOrders,
    warrantyInsurance: initialWarrantyInsurance,
    expenses: initialExpenses,
    staff: initialStaff,
    auditLogs: initialAuditLogs,
    settings: initialSettings
  };
}

export function loadDatabase(): CRMDatabase {
  if (typeof window === 'undefined') {
    return getDefaultDatabase();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const def = getDefaultDatabase();
      saveDatabase(def);
      return def;
    }
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultDatabase(),
      ...parsed
    };
  } catch (err) {
    console.error('Failed to load database from localStorage:', err);
    return getDefaultDatabase();
  }
}

export function saveDatabase(db: CRMDatabase): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Failed to save database to localStorage:', err);
  }
}

export function resetDatabaseToDefault(): CRMDatabase {
  const def = getDefaultDatabase();
  saveDatabase(def);
  return def;
}

export function loadSampleDemoData(): CRMDatabase {
  const demo = getSampleDemoDatabase();
  saveDatabase(demo);
  return demo;
}

// Formatters
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateTimeStr: string): string {
  if (!dateTimeStr) return 'N/A';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateTimeStr;
  }
}

// CSV Export Helper
export function exportToCSV(data: any[], filename: string): void {
  if (!data || !data.length) {
    alert('No data available to export.');
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(item =>
    headers.map(header => {
      const val = item[header];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
