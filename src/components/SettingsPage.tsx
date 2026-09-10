import React, { useState } from 'react';
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
  HelpCircle
} from 'lucide-react';
import { SystemSettings } from '../types';
import { getCurrentLocation } from '../utils/geo';

interface SettingsPageProps {
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isLocating, setIsLocating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [locatingError, setLocatingError] = useState('');

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Company Profile */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-base">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>بيانات المنشأة والمقر</span>
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
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
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
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
              />
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
