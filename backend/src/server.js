const path = require('path');
const backendEnvPath = path.resolve(__dirname, '..', '.env');
const envLoadResult = require('dotenv').config({ path: backendEnvPath });
const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const {
  Vehicle, InventoryBatch, Customer, Sale, ServiceRecord, EMISchedule,
  Reminder, Lead, SparePart, Supplier, PurchaseOrder,
  WarrantyInsurance, Expense, Settings, AuditLog
} = require('./models');
const { sendWhatsAppReminder } = require('./services/whatsapp');
const seedData = require('./data/seedData.cjs');
const { authenticateAdmin, clearSessionCookie, createSessionCookie, isValidSession } = require('./services/auth');

const FRONTEND_ORIGIN = new URL(
  process.env.FRONTEND_ORIGIN || (
    process.env.NODE_ENV === 'production'
      ? 'https://crm-admin-jbo8.vercel.app'
      : 'http://localhost:3000'
  )
).origin;

function getAuthConfigurationIssues() {
  const issues = [];
  if (!(process.env.ADMIN_EMAIL || '').trim()) issues.push('ADMIN_EMAIL');
  if (!process.env.ADMIN_PASSWORD) issues.push('ADMIN_PASSWORD');
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    issues.push('SESSION_SECRET (at least 32 characters)');
  }
  return issues;
}

if (envLoadResult.error) {
  console.error(`[Auth] Could not load backend environment file at ${backendEnvPath}: ${envLoadResult.error.message}`);
} else {
  const issues = getAuthConfigurationIssues();
  console.log(issues.length === 0
    ? '[Auth] Admin authentication configuration loaded.'
    : `[Auth] Admin authentication configuration is incomplete: ${issues.join(', ')}.`);
}

const app = express();
const server = http.createServer(app);

// Configure Socket.io with wide CORS for local dev & production
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

io.use((socket, next) => {
  try {
    if (isValidSession(socket.handshake.headers.cookie)) return next();
    return next(new Error('Authentication required'));
  } catch (error) {
    console.error('[Socket] Authentication validation failed:', error.message);
    return next(new Error('Authentication is not configured'));
  }
});

// Middleware
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Attach Socket.io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Helper: Broadcast full database sync to all clients
async function broadcastFullSync() {
  try {
    const [
      vehicles, inventoryBatches, customers, sales, services, emiSchedules,
      reminders, leads, spareParts, suppliers, purchaseOrders,
      warrantyInsurance, expenses, settings, auditLogs
    ] = await Promise.all([
      Vehicle.find().sort({ createdAt: -1 }),
      InventoryBatch.find().sort({ createdAt: -1 }),
      Customer.find().sort({ createdAt: -1 }),
      Sale.find().sort({ createdAt: -1 }),
      ServiceRecord.find().sort({ createdAt: -1 }),
      EMISchedule.find().sort({ createdAt: -1 }),
      Reminder.find().sort({ createdAt: -1 }),
      Lead.find().sort({ createdAt: -1 }),
      SparePart.find().sort({ name: 1 }),
      Supplier.find().sort({ name: 1 }),
      PurchaseOrder.find().sort({ createdAt: -1 }),
      WarrantyInsurance.find().sort({ createdAt: -1 }),
      Expense.find().sort({ date: -1 }),
      Settings.findOne({ id: 'dealership_profile' }),
      AuditLog.find().sort({ timestamp: -1 }).limit(100)
    ]);

    const fullDb = {
      vehicles, inventoryBatches, customers, sales, services, emiSchedules,
      reminders, leads, spareParts, suppliers, purchaseOrders,
      warrantyInsurance, expenses,
      settings: settings || seedData.initialSettings,
      staff: [{
        id: 'admin',
        name: process.env.ADMIN_NAME || 'Deen Dayak Tiwari',
        email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
        role: 'Owner',
        phone: '',
        isActive: true
      }],
      auditLogs
    };

    io.emit('sync_data', fullDb);
  } catch (err) {
    console.error('[Socket] Error broadcasting sync:', err.message);
  }
}

// Ensure basic showroom profile exists without seeding fake data
async function ensureSettings() {
  try {
    const existing = await Settings.findOne({ id: 'dealership_profile' });
    if (!existing) {
      await Settings.create(seedData.initialSettings);
      console.log('[MongoDB] Default showroom profile settings initialized.');
    } else {
      console.log('[MongoDB] Showroom settings verified.');
    }
  } catch (err) {
    console.error('[MongoDB] Settings check error:', err.message);
  }
}

// ==========================================
// API ROUTES
// ==========================================

app.post('/api/auth/login', (req, res) => {
  const configurationIssues = getAuthConfigurationIssues();
  const expectedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || '';
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const providedPassword = Buffer.from(password);
  const configuredPassword = Buffer.from(expectedPassword);
  const passwordMatches = configuredPassword.length > 0 &&
    providedPassword.length === configuredPassword.length &&
    crypto.timingSafeEqual(providedPassword, configuredPassword);

  if (configurationIssues.length > 0) {
    return res.status(503).json({
      success: false,
      message: `Admin authentication is not configured on the server. Check backend/.env: ${configurationIssues.join(', ')}. Restart the backend after updating it.`
    });
  }
  if (email !== expectedEmail || !passwordMatches) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  res.json({ success: true, user: { name: process.env.ADMIN_NAME || 'Administrator', email: expectedEmail, role: 'Owner' } });
});

app.get('/api/auth/session', (req, res) => {
  try {
    if (!isValidSession(req.headers.cookie)) {
      return res.status(401).json({ success: false, message: 'Sign in to continue.' });
    }
    return res.json({
      success: true,
      user: {
        name: process.env.ADMIN_NAME || 'Administrator',
        email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
        role: 'Owner'
      }
    });
  } catch (error) {
    console.error('[Auth] Session check failed:', error.message);
    return res.status(503).json({ success: false, message: 'Authentication is not configured.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ success: true });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    adminAuthenticationConfigured: getAuthConfigurationIssues().length === 0,
    database: 'MongoDB Atlas',
    cluster: 'auto-shop',
    realTime: 'Socket.io Active',
    whatsappService: 'WhatsApp Reminders Active',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    const expectedOrigin = FRONTEND_ORIGIN;
    if (origin && origin !== expectedOrigin) {
      return res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
    }
  }
  return authenticateAdmin(req, res, next);
});

// Get Full Database Snapshot (for instant hydration)
app.get('/api/all', async (req, res) => {
  try {
    const [
      vehicles, inventoryBatches, customers, sales, services, emiSchedules,
      reminders, leads, spareParts, suppliers, purchaseOrders,
      warrantyInsurance, expenses, settings, auditLogs
    ] = await Promise.all([
      Vehicle.find().sort({ createdAt: -1 }),
      InventoryBatch.find().sort({ createdAt: -1 }),
      Customer.find().sort({ createdAt: -1 }),
      Sale.find().sort({ createdAt: -1 }),
      ServiceRecord.find().sort({ createdAt: -1 }),
      EMISchedule.find().sort({ createdAt: -1 }),
      Reminder.find().sort({ createdAt: -1 }),
      Lead.find().sort({ createdAt: -1 }),
      SparePart.find().sort({ name: 1 }),
      Supplier.find().sort({ name: 1 }),
      PurchaseOrder.find().sort({ createdAt: -1 }),
      WarrantyInsurance.find().sort({ createdAt: -1 }),
      Expense.find().sort({ date: -1 }),
      Settings.findOne({ id: 'dealership_profile' }),
      AuditLog.find().sort({ timestamp: -1 }).limit(100)
    ]);

    res.json({
      success: true,
      data: {
        vehicles, inventoryBatches, customers, sales, services, emiSchedules,
        reminders, leads, spareParts, suppliers, purchaseOrders,
        warrantyInsurance, expenses,
        settings: settings || seedData.initialSettings,
        staff: [{
          id: 'admin',
          name: process.env.ADMIN_NAME || 'Deen Dayak Tiwari',
          email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
          role: 'Owner',
          phone: '',
          isActive: true
        }],
        auditLogs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Seed Database Route
app.post('/api/seed', async (req, res) => {
  try {
    await Promise.all([
      Vehicle.deleteMany({}),
      Customer.deleteMany({}),
      Sale.deleteMany({}),
      ServiceRecord.deleteMany({}),
      EMISchedule.deleteMany({}),
      Reminder.deleteMany({}),
      Lead.deleteMany({}),
      SparePart.deleteMany({}),
      Supplier.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      WarrantyInsurance.deleteMany({}),
      Expense.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    await Promise.all([
      Vehicle.insertMany(seedData.initialVehicles),
      Customer.insertMany(seedData.initialCustomers),
      Sale.insertMany(seedData.initialSales),
      ServiceRecord.insertMany(seedData.initialServices),
      EMISchedule.insertMany(seedData.initialEMISchedules),
      Reminder.insertMany(seedData.initialReminders),
      Lead.insertMany(seedData.initialLeads),
      SparePart.insertMany(seedData.initialSpareParts),
      Supplier.insertMany(seedData.initialSuppliers),
      PurchaseOrder.insertMany(seedData.initialPurchaseOrders),
      WarrantyInsurance.insertMany(seedData.initialWarrantyInsurance),
      Expense.insertMany(seedData.initialExpenses),
      Settings.findOneAndUpdate(
        { id: 'dealership_profile' },
        seedData.initialSettings,
        { upsert: true, new: true }
      ),
      AuditLog.insertMany(seedData.initialAuditLogs)
    ]);

    await broadcastFullSync();
    res.json({ success: true, message: 'Database reset and seeded with initial demo records in MongoDB Atlas!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sync push from client to MongoDB (Replaces Firestore sync)
app.post('/api/sync-push', async (req, res) => {
  try {
    const localDb = req.body;
    if (!localDb) return res.status(400).json({ success: false, message: 'No payload provided' });

    if (Array.isArray(localDb.sales)) {
      const storedSales = await Sale.find().select('id').lean();
      const storedSaleIds = new Set(storedSales.map(sale => sale.id));
      if (localDb.sales.some(sale => !sale.id || !storedSaleIds.has(sale.id))) {
        return res.status(409).json({
          success: false,
          message: 'Sales must be created through the transactional customer-sales endpoint.'
        });
      }
    }

    if (localDb.vehicles && Array.isArray(localDb.vehicles)) {
      for (const v of localDb.vehicles) {
        const storedVehicle = await Vehicle.findOne({ id: v.id }).select('status').lean();
        if (v.status === 'Sold' && storedVehicle?.status !== 'Sold') {
          return res.status(409).json({
            success: false,
            message: 'Scooters can only be marked sold through the transactional customer-sales endpoint.'
          });
        }
        if (storedVehicle?.status === 'Sold' && v.status !== 'Sold' && await Sale.exists({ vehicleId: v.id })) {
          return res.status(409).json({
            success: false,
            message: 'A scooter with a completed sale cannot be returned to available stock.'
          });
        }
        await Vehicle.findOneAndUpdate({ id: v.id }, v, { upsert: true, new: true });
      }
    }
    if (localDb.customers && Array.isArray(localDb.customers)) {
      for (const c of localDb.customers) {
        await Customer.findOneAndUpdate({ id: c.id }, c, { upsert: true, new: true });
      }
    }
    if (localDb.sales && Array.isArray(localDb.sales)) {
      for (const s of localDb.sales) {
        const updates = {};
        for (const field of ['deliveryStatus', 'deliveryDate', 'registrationNumber', 'deliveryChecklist', 'uploadedInvoiceFile', 'handoverNotes']) {
          if (s[field] !== undefined) updates[field] = s[field];
        }
        await Sale.findOneAndUpdate({ id: s.id }, updates, { new: true });
      }
    }
    if (localDb.inventoryBatches && Array.isArray(localDb.inventoryBatches)) {
      for (const batch of localDb.inventoryBatches) {
        await InventoryBatch.findOneAndUpdate({ id: batch.id }, batch, { upsert: true, new: true });
      }
    }
    if (localDb.services && Array.isArray(localDb.services)) {
      for (const srv of localDb.services) {
        await ServiceRecord.findOneAndUpdate({ id: srv.id }, srv, { upsert: true, new: true });
      }
    }
    if (localDb.emiSchedules && Array.isArray(localDb.emiSchedules)) {
      for (const emi of localDb.emiSchedules) {
        await EMISchedule.findOneAndUpdate({ id: emi.id }, emi, { upsert: true, new: true });
      }
    }
    if (localDb.reminders && Array.isArray(localDb.reminders)) {
      for (const rem of localDb.reminders) {
        await Reminder.findOneAndUpdate({ id: rem.id }, rem, { upsert: true, new: true });
      }
    }
    if (localDb.leads && Array.isArray(localDb.leads)) {
      for (const l of localDb.leads) {
        await Lead.findOneAndUpdate({ id: l.id }, l, { upsert: true, new: true });
      }
    }
    if (localDb.spareParts && Array.isArray(localDb.spareParts)) {
      for (const sp of localDb.spareParts) {
        await SparePart.findOneAndUpdate({ id: sp.id }, sp, { upsert: true, new: true });
      }
      if (localDb.suppliers && Array.isArray(localDb.suppliers)) {
        for (const supplier of localDb.suppliers) {
          await Supplier.findOneAndUpdate({ id: supplier.id }, supplier, { upsert: true, new: true });
        }
      }
      if (localDb.purchaseOrders && Array.isArray(localDb.purchaseOrders)) {
        for (const order of localDb.purchaseOrders) {
          await PurchaseOrder.findOneAndUpdate({ id: order.id }, order, { upsert: true, new: true });
        }
      }
      if (localDb.warrantyInsurance && Array.isArray(localDb.warrantyInsurance)) {
        for (const warranty of localDb.warrantyInsurance) {
          await WarrantyInsurance.findOneAndUpdate({ id: warranty.id }, warranty, { upsert: true, new: true });
        }
      }
      if (localDb.auditLogs && Array.isArray(localDb.auditLogs)) {
        for (const log of localDb.auditLogs) {
          await AuditLog.findOneAndUpdate({ id: log.id }, log, { upsert: true, new: true });
        }
      }
    }
    if (localDb.expenses && Array.isArray(localDb.expenses)) {
      for (const exp of localDb.expenses) {
        await Expense.findOneAndUpdate({ id: exp.id }, exp, { upsert: true, new: true });
      }
    }
    if (localDb.settings) {
      await Settings.findOneAndUpdate({ id: 'dealership_profile' }, localDb.settings, { upsert: true, new: true });
    }

    await broadcastFullSync();
    res.json({ success: true, message: 'All records pushed and synchronized to MongoDB Atlas (auto-shop)!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// VEHICLES (INDIVIDUAL UNITS)
// ==========================================
app.get('/api/available-scooters', async (req, res) => {
  try {
    const units = await Vehicle.find({ status: 'Available' })
      .select('id brand model modelNumber color lightType companyName chassisVin batterySerial sellingPrice purchasePrice inventoryBatchId')
      .sort({ modelNumber: 1, companyName: 1 });
    const models = new Map();
    for (const unit of units) {
      const modelNumber = unit.modelNumber || unit.model;
      const key = `${unit.companyName || unit.brand}:${modelNumber}`;
      const model = models.get(key) || {
        key,
        modelNumber,
        companyName: unit.companyName || unit.brand,
        lightType: unit.lightType || '',
        availableQty: 0,
        suggestedPrice: unit.sellingPrice || 0
      };
      model.availableQty += 1;
      models.set(key, model);
    }
    res.json({ success: true, data: { models: Array.from(models.values()), units } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/vehicles', async (req, res) => {
  const vehicles = await Vehicle.find().sort({ createdAt: -1 });
  res.json(vehicles);
});

app.post('/api/vehicles', async (req, res) => {
  try {
    if (req.body.status === 'Sold') {
      return res.status(409).json({
        success: false,
        message: 'Scooters can only be marked sold through the transactional customer-sales endpoint.'
      });
    }
    const vin = (req.body.chassisVin || '').trim().toUpperCase();
    if (!vin) return res.status(400).json({ success: false, message: 'Chassis number is required.' });
    const existing = await Vehicle.findOne({ chassisVin: vin });
    if (existing) {
      return res.status(400).json({ success: false, message: `Chassis/VIN "${vin}" already exists in inventory!` });
    }
    if (req.body.batterySerial) {
      const bsExisting = await Vehicle.findOne({ batterySerial: req.body.batterySerial.trim().toUpperCase() });
      if (bsExisting) {
        return res.status(400).json({ success: false, message: `Battery serial "${req.body.batterySerial}" already assigned to another unit!` });
      }
    }
    const newId = req.body.id || `veh-${Date.now().toString().slice(-5)}`;
    const vehicle = new Vehicle({ ...req.body, chassisVin: vin, id: newId });
    await vehicle.save();
    
    io.emit('db_update', { collection: 'vehicles', action: 'create', data: vehicle });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const current = await Vehicle.findOne({ id: req.params.id });
    if (!current) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    if (req.body.status === 'Sold' && current.status !== 'Sold') {
      return res.status(409).json({
        success: false,
        message: 'Scooters can only be marked sold through the transactional customer-sales endpoint.'
      });
    }
    if (current.status === 'Sold' && req.body.status && req.body.status !== 'Sold' &&
        await Sale.exists({ vehicleId: current.id })) {
      return res.status(409).json({
        success: false,
        message: 'A scooter with a completed sale cannot be returned to available stock.'
      });
    }
    const updated = await Vehicle.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    io.emit('db_update', { collection: 'vehicles', action: 'update', data: updated });
    await broadcastFullSync();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const veh = await Vehicle.findOne({ id: req.params.id });
    if (veh && veh.status === 'Sold') {
      return res.status(400).json({ success: false, message: 'Cannot delete a sold unit. Archive the batch instead.' });
    }
    await Vehicle.findOneAndDelete({ id: req.params.id });
    io.emit('db_update', { collection: 'vehicles', action: 'delete', data: { id: req.params.id } });
    await broadcastFullSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// INVENTORY BATCHES (PURCHASE LOTS)
// ==========================================
app.get('/api/inventory-batches', async (req, res) => {
  try {
    const batches = await InventoryBatch.find().sort({ createdAt: -1 });
    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create a new inventory batch (with individual unit chassis/battery entries)
app.post('/api/inventory-batches', async (req, res) => {
  try {
    const {
      modelNumber, lightType, companyName, batteryCompanyName,
      hsnCode, purchaseDate, purchaseCostPerUnit, quantity,
      invoiceNumber, supplierName, batteryWarrantyMonths, stockNotes,
      units = []  // array of { chassisNumber, batterySerial, color, motorNumber }
    } = req.body;

    // Server-side validation
    if (!modelNumber || !modelNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Model number is required.' });
    }
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }
    if (!purchaseDate) {
      return res.status(400).json({ success: false, message: 'Purchase date is required.' });
    }
    if (!purchaseCostPerUnit || purchaseCostPerUnit < 0) {
      return res.status(400).json({ success: false, message: 'Purchase cost must be a non-negative number.' });
    }
    if (!quantity || quantity < 1 || !Number.isInteger(Number(quantity))) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive whole number.' });
    }

    // Check for duplicate chassis / battery serials before creating anything
    for (const unit of units) {
      if (unit.chassisNumber) {
        const vin = unit.chassisNumber.trim().toUpperCase();
        const vinExists = await Vehicle.findOne({ chassisVin: vin });
        if (vinExists) {
          return res.status(400).json({ success: false, message: `Chassis number "${vin}" already exists in inventory!` });
        }
      }
      if (unit.batterySerial) {
        const bs = unit.batterySerial.trim().toUpperCase();
        const bsExists = await Vehicle.findOne({ batterySerial: bs });
        if (bsExists) {
          return res.status(400).json({ success: false, message: `Battery serial "${bs}" is already assigned to another unit!` });
        }
      }
    }

    // Generate batch
    const batchCount = await InventoryBatch.countDocuments();
    const batchCode = `BATCH-${new Date().getFullYear()}-${String(batchCount + 1).padStart(3, '0')}`;
    const batchId = `batch-${Date.now()}`;

    // Create individual Vehicle documents for each unit
    const createdVehicleIds = [];
    for (let i = 0; i < Number(quantity); i++) {
      const unit = units[i] || {};
      const vin = (unit.chassisNumber || '').trim().toUpperCase();
      const bs = (unit.batterySerial || '').trim().toUpperCase();
      const vehId = `veh-${Date.now()}-${i}`;

      if (vin) {
        const veh = new Vehicle({
          id: vehId,
          brand: companyName.trim(),
          model: modelNumber.trim(),
          modelNumber: modelNumber.trim(),
          variant: '',
          color: unit.color || '',
          lightType: lightType || 'Single Light',
          companyName: companyName.trim(),
          batteryCompanyName: batteryCompanyName || '',
          hsnCode: hsnCode || '',
          chassisVin: vin,
          motorNumber: (unit.motorNumber || '').trim().toUpperCase(),
          batterySerial: bs,
          purchasePrice: Number(purchaseCostPerUnit),
          purchaseDate: purchaseDate,
          supplierInvoiceNo: invoiceNumber || '',
          batteryWarrantyMonths: Number(batteryWarrantyMonths) || 36,
          inventoryBatchId: batchId,
          status: 'Available',
          location: 'Showroom Floor'
        });
        await veh.save();
        createdVehicleIds.push(vehId);
      }
    }

    const batch = new InventoryBatch({
      id: batchId,
      batchCode,
      modelNumber: modelNumber.trim(),
      lightType: lightType || 'Single Light',
      companyName: companyName.trim(),
      batteryCompanyName: batteryCompanyName || '',
      hsnCode: hsnCode || '',
      purchaseDate,
      purchaseCostPerUnit: Number(purchaseCostPerUnit),
      quantity: Number(quantity),
      availableQty: createdVehicleIds.length > 0 ? createdVehicleIds.length : Number(quantity),
      soldQty: 0,
      invoiceNumber: invoiceNumber || '',
      supplierName: supplierName || '',
      batteryWarrantyMonths: Number(batteryWarrantyMonths) || 36,
      stockNotes: stockNotes || '',
      status: 'Active',
      unitIds: createdVehicleIds
    });
    await batch.save();

    // Audit log
    await AuditLog.create({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: 'Admin',
      userRole: 'Owner',
      action: 'ADD_INVENTORY_BATCH',
      module: 'Inventory',
      details: `Added batch ${batchCode}: ${quantity}x ${modelNumber} from ${companyName}. Purchase cost: ₹${purchaseCostPerUnit}/unit.`
    });

    io.emit('db_update', { collection: 'inventoryBatches', action: 'create', data: batch });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: batch, message: `Inventory batch ${batchCode} created with ${quantity} units.` });
  } catch (err) {
    console.error('[Inventory Batch] Create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single batch with its units
app.get('/api/inventory-batches/:id', async (req, res) => {
  try {
    const batch = await InventoryBatch.findOne({ id: req.params.id });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found.' });
    const units = await Vehicle.find({ inventoryBatchId: req.params.id }).sort({ createdAt: 1 });
    res.json({ success: true, data: { batch, units } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update inventory batch metadata
app.put('/api/inventory-batches/:id', async (req, res) => {
  try {
    const {
      modelNumber, lightType, companyName, batteryCompanyName,
      hsnCode, purchaseDate, purchaseCostPerUnit, invoiceNumber,
      supplierName, batteryWarrantyMonths, stockNotes
    } = req.body;

    if (!modelNumber || !companyName || !purchaseDate || purchaseCostPerUnit < 0) {
      return res.status(400).json({ success: false, message: 'Model, company, purchase date, and cost are required.' });
    }

    const updated = await InventoryBatch.findOneAndUpdate(
      { id: req.params.id },
      { modelNumber, lightType, companyName, batteryCompanyName, hsnCode, purchaseDate, purchaseCostPerUnit, invoiceNumber, supplierName, batteryWarrantyMonths, stockNotes },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Batch not found.' });

    // Sync vehicle records with updated batch metadata
    await Vehicle.updateMany(
      { inventoryBatchId: req.params.id },
      { model: modelNumber, modelNumber, companyName, batteryCompanyName, hsnCode, lightType, purchaseDate, purchasePrice: purchaseCostPerUnit, batteryWarrantyMonths }
    );

    await AuditLog.create({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: 'Admin',
      userRole: 'Owner',
      action: 'UPDATE_INVENTORY_BATCH',
      module: 'Inventory',
      details: `Updated batch ${req.params.id}: ${modelNumber} from ${companyName}.`
    });

    io.emit('db_update', { collection: 'inventoryBatches', action: 'update', data: updated });
    await broadcastFullSync();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete / archive a batch
app.delete('/api/inventory-batches/:id', async (req, res) => {
  try {
    const batch = await InventoryBatch.findOne({ id: req.params.id });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found.' });

    // Check if any units are sold
    const soldUnits = await Vehicle.countDocuments({ inventoryBatchId: req.params.id, status: 'Sold' });
    if (soldUnits > 0) {
      // Soft delete — archive instead of hard delete
      const archived = await InventoryBatch.findOneAndUpdate(
        { id: req.params.id },
        { status: 'Archived' },
        { new: true }
      );
      await AuditLog.create({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userName: 'Admin',
        userRole: 'Owner',
        action: 'ARCHIVE_INVENTORY_BATCH',
        module: 'Inventory',
        details: `Archived batch ${req.params.id} (${soldUnits} units were sold — preserved for audit trail).`
      });
      io.emit('db_update', { collection: 'inventoryBatches', action: 'update', data: archived });
      await broadcastFullSync();
      return res.json({ success: true, archived: true, message: `Batch archived (${soldUnits} sold units preserved in audit trail).` });
    }

    // Hard delete available units
    await Vehicle.deleteMany({ inventoryBatchId: req.params.id, status: { $ne: 'Sold' } });
    await InventoryBatch.findOneAndDelete({ id: req.params.id });

    await AuditLog.create({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: 'Admin',
      userRole: 'Owner',
      action: 'DELETE_INVENTORY_BATCH',
      module: 'Inventory',
      details: `Deleted batch ${req.params.id} and its unsold units.`
    });

    io.emit('db_update', { collection: 'inventoryBatches', action: 'delete', data: { id: req.params.id } });
    await broadcastFullSync();
    res.json({ success: true, archived: false, message: 'Batch and all unsold units deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add more units to an existing batch
app.post('/api/inventory-batches/:id/add-units', async (req, res) => {
  try {
    const { units = [] } = req.body;
    const batch = await InventoryBatch.findOne({ id: req.params.id });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found.' });

    if (!units.length) return res.status(400).json({ success: false, message: 'No units provided.' });

    const newVehicleIds = [];
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const vin = (unit.chassisNumber || '').trim().toUpperCase();
      if (!vin) continue;
      const vinExists = await Vehicle.findOne({ chassisVin: vin });
      if (vinExists) {
        return res.status(400).json({ success: false, message: `Chassis number "${vin}" already exists!` });
      }
      const bs = (unit.batterySerial || '').trim().toUpperCase();
      if (bs) {
        const bsExists = await Vehicle.findOne({ batterySerial: bs });
        if (bsExists) {
          return res.status(400).json({ success: false, message: `Battery serial "${bs}" is already assigned!` });
        }
      }
      const vehId = `veh-${Date.now()}-${i}`;
      const veh = new Vehicle({
        id: vehId,
        brand: batch.companyName,
        model: batch.modelNumber,
        modelNumber: batch.modelNumber,
        color: unit.color || '',
        lightType: batch.lightType,
        companyName: batch.companyName,
        batteryCompanyName: batch.batteryCompanyName,
        hsnCode: batch.hsnCode,
        chassisVin: vin,
        batterySerial: bs,
        motorNumber: (unit.motorNumber || '').trim().toUpperCase(),
        purchasePrice: batch.purchaseCostPerUnit,
        purchaseDate: batch.purchaseDate,
        batteryWarrantyMonths: batch.batteryWarrantyMonths,
        inventoryBatchId: batch.id,
        status: 'Available',
        location: 'Showroom Floor'
      });
      await veh.save();
      newVehicleIds.push(vehId);
    }

    const updatedBatch = await InventoryBatch.findOneAndUpdate(
      { id: req.params.id },
      {
        $inc: { quantity: newVehicleIds.length, availableQty: newVehicleIds.length },
        $push: { unitIds: { $each: newVehicleIds } }
      },
      { new: true }
    );

    await AuditLog.create({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: 'Admin',
      userRole: 'Owner',
      action: 'ADD_UNITS_TO_BATCH',
      module: 'Inventory',
      details: `Added ${newVehicleIds.length} new unit(s) to batch ${batch.batchCode} (${batch.modelNumber}).`
    });

    io.emit('db_update', { collection: 'inventoryBatches', action: 'update', data: updatedBatch });
    await broadcastFullSync();
    res.json({ success: true, data: updatedBatch, addedCount: newVehicleIds.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// CUSTOMERS
// ==========================================
app.get('/api/customers', async (req, res) => {
  const customers = await Customer.find({ archivedAt: null }).sort({ createdAt: -1 });
  res.json(customers);
});

app.post('/api/customers', async (req, res) => {
  try {
    const count = await Customer.countDocuments();
    const newId = req.body.id || `cust-${Date.now().toString().slice(-4)}`;
    const customerCode = req.body.customerCode || `CUST-${1001 + count}`;
    const customer = new Customer({
      ...req.body,
      id: newId,
      customerCode,
      communicationPreference: 'WhatsApp'
    });
    await customer.save();

    io.emit('db_update', { collection: 'customers', action: 'create', data: customer });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const updates = {};
    for (const field of ['name', 'phone', 'email', 'address', 'currentAddress', 'permanentAddress', 'city', 'pincode', 'panNumber', 'notes']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.phone !== undefined) {
      const phone = String(updates.phone).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Enter a valid Indian mobile number.' });
      }
      updates.phone = phone;
    }
    if (updates.panNumber !== undefined) {
      updates.panNumber = String(updates.panNumber).trim().toUpperCase();
      if (updates.panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(updates.panNumber)) {
        return res.status(400).json({ success: false, message: 'Enter a valid PAN number.' });
      }
    }
    if (updates.currentAddress !== undefined) updates.address = updates.currentAddress;
    const updated = await Customer.findOneAndUpdate(
      { id: req.params.id, archivedAt: null },
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Customer not found.' });
    await AuditLog.create({
      id: `aud-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      userName: process.env.ADMIN_NAME || 'Administrator',
      userRole: 'Owner',
      action: 'UPDATE_CUSTOMER',
      module: 'Customers',
      details: `Updated customer profile ${updated.customerCode}.`
    });
    io.emit('db_update', { collection: 'customers', action: 'update', data: updated });
    await broadcastFullSync();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const historyChecks = await Promise.all([
      Sale.exists({ customerId: customer.id }),
      ServiceRecord.exists({ customerId: customer.id }),
      EMISchedule.exists({ customerId: customer.id }),
      WarrantyInsurance.exists({ customerId: customer.id })
    ]);
    const hasHistory = historyChecks.some(Boolean);
    if (!hasHistory) {
      await Customer.deleteOne({ id: customer.id });
      io.emit('db_update', { collection: 'customers', action: 'delete', data: { id: customer.id } });
      await broadcastFullSync();
      return res.json({ success: true, archived: false });
    }

    customer.archivedAt = new Date().toISOString();
    await customer.save();
    await AuditLog.create({
      id: `aud-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      userName: process.env.ADMIN_NAME || 'Administrator',
      userRole: 'Owner',
      action: 'ARCHIVE_CUSTOMER',
      module: 'Customers',
      details: `Archived customer ${customer.customerCode} while preserving financial history.`
    });
    io.emit('db_update', { collection: 'customers', action: 'update', data: customer });
    await broadcastFullSync();
    return res.json({ success: true, archived: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SALES & BILLING
// ==========================================
app.post('/api/customer-sales', async (req, res) => {
  const { customer: customerData, sale: saleData } = req.body || {};
  const existingCustomerId = saleData?.customerId;
  const phoneDigits = String(customerData?.phone || '').replace(/\D/g, '');
  const normalizedPhone = phoneDigits.length === 12 && phoneDigits.startsWith('91')
    ? phoneDigits.slice(2)
    : phoneDigits;
  const panNumber = String(customerData?.panNumber || '').trim().toUpperCase();
  const paymentMethod = saleData?.paymentMethod ||
    (saleData?.financingType === 'FinanceCompany' ? 'Finance Company EMI' :
      saleData?.financingType === 'ShowroomDirect' ? 'Showroom Installments' : 'Full Payment');
  const allowedMethods = ['Full Payment', 'Finance Company EMI', 'Showroom Installments'];

  if (!existingCustomerId && !customerData?.name?.trim()) {
    return res.status(400).json({ success: false, message: 'Customer name is required.' });
  }
  if (customerData && ['currentAddress', 'permanentAddress', 'panNumber'].some(field =>
    customerData[field] !== undefined && typeof customerData[field] !== 'string'
  )) {
    return res.status(400).json({ success: false, message: 'Customer address and PAN fields must be text.' });
  }
  if (!existingCustomerId && !/^[6-9]\d{9}$/.test(normalizedPhone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid Indian mobile number.' });
  }
  if (!existingCustomerId && panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber)) {
    return res.status(400).json({ success: false, message: 'Enter a valid PAN number.' });
  }
  if (!existingCustomerId && customerData?.guarantorRequired && (
    !customerData.guarantor?.name?.trim() ||
    !/^[6-9]\d{9}$/.test(String(customerData.guarantor.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')) ||
    !customerData.guarantor?.address?.trim()
  )) {
    return res.status(400).json({ success: false, message: 'Complete all required guarantor details.' });
  }
  if (!allowedMethods.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Select a valid payment method.' });
  }
  if (!saleData?.saleDate || !saleData.vehicleId) {
    return res.status(400).json({ success: false, message: 'Sale date and scooter are required.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saleData.saleDate) ||
      Number.isNaN(new Date(`${saleData.saleDate}T12:00:00`).getTime())) {
    return res.status(400).json({ success: false, message: 'Enter a valid sale date.' });
  }

  let session;
  let result;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const vehicle = await Vehicle.findOne({ id: saleData.vehicleId, status: 'Available' }).session(session);
      if (!vehicle) {
        const existing = await Vehicle.findOne({ id: saleData.vehicleId }).session(session);
        throw new Error(existing ? 'This scooter is no longer available. Select another unit.' : 'Selected scooter was not found.');
      }
      if (await Sale.exists({ vehicleId: vehicle.id }).session(session)) {
        throw new Error('A sale already exists for this scooter. Refresh the inventory before continuing.');
      }

      const customerId = existingCustomerId || `cust-${crypto.randomUUID()}`;
      const saleId = `sale-${crypto.randomUUID()}`;
      const invoiceNumber = `MS-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const exShowroomPrice = Number(saleData.sellingPrice ?? saleData.exShowroomPrice);
      const discount = Number(saleData.discount || 0);
      const finalPrice = Number(saleData.finalSellingPrice ?? saleData.totalOnRoadPrice ?? (exShowroomPrice - discount));
      const bookingAmount = Number(saleData.bookingAmount || 0);
      const downPayment = Number(saleData.downPayment || 0);
      const paidAtSale = bookingAmount + downPayment;
      const remainingAmount = finalPrice - paidAtSale;
      const financingType = saleData.financingType || (paymentMethod === 'Finance Company EMI'
        ? 'FinanceCompany'
        : paymentMethod === 'Showroom Installments' ? 'ShowroomDirect' : 'Cash/Self');
      const expectedPaymentMethod = financingType === 'FinanceCompany'
        ? 'Finance Company EMI'
        : financingType === 'ShowroomDirect' ? 'Showroom Installments' : 'Full Payment';
      if (!['Cash/Self', 'FinanceCompany', 'ShowroomDirect'].includes(financingType) ||
          (saleData.paymentMethod && paymentMethod !== expectedPaymentMethod)) {
        throw new Error('Payment method and financing terms do not match.');
      }

      if (!Number.isFinite(exShowroomPrice) || exShowroomPrice <= 0 ||
          !Number.isFinite(discount) || discount < 0 || discount >= exShowroomPrice ||
          !Number.isFinite(finalPrice) || finalPrice <= 0 ||
          !Number.isFinite(bookingAmount) || bookingAmount < 0 ||
          !Number.isFinite(downPayment) || downPayment < 0 || paidAtSale > finalPrice) {
        throw new Error('Check selling price, discount, and down payment amounts.');
      }
      if (paymentMethod === 'Full Payment' && paidAtSale !== finalPrice) {
        throw new Error('Full payment must be recorded as the full final selling price.');
      }
      if (paymentMethod !== 'Full Payment' && paidAtSale >= finalPrice) {
        throw new Error('Down payment must be less than the final selling price for an installment purchase.');
      }

      const customerCount = customerData ? await Customer.countDocuments().session(session) : 0;
      let customer;
      if (customerData) {
        customer = {
          ...customerData,
          id: customerId,
          customerCode: `CUST-${1001 + customerCount}`,
          phone: normalizedPhone,
          panNumber,
          address: customerData.currentAddress || customerData.address || '',
          currentAddress: customerData.currentAddress || customerData.address || '',
          permanentAddress: customerData.permanentAddress || '',
          guarantorRequired: Boolean(customerData.guarantorRequired),
          guarantor: customerData.guarantorRequired ? customerData.guarantor : { name: '', phone: '', address: '' },
          vehicleIds: [vehicle.id],
          archivedAt: null,
          communicationPreference: 'WhatsApp'
        };
      } else {
        customer = await Customer.findOne({ id: customerId, archivedAt: null }).session(session);
        if (!customer) throw new Error('Customer not found. Refresh the customer list and try again.');
        customer.vehicleIds = Array.from(new Set([...(customer.vehicleIds || []), vehicle.id]));
      }

      const installments = [];
      const tenure = Number(saleData.installmentCount || saleData.emiTenureMonths || 0);
      const interestRate = Number(saleData.interestRate ?? saleData.emiInterestRate ?? 0);
      let monthlyAmount = 0;
      let totalInstallments = 0;
      let scheduledFirstDueDate = saleData.firstDueDate || '';
      if (financingType !== 'Cash/Self') {
        if (!Number.isInteger(tenure) || tenure < 1 || tenure > 120) {
          throw new Error('Installment count must be between 1 and 120 months.');
        }
        const firstDueDate = scheduledFirstDueDate || (() => {
          const nextDate = new Date(`${saleData.saleDate}T12:00:00`);
          nextDate.setMonth(nextDate.getMonth() + 1);
          return nextDate.toISOString().slice(0, 10);
        })();
        scheduledFirstDueDate = firstDueDate;
        if (!firstDueDate || (financingType === 'FinanceCompany' && !saleData.financeCompanyName?.trim())) {
          throw new Error('Finance company and first installment due date are required.');
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate) ||
            new Date(`${firstDueDate}T12:00:00`) < new Date(`${saleData.saleDate}T12:00:00`)) {
          throw new Error('First installment due date must be on or after the sale date.');
        }
        if (!Number.isFinite(interestRate) || interestRate < 0 || interestRate > 100) {
          throw new Error('Interest rate must be between 0 and 100 percent.');
        }
        if (financingType === 'ShowroomDirect' &&
            !['Monthly', 'Fortnightly', 'Weekly'].includes(saleData.paymentFrequency || 'Monthly')) {
          throw new Error('Select a valid showroom payment frequency.');
        }
        if (financingType === 'FinanceCompany' &&
            !['Pending', 'Approved', 'Rejected'].includes(saleData.financeStatus || 'Pending')) {
          throw new Error('Select a valid finance status.');
        }
        const monthlyRate = interestRate / 1200;
        monthlyAmount = monthlyRate > 0
          ? Math.round((remainingAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
            (Math.pow(1 + monthlyRate, tenure) - 1))
          : Math.ceil(remainingAmount / tenure);
        const agreedAmounts = Array.isArray(saleData.installmentAmounts) &&
          saleData.installmentAmounts.length === tenure
          ? saleData.installmentAmounts.map(Number)
          : Array.from({ length: tenure }, (_, index) =>
            index === tenure - 1 ? remainingAmount - monthlyAmount * (tenure - 1) : monthlyAmount
          );
        if (agreedAmounts.some(amount => !Number.isFinite(amount) || amount <= 0)) {
          throw new Error('Every installment amount must be a positive number.');
        }
        totalInstallments = agreedAmounts.reduce((sum, amount) => sum + amount, 0);
        const firstDue = new Date(`${firstDueDate}T12:00:00`);
        if (Number.isNaN(firstDue.getTime())) throw new Error('Enter a valid first installment due date.');
        const frequency = financingType === 'ShowroomDirect'
          ? (saleData.paymentFrequency || 'Monthly')
          : 'Monthly';
        for (let index = 0; index < tenure; index += 1) {
          const dueDate = new Date(firstDue);
          if (frequency === 'Weekly') {
            dueDate.setDate(firstDue.getDate() + index * 7);
          } else if (frequency === 'Fortnightly') {
            dueDate.setDate(firstDue.getDate() + index * 14);
          } else {
            const targetMonth = firstDue.getMonth() + index;
            const targetYear = firstDue.getFullYear() + Math.floor(targetMonth / 12);
            const normalizedMonth = targetMonth % 12;
            const paymentDay = Math.min(
              Number(saleData.paymentDay) || firstDue.getDate(),
              new Date(targetYear, normalizedMonth + 1, 0).getDate()
            );
            dueDate.setFullYear(targetYear, normalizedMonth, paymentDay);
          }
          const dueDateString = dueDate.toISOString().slice(0, 10);
          installments.push({
            installmentNo: index + 1,
            dueDate: dueDateString,
            amount: agreedAmounts[index],
            paidAmount: 0,
            status: 'Pending',
            payments: []
          });
        }
      }

      const initialLedger = paidAtSale > 0 ? [{
        amountDue: finalPrice,
        amountPaid: paidAtSale,
        paymentDate: saleData.saleDate,
        paymentMethod: saleData.initialPaymentMethod || 'Cash',
        reference: saleData.initialPaymentReference || '',
        outstandingBalance: remainingAmount
      }] : [];
      const sale = {
        id: saleId,
        invoiceNumber,
        customerId,
        vehicleId: vehicle.id,
        saleDate: saleData.saleDate,
        exShowroomPrice,
        discount,
        gstAmount: Number(saleData.gstAmount || 0),
        accessoriesAmount: Number(saleData.accessoriesAmount || 0),
        insuranceAmount: Number(saleData.insuranceAmount || 0),
        registrationAmount: Number(saleData.registrationAmount || 0),
        totalOnRoadPrice: finalPrice,
        finalSellingPrice: finalPrice,
        bookingAmount,
        downPayment,
        financingType,
        paymentMethod,
        financeCompanyName: saleData.financeCompanyName || '',
        loanAccountRef: saleData.loanAccountRef || '',
        financedAmount: remainingAmount,
        remainingAmount,
        financeStatus: financingType === 'FinanceCompany' ? (saleData.financeStatus || 'Pending') : '',
        firstDueDate: scheduledFirstDueDate,
        paymentDay: saleData.paymentDay || null,
        paymentFrequency: financingType === 'ShowroomDirect' ? (saleData.paymentFrequency || 'Monthly') : 'Monthly',
        installmentSchedule: installments,
        paymentLedger: initialLedger,
        modelNumber: vehicle.modelNumber || vehicle.model,
        companyName: vehicle.companyName || vehicle.brand,
        chassisVin: vehicle.chassisVin,
        batterySerial: vehicle.batterySerial,
        purchaseCostSnapshot: vehicle.purchasePrice || 0,
        pendingDocuments: [],
        deliveryStatus: saleData.deliveryStatus || 'Handed Over',
        deliveryDate: saleData.deliveryDate || saleData.saleDate,
        registrationNumber: saleData.registrationNumber || '',
        insurancePolicyNumber: saleData.insurancePolicyNumber || '',
        salespersonName: process.env.ADMIN_NAME || 'Deen Dayak Tiwari',
        deliveryChecklist: saleData.deliveryChecklist || {},
        handoverNotes: saleData.handoverNotes || '',
        createdAt: new Date().toISOString()
      };

      if (customerData) {
        await Customer.create([customer], { session });
      } else {
        await customer.save({ session });
      }
      await Sale.create([sale], { session });
      const soldVehicle = await Vehicle.findOneAndUpdate(
        { id: vehicle.id, status: 'Available' },
        { $set: { status: 'Sold', assignedCustomerId: customerId } },
        { new: true, session }
      );
      if (!soldVehicle) throw new Error('This scooter was just sold. Select another available unit.');

      if (vehicle.inventoryBatchId) {
        const batch = await InventoryBatch.findOne({ id: vehicle.inventoryBatchId }).session(session);
        if (!batch) throw new Error('Inventory batch could not be found. No changes were saved.');
        const remainingUnits = await Vehicle.countDocuments({
          inventoryBatchId: vehicle.inventoryBatchId,
          status: 'Available'
        }).session(session);
        batch.availableQty = remainingUnits;
        batch.soldQty = (batch.soldQty || 0) + 1;
        if (remainingUnits === 0) batch.status = 'Out of Stock';
        await batch.save({ session });
      }

      if (financingType !== 'Cash/Self') {
        await EMISchedule.create([{
          id: `emi-${crypto.randomUUID()}`,
          saleId,
          customerId,
          vehicleId: vehicle.id,
          financeType: financingType,
          financeCompanyName: sale.financeCompanyName || 'Showroom Installments',
          loanAccountNo: sale.loanAccountRef,
          totalFinancedAmount: remainingAmount,
          tenureMonths: tenure,
          monthlyEmiAmount: monthlyAmount,
          interestRateAnnual: interestRate,
          installments: installments.map(item => ({
            ...item,
            payments: [],
            outstandingBalance: item.amount
          })),
          outstandingBalance: totalInstallments,
          totalPaidAmount: 0,
          createdAt: new Date().toISOString()
        }], { session });
      }

      const warrantyEndDate = new Date(`${saleData.saleDate}T12:00:00`);
      warrantyEndDate.setMonth(warrantyEndDate.getMonth() + (vehicle.vehicleWarrantyMonths || 36));
      await WarrantyInsurance.create([{
        id: `warranty-${crypto.randomUUID()}`,
        vehicleId: vehicle.id,
        vehicleModel: `${vehicle.brand} ${vehicle.model}`,
        chassisVin: vehicle.chassisVin,
        customerId,
        customerName: customer.name,
        policyType: 'Vehicle Warranty',
        providerName: vehicle.companyName || vehicle.brand,
        policyNumber: `WAR-${invoiceNumber}`,
        startDate: saleData.saleDate,
        endDate: warrantyEndDate.toISOString().slice(0, 10),
        status: 'Active',
        coverageNotes: `${vehicle.vehicleWarrantyMonths || 36}-month vehicle warranty; battery serial ${vehicle.batterySerial || 'not recorded'}.`,
        claimHistory: []
      }], { session });

      const saleDate = new Date(`${saleData.saleDate}T12:00:00`);
      const serviceDueDays = [60, 180, 365];
      const serviceKm = [1000, 5000, 10000];
      const services = serviceDueDays.map((days, index) => {
        const dueDate = new Date(saleDate);
        dueDate.setDate(dueDate.getDate() + days);
        const date = dueDate.toISOString().slice(0, 10);
        return {
          id: `srv-${crypto.randomUUID()}`,
          serviceNumber: index + 1,
          jobCardNumber: `JC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          customerId,
          vehicleId: vehicle.id,
          isFree: true,
          status: 'Upcoming',
          scheduledDate: date,
          dueDate: date,
          dueKm: serviceKm[index],
          customerComplaints: `Free service ${index + 1}: scheduled maintenance and EV inspection.`,
          inspectionChecklist: {},
          partsReplaced: [],
          labourCharge: 0,
          partsCharge: 0,
          taxAmount: 0,
          totalCustomerPayable: 0,
          createdAt: new Date().toISOString()
        };
      });
      await ServiceRecord.insertMany(services, { session });

      await AuditLog.create([{
        id: `aud-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        userName: process.env.ADMIN_NAME || 'Deen Dayak Tiwari',
        userRole: 'Owner',
        action: 'RECORD_CUSTOMER_SALE',
        module: 'Sales',
        details: `Recorded invoice ${invoiceNumber} for ${vehicle.modelNumber || vehicle.model}; original unit cost retained.`
      }], { session });
      result = { customer, sale, vehicle: soldVehicle };
    });
  } catch (err) {
    const message = err.message || 'Unable to complete sale.';
    const status = /unavailable|sold|inventory quantity changed/i.test(message) ? 409 : 400;
    return res.status(status).json({ success: false, message });
  } finally {
    if (session) await session.endSession();
  }

  io.emit('db_update', { collection: 'sales', action: 'create', data: result.sale });
  await broadcastFullSync();
  return res.status(201).json({ success: true, data: result });
});

app.get('/api/sales', async (req, res) => {
  const sales = await Sale.find().sort({ createdAt: -1 });
  res.json(sales);
});

app.post('/api/sales', async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Direct sale creation is disabled. Use /api/customer-sales to validate stock and save the sale transactionally.'
  });
});

app.put('/api/sales/:id', async (req, res) => {
  try {
    const updates = {};
    for (const field of ['deliveryStatus', 'deliveryDate', 'registrationNumber', 'deliveryChecklist', 'uploadedInvoiceFile', 'handoverNotes']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const updated = await Sale.findOneAndUpdate({ id: req.params.id }, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Sale not found.' });
    io.emit('db_update', { collection: 'sales', action: 'update', data: updated });
    await broadcastFullSync();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SERVICES & JOB CARDS
// ==========================================
async function ensureFreeServiceMilestones() {
  const soldVehicles = await Vehicle.find({
    status: 'Sold'
  }).select('id assignedCustomerId model modelNumber');
  if (!soldVehicles.length) return;

  const vehicleIds = soldVehicles.map(vehicle => vehicle.id);
  const [sales, existingServices] = await Promise.all([
    Sale.find({ vehicleId: { $in: vehicleIds } }).select('vehicleId customerId saleDate deliveryDate'),
    ServiceRecord.find({ vehicleId: { $in: vehicleIds }, isFree: true }).select('vehicleId serviceNumber')
  ]);
  const saleByVehicle = new Map(sales.map(sale => [sale.vehicleId, sale]));
  const existingMilestones = new Set(existingServices.map(service =>
    `${service.vehicleId}:${service.serviceNumber}`
  ));
  const milestoneDays = [60, 180, 365];
  const milestoneKm = [1000, 5000, 10000];
  const records = [];

  for (const vehicle of soldVehicles) {
    const sale = saleByVehicle.get(vehicle.id);
    const customerId = sale?.customerId || vehicle.assignedCustomerId;
    if (!customerId) continue;
    const startDate = sale?.deliveryDate || sale?.saleDate || new Date().toISOString().slice(0, 10);
    for (let index = 0; index < milestoneDays.length; index += 1) {
      const serviceNumber = index + 1;
      if (existingMilestones.has(`${vehicle.id}:${serviceNumber}`)) continue;
      const dueDate = new Date(`${startDate}T12:00:00`);
      dueDate.setDate(dueDate.getDate() + milestoneDays[index]);
      const dateString = dueDate.toISOString().slice(0, 10);
      records.push({
        id: `auto-free-${vehicle.id}-${serviceNumber}`,
        serviceNumber,
        jobCardNumber: `JC-AUTO-${vehicle.id}-${serviceNumber}`,
        customerId,
        vehicleId: vehicle.id,
        isFree: true,
        status: 'Upcoming',
        scheduledDate: dateString,
        dueDate: dateString,
        dueKm: milestoneKm[index],
        customerComplaints: `Free service ${serviceNumber}: scheduled maintenance and EV inspection.`,
        inspectionChecklist: {},
        partsReplaced: [],
        labourCharge: 0,
        partsCharge: 0,
        taxAmount: 0,
        totalCustomerPayable: 0,
        createdAt: new Date().toISOString()
      });
      existingMilestones.add(`${vehicle.id}:${serviceNumber}`);
    }
  }

  if (records.length) {
    try {
      await ServiceRecord.insertMany(records, { ordered: false });
    } catch (error) {
      if (error.code !== 11000 && error.writeErrors?.some(writeError => writeError.code !== 11000)) {
        throw error;
      }
      const persisted = await ServiceRecord.find({
        vehicleId: { $in: vehicleIds },
        isFree: true,
        serviceNumber: { $in: [1, 2, 3] }
      }).select('vehicleId serviceNumber');
      const persistedKeys = new Set(persisted.map(service => `${service.vehicleId}:${service.serviceNumber}`));
      if (records.some(record => !persistedKeys.has(`${record.vehicleId}:${record.serviceNumber}`))) {
        throw error;
      }
    }
    await AuditLog.create({
      id: `aud-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      userName: process.env.ADMIN_NAME || 'Administrator',
      userRole: 'Owner',
      action: 'CREATE_MISSING_FREE_SERVICE_MILESTONES',
      module: 'Service',
      details: `Created ${records.length} missing free-service milestone record(s) for sold scooters.`
    });
  }
}

app.get('/api/services', async (req, res) => {
  try {
    await ensureFreeServiceMilestones();
    const services = await ServiceRecord.find().sort({ dueDate: 1, createdAt: -1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const srv = new ServiceRecord(req.body);
    await srv.save();
    io.emit('db_update', { collection: 'services', action: 'create', data: srv });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: srv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/services/:id', async (req, res) => {
  try {
    const updates = {};
    for (const field of ['dueDate', 'scheduledDate', 'dueKm', 'customerComplaints']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.dueDate !== undefined &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(String(updates.dueDate)) ||
         Number.isNaN(new Date(`${updates.dueDate}T12:00:00`).getTime()))) {
      return res.status(400).json({ success: false, message: 'Enter a valid service due date.' });
    }
    if (updates.scheduledDate === undefined && updates.dueDate !== undefined) {
      updates.scheduledDate = updates.dueDate;
    }
    if (updates.dueKm !== undefined &&
        (!Number.isFinite(Number(updates.dueKm)) || Number(updates.dueKm) < 0)) {
      return res.status(400).json({ success: false, message: 'Service kilometre interval must be non-negative.' });
    }
    if (updates.customerComplaints !== undefined &&
        (typeof updates.customerComplaints !== 'string' || updates.customerComplaints.length > 1000)) {
      return res.status(400).json({ success: false, message: 'Service notes must be text with at most 1000 characters.' });
    }
    const updated = await ServiceRecord.findOneAndUpdate(
      { id: req.params.id, status: { $ne: 'Completed' } },
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Editable service record not found.' });
    await AuditLog.create({
      id: `aud-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      userName: process.env.ADMIN_NAME || 'Administrator',
      userRole: 'Owner',
      action: 'EDIT_SERVICE',
      module: 'Service',
      details: `Updated service record ${updated.jobCardNumber}.`
    });
    io.emit('db_update', { collection: 'services', action: 'update', data: updated });
    await broadcastFullSync();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/services/:id/mark-done', async (req, res) => {
  try {
    const completedDate = new Date().toISOString().slice(0, 10);
    const updated = await ServiceRecord.findOneAndUpdate(
      { id: req.params.id, status: { $ne: 'Completed' } },
      { $set: { status: 'Completed', completedDate } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      const existing = await ServiceRecord.findOne({ id: req.params.id });
      if (!existing) return res.status(404).json({ success: false, message: 'Service record not found.' });
      return res.json({ success: true, data: existing });
    }
    await AuditLog.create({
      id: `aud-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      userName: process.env.ADMIN_NAME || 'Administrator',
      userRole: 'Owner',
      action: 'MARK_SERVICE_DONE',
      module: 'Service',
      details: `Marked service ${updated.jobCardNumber} completed.`
    });
    io.emit('db_update', { collection: 'services', action: 'update', data: updated });
    await broadcastFullSync();
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// EMI & FINANCING
// ==========================================
app.get('/api/emi', async (req, res) => {
  const emiList = await EMISchedule.find().sort({ createdAt: -1 });
  res.json(emiList);
});

app.post('/api/emi/payment', async (req, res) => {
  const { emiScheduleId, installmentNo, paidAmount, paymentMethod, notes } = req.body;
  const allowedMethods = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];
  const amount = Number(paidAmount);
  if (!emiScheduleId || !Number.isInteger(Number(installmentNo)) || !Number.isFinite(amount) || amount <= 0 ||
      !allowedMethods.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Enter a valid installment, amount, and payment method.' });
  }

  const session = await mongoose.startSession();
  let emi;
  let saleRecord;
  let receiptNumber;
  try {
    await session.withTransaction(async () => {
      emi = await EMISchedule.findOne({ id: emiScheduleId }).session(session);
      if (!emi) throw new Error('EMI schedule not found.');
      const installment = emi.installments.find(item => item.installmentNo === Number(installmentNo));
      if (!installment) throw new Error('Installment not found.');
      const amountDue = Number(installment.amount) - Number(installment.paidAmount || 0);
      if (amount > amountDue) throw new Error(`Payment cannot exceed the remaining installment amount of ₹${amountDue}.`);

      receiptNumber = `RCPT-EMI-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const paymentDate = new Date().toISOString().slice(0, 10);
      const newPaid = Number(installment.paidAmount || 0) + amount;
      const nextStatus = newPaid >= Number(installment.amount)
        ? 'Paid'
        : installment.dueDate < paymentDate ? 'Overdue' : 'Partially Paid';
      installment.paidAmount = newPaid;
      installment.paidDate = paymentDate;
      installment.status = nextStatus;
      installment.receiptNumber = receiptNumber;
      installment.paymentMethod = paymentMethod;
      installment.notes = notes || installment.notes;
      installment.outstandingBalance = Math.max(0, Number(installment.amount) - newPaid);
      installment.payments = [
        ...(installment.payments || []),
        { amount, paymentDate, paymentMethod, reference: notes || '', receiptNumber }
      ];
      emi.totalPaidAmount = Number(emi.totalPaidAmount || 0) + amount;
      emi.outstandingBalance = emi.installments.reduce((sum, item) =>
        sum + Math.max(0, Number(item.amount) - Number(item.paidAmount || 0)), 0
      );
      emi.markModified('installments');
      await emi.save({ session });

      saleRecord = await Sale.findOne({ id: emi.saleId }).session(session);
      if (!saleRecord) throw new Error('Sale associated with this installment schedule was not found.');
      let remainingSaleBalance = Math.max(0, Number(saleRecord.remainingAmount) || 0);
      if (!saleRecord.paymentMethod && remainingSaleBalance === 0) {
        remainingSaleBalance = Math.max(0, Number(saleRecord.totalOnRoadPrice) -
          Number(saleRecord.bookingAmount || 0) - Number(saleRecord.downPayment || 0));
      }
      if (!saleRecord.paymentMethod) {
        saleRecord.paymentMethod = emi.financeType === 'FinanceCompany'
          ? 'Finance Company EMI'
          : 'Showroom Installments';
      }
      saleRecord.remainingAmount = Math.max(0, remainingSaleBalance - amount);
      saleRecord.paymentLedger = [
        ...(saleRecord.paymentLedger || []),
        {
          amountDue: Number(installment.amount),
          amountPaid: amount,
          paymentDate,
          paymentMethod,
          reference: notes || '',
          outstandingBalance: saleRecord.remainingAmount
        }
      ];
      saleRecord.markModified('paymentLedger');
      await saleRecord.save({ session });

      await AuditLog.create([{
        id: `aud-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        userName: process.env.ADMIN_NAME || 'Administrator',
        userRole: 'Owner',
        action: 'COLLECT_EMI_PAYMENT',
        module: 'EMI & Payments',
        details: `Recorded receipt ${receiptNumber} for installment #${installmentNo}.`
      }], { session });
    });

    io.emit('db_update', { collection: 'emiSchedules', action: 'update', data: emi });
    io.emit('db_update', { collection: 'sales', action: 'update', data: saleRecord });
    await broadcastFullSync();
    return res.json({ success: true, receiptNumber, data: emi });
  } catch (err) {
    const status = /not found/i.test(err.message) ? 404 : /cannot exceed/i.test(err.message) ? 400 : 500;
    return res.status(status).json({ success: false, message: err.message });
  } finally {
    await session.endSession();
  }
});

// ==========================================
// REMINDERS (DEDICATED WHATSAPP ONLY)
// ==========================================
app.get('/api/reminders', async (req, res) => {
  const reminders = await Reminder.find().sort({ scheduledDate: 1, createdAt: -1 });
  res.json(reminders);
});

// Create Custom Reminder (Strictly WhatsApp Channel)
app.post('/api/reminders', async (req, res) => {
  try {
    const newId = req.body.id || `rem-${Date.now()}`;
    const reminder = new Reminder({
      ...req.body,
      id: newId,
      channels: ['WhatsApp'],
      lastSentVia: 'WhatsApp',
      deliveryAttempts: 0,
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    });
    await reminder.save();

    io.emit('db_update', { collection: 'reminders', action: 'create', data: reminder });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DISPATCH DEDICATED WHATSAPP REMINDER (REAL-TIME)
app.post('/api/reminders/:id/send-whatsapp', async (req, res) => {
  try {
    const reminderId = req.params.id;
    const result = await sendWhatsAppReminder(reminderId, io);
    await broadcastFullSync();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dismiss Reminder
app.delete('/api/reminders/:id', async (req, res) => {
  try {
    await Reminder.findOneAndDelete({ id: req.params.id });
    io.emit('db_update', { collection: 'reminders', action: 'delete', data: { id: req.params.id } });
    await broadcastFullSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// LEADS
// ==========================================
app.get('/api/leads', async (req, res) => {
  const leads = await Lead.find().sort({ createdAt: -1 });
  res.json(leads);
});

app.post('/api/leads', async (req, res) => {
  try {
    const count = await Lead.countDocuments();
    const newId = req.body.id || `lead-${Date.now().toString().slice(-4)}`;
    const leadCode = req.body.leadCode || `LEAD-${101 + count}`;
    const lead = new Lead({ ...req.body, id: newId, leadCode });
    await lead.save();

    io.emit('db_update', { collection: 'leads', action: 'create', data: lead });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const updated = await Lead.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    io.emit('db_update', { collection: 'leads', action: 'update', data: updated });
    await broadcastFullSync();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SPARE PARTS & INVENTORY
// ==========================================
app.get('/api/spare-parts', async (req, res) => {
  const parts = await SparePart.find().sort({ name: 1 });
  res.json(parts);
});

app.post('/api/spare-parts', async (req, res) => {
  try {
    const newId = req.body.id || `part-${Date.now().toString().slice(-4)}`;
    const part = new SparePart({ ...req.body, id: newId });
    await part.save();

    io.emit('db_update', { collection: 'spareParts', action: 'create', data: part });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: part });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/spare-parts/:id/stock', async (req, res) => {
  try {
    const { delta } = req.body;
    const part = await SparePart.findOne({ id: req.params.id });
    if (!part) return res.status(404).json({ success: false, message: 'Part not found' });

    part.currentStock = Math.max(0, part.currentStock + delta);
    await part.save();

    io.emit('db_update', { collection: 'spareParts', action: 'update', data: part });
    await broadcastFullSync();
    res.json({ success: true, data: part });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SUPPLIERS & PURCHASE ORDERS
// ==========================================
app.get('/api/suppliers', async (req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  res.json(suppliers);
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const newId = req.body.id || `sup-${Date.now().toString().slice(-4)}`;
    const supplier = new Supplier({ ...req.body, id: newId });
    await supplier.save();

    io.emit('db_update', { collection: 'suppliers', action: 'create', data: supplier });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/purchase-orders', async (req, res) => {
  try {
    const poNum = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
    const po = new PurchaseOrder({ ...req.body, id: `po-${Date.now()}`, poNumber: poNum });
    await po.save();

    io.emit('db_update', { collection: 'purchaseOrders', action: 'create', data: po });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: po });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// EXPENSES
// ==========================================
app.get('/api/expenses', async (req, res) => {
  const expenses = await Expense.find().sort({ date: -1 });
  res.json(expenses);
});

app.post('/api/expenses', async (req, res) => {
  try {
    const vNo = `VOUCH-OCT-${Math.floor(10 + Math.random() * 90)}`;
    const expense = new Expense({ ...req.body, id: `exp-${Date.now()}`, voucherNumber: vNo });
    await expense.save();

    io.emit('db_update', { collection: 'expenses', action: 'create', data: expense });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SETTINGS & AUDIT LOGS
// ==========================================
app.get('/api/settings', async (req, res) => {
  const settings = await Settings.findOne({ id: 'dealership_profile' });
  res.json(settings || seedData.initialSettings);
});

app.put('/api/settings', async (req, res) => {
  try {
    const updated = await Settings.findOneAndUpdate(
      { id: 'dealership_profile' },
      req.body,
      { upsert: true, new: true }
    );
    io.emit('db_update', { collection: 'settings', action: 'update', data: updated });
    await broadcastFullSync();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/audit-logs', async (req, res) => {
  const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
  res.json(logs);
});

// ==========================================
// SOCKET.IO REAL-TIME EVENTS
// ==========================================
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send immediate welcome status
  socket.emit('connection_status', {
    connected: true,
    database: 'MongoDB Atlas',
    cluster: 'auto-shop',
    timestamp: new Date().toISOString()
  });

  // Client requesting full sync
  socket.on('request_sync', async () => {
    await broadcastFullSync();
  });

  // Client triggering WhatsApp reminder via socket
  socket.on('send_whatsapp_reminder', async (data) => {
    try {
      const res = await sendWhatsAppReminder(data.reminderId, io);
      socket.emit('whatsapp_dispatch_success', res);
    } catch (err) {
      socket.emit('whatsapp_dispatch_error', { message: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Wipe all fake/demo data to start 100% clean & empty
app.post('/api/wipe-clean', async (req, res) => {
  try {
    await Promise.all([
      Vehicle.deleteMany({}),
      Customer.deleteMany({}),
      Sale.deleteMany({}),
      ServiceRecord.deleteMany({}),
      EMISchedule.deleteMany({}),
      Reminder.deleteMany({}),
      Lead.deleteMany({}),
      SparePart.deleteMany({}),
      Supplier.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      WarrantyInsurance.deleteMany({}),
      Expense.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    await broadcastFullSync();

    res.json({
      success: true,
      message: 'All default/fake data wiped! Database is now 100% clean and empty.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use('/api', (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  console.error(`[API] ${req.method} ${req.originalUrl} failed:`, error.message || 'Unknown error');
  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'The server could not complete this request. Check the backend logs.' : error.message
  });
});

// START SERVER
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  ensureSettings().then(() => {
    server.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`🚀 Auto-Shop CRM Backend Server running on port ${PORT}`);
      console.log(`📊 Connected to MongoDB: cluster0.sbghj.mongodb.net/auto-shop`);
      console.log(`⚡ Real-Time Socket.io Enabled`);
      console.log(`📱 WhatsApp Reminders Service: Active`);
      console.log(`===================================================`);
    });
  });
});
