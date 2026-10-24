const mongoose = require('mongoose');
const { Schema } = mongoose;

// InventoryBatch Schema — tracks a purchase batch of scooters
const InventoryBatchSchema = new Schema({
  id: { type: String, required: true, unique: true },
  batchCode: { type: String, required: true },           // e.g. BATCH-2026-001
  modelNumber: { type: String, required: true },          // e.g. E-Scoot 207
  lightType: { type: String, enum: ['Single Light', 'Double Light'], default: 'Single Light' },
  companyName: { type: String, required: true },          // Scooter manufacturer
  batteryCompanyName: { type: String, default: '' },      // Battery manufacturer
  hsnCode: { type: String, default: '' },                 // HSN code (preserve leading zeros as string)
  purchaseDate: { type: String, required: true },         // ISO date string
  purchaseCostPerUnit: { type: Number, required: true },  // Cost per unit in INR
  quantity: { type: Number, required: true, min: 1 },     // Total units in this batch
  availableQty: { type: Number, default: 0 },             // Units still in stock
  soldQty: { type: Number, default: 0 },                  // Units sold
  invoiceNumber: { type: String, default: '' },           // Purchase invoice ref
  supplierName: { type: String, default: '' },            // Supplier / distributor
  batteryWarrantyMonths: { type: Number, default: 36 },
  stockNotes: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Archived', 'Out of Stock'], default: 'Active' },
  unitIds: { type: [String], default: [] },               // Array of Vehicle IDs in this batch
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, strict: false });

// Vehicle Schema
const VehicleSchema = new Schema({
  id: { type: String, required: true, unique: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  variant: { type: String, default: '' },
  color: { type: String, default: '' },
  // New EV-specific inventory fields
  lightType: { type: String, enum: ['Single Light', 'Double Light'], default: 'Single Light' },
  companyName: { type: String, default: '' },
  batteryCompanyName: { type: String, default: '' },
  hsnCode: { type: String, default: '' },
  inventoryBatchId: { type: String, default: '' },        // Links to InventoryBatch
  modelNumber: { type: String, default: '' },             // e.g. E-Scoot 207
  chassisVin: { type: String, required: true, unique: true },
  motorNumber: { type: String, default: '' },
  batterySerial: { type: String, default: '' },
  batteryCapacityKwh: { type: Number, default: 0 },
  certifiedRangeKm: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  gstRate: { type: Number, default: 5 },
  gstAmount: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  dealerMargin: { type: Number, default: 0 },
  purchaseDate: { type: String, default: '' },
  supplierId: { type: String, default: '' },
  supplierInvoiceNo: { type: String, default: '' },
  status: { type: String, enum: ['Available', 'Reserved', 'Sold', 'In Transit', 'Returned'], default: 'Available' },
  batteryWarrantyMonths: { type: Number, default: 36 },
  vehicleWarrantyMonths: { type: Number, default: 36 },
  stockAgeDays: { type: Number, default: 0 },
  assignedCustomerId: { type: String, default: null },
  location: { type: String, default: 'Showroom Floor' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, strict: false });

// Customer Schema
const CustomerSchema = new Schema({
  id: { type: String, required: true, unique: true },
  customerCode: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  pincode: { type: String, default: '' },
  aadhaarNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  documents: { type: Array, default: [] },
  vehicleIds: { type: [String], default: [] },
  notes: { type: String, default: '' },
  communicationPreference: { type: String, enum: ['All', 'WhatsApp', 'SMS', 'Email'], default: 'WhatsApp' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, strict: false });

// Sale Schema
const SaleSchema = new Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true },
  customerId: { type: String, required: true },
  vehicleId: { type: String, required: true },
  saleDate: { type: String, required: true },
  exShowroomPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  accessoriesAmount: { type: Number, default: 0 },
  insuranceAmount: { type: Number, default: 0 },
  registrationAmount: { type: Number, default: 0 },
  totalOnRoadPrice: { type: Number, required: true },
  bookingAmount: { type: Number, default: 0 },
  downPayment: { type: Number, default: 0 },
  financingType: { type: String, enum: ['Cash/Self', 'FinanceCompany', 'ShowroomDirect'], default: 'Cash/Self' },
  financeCompanyName: { type: String, default: '' },
  loanAccountRef: { type: String, default: '' },
  financedAmount: { type: Number, default: 0 },
  pendingDocuments: { type: [String], default: [] },
  deliveryStatus: { type: String, enum: ['Pending', 'Ready', 'Delivered', 'Handed Over'], default: 'Handed Over' },
  deliveryDate: { type: String, default: '' },
  registrationNumber: { type: String, default: '' },
  insurancePolicyNumber: { type: String, default: '' },
  salespersonName: { type: String, default: '' },
  deliveryChecklist: { type: Object, default: {} },
  uploadedInvoiceFile: { type: Object, default: null },
  handoverNotes: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, strict: false });

// Service Record Schema
const ServiceRecordSchema = new Schema({
  id: { type: String, required: true, unique: true },
  serviceNumber: { type: Schema.Types.Mixed, default: 1 },
  jobCardNumber: { type: String, required: true },
  customerId: { type: String, required: true },
  vehicleId: { type: String, required: true },
  isFree: { type: Boolean, default: true },
  status: { type: String, enum: ['Upcoming', 'Due', 'Overdue', 'In Progress', 'Completed', 'Missed'], default: 'Upcoming' },
  scheduledDate: { type: String, required: true },
  dueDate: { type: String, required: true },
  dueKm: { type: Number, default: 0 },
  completedDate: { type: String, default: null },
  odometerReading: { type: Number, default: 0 },
  technicianName: { type: String, default: '' },
  customerComplaints: { type: String, default: '' },
  inspectionChecklist: { type: Object, default: {} },
  workDone: { type: String, default: '' },
  partsReplaced: { type: Array, default: [] },
  labourCharge: { type: Number, default: 0 },
  partsCharge: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalCustomerPayable: { type: Number, default: 0 },
  receiptNumber: { type: String, default: '' },
  serviceNotes: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, strict: false });

// EMI Schedule Schema
const EMIScheduleSchema = new Schema({
  id: { type: String, required: true, unique: true },
  saleId: { type: String, required: true },
  customerId: { type: String, required: true },
  vehicleId: { type: String, required: true },
  financeType: { type: String, enum: ['ShowroomDirect', 'FinanceCompany'], default: 'ShowroomDirect' },
  financeCompanyName: { type: String, default: '' },
  loanAccountNo: { type: String, default: '' },
  totalFinancedAmount: { type: Number, required: true },
  tenureMonths: { type: Number, required: true },
  monthlyEmiAmount: { type: Number, required: true },
  interestRateAnnual: { type: Number, default: 0 },
  installments: { type: Array, default: [] },
  outstandingBalance: { type: Number, required: true },
  totalPaidAmount: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, strict: false });

// Reminder Schema (Focused on WhatsApp Reminders)
const ReminderSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['ServiceDue', 'EMIDue', 'EMIOverdue', 'InsuranceExpiry', 'WarrantyExpiry', 'TestRide', 'PendingDocument', 'LowStock'],
    required: true
  },
  title: { type: String, required: true },
  customerId: { type: String, default: '' },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String, default: '' },
  vehicleId: { type: String, default: '' },
  vehicleModel: { type: String, default: '' },
  scheduledDate: { type: String, required: true },
  channels: { type: [String], default: ['WhatsApp'] },
  status: { type: String, enum: ['Scheduled', 'Sent', 'Failed', 'Paused', 'Rescheduled'], default: 'Scheduled' },
  deliveryAttempts: { type: Number, default: 0 },
  lastAttemptAt: { type: String, default: null },
  messageContent: { type: String, required: true },
  relatedEntityId: { type: String, default: '' },
  isAutoGenerated: { type: Boolean, default: false },
  whatsappDirectUrl: { type: String, default: '' },
  lastSentVia: { type: String, default: 'WhatsApp' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, strict: false });

// Lead Schema
const LeadSchema = new Schema({
  id: { type: String, required: true, unique: true },
  leadCode: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  interestedModel: { type: String, default: '' },
  budgetRange: { type: String, default: '' },
  source: { type: String, default: 'Walk-in' },
  status: { type: String, default: 'New' },
  followUpDate: { type: String, default: '' },
  notes: { type: String, default: '' },
  assignedStaff: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, strict: false });

// Spare Part Schema
const SparePartSchema = new Schema({
  id: { type: String, required: true, unique: true },
  partNumber: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, default: '' },
  unitPrice: { type: Number, default: 0 },
  unitCost: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  minReorderLevel: { type: Number, default: 5 },
  locationBin: { type: String, default: '' },
  supplierName: { type: String, default: '' },
  lastRestockedDate: { type: String, default: '' }
}, { timestamps: true, strict: false });

// Supplier Schema
const SupplierSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  gstin: { type: String, default: '' },
  category: { type: String, default: '' },
  balanceDue: { type: Number, default: 0 },
  totalPurchased: { type: Number, default: 0 }
}, { timestamps: true, strict: false });

// Purchase Order Schema
const PurchaseOrderSchema = new Schema({
  id: { type: String, required: true, unique: true },
  poNumber: { type: String, required: true },
  supplierId: { type: String, default: '' },
  supplierName: { type: String, required: true },
  orderDate: { type: String, required: true },
  expectedDeliveryDate: { type: String, default: '' },
  items: { type: Array, default: [] },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Ordered' },
  paymentStatus: { type: String, default: 'Pending' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, strict: false });

// Warranty Insurance Schema
const WarrantyInsuranceSchema = new Schema({
  id: { type: String, required: true, unique: true },
  vehicleId: { type: String, required: true },
  customerId: { type: String, required: true },
  policyType: { type: String, default: '' },
  providerName: { type: String, default: '' },
  policyNumber: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  coverageNotes: { type: String, default: '' },
  claimHistory: { type: Array, default: [] }
}, { timestamps: true, strict: false });

// Expense Schema
const ExpenseSchema = new Schema({
  id: { type: String, required: true, unique: true },
  voucherNumber: { type: String, required: true },
  date: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMode: { type: String, default: 'Cash' },
  paidTo: { type: String, default: '' },
  description: { type: String, default: '' },
  approvedBy: { type: String, default: '' }
}, { timestamps: true, strict: false });

// Showroom Settings Schema
const SettingsSchema = new Schema({
  id: { type: String, default: 'dealership_profile' },
  dealershipName: { type: String, default: 'Voltride EV Rev Showroom' },
  tagline: { type: String, default: 'Next-Gen Electric Mobility' },
  gstin: { type: String, default: '07AAAAA0000A1Z5' },
  address: { type: String, default: 'Plot 42, Electric Avenue, Okhla Phase III, New Delhi' },
  phone: { type: String, default: '+91 98110 00123' },
  email: { type: String, default: 'sales@voltriderev.com' },
  website: { type: String, default: 'https://voltriderev.com' },
  serviceIntervals: { type: Array, default: [] },
  defaultGstRateEv: { type: Number, default: 5 },
  defaultGstRateParts: { type: Number, default: 18 }
}, { timestamps: true, strict: false });

// Audit Log Schema
const AuditLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  userName: { type: String, default: 'Admin' },
  userRole: { type: String, default: 'Owner' },
  action: { type: String, required: true },
  module: { type: String, required: true },
  details: { type: String, default: '' }
}, { timestamps: true, strict: false });

module.exports = {
  Vehicle: mongoose.model('Vehicle', VehicleSchema),
  InventoryBatch: mongoose.model('InventoryBatch', InventoryBatchSchema),
  Customer: mongoose.model('Customer', CustomerSchema),
  Sale: mongoose.model('Sale', SaleSchema),
  ServiceRecord: mongoose.model('ServiceRecord', ServiceRecordSchema),
  EMISchedule: mongoose.model('EMISchedule', EMIScheduleSchema),
  Reminder: mongoose.model('Reminder', ReminderSchema),
  Lead: mongoose.model('Lead', LeadSchema),
  SparePart: mongoose.model('SparePart', SparePartSchema),
  Supplier: mongoose.model('Supplier', SupplierSchema),
  PurchaseOrder: mongoose.model('PurchaseOrder', PurchaseOrderSchema),
  WarrantyInsurance: mongoose.model('WarrantyInsurance', WarrantyInsuranceSchema),
  Expense: mongoose.model('Expense', ExpenseSchema),
  Settings: mongoose.model('Settings', SettingsSchema),
  AuditLog: mongoose.model('AuditLog', AuditLogSchema)
};
