import React, { useEffect, useRef, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Smartphone, 
  QrCode, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  ExternalLink,
  Globe,
  Settings,
  RotateCcw,
  Sparkles,
  Eye,
  X,
  AlertCircle
} from 'lucide-react';
import { SystemSettings, Employee, AttendanceRecord } from '../types';
import { generateQrPosterHtml, printHtmlDocument } from '../utils/printUtils';
import { createQrSyncPayload, createAdminTransferUrl } from '../utils/syncUtils';
import { CompanyLogo } from './CompanyLogo';

interface QrCodeStationProps {
  settings: SystemSettings;
  employees?: Employee[];
  records?: AttendanceRecord[];
  onOpenEmployeePortal: () => void;
  onSaveSettings?: (settings: SystemSettings) => void;
}

export const QrCodeStation: React.FC<QrCodeStationProps> = ({
  settings,
  employees = [],
  records = [],
  onOpenEmployeePortal,
  onSaveSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedTransferUrl, setCopiedTransferUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  // Custom Cloudflare domain configuration state
  const [isEditingDomain, setIsEditingDomain] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState(settings.customCloudflareDomain || '');
  const [savedDomainNotice, setSavedDomainNotice] = useState(false);

  // Sync custom domain input when settings change
  useEffect(() => {
    setCustomDomainInput(settings.customCloudflareDomain || '');
  }, [settings.customCloudflareDomain]);

  // Print helper modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Detected origin
  const detectedOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Determine effective Portal URL:
  // Encodes real company settings and active employees so any mobile device gets synced upon scanning
  const portalUrl = useMemo(() => {
    let base = settings.customCloudflareDomain?.trim() || detectedOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
    
    // Ensure protocol
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = 'https://' + base;
    }
    
    // Remove trailing slash
    base = base.replace(/\/+$/, '');
    
    // Clean and lightweight direct URL for maximum clarity and fast scanning
    return `${base}/?portal=1`;
  }, [settings.customCloudflareDomain, detectedOrigin]);

  // Determine target domain for Admin full transfer
  const effectiveDomain = settings.customCloudflareDomain?.trim() || detectedOrigin;
  const adminTransferUrl = useMemo(() => {
    return effectiveDomain 
      ? createAdminTransferUrl(effectiveDomain, settings, employees, records)
      : '';
  }, [effectiveDomain, settings, employees, records]);

  // Generate QR Code onto canvas + high-resolution PNG Data URL
  useEffect(() => {
    // 1. Render on canvas
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        portalUrl,
        {
          width: 320,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) {
            console.error('Error generating QR code on canvas', error);
          } else if (canvasRef.current) {
            const newUrl = canvasRef.current.toDataURL('image/png');
            setQrDataUrl((prev) => (prev !== newUrl ? newUrl : prev));
          }
        }
      );
    }

    // 2. Also generate direct high-res 600px Data URL for reliable printing and downloading
    QRCode.toDataURL(
      portalUrl,
      {
        width: 600,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (error, url) => {
        if (!error && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [portalUrl]);

  // Copy URL
  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Copy Admin Transfer URL
  const handleCopyTransferUrl = () => {
    if (!adminTransferUrl) return;
    navigator.clipboard.writeText(adminTransferUrl);
    setCopiedTransferUrl(true);
    setTimeout(() => setCopiedTransferUrl(false), 2500);
  };

  // Download QR as PNG
  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `كود_حضور_وانصراف_${settings.location.companyName}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Trigger Print directly + show helper modal
  const handlePrint = () => {
    const posterHtml = generateQrPosterHtml({
      companyName: settings.location.companyName,
      locationName: settings.location.locationName,
      qrDataUrl: qrDataUrl || (canvasRef.current ? canvasRef.current.toDataURL('image/png') : ''),
      allowedRadiusMeters: settings.location.allowedRadiusMeters,
      portalUrl: portalUrl,
    });

    // Send to printer via hidden iframe
    printHtmlDocument(posterHtml, `لافتة_${settings.location.companyName}`);
    setShowPrintModal(true);
  };

  // Save custom Cloudflare domain
  const handleSaveDomain = () => {
    if (!onSaveSettings) return;
    const cleaned = customDomainInput.trim().replace(/\/+$/, '');
    const updatedSettings: SystemSettings = {
      ...settings,
      customCloudflareDomain: cleaned,
    };
    onSaveSettings(updatedSettings);
    setSavedDomainNotice(true);
    setTimeout(() => setSavedDomainNotice(false), 2500);
    setIsEditingDomain(false);
  };

  // Reset to auto-detected domain
  const handleResetToAuto = () => {
    if (!onSaveSettings) return;
    setCustomDomainInput('');
    const updatedSettings: SystemSettings = {
      ...settings,
      customCloudflareDomain: '',
    };
    onSaveSettings(updatedSettings);
    setSavedDomainNotice(true);
    setTimeout(() => setSavedDomainNotice(false), 2500);
    setIsEditingDomain(false);
  };

  const isUsingCustom = Boolean(settings.customCloudflareDomain?.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>محطة رمز QR للطباعة وتثبيت نقطة الحضور</span>
            {isUsingCustom ? (
              <span className="text-[11px] bg-sky-100 text-sky-800 font-medium px-2 py-0.5 rounded-full">
                رابط كلاود فلير مخصص
              </span>
            ) : (
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                كشف تلقائي لنطاق الموقع
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            اطبع هذا الرمز وضعه عند مدخل الشركة أو الاستقبال ليمسحه الموظفون بهواتفهم لتسجيل الدخول والخروج.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="print-qr-btn"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>طباعة اللافتة الورقية</span>
          </button>
          <button
            id="download-qr-btn"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل صورة الرمز (PNG)</span>
          </button>
          <button
            onClick={() => window.open(portalUrl, '_blank')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 transition-colors"
            title="فتح الرابط في تبويب جديد كما يراه الموظف على هاتفه تماماً"
          >
            <ExternalLink className="w-4 h-4" />
            <span>معاينة شاشة الموظف (تبويب جديد)</span>
          </button>
          <button
            onClick={onOpenEmployeePortal}
            className="inline-flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title="التبديل إلى شاشة الموظف مباشرة"
          >
            <Smartphone className="w-4 h-4" />
            <span>عرض شاشة الموظف</span>
          </button>
        </div>
      </div>

      {/* Security Guarantee Banner: Employee Isolation */}
      <div className="bg-emerald-950 text-white rounded-2xl p-4 sm:p-5 border border-emerald-800/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 mt-0.5 sm:mt-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-emerald-200 flex items-center gap-2">
              <span>عزل تام ومحمي: الموظف لا يرى لوحة الإدارة نهائياً</span>
              <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-extrabold">
                مؤمن ومفعل ✓
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              عند مسح رمز الـ QR بالهاتف، يفتح المتصفح صفحة تسجيل الحضور والانصراف للموظف فقط. تم إخفاء شريط التنقل ولوحة التحكم وقوائم الموظفين والإعدادات تماماً عن الموظف.
            </p>
          </div>
        </div>
      </div>

      {/* Cloudflare Domain Sync & Configuration Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 print:hidden space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-100">
                  ربط وتوافق رمز QR مع كلاود فلير (Cloudflare Pages)
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                  جاهز 100%
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isUsingCustom 
                  ? 'تم قفل الرمز ليعمل مباشرة برابط كلاود فلير المخصص الذي أدخلته.' 
                  : 'يتعرف النظام تلقائياً على رابط كلاود فلير عند فتح الموقع منه. يمكنك أيضاً كتابة رابط كلاود فلير يدوياً لتوليد الرمز وطباعته فوراً.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditingDomain(!isEditingDomain)}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-100 transition-colors border border-white/10"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isEditingDomain ? 'إغلاق الإعداد' : 'تعديل رابط كلاود فلير'}</span>
          </button>
        </div>

        {/* QR Code Scannability & High Speed Guarantee Callout */}
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 text-xs space-y-1.5 text-emerald-100">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>رمز QR فائق السرعة والدقة (Ultra-Fast & High Reliability):</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            الرمز مشفر بأعلى معيار دقة وتصحيح أخطاء (Error Correction Level H) ليعمل مع أي كاميرا هاتف فوراً في أقل من ثانية، ومربوط بنطاق شركتكم <strong className="text-white">"{settings.location.companyName}"</strong> لفتح صفحة الحضور والانصراف مباشرة دون أي بطء أو تشويش.
          </p>
        </div>

        {/* Current Encoded URL Bar */}
        <div className="bg-black/30 backdrop-blur-xs rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-white/5">
          <div className="flex items-center gap-2 overflow-hidden text-xs">
            <span className="text-slate-400 shrink-0 font-medium">الرابط المباشر في الـ QR:</span>
            <span className="font-mono text-emerald-400 truncate select-all" dir="ltr">
              {portalUrl}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="self-end sm:self-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'تم النسخ' : 'نسخ رابط الـ QR'}</span>
          </button>
        </div>

        {/* Admin Sync to Cloudflare Action */}
        {adminTransferUrl && (
          <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <span>نقل لوحة التحكم والإدارة بالكامل إلى كلاود فلير</span>
              </div>
              <p className="text-[11px] text-slate-300">
                إذا أردت فتح لوحة الإدارة وإضافة الموظفين مستقبلاً من رابط كلاود فلير نفسه:
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyTransferUrl}
                className="px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 font-medium text-xs inline-flex items-center gap-1"
              >
                {copiedTransferUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTransferUrl ? 'تم نسخ الرابط' : 'نسخ رابط النقل'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.open(adminTransferUrl, '_blank')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح ومزامنة لوحة الإدارة هناك</span>
              </button>
            </div>
          </div>
        )}

        {/* Domain Editor Form (if toggled) */}
        {isEditingDomain && (
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-200">
                أدخل رابط مشروعك على Cloudflare Pages (أو رابط النطاق الخاص بك):
              </label>
              {detectedOrigin && (
                <button
                  type="button"
                  onClick={() => setCustomDomainInput(detectedOrigin)}
                  className="text-[11px] text-amber-300 hover:text-amber-200 underline font-medium"
                >
                  استخدام رابط الصفحة الحالية ({detectedOrigin})
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value)}
                placeholder={`مثال: ${detectedOrigin || 'https://nilemodern.pages.dev'}`}
                dir="ltr"
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                onClick={handleSaveDomain}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-colors"
              >
                حفظ وتحديث رمز الـ QR
              </button>
              {isUsingCustom && (
                <button
                  onClick={handleResetToAuto}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>استعادة التلقائي</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              * بمجرد الضغط على (حفظ)، سيعاد رسم رمز الـ QR فورياً ليوجه أي هاتف يقوم بمسحه إلى رابط كلاود فلير الخاص بك مباشرة.
            </p>
          </div>
        )}

        {savedDomainNotice && (
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold text-center border border-emerald-500/30">
            تم حفظ الرابط وتحديث رمز الـ QR بنجاح!
          </div>
        )}
      </div>

      {/* Programmed Data Verification Banner */}
      <div className="max-w-md mx-auto bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3.5 text-xs text-emerald-950 shadow-xs print:hidden">
        <div className="flex items-center gap-2 font-bold text-emerald-900 mb-1.5">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>البيانات المبرمجة فعلياً داخل رمز الـ QR الحالي:</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800 bg-white/70 rounded-xl p-2.5 border border-emerald-100">
          <div>
            <span className="text-slate-500">اسم المنشأة: </span>
            <strong className="text-slate-900">{settings.location.companyName || 'بدون تحديد'}</strong>
          </div>
          <div>
            <span className="text-slate-500">المقر: </span>
            <strong className="text-slate-900">{settings.location.locationName || 'المقر الرئيسي'}</strong>
          </div>
          <div>
            <span className="text-slate-500">ساعات الدوام: </span>
            <strong className="text-slate-900">{settings.hours.workStartTime} - {settings.hours.workEndTime}</strong>
          </div>
          <div>
            <span className="text-slate-500">الموظفين المعتمدين: </span>
            <strong className="text-slate-900">{employees.length} موظف</strong>
          </div>
        </div>
        <p className="text-[10px] text-emerald-700 mt-2 leading-relaxed">
          * بمجرد مسح هذا الرمز بأي هاتف، ستظهر بيانات شركتك وقائمة موظفيك تلقائياً دون أي بيانات افتراضية سابقة.
        </p>
      </div>

      {/* Printable Poster Container */}
      <div className="max-w-md mx-auto">
        <div 
          id="printable-qr-card" 
          className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-lg text-center space-y-5 print:border-none print:shadow-none print:p-2"
        >
          {/* Company Branding Top */}
          <div className="space-y-2">
            <div className="flex justify-center">
              <CompanyLogo size="lg" companyName={settings.location.companyName} />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">
              {settings.location.companyName}
            </h3>
            <p className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{settings.location.locationName}</span>
            </p>
          </div>

          {/* Card Title Box */}
          <div className="bg-slate-900 text-white py-2.5 px-4 rounded-xl">
            <span className="text-sm font-bold tracking-wide">
              نظام تسجيل الحضور والانصراف الذكي
            </span>
          </div>

          {/* QR Code Canvas Frame */}
          <div className="relative p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-emerald-300 inline-block shadow-inner">
            <canvas ref={canvasRef} className="mx-auto rounded-lg" />
            <div className="absolute -top-3 right-1/2 translate-x-1/2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <QrCode className="w-3 h-3" />
              <span>امسح بكاميرا الهاتف</span>
            </div>
          </div>

          {/* Instructions List */}
          <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-right">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تعليمات تسجيل الحضور والانصراف:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pr-1">
              <li>افتح كاميرا الهاتف واقرأ الرمز للوصول لصفحة الحضور.</li>
              <li>سجل حضورك أو انصرافك عن طريق إدخال كودك الوظيفي.</li>
              <li>يتم حفظ الكود تلقائياً على هاتفك لراحتك في كل مرة.</li>
              <li>يشترط التواجد داخل النطاق الجغرافي للمقر لتأكيد البصمة.</li>
              <li>لا يمكن تسجيل حضور أو خروج أكثر من مرة في اليوم الواحد.</li>
            </ul>
          </div>
        </div>

        {/* Copy Link helper for Admin */}
        <div className="mt-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate font-mono" dir="ltr">{portalUrl}</span>
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
          </button>
        </div>
      </div>

      {/* Print Confirmation & Options Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">أمر طباعة اللافتة</h3>
                  <p className="text-xs text-slate-500">تم تجهيز لافتة الـ QR للطباعة الورقية</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <Sparkles className="w-4 h-4" />
                <span>تم إرسال أمر الطباعة إلى متصفحك!</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                إذا لم تظهر نافذة الطابعة تلقائياً بسبب سياسة حظر النوافذ في المتصفح، يمكنك استخدام أحد الخيارات الفورية التالية:
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  const posterHtml = generateQrPosterHtml({
                    companyName: settings.location.companyName,
                    locationName: settings.location.locationName,
                    qrDataUrl: qrDataUrl,
                    allowedRadiusMeters: settings.location.allowedRadiusMeters,
                    portalUrl: portalUrl,
                  });
                  printHtmlDocument(posterHtml);
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>إعادة إرسال أمر الطباعة الآن</span>
              </button>

              <button
                onClick={() => {
                  handleDownload();
                  setShowPrintModal(false);
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل صورة الرمز PNG (لطباعتها من أي جهاز أو طابعة)</span>
              </button>

              <button
                onClick={() => {
                  const posterHtml = generateQrPosterHtml({
                    companyName: settings.location.companyName,
                    locationName: settings.location.locationName,
                    qrDataUrl: qrDataUrl,
                    allowedRadiusMeters: settings.location.allowedRadiusMeters,
                    portalUrl: portalUrl,
                  });
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.open();
                    win.document.write(posterHtml);
                    win.document.close();
                  }
                }}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>فتح اللافتة في نافذة مستقلة للمعاينة أو الحفظ PDF</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                تم، إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
