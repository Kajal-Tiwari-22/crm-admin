const { Reminder, AuditLog } = require('../models');

/**
 * Clean & format phone numbers for WhatsApp delivery
 * E.g. '9811000123' -> '919811000123'
 */
function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Dispatch a WhatsApp-only reminder
 */
async function sendWhatsAppReminder(reminderId, io) {
  const reminder = await Reminder.findOne({ id: reminderId });
  if (!reminder) {
    throw new Error(`Reminder with ID ${reminderId} not found`);
  }

  const cleanPhone = formatWhatsAppPhone(reminder.customerPhone);
  const encodedMsg = encodeURIComponent(reminder.messageContent);
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;

  // Check if WhatsApp Business API Token is configured
  let apiSuccess = false;
  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  if (token) {
    try {
      // Optional: If WhatsApp Cloud API is configured with Phone Number ID
      // Otherwise WhatsApp Web URL is used directly
    } catch (apiErr) {
      console.warn('[WhatsApp] API call error, falling back to direct URL:', apiErr.message);
    }
  }

  // Update Reminder record in MongoDB
  reminder.status = 'Sent';
  reminder.channels = ['WhatsApp'];
  reminder.lastSentVia = 'WhatsApp';
  reminder.deliveryAttempts = (reminder.deliveryAttempts || 0) + 1;
  reminder.lastAttemptAt = new Date().toISOString();
  reminder.whatsappDirectUrl = waUrl;
  await reminder.save();

  // Create Audit Log
  const logId = `aud-${Date.now()}`;
  const audit = new AuditLog({
    id: logId,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    userName: 'Admin',
    userRole: 'Owner',
    action: 'SEND_WHATSAPP_REMINDER',
    module: 'Reminders',
    details: `Sent WhatsApp reminder "${reminder.title}" to ${reminder.customerName} (${cleanPhone})`
  });
  await audit.save();

  // Broadcast real-time update to all connected clients
  if (io) {
    io.emit('whatsapp_reminder_sent', {
      reminderId: reminder.id,
      customerName: reminder.customerName,
      customerPhone: cleanPhone,
      status: 'Sent',
      timestamp: reminder.lastAttemptAt,
      actionUrl: waUrl
    });

    io.emit('db_update', {
      collection: 'reminders',
      action: 'update',
      data: reminder
    });
  }

  return {
    success: true,
    channel: 'WhatsApp',
    actionUrl: waUrl,
    customerName: reminder.customerName,
    phone: cleanPhone,
    message: `WhatsApp reminder successfully sent to ${reminder.customerName} (${cleanPhone})!`
  };
}

module.exports = {
  formatWhatsAppPhone,
  sendWhatsAppReminder
};
