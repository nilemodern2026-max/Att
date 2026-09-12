export type AttendanceType = 'check_in' | 'check_out';

export type RecordStatus = 
  | 'present'               // حضور نظامي في الوقت
  | 'checked_out'           // انصراف نظامي
  | 'late_with_permission'  // تأخير / حضور بإذن مقبول
  | 'early_with_permission' // انصراف مبكر بإذن مقبول
  | 'pending_permission'    // طلب إذن معلق في انتظار موافقة الإدارة
  | 'rejected_permission'   // إذن مرفوض (يعتبر غياب أو مخالفة)
  | 'absent';               // غياب

export interface Employee {
  id: string;
  name: string;             // اسم الموظف
  code: string;             // كود البصمة
  isActive: boolean;        // حالة التفعيل (نشط / متوقف)
  jobTitle?: string;
  department?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  joinDate?: string;
  avatar?: string;
  boundDeviceId?: string;   // معرف الجهاز المربوط بهاتف الموظف
  boundDeviceName?: string; // نوع المتصفح / الهاتف (مثال: iPhone Safari / Android Chrome)
  boundAt?: string;         // تاريخ وتوقيت ربط الجهاز
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;     // كود البصمة
  employeeName: string;     // اسم الموظف
  department?: string;
  date: string;             // YYYY-MM-DD
  checkInTime?: string;     // HH:mm:ss
  checkOutTime?: string;    // HH:mm:ss
  status: RecordStatus;
  
  // Geolocation details
  checkInCoords?: {
    latitude: number;
    longitude: number;
    distanceMeters: number;
    isWithinRadius: boolean;
  };
  checkOutCoords?: {
    latitude: number;
    longitude: number;
    distanceMeters: number;
    isWithinRadius: boolean;
  };

  // Permission / Exception details
  hasPermissionRequest?: boolean;
  permissionType?: 'check_in' | 'check_out';
  permissionReason?: string;
  permissionStatus?: 'pending' | 'approved' | 'rejected';
  permissionReviewedAt?: string;
  permissionReviewedBy?: string;
  rejectionReason?: string;

  notes?: string;
  createdAt: string;
}

export interface WorkLocationSettings {
  companyName: string;
  locationName: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number; // مثلا 150 متر
  enableGpsStrictValidation: boolean; // تفعيل التحقق الصارم من GPS
}

export interface WorkHoursSettings {
  // نافذة الحضور الصباحي المسموحة
  checkInStart: string;   // مثال: "07:30"
  checkInEnd: string;     // مثال: "09:30"
  
  // نافذة الانصراف المسائي المسموحة
  checkOutStart: string;  // مثال: "16:00"
  checkOutEnd: string;    // مثال: "18:00"
  
  // إعدادات إضافية
  workingDays: number[]; // 0 for Sunday, 1 for Monday, etc.
}

export interface SystemSettings {
  location: WorkLocationSettings;
  hours: WorkHoursSettings;
  allowManualAdminOverride: boolean;
  autoSaveEmployeeCode: boolean;
  enableDeviceLock: boolean; // تفعيل قفل الهاتف (منع التبصيم للغير)
  customCloudflareDomain?: string; // رابط مخصص لكلاود فلير أو نطاق الموقع
  adminPin?: string; // رمز مرور لوحة الإدارة
}
