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
  RefreshCw, 
  Building2, 
  ShieldCheck, 
  X, 
  ArrowRight,
  Info,
  Check
} from 'lucide-react';
import { Employee, AttendanceRecord, SystemSettings } from '../types';
import { getCurrentLocation, calculateDistanceMeters, formatDistance } from '../utils/geo';
import { 
  getCurrentTimeString, 
  getTodayDateString, 
  isTimeWithinWindow, 
  getSavedEmployeeCode, 
  saveEmployeeCode 
} from '../utils/storage';
import { pushRecordToCloud } from '../utils/firebase';

interface EmployeePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  records: AttendanceRecord[];
  settings: SystemSettings;
  onRecordSuccess: (record: AttendanceRecord) => void;
}

export const EmployeePortalModal: React.FC<EmployeePortalModalProps> = ({
  isOpen,
  onClose,
  employees,
  records,
  settings,
  onRecordSuccess,
}) => {
  if (!isOpen) return null;

  // Form State
  const [selectedAction, setSelectedAction] = useState<'check_in' | 'check_out'>('check_in');
  const [employeeCode, setEmployeeCode] = useState<string>('');
  const [isVerifyingGps, setIsVerifyingGps] = useState<boolean>(false);
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [isWithinGeoRadius, setIsWithinGeoRadius] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string>('');

  // Permission Flow State (when outside working hours)
  const [requiresPermission, setRequiresPermission] = useState<boolean>(false);
  const [permissionReason, setPermissionReason] = useState<string>('');

  // Result state
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
    record?: AttendanceRecord;
  } | null>(null);

  const today = getTodayDateString();

  // Load saved employee code on mount ("حفظ الكود تلقائي مع دخوله كل مره")
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
    ? records.find(
        (r) => (r.employeeId === currentEmployee.id || r.employeeCode === currentEmployee.code) && r.date === today
      )
    : undefined;

  // Check duplicate attendance rule
  const alreadyCheckedIn = !!todayRecord?.checkInTime;
  const alreadyCheckedOut = !!todayRecord?.checkOutTime;

  // Live GPS Distance Verification (runs in the background)
  const verifyLocation = async (): Promise<{ ok: boolean; error?: string }> => {
    setIsVerifyingGps(true);
    setGpsError('');
    try {
      const { coords } = await getCurrentLocation();
      const distance = calculateDistanceMeters(
        { latitude: coords.latitude, longitude: coords.longitude },
        { latitude: settings.location.latitude, longitude: settings.location.longitude }
      );
      setGpsDistance(distance);
      const isInside = distance <= settings.location.allowedRadiusMeters;
      setIsWithinGeoRadius(isInside);

      if (!isInside) {
        const msg = `أنت على مسافة (${formatDistance(distance)}) من مقر العمل، والحد الأقصى المسموح به هو (${settings.location.allowedRadiusMeters} متر). لا يمكن تسجيل الحضور إلا داخل مقر العمل!`;
        setGpsError(msg);
        return { ok: false, error: msg };
      }
      return { ok: true };
    } catch (err: any) {
      const msg =
        err?.message ||
        'تعذر تحديد الموقع الجغرافي. يرجى تفعيل الـ GPS والسماح بالوصول لموقعك للتأكد من تواجدك بمقر العمل.';
      setGpsError(msg);
      setIsWithinGeoRadius(false);
      return { ok: false, error: msg };
    } finally {
      setIsVerifyingGps(false);
    }
  };

  // Perform Initial GPS check silently in background when opening
  useEffect(() => {
    verifyLocation();
  }, []);

  // Handle Form Submission
  const handleProceedRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionResult(null);

    // 1. Validate employee code
    if (!employeeCode.trim()) {
      setSubmissionResult({
        success: false,
        title: 'كود الموظف مطلوب',
        message: 'يرجى إدخال كود الموظف الخاص بك للمتابعة.',
        type: 'error',
      });
      return;
    }

    if (!currentEmployee) {
      setSubmissionResult({
        success: false,
        title: 'كود غير صحيح',
        message: `الكود (${employeeCode}) غير مسجل في النظام أو حساب الموظف غير نشط. يرجى مراجعة إدارة الموارد البشرية.`,
        type: 'error',
      });
      return;
    }

    // 2. Check Duplication Rules:
    // "لا يمكن تسجيل حضور مرتين في نفس اليوم او خروج مرتين في نفس اليوم"
    if (selectedAction === 'check_in' && alreadyCheckedIn) {
      setSubmissionResult({
        success: false,
        title: 'تم تسجيل الحضور مسبقاً اليوم',
        message: `عفواً ${currentEmployee.name}، لقد قمت بتسجيل الحضور بالفعل اليوم في الساعة (${todayRecord?.checkInTime}). لا يُسمح بتسجيل الحضور أكثر من مرة في نفس اليوم.`,
        type: 'error',
      });
      return;
    }

    if (selectedAction === 'check_out') {
      if (!alreadyCheckedIn) {
        setSubmissionResult({
          success: false,
          title: 'لم يتم تسجيل الحضور أولاً',
          message: `عفواً ${currentEmployee.name}، لا يمكنك تسجيل الانصراف لأنك لم تسجل حضورك اليوم بعد!`,
          type: 'error',
        });
        return;
      }
      if (alreadyCheckedOut) {
        setSubmissionResult({
          success: false,
          title: 'تم تسجيل الانصراف مسبقاً اليوم',
          message: `عفواً ${currentEmployee.name}، لقد قمت بتسجيل الانصراف بالفعل اليوم في الساعة (${todayRecord?.checkOutTime}). لا يُسمح بتسجيل الانصراف أكثر من مرة في نفس اليوم.`,
          type: 'error',
        });
        return;
      }
    }

    // 3. Check GPS Geolocation bounds in background:
    // "لا يسمح له بالتسجيل الا في نطاق الاحداثيات المحدد له"
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

    // 4. Check Time Window:
    // "ساعات الاتحاه لتسجيل الدخول او الخروح من الساعه كذا للساعه كذا بخلاف ذلك الوقت يكون ظاهر هل هناك اذن ويدخل سبب الاذن"
    const currentTimeStr = getCurrentTimeString();
    const currentHHmm = currentTimeStr.slice(0, 5);

    let isWithinAllowedWindow = false;
    if (selectedAction === 'check_in') {
      isWithinAllowedWindow = isTimeWithinWindow(
        currentHHmm,
        settings.hours.checkInStart,
        settings.hours.checkInEnd
      );
    } else {
      isWithinAllowedWindow = isTimeWithinWindow(
        currentHHmm,
        settings.hours.checkOutStart,
        settings.hours.checkOutEnd
      );
    }

    // If outside allowed window and permission reason hasn't been entered yet -> prompt for permission
    if (!isWithinAllowedWindow && !requiresPermission) {
      setRequiresPermission(true);
      return;
    }

    if (requiresPermission && !permissionReason.trim()) {
      setSubmissionResult({
        success: false,
        title: 'سبب الإذن مطلوب',
        message: 'أنت تسجل خارج المواعيد الرسمية، يرجى كتابة سبب الإذن لاعتماده من الإدارة.',
        type: 'warning',
      });
      return;
    }

    // 5. Save Employee Code automatically
    if (settings.autoSaveEmployeeCode) {
      saveEmployeeCode(employeeCode.trim());
    }

    // 6. Build the attendance record
    const distanceRecorded = gpsDistance ?? 0;
    const coordsObj = {
      latitude: settings.location.latitude,
      longitude: settings.location.longitude,
      distanceMeters: distanceRecorded,
      isWithinRadius: true,
    };

    let newRecord: AttendanceRecord;

    if (selectedAction === 'check_in') {
      newRecord = {
        id: todayRecord ? todayRecord.id : `rec-${Date.now()}`,
        employeeId: currentEmployee.id,
        employeeCode: currentEmployee.code,
        employeeName: currentEmployee.name,
        department: currentEmployee.department,
        date: today,
        checkInTime: currentTimeStr,
        checkOutTime: todayRecord?.checkOutTime,
        status: requiresPermission ? 'pending_permission' : 'present',
        checkInCoords: coordsObj,
        hasPermissionRequest: requiresPermission,
        permissionType: 'check_in',
        permissionReason: requiresPermission ? permissionReason.trim() : undefined,
        permissionStatus: requiresPermission ? 'pending' : undefined,
        createdAt: new Date().toISOString(),
      };
    } else {
      // check_out
      newRecord = {
        ...(todayRecord || {
          id: `rec-${Date.now()}`,
          employeeId: currentEmployee.id,
          employeeCode: currentEmployee.code,
          employeeName: currentEmployee.name,
          department: currentEmployee.department,
          date: today,
          checkInTime: '08:30:00',
          createdAt: new Date().toISOString(),
        }),
        checkOutTime: currentTimeStr,
        status: requiresPermission ? 'pending_permission' : 'checked_out',
        checkOutCoords: coordsObj,
        hasPermissionRequest: requiresPermission || todayRecord?.hasPermissionRequest,
        permissionType: requiresPermission ? 'check_out' : todayRecord?.permissionType,
        permissionReason: requiresPermission ? permissionReason.trim() : todayRecord?.permissionReason,
        permissionStatus: requiresPermission ? 'pending' : todayRecord?.permissionStatus,
      };
    }

    // Push to cloud Firestore for instant live dashboard update
    pushRecordToCloud(newRecord).catch((err) => {
      console.warn('Direct cloud push encountered an issue, saved locally:', err);
    });

    // Dispatch save
    onRecordSuccess(newRecord);

    // Show friendly success confirmation
    if (requiresPermission) {
      setSubmissionResult({
        success: true,
        title: 'تم إرسال الحركة مع طلب الإذن بنجاح',
        message: `تم تسجيل ${selectedAction === 'check_in' ? 'حضورك' : 'انصرافك'} الساعة (${currentTimeStr}) خارج المواعيد المقررة. تم تحويل طلب الإذن للإدارة؛ عند الموافقة يُعتبر الحضور مضبوطاً، وإلا يُعتبر غياباً.`,
        type: 'warning',
        record: newRecord,
      });
    } else {
      setSubmissionResult({
        success: true,
        title: `تم تسجيل ${selectedAction === 'check_in' ? 'الحضور' : 'الانصراف'} بنجاح!`,
        message: `أهلاً بك يا ${currentEmployee.name}، تم التوثيق بنجاح في الساعة (${currentTimeStr}) داخل نطاق العمل المصرح به.`,
        type: 'success',
        record: newRecord,
      });
    }

    // Reset temporary states
    setRequiresPermission(false);
    setPermissionReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-400 tracking-wider">
                بوابة الحضور والانصراف للموظف
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">
                {settings.location.companyName}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{settings.location.locationName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Submission Success / Error banner */}
          {submissionResult && (
            <div
              className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 animate-in fade-in ${
                submissionResult.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : submissionResult.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {submissionResult.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : submissionResult.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1">{submissionResult.title}</h4>
                <p className="leading-relaxed">{submissionResult.message}</p>
                {submissionResult.success && (
                  <button
                    onClick={() => setSubmissionResult(null)}
                    className="mt-3 text-xs font-bold underline text-slate-700 hover:text-slate-900 block"
                  >
                    تسجيل حركة أخرى لموظف آخر
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleProceedRegistration} className="space-y-5">
            {/* Step 1: Choose Action: Check In or Check Out */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                اختر نوع الحركة المطلوبة:
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
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    selectedAction === 'check_in'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-600/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
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
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    selectedAction === 'check_out'
                      ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold ring-2 ring-teal-600/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold">🔴 تسجيل انصراف</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {settings.hours.checkOutStart} - {settings.hours.checkOutEnd}
                  </span>
                </button>
              </div>
            </div>

            {/* Step 2: Employee Code with Auto-Save */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  أدخل كود البصمة الخاص بك:
                </label>
                {settings.autoSaveEmployeeCode && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    يُحفظ تلقائياً كل مرة
                  </span>
                )}
              </div>

              <div className="relative">
                <Hash className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  id="portal-employee-code-input"
                  value={employeeCode}
                  onChange={(e) => {
                    setEmployeeCode(e.target.value);
                    setSubmissionResult(null);
                  }}
                  placeholder="مثال: 1001"
                  className="w-full pr-9 pl-4 py-3 bg-white border border-slate-300 rounded-xl text-base font-bold font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Detected Employee Card */}
              {currentEmployee ? (
                <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                      {currentEmployee.name.slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{currentEmployee.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono font-medium">كود البصمة: {currentEmployee.code}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    كود موثق ✓
                  </span>
                </div>
              ) : employeeCode.trim().length > 0 ? (
                <p className="text-[11px] text-rose-500 font-medium">
                  لم يتم العثور على موظف بهذا الكود ({employeeCode}).
                </p>
              ) : null}

              {/* Status note for today if already recorded */}
              {todayRecord && (
                <div className="text-[11px] bg-slate-200/60 p-2.5 rounded-lg text-slate-700 flex flex-col gap-1">
                  <span className="font-bold">سجلك المسجل اليوم:</span>
                  <div className="flex items-center gap-3">
                    <span>حضور: {todayRecord.checkInTime ? `✓ (${todayRecord.checkInTime})` : 'لم يُسجل'}</span>
                    <span>•</span>
                    <span>انصراف: {todayRecord.checkOutTime ? `✓ (${todayRecord.checkOutTime})` : 'لم يُسجل'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Outside Hours Permission Reason Prompt (only shown if outside scheduled hours) */}
            {requiresPermission && (
              <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-300 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>تنبيه: أنت تسجل خارج الساعات المحددة! هل هناك إذن؟</span>
                </div>
                <p className="text-xs text-amber-900">
                  ساعات {selectedAction === 'check_in' ? 'الحضور' : 'الانصراف'} المحددة بالنظام هي من ({selectedAction === 'check_in' ? settings.hours.checkInStart : settings.hours.checkOutStart}) إلى ({selectedAction === 'check_in' ? settings.hours.checkInEnd : settings.hours.checkOutEnd}).
                  للتسجيل الآن، يرجى كتابة سبب الإذن ليتم عرضه على الإدارة للاعتماد.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    سبب الإذن بالتفصيل <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={permissionReason}
                    onChange={(e) => setPermissionReason(e.target.value)}
                    placeholder="مثال: عطل مفاجئ في المواصلات / ظرف طارئ / مهمة عمل خارجية بتكليف مسبق..."
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="portal-submit-attendance-btn"
                disabled={isVerifyingGps || !currentEmployee}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-white text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  !currentEmployee || isVerifyingGps
                    ? 'bg-slate-400 cursor-not-allowed'
                    : selectedAction === 'check_in'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 active:scale-[0.99]'
                    : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25 active:scale-[0.99]'
                }`}
              >
                {isVerifyingGps ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
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
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-3 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>نظام الحضور مؤمن بالتحقق من النطاق الجغرافي لمقر العمل (GPS)</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
