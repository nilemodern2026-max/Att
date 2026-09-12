import { AttendanceRecord, SystemSettings } from '../types';
import { getStatusArabicLabel } from './export';

/**
 * Universal print helper that prints HTML content via a hidden iframe
 * with automatic fallback to popup window or direct print if blocked.
 */
export function printHtmlDocument(htmlContent: string, documentTitle = 'طباعة'): boolean {
  try {
    // 1. Try hidden iframe approach (works best inside modern browsers and avoids leaving the page)
    const iframe = document.createElement('iframe');
    iframe.name = 'attendance_print_frame_' + Date.now();
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (iframeErr) {
          console.warn('Iframe print failed or blocked, falling back to window.open', iframeErr);
          fallbackWindowOpen(htmlContent, documentTitle);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 400);

      return true;
    }
  } catch (err) {
    console.warn('Could not print via iframe', err);
  }

  // 2. Fallback to window.open
  return fallbackWindowOpen(htmlContent, documentTitle);
}

function fallbackWindowOpen(htmlContent: string, documentTitle: string): boolean {
  try {
    const printWin = window.open('', '_blank', 'width=850,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      setTimeout(() => {
        try {
          printWin.focus();
          printWin.print();
        } catch (e) {
          console.warn('printWin.print error', e);
        }
      }, 500);
      return true;
    }
  } catch (e) {
    console.warn('window.open was blocked by browser sandbox', e);
  }

  // 3. Fallback to direct window.print()
  try {
    window.print();
    return true;
  } catch (e) {
    console.error('Direct window.print() also failed', e);
    return false;
  }
}

/**
 * Generates official A4 Poster HTML for the QR Attendance Station
 */
export function generateQrPosterHtml(params: {
  companyName: string;
  locationName: string;
  qrDataUrl: string;
  allowedRadiusMeters: number;
  portalUrl: string;
}): string {
  const { companyName, locationName, qrDataUrl, allowedRadiusMeters, portalUrl } = params;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>لافتة كود الحضور والانصراف - ${companyName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Arabic', Tahoma, sans-serif;
      direction: rtl;
      background: #ffffff;
      color: #0f172a;
      margin: 0;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 98vh;
    }
    .poster-card {
      width: 100%;
      max-width: 480px;
      border: 3px solid #0f172a;
      border-radius: 28px;
      padding: 36px 28px;
      text-align: center;
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .poster-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      margin: 0 auto 10px auto;
      display: block;
      border-radius: 12px;
      padding: 4px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .company-badge {
      display: inline-block;
      background: #059669;
      color: #ffffff;
      font-weight: bold;
      font-size: 13px;
      padding: 4px 16px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .company-name {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .location-name {
      font-size: 14px;
      color: #047857;
      font-weight: 700;
      margin: 0 0 20px 0;
    }
    .title-banner {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-bottom: 22px;
    }
    .qr-frame {
      display: inline-block;
      padding: 16px;
      background: #f8fafc;
      border: 3px dashed #059669;
      border-radius: 22px;
      margin-bottom: 20px;
      position: relative;
    }
    .qr-tag {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #059669;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 14px;
      border-radius: 12px;
      white-space: nowrap;
    }
    .qr-img {
      width: 250px;
      height: 250px;
      display: block;
      margin: 0 auto;
    }
    .instructions-box {
      text-align: right;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 16px;
    }
    .instructions-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .instructions-list {
      margin: 0;
      padding-right: 20px;
      font-size: 12px;
      line-height: 1.8;
      color: #334155;
    }
    .footer-meta {
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
      margin-top: 8px;
    }
    .portal-link {
      font-size: 10px;
      color: #94a3b8;
      font-family: monospace;
      direction: ltr;
      word-break: break-all;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="poster-card">
    <div style="display: flex; justify-content: center; margin-bottom: 12px;">
      <img 
        src="https://i.ibb.co/Qv4gxzG2/122.png" 
        alt="${companyName || 'شعار الشركة'}" 
        class="poster-logo" 
        style="width: 72px; height: 72px; object-fit: contain; border-radius: 14px; background: #ffffff; padding: 4px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.06);"
      />
    </div>
    <div class="company-badge">نقطة البصمة الذكية المعتمدة</div>
    <h1 class="company-name">${companyName || 'نظام تسجيل الحضور والانصراف'}</h1>
    <div class="location-name">📍 ${locationName || 'المقر الرئيسي'}</div>

    <div class="title-banner">
      نظام تسجيل الحضور والانصراف الذكي
    </div>

    <div class="qr-frame">
      <div class="qr-tag">امسح بكاميرا هاتفك المحمول</div>
      <img src="${qrDataUrl}" alt="QR Code" class="qr-img" />
    </div>

    <div class="instructions-box">
      <div class="instructions-title">تعليمات الموظف لتسجيل الحضور:</div>
      <ol class="instructions-list">
        <li>افتح كاميرا الهاتف واقرأ رمز الـ QR مباشرة للدخول إلى البوابة.</li>
        <li>أدخل كود البصمة الخاص بك واضغط على (تسجيل الحضور) أو (تسجيل الانصراف).</li>
        <li>سيتم حفظ كودك تلقائياً على هاتفك لعدم الحاجة لإعادة كتابته لاحقاً.</li>
        <li>يشترط التواجد داخل مقر العمل للتأكيد عبر نظام تحديد المواقع (GPS).</li>
      </ol>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates official Printable Report HTML for Attendance History Records
 */
export function generateAttendanceReportHtml(params: {
  records: AttendanceRecord[];
  companyName: string;
  locationName: string;
  dateRangeText?: string;
  stats?: {
    total: number;
    onTime: number;
    checkedOut: number;
    late: number;
    pending: number;
    absent: number;
  };
}): string {
  const { records, companyName, locationName, dateRangeText, stats } = params;
  const printDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tableRows = records
    .map(
      (r, idx) => `
    <tr>
      <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: bold; text-align: center;">${r.employeeCode}</td>
      <td style="font-weight: 700; color: #0f172a;">${r.employeeName}</td>
      <td style="text-align: center; font-family: monospace;">${r.date}</td>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #059669;">${r.checkInTime || '---'}</td>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2563eb;">${r.checkOutTime || '---'}</td>
      <td style="font-size: 11px; text-align: center;">${getStatusArabicLabel(r.status)}</td>
      <td style="font-size: 11px; color: #475569;">${r.permissionReason ? 'إذن: ' + r.permissionReason : r.notes || '---'}</td>
    </tr>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير سجلات الحضور والانصراف - ${companyName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Arabic', Tahoma, sans-serif;
      direction: rtl;
      background: #ffffff;
      color: #0f172a;
      margin: 0;
      padding: 15px;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .company-info h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .company-info p {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #059669;
      font-weight: 600;
    }
    .report-title-box {
      text-align: left;
    }
    .report-title-box h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .report-title-box p {
      margin: 4px 0 0 0;
      font-size: 11px;
      color: #64748b;
    }
    .stats-bar {
      display: flex;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 16px;
      border-radius: 10px;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .stats-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stats-item strong {
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 10px;
      font-weight: 700;
      border: 1px solid #0f172a;
      text-align: right;
    }
    th:nth-child(1), th:nth-child(2), th:nth-child(4), th:nth-child(5), th:nth-child(6), th:nth-child(7) {
      text-align: center;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .report-footer {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }
    .signatures {
      display: flex;
      gap: 40px;
    }
    .sign-box {
      text-align: center;
      width: 140px;
    }
    .sign-line {
      border-bottom: 1px dashed #94a3b8;
      height: 30px;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="company-info">
      <h1>${companyName}</h1>
      <p>📍 ${locationName} - تقرير الحضور والانصراف الرسمي</p>
    </div>
    <div class="report-title-box">
      <h2>تقرير سجلات الحضور والانصراف</h2>
      <p>تاريخ استخراج التقرير: ${printDate}</p>
      ${dateRangeText ? `<p style="font-weight:bold; color:#0f172a;">الفترة: ${dateRangeText}</p>` : ''}
    </div>
  </div>

  ${
    stats
      ? `
  <div class="stats-bar">
    <div class="stats-item">إجمالي الحركات: <strong>${stats.total}</strong></div>
    <div class="stats-item">| حاضر في الموعد: <strong style="color:#059669;">${stats.onTime}</strong></div>
    <div class="stats-item">| تم الانصراف: <strong style="color:#2563eb;">${stats.checkedOut}</strong></div>
    <div class="stats-item">| تأخير / انصراف بإذن: <strong style="color:#d97706;">${stats.late}</strong></div>
    <div class="stats-item">| إذن معلق: <strong style="color:#e11d48;">${stats.pending}</strong></div>
  </div>
  `
      : ''
  }

  <table>
    <thead>
      <tr>
        <th style="width: 35px;">#</th>
        <th style="width: 75px;">كود البصمة</th>
        <th>اسم الموظف</th>
        <th style="width: 85px;">التاريخ</th>
        <th style="width: 75px;">وقت الحضور</th>
        <th style="width: 75px;">وقت الانصراف</th>
        <th style="width: 140px;">الحالة</th>
        <th>ملاحظات / سبب الإذن</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="8" style="text-align:center; padding: 20px;">لا توجد سجلات مطابقة للفلاتر المحددة</td></tr>'}
    </tbody>
  </table>

  <div class="report-footer">
    <div>تم الإصدار بواسطة نظام البصمة الذكي • صفحة 1 من 1</div>
    <div class="signatures">
      <div class="sign-box">
        <div class="sign-line"></div>
        <span>مسؤول الموارد البشرية</span>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <span>اعتماد الإدارة</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}
