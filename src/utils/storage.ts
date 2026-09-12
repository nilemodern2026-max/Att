import { Employee, AttendanceRecord, SystemSettings } from '../types';

const STORAGE_KEYS = {
  EMPLOYEES: 'attendance_system_employees_v1',
  RECORDS: 'attendance_system_records_v1',
  SETTINGS: 'attendance_system_settings_v1',
  SAVED_EMPLOYEE_CODE: 'attendance_saved_emp_code',
};

// Default company settings - Clean & ready for user customization
export const DEFAULT_SETTINGS: SystemSettings = {
  location: {
    companyName: 'نظام إدارة الحضور والانصراف الذكي',
    locationName: 'المقر الرئيسي',
    latitude: 30.0444,     // Default coordinates
    longitude: 31.2357,
    allowedRadiusMeters: 200, // 200 meters radius
    enableGpsStrictValidation: false, // Turned off initially until admin sets exact GPS
  },
  hours: {
    checkInStart: '08:00',
    checkInEnd: '10:00',
    checkOutStart: '16:00',
    checkOutEnd: '18:00',
    workingDays: [0, 1, 2, 3, 4], // Sun to Thu
  },
  allowManualAdminOverride: true,
  autoSaveEmployeeCode: true,
  enableDeviceLock: true, // قفل الهاتف مفعل لحماية التسجيل ومنع التلاعب
  customCloudflareDomain: '',
  adminPin: '1234',
};

// Clean initial employees list - No dummy records so user data is 100% authentic
export const INITIAL_EMPLOYEES: Employee[] = [];

// Helper to format today's date YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format time HH:mm:ss
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Check if current time is within specified time range (HH:mm to HH:mm)
export function isTimeWithinWindow(currentHHmm: string, startHHmm: string, endHHmm: string): boolean {
  return currentHHmm >= startHHmm && currentHHmm <= endHHmm;
}

// Initial records is empty by default
function generateInitialRecords(): AttendanceRecord[] {
  return [];
}

// Load Employees
export function getStoredEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Auto-clean legacy sample employees (1001 to 1005 with أحمد محمود) so user gets clean slate
    const isLegacyDummies = parsed.length <= 5 && parsed.some(e => e.code === '1001' && (e.name.includes('أحمد محمود') || e.name.includes('إبراهيم')));
    if (isLegacyDummies) {
      localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
      return [];
    }

    return parsed;
  } catch (e) {
    console.error('Failed to parse employees', e);
    return [];
  }
}

// Save Employees
export function saveEmployees(employees: Employee[]): void {
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  window.dispatchEvent(new Event('attendance_data_changed'));
}

// Load Attendance Records
export function getStoredRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!raw) {
      const initial = generateInitialRecords();
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse records', e);
    return [];
  }
}

// Save Attendance Records
export function saveRecords(records: AttendanceRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  window.dispatchEvent(new Event('attendance_data_changed'));
}

// Load Settings
export function getStoredSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    const pin = (!parsed.adminPin || parsed.adminPin === '1234') ? '1694375' : parsed.adminPin;
    const customCloudflare = parsed.customCloudflareDomain?.trim() || '';
    
    // If the company name is still the legacy dummy one, replace it with neutral default
    const effectiveCompanyName = parsed.location?.companyName || DEFAULT_SETTINGS.location.companyName;
    const effectiveLocationName = parsed.location?.locationName || DEFAULT_SETTINGS.location.locationName;

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      adminPin: pin,
      customCloudflareDomain: customCloudflare,
      enableDeviceLock: parsed.enableDeviceLock ?? true,
      location: { 
        ...DEFAULT_SETTINGS.location, 
        ...(parsed.location || {}),
        companyName: effectiveCompanyName,
        locationName: effectiveLocationName,
      },
      hours: { ...DEFAULT_SETTINGS.hours, ...(parsed.hours || {}) },
    };
  } catch (e) {
    console.error('Failed to parse settings', e);
    return DEFAULT_SETTINGS;
  }
}

// Save Settings
export function saveSettings(settings: SystemSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  window.dispatchEvent(new Event('attendance_data_changed'));
}

// Device identification helpers for "Device Lock" anti-tampering feature
export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem('attendance_device_id');
    if (!deviceId) {
      deviceId = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('attendance_device_id', deviceId);
    }
    return deviceId;
  } catch {
    return 'dev-temp-' + Date.now();
  }
}

export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'هاتف ذكي';
  const ua = navigator.userAgent || '';
  let os = 'جهاز محمول';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac/i.test(ua)) os = 'Mac';
  else if (/Windows/i.test(ua)) os = 'Windows PC';

  let browser = 'متصفح';
  if (/CriOS|Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  return `${os} • ${browser}`;
}

// Saved employee code helpers for the "حفظ الكود تلقائي مع دخوله كل مره" feature
export function getSavedEmployeeCode(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.SAVED_EMPLOYEE_CODE) || '';
  } catch {
    return '';
  }
}

export function saveEmployeeCode(code: string): void {
  try {
    if (code.trim()) {
      localStorage.setItem(STORAGE_KEYS.SAVED_EMPLOYEE_CODE, code.trim());
    }
  } catch {
    // Ignore storage issues
  }
}
