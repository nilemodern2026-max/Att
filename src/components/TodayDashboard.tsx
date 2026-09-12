import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Users, 
  LogOut, 
  MapPin, 
  Search, 
  PlusCircle, 
  Check, 
  X, 
  FileText,
  Fingerprint,
  Trash2,
  Smartphone
} from 'lucide-react';
import { Employee, AttendanceRecord, SystemSettings } from '../types';
import { getCurrentTimeString, getTodayDateString } from '../utils/storage';

interface TodayDashboardProps {
  employees: Employee[];
  records: AttendanceRecord[];
  settings: SystemSettings;
  onUpdateRecord: (updatedRecord: AttendanceRecord) => void;
  onAddManualRecord: (newRecord: AttendanceRecord) => void;
  onDeleteRecord?: (id: string) => void;
  onOpenEmployeePortal: () => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  employees,
  records,
  settings,
  onUpdateRecord,
  onAddManualRecord,
  onDeleteRecord,
  onOpenEmployeePortal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'checked_out' | 'absent' | 'pending'>('all');
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedEmployeeForManual, setSelectedEmployeeForManual] = useState<string>('');
  const [manualActionType, setManualActionType] = useState<'check_in' | 'check_out'>('check_in');
  const [manualTime, setManualTime] = useState<string>(getCurrentTimeString().slice(0, 5));
  const [manualNotes, setManualNotes] = useState<string>('تسجيل يدوي بواسطة الإدارة');
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; name: string } | null>(null);

  // Today's date string
  const today = getTodayDateString();

  // Active employees
  const activeEmployees = employees.filter((e) => e.isActive);

  // Today records: matches today's date string or created today
  const todayRecords = records.filter((r) => {
    if (r.date === today) return true;
    if (r.createdAt) {
      try {
        const d = new Date(r.createdAt);
        const now = new Date();
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      } catch {
        return false;
      }
    }
    return false;
  });

  // Map employeeId -> today's record
  const employeeTodayMap = new Map<string, AttendanceRecord>();
  todayRecords.forEach((r) => {
    employeeTodayMap.set(r.employeeId, r);
  });

  // Calculate KPIs
  const totalEmployeesCount = activeEmployees.length;
  const presentCount = todayRecords.filter(
    (r) => r.status === 'present' || r.status === 'late_with_permission'
  ).length;
  const checkedOutCount = todayRecords.filter(
    (r) => r.status === 'checked_out' || r.status === 'early_with_permission'
  ).length;
  const pendingPermissions = records.filter(
    (r) => r.permissionStatus === 'pending' || r.status === 'pending_permission' || (r.hasPermissionRequest && !['approved', 'rejected'].includes(r.permissionStatus || ''))
  );
  
  // Absent = active employees who don't have any record or have rejected permission marked as absent
  const absentCount = activeEmployees.filter((emp) => {
    const rec = employeeTodayMap.get(emp.id);
    return !rec || rec.status === 'rejected_permission' || rec.status === 'absent';
  }).length;

  // Handle Permission Decision (Approve / Reject)
  const handlePermissionDecision = (record: AttendanceRecord, decision: 'approved' | 'rejected', reviewNotes?: string) => {
    let updatedStatus = record.status;
    if (decision === 'approved') {
      if (record.permissionType === 'check_out') {
        updatedStatus = 'early_with_permission';
      } else {
        updatedStatus = 'late_with_permission';
      }
    } else {
      // If admin rejects permission: "لو لم اوافق يبقي غياب"
      updatedStatus = 'rejected_permission';
    }

    const updated: AttendanceRecord = {
      ...record,
      status: updatedStatus,
      permissionStatus: decision,
      permissionReviewedAt: new Date().toISOString(),
      permissionReviewedBy: 'مدير النظام / الإدارة',
      rejectionReason: decision === 'rejected' ? (reviewNotes || 'تم رفض الإذن لعدم استيفاء الشروط') : undefined,
      notes: reviewNotes || (decision === 'approved' ? 'تمت الموافقة على الإذن واحتساب الحضور نظامياً' : 'تم رفض الإذن واحتساب اليوم غياب/مخالفة'),
    };

    onUpdateRecord(updated);
  };

  // Submit Manual Record from Admin
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForManual) return;

    const emp = employees.find((e) => e.id === selectedEmployeeForManual);
    if (!emp) return;

    const existingRec = employeeTodayMap.get(emp.id);
    const timeFormatted = `${manualTime}:00`;

    if (manualActionType === 'check_in') {
      const newRec: AttendanceRecord = {
        id: existingRec ? existingRec.id : `rec-manual-${Date.now()}`,
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        department: emp.department,
        date: today,
        checkInTime: timeFormatted,
        checkOutTime: existingRec?.checkOutTime,
        status: 'present',
        notes: manualNotes,
        createdAt: new Date().toISOString(),
        checkInCoords: {
          latitude: settings.location.latitude,
          longitude: settings.location.longitude,
          distanceMeters: 0,
          isWithinRadius: true,
        },
      };
      if (existingRec) {
        onUpdateRecord(newRec);
      } else {
        onAddManualRecord(newRec);
      }
    } else {
      // check_out
      if (existingRec) {
        const updated: AttendanceRecord = {
          ...existingRec,
          checkOutTime: timeFormatted,
          status: 'checked_out',
          notes: `${existingRec.notes || ''} | ${manualNotes}`.trim(),
          checkOutCoords: {
            latitude: settings.location.latitude,
            longitude: settings.location.longitude,
            distanceMeters: 0,
            isWithinRadius: true,
          },
        };
        onUpdateRecord(updated);
      } else {
        // Checking out without prior checkin record
        const newRec: AttendanceRecord = {
          id: `rec-manual-${Date.now()}`,
          employeeId: emp.id,
          employeeCode: emp.code,
          employeeName: emp.name,
          department: emp.department,
          date: today,
          checkInTime: '08:30:00', // default assumed
          checkOutTime: timeFormatted,
          status: 'checked_out',
          notes: manualNotes,
          createdAt: new Date().toISOString(),
        };
        onAddManualRecord(newRec);
      }
    }

    setShowManualModal(false);
    setSelectedEmployeeForManual('');
  };

  // Filter roster
  const filteredEmployees = activeEmployees.filter((emp) => {
    const rec = employeeTodayMap.get(emp.id);
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'present') {
      return rec && (rec.status === 'present' || rec.status === 'late_with_permission');
    }
    if (statusFilter === 'checked_out') {
      return rec && (rec.status === 'checked_out' || rec.status === 'early_with_permission');
    }
    if (statusFilter === 'pending') {
      return rec && rec.status === 'pending_permission';
    }
    if (statusFilter === 'absent') {
      return !rec || rec.status === 'rejected_permission' || rec.status === 'absent';
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            لوحة تسجيل الحضور والانصراف - اليوم
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            متابعة فورية للحضور والانصراف واعتماد طلبات الأذونات مع مراقبة النطاق الجغرافي.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="admin-manual-record-btn"
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل يدوي للموظف</span>
          </button>
          {onOpenEmployeePortal && (
            <button
              onClick={onOpenEmployeePortal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="التبديل إلى شاشة تسجيل الحضور كما يراها الموظف عبر الـ QR"
            >
              <Smartphone className="w-4 h-4" />
              <span>شاشة الموظف (QR)</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Active */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي الموظفين</span>
            <span className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{totalEmployeesCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">موظف نشط بالنظام</span>
        </div>

        {/* Present Today */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-gradient-to-b from-white to-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">الحاضرين الآن</span>
            <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{presentCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">
            {totalEmployeesCount > 0 ? `${Math.round((presentCount / totalEmployeesCount) * 100)}% من القوة` : '0%'}
          </span>
        </div>

        {/* Checked Out */}
        <div className="bg-white p-4 rounded-xl border border-teal-200 bg-gradient-to-b from-white to-teal-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700">تم الانصراف</span>
            <span className="p-2 bg-teal-100 text-teal-600 rounded-lg">
              <LogOut className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-teal-700 mt-2">{checkedOutCount}</p>
          <span className="text-[11px] text-teal-600 mt-1 inline-block">سجلوا مغادرة العمل</span>
        </div>

        {/* Absent */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-gradient-to-b from-white to-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">لم يسجلوا / غياب</span>
            <span className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-rose-700 mt-2">{absentCount}</p>
          <span className="text-[11px] text-rose-500 mt-1 inline-block">لم يحضروا حتى الآن</span>
        </div>

        {/* Pending Permissions */}
        <div className={`p-4 rounded-xl border shadow-xs ${
          pendingPermissions.length > 0 
            ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300/40' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">طلبات الأذونات</span>
            <span className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-amber-800 mt-2">{pendingPermissions.length}</p>
          <span className="text-[11px] font-medium text-amber-700 mt-1 inline-block">
            {pendingPermissions.length > 0 ? 'تتطلب قرار الإدارة الآن' : 'لا توجد طلبات معلقة'}
          </span>
        </div>
      </div>

      {/* Urgent Pending Permissions Notification & Action Card */}
      {pendingPermissions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base font-bold text-amber-950">
                  طلبات تسجيل خارج الساعات المحددة بانتظار موافقة الإدارة ({pendingPermissions.length})
                </h3>
                <span className="text-xs font-medium bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full">
                  شرط النظام: الموافقة = حضور مظبوط | الرفض = احتساب غياب
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                سجل الموظفون الآتون خارج نافذة ساعات العمل المقررة ({settings.hours.checkInStart} - {settings.hours.checkInEnd}) وقدموا أسباب الإذن التالية:
              </p>

              {/* List of Pending Permission Requests */}
              <div className="mt-4 space-y-3">
                {pendingPermissions.map((rec) => (
                  <div 
                    key={rec.id}
                    className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{rec.employeeName}</span>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                          كود: {rec.employeeCode}
                        </span>
                        <span className="text-xs text-slate-500">({rec.department})</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          وقت الطلب: <strong className="text-slate-800" dir="ltr">{rec.checkInTime || rec.checkOutTime}</strong>
                        </span>
                        <span>•</span>
                        <span>نوع الطلب: <strong>{rec.permissionType === 'check_out' ? 'انصراف مبكر' : 'حضور متأخر'}</strong></span>
                      </div>
                      <div className="mt-2 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60 text-xs text-amber-900">
                        <span className="font-bold">سبب الإذن المدون من الموظف: </span>
                        <span>"{rec.permissionReason || 'لم يتم ذكر سبب محدد'}"</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id={`approve-perm-${rec.id}`}
                        onClick={() => handlePermissionDecision(rec, 'approved')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>موافقة (حضور مظبوط)</span>
                      </button>
                      <button
                        id={`reject-perm-${rec.id}`}
                        onClick={() => handlePermissionDecision(rec, 'rejected')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>رفض (احتساب غياب)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roster & Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filters & Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-base">سجل اليوم لجميع الموظفين</h3>
            <span className="text-xs text-slate-500">
              متابعة تفصيلية لحالة كل موظف، أوقات البصمة، والتحقق من الموقع
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                id="search-today-employee"
                placeholder="بحث بالاسم أو كود البصمة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-60 pr-9 pl-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Status Tabs Filter */}
            <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium text-slate-600">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                الكل ({activeEmployees.length})
              </button>
              <button
                onClick={() => setStatusFilter('present')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === 'present' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'hover:text-emerald-700'
                }`}
              >
                حاضر ({presentCount})
              </button>
              <button
                onClick={() => setStatusFilter('checked_out')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === 'checked_out' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'hover:text-teal-700'
                }`}
              >
                انصرف ({checkedOutCount})
              </button>
              <button
                onClick={() => setStatusFilter('absent')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === 'absent' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'hover:text-rose-700'
                }`}
              >
                غياب ({absentCount})
              </button>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 text-xs font-bold">
                <th className="py-3.5 px-4">الموظف وكود البصمة</th>
                <th className="py-3.5 px-3">وقت الحضور</th>
                <th className="py-3.5 px-3">وقت الانصراف</th>
                <th className="py-3.5 px-3">الموقع الجغرافي</th>
                <th className="py-3.5 px-3">حالة اليوم</th>
                <th className="py-3.5 px-4 text-center">إجراءات الإدارة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    لا توجد بيانات مطابقة لخيارات البحث المحددة.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const rec = employeeTodayMap.get(emp.id);

                  // Render status badge
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5" />
                      لم يسجل (غياب)
                    </span>
                  );

                  if (rec) {
                    if (rec.status === 'present') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          حاضر (في الموعد)
                        </span>
                      );
                    } else if (rec.status === 'checked_out') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                          <LogOut className="w-3.5 h-3.5" />
                          تم الانصراف
                        </span>
                      );
                    } else if (rec.status === 'late_with_permission') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          حضور بإذن مقبول
                        </span>
                      );
                    } else if (rec.status === 'early_with_permission') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <LogOut className="w-3.5 h-3.5" />
                          انصراف مبكر بإذن
                        </span>
                      );
                    } else if (rec.status === 'pending_permission') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          إذن بانتظار الموافقة
                        </span>
                      );
                    } else if (rec.status === 'rejected_permission') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5" />
                          إذن مرفوض (غياب)
                        </span>
                      );
                    }
                  }

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee name & fingerprint code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                            {emp.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-mono text-xs text-emerald-700 font-black">
                                كود البصمة: {emp.code}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="py-3.5 px-3">
                        {rec?.checkInTime ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 font-mono" dir="ltr">
                              {rec.checkInTime}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-medium">
                              {rec.status === 'late_with_permission' ? 'متأخر بإذن' : 'حضور'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">--:--</span>
                        )}
                      </td>

                      {/* Check-Out */}
                      <td className="py-3.5 px-3">
                        {rec?.checkOutTime ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 font-mono" dir="ltr">
                              {rec.checkOutTime}
                            </span>
                            <span className="text-[10px] text-teal-600 font-medium">
                              {rec.status === 'early_with_permission' ? 'مبكر بإذن' : 'انصراف'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">--:--</span>
                        )}
                      </td>

                      {/* Location GPS */}
                      <td className="py-3.5 px-3">
                        {rec?.checkInCoords ? (
                          <div className="flex items-center gap-1 text-emerald-700 text-xs font-medium">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            <span>داخل النطاق ({rec.checkInCoords.distanceMeters}م)</span>
                          </div>
                        ) : rec ? (
                          <span className="text-slate-400 text-xs">تسجيل مباشر</span>
                        ) : (
                          <span className="text-slate-300 text-xs">---</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">{statusBadge}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {rec?.status === 'pending_permission' ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handlePermissionDecision(rec, 'approved')}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
                                title="موافقة على الإذن"
                              >
                                قبول
                              </button>
                              <button
                                onClick={() => handlePermissionDecision(rec, 'rejected')}
                                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors shadow-2xs"
                                title="رفض الإذن"
                              >
                                رفض
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedEmployeeForManual(emp.id);
                                  if (rec?.checkInTime && !rec?.checkOutTime) {
                                    setManualActionType('check_out');
                                  } else {
                                    setManualActionType('check_in');
                                  }
                                  setShowManualModal(true);
                                }}
                                className="px-2.5 py-1 text-xs text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors font-medium border border-slate-200 hover:border-emerald-200"
                              >
                                {rec ? 'تعديل حركة' : 'تسجيل يدوي'}
                              </button>

                              {rec && onDeleteRecord && (
                                <button
                                  type="button"
                                  onClick={() => setRecordToDelete({ id: rec.id, name: emp.name })}
                                  title="حذف حركة اليوم"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Record Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                تسجيل يدوي بواسطة الإدارة
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الموظف</label>
                <select
                  required
                  value={selectedEmployeeForManual}
                  onChange={(e) => setSelectedEmployeeForManual(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- اضغط للاختيار --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (كود البصمة: {emp.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الحركة</label>
                  <select
                    value={manualActionType}
                    onChange={(e) => setManualActionType(e.target.value as 'check_in' | 'check_out')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
                  >
                    <option value="check_in">تسجيل حضور</option>
                    <option value="check_out">تسجيل انصراف</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوقت</label>
                  <input
                    type="time"
                    required
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات الإدارة / السبب</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
                  placeholder="مثال: تعذر استخدام الهاتف أو تسجيل استثنائي"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  حفظ الحركة الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base mb-1">
              تأكيد مسح تسجيل اليوم
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              هل أنت متأكد من مسح حركة وبصمة اليوم للموظف <span className="font-bold text-slate-900">"{recordToDelete.name}"</span>؟
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
                onClick={() => {
                  if (onDeleteRecord) {
                    onDeleteRecord(recordToDelete.id);
                  }
                  setRecordToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm text-xs"
              >
                نعم، مسح السجل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
