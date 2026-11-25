'use client';

import React, { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCRM } from '@/context/CRMContext';
import { Expense, EMISchedule, Lead, Reminder, ServiceRecord, SparePart, Supplier, PurchaseOrder, WarrantyInsurance } from '@/types/crm';
import { exportToCSV, parseCSVRecords } from '@/lib/storage';
import { Download, Upload } from 'lucide-react';

type CsvCollection =
  | 'services'
  | 'emiSchedules'
  | 'reminders'
  | 'leads'
  | 'spareParts'
  | 'suppliers'
  | 'purchaseOrders'
  | 'warrantyInsurance'
  | 'expenses';

interface CsvConfig {
  collection: CsvCollection;
  data: { id: string }[];
  filename: string;
  label: string;
  exportInPage: boolean;
}

export default function ModuleDataTransfer() {
  const pathname = usePathname();
  const {
    exportDatabaseJSON,
    importDatabaseJSON,
    importModuleRecords,
    services,
    emiSchedules,
    reminders,
    leads,
    spareParts,
    suppliers,
    purchaseOrders,
    warrantyInsurance,
    expenses
  } = useCRM();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [supplierDataset, setSupplierDataset] = useState<'suppliers' | 'purchaseOrders'>('suppliers');

  const route = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  let csvConfig: CsvConfig | null = null;
  switch (route) {
    case 'services':
      csvConfig = { collection: 'services', data: services, filename: 'Services_Job_Cards', label: 'Service records', exportInPage: true };
      break;
    case 'emi':
      csvConfig = { collection: 'emiSchedules', data: emiSchedules, filename: 'EMI_Schedules', label: 'EMI schedules', exportInPage: true };
      break;
    case 'reminders':
      csvConfig = { collection: 'reminders', data: reminders, filename: 'CRM_Reminders', label: 'Reminders', exportInPage: false };
      break;
    case 'leads':
      csvConfig = { collection: 'leads', data: leads, filename: 'Leads_Enquiries_Report', label: 'Leads', exportInPage: true };
      break;
    case 'parts':
      csvConfig = { collection: 'spareParts', data: spareParts, filename: 'Spare_Parts_Inventory_Report', label: 'Spare parts', exportInPage: true };
      break;
    case 'suppliers':
      csvConfig = supplierDataset === 'suppliers'
        ? { collection: 'suppliers', data: suppliers, filename: 'Suppliers_Directory', label: 'Suppliers', exportInPage: false }
        : { collection: 'purchaseOrders', data: purchaseOrders, filename: 'Purchase_Orders', label: 'Purchase orders', exportInPage: false };
      break;
    case 'warranty':
      csvConfig = { collection: 'warrantyInsurance', data: warrantyInsurance, filename: 'Warranty_Insurance_Policies', label: 'Warranty and insurance records', exportInPage: true };
      break;
    case 'expenses':
      csvConfig = { collection: 'expenses', data: expenses, filename: 'Operating_Expenses_Report', label: 'Expenses', exportInPage: true };
      break;
  }

  const handlesOwnTransfer = ['scooty', 'inventory', 'customers', 'sales', 'settings'].includes(route);
  if (handlesOwnTransfer) return null;

  const importCsv = async (collection: CsvCollection, content: string) => {
    switch (collection) {
      case 'services':
        return importModuleRecords('services', parseCSVRecords<ServiceRecord>(content, services[0]));
      case 'emiSchedules':
        return importModuleRecords('emiSchedules', parseCSVRecords<EMISchedule>(content, emiSchedules[0]));
      case 'reminders':
        return importModuleRecords('reminders', parseCSVRecords<Reminder>(content, reminders[0]));
      case 'leads':
        return importModuleRecords('leads', parseCSVRecords<Lead>(content, leads[0]));
      case 'spareParts':
        return importModuleRecords('spareParts', parseCSVRecords<SparePart>(content, spareParts[0]));
      case 'suppliers':
        return importModuleRecords('suppliers', parseCSVRecords<Supplier>(content, suppliers[0]));
      case 'purchaseOrders':
        return importModuleRecords('purchaseOrders', parseCSVRecords<PurchaseOrder>(content, purchaseOrders[0]));
      case 'warrantyInsurance':
        return importModuleRecords('warrantyInsurance', parseCSVRecords<WarrantyInsurance>(content, warrantyInsurance[0]));
      case 'expenses':
        return importModuleRecords('expenses', parseCSVRecords<Expense>(content, expenses[0]));
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setMessage('');
    try {
      if (csvConfig) {
        const content = await file.text();
        if (!window.confirm(`Import ${csvConfig.label} from this CSV? New records will be added; duplicate IDs will be skipped.`)) return;
        const result = await importCsv(csvConfig.collection, content);
        setMessage(result.message);
        setMessageType(result.success ? 'success' : 'error');
      } else {
        if (!window.confirm('Restore this full CRM backup? Current CRM data will be replaced.')) return;
        const result = await importDatabaseJSON(await file.text());
        setMessage(result.message);
        setMessageType(result.success ? 'success' : 'error');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not import this file.');
      setMessageType('error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    if (csvConfig) {
      exportToCSV(csvConfig.data, csvConfig.filename);
      return;
    }
    exportDatabaseJSON();
  };

  return (
    <section
      aria-label="CRM data import and export"
      className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-4"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-800">
          {csvConfig
            ? `${csvConfig.label} ${csvConfig.exportInPage ? 'Import' : 'Import / Export'}`
            : 'CRM Backup Import / Export'}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {csvConfig
            ? `CSV import adds records and skips IDs already in the CRM.${csvConfig.exportInPage ? " Use this module's Export CSV button to download records." : ''}`
            : 'Download or restore a complete JSON backup.'}
        </p>
        {route === 'suppliers' && (
          <label className="mt-2 flex max-w-xs items-center gap-2 text-[11px] font-semibold text-slate-600">
            Data list
            <select
              value={supplierDataset}
              onChange={event => {
                setSupplierDataset(event.target.value === 'purchaseOrders' ? 'purchaseOrders' : 'suppliers');
                setMessage('');
              }}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
            >
              <option value="suppliers">Suppliers</option>
              <option value="purchaseOrders">Purchase orders</option>
            </select>
          </label>
        )}
        {message && (
          <p
            role="status"
            className={`mt-1 text-[11px] font-medium ${messageType === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}
          >
            {message}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept={csvConfig ? '.csv,text/csv' : '.json,application/json'}
          className="hidden"
          onChange={handleImport}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
        >
          <Upload className="h-4 w-4" />
          {isImporting ? 'Importing...' : csvConfig ? 'Import CSV' : 'Import Backup'}
        </button>
        {(!csvConfig || !csvConfig.exportInPage) && (
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 sm:flex-none"
          >
            <Download className="h-4 w-4" />
            {csvConfig ? 'Export CSV' : 'Export Backup'}
          </button>
        )}
      </div>
    </section>
  );
}
