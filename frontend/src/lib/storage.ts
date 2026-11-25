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

export type ImportableCRMCollection =
  | 'services'
  | 'emiSchedules'
  | 'reminders'
  | 'leads'
  | 'spareParts'
  | 'suppliers'
  | 'purchaseOrders'
  | 'warrantyInsurance'
  | 'expenses';

export type ImportedCRMRecord<K extends ImportableCRMCollection> = CRMDatabase[K][number];

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
    inventoryBatches: [],
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
  const escapeValue = (value: unknown) => {
    const text = value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = data.map(item =>
    headers.map(header => escapeValue(item[header])).join(',')
  );

  const csvContent = `\ufeff${[headers.map(escapeValue).join(','), ...rows].join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  const input = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (inQuotes) {
      if (character === '"' && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        value += character;
      }
    } else if (character === '"' && value.length === 0) {
      inQuotes = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (inQuotes) throw new Error('CSV contains an unclosed quoted field.');
  row.push(value);
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

export function parseCSVRecords<T extends { id: string }>(content: string, sample?: T): T[] {
  const rows = parseCSV(content);
  if (rows.length < 2) throw new Error('The CSV must include a header and at least one record.');

  const [headers, ...dataRows] = rows;
  const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!headers.some(header => normalizeHeader(header) === 'id')) {
    throw new Error('The CSV must include the id column from the module export.');
  }

  const numericColumns = new Set([
    'amount', 'amountdue', 'amountpaid', 'availableqty', 'batterywarrantymonths',
    'budget', 'currentstock', 'deliveryattempts', 'discount', 'downpayment',
    'duekm', 'exshowroomprice', 'financedamount', 'gstamount', 'interestannual',
    'interestrateannual', 'insuranceamount', 'labourcharge', 'minstocklevel',
    'monthlyemiamount', 'odometerreading', 'outstandingbalance', 'paidamount',
    'partscharge', 'paymentday', 'purchasecostperunit', 'quantity', 'registrationamount',
    'sellingprice', 'soldqty', 'taxamount', 'tenuremonths', 'totalamount',
    'totalcustomerpayable', 'totalfinancedamount', 'totalpaidamount', 'totalpurchased',
    'total', 'unitcost', 'unitprice', 'servicenumber'
  ]);
  const recordId = (row: string[], rowNumber: number): string => {
    const idIndex = headers.findIndex(header => normalizeHeader(header) === 'id');
    const id = (row[idIndex] || '').trim();
    if (!id) throw new Error(`Row ${rowNumber}: id is required. Export the module CSV first to get valid record IDs.`);
    return id;
  };

  return dataRows.map((row, rowIndex) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, columnIndex) => {
      const rawValue = row[columnIndex] ?? '';
      if (!rawValue.trim()) return;

      const sampleValue = sample ? Reflect.get(sample, header) : undefined;
      const normalizedHeader = normalizeHeader(header);
      let value: unknown = rawValue;

      if (normalizedHeader === 'servicenumber' && rawValue.trim().toLowerCase() === 'paid') {
        value = 'Paid';
      } else if (typeof sampleValue === 'number' || numericColumns.has(normalizedHeader)) {
        const parsedNumber = Number(rawValue.replace(/,/g, '').trim());
        if (!Number.isFinite(parsedNumber)) {
          throw new Error(`Row ${rowIndex + 2}: "${header}" must be a valid number.`);
        }
        value = parsedNumber;
      } else if (typeof sampleValue === 'boolean' || /^(true|false)$/i.test(rawValue.trim())) {
        const normalizedValue = rawValue.trim().toLowerCase();
        if (!['true', 'false'].includes(normalizedValue)) {
          throw new Error(`Row ${rowIndex + 2}: "${header}" must be true or false.`);
        }
        value = normalizedValue === 'true';
      } else if (
        (sampleValue !== null && typeof sampleValue === 'object') ||
        /^[\[{]/.test(rawValue.trim())
      ) {
        try {
          value = JSON.parse(rawValue);
        } catch {
          throw new Error(`Row ${rowIndex + 2}: "${header}" must contain valid JSON.`);
        }
      }

      record[header] = value;
    });

    record.id = recordId(row, rowIndex + 2);
    return record as T;
  });
}
