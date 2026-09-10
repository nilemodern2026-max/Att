import { AttendanceRecord } from '../types';

/**
 * Translates status to clear Arabic label
 */
export function getStatusArabicLabel(status: string): string {
  switch (status) {
    case 'present':
      return 'حاضر (في الموعد)';
    case 'checked_out':
      return 'تم الانصراف';
    case 'late_with_permission':
      return 'حضور متأخر بإذن مقبول';
    case 'early_with_permission':
      return 'انصراف مبكر بإذن مقبول';
    case 'pending_permission':
      return 'طلب إذن قيد المراجعة';
    case 'rejected_permission':
      return 'إذن مرفوض (غياب/مخالفة)';
    case 'absent':
      return 'غائب';
    default:
      return status;
  }
}

/**
 * Exports records to CSV with UTF-8 BOM for Microsoft Excel compatibility
 */
export function exportRecordsToCSV(records: AttendanceRecord[], filename = 'سجل_الحضور_والانصراف.csv') {
  const headers = [
    'التاريخ',
    'كود البصمة',
    'اسم الموظف',
    'وقت الحضور',
    'وقت الانصراف',
    'الحالة',
    'الموقع الجغرافي (حضور)',
    'الموقع الجغرافي (انصراف)',
    'يوجد طلب إذن',
    'سبب الإذن',
    'حالة الإذن',
    'ملاحظات الإدارة',
  ];

  const rows = records.map((r) => [
    r.date,
    r.employeeCode,
    `"${r.employeeName.replace(/"/g, '""')}"`,
    r.checkInTime || '---',
    r.checkOutTime || '---',
    `"${getStatusArabicLabel(r.status)}"`,
    r.checkInCoords ? (r.checkInCoords.isWithinRadius ? 'داخل النطاق' : 'خارج النطاق') : '---',
    r.checkOutCoords ? (r.checkOutCoords.isWithinRadius ? 'داخل النطاق' : 'خارج النطاق') : '---',
    r.hasPermissionRequest ? 'نعم' : 'لا',
    r.permissionReason ? `"${r.permissionReason.replace(/"/g, '""')}"` : '---',
    r.permissionStatus === 'approved' ? 'مقبول' : r.permissionStatus === 'rejected' ? 'مرفوض' : r.permissionStatus === 'pending' ? 'معلق' : '---',
    r.rejectionReason || r.notes ? `"${(r.rejectionReason || r.notes || '').replace(/"/g, '""')}"` : '---',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\r\n');

  // Add UTF-8 BOM so Arabic letters render flawlessly in Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger print dialog with clean styling
 */
export function printAttendanceReport() {
  window.print();
}
