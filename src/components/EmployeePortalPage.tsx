import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  Hash, 
  Building2, 
  ShieldCheck, 
  ArrowRight,
  Lock,
  Calendar,
  Sparkles,
  KeyRound,
  X,
  Smartphone,
  ShieldAlert
} from 'lucide-react';
import { Employee, AttendanceRecord, SystemSettings } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { getCurrentLocation, calculateDistanceMeters, formatDistance } from '../utils/geo';
import { 
  getCurrentTimeString, 
  getTodayDateString, 
  isTimeWithinWindow, 
  getSavedEmployeeCode, 
  saveEmployeeCode,
  getOrCreateDeviceId,
  getDeviceName
} from '../utils/storage';

interface EmployeePortalPageProps {
  employees: Employee[];
  records: AttendanceRecord[];
  settings: SystemSettings;
  onRecordSuccess: (record: AttendanceRecord) => void;
  onSwitchToAdmin?: () => void;
  onUpdateEmployee?: (employee: Employee) => void;
}

export const EmployeePortalPage: React.FC<EmployeePortalPageProps> = ({
  employees,
  records,
  settings,
  onRecordSuccess,
  onSwitchToAdmin,
  onUpdateEmployee,
}) => {
  // Action State
  const [selectedAction, setSelectedAction] = useState<'check_in' | 'check_out'>('check_in');
  const [employeeCode, setEmployeeCode] = useState<string>('');
  const [isVerifyingGps, setIsVerifyingGps] = useState<boolean>(false);
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string>('');

  // Permission Flow State (when outside working hours)
  const [requiresPermission, setRequiresPermission] = useState<boolean>(false);
  const [permissionReason, setPermissionReason] = useState<string>('');

  // Clock
  const [liveClock, setLiveClock] = useState<string>('');
  const [liveDate, setLiveDate] = useState<string>('');

  // Result state
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
    record?: AttendanceRecord;
  } | null>(null);

  // Admin Login Dialog State (for authorized manager only)
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const today = getTodayDateString();

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveClock(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setLiveDate(
        now.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load saved employee code on mount
  useEffect(() => {
    const saved = getSavedEmployeeCode();
    if (saved) {
      setEmployeeCode(saved);
    }
  }, []);

  // Find employee matching code
  const currentEmployee = employees.find(
    (e) => e.code.trim() === employeeCode.trim() && e.isActive
  );

  // Today's existing record for this employee
  const todayRecord = currentEmployee
    ? records.find((r) => r.employeeId === currentEmployee.id && r.date === today)
    : undefined;

  const alreadyCheckedIn = !!todayRecord?.checkInTime;
  const alreadyCheckedOut = !!todayRecord?.checkOutTime;

  // Background GPS Verification
  const verifyLocation = async (): Promise<{ ok: boolean; error?: string }> => {
    setIsVerifyingGps(true);
    setGpsError('');
    try {
      const pos = await getCurrentLocation();
      const distance = calculateDistanceMeters(
        { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        { latitude: settings.location.latitude, longitude: settings.location.longitude }
      );

      setGpsDistance(distance);
      const isInside = distance <= settings.location.allowedRadiusMeters;

      if (!isInside) {
        const msg = `أنت على مسافة (${formatDistance(distance)}) من مقر العمل، والحد الأقصى المسموح به هو (${settings.location.allowedRadiusMeters} متر). لا يمكن تسجيل الحضور إلا داخل مقر العمل!`;
        setGpsError(msg);
        return { ok: false, error: msg };
      }
      return { ok: true };
    } catch (err: any) {
      const msg =
        err?.message ||
        'تعذر تحديد الموقع الجغرافي. يرجى تفعيل الـ GPS والسماح للمتصفح بالوصول للموقع للتأكد من تواجدك بمقر العمل.';
      setGpsError(msg);
      return { ok: false, error: msg };
    } finally {
      setIsVerifyingGps(false);
    }
  };

  // Submission handler
  const handleProceedRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionResult(null);

    // 1. Validate employee code
    if (!employeeCode.trim()) {
      setSubmissionResult({
        success: false,
        title: 'كود البصمة مطلوب',
        message: 'يرجى كتابة كود البصمة الوظيفي الخاص بك للمتابعة.',
        type: 'error',
      });
      return;
    }

    if (!currentEmployee) {
      setSubmissionResult({
        success: false,
        title: 'كود الموظف غير صحيح',
        message: 'لم يتم العثور على موظف مسجل ونشط بهذا الكود. يرجى مراجعة إدارة الموارد البشرية.',
        type: 'error',
      });
      return;
    }

    // 1.5 Device Lock & Anti-Buddy Punching Check (ربط وقفل كود الموظف بهاتفه الشخصي)
    if (settings.enableDeviceLock) {
      const currentDeviceId = getOrCreateDeviceId();
      const currentDeviceName = getDeviceName();

      // فحص أ: هل هذا الهاتف مسجل ومقترن بالفعل لموظف آخر في الشركة؟
      const conflictingEmployee = employees.find(
        (e) => e.id !== currentEmployee.id && e.boundDeviceId && e.boundDeviceId === currentDeviceId
      );

      if (conflictingEmployee) {
        setSubmissionResult({
          success: false,
          title: 'غير مسموح: الهاتف مسجل لموظف آخر',
          message: `عفواً! هذا الهاتف مقترن بالفعل بزميلك (${conflictingEmployee.name}). يُمنع تسجيل الحضور لأكثر من موظف من نفس الهاتف منعاً للتبصيم للغير. يرجى استخدام هاتفك الشخصي.`,
          type: 'error',
        });
        return;
      }

      // فحص ب: إذا كان الموظف قد ربط حسابه بهاتف سابق، هل الهاتف الحالي يطابقه؟
      if (currentEmployee.boundDeviceId && currentEmployee.boundDeviceId !== currentDeviceId) {
        setSubmissionResult({
          success: false,
          title: 'الحساب مقترن بهاتف آخر',
          message: `عفواً يا ${currentEmployee.name}، حسابك مقفل على جهازك المسجل مسبقاً (${currentEmployee.boundDeviceName || 'هاتفك السابق'}). لا يمكنك التبصيم من جهاز آخر. إذا قمت بتغيير هاتفك، يرجى مراجعة الإدارة لفك القفل.`,
          type: 'error',
        });
        return;
      }

      // فحص ج: إذا لم يكن الموظف مربوطاً بأي هاتف حتى الآن، يتم ربط وقفل هذا الهاتف له فوراً
      if (!currentEmployee.boundDeviceId && onUpdateEmployee) {
        onUpdateEmployee({
          ...currentEmployee,
          boundDeviceId: currentDeviceId,
          boundDeviceName: currentDeviceName,
          boundAt: new Date().toISOString(),
        });
      }
    }

    // Auto-save code for this employee's browser
    if (settings.autoSaveEmployeeCode) {
      saveEmployeeCode(employeeCode.trim());
    }

    // 2. Prevent duplicate check-in or duplicate check-out
    if (selectedAction === 'check_in' && alreadyCheckedIn) {
      setSubmissionResult({
        success: false,
        title: 'تم تسجيل حضورك مسبقاً اليوم',
        message: `الموظف (${currentEmployee.name}) مسجل له حضور بالفعل اليوم الساعة (${todayRecord?.checkInTime}). لا يمكن تكرار تسجيل الحضور في نفس اليوم.`,
        type: 'warning',
      });
      return;
    }

    if (selectedAction === 'check_out' && alreadyCheckedOut) {
      setSubmissionResult({
        success: false,
        title: 'تم تسجيل انصرافك مسبقاً اليوم',
        message: `الموظف (${currentEmployee.name}) مسجل له انصراف بالفعل اليوم الساعة (${todayRecord?.checkOutTime}). لا يمكن تكرار تسجيل الانصراف في نفس اليوم.`,
        type: 'warning',
      });
      return;
    }

    if (selectedAction === 'check_out' && !alreadyCheckedIn) {
      setSubmissionResult({
        success: false,
        title: 'تنبيه: لم يتم تسجيل حضورك أولاً',
        message: `الموظف (${currentEmployee.name}) لم يسجل حضوراً لهذا اليوم بعد. يرجى اختيار (تسجيل حضور) أولاً.`,
        type: 'warning',
      });
      return;
    }

    // 3. Strict GPS Geolocation bounds in background
    if (settings.location.enableGpsStrictValidation) {
      const geoCheck = await verifyLocation();
      if (!geoCheck.ok) {
        setSubmissionResult({
          success: false,
          title: 'خارج النطاق الجغرافي لمقر العمل',
          message:
            geoCheck.error ||
            `لا يسمح بالتسجيل خارج نطاق المقر المحدد (${settings.location.allowedRadiusMeters} متر).`,
          type: 'error',
        });
        return;
      }
    }

    // 4. Validate Working Hours Window
    const currentTimeStr = getCurrentTimeString();
    const isWithinHours =
      selectedAction === 'check_in'
        ? isTimeWithinWindow(currentTimeStr, settings.hours.checkInStart, settings.hours.checkInEnd)
        : isTimeWithinWindow(currentTimeStr, settings.hours.checkOutStart, settings.hours.checkOutEnd);

    // If outside hours and no permission reason given yet -> prompt for permission
    if (!isWithinHours && !requiresPermission) {
      setRequiresPermission(true);
      setSubmissionResult({
        success: false,
        title: 'خارج مواعيد العمل الرسمية',
        message: `الوقت الحالي (${currentTimeStr}) خارج نافذة ${
          selectedAction === 'check_in' ? 'الحضور' : 'الانصراف'
        } المحددة (${
          selectedAction === 'check_in'
            ? settings.hours.checkInStart + ' - ' + settings.hours.checkInEnd
            : settings.hours.checkOutStart + ' - ' + settings.hours.checkOutEnd
        }). يرجى كتابة سبب التأخير / الإذن بالأسفل لإرساله للاعتماد.`,
        type: 'warning',
      });
      return;
    }

    if (requiresPermission && !permissionReason.trim()) {
      setSubmissionResult({
        success: false,
        title: 'سبب الإذن مطلوب',
        message: 'يرجى كتابة سبب التأخير أو الانصراف المبكر ليتم رفعه للإدارة.',
        type: 'error',
      });
      return;
    }

    // 5. Build the attendance record
    const distanceRecorded = gpsDistance ?? 0;
    const coordsObj = {
      latitude: settings.location.latitude,
      longitude: settings.location.longitude,
      distanceMeters: Math.round(distanceRecorded),
      isWithinRadius: true,
    };

    let newRecord: AttendanceRecord;

    if (todayRecord) {
      // Update existing record
      newRecord = {
        ...todayRecord,
        checkOutTime: selectedAction === 'check_out' ? currentTimeStr : todayRecord.checkOutTime,
        checkOutCoords: selectedAction === 'check_out' ? coordsObj : todayRecord.checkOutCoords,
        status:
          selectedAction === 'check_out'
            ? requiresPermission
              ? 'early_with_permission'
              : 'checked_out'
            : todayRecord.status,
        hasPermissionRequest: requiresPermission ? true : todayRecord.hasPermissionRequest,
        permissionType: requiresPermission ? selectedAction : todayRecord.permissionType,
        permissionReason: requiresPermission ? permissionReason : todayRecord.permissionReason,
        permissionStatus: requiresPermission ? 'pending' : todayRecord.permissionStatus,
      };
    } else {
      // Create new record for today
      newRecord = {
        id: `rec-${Date.now()}`,
        employeeId: currentEmployee.id,
        employeeCode: currentEmployee.code,
        employeeName: currentEmployee.name,
        department: currentEmployee.department,
        date: today,
        checkInTime: selectedAction === 'check_in' ? currentTimeStr : undefined,
        checkInCoords: selectedAction === 'check_in' ? coordsObj : undefined,
        status: requiresPermission ? 'pending_permission' : 'present',
        hasPermissionRequest: requiresPermission,
        permissionType: requiresPermission ? selectedAction : undefined,
        permissionReason: requiresPermission ? permissionReason : undefined,
        permissionStatus: requiresPermission ? 'pending' : undefined,
        createdAt: new Date().toISOString(),
      };
    }

    onRecordSuccess(newRecord);

    // Show friendly success confirmation
    if (requiresPermission) {
      setSubmissionResult({
        success: true,
        title: 'تم إرسال الحركة مع طلب الإذن بنجاح',
        message: `تم توثيق ${selectedAction === 'check_in' ? 'حضورك' : 'انصرافك'} الساعة (${currentTimeStr}) خارج المواعيد المقررة. تم رفع طلب الإذن للإدارة لاعتماده رسمياً.`,
        type: 'warning',
        record: newRecord,
      });
    } else {
      setSubmissionResult({
        success: true,
        title: `تم تسجيل ${selectedAction === 'check_in' ? 'الحضور' : 'الانصراف'} بنجاح!`,
        message: `أهلاً بك يا ${currentEmployee.name}، تم توثيق بصمتك في تمام الساعة (${currentTimeStr}) داخل مقر العمل.`,
        type: 'success',
        record: newRecord,
      });
    }

    setRequiresPermission(false);
    setPermissionReason('');
  };

  // Admin PIN verification
  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = settings.adminPin || '1694375';
    if (enteredPin.trim() === correctPin.trim()) {
      setShowAdminPinModal(false);
      setEnteredPin('');
      setPinError('');
      if (onSwitchToAdmin) {
        onSwitchToAdmin();
      }
    } else {
      setPinError('رمز المرور غير صحيح. هذا القسم مخصص لمدير النظام فقط.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-['Cairo',sans-serif] selection:bg-emerald-500 selection:text-white">
      {/* Top Bar / Branding */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-xl mx-auto px-4 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CompanyLogo size="md" companyName={settings.location.companyName} />
            <div>
              <span className="text-[11px] font-bold text-emerald-400 tracking-wider block">
                بوابة الحضور والانصراف للموظف
              </span>
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
                {settings.location.companyName}
              </h1>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>{settings.location.locationName}</span>
              </p>
            </div>
          </div>

          {/* Clock badge */}
          <div className="text-left bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 hidden xs:block">
            <div className="text-xs font-mono font-bold text-emerald-400" dir="ltr">
              {liveClock}
            </div>
            <div className="text-[10px] text-slate-400">
              {liveDate.split('،')[0]}
            </div>
          </div>
        </div>
      </header>

      {/* Main Registration Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-8">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-5 sm:p-7 space-y-6">
          
          {/* Live Mobile Time Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{liveDate}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span dir="ltr">{liveClock}</span>
            </div>
          </div>

          {/* Submission Result Receipt / Alert */}
          {submissionResult && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm flex items-start gap-3.5 animate-in fade-in zoom-in-95 ${
                submissionResult.type === 'success'
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-sm shadow-emerald-100'
                  : submissionResult.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm shadow-amber-100'
                  : 'bg-rose-50 border-rose-200 text-rose-950 shadow-sm shadow-rose-100'
              }`}
            >
              {submissionResult.type === 'success' ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : submissionResult.type === 'warning' ? (
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              
              <div className="flex-1 space-y-1.5">
                <h3 className="font-extrabold text-sm sm:text-base">{submissionResult.title}</h3>
                <p className="leading-relaxed text-slate-700">{submissionResult.message}</p>
                
                {submissionResult.success && submissionResult.record && (
                  <div className="pt-3 mt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800">
                      الموظف: {submissionResult.record.employeeName}
                    </span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-200" dir="ltr">
                      {submissionResult.record.checkOutTime || submissionResult.record.checkInTime}
                    </span>
                  </div>
                )}

                {submissionResult.success && (
                  <button
                    onClick={() => setSubmissionResult(null)}
                    className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline block"
                  >
                    تسجيل حركة لموظف آخر
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Attendance Form */}
          <form onSubmit={handleProceedRegistration} className="space-y-5">
            {/* Step 1: Action Choice */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                1. حدد نوع التسجيل المطلوب:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="portal-select-checkin"
                  onClick={() => {
                    setSelectedAction('check_in');
                    setRequiresPermission(false);
                    setSubmissionResult(null);
                  }}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedAction === 'check_in'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-xs scale-[1.01]'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-colors ${
                    selectedAction === 'check_in' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <LogIn className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold">🟢 تسجيل حضور</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {settings.hours.checkInStart} - {settings.hours.checkInEnd}
                  </span>
                </button>

                <button
                  type="button"
                  id="portal-select-checkout"
                  onClick={() => {
                    setSelectedAction('check_out');
                    setRequiresPermission(false);
                    setSubmissionResult(null);
                  }}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedAction === 'check_out'
                      ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold ring-2 ring-teal-500/20 shadow-xs scale-[1.01]'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-colors ${
                    selectedAction === 'check_out' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold">🔴 تسجيل انصراف</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {settings.hours.checkOutStart} - {settings.hours.checkOutEnd}
                  </span>
                </button>
              </div>
            </div>

            {/* Step 2: Employee Fingerprint Code */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="portal-employee-code" className="text-xs font-bold text-slate-800">
                  2. أدخل كود البصمة الوظيفي:
                </label>
                {employeeCode && currentEmployee && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                    محفوظ على هاتفك ✓
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="portal-employee-code"
                  value={employeeCode}
                  onChange={(e) => {
                    setEmployeeCode(e.target.value);
                    setSubmissionResult(null);
                  }}
                  placeholder="مثال: 1001"
                  dir="ltr"
                  className="w-full pr-10 pl-4 py-3 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              {/* Real-time Employee Name Card */}
              {currentEmployee ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">
                      مرحباً: {currentEmployee.name}
                    </span>
                    <span className="text-emerald-700 font-medium">
                      {currentEmployee.department || 'موظف معتمد'}
                    </span>
                  </div>
                  {settings.enableDeviceLock && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {currentEmployee.boundDeviceId
                          ? `حسابك مقترن ومحمي على هذا الهاتف (${currentEmployee.boundDeviceName || 'هاتفك الشخصي'})`
                          : 'سيتم ربط وقفل كودك على هاتفك الشخصي مع أول بصمة لحمايتك'}
                      </span>
                    </div>
                  )}
                </div>
              ) : employeeCode.trim() ? (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                  كود غير مسجل، يرجى التأكد من كتابة كودك الصحيح.
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  * سيتم حفظ الكود تلقائياً على هذا الهاتف لعدم كتابته في كل مرة.
                </p>
              )}
            </div>

            {/* Step 3: Outside Hours Permission Reason Prompt (only if outside window) */}
            {requiresPermission && (
              <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-300 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>مطلوب سبب الإذن (خارج المواعيد المقررة):</span>
                </div>
                <textarea
                  rows={2}
                  value={permissionReason}
                  onChange={(e) => setPermissionReason(e.target.value)}
                  placeholder="اكتب سبب التأخير أو الانصراف المبكر ليتم رفعه للإدارة..."
                  className="w-full p-3 text-xs bg-white border border-amber-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            )}

            {/* Step 4: Big Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="portal-submit-registration"
                disabled={isVerifyingGps}
                className={`w-full py-4 px-6 rounded-2xl text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  isVerifyingGps
                    ? 'bg-slate-400 cursor-not-allowed'
                    : selectedAction === 'check_in'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 active:scale-[0.99]'
                    : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25 active:scale-[0.99]'
                }`}
              >
                {isVerifyingGps ? (
                  <>
                    <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>جارٍ التحقق من موقعك وتأكيد التسجيل...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {requiresPermission
                        ? 'إرسال التسجيل مع طلب الإذن للاعتماد'
                        : selectedAction === 'check_in'
                        ? 'تأكيد تسجيل الحضور الآن'
                        : 'تأكيد تسجيل الانصراف الآن'}
                    </span>
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-4 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>نظام الحضور مؤمن بالتحقق التلقائي من النطاق الجغرافي لمقر العمل (GPS)</span>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer / Discreet Admin Lock Link */}
      <footer className="max-w-xl w-full mx-auto px-4 py-4 text-center text-xs text-slate-500 flex items-center justify-between">
        <span>جميع الحقوق محفوظة © {settings.location.companyName}</span>
        
        {/* Protected Admin Access (Requires Manager PIN) */}
        {onSwitchToAdmin && (
          <button
            type="button"
            onClick={() => {
              setEnteredPin('');
              setPinError('');
              setShowAdminPinModal(true);
            }}
            className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-200/50"
            title="دخول لوحة التحكم (خاص بالمدير فقط)"
          >
            <Lock className="w-3 h-3" />
            <span>لوحة الإدارة</span>
          </button>
        )}
      </footer>

      {/* Admin PIN Authentication Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">دخول لوحة تحكم الإدارة</h3>
                  <p className="text-[11px] text-slate-500">خاص بمسؤول النظام والموارد البشرية</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdminPinModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyAdminPin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أدخل رمز المرور الإداري (PIN):
                </label>
                <input
                  type="password"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    setPinError('');
                  }}
                  placeholder="أدخل رمز مرور الإدارة"
                  dir="ltr"
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
                {pinError && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5">
                    {pinError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  تأكيد الدخول للإدارة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
