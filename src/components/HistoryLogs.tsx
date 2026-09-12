import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileSpreadsheet, 
  RotateCcw,
  Fingerprint,
  Trash2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Employee, AttendanceRecord } from '../types';
import { 
  exportRecordsToCSV, 
  exportRecordsToFormattedExcel, 
  getStatusArabicLabel, 
  getPermissionDetail,
  printAttendanceReport 
} from '../utils/export';
import { getTodayDateString } from '../utils/storage';

interface HistoryLogsProps {
  records: AttendanceRecord[];
  employees: Employee[];
  companyName?: string;
  onDeleteRecord?: (id: string) => void;
}

export const HistoryLogs: React.FC<HistoryLogsProps> = ({ 
  records, 
  employees, 
  companyName = 'النيل الحديثة', 
  onDeleteRecord 
}) => {
  const today = getTodayDateString();

  // Filters State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [attendanceTypeFilter, setAttendanceTypeFilter] = useState<'all' | 'present' | 'absent' | 'permission'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Delete modal state
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);

  // Apply Quick Date Filters
  const applyQuickDate = (type: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    if (type === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (type === 'week') {
      const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(pastWeek.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedEmployeeId('all');
    setSelectedStatus('all');
    setAttendanceTypeFilter('all');
    setSearchTerm('');
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Date Range
      if (startDate && rec.date < startDate) return false;
      if (endDate && rec.date > endDate) return false;

      // Employee
      if (selectedEmployeeId !== 'all' && rec.employeeId !== selectedEmployeeId) return false;

      // Status
      if (selectedStatus !== 'all' && rec.status !== selectedStatus) return false;

      // Attendance Type Quick Filter (حضور / غياب / إذن)
      if (attendanceTypeFilter === 'present') {
        if (rec.status === 'absent' || rec.status === 'rejected_permission') return false;
      } else if (attendanceTypeFilter === 'absent') {
        if (rec.status !== 'absent' && rec.status !== 'rejected_permission') return false;
      } else if (attendanceTypeFilter === 'permission') {
        if (!rec.hasPermissionRequest && !rec.permissionReason) return false;
      }

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches = 
          rec.employeeName.toLowerCase().includes(term) ||
          rec.employeeCode.toLowerCase().includes(term) ||
          (rec.permissionReason && rec.permissionReason.toLowerCase().includes(term)) ||
          (rec.notes && rec.notes.toLowerCase().includes(term));
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => (b.date + (b.checkInTime || '')).localeCompare(a.date + (a.checkInTime || '')));
  }, [records, startDate, endDate, selectedEmployeeId, selectedStatus, attendanceTypeFilter, searchTerm]);

  // Statistics for the filtered view
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const onTime = filteredRecords.filter((r) => r.status === 'present' || r.status === 'checked_out').length;
    const withPermission = filteredRecords.filter((r) => r.hasPermissionRequest || r.permissionReason || r.status === 'late_with_permission' || r.status === 'early_with_permission').length;
    const rejectedOrAbsent = filteredRecords.filter((r) => r.status === 'rejected_permission' || r.status === 'absent').length;
    return { total, onTime, withPermission, rejectedOrAbsent };
  }, [filteredRecords]);

  const confirmDeleteRecord = () => {
    if (!recordToDelete || !onDeleteRecord) return;
    onDeleteRecord(recordToDelete.id);
    setRecordToDelete(null);
  };

  // Export and Print Handlers
  const handleExportExcel = () => {
    exportRecordsToFormattedExcel(
      filteredRecords, 
      `سجل_حركات_${companyName.replace(/\s+/g, '_')}_${today}.xls`,
      companyName
    );
  };

  const handleExportCSV = () => {
    exportRecordsToCSV(
      filteredRecords, 
      `سجل_حضور_${companyName.replace(/\s+/g, '_')}_${today}.csv`
    );
  };

  const handlePrintReport = () => {
    let dateRangeText = 'جميع السجلات التاريخية';
    if (startDate && endDate) {
      dateRangeText = `من ${startDate} إلى ${endDate}`;
    } else if (startDate) {
      dateRangeText = `من تاريخ ${startDate}`;
    } else if (endDate) {
      dateRangeText = `حتى تاريخ ${endDate}`;
    }
    printAttendanceReport(filteredRecords, dateRangeText);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              سجل الحركات والفلاتر والتصدير
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              منسق ومعتمد
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            البحث في حركات الموظفين: تاريخ، اسم، وقت حضور، وقت انصراف، غياب، أو إذن إن وجد مع التصدير المنظم لإكسيل.
          </p>
        </div>

        {/* Export & Print Buttons */}
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          {/* Main Excel Export Button */}
          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="تصدير جدول إكسيل منسق ومصمم باللغة العربية مع كافة الأعمدة المطلوبة"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>تصدير إكسيل منظم (Excel)</span>
          </button>

          {/* Alternative CSV Export */}
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 border border-slate-300 transition-colors"
            title="تصدير ملف CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>

          {/* Print Report */}
          <button
            id="print-report-btn"
            onClick={handlePrintReport}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>طباعة A4</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>خيارات التصفية السريعة والبحث المنظم</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة التعيين</span>
          </button>
        </div>

        {/* Quick Date Presets & Quick Classification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600">الفترة الزمنية:</span>
            <button
              onClick={() => applyQuickDate('today')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${startDate === today && endDate === today ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              اليوم
            </button>
            <button
              onClick={() => applyQuickDate('week')}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => applyQuickDate('month')}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              هذا الشهر
            </button>
            <button
              onClick={() => applyQuickDate('all')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${!startDate && !endDate ? 'bg-slate-800 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              كل السجلات
            </button>
          </div>

          {/* Quick Category Filter: حضور / غياب / إذن */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setAttendanceTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${attendanceTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setAttendanceTypeFilter('present')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${attendanceTypeFilter === 'present' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-emerald-700'}`}
            >
              حضور نظامي
            </button>
            <button
              type="button"
              onClick={() => setAttendanceTypeFilter('absent')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${attendanceTypeFilter === 'absent' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-rose-700'}`}
            >
              غياب فقط
            </button>
            <button
              type="button"
              onClick={() => setAttendanceTypeFilter('permission')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${attendanceTypeFilter === 'permission' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-amber-700'}`}
            >
              سجلات بها إذن
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Start Date */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
            />
          </div>

          {/* Filter by Employee (Name and Code) */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">الموظف</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
            >
              <option value="all">جميع الموظفين ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} (كود البصمة: {emp.code})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">الحالة التفصيلية</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
            >
              <option value="all">جميع الحالات التفصيلية</option>
              <option value="present">حاضر نظامي</option>
              <option value="checked_out">انصرف نظامي</option>
              <option value="late_with_permission">حضور متأخر بإذن مقبول</option>
              <option value="early_with_permission">انصراف مبكر بإذن مقبول</option>
              <option value="pending_permission">إذن قيد المراجعة</option>
              <option value="rejected_permission">إذن مرفوض (غياب)</option>
              <option value="absent">غائب</option>
            </select>
          </div>
        </div>

        {/* Free search */}
        <div>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث سريع بالاسم، كود البصمة، سبب الإذن، أو الملاحظات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-xs text-slate-500">إجمالي الحركات</span>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center bg-emerald-50/30 shadow-xs">
          <span className="text-xs text-emerald-800 font-medium">حاضرون في الموعد</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{stats.onTime}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-amber-200 text-center bg-amber-50/30 shadow-xs">
          <span className="text-xs text-amber-800 font-medium">حالات بها إذن</span>
          <p className="text-xl font-bold text-amber-700 mt-1">{stats.withPermission}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-rose-200 text-center bg-rose-50/30 shadow-xs">
          <span className="text-xs text-rose-800 font-medium">حالات الغياب</span>
          <p className="text-xl font-bold text-rose-700 mt-1">{stats.rejectedOrAbsent}</p>
        </div>
      </div>

      {/* Historical Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm">
              جدول سجل الحركات المنظم ({filteredRecords.length} حركة)
            </h3>
            <span className="text-xs text-slate-400">مرتبة تنازلياً</span>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 self-end sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل هذا الجدول بإكسيل</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">اسم الموظف والكود</th>
                <th className="py-3 px-3 text-center">وقت الحضور</th>
                <th className="py-3 px-3 text-center">وقت الانصراف</th>
                <th className="py-3 px-3 text-center">الغياب</th>
                <th className="py-3 px-4">الإذن إن وجد</th>
                <th className="py-3 px-3 text-center">الحالة العامة</th>
                {onDeleteRecord && <th className="py-3 px-3 text-center">حذف</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={onDeleteRecord ? 8 : 7} className="py-10 text-center text-slate-400">
                    لا توجد حركات مطابقة للشروط المحددة.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isAbsent = r.status === 'absent' || r.status === 'rejected_permission';
                  const hasPermission = r.hasPermissionRequest || Boolean(r.permissionReason);
                  const permText = getPermissionDetail(r);

                  let statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {getStatusArabicLabel(r.status)}
                    </span>
                  );

                  if (r.status === 'present' || r.status === 'checked_out') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {getStatusArabicLabel(r.status)}
                      </span>
                    );
                  } else if (r.status === 'late_with_permission' || r.status === 'early_with_permission') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {getStatusArabicLabel(r.status)}
                      </span>
                    );
                  } else if (r.status === 'pending_permission') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        {getStatusArabicLabel(r.status)}
                      </span>
                    );
                  } else if (isAbsent) {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {getStatusArabicLabel(r.status)}
                      </span>
                    );
                  }

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      {/* 1. Date */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {r.date}
                      </td>

                      {/* 2. Employee Name & Code */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.employeeName}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                          <Fingerprint className="w-3 h-3 text-emerald-600" />
                          <span>كود: {r.employeeCode}</span>
                        </div>
                      </td>

                      {/* 3. Check-In Time */}
                      <td className="py-3 px-3 text-center font-mono text-slate-800 font-semibold" dir="ltr">
                        {r.checkInTime ? (
                          <span className="text-emerald-700">{r.checkInTime}</span>
                        ) : (
                          <span className="text-slate-300">---</span>
                        )}
                      </td>

                      {/* 4. Check-Out Time */}
                      <td className="py-3 px-3 text-center font-mono text-slate-800 font-semibold" dir="ltr">
                        {r.checkOutTime ? (
                          <span className="text-blue-700">{r.checkOutTime}</span>
                        ) : (
                          <span className="text-slate-300">---</span>
                        )}
                      </td>

                      {/* 5. Absent Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isAbsent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>غائب</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>حاضر</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Permission Details (إن وجد) */}
                      <td className="py-3 px-4 max-w-xs">
                        {hasPermission ? (
                          <div className="space-y-0.5">
                            <div className="text-amber-800 font-bold flex items-center gap-1 text-[11px]">
                              <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{permText}</span>
                            </div>
                            {r.notes && (
                              <div className="text-[10px] text-slate-400">
                                ملاحظة: {r.notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">لا يوجد إذن</span>
                        )}
                      </td>

                      {/* 7. Overall Status Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {statusBadge}
                      </td>

                      {/* Delete Record Button */}
                      {onDeleteRecord && (
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(r)}
                            title="حذف هذا السجل"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Record Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base mb-1">
              تأكيد حذف السجل
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              هل أنت متأكد من حذف سجل حركة الموظف <span className="font-bold text-slate-900">"{recordToDelete.employeeName}"</span> لتاريخ <span className="font-mono font-bold text-slate-800">{recordToDelete.date}</span>؟
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecord}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm text-xs"
              >
                نعم، حذف السجل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
