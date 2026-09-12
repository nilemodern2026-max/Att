import { Employee, SystemSettings, AttendanceRecord } from '../types';
import { saveSettings, saveEmployees, saveRecords, getStoredSettings, getStoredEmployees } from './storage';

export interface CompactSyncPayload {
  c: string;      // Company Name
  l: string;      // Location Name
  lat: number;    // Latitude
  lng: number;    // Longitude
  rad: number;    // Allowed Radius
  emp: Array<{
    c: string;    // Code
    n: string;    // Name
    id: string;   // ID
    d?: string;   // Department
  }>;
  v: number;      // Version / timestamp
}

export interface FullAdminSyncPayload {
  settings: SystemSettings;
  employees: Employee[];
  records?: AttendanceRecord[];
  timestamp: string;
}

/**
 * Safe UTF-8 Base64 encoder for browser environments
 */
export function safeBase64Encode(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (err) {
    console.error('Base64 encoding failed', err);
    return '';
  }
}

/**
 * Safe UTF-8 Base64 decoder for browser environments
 */
export function safeBase64Decode(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch (err) {
    console.error('Base64 decoding failed', err);
    return '';
  }
}

/**
 * Creates a compact sync payload string suitable for appending to QR URLs
 */
export function createQrSyncPayload(settings: SystemSettings, employees: Employee[]): string {
  try {
    // Only include active employees to keep QR code compact and fast-scanning
    const activeEmps = employees.filter((e) => e.isActive !== false);
    
    const compact: CompactSyncPayload = {
      c: settings.location.companyName || '',
      l: settings.location.locationName || '',
      lat: settings.location.latitude,
      lng: settings.location.longitude,
      rad: settings.location.allowedRadiusMeters,
      emp: activeEmps.map((e) => ({
        c: e.code,
        n: e.name,
        id: e.id,
        d: e.department || '',
      })),
      v: 1,
    };

    const json = JSON.stringify(compact);
    return safeBase64Encode(json);
  } catch (err) {
    console.error('Failed to create QR sync payload', err);
    return '';
  }
}

/**
 * Checks and applies sync payload from URL parameters on page load.
 * Returns true if synchronization was performed.
 */
export function checkAndApplyUrlSync(): {
  applied: boolean;
  type: 'portal' | 'admin' | null;
  companyName?: string;
  employeeCount?: number;
} {
  if (typeof window === 'undefined') {
    return { applied: false, type: null };
  }

  try {
    const url = new URL(window.location.href);
    const syncParam = url.searchParams.get('sync');
    const adminSyncParam = url.searchParams.get('import_admin');

    // 1. Handle Compact QR Portal Sync (from employee scanning QR)
    if (syncParam) {
      const decodedJson = safeBase64Decode(syncParam);
      if (decodedJson) {
        const payload: CompactSyncPayload = JSON.parse(decodedJson);
        
        // Merge into stored settings
        const currentSettings = getStoredSettings();
        const updatedSettings: SystemSettings = {
          ...currentSettings,
          location: {
            ...currentSettings.location,
            companyName: payload.c || currentSettings.location.companyName,
            locationName: payload.l || currentSettings.location.locationName,
            latitude: typeof payload.lat === 'number' ? payload.lat : currentSettings.location.latitude,
            longitude: typeof payload.lng === 'number' ? payload.lng : currentSettings.location.longitude,
            allowedRadiusMeters: typeof payload.rad === 'number' ? payload.rad : currentSettings.location.allowedRadiusMeters,
          },
        };
        saveSettings(updatedSettings);

        // Merge employees
        if (Array.isArray(payload.emp) && payload.emp.length > 0) {
          const currentEmployees = getStoredEmployees();
          const existingMap = new Map(currentEmployees.map((e) => [e.code, e]));

          payload.emp.forEach((item) => {
            const existing = existingMap.get(item.c);
            if (existing) {
              existingMap.set(item.c, {
                ...existing,
                name: item.n,
                department: item.d || existing.department,
                isActive: true,
              });
            } else {
              existingMap.set(item.c, {
                id: item.id || `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                code: item.c,
                name: item.n,
                department: item.d || '',
                isActive: true,
              });
            }
          });

          const mergedEmployees = Array.from(existingMap.values());
          saveEmployees(mergedEmployees);
        }

        // Clean sync parameter from URL so browser address bar looks clean
        url.searchParams.delete('sync');
        window.history.replaceState({}, '', url.toString());

        return {
          applied: true,
          type: 'portal',
          companyName: payload.c,
          employeeCount: payload.emp?.length || 0,
        };
      }
    }

    // 2. Handle Full Admin Transfer (when admin syncs from AI Studio to Cloudflare)
    if (adminSyncParam) {
      const decodedJson = safeBase64Decode(adminSyncParam);
      if (decodedJson) {
        const payload: FullAdminSyncPayload = JSON.parse(decodedJson);
        if (payload.settings) {
          saveSettings(payload.settings);
        }
        if (payload.employees) {
          saveEmployees(payload.employees);
        }
        if (payload.records) {
          saveRecords(payload.records);
        }

        url.searchParams.delete('import_admin');
        window.history.replaceState({}, '', url.toString());

        return {
          applied: true,
          type: 'admin',
          companyName: payload.settings?.location?.companyName,
          employeeCount: payload.employees?.length || 0,
        };
      }
    }
  } catch (err) {
    console.error('Error applying URL sync payload', err);
  }

  return { applied: false, type: null };
}

/**
 * Creates full admin transfer URL for Cloudflare deployment
 */
export function createAdminTransferUrl(
  targetDomain: string,
  settings: SystemSettings,
  employees: Employee[],
  records?: AttendanceRecord[]
): string {
  try {
    let base = targetDomain.trim();
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = 'https://' + base;
    }
    base = base.replace(/\/+$/, '');

    const payload: FullAdminSyncPayload = {
      settings,
      employees,
      records: records || [],
      timestamp: new Date().toISOString(),
    };

    const encoded = safeBase64Encode(JSON.stringify(payload));
    return `${base}/?import_admin=${encoded}`;
  } catch (err) {
    console.error('Failed to create admin transfer URL', err);
    return '';
  }
}
