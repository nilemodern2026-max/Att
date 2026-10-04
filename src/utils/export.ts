import { AttendanceRecord, Employee } from '../types';
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
  <Style ss:ID="DataCellAbsentBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Bold="1" ss:Color="#9F1239"/>
   <Interior ss:Color="#FFF1F2" ss:Pattern="Solid"/>
  </Style>
  <!-- تظليل أيام التأخير باللون الأحمر المريح -->
  <Style ss:ID="DataCellLate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCellLateBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Bold="1" ss:Color="#7F1D1D"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <!-- تظليل أيام الإذن باللون الأصفر الواضح -->
  <Style ss:ID="DataCellPermissionYellow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Color="#854D0E"/>
   <Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCellPermissionYellowBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Bold="1" ss:Color="#713F12"/>
   <Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/>
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
     const settings = getStoredSettings();
     const isAbsent = r.status === 'absent' || r.status === 'rejected_permission';

     // أيام التأخير: تأخير بإذن أو حضور بعد نهاية نافذة الحضور المقررة أو إذن تأخير
     const isLate = !isAbsent && (
       r.status === 'late_with_permission' ||
       Boolean(r.checkInTime && settings?.hours?.checkInEnd && r.checkInTime > settings.hours.checkInEnd) ||
       Boolean(r.permissionType === 'check_in') ||
       Boolean(r.permissionReason && r.permissionReason.toLowerCase().includes('تأخير'))
     );

     // أيام الإذن: إذن انصراف مبكر أو طلب إذن معتمد أو قيد المراجعة
     const isPermission = !isAbsent && !isLate && (
       r.hasPermissionRequest || 
       Boolean(r.permissionReason) || 
       r.status === 'early_with_permission' || 
       r.status === 'pending_permission'
     );

     let cellStyle = 'DataCell';
     let boldStyle = 'DataCellBold';
     let timeStyle = 'DataCellTime';

     if (isLate) {
       // تظليل كامل خلايا الصف باللون الأحمر لأيام التأخير
       cellStyle = 'DataCellLate';
       boldStyle = 'DataCellLateBold';
       timeStyle = 'DataCellLate';
     } else if (isPermission) {
       // تظليل كامل خلايا الصف باللون الأصفر لأيام الإذن
       cellStyle = 'DataCellPermissionYellow';
       boldStyle = 'DataCellPermissionYellowBold';
       timeStyle = 'DataCellPermissionYellow';
     } else if (isAbsent) {
       // تظليل صف الغياب بلون التنبيه الخاص بالغياب
       cellStyle = 'DataCellAbsent';
       boldStyle = 'DataCellAbsentBold';
       timeStyle = 'DataCellAbsent';
     }

     const absentText = isAbsent ? 'غائب' : 'حاضر';
     const permText = getPermissionDetail(r);
     const notes = r.rejectionReason || r.notes || '---';

     return `
   <Row ss:Height="22">
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.date)}</Data></Cell>
    <Cell ss:StyleID="${boldStyle}"><Data ss:Type="String">${escapeXml(r.employeeName)}</Data></Cell>
    <Cell ss:StyleID="${timeStyle}"><Data ss:Type="String">${escapeXml(r.checkInTime || '---')}</Data></Cell>
    <Cell ss:StyleID="${timeStyle}"><Data ss:Type="String">${escapeXml(r.checkOutTime || '---')}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(absentText)}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(permText)}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.employeeCode)}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(getStatusArabicLabel(r.status))}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(notes)}</Data></Cell>
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

function getArabicDayName(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[date.getDay()] || '';
  } catch {
    return '';
  }
}

/**
 * تصدير ملف إكسيل مجمع متكامل (Workbook واحد):
 * الشيت الأول: جدول ملخص شامل لكل موظف (حضور منتظم، تأخير، إذن، غياب، إجمالي، نسبة الالتزام)
 * الشيتات التالية: شيت منفصل ومفصل لكل موظف يحتوي على حركاته اليومية مع تلوين التأخير بالأحمر والإذن بالأصفر
 */
export function exportMultiSheetConsolidatedExcel(
  records: AttendanceRecord[],
  employees: Employee[],
  filename = 'سجل_حضور_وانصراف_مجمع.xls',
  companyName = 'النيل الحديثة',
  dateRangeText = ''
) {
  const settings = getStoredSettings();

  // تجميع قائمة الموظفين (الموظفين المسجلين بالإضافة إلى أي موظف لديه حركات)
  const employeeMap = new Map<string, Employee>();
  employees.forEach((emp) => {
    employeeMap.set(emp.id, emp);
  });
  records.forEach((r) => {
    if (!employeeMap.has(r.employeeId)) {
      employeeMap.set(r.employeeId, {
        id: r.employeeId,
        code: r.employeeCode,
        name: r.employeeName,
        isActive: true,
        department: r.department,
      });
    }
  });

  const allEmps = Array.from(employeeMap.values()).sort((a, b) => {
    const numA = parseInt(a.code, 10) || 0;
    const numB = parseInt(b.code, 10) || 0;
    return numA - numB;
  });

  // حساب إحصائيات كل موظف
  interface EmployeeSummary {
    emp: Employee;
    empRecords: AttendanceRecord[];
    onTimeCount: number;
    lateCount: number;
    permissionCount: number;
    absentCount: number;
    totalCount: number;
    attendanceRate: number;
  }

  const summaries: EmployeeSummary[] = allEmps.map((emp) => {
    const empRecords = records
      .filter((r) => r.employeeId === emp.id || r.employeeCode === emp.code)
      .sort((a, b) => a.date.localeCompare(b.date));

    let onTimeCount = 0;
    let lateCount = 0;
    let permissionCount = 0;
    let absentCount = 0;

    empRecords.forEach((r) => {
      const isAbsent = r.status === 'absent' || r.status === 'rejected_permission';
      const isLate = !isAbsent && (
        r.status === 'late_with_permission' ||
        Boolean(r.checkInTime && settings?.hours?.checkInEnd && r.checkInTime > settings.hours.checkInEnd) ||
        Boolean(r.permissionType === 'check_in') ||
        Boolean(r.permissionReason && r.permissionReason.toLowerCase().includes('تأخير'))
      );
      const isPermission = !isAbsent && !isLate && (
        r.hasPermissionRequest || 
        Boolean(r.permissionReason) || 
        r.status === 'early_with_permission' || 
        r.status === 'pending_permission'
      );

      if (isAbsent) {
        absentCount++;
      } else if (isLate) {
        lateCount++;
      } else if (isPermission) {
        permissionCount++;
      } else {
        onTimeCount++;
      }
    });

    const totalCount = onTimeCount + lateCount + permissionCount + absentCount;
    const attendanceRate = totalCount > 0 ? Math.round(((onTimeCount + lateCount + permissionCount) / totalCount) * 100) : 0;

    return {
      emp,
      empRecords,
      onTimeCount,
      lateCount,
      permissionCount,
      absentCount,
      totalCount,
      attendanceRate,
    };
  });

  // مجاميع الشركة الكلية
  const grandTotalOnTime = summaries.reduce((sum, s) => sum + s.onTimeCount, 0);
  const grandTotalLate = summaries.reduce((sum, s) => sum + s.lateCount, 0);
  const grandTotalPerm = summaries.reduce((sum, s) => sum + s.permissionCount, 0);
  const grandTotalAbsent = summaries.reduce((sum, s) => sum + s.absentCount, 0);
  const grandTotalAllDays = grandTotalOnTime + grandTotalLate + grandTotalPerm + grandTotalAbsent;
  const overallRate = grandTotalAllDays > 0 
    ? Math.round(((grandTotalOnTime + grandTotalLate + grandTotalPerm) / grandTotalAllDays) * 100) 
    : 0;

  // توليد أسماء أوراق العمل بفرادة تامة ووفق معايير إكسيل (أقصى طول 31 حرف)
  const usedSheetNames = new Set<string>();
  const getUniqueSheetName = (rawName: string, code: string): string => {
    let clean = (rawName || '').replace(/[:\\/?*\[\]]/g, '').trim();
    if (!clean) clean = `موظف_${code}`;
    clean = clean.slice(0, 22).trim();
    let candidate = `${clean}_${code}`;
    if (candidate.length > 31) {
      candidate = candidate.slice(0, 31);
    }
    let finalName = candidate;
    let counter = 1;
    while (usedSheetNames.has(finalName)) {
      finalName = `${candidate.slice(0, 28)}_${counter}`;
      counter++;
    }
    usedSheetNames.add(finalName);
    return finalName;
  };

  const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>سجل مجمع شامل للحضور والانصراف - ${escapeXml(companyName)}</Title>
  <Author>${escapeXml(companyName)}</Author>
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
  <!-- Summary Table Header Styles -->
  <Style ss:ID="SummaryHeaderGeneral">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryHeaderGreen">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#059669" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryHeaderLate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#DC2626" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryHeaderYellow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#D97706" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryHeaderRose">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#991B1B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryHeaderTotal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#334155" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryHeaderRate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BAE6FD"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BAE6FD"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BAE6FD"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0284C7" ss:Pattern="Solid"/>
  </Style>

  <!-- Summary Data Cell Styles -->
  <Style ss:ID="SummaryNumGreen">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#047857"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryNumLate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#B91C1C"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryNumYellow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#A16207"/>
   <Interior ss:Color="#FEFCE8" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryNumRose">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#BE123C"/>
   <Interior ss:Color="#FFF1F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryNumTotal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryNumRate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#0369A1"/>
   <Interior ss:Color="#F0F9FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryTotalRow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
  </Style>

  <!-- Standard Detail Cells -->
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
  <Style ss:ID="DataCellAbsentBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Bold="1" ss:Color="#9F1239"/>
   <Interior ss:Color="#FFF1F2" ss:Pattern="Solid"/>
  </Style>
  <!-- تظليل أيام التأخير باللون الأحمر المريح -->
  <Style ss:ID="DataCellLate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCellLateBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Bold="1" ss:Color="#7F1D1D"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <!-- تظليل أيام الإذن باللون الأصفر الواضح -->
  <Style ss:ID="DataCellPermissionYellow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Color="#854D0E"/>
   <Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCellPermissionYellowBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE047"/>
   </Borders>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="10" ss:Bold="1" ss:Color="#713F12"/>
   <Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/>
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

 <!-- ================================================================ -->
 <!-- الشيت الأول: جدول ملخص كل موظف (حضور منتظم، تأخير، إذن، غياب)    -->
 <!-- ================================================================ -->
 <Worksheet ss:Name="ملخص شامل لجميع الموظفين">
  <Table ss:ExpandedColumnCount="10" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="24">
   <Column ss:Width="40"/>
   <Column ss:Width="80"/>
   <Column ss:Width="160"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="100"/>
   <Column ss:Width="95"/>

   <!-- Title Row -->
   <Row ss:Height="36">
    <Cell ss:MergeAcross="9" ss:StyleID="TitleStyle">
     <Data ss:Type="String">سجل مجمع شامل: جدول إحصائيات حضور وغياب الموظفين - ${escapeXml(companyName)}</Data>
    </Cell>
   </Row>

   <!-- Date & Info Row -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="9" ss:StyleID="MetaStyle">
     <Data ss:Type="String">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | إجمالي الموظفين: ${allEmps.length} | الفترة: ${escapeXml(dateRangeText || 'كامل السجلات التاريخية')}</Data>
    </Cell>
   </Row>

   <!-- Empty Separator Row -->
   <Row ss:Height="10"/>

   <!-- Master Summary Headers -->
   <Row ss:Height="30">
    <Cell ss:StyleID="SummaryHeaderGeneral"><Data ss:Type="String">م</Data></Cell>
    <Cell ss:StyleID="SummaryHeaderGeneral"><Data ss:Type="String">كود البصمة</Data></Cell>
    <Cell ss:StyleID="SummaryHeaderGeneral"><Data ss:Type="String">اسم الموظف</Data></Cell>
    <Cell ss:StyleID="SummaryHeaderGeneral"><Data ss:Type="String">القسم / الوظيفة</Data></Cell>
    <Cell ss:StyleID="SummaryHeaderGreen"><Data ss:Type="String">حضور منتظم (يوم)</Data></Cell>
    <Cell ss:StyleID="SummaryHeaderLate"><Data ss:Type="String">أيام التأخير (يوم)</Data></Cell>
    <Cell ss:StyleID="SummaryHeaderYellow"><Data ss:Type="String">أيام الإذن (يوم)</Data></Cell>
    <Cell ss:StyleID="SummaryHeaderRose"><Data ss:Type="String">أيام الغياب (يوم)</Data></Cell>
    <Cell ss:StyleID="SummaryHeaderTotal"><Data ss:Type="String">إجمالي الأيام</Data></Cell>
    <Cell ss:StyleID="SummaryHeaderRate"><Data ss:Type="String">نسبة الالتزام</Data></Cell>
   </Row>

   <!-- Employee Summary Rows -->
   ${summaries.map((s, idx) => `
   <Row ss:Height="24">
    <Cell ss:StyleID="DataCell"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.emp.code)}</Data></Cell>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(s.emp.name)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.emp.jobTitle || s.emp.department || 'عام')}</Data></Cell>
    <Cell ss:StyleID="SummaryNumGreen"><Data ss:Type="Number">${s.onTimeCount}</Data></Cell>
    <Cell ss:StyleID="SummaryNumLate"><Data ss:Type="Number">${s.lateCount}</Data></Cell>
    <Cell ss:StyleID="SummaryNumYellow"><Data ss:Type="Number">${s.permissionCount}</Data></Cell>
    <Cell ss:StyleID="SummaryNumRose"><Data ss:Type="Number">${s.absentCount}</Data></Cell>
    <Cell ss:StyleID="SummaryNumTotal"><Data ss:Type="Number">${s.totalCount}</Data></Cell>
    <Cell ss:StyleID="SummaryNumRate"><Data ss:Type="String">${s.attendanceRate}%</Data></Cell>
   </Row>`).join('')}

   <!-- Grand Total Summary Row -->
   <Row ss:Height="26">
    <Cell ss:MergeAcross="3" ss:StyleID="SummaryTotalRow"><Data ss:Type="String">الإجمالي العام لكافة الموظفين (${allEmps.length} موظف)</Data></Cell>
    <Cell ss:StyleID="SummaryTotalRow"><Data ss:Type="Number">${grandTotalOnTime}</Data></Cell>
    <Cell ss:StyleID="SummaryTotalRow"><Data ss:Type="Number">${grandTotalLate}</Data></Cell>
    <Cell ss:StyleID="SummaryTotalRow"><Data ss:Type="Number">${grandTotalPerm}</Data></Cell>
    <Cell ss:StyleID="SummaryTotalRow"><Data ss:Type="Number">${grandTotalAbsent}</Data></Cell>
    <Cell ss:StyleID="SummaryTotalRow"><Data ss:Type="Number">${grandTotalAllDays}</Data></Cell>
    <Cell ss:StyleID="SummaryTotalRow"><Data ss:Type="String">${overallRate}%</Data></Cell>
   </Row>
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayRightToLeft/>
   <Selected/>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>

 <!-- ================================================================ -->
 <!-- الشيتات التالية: شيت تفصيلي منفصل لكل موظف                        -->
 <!-- ================================================================ -->
 ${summaries.map((s) => {
   const sheetName = getUniqueSheetName(s.emp.name, s.emp.code);

   return `
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table ss:ExpandedColumnCount="8" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="24">
   <Column ss:Width="95"/>
   <Column ss:Width="75"/>
   <Column ss:Width="85"/>
   <Column ss:Width="85"/>
   <Column ss:Width="75"/>
   <Column ss:Width="160"/>
   <Column ss:Width="140"/>
   <Column ss:Width="160"/>

   <!-- Employee Sheet Header -->
   <Row ss:Height="32">
    <Cell ss:MergeAcross="7" ss:StyleID="TitleStyle">
     <Data ss:Type="String">سجل حركة حضور وانصراف الموظف: ${escapeXml(s.emp.name)} (كود: ${escapeXml(s.emp.code)})</Data>
    </Cell>
   </Row>

   <!-- Subheader with Department and Date -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="7" ss:StyleID="MetaStyle">
     <Data ss:Type="String">الشركة: ${escapeXml(companyName)} | القسم/الوظيفة: ${escapeXml(s.emp.jobTitle || s.emp.department || 'عام')} | الفترة: ${escapeXml(dateRangeText || 'كامل السجلات')}</Data>
    </Cell>
   </Row>

   <!-- Employee Quick Stats Bar -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="7" ss:StyleID="DataCellBold">
     <Data ss:Type="String">حضور منتظم: ${s.onTimeCount} يوم  |  أيام التأخير: ${s.lateCount} يوم  |  أيام الإذن: ${s.permissionCount} يوم  |  أيام الغياب: ${s.absentCount} يوم  |  إجمالي الأيام: ${s.totalCount} يوم (نسبة الالتزام: ${s.attendanceRate}%)</Data>
    </Cell>
   </Row>

   <!-- Empty Separator Row -->
   <Row ss:Height="10"/>

   <!-- Table Column Headers -->
   <Row ss:Height="28">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">التاريخ</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">اليوم</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">وقت الحضور</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">وقت الانصراف</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">حالة الغياب</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">الإذن إن وجد</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">الحالة العامة</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">ملاحظات الإدارة</Data></Cell>
   </Row>

   <!-- Detail Rows for Employee -->
   ${s.empRecords.length === 0 ? `
   <Row ss:Height="24">
    <Cell ss:MergeAcross="7" ss:StyleID="DataCell"><Data ss:Type="String">لا توجد حركات مسجلة لهذا الموظف في الفترة المحددة</Data></Cell>
   </Row>` : s.empRecords.map((r) => {
     const isAbsent = r.status === 'absent' || r.status === 'rejected_permission';
     const isLate = !isAbsent && (
       r.status === 'late_with_permission' ||
       Boolean(r.checkInTime && settings?.hours?.checkInEnd && r.checkInTime > settings.hours.checkInEnd) ||
       Boolean(r.permissionType === 'check_in') ||
       Boolean(r.permissionReason && r.permissionReason.toLowerCase().includes('تأخير'))
     );
     const isPermission = !isAbsent && !isLate && (
       r.hasPermissionRequest || 
       Boolean(r.permissionReason) || 
       r.status === 'early_with_permission' || 
       r.status === 'pending_permission'
     );

     let cellStyle = 'DataCell';
     let timeStyle = 'DataCellTime';

     if (isLate) {
       cellStyle = 'DataCellLate';
       timeStyle = 'DataCellLate';
     } else if (isPermission) {
       cellStyle = 'DataCellPermissionYellow';
       timeStyle = 'DataCellPermissionYellow';
     } else if (isAbsent) {
       cellStyle = 'DataCellAbsent';
       timeStyle = 'DataCellAbsent';
     }

     const dayName = getArabicDayName(r.date);
     const absentText = isAbsent ? 'غائب' : 'حاضر';
     const permText = getPermissionDetail(r);
     const notes = r.rejectionReason || r.notes || '---';

     return `
   <Row ss:Height="22">
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.date)}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(dayName)}</Data></Cell>
    <Cell ss:StyleID="${timeStyle}"><Data ss:Type="String">${escapeXml(r.checkInTime || '---')}</Data></Cell>
    <Cell ss:StyleID="${timeStyle}"><Data ss:Type="String">${escapeXml(r.checkOutTime || '---')}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(absentText)}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(permText)}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(getStatusArabicLabel(r.status))}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(notes)}</Data></Cell>
   </Row>`;
   }).join('')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayRightToLeft/>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>`;
 }).join('')}
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

