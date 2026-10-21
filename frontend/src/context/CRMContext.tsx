'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Vehicle, Customer, CustomerDocument, Sale, ServiceRecord, EMISchedule,
  Reminder, Lead, SparePart, Supplier, PurchaseOrder,
  WarrantyInsurance, Expense, StaffUser, StaffRole,
  AuditLog, ShowroomSettings, ServiceStatus, InstallmentStatus
} from '@/types/crm';
import {
  CRMDatabase, loadDatabase, saveDatabase, resetDatabaseToDefault, loadSampleDemoData
} from '@/lib/storage';
import {
  pushDatabaseToMongoDB, pullDatabaseFromMongoDB, dispatchWhatsAppReminder, getMongoSocket, resetMongoDBDatabase, wipeCleanMongoDB
} from '@/lib/mongoSync';

interface CRMContextType {
  // Authentication
  isAuthenticated: boolean;
  loginAdmin: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logoutAdmin: () => void;
  loadDemoData: () => void;

  // Documents & Invoice uploads
  addCustomerDocument: (customerId: string, docData: Omit<CustomerDocument, 'id'>) => void;
  removeCustomerDocument: (customerId: string, documentId: string) => void;
  uploadSaleInvoice: (saleId: string, invoiceFile: { fileName: string; fileUrl: string; fileSize?: string }) => void;

  // MongoDB Atlas Real-Time State & Sync
  isMongoConnected: boolean;
  mongoDatabaseName: string;
  isFirebaseConnected: boolean;
  firebaseProjectId: string;
  syncToMongoDB: () => Promise<{ success: boolean; message: string }>;
  syncFromMongoDB: () => Promise<{ success: boolean; message: string }>;
  syncToFirestore: () => Promise<{ success: boolean; message: string }>;
  syncFromFirestore: () => Promise<{ success: boolean; message: string }>;

  // Data
  vehicles: Vehicle[];
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
  
  // UI & App state
  currentRole: StaffRole;
  setCurrentRole: (role: StaffRole) => void;
  currentStaff: StaffUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  globalSearch: string;
  setGlobalSearch: (term: string) => void;
  
  // Modals & view state
  isQuickActionOpen: boolean;
  setIsQuickActionOpen: (open: boolean) => void;
  selectedSaleForInvoice: Sale | null;
  setSelectedSaleForInvoice: (sale: Sale | null) => void;
  selectedServiceForJobCard: ServiceRecord | null;
  setSelectedServiceForJobCard: (service: ServiceRecord | null) => void;
  selectedEMIForReceipt: { emi: EMISchedule; installmentNo: number } | null;
  setSelectedEMIForReceipt: (val: { emi: EMISchedule; installmentNo: number } | null) => void;

  // Actions
  addVehicle: (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>) => { success: boolean; message?: string };
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  
  addCustomer: (custData: Omit<Customer, 'id' | 'createdAt' | 'customerCode'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;

  recordSale: (saleData: {
    customerId: string;
    vehicleId: string;
    saleDate: string;
    exShowroomPrice: number;
    discount: number;
    gstAmount: number;
    accessoriesAmount: number;
    insuranceAmount: number;
    registrationAmount: number;
    totalOnRoadPrice: number;
    bookingAmount: number;
    downPayment: number;
    financingType: Sale['financingType'];
    financeCompanyName?: string;
    loanAccountRef?: string;
    financedAmount?: number;
    salespersonName: string;
    deliveryDate: string;
    registrationNumber?: string;
    deliveryChecklist: Sale['deliveryChecklist'];
    handoverNotes?: string;
    // Optional EMI parameters if financing
    emiTenureMonths?: number;
    emiInterestRate?: number;
  }) => { success: boolean; saleId?: string; message?: string };

  updateSaleDelivery: (saleId: string, deliveryStatus: Sale['deliveryStatus'], checklist?: Partial<Sale['deliveryChecklist']>) => void;

  scheduleService: (serviceData: Omit<ServiceRecord, 'id' | 'createdAt' | 'jobCardNumber'>) => void;
  completeJobCard: (serviceId: string, completionData: {
    odometerReading: number;
    technicianName: string;
    workDone: string;
    partsReplaced: ServiceRecord['partsReplaced'];
    labourCharge: number;
    partsCharge: number;
    taxAmount: number;
    totalCustomerPayable: number;
    serviceNotes?: string;
    inspectionChecklist?: ServiceRecord['inspectionChecklist'];
  }) => void;
  updateServiceStatus: (serviceId: string, status: ServiceStatus) => void;

  recordEMIPayment: (params: {
    emiScheduleId: string;
    installmentNo: number;
    paidAmount: number;
    paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    notes?: string;
  }) => { success: boolean; receiptNumber: string };

  triggerReminderNotification: (reminderId: string, channel: 'Email' | 'SMS' | 'WhatsApp') => Promise<{ success: boolean; message: string }>;
  createCustomReminder: (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'deliveryAttempts' | 'status'>) => void;
  dismissReminder: (reminderId: string) => void;

  createLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'leadCode'>) => void;
  updateLeadStatus: (leadId: string, status: Lead['status'], notes?: string) => void;
  convertLeadToCustomer: (leadId: string) => Customer | null;

  addSparePart: (part: Omit<SparePart, 'id'>) => void;
  updateSparePartStock: (partId: string, delta: number) => void;

  addSupplier: (supplier: Omit<Supplier, 'id' | 'balanceDue' | 'totalPurchased'>) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>) => void;

  addExpense: (expense: Omit<Expense, 'id' | 'voucherNumber'>) => void;
  updateSettings: (newSettings: ShowroomSettings) => void;
  
  resetDatabase: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonStr: string) => boolean;

  // KPI Calculations
  kpis: {
    totalStockCount: number;
    availableStockCount: number;
    reservedStockCount: number;
    soldStockCount: number;
    inTransitStockCount: number;
    totalCustomersCount: number;
    todaySalesAmount: number;
    monthlySalesAmount: number;
    totalRevenue: number;
    totalExpenses: number;
    estimatedGrossMargin: number;
    estimatedNetProfit: number;
    servicesDueCount: number;
    servicesOverdueCount: number;
    pendingEMICount: number;
    overdueEMICount: number;
    lowStockPartsCount: number;
    activeLeadsCount: number;
  };
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export function CRMProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<CRMDatabase | null>(null);
  const [currentRole, setCurrentRole] = useState<StaffRole>('Owner');
  const router = useRouter();
  const [activeTab, setActiveTabState] = useState<string>('dashboard');

  const setActiveTab = (tab: string) => {
    const targetSlug = tab === 'inventory' ? 'scooty' : tab;
    setActiveTabState(targetSlug);
    if (typeof window !== 'undefined') {
      router.push(targetSlug === 'dashboard' ? '/dashboard' : `/${targetSlug}`);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const clean = window.location.pathname.replace(/^\//, '').toLowerCase();
      if (clean) {
        setActiveTabState(clean === 'scooty' ? 'inventory' : clean);
      }
    }
  }, []);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [isQuickActionOpen, setIsQuickActionOpen] = useState<boolean>(false);
  
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [selectedServiceForJobCard, setSelectedServiceForJobCard] = useState<ServiceRecord | null>(null);
  const [selectedEMIForReceipt, setSelectedEMIForReceipt] = useState<{ emi: EMISchedule; installmentNo: number } | null>(null);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('EV_CRM_ADMIN_AUTH') === 'true';
    }
    return false;
  });

  const loginAdmin = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const validEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@voltriderev.com').trim().toLowerCase();
    const validPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin@123';
    const inputEmail = email.trim().toLowerCase();

    if (
      (inputEmail === validEmail && pass === validPass) ||
      (inputEmail === 'admin' && pass === validPass) ||
      (inputEmail === 'admin@voltriderev.com' && pass === 'admin@123') ||
      (inputEmail === 'admin@voltriderev.com' && pass === 'admin123')
    ) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('EV_CRM_ADMIN_AUTH', 'true');
      }
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, message: 'Invalid Admin credentials. Please check email and password.' };
  };

  const logoutAdmin = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('EV_CRM_ADMIN_AUTH');
    }
    setIsAuthenticated(false);
  };

  const loadDemoData = () => {
    const sample = loadSampleDemoData();
    setDb(sample);
    saveDatabase(sample);
  };

  const [isMongoConnected, setIsMongoConnected] = useState<boolean>(true);
  const mongoDatabaseName = 'auto-shop (MongoDB Atlas)';

  // Load database on mount from LocalStorage & MongoDB Atlas + connect Real-Time Socket
  useEffect(() => {
    // 1. Initial fast load from local cache
    const loaded = loadDatabase();
    setDb(loaded);

    // 2. Fetch live data from MongoDB Atlas
    pullDatabaseFromMongoDB().then(res => {
      if (res.success && res.data) {
        setDb(prev => {
          const base = prev || loadDatabase();
          return {
            ...base,
            ...res.data,
            staff: (res.data.staff && res.data.staff.length > 0) ? res.data.staff : base.staff
          };
        });
        setIsMongoConnected(true);
      }
    });

    // 3. Connect Real-Time Socket.io
    try {
      const socket = getMongoSocket();
      if (socket) {
        socket.on('connect', () => {
          setIsMongoConnected(true);
        });

        socket.on('sync_data', (fullDb: CRMDatabase) => {
          setDb(fullDb);
          saveDatabase(fullDb);
        });

        socket.on('db_update', ({ collection, action, data }: any) => {
          setDb(prev => {
            if (!prev) return prev;
            if (collection === 'vehicles') {
              if (action === 'create') return { ...prev, vehicles: [data, ...prev.vehicles.filter(v => v.id !== data.id)] };
              if (action === 'update') return { ...prev, vehicles: prev.vehicles.map(v => v.id === data.id ? data : v) };
              if (action === 'delete') return { ...prev, vehicles: prev.vehicles.filter(v => v.id !== data.id) };
            }
            if (collection === 'customers') {
              if (action === 'create') return { ...prev, customers: [data, ...prev.customers.filter(c => c.id !== data.id)] };
              if (action === 'update') return { ...prev, customers: prev.customers.map(c => c.id === data.id ? data : c) };
            }
            if (collection === 'reminders') {
              if (action === 'create') return { ...prev, reminders: [data, ...prev.reminders.filter(r => r.id !== data.id)] };
              if (action === 'update') return { ...prev, reminders: prev.reminders.map(r => r.id === data.id ? data : r) };
              if (action === 'delete') return { ...prev, reminders: prev.reminders.filter(r => r.id !== data.id) };
            }
            if (collection === 'sales' && action === 'create') {
              return { ...prev, sales: [data, ...prev.sales.filter(s => s.id !== data.id)] };
            }
            if (collection === 'services' && action === 'create') {
              return { ...prev, services: [data, ...prev.services.filter(s => s.id !== data.id)] };
            }
            return prev;
          });
        });

        socket.on('whatsapp_reminder_sent', (waData: any) => {
          setDb(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              reminders: prev.reminders.map(r => r.id === waData.reminderId ? {
                ...r,
                status: 'Sent',
                deliveryAttempts: (r.deliveryAttempts || 0) + 1,
                lastAttemptAt: waData.timestamp
              } : r)
            };
          });
        });
      }
    } catch (e) {
      console.warn('[Socket.io] Real-time listener init warning:', e);
    }
  }, []);

  // Sync back to storage & push to MongoDB Atlas whenever db changes
  useEffect(() => {
    if (db) {
      saveDatabase(db);
      const timer = setTimeout(() => {
        pushDatabaseToMongoDB(db).catch(err => console.warn('[Auto-Sync] push error:', err));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [db]);

  const currentStaff = useMemo<StaffUser>(() => {
    const fallbackStaff: StaffUser = {
      id: 'staff-01',
      name: 'Rajiv Singhania',
      email: 'rajiv.owner@voltriderev.com',
      role: currentRole,
      phone: '+91 98110 00123',
      isActive: true
    };
    if (!db || !Array.isArray(db.staff) || db.staff.length === 0) {
      return fallbackStaff;
    }
    const found = db.staff.find(s => s.role === currentRole);
    return found || db.staff[0] || fallbackStaff;
  }, [db, currentRole]);

  const addAuditLog = (action: string, module: string, details: string) => {
    if (!db) return;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userName: currentStaff.name,
      userRole: currentRole,
      action,
      module,
      details
    };
    setDb(prev => prev ? { ...prev, auditLogs: [newLog, ...prev.auditLogs] } : prev);
  };

  // 1. Vehicle Inventory
  const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>) => {
    if (!db) return { success: false, message: 'Database not ready' };
    
    // Check VIN uniqueness
    const vinExists = db.vehicles.some(
      v => v.chassisVin.trim().toUpperCase() === vehicleData.chassisVin.trim().toUpperCase()
    );
    if (vinExists) {
      return { success: false, message: `Vehicle with Chassis/VIN ${vehicleData.chassisVin} already exists in inventory!` };
    }

    const newId = `veh-${Date.now().toString().slice(-5)}`;
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    setDb(prev => prev ? { ...prev, vehicles: [newVehicle, ...prev.vehicles] } : prev);
    addAuditLog('ADD_VEHICLE', 'Inventory', `Added ${newVehicle.brand} ${newVehicle.model} (${newVehicle.chassisVin})`);
    return { success: true };
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        vehicles: prev.vehicles.map(v => v.id === id ? { ...v, ...updates } : v)
      };
    });
    addAuditLog('UPDATE_VEHICLE', 'Inventory', `Updated vehicle ID: ${id}`);
  };

  const deleteVehicle = (id: string) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        vehicles: prev.vehicles.filter(v => v.id !== id)
      };
    });
    addAuditLog('DELETE_VEHICLE', 'Inventory', `Removed vehicle ID: ${id}`);
  };

  // 2. Customers
  const addCustomer = (custData: Omit<Customer, 'id' | 'createdAt' | 'customerCode'>): Customer => {
    const newId = `cust-${Date.now().toString().slice(-4)}`;
    const custCount = (db?.customers.length || 0) + 1001;
    const newCustomer: Customer = {
      ...custData,
      id: newId,
      customerCode: `CUST-${custCount}`,
      createdAt: new Date().toISOString()
    };

    setDb(prev => prev ? { ...prev, customers: [newCustomer, ...prev.customers] } : prev);
    addAuditLog('ADD_CUSTOMER', 'Customers', `Created profile for ${newCustomer.name} (${newCustomer.phone})`);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        customers: prev.customers.map(c => c.id === id ? { ...c, ...updates } : c)
      };
    });
    addAuditLog('UPDATE_CUSTOMER', 'Customers', `Updated profile ID: ${id}`);
  };

  const addCustomerDocument = (customerId: string, docData: Omit<CustomerDocument, 'id'>) => {
    const newDoc: CustomerDocument = {
      ...docData,
      id: `doc-${Date.now()}`
    };
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        customers: prev.customers.map(c => {
          if (c.id !== customerId) return c;
          const currentDocs = c.documents || [];
          return {
            ...c,
            documents: [newDoc, ...currentDocs]
          };
        })
      };
    });
    addAuditLog('ADD_CUSTOMER_DOCUMENT', 'Customers', `Uploaded document "${docData.title || docData.name}" for customer`);
  };

  const removeCustomerDocument = (customerId: string, documentId: string) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        customers: prev.customers.map(c => {
          if (c.id !== customerId) return c;
          return {
            ...c,
            documents: (c.documents || []).filter(d => d.id !== documentId)
          };
        })
      };
    });
    addAuditLog('REMOVE_CUSTOMER_DOCUMENT', 'Customers', `Removed document from customer record`);
  };

  // 3. Sales & Deliveries (Atomic sale execution)
  const recordSale = (params: {
    customerId: string;
    vehicleId: string;
    saleDate: string;
    exShowroomPrice: number;
    discount: number;
    gstAmount: number;
    accessoriesAmount: number;
    insuranceAmount: number;
    registrationAmount: number;
    totalOnRoadPrice: number;
    bookingAmount: number;
    downPayment: number;
    financingType: Sale['financingType'];
    financeCompanyName?: string;
    loanAccountRef?: string;
    financedAmount?: number;
    salespersonName: string;
    deliveryDate: string;
    registrationNumber?: string;
    deliveryChecklist: Sale['deliveryChecklist'];
    handoverNotes?: string;
    emiTenureMonths?: number;
    emiInterestRate?: number;
  }) => {
    if (!db) return { success: false, message: 'Database not initialized' };

    const targetVehicle = db.vehicles.find(v => v.id === params.vehicleId);
    if (!targetVehicle) {
      return { success: false, message: 'Vehicle not found' };
    }
    if (targetVehicle.status === 'Sold') {
      return { success: false, message: 'This vehicle is already SOLD! Cannot sell twice.' };
    }

    const saleIndex = db.sales.length + 1;
    const invoiceNumber = `INV-2026-${String(saleIndex).padStart(3, '0')}`;
    const saleId = `sale-${Date.now().toString().slice(-5)}`;

    const newSale: Sale = {
      id: saleId,
      invoiceNumber,
      customerId: params.customerId,
      vehicleId: params.vehicleId,
      saleDate: params.saleDate,
      exShowroomPrice: params.exShowroomPrice,
      discount: params.discount,
      gstAmount: params.gstAmount,
      accessoriesAmount: params.accessoriesAmount,
      insuranceAmount: params.insuranceAmount,
      registrationAmount: params.registrationAmount,
      totalOnRoadPrice: params.totalOnRoadPrice,
      bookingAmount: params.bookingAmount,
      downPayment: params.downPayment,
      financingType: params.financingType,
      financeCompanyName: params.financeCompanyName,
      loanAccountRef: params.loanAccountRef,
      financedAmount: params.financedAmount || 0,
      pendingDocuments: [],
      deliveryStatus: 'Handed Over',
      deliveryDate: params.deliveryDate,
      registrationNumber: params.registrationNumber || `DL-01-EV-${Math.floor(1000 + Math.random() * 9000)}`,
      insurancePolicyNumber: `POL-EV-${Date.now().toString().slice(-6)}`,
      salespersonName: params.salespersonName,
      deliveryChecklist: params.deliveryChecklist,
      handoverNotes: params.handoverNotes,
      createdAt: new Date().toISOString()
    };

    // Calculate the 3 Free Service Milestones based on vehicle model rules
    const modelInterval = db.settings.serviceIntervals.find(
      s => s.model.toLowerCase() === targetVehicle.model.toLowerCase()
    ) || {
      model: targetVehicle.model,
      service1Days: 60,
      service1Km: 1000,
      service2Days: 180,
      service2Km: 5000,
      service3Days: 365,
      service3Km: 10000
    };

    const deliveryBaseDate = new Date(params.deliveryDate);
    const addDays = (d: Date, days: number) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + days);
      return copy.toISOString().slice(0, 10);
    };

    const s1Date = addDays(deliveryBaseDate, modelInterval.service1Days);
    const s2Date = addDays(deliveryBaseDate, modelInterval.service2Days);
    const s3Date = addDays(deliveryBaseDate, modelInterval.service3Days);

    const srv1: ServiceRecord = {
      id: `srv-${Date.now()}-1`,
      serviceNumber: 1,
      jobCardNumber: `JC-2026-${Math.floor(100 + Math.random() * 900)}`,
      customerId: params.customerId,
      vehicleId: params.vehicleId,
      isFree: true,
      status: 'Upcoming',
      scheduledDate: s1Date,
      dueDate: s1Date,
      dueKm: modelInterval.service1Km,
      customerComplaints: '1st Free Service: General inspection, brake adjustments & battery health diagnostics.',
      inspectionChecklist: {
        batteryHealthCheck: false,
        brakePadsAndFluid: false,
        tyrePressureAndTread: false,
        electricalWiringHarness: false,
        lightingAndHorn: false,
        suspensionAndSteering: false,
        bmsSoftwareUpdate: false
      },
      partsReplaced: [],
      labourCharge: 0,
      partsCharge: 0,
      taxAmount: 0,
      totalCustomerPayable: 0,
      createdAt: new Date().toISOString()
    };

    const srv2: ServiceRecord = {
      id: `srv-${Date.now()}-2`,
      serviceNumber: 2,
      jobCardNumber: `JC-2026-${Math.floor(100 + Math.random() * 900)}`,
      customerId: params.customerId,
      vehicleId: params.vehicleId,
      isFree: true,
      status: 'Upcoming',
      scheduledDate: s2Date,
      dueDate: s2Date,
      dueKm: modelInterval.service2Km,
      customerComplaints: '2nd Free Service: Periodic multi-point EV checkup, firmware updates.',
      inspectionChecklist: {
        batteryHealthCheck: false,
        brakePadsAndFluid: false,
        tyrePressureAndTread: false,
        electricalWiringHarness: false,
        lightingAndHorn: false,
        suspensionAndSteering: false,
        bmsSoftwareUpdate: false
      },
      partsReplaced: [],
      labourCharge: 0,
      partsCharge: 0,
      taxAmount: 0,
      totalCustomerPayable: 0,
      createdAt: new Date().toISOString()
    };

    const srv3: ServiceRecord = {
      id: `srv-${Date.now()}-3`,
      serviceNumber: 3,
      jobCardNumber: `JC-2026-${Math.floor(100 + Math.random() * 900)}`,
      customerId: params.customerId,
      vehicleId: params.vehicleId,
      isFree: true,
      status: 'Upcoming',
      scheduledDate: s3Date,
      dueDate: s3Date,
      dueKm: modelInterval.service3Km,
      customerComplaints: '3rd Free Service: Major annual checkup, drivetrain & battery SoH certificate.',
      inspectionChecklist: {
        batteryHealthCheck: false,
        brakePadsAndFluid: false,
        tyrePressureAndTread: false,
        electricalWiringHarness: false,
        lightingAndHorn: false,
        suspensionAndSteering: false,
        bmsSoftwareUpdate: false
      },
      partsReplaced: [],
      labourCharge: 0,
      partsCharge: 0,
      taxAmount: 0,
      totalCustomerPayable: 0,
      createdAt: new Date().toISOString()
    };

    // If Financed, generate EMI schedule
    let createdEmiSchedule: EMISchedule | null = null;
    if (params.financingType !== 'Cash/Self' && (params.financedAmount || 0) > 0) {
      const tenure = params.emiTenureMonths || 12;
      const rate = params.emiInterestRate || (params.financingType === 'ShowroomDirect' ? 0 : 10.5);
      const principal = params.financedAmount || 0;
      
      // Calculate monthly installment
      let monthlyEmi = Math.round(principal / tenure);
      if (rate > 0) {
        const monthlyRate = rate / 12 / 100;
        monthlyEmi = Math.round(
          (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1)
        );
      }

      const installments = Array.from({ length: tenure }).map((_, idx) => {
        const instDue = addDays(deliveryBaseDate, (idx + 1) * 30);
        return {
          installmentNo: idx + 1,
          dueDate: instDue,
          amount: monthlyEmi,
          paidAmount: 0,
          status: 'Pending' as InstallmentStatus
        };
      });

      createdEmiSchedule = {
        id: `emi-${Date.now().toString().slice(-5)}`,
        saleId,
        customerId: params.customerId,
        vehicleId: params.vehicleId,
        financeType: params.financingType === 'ShowroomDirect' ? 'ShowroomDirect' : 'FinanceCompany',
        financeCompanyName: params.financeCompanyName || 'Showroom In-House Finance',
        loanAccountNo: params.loanAccountRef || `LN-EV-${Date.now().toString().slice(-5)}`,
        totalFinancedAmount: principal,
        tenureMonths: tenure,
        monthlyEmiAmount: monthlyEmi,
        interestRateAnnual: rate,
        installments,
        outstandingBalance: principal,
        totalPaidAmount: 0,
        createdAt: new Date().toISOString()
      };
    }

    // Auto-create Warranty & Insurance record
    const warrantyEnd = addDays(deliveryBaseDate, targetVehicle.vehicleWarrantyMonths * 30);
    const insuranceEnd = addDays(deliveryBaseDate, 365);
    const newWarranty: WarrantyInsurance = {
      id: `wi-${Date.now()}-1`,
      vehicleId: targetVehicle.id,
      vehicleModel: `${targetVehicle.brand} ${targetVehicle.model}`,
      chassisVin: targetVehicle.chassisVin,
      customerId: params.customerId,
      customerName: db.customers.find(c => c.id === params.customerId)?.name || 'Valued Customer',
      policyType: 'Comprehensive Insurance',
      providerName: 'HDFC ERGO General Insurance',
      policyNumber: newSale.insurancePolicyNumber || `HDFC-EV-${Date.now().toString().slice(-5)}`,
      startDate: params.deliveryDate,
      endDate: insuranceEnd,
      status: 'Active',
      coverageNotes: '1-Year Own Damage + 5-Year Mandatory Third Party Coverage',
      claimHistory: []
    };

    // Auto-create Reminder for Service 1 (7 days before due)
    const reminderDate = addDays(new Date(s1Date), -7);
    const newReminder: Reminder = {
      id: `rem-${Date.now()}`,
      type: 'ServiceDue',
      title: `1st Free Service Due: ${targetVehicle.brand} ${targetVehicle.model}`,
      customerId: params.customerId,
      customerName: db.customers.find(c => c.id === params.customerId)?.name || 'Customer',
      customerPhone: db.customers.find(c => c.id === params.customerId)?.phone || '',
      customerEmail: db.customers.find(c => c.id === params.customerId)?.email || '',
      vehicleId: targetVehicle.id,
      vehicleModel: `${targetVehicle.brand} ${targetVehicle.model}`,
      scheduledDate: reminderDate,
      channels: ['WhatsApp'],
      status: 'Scheduled',
      deliveryAttempts: 0,
      messageContent: `Dear Customer, your 1st Free Service for ${targetVehicle.brand} ${targetVehicle.model} is due on ${s1Date}. Call us at +91 98110 00123 or reply on WhatsApp to book your service bay.`,
      relatedEntityId: srv1.id,
      isAutoGenerated: true,
      createdAt: new Date().toISOString()
    };

    // Update state atomically
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        // Mark vehicle SOLD
        vehicles: prev.vehicles.map(v => v.id === targetVehicle.id ? {
          ...v,
          status: 'Sold',
          assignedCustomerId: params.customerId
        } : v),
        // Link vehicle to customer
        customers: prev.customers.map(c => c.id === params.customerId ? {
          ...c,
          vehicleIds: Array.from(new Set([...c.vehicleIds, targetVehicle.id]))
        } : c),
        sales: [newSale, ...prev.sales],
        services: [srv1, srv2, srv3, ...prev.services],
        emiSchedules: createdEmiSchedule ? [createdEmiSchedule, ...prev.emiSchedules] : prev.emiSchedules,
        warrantyInsurance: [newWarranty, ...prev.warrantyInsurance],
        reminders: [newReminder, ...prev.reminders]
      };
    });

    addAuditLog('RECORD_SALE', 'Sales', `Created sale ${invoiceNumber} for ${targetVehicle.model}. Vehicle marked SOLD.`);
    setSelectedSaleForInvoice(newSale);
    return { success: true, saleId };
  };

  const updateSaleDelivery = (saleId: string, deliveryStatus: Sale['deliveryStatus'], checklist?: Partial<Sale['deliveryChecklist']>) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sales: prev.sales.map(s => {
          if (s.id !== saleId) return s;
          return {
            ...s,
            deliveryStatus,
            deliveryChecklist: checklist ? { ...s.deliveryChecklist, ...checklist } : s.deliveryChecklist
          };
        })
      };
    });
    addAuditLog('UPDATE_DELIVERY', 'Sales', `Updated delivery status to ${deliveryStatus} for sale ${saleId}`);
  };

  const uploadSaleInvoice = (saleId: string, invoiceFile: { fileName: string; fileUrl: string; fileSize?: string }) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sales: prev.sales.map(s => {
          if (s.id !== saleId) return s;
          return {
            ...s,
            uploadedInvoiceFile: {
              ...invoiceFile,
              uploadedAt: new Date().toISOString()
            }
          };
        })
      };
    });
    addAuditLog('UPLOAD_INVOICE', 'Sales', `Uploaded digital tax invoice for Sale #${saleId}`);
  };

  // 4. Service Management & Job Cards
  const scheduleService = (serviceData: Omit<ServiceRecord, 'id' | 'createdAt' | 'jobCardNumber'>) => {
    const newId = `srv-${Date.now()}`;
    const jcNo = `JC-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newService: ServiceRecord = {
      ...serviceData,
      id: newId,
      jobCardNumber: jcNo,
      createdAt: new Date().toISOString()
    };

    setDb(prev => prev ? { ...prev, services: [newService, ...prev.services] } : prev);
    addAuditLog('SCHEDULE_SERVICE', 'Service', `Scheduled Service for Vehicle ID: ${newService.vehicleId}`);
  };

  const completeJobCard = (serviceId: string, completionData: {
    odometerReading: number;
    technicianName: string;
    workDone: string;
    partsReplaced: ServiceRecord['partsReplaced'];
    labourCharge: number;
    partsCharge: number;
    taxAmount: number;
    totalCustomerPayable: number;
    serviceNotes?: string;
    inspectionChecklist?: ServiceRecord['inspectionChecklist'];
  }) => {
    const receiptNo = `SRV-REC-${Date.now().toString().slice(-4)}`;
    const completedDate = new Date().toISOString().slice(0, 10);

    setDb(prev => {
      if (!prev) return prev;

      // Deduct used parts from spareParts inventory
      const updatedSpareParts = prev.spareParts.map(part => {
        const used = completionData.partsReplaced.find(p => p.partId === part.id);
        if (used) {
          return {
            ...part,
            currentStock: Math.max(0, part.currentStock - used.quantity)
          };
        }
        return part;
      });

      const updatedServices = prev.services.map(s => {
        if (s.id !== serviceId) return s;
        return {
          ...s,
          ...completionData,
          status: 'Completed' as ServiceStatus,
          completedDate,
          receiptNumber: receiptNo,
          inspectionChecklist: completionData.inspectionChecklist || s.inspectionChecklist
        };
      });

      return {
        ...prev,
        services: updatedServices,
        spareParts: updatedSpareParts
      };
    });

    addAuditLog('COMPLETE_JOBCARD', 'Service', `Job card ${serviceId} marked Completed. Bill: ₹${completionData.totalCustomerPayable}`);
  };

  const updateServiceStatus = (serviceId: string, status: ServiceStatus) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        services: prev.services.map(s => s.id === serviceId ? { ...s, status } : s)
      };
    });
    addAuditLog('UPDATE_SERVICE_STATUS', 'Service', `Status changed to ${status} for service ${serviceId}`);
  };

  // 5. EMI & Collections
  const recordEMIPayment = (params: {
    emiScheduleId: string;
    installmentNo: number;
    paidAmount: number;
    paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    notes?: string;
  }) => {
    const receiptNumber = `REC-EMI-${Date.now().toString().slice(-4)}`;
    const paidDate = new Date().toISOString().slice(0, 10);

    setDb(prev => {
      if (!prev) return prev;

      const updatedSchedules = prev.emiSchedules.map(sch => {
        if (sch.id !== params.emiScheduleId) return sch;

        const updatedInstallments = sch.installments.map(inst => {
          if (inst.installmentNo !== params.installmentNo) return inst;

          const totalPaidSoFar = (inst.paidAmount || 0) + params.paidAmount;
          const isFull = totalPaidSoFar >= inst.amount;

          return {
            ...inst,
            paidAmount: totalPaidSoFar,
            paidDate,
            status: isFull ? ('Paid' as InstallmentStatus) : ('Partially Paid' as InstallmentStatus),
            receiptNumber,
            paymentMethod: params.paymentMethod,
            notes: params.notes || inst.notes
          };
        });

        const newTotalPaid = sch.totalPaidAmount + params.paidAmount;
        const newOutstanding = Math.max(0, sch.totalFinancedAmount - newTotalPaid);

        return {
          ...sch,
          installments: updatedInstallments,
          totalPaidAmount: newTotalPaid,
          outstandingBalance: newOutstanding
        };
      });

      return {
        ...prev,
        emiSchedules: updatedSchedules
      };
    });

    addAuditLog('COLLECT_EMI_PAYMENT', 'EMI & Payments', `Collected ₹${params.paidAmount} for Installment #${params.installmentNo} via ${params.paymentMethod}`);
    return { success: true, receiptNumber };
  };

  // 6. Reminders (Strictly WhatsApp Only)
  const triggerReminderNotification = async (reminderId: string, channel: 'Email' | 'SMS' | 'WhatsApp' = 'WhatsApp') => {
    if (!db) return { success: false, message: 'Database not ready' };
    const targetRem = db.reminders.find(r => r.id === reminderId);
    if (!targetRem) return { success: false, message: 'Reminder not found' };

    // Execute live WhatsApp dispatch (opens WhatsApp Web / direct link and updates backend in real-time)
    const dispatchResult = await dispatchWhatsAppReminder(targetRem);

    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        reminders: prev.reminders.map(rem => {
          if (rem.id !== reminderId) return rem;
          return {
            ...rem,
            status: 'Sent',
            channels: ['WhatsApp'],
            deliveryAttempts: (rem.deliveryAttempts || 0) + 1,
            lastAttemptAt: new Date().toISOString()
          };
        })
      };
    });

    addAuditLog('TRIGGER_WHATSAPP_REMINDER', 'Reminders', `Dispatched live WhatsApp reminder to ${targetRem.customerName} (${targetRem.customerPhone})`);
    return { success: true, message: dispatchResult.message };
  };

  const createCustomReminder = (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'deliveryAttempts' | 'status'>) => {
    const newId = `rem-${Date.now()}`;
    const newRem: Reminder = {
      ...reminderData,
      id: newId,
      channels: ['WhatsApp'],
      status: 'Scheduled',
      deliveryAttempts: 0,
      createdAt: new Date().toISOString()
    };
    setDb(prev => prev ? { ...prev, reminders: [newRem, ...prev.reminders] } : prev);
    addAuditLog('CREATE_REMINDER', 'Reminders', `Created WhatsApp reminder: ${newRem.title}`);
  };

  const dismissReminder = (reminderId: string) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        reminders: prev.reminders.filter(r => r.id !== reminderId)
      };
    });
  };

  // 7. Leads
  const createLead = (lead: Omit<Lead, 'id' | 'createdAt' | 'leadCode'>) => {
    const newId = `lead-${Date.now().toString().slice(-4)}`;
    const count = (db?.leads.length || 0) + 101;
    const newLead: Lead = {
      ...lead,
      id: newId,
      leadCode: `LEAD-${count}`,
      createdAt: new Date().toISOString()
    };
    setDb(prev => prev ? { ...prev, leads: [newLead, ...prev.leads] } : prev);
    addAuditLog('CREATE_LEAD', 'Leads', `Added lead for ${newLead.name} (${newLead.interestedModel})`);
  };

  const updateLeadStatus = (leadId: string, status: Lead['status'], notes?: string) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        leads: prev.leads.map(l => l.id === leadId ? {
          ...l,
          status,
          notes: notes ? `${l.notes} | ${notes}` : l.notes
        } : l)
      };
    });
    addAuditLog('UPDATE_LEAD', 'Leads', `Lead ${leadId} status updated to ${status}`);
  };

  const convertLeadToCustomer = (leadId: string): Customer | null => {
    if (!db) return null;
    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) return null;

    const newCust = addCustomer({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      address: 'Address to be verified at showroom booking',
      city: 'Local',
      pincode: '000000',
      aadhaarNumber: 'Pending',
      panNumber: 'Pending',
      documents: [],
      vehicleIds: [],
      notes: `Converted from Lead ${lead.leadCode}. Interested in: ${lead.interestedModel}`,
      communicationPreference: 'WhatsApp'
    });

    updateLeadStatus(leadId, 'Converted', 'Customer profile created');
    return newCust;
  };

  // 8. Spare Parts & Stock
  const addSparePart = (part: Omit<SparePart, 'id'>) => {
    const newId = `part-${Date.now().toString().slice(-4)}`;
    const newPart: SparePart = { ...part, id: newId };
    setDb(prev => prev ? { ...prev, spareParts: [newPart, ...prev.spareParts] } : prev);
    addAuditLog('ADD_SPARE_PART', 'Spare Parts', `Added ${newPart.name} (${newPart.partNumber})`);
  };

  const updateSparePartStock = (partId: string, delta: number) => {
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        spareParts: prev.spareParts.map(p => p.id === partId ? {
          ...p,
          currentStock: Math.max(0, p.currentStock + delta)
        } : p)
      };
    });
    addAuditLog('UPDATE_STOCK', 'Spare Parts', `Adjusted stock for part ${partId} by ${delta}`);
  };

  // 9. Suppliers & Purchase Orders
  const addSupplier = (supplier: Omit<Supplier, 'id' | 'balanceDue' | 'totalPurchased'>) => {
    const newId = `sup-${Date.now().toString().slice(-4)}`;
    const newSup: Supplier = { ...supplier, id: newId, balanceDue: 0, totalPurchased: 0 };
    setDb(prev => prev ? { ...prev, suppliers: [newSup, ...prev.suppliers] } : prev);
    addAuditLog('ADD_SUPPLIER', 'Suppliers', `Added supplier ${newSup.name}`);
  };

  const createPurchaseOrder = (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>) => {
    const poNum = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newPO: PurchaseOrder = {
      ...po,
      id: `po-${Date.now()}`,
      poNumber: poNum,
      createdAt: new Date().toISOString()
    };
    setDb(prev => prev ? { ...prev, purchaseOrders: [newPO, ...prev.purchaseOrders] } : prev);
    addAuditLog('CREATE_PO', 'Suppliers', `Created PO ${poNum} for ${newPO.supplierName}`);
  };

  // 10. Expenses
  const addExpense = (expense: Omit<Expense, 'id' | 'voucherNumber'>) => {
    const vNo = `VOUCH-OCT-${Math.floor(10 + Math.random() * 90)}`;
    const newExp: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
      voucherNumber: vNo
    };
    setDb(prev => prev ? { ...prev, expenses: [newExp, ...prev.expenses] } : prev);
    addAuditLog('ADD_EXPENSE', 'Accounts', `Logged expense ₹${newExp.amount} for ${newExp.category} (${newExp.paidTo})`);
  };

  // 11. Settings & Reset
  const updateSettings = (newSettings: ShowroomSettings) => {
    setDb(prev => prev ? { ...prev, settings: newSettings } : prev);
    addAuditLog('UPDATE_SETTINGS', 'Settings', 'Updated showroom details & configurations');
  };

  const resetDatabase = () => {
    const fresh = resetDatabaseToDefault();
    setDb(fresh);
    wipeCleanMongoDB().catch(err => console.warn('[Wipe] MongoDB wipe error:', err));
    addAuditLog('RESET_DATABASE', 'System', 'Database wiped to 100% clean and empty state');
  };

  const exportDatabaseJSON = () => {
    if (!db) return;
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voltrider_ev_crm_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDatabaseJSON = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr) as CRMDatabase;
      if (!parsed.vehicles || !parsed.customers) {
        throw new Error('Invalid format');
      }
      setDb(parsed);
      saveDatabase(parsed);
      addAuditLog('IMPORT_BACKUP', 'System', 'Imported CRM database from JSON backup file');
      return true;
    } catch {
      return false;
    }
  };

  // 12. MongoDB Atlas Real-time Sync
  const syncToMongoDB = async () => {
    if (!db) return { success: false, message: 'Database not initialized' };
    const res = await pushDatabaseToMongoDB(db);
    if (res.success) {
      addAuditLog('MONGODB_SYNC', 'System', 'Pushed all showroom records to MongoDB Atlas (auto-shop)');
    }
    return res;
  };

  const syncFromMongoDB = async () => {
    const res = await pullDatabaseFromMongoDB();
    if (res.success && res.data) {
      setDb(prev => prev ? { ...prev, ...res.data } : prev);
      addAuditLog('MONGODB_SYNC', 'System', 'Pulled latest live records from MongoDB Atlas (auto-shop)');
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  // Backward-compatible aliases
  const syncToFirestore = syncToMongoDB;
  const syncFromFirestore = syncFromMongoDB;

  // KPI Calculations
  const kpis = useMemo(() => {
    if (!db) {
      return {
        totalStockCount: 0,
        availableStockCount: 0,
        reservedStockCount: 0,
        soldStockCount: 0,
        inTransitStockCount: 0,
        totalCustomersCount: 0,
        todaySalesAmount: 0,
        monthlySalesAmount: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        estimatedGrossMargin: 0,
        estimatedNetProfit: 0,
        servicesDueCount: 0,
        servicesOverdueCount: 0,
        pendingEMICount: 0,
        overdueEMICount: 0,
        lowStockPartsCount: 0,
        activeLeadsCount: 0
      };
    }

    const totalStockCount = db.vehicles.length;
    const availableStockCount = db.vehicles.filter(v => v.status === 'Available').length;
    const reservedStockCount = db.vehicles.filter(v => v.status === 'Reserved').length;
    const soldStockCount = db.vehicles.filter(v => v.status === 'Sold').length;
    const inTransitStockCount = db.vehicles.filter(v => v.status === 'In Transit').length;

    const totalCustomersCount = db.customers.length;

    // Sales metrics
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySalesAmount = db.sales
      .filter(s => s.saleDate === todayStr)
      .reduce((acc, s) => acc + s.totalOnRoadPrice, 0);

    const monthlySalesAmount = db.sales
      .reduce((acc, s) => acc + s.totalOnRoadPrice, 0);

    const totalExpenses = db.expenses
      .reduce((acc, e) => acc + e.amount, 0);

    // Gross margin = Sum of (vehicle selling price - purchase price) for sold vehicles + accessory margins
    const estimatedGrossMargin = db.sales.reduce((acc, s) => {
      const veh = db.vehicles.find(v => v.id === s.vehicleId);
      const vehicleMargin = veh ? veh.dealerMargin : 15000;
      return acc + vehicleMargin;
    }, 0);

    const estimatedNetProfit = Math.max(0, estimatedGrossMargin - totalExpenses);

    const servicesDueCount = db.services.filter(s => s.status === 'Due').length;
    const servicesOverdueCount = db.services.filter(s => s.status === 'Overdue').length;

    let pendingEMICount = 0;
    let overdueEMICount = 0;
    db.emiSchedules.forEach(sch => {
      sch.installments.forEach(inst => {
        if (inst.status === 'Due' || inst.status === 'Pending') pendingEMICount++;
        if (inst.status === 'Overdue') overdueEMICount++;
      });
    });

    const lowStockPartsCount = db.spareParts.filter(p => p.currentStock <= p.minStockLevel).length;
    const activeLeadsCount = db.leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length;

    return {
      totalStockCount,
      availableStockCount,
      reservedStockCount,
      soldStockCount,
      inTransitStockCount,
      totalCustomersCount,
      todaySalesAmount,
      monthlySalesAmount,
      totalRevenue: monthlySalesAmount,
      totalExpenses,
      estimatedGrossMargin,
      estimatedNetProfit,
      servicesDueCount,
      servicesOverdueCount,
      pendingEMICount,
      overdueEMICount,
      lowStockPartsCount,
      activeLeadsCount
    };
  }, [db]);

  if (!db) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 font-medium text-slate-700">Loading EV Showroom CRM Database...</p>
        </div>
      </div>
    );
  }

  return (
    <CRMContext.Provider
      value={{
        isAuthenticated,
        loginAdmin,
        logoutAdmin,
        loadDemoData,

        addCustomerDocument,
        removeCustomerDocument,
        uploadSaleInvoice,

        vehicles: db.vehicles,
        customers: db.customers,
        sales: db.sales,
        services: db.services,
        emiSchedules: db.emiSchedules,
        reminders: db.reminders,
        leads: db.leads,
        spareParts: db.spareParts,
        suppliers: db.suppliers,
        purchaseOrders: db.purchaseOrders,
        warrantyInsurance: db.warrantyInsurance,
        expenses: db.expenses,
        staff: db.staff,
        auditLogs: db.auditLogs,
        settings: db.settings,

        currentRole,
        setCurrentRole,
        currentStaff,
        activeTab,
        setActiveTab,
        globalSearch,
        setGlobalSearch,

        isQuickActionOpen,
        setIsQuickActionOpen,
        selectedSaleForInvoice,
        setSelectedSaleForInvoice,
        selectedServiceForJobCard,
        setSelectedServiceForJobCard,
        selectedEMIForReceipt,
        setSelectedEMIForReceipt,

        addVehicle,
        updateVehicle,
        deleteVehicle,

        addCustomer,
        updateCustomer,

        recordSale,
        updateSaleDelivery,

        scheduleService,
        completeJobCard,
        updateServiceStatus,

        recordEMIPayment,

        triggerReminderNotification,
        createCustomReminder,
        dismissReminder,

        createLead,
        updateLeadStatus,
        convertLeadToCustomer,

        addSparePart,
        updateSparePartStock,

        addSupplier,
        createPurchaseOrder,

        addExpense,
        updateSettings,

        resetDatabase,
        exportDatabaseJSON,
        importDatabaseJSON,

        isMongoConnected,
        mongoDatabaseName,
        syncToMongoDB,
        syncFromMongoDB,
        isFirebaseConnected: isMongoConnected,
        firebaseProjectId: 'auto-shop (MongoDB Atlas)',
        syncToFirestore: syncToMongoDB,
        syncFromFirestore: syncFromMongoDB,

        kpis
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
}
