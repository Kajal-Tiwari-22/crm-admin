require('dotenv').config();
const http = require('http');
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

const app = express();
const server = http.createServer(app);

// Configure Socket.io with wide CORS for local dev & production
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Middleware
app.use(cors());
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
      staff: seedData.initialStaff,
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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'MongoDB Atlas',
    cluster: 'auto-shop',
    realTime: 'Socket.io Active',
    whatsappService: 'WhatsApp Reminders Active',
    timestamp: new Date().toISOString()
  });
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
        staff: seedData.initialStaff,
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

    if (localDb.vehicles && Array.isArray(localDb.vehicles)) {
      for (const v of localDb.vehicles) {
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
        await Sale.findOneAndUpdate({ id: s.id }, s, { upsert: true, new: true });
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
app.get('/api/vehicles', async (req, res) => {
  const vehicles = await Vehicle.find().sort({ createdAt: -1 });
  res.json(vehicles);
});

app.post('/api/vehicles', async (req, res) => {
  try {
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
  const customers = await Customer.find().sort({ createdAt: -1 });
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
    const updated = await Customer.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    io.emit('db_update', { collection: 'customers', action: 'update', data: updated });
    await broadcastFullSync();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SALES & BILLING
// ==========================================
app.get('/api/sales', async (req, res) => {
  const sales = await Sale.find().sort({ createdAt: -1 });
  res.json(sales);
});

app.post('/api/sales', async (req, res) => {
  try {
    const saleData = req.body;
    const sale = new Sale(saleData);
    await sale.save();

    // Mark Vehicle as Sold
    await Vehicle.findOneAndUpdate(
      { id: saleData.vehicleId },
      { status: 'Sold', assignedCustomerId: saleData.customerId }
    );

    // Link vehicle to Customer
    await Customer.findOneAndUpdate(
      { id: saleData.customerId },
      { $addToSet: { vehicleIds: saleData.vehicleId } }
    );

    // If EMI schedule provided, create it
    if (saleData.emiSchedule) {
      const emi = new EMISchedule(saleData.emiSchedule);
      await emi.save();
    }

    // Auto-create service records if provided
    if (saleData.services && Array.isArray(saleData.services)) {
      await ServiceRecord.insertMany(saleData.services);
    }

    // Auto-create initial reminder (WhatsApp only)
    if (saleData.reminder) {
      const rem = new Reminder({
        ...saleData.reminder,
        channels: ['WhatsApp'],
        lastSentVia: 'WhatsApp'
      });
      await rem.save();
    }

    io.emit('db_update', { collection: 'sales', action: 'create', data: sale });
    await broadcastFullSync();
    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/sales/:id', async (req, res) => {
  try {
    const updated = await Sale.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
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
app.get('/api/services', async (req, res) => {
  const services = await ServiceRecord.find().sort({ createdAt: -1 });
  res.json(services);
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
    const updated = await ServiceRecord.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    io.emit('db_update', { collection: 'services', action: 'update', data: updated });
    await broadcastFullSync();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
  try {
    const { emiScheduleId, installmentNo, paidAmount, paymentMethod, notes } = req.body;
    const emi = await EMISchedule.findOne({ id: emiScheduleId });
    if (!emi) return res.status(404).json({ success: false, message: 'EMI Schedule not found' });

    const receiptNumber = `RCPT-EMI-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().slice(0, 10);

    emi.installments = emi.installments.map(inst => {
      if (inst.installmentNo !== installmentNo) return inst;
      const newPaid = (inst.paidAmount || 0) + paidAmount;
      return {
        ...inst,
        paidAmount: newPaid,
        paidDate: today,
        status: newPaid >= inst.amount ? 'Paid' : 'Partially Paid',
        receiptNumber,
        paymentMethod,
        notes: notes || inst.notes
      };
    });

    emi.totalPaidAmount = (emi.totalPaidAmount || 0) + paidAmount;
    emi.outstandingBalance = Math.max(0, emi.outstandingBalance - paidAmount);
    await emi.save();

    io.emit('db_update', { collection: 'emiSchedules', action: 'update', data: emi });
    await broadcastFullSync();
    res.json({ success: true, receiptNumber, data: emi });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
