export type VehicleStatus = 'Available' | 'Reserved' | 'Sold' | 'In Transit' | 'Returned';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  variant: string;
  color: string;
  chassisVin: string;
  motorNumber: string;
  batterySerial: string;
  batteryCapacityKwh: number;
  certifiedRangeKm: number;
  purchasePrice: number; // Ex-dealer cost
  gstRate: number; // e.g. 5% for EVs in India
  gstAmount: number;
  sellingPrice: number; // Ex-showroom price
  dealerMargin: number;
  purchaseDate: string;
  supplierId: string;
  supplierInvoiceNo: string;
  status: VehicleStatus;
  batteryWarrantyMonths: number;
  vehicleWarrantyMonths: number;
  stockAgeDays: number;
  assignedCustomerId?: string;
  location: string; // 'Showroom Floor' | 'Warehouse' | 'Service Bay'
  createdAt: string;
}

export interface CustomerDocument {
  id?: string;
  name: string;
  title?: string;
  type: 'Aadhaar' | 'PAN' | 'Driving License' | 'Electricity Bill' | 'Passport Photo' | 'Invoice Copy' | 'RC Document' | 'DrivingLicense' | 'ElectricityBill' | 'Photo' | 'Other';
  status: 'Verified' | 'Pending' | 'Uploaded';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  uploadedAt?: string;
}

export interface Customer {
  id: string;
  customerCode: string; // e.g. CUST-1001
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  aadhaarNumber: string;
  panNumber: string;
  documents: CustomerDocument[];
  vehicleIds: string[]; // multi-vehicle ownership support
  notes: string;
  communicationPreference: 'All' | 'WhatsApp' | 'SMS' | 'Email';
  createdAt: string;
}

export type FinancingType = 'Cash/Self' | 'FinanceCompany' | 'ShowroomDirect';

export interface Sale {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-001
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
  financingType: FinancingType;
  financeCompanyName?: string; // e.g. 'IDFC FIRST Bank', 'HDFC Bank', 'L&T Finance'
  loanAccountRef?: string;
  financedAmount?: number;
  pendingDocuments: string[];
  deliveryStatus: 'Pending' | 'Ready' | 'Delivered' | 'Handed Over';
  deliveryDate?: string;
  registrationNumber?: string; // e.g. DL-01-EV-2026
  insurancePolicyNumber?: string;
  salespersonName: string;
  deliveryChecklist: {
    batteryFullyCharged: boolean;
    smartChargerHanded: boolean;
    twoKeysGiven: boolean;
    toolkitAndFirstAidGiven: boolean;
    ownerManualGiven: boolean;
    appPairedAndSetup: boolean;
    pdiTestRunCompleted: boolean;
    customerSignatureTaken: boolean;
  };
  uploadedInvoiceFile?: {
    fileName: string;
    fileUrl: string;
    fileSize?: string;
    uploadedAt: string;
  };
  handoverNotes?: string;
  createdAt: string;
}

export type ServiceStatus = 'Upcoming' | 'Due' | 'Overdue' | 'In Progress' | 'Completed' | 'Missed';

export interface ServicePartUsed {
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isCoveredUnderFreeService: boolean;
}

export interface ServiceRecord {
  id: string;
  serviceNumber: 1 | 2 | 3 | 'Paid';
  jobCardNumber: string; // e.g. JC-2026-089
  customerId: string;
  vehicleId: string;
  isFree: boolean;
  status: ServiceStatus;
  scheduledDate: string;
  dueDate: string;
  dueKm: number;
  completedDate?: string;
  odometerReading?: number;
  technicianName?: string;
  customerComplaints: string;
  inspectionChecklist: {
    batteryHealthCheck: boolean;
    brakePadsAndFluid: boolean;
    tyrePressureAndTread: boolean;
    electricalWiringHarness: boolean;
    lightingAndHorn: boolean;
    suspensionAndSteering: boolean;
    bmsSoftwareUpdate: boolean;
  };
  workDone?: string;
  partsReplaced: ServicePartUsed[];
  labourCharge: number;
  partsCharge: number;
  taxAmount: number;
  totalCustomerPayable: number;
  receiptNumber?: string;
  serviceNotes?: string;
  createdAt: string;
}

export type InstallmentStatus = 'Pending' | 'Due' | 'Overdue' | 'Paid' | 'Partially Paid';

export interface EMIInstallment {
  installmentNo: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paidDate?: string;
  status: InstallmentStatus;
  receiptNumber?: string;
  paymentMethod?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  lateFee?: number;
  notes?: string;
}

export interface EMISchedule {
  id: string;
  saleId: string;
  customerId: string;
  vehicleId: string;
  financeType: 'ShowroomDirect' | 'FinanceCompany';
  financeCompanyName?: string;
  loanAccountNo?: string;
  totalFinancedAmount: number;
  tenureMonths: number;
  monthlyEmiAmount: number;
  interestRateAnnual: number;
  installments: EMIInstallment[];
  outstandingBalance: number;
  totalPaidAmount: number;
  createdAt: string;
}

export type ReminderType = 
  | 'ServiceDue' 
  | 'EMIDue' 
  | 'EMIOverdue' 
  | 'InsuranceExpiry' 
  | 'WarrantyExpiry' 
  | 'TestRide' 
  | 'PendingDocument' 
  | 'LowStock';

export interface ReminderLog {
  id: string;
  reminderId: string;
  channel: 'Email' | 'SMS' | 'WhatsApp';
  sentAt: string;
  status: 'Delivered' | 'Sent' | 'Failed';
  providerMessageId: string;
  recipient: string;
  errorMessage?: string;
}

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleId?: string;
  vehicleModel?: string;
  scheduledDate: string;
  channels: ('Email' | 'SMS' | 'WhatsApp')[];
  status: 'Scheduled' | 'Sent' | 'Failed' | 'Paused' | 'Rescheduled';
  deliveryAttempts: number;
  lastAttemptAt?: string;
  messageContent: string;
  relatedEntityId?: string; // serviceId, emiId, etc.
  isAutoGenerated: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  leadCode: string;
  name: string;
  phone: string;
  email: string;
  interestedModel: string;
  source: 'Walk-in' | 'Phone Enquiry' | 'Website Lead' | 'Referral' | 'Social Media';
  status: 'New' | 'Test Ride Booked' | 'Follow-up' | 'Converted' | 'Lost';
  assignedStaff: string;
  testRideDate?: string;
  followUpDate?: string;
  budget?: number;
  notes: string;
  createdAt: string;
}

export interface SparePart {
  id: string;
  partNumber: string;
  name: string;
  category: 'Battery' | 'Charger' | 'Tyre' | 'Brake' | 'Electrical' | 'Accessory' | 'Body Panel';
  compatibleModels: string[];
  unitCost: number;
  sellingPrice: number;
  currentStock: number;
  minStockLevel: number;
  supplierId: string;
  shelfLocation: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  balanceDue: number;
  totalPurchased: number;
  suppliedCategories: string[];
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'Received' | 'Paid';
  paymentStatus: 'Pending' | 'Partially Paid' | 'Paid';
  invoiceNumber?: string;
  createdAt: string;
}

export interface WarrantyInsurance {
  id: string;
  vehicleId: string;
  vehicleModel: string;
  chassisVin: string;
  customerId: string;
  customerName: string;
  policyType: 'Comprehensive Insurance' | 'Third Party Insurance' | 'Vehicle Warranty' | 'Battery Warranty' | 'Extended Motor Warranty';
  providerName: string;
  policyNumber: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  coverageNotes: string;
  claimHistory: {
    claimId: string;
    date: string;
    reason: string;
    amount: number;
    status: 'Pending' | 'Approved' | 'Settled' | 'Rejected';
  }[];
}

export interface Expense {
  id: string;
  date: string;
  category: 'Rent' | 'Salaries' | 'Electricity' | 'Marketing' | 'Showroom Maintenance' | 'Transport' | 'Office & Tea' | 'Miscellaneous';
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  paidTo: string;
  description: string;
  voucherNumber: string;
  approvedBy: string;
}

export type StaffRole = 'Owner' | 'Manager' | 'Sales Staff' | 'Accountant' | 'Service Technician';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  phone: string;
  isActive: boolean;
  avatarUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  details: string;
}

export interface ServiceIntervalConfig {
  model: string;
  service1Days: number;
  service1Km: number;
  service2Days: number;
  service2Km: number;
  service3Days: number;
  service3Km: number;
}

export interface ShowroomSettings {
  showroomName: string;
  tagline: string;
  branchName: string;
  gstNumber: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  currencySymbol: string;
  timezone: string;
  serviceIntervals: ServiceIntervalConfig[];
  emailSettings: {
    provider: 'Resend' | 'SendGrid' | 'Firebase Extensions' | 'SMTP';
    apiKeyMasked: string;
    fromEmail: string;
    fromName: string;
    autoSendEnabled: boolean;
  };
  smsSettings: {
    provider: 'Fast2SMS' | 'Twilio' | 'MSG91';
    enabled: boolean;
  };
  whatsAppSettings: {
    provider: 'WhatsApp Business Cloud API' | 'WATI';
    enabled: boolean;
  };
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    isConfigured: boolean;
  };
}
