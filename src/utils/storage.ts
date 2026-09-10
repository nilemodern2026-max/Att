import { Employee, AttendanceRecord, SystemSettings } from '../types';

const STORAGE_KEYS = {
  EMPLOYEES: 'attendance_system_employees_v1',
  RECORDS: 'attendance_system_records_v1',
  SETTINGS: 'attendance_system_settings_v1',
  SAVED_EMPLOYEE_CODE: 'attendance_saved_emp_code',
};

// Default company settings
export const DEFAULT_SETTINGS: SystemSettings = {
  location: {
    companyName: 'شركة النيل الحديثة للحلول والخدمات',
    locationName: 'المقر الرئيسي - القاهرة',
    latitude: 30.0444,     // Cairo coordinates by default
    longitude: 31.2357,
    allowedRadiusMeters: 200, // 200 meters radius
    enableGpsStrictValidation: true,
  },
  hours: {
    checkInStart: '08:00',
    checkInEnd: '09:30',
    checkOutStart: '16:00',
    checkOutEnd: '18:00',
    workingDays: [0, 1, 2, 3, 4], // Sun to Thu
  },
  allowManualAdminOverride: true,
  autoSaveEmployeeCode: true,
};

// Default sample employees with name and fingerprint code
export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    code: '1001',
    name: 'أحمد محمود إبراهيم',
    isActive: true,
  },
  {
    id: 'emp-2',
    code: '1002',
    name: 'سارة عبد الرحمن علي',
    isActive: true,
  },
  {
    id: 'emp-3',
    code: '1003',
    name: 'محمد طارق كمال',
    isActive: true,
  },
  {
    id: 'emp-4',
    code: '1004',
    name: 'منى يوسف حسن',
    isActive: true,
  },
  {
    id: 'emp-5',
    code: '1005',
    name: 'كريم عادل الشناوي',
    isActive: true,
  },
];

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

// Seed initial records for testing and demonstration
function generateInitialRecords(): AttendanceRecord[] {
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  return [
    {
      id: 'rec-today-1',
      employeeId: 'emp-1',
      employeeCode: '1001',
      employeeName: 'م. أحمد محمود إبراهيم',
      department: 'تقنية المعلومات',
      date: today,
      checkInTime: '08:14:22',
      checkOutTime: undefined,
      status: 'present',
      checkInCoords: {
        latitude: 30.0445,
        longitude: 31.2358,
        distanceMeters: 25,
        isWithinRadius: true,
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rec-today-2',
      employeeId: 'emp-2',
      employeeCode: '1002',
      employeeName: 'سارة عبد الرحمن علي',
      department: 'الموارد البشرية',
      date: today,
      checkInTime: '08:28:10',
      checkOutTime: undefined,
      status: 'present',
      checkInCoords: {
        latitude: 30.0443,
        longitude: 31.2356,
        distanceMeters: 38,
        isWithinRadius: true,
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rec-today-3',
      employeeId: 'emp-4',
      employeeCode: '1004',
      employeeName: 'منى يوسف حسن',
      department: 'خدمة العملاء',
      date: today,
      checkInTime: '10:15:00',
      checkOutTime: undefined,
      status: 'pending_permission',
      hasPermissionRequest: true,
      permissionType: 'check_in',
      permissionReason: 'عطل مفاجئ في وسيلة المواصلات وازدحام مروري شديد على المحور',
      permissionStatus: 'pending',
      checkInCoords: {
        latitude: 30.0444,
        longitude: 31.2357,
        distanceMeters: 15,
        isWithinRadius: true,
      },
      createdAt: new Date().toISOString(),
    },
    // Yesterday records
    {
      id: 'rec-yest-1',
      employeeId: 'emp-1',
      employeeCode: '1001',
      employeeName: 'م. أحمد محمود إبراهيم',
      department: 'تقنية المعلومات',
      date: yesterday,
      checkInTime: '08:10:00',
      checkOutTime: '16:45:00',
      status: 'checked_out',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'rec-yest-2',
      employeeId: 'emp-2',
      employeeCode: '1002',
      employeeName: 'سارة عبد الرحمن علي',
      department: 'الموارد البشرية',
      date: yesterday,
      checkInTime: '08:22:00',
      checkOutTime: '17:05:00',
      status: 'checked_out',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'rec-yest-3',
      employeeId: 'emp-3',
      employeeCode: '1003',
      employeeName: 'محمد طارق كمال',
      department: 'الإدارة المالية',
      date: yesterday,
      checkInTime: '09:45:00',
      checkOutTime: '16:30:00',
      status: 'late_with_permission',
      hasPermissionRequest: true,
      permissionType: 'check_in',
      permissionReason: 'مراجعة مصلحة الضرائب لإنهاء الفحص المستندي',
      permissionStatus: 'approved',
      permissionReviewedAt: yesterday + ' 10:00:00',
      permissionReviewedBy: 'مدير الموارد البشرية',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

// Load Employees
export function getStoredEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse employees', e);
    return INITIAL_EMPLOYEES;
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
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      location: { ...DEFAULT_SETTINGS.location, ...(parsed.location || {}) },
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
