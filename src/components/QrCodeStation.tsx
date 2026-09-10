import React, { useEffect, useRef, useState } from 'react';
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
  ExternalLink 
} from 'lucide-react';
import { SystemSettings } from '../types';

interface QrCodeStationProps {
  settings: SystemSettings;
  onOpenEmployeePortal: () => void;
}

export const QrCodeStation: React.FC<QrCodeStationProps> = ({
  settings,
  onOpenEmployeePortal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Target Portal URL: current origin + URL parameter so scanning phone opens right into employee portal
  const portalUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}?portal=1` 
    : 'https://ais-pre-y2jk6zluucwdfano6awvzy-116027320757.europe-west1.run.app?portal=1';

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        portalUrl,
        {
          width: 280,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) {
            console.error('Error generating QR code', error);
          } else if (canvasRef.current) {
            setQrDataUrl(canvasRef.current.toDataURL('image/png'));
          }
        }
      );
    }
  }, [portalUrl]);

  // Copy URL
  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download QR as PNG
  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `كود_حضور_وانصراف_${settings.location.companyName}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            محطة رمز QR للطباعة وتثبيت نقطة الحضور
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            اطبع هذا الكود وضعه عند مدخل الشركة أو الاستقبال ليمسحه الموظفون بهواتفهم لتسجيل الدخول والخروج.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="print-qr-btn"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة اللافتة</span>
          </button>
          <button
            id="download-qr-btn"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل صورة الرمز</span>
          </button>
          <button
            onClick={onOpenEmployeePortal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>فتح شاشة الموظف للتجربة</span>
          </button>
        </div>
      </div>

      {/* Printable Poster Container */}
      <div className="max-w-md mx-auto">
        <div 
          id="printable-qr-card" 
          className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-lg text-center space-y-5 print:border-none print:shadow-none print:p-2"
        >
          {/* Company Branding Top */}
          <div className="space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <Building2 className="w-7 h-7" />
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

          {/* Footer Note */}
          <div className="text-[10px] text-slate-400 font-mono">
            نطاق التحقق المسموح: {settings.location.allowedRadiusMeters} متر • GPS Verified
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
    </div>
  );
};
