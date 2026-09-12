import { AttendanceRecord } from '../types';
import { generateAttendanceReportHtml, printHtmlDocument } from './printUtils';
import { getStoredSettings } from './storage';

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
 * Get simple absence indicator (نعم / لا)
 */
export function getAbsenceStatus(status: string): string {
  if (status === 'absent' || status === 'rejected_permission') {
    return 'غائب';
  }
  return 'لا (حاضر)';
}

/**
 * Get permission description if any
 */
export function getPermissionDetail(rec: AttendanceRecord): string {
  if (!rec.hasPermissionRequest && !rec.permissionReason) {
    return 'لا يوجد إذن';
  }
  const typeText = rec.permissionType === 'check_out' ? 'إذن انصراف' : 'إذن حضور';
  const reason = rec.permissionReason ? `: ${rec.permissionReason}` : '';
  const statusText = rec.permissionStatus === 'approved' 
    ? ' [مقبول]' 
    : rec.permissionStatus === 'rejected' 
    ? ' [مرفوض]' 
    : ' [قيد الانتظار]';
  return `${typeText}${reason}${statusText}`;
}

/**
 * Exports records to a Native Formatted Microsoft Excel Workbook (.xls XML format)
 * Opens directly in MS Excel with right-to-left orientation, stylized headers, auto-borders, and column widths.
 */
export function exportRecordsToFormattedExcel(
  records: AttendanceRecord[],
  filename = 'سجل_حركات_الحضور_والانصراف.xls',
  companyName = 'النيل الحديثة'
) {
  const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>سجل حركات الحضور والانصراف - ${companyName}</Title>
  <Author>${companyName}</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders/>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Color="#0F172A"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="16" ss:Bold="1" ss:Color="#1E3A5F"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Color="#64748B"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E3A5F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="DataCellBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="DataCellAbsent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Bold="1" ss:Color="#BE123C"/>
   <Interior ss:Color="#FFF1F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCellPermission">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FED7AA"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FED7AA"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FED7AA"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FED7AA"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Color="#9A3412"/>
   <Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCellTime">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="LeftToRight"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Bold="1" ss:Color="#0369A1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="حركات الحضور والانصراف">
  <Table ss:ExpandedColumnCount="9" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="24">
   <Column ss:Width="95"/>
   <Column ss:Width="75"/>
   <Column ss:Width="160"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="110"/>
   <Column ss:Width="70"/>
   <Column ss:Width="160"/>
   <Column ss:Width="130"/>

   <!-- Title Row -->
   <Row ss:Height="36">
    <Cell ss:MergeAcross="8" ss:StyleID="TitleStyle">
     <Data ss:Type="String">سجل حركات الحضور والانصراف المنظم - ${companyName}</Data>
    </Cell>
   </Row>

   <!-- Date Exported Row -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="8" ss:StyleID="MetaStyle">
     <Data ss:Type="String">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | إجمالي الحركات: ${records.length}</Data>
    </Cell>
   </Row>

   <!-- Empty Separator Row -->
   <Row ss:Height="10"/>

   <!-- Table Headers Row -->
   <Row ss:Height="28">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">التاريخ</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">اسم الموظف</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">وقت الحضور</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">وقت الانصراف</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">الغياب</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">الإذن إن وجد</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">كود البصمة</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">الحالة العامة</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">ملاحظات الإدارة</Data></Cell>
   </Row>

   <!-- Data Rows -->
   ${records.map((r) => {
     const isAbsent = r.status === 'absent' || r.status === 'rejected_permission';
     const hasPerm = r.hasPermissionRequest || Boolean(r.permissionReason);
     const absentText = isAbsent ? 'غائب' : 'حاضر';
     const permText = getPermissionDetail(r);
     const notes = r.rejectionReason || r.notes || '---';

     return `
   <Row ss:Height="22">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(r.date)}</Data></Cell>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(r.employeeName)}</Data></Cell>
    <Cell ss:StyleID="DataCellTime"><Data ss:Type="String">${escapeXml(r.checkInTime || '---')}</Data></Cell>
    <Cell ss:StyleID="DataCellTime"><Data ss:Type="String">${escapeXml(r.checkOutTime || '---')}</Data></Cell>
    <Cell ss:StyleID="${isAbsent ? 'DataCellAbsent' : 'DataCell'}"><Data ss:Type="String">${escapeXml(absentText)}</Data></Cell>
    <Cell ss:StyleID="${hasPerm ? 'DataCellPermission' : 'DataCell'}"><Data ss:Type="String">${escapeXml(permText)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(r.employeeCode)}</Data></Cell>
    <Cell ss:StyleID="${isAbsent ? 'DataCellAbsent' : hasPerm ? 'DataCellPermission' : 'DataCell'}"><Data ss:Type="String">${escapeXml(getStatusArabicLabel(r.status))}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(notes)}</Data></Cell>
   </Row>`;
   }).join('')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayRightToLeft/>
   <Selected/>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.xls') ? filename : `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Exports records to standard CSV with UTF-8 BOM for Microsoft Excel compatibility
 * Exactly structured: Date, Employee Code, Employee Name, Check-in Time, Check-out Time, General Status, Absent Flag, Permission Info, Notes
 */
export function exportRecordsToCSV(records: AttendanceRecord[], filename = 'سجل_الحضور_والانصراف.csv') {
  const headers = [
    'التاريخ',
    'اسم الموظف',
    'وقت الحضور',
    'وقت الانصراف',
    'الغياب',
    'الإذن إن وجد',
    'تفاصيل وسبب الإذن',
    'كود البصمة',
    'الحالة العامة',
    'ملاحظات الإدارة',
  ];

  const rows = records.map((r) => [
    r.date,
    `"${r.employeeName.replace(/"/g, '""')}"`,
    r.checkInTime || '---',
    r.checkOutTime || '---',
    r.status === 'absent' || r.status === 'rejected_permission' ? 'غائب' : 'حاضر',
    r.hasPermissionRequest || r.permissionReason ? 'نعم' : 'لا يوجد',
    r.permissionReason ? `"${r.permissionReason.replace(/"/g, '""')}"` : '---',
    r.employeeCode,
    `"${getStatusArabicLabel(r.status)}"`,
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
 * Trigger print dialog with clean, formatted A4 attendance report
 */
export function printAttendanceReport(records?: AttendanceRecord[], dateRangeText?: string) {
  const settings = getStoredSettings();
  const currentRecords = records || [];

  const stats = {
    total: currentRecords.length,
    onTime: currentRecords.filter((r) => r.status === 'present').length,
    checkedOut: currentRecords.filter((r) => r.status === 'checked_out').length,
    late: currentRecords.filter((r) => r.status === 'late_with_permission' || r.status === 'early_with_permission').length,
    pending: currentRecords.filter((r) => r.status === 'pending_permission').length,
    absent: currentRecords.filter((r) => r.status === 'absent' || r.status === 'rejected_permission').length,
  };

  const reportHtml = generateAttendanceReportHtml({
    records: currentRecords,
    companyName: settings.location.companyName,
    locationName: settings.location.locationName,
    dateRangeText,
    stats,
  });

  printHtmlDocument(reportHtml, `تقرير_${settings.location.companyName}`);
}

