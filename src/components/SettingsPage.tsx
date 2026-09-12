import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Clock, 
  Building2, 
  Save, 
  Check, 
  Compass, 
  AlertCircle, 
  ShieldCheck, 
  Info,
  HelpCircle,
  Download,
  Upload,
  FileJson,
  Sparkles,
  Globe,
  Cloud,
  RefreshCw
} from 'lucide-react';
import { SystemSettings, Employee, AttendanceRecord } from '../types';
import { getCurrentLocation } from '../utils/geo';
import { saveRecords } from '../utils/storage';
import { syncAllToCloud } from '../utils/firebase';

interface SettingsPageProps {
  settings: SystemSettings;
  employees?: Employee[];
  records?: AttendanceRecord[];
  onSaveSettings: (settings: SystemSettings) => void;
  onUpdateEmployees?: (employees: Employee[]) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  employees = [],
  records = [],
  onSaveSettings,
  onUpdateEmployees,
}) => {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isLocating, setIsLocating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [locatingError, setLocatingError] = useState('');
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState(false);
  const [cloudSyncSuccess, setCloudSyncSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual trigger to upload all local data to Firebase Cloud
  const handleManualCloudSync = async () => {
    setIsSyncingToCloud(true);
    setCloudSyncSuccess(null);
    try {
      const res = await syncAllToCloud(formData, employees, records);
      setCloudSyncSuccess(`تمت المزامنة بنجاح! تم رفع الإعدادات و${employees.length} موظف و${records.length} سجل إلى السحابة المركزية.`);
      setTimeout(() => setCloudSyncSuccess(null), 6000);
    } catch (err: any) {
      console.error('Manual cloud sync failed:', err);
      setCloudSyncSuccess('تعذر الاتصال بالسحابة حالياً، يرجى المحاولة لاحقاً.');
    } finally {
      setIsSyncingToCloud(false);
    }
  };

  // Sync formData whenever parent settings change
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Handle Export Backup JSON
  const handleExportBackup = () => {
    try {
      const dataToExport = {
        exportDate: new Date().toISOString(),
        settings: formData,
        employees: employees,
        records: records,
        app: 'employee-attendance-system',
      };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `نسخة_احتياطية_${formData.location.companyName || 'حضور_وانصراف'}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupNotice('تم تنزيل النسخة الاحتياطية بنجاح!');
      setTimeout(() => setBackupNotice(null), 4000);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  // Handle Import Backup JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.settings) {
          setFormData(parsed.settings);
          onSaveSettings(parsed.settings);
        }
        if (Array.isArray(parsed.employees) && onUpdateEmployees) {
          onUpdateEmployees(parsed.employees);
        }
        if (Array.isArray(parsed.records)) {
          saveRecords(parsed.records);
        }

        setBackupNotice(`تم بنجاح استيراد بيانات (${parsed.settings?.location?.companyName || 'المنشأة'}) و${parsed.employees?.length || 0} موظف!`);
        setSaveSuccess(true);
        setTimeout(() => {
          setBackupNotice(null);
          setSaveSuccess(false);
        }, 5000);
      } catch (err) {
        setBackupNotice('الملف غير صالح أو تالف. يرجى اختيار ملف JSON صحيح.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Detect Current Location
  const handleDetectCurrentLocation = async () => {
    setIsLocating(true);
    setLocatingError('');
    try {
      const res = await getCurrentLocation();
      setFormData((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          latitude: Number(res.coords.latitude.toFixed(6)),
          longitude: Number(res.coords.longitude.toFixed(6)),
        },
      }));
    } catch (err: any) {
      setLocatingError(err?.message || 'تعذر جلب إحداثيات موقعك الحالي.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          إعدادات النظام، النطاق الجغرافي وساعات العمل
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          ضبط إحداثيات مقر العمل، مسافة السماح بالمتر، مواعيد الحضور والانصراف، وقواعد طلب الأذونات.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>تم حفظ جميع الإعدادات بنجاح وتطبيقها على النظام فوراً!</span>
        </div>
      )}

      {backupNotice && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-800 text-sm font-bold flex items-center gap-2 animate-in fade-in">
          <Info className="w-5 h-5 text-sky-600" />
          <span>{backupNotice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Company Profile */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>بيانات المنشأة والمقر</span>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ سريع لبيانات الشركة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم الشركة / المؤسسة</label>
              <input
                type="text"
                required
                value={formData.location.companyName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    location: { ...prev.location, companyName: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم المقر / الفرع</label>
              <input
                type="text"
                required
                value={formData.location.locationName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    location: { ...prev.location, locationName: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Central Cloud Sync Status */}
          <div className="pt-2 border-t border-slate-100">
            <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>الربط السحابي المركزي (Firebase Cloud Database) نشط وموحد:</span>
                </span>
                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                  مزامنة فورية ولحظية
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                جميع حركات الحضور والانصراف وقوائم الموظفين تُحفظ في قاعدة البيانات السحابية المركزية فوراً. بمجرد قيام الموظف بتسجيل الدخول من هاتفه، يظهر اسمه وساعته في لوحة الإدارة في نفس الثانية.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Geolocation Coordinates & Radius */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>الإحداثيات المحددة والنطاق الجغرافي (GPS)</span>
            </div>

            <button
              type="button"
              onClick={handleDetectCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <Compass className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'جارٍ تحديد موقعك...' : 'تحديد موقعي الحالي تلقائياً'}</span>
            </button>
          </div>

          {locatingError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {locatingError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1">خط العرض (Latitude)</label>
              <input
                type="number"
                step="any"
                required
                value={formData.location.latitude}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    location: { ...prev.location, latitude: parseFloat(e.target.value) || 0 },
                  }))
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">خط الطول (Longitude)</label>
              <input
                type="number"
                step="any"
                required
                value={formData.location.longitude}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    location: { ...prev.location, longitude: parseFloat(e.target.value) || 0 },
                  }))
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">نصف قطر السماح (بالأمتار)</label>
              <div className="relative">
                <input
                  type="number"
                  min="20"
                  max="5000"
                  step="10"
                  required
                  value={formData.location.allowedRadiusMeters}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: {
                        ...prev.location,
                        allowedRadiusMeters: parseInt(e.target.value, 10) || 100,
                      },
                    }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white font-mono font-bold"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">متر</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">كيف يعمل التحقق الجغرافي؟</p>
              <p className="mt-0.5">
                عند مسح رمز QR وتسجيل الحضور أو الانصراف، يطلب النظام إحداثيات هاتف الموظف (GPS). إذا كانت المسافة بين الموظف ومقر العمل أكبر من <strong>{formData.location.allowedRadiusMeters} متراً</strong>، يرفض النظام التسجيل فوراً ويظهر له تنبيه بأنه خارج نطاق العمل.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="strict-gps-toggle"
              checked={formData.location.enableGpsStrictValidation}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  location: {
                    ...prev.location,
                    enableGpsStrictValidation: e.target.checked,
                  },
                }))
              }
              className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300"
            />
            <label htmlFor="strict-gps-toggle" className="text-xs font-semibold text-slate-800 cursor-pointer">
              إلزام الموظف بفتح GPS ومنع أي تسجيل خارج النطاق المحدد (موصى به)
            </label>
          </div>
        </div>

        {/* Section 3: Allowed Hours & Permission Window Rule */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-base">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span>ساعات إتاحة تسجيل الحضور والانصراف وقواعد الإذن</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
            {/* Check-In Window */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900">ساعات تسجيل الحضور الصباحي</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  حضور نظامي
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">من الساعة</label>
                  <input
                    type="time"
                    required
                    value={formData.hours.checkInStart}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hours: { ...prev.hours, checkInStart: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">إلى الساعة</label>
                  <input
                    type="time"
                    required
                    value={formData.hours.checkInEnd}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hours: { ...prev.hours, checkInEnd: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-emerald-800">
                التسجيل بين هاتين الساعتين يُسجل كحضور نظامي مباشر في الموعد.
              </p>
            </div>

            {/* Check-Out Window */}
            <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-900">ساعات تسجيل الانصراف المسائي</span>
                <span className="text-[11px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-semibold">
                  انصراف نظامي
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">من الساعة</label>
                  <input
                    type="time"
                    required
                    value={formData.hours.checkOutStart}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hours: { ...prev.hours, checkOutStart: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">إلى الساعة</label>
                  <input
                    type="time"
                    required
                    value={formData.hours.checkOutEnd}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hours: { ...prev.hours, checkOutEnd: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-teal-800">
                التسجيل بين هاتين الساعتين يُسجل كانصراف رسمي سليم.
              </p>
            </div>
          </div>

          {/* Explanation Banner of the Outside Hours Rule */}
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-300/80 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>قاعدة التسجيل خارج هذه الساعات (نظام الأذونات والموافقة):</span>
            </div>
            <p className="leading-relaxed">
              إذا حاول الموظف التسجيل <strong>قبل أو بعد</strong> النطاق الزمني المحدد أعلاه، تظهر له رسالة استفسار: 
              <span className="font-bold underline mx-1">"هل هناك إذن؟"</span> 
              ويُطلب منه إدخال <strong>سبب الإذن</strong> كتابةً، وتُرسل الحركة إلى لوحة الإدارة بحالة 
              <span className="font-bold text-amber-900 mx-1">"إذن بانتظار الموافقة"</span>.
            </p>
            <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-[11px] flex items-center justify-between font-bold">
              <span className="text-emerald-700">✓ موافقة الإدارة: يُحتسب حضور أو انصراف مظبوط</span>
              <span className="text-rose-700">✗ عدم موافقة الإدارة: يُحتسب غياب / مخالفة</span>
            </div>
          </div>
        </div>

        {/* Section 4: Employee Portal Features */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>خيارات بوابة الموظف والأمان</span>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-start gap-2 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80">
              <input
                type="checkbox"
                id="device-lock"
                checked={formData.enableDeviceLock ?? true}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    enableDeviceLock: e.target.checked,
                  }))
                }
                className="w-4 h-4 mt-0.5 text-emerald-600 rounded-sm border-slate-300"
              />
              <div>
                <label htmlFor="device-lock" className="font-bold text-slate-800 cursor-pointer flex items-center gap-1.5">
                  <span>تفعيل قفل الهاتف الذكي (Device Lock) — منع التبصيم للغير</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    حماية ضد التلاعب
                  </span>
                </label>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  يقوم بربط وتثبيت كود الموظف بهاتفه الشخصي تلقائياً في أول بصمة، ويمنع استخدام الهاتف لتسجيل أي موظف آخر.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="auto-save-code"
                checked={formData.autoSaveEmployeeCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    autoSaveEmployeeCode: e.target.checked,
                  }))
                }
                className="w-4 h-4 mt-0.5 text-emerald-600 rounded-sm border-slate-300"
              />
              <div>
                <label htmlFor="auto-save-code" className="font-bold text-slate-800 cursor-pointer">
                  حفظ كود الموظف تلقائياً على هاتفه عند دخوله كل مرة
                </label>
                <p className="text-xs text-slate-500">
                  بحيث لا يضطر لإعادة كتابة الكود يدوياً في كل زيارة للبوابة.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="manual-override"
                checked={formData.allowManualAdminOverride}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    allowManualAdminOverride: e.target.checked,
                  }))
                }
                className="w-4 h-4 mt-0.5 text-emerald-600 rounded-sm border-slate-300"
              />
              <div>
                <label htmlFor="manual-override" className="font-bold text-slate-800 cursor-pointer">
                  السماح للإدارة بالتسجيل اليدوي للموظف عند تعذر استخدام هاتفه
                </label>
                <p className="text-xs text-slate-500">
                  إتاحة زر في لوحة التحكم لإضافة بصمة حضور أو انصراف يدوي في الحالات الاستثنائية.
                </p>
              </div>
            </div>

            {/* Admin PIN Protection */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block font-bold text-slate-800 mb-1">
                رمز مرور لوحة الإدارة (Admin PIN):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={formData.adminPin || '1694375'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      adminPin: e.target.value,
                    }))
                  }
                  dir="ltr"
                  placeholder="1694375"
                  className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white font-mono font-bold text-center"
                />
                <span className="text-xs text-slate-500">
                  * هذا الرمز يحمي لوحة الإدارة من دخول الموظفين عند مسح الـ QR أو فتح رابط البوابة.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Firebase Real-Time Cloud Database */}
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-6 rounded-2xl border border-emerald-500/40 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-base text-emerald-300">
              <Cloud className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span>قاعدة البيانات السحابية المركزية (Firebase Cloud Sync)</span>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>نشطة ومربوطة مباشرة</span>
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            النظام الآن مرتبط مركزياً بقاعدة بيانات سحابية (Firestore). أي تسجيل حضور أو موظف جديد يتم حفظه ومزامنته فوراً في جزء من الثانية بين هواتف الموظفين وشاشة الإدارة حتى عند العمل من نطاقات مختلفة.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-black/20 p-3.5 rounded-xl border border-emerald-500/20">
            <div>
              <span className="text-slate-400">حالة الربط السحابي: </span>
              <strong className="text-emerald-400">متصل (Real-Time Live)</strong>
            </div>
            <div>
              <span className="text-slate-400">سعة التخزين: </span>
              <strong className="text-emerald-400">سحابية غير محدودة</strong>
            </div>
          </div>

          {cloudSyncSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{cloudSyncSuccess}</span>
            </div>
          )}

          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={handleManualCloudSync}
              disabled={isSyncingToCloud}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingToCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingToCloud ? 'جاري الرفع للسحابة...' : 'رفع ومزامنة البيانات الحالية للسحابة فوراً'}</span>
            </button>
          </div>
        </div>

        {/* Section 7: Data Backup & Cross-Platform Transfer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-base">
            <FileJson className="w-5 h-5 text-indigo-600" />
            <span>النسخ الاحتياطي ونقل البيانات (Backup & Transfer)</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            يمكنك حفظ نسخة احتياطية من جميع إعدادات المنشأة، قائمة الموظفين، وسجلات الحضور في ملف JSON واستعادتها في أي وقت أو نقلها لأي جهاز أو نطاق آخر.
          </p>

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تنزيل نسخة احتياطية كاملة (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition-colors"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>استيراد نسخة احتياطية (JSON)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            id="save-settings-btn"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
          >
            <Save className="w-4 h-4" />
            <span>حفظ الإعدادات بالكامل</span>
          </button>
        </div>
      </form>
    </div>
  );
};
