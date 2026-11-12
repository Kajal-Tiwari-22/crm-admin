import { CRMDatabase } from './storage';
import { Reminder } from '@/types/crm';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

let socket: Socket | null = null;

/**
 * Get or initialize real-time Socket.io connection to Auto-Shop Backend
 */
export function getMongoSocket(): Socket {
  if (!socket && typeof window !== 'undefined') {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: (callback) => {
        fetch('/api/auth/socket-token', { credentials: 'include' })
          .then(async response => {
            const result = await response.json();
            if (!response.ok || !result.success || !result.token) {
              throw new Error(result.message || 'Could not authenticate real-time connection.');
            }
            callback({ token: result.token });
          })
          .catch(error => {
            console.error('[Real-Time] Socket authentication failed:', error);
            callback({ token: '' });
          });
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('[Real-Time] Connected to MongoDB Atlas Socket.io backend:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.warn('[Real-Time] Disconnected from MongoDB Atlas backend.');
    });

    socket.on('connect_error', error => {
      console.error('[Real-Time] Socket connection failed:', error.message);
    });
  } else if (socket && !socket.connected) {
    socket.connect();
  }
  return socket as Socket;
}

/**
 * Fetch full database state from MongoDB Atlas
 */
export async function pullDatabaseFromMongoDB(): Promise<{ success: boolean; data?: Partial<CRMDatabase>; message: string }> {
  try {
    const res = await fetch('/api/all', { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const json = await res.json();
    if (json.success && json.data) {
      return {
        success: true,
        data: json.data,
        message: 'Successfully pulled live records from MongoDB Atlas (auto-shop)!'
      };
    }
    throw new Error(json.message || 'Failed to fetch MongoDB records');
  } catch (err: any) {
    console.warn('[MongoDB] Direct fetch error (backend may still be booting):', err.message);
    return {
      success: false,
      message: `Failed to pull from MongoDB: ${err.message}`
    };
  }
}

/**
 * Push full local state to MongoDB Atlas
 */
export async function pushDatabaseToMongoDB(localDb: CRMDatabase): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/sync-push', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localDb)
    });
    const json = await res.json();
    if (json.success) {
      return {
        success: true,
        message: 'Successfully synchronized all showroom records to MongoDB Atlas!'
      };
    }
    throw new Error(json.message || 'Failed to push records');
  } catch (err: any) {
    return {
      success: false,
      message: `MongoDB sync error: ${err.message}`
    };
  }
}

/**
 * Trigger Dedicated WhatsApp-Only Reminder
 */
export async function dispatchWhatsAppReminder(
  reminder: Reminder
): Promise<{ success: boolean; actionUrl?: string; message: string }> {
  const cleanPhone = reminder.customerPhone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encodedMsg = encodeURIComponent(reminder.messageContent);
  const directWaUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;

  // 1. Send update to Backend via API (updates MongoDB Atlas in real-time)
  try {
    fetch(`/api/reminders/${reminder.id}/send-whatsapp`, {
      method: 'POST',
      credentials: 'include'
    }).catch(e => console.warn('[WhatsApp] Backend notification warning:', e.message));
  } catch (e) {
    // ignore
  }

  // 2. Open interactive WhatsApp Web / Mobile chat immediately
  if (typeof window !== 'undefined') {
    window.open(directWaUrl, '_blank');
  }

  return {
    success: true,
    actionUrl: directWaUrl,
    message: `WhatsApp reminder prepared for ${reminder.customerName} (${formattedPhone}). Opening chat window...`
  };
}

/**
 * Reset MongoDB Atlas Database to initial seed records
 */
export async function resetMongoDBDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/seed', { method: 'POST', credentials: 'include' });
    const json = await res.json();
    return {
      success: json.success,
      message: json.message || 'MongoDB database reset to initial demo data.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to reset MongoDB: ${err.message}`
    };
  }
}

/**
 * Wipe all records from MongoDB Atlas database to start 100% clean & empty
 */
export async function wipeCleanMongoDB(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/wipe-clean', { method: 'POST', credentials: 'include' });
    const json = await res.json();
    return {
      success: json.success,
      message: json.message || 'All records wiped from MongoDB Atlas.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to wipe MongoDB: ${err.message}`
    };
  }
}
