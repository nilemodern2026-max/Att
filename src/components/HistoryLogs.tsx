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
  AlertTriangle
} from 'lucide-react';
import { Employee, AttendanceRecord } from '../types';
import { exportRecordsToCSV, getStatusArabicLabel, printAttendanceReport } from '../utils/export';
import { getTodayDateString } from '../utils/storage';

interface HistoryLogsProps {
  records: AttendanceRecord[];
  employees: Employee[];
  onDeleteRecord?: (id: string) => void;
}

export const HistoryLogs: React.FC<HistoryLogsProps> = ({ records, employees, onDeleteRecord }) => {
  const today = getTodayDateString();

  // Filters State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
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
  }, [records, startDate, endDate, selectedEmployeeId, selectedStatus, searchTerm]);

  // Statistics for the filtered view
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const onTime = filteredRecords.filter((r) => r.status === 'present' || r.status === 'checked_out').length;
    const withPermission = filteredRecords.filter((r) => r.status === 'late_with_permission' || r.status === 'early_with_permission').length;
    const rejectedOrAbsent = filteredRecords.filter((r) => r.status === 'rejected_permission' || r.status === 'absent').length;
    return { total, onTime, withPermission, rejectedOrAbsent };
  }, [filteredRecords]);

  const confirmDeleteRecord = () => {
    if (!recordToDelete || !onDeleteRecord) return;
    onDeleteRecord(recordToDelete.id);
    setRecordToDelete(null);
  };

  // Export and Print Handlers
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            سجل الحركات والفلاتر والتصدير
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            البحث في السجل التاريخي الكامل لجميع الأيام مع خيارات التصفية وتصدير Excel والطباعة وحذف السجلات.
          </p>
        </div>

        {/* Export & Print Buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            id="export-csv-btn"
            onClick={() => exportRecordsToCSV(filteredRecords, `سجل_الحضور_${today}.csv`)}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel / CSV</span>
          </button>
          <button
            id="print-report-btn"
            onClick={handlePrintReport}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>خيارات التصفية والبحث</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة التعيين</span>
          </button>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500">فترة سريعة:</span>
          <button
            onClick={() => applyQuickDate('today')}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            اليوم
          </button>
          <button
            onClick={() => applyQuickDate('week')}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            آخر 7 أيام
          </button>
          <button
            onClick={() => applyQuickDate('month')}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            هذا الشهر
          </button>
          <button
            onClick={() => applyQuickDate('all')}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            كل السجلات
          </button>
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
              <option value="all">جميع الموظفين</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} (كود البصمة: {emp.code})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">الحالة</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
            >
              <option value="all">جميع الحالات</option>
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
              placeholder="بحث بالاسم أو كود البصمة أو سبب الإذن..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Filter Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-xs text-slate-500">إجمالي الحركات المعروضة</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center bg-emerald-50/20">
          <span className="text-xs text-emerald-700">حضور وانصراف نظامي</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{stats.onTime}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-blue-200 text-center bg-blue-50/20">
          <span className="text-xs text-blue-700">حالات أذونات مقبولة</span>
          <p className="text-xl font-bold text-blue-700 mt-1">{stats.withPermission}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-rose-200 text-center bg-rose-50/20">
          <span className="text-xs text-rose-700">مرفوض أو غياب</span>
          <p className="text-xl font-bold text-rose-700 mt-1">{stats.rejectedOrAbsent}</p>
        </div>
      </div>

      {/* Historical Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">
            نتائج السجل ({filteredRecords.length} حركة)
          </h3>
          <span className="text-xs text-slate-400">مرتبة تنازلياً حسب التاريخ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">الموظف وكود البصمة</th>
                <th className="py-3 px-3">وقت الحضور</th>
                <th className="py-3 px-3">وقت الانصراف</th>
                <th className="py-3 px-3">الحالة والاعتماد</th>
                <th className="py-3 px-4">تفاصيل الإذن / الملاحظات</th>
                {onDeleteRecord && <th className="py-3 px-3 text-center">حذف</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={onDeleteRecord ? 7 : 6} className="py-10 text-center text-slate-400">
                    لا توجد سجلات مطابقة للشروط المحددة.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
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
                  } else if (r.status === 'rejected_permission' || r.status === 'absent') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {getStatusArabicLabel(r.status)}
                      </span>
                    );
                  }

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.employeeName}</div>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-mono font-bold mt-0.5">
                          <Fingerprint className="w-3 h-3 text-emerald-600" />
                          <span>كود: {r.employeeCode}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800" dir="ltr">
                        {r.checkInTime || '---'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800" dir="ltr">
                        {r.checkOutTime || '---'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {statusBadge}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {r.permissionReason ? (
                          <span title={r.permissionReason} className="text-amber-800 font-medium">
                            إذن: {r.permissionReason}
                          </span>
                        ) : (
                          <span>{r.notes || '---'}</span>
                        )}
                      </td>
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
