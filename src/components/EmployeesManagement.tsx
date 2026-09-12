import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Fingerprint, 
  CheckCircle2, 
  XCircle, 
  X, 
  Check, 
  AlertTriangle,
  Power,
  Smartphone,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { Employee } from '../types';

interface EmployeesManagementProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const EmployeesManagement: React.FC<EmployeesManagementProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal state for Add/Edit
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State: Name and Fingerprint Code only
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Delete Confirmation Modal State
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Device Lock Reset Confirmation State
  const [deviceResetTarget, setDeviceResetTarget] = useState<Employee | null>(null);

  // Success Notification banner
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Reset employee device lock
  const handleConfirmResetDevice = () => {
    if (!deviceResetTarget) return;
    onUpdateEmployee({
      ...deviceResetTarget,
      boundDeviceId: undefined,
      boundDeviceName: undefined,
      boundAt: undefined,
    });
    showToast(`تم فك قفل هاتف الموظف (${deviceResetTarget.name}) بنجاح. سيتمكن من ربط هاتفه الجديد عند البصمة القادمة.`);
    setDeviceResetTarget(null);
  };

  // Open modal to add a new employee
  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setName('');
    // Auto calculate next sequential code
    const maxCode = employees.reduce((max, e) => {
      const num = parseInt(e.code, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 1000);
    setCode(String(maxCode + 1));
    setIsActive(true);
    setFormError('');
    setShowModal(true);
  };

  // Open modal to edit employee
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setCode(emp.code);
    setIsActive(emp.isActive);
    setFormError('');
    setShowModal(true);
  };

  // Toggle active status directly from card
  const handleToggleStatus = (emp: Employee) => {
    const updated = { ...emp, isActive: !emp.isActive };
    onUpdateEmployee(updated);
    showToast(updated.isActive ? `تم تفعيل حساب الموظف ${emp.name}` : `تم إيقاف حساب الموظف ${emp.name}`);
  };

  // Submit Add or Edit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = name.trim();
    const trimmedCode = code.trim();

    if (!trimmedName || !trimmedCode) {
      setFormError('يرجى كتابة اسم الموظف وكود البصمة.');
      return;
    }

    // Check code uniqueness
    const codeExists = employees.some(
      (emp) => emp.code.trim() === trimmedCode && emp.id !== editingEmployee?.id
    );

    if (codeExists) {
      setFormError(`كود البصمة (${trimmedCode}) مستخدم بالفعل لموظف آخر. يرجى إدخال كود فريد.`);
      return;
    }

    if (editingEmployee) {
      // Update employee
      const updated: Employee = {
        ...editingEmployee,
        name: trimmedName,
        code: trimmedCode,
        isActive,
      };
      onUpdateEmployee(updated);
      showToast(`تم حفظ تعديلات الموظف "${trimmedName}" بنجاح.`);
    } else {
      // Add new employee
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        name: trimmedName,
        code: trimmedCode,
        isActive,
      };
      onAddEmployee(newEmp);
      showToast(`تمت إضافة الموظف "${trimmedName}" بكود البصمة (${trimmedCode}) بنجاح.`);
    }

    setShowModal(false);
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    const deletedName = employeeToDelete.name;
    onDeleteEmployee(employeeToDelete.id);
    setEmployeeToDelete(null);
    showToast(`تم حذف الموظف "${deletedName}" نهائياً.`);
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && emp.isActive) ||
      (statusFilter === 'inactive' && !emp.isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = employees.filter((e) => e.isActive).length;
  const inactiveCount = employees.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between shadow-lg border transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Fingerprint className="w-7 h-7 text-emerald-600" />
            <span>إدارة الموظفين وأكواد البصمة</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            تسجيل وتعديل بيانات الموظفين (الاسم وكود البصمة فقط) وضبط حالة التفعيل.
          </p>
        </div>

        <button
          id="add-employee-btn"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Quick KPI Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">إجمالي الموظفين</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{employees.length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs bg-emerald-50/20">
          <span className="text-xs text-emerald-700 font-medium block">الموظفون المفعّلون</span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">{activeCount}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block">الحسابات المتوقفة</span>
          <span className="text-2xl font-extrabold text-slate-500 mt-1 block">{inactiveCount}</span>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="employee-search-input"
            placeholder="بحث بالاسم أو كود البصمة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">الحالة:</span>
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'all' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              الكل ({employees.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              نشط ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'inactive' ? 'bg-white text-slate-800 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              متوقف ({inactiveCount})
            </button>
          </div>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-medium">لا يوجد موظفون مطابقون لشروط البحث.</p>
            {employees.length === 0 && (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                + أضف أول موظف الآن
              </button>
            )}
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all relative overflow-hidden flex flex-col justify-between ${
                emp.isActive 
                  ? 'border-slate-200 hover:border-emerald-300 hover:shadow-sm' 
                  : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                {/* Top Row: Name and Status Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                      emp.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {emp.name.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base leading-snug">{emp.name}</h4>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-0.5 ${
                        emp.isActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {emp.isActive ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            حساب نشط
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            حساب متوقف
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fingerprint Code Card */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-600">كود البصمة:</span>
                  </div>
                  <span className="font-mono text-base font-black text-emerald-700 bg-white px-3 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                    {emp.code}
                  </span>
                </div>

                {/* Bound Device Status Box */}
                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Smartphone className={`w-4 h-4 shrink-0 ${emp.boundDeviceId ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[11px] truncate">
                      {emp.boundDeviceId ? (
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">مقترن: {emp.boundDeviceName || 'هاتف شخصي'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">لم يقترن بهاتف بعد</span>
                      )}
                    </span>
                  </div>

                  {emp.boundDeviceId && (
                    <button
                      type="button"
                      onClick={() => setDeviceResetTarget(emp)}
                      title="فك قفل الهاتف ليتمكن الموظف من استخدام هاتف آخر"
                      className="shrink-0 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-colors inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>فك القفل</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons: Edit, Delete, Toggle Active */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(emp)}
                  title={emp.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                    emp.isActive
                      ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                      : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{emp.isActive ? 'إيقاف' : 'تفعيل'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(emp)}
                    className="px-3 py-1.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-xs font-bold inline-flex items-center gap-1 border border-slate-200 hover:border-emerald-200"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmployeeToDelete(emp)}
                    className="px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-xs font-bold inline-flex items-center gap-1 border border-rose-200 hover:border-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Employee Modal (Name and Fingerprint Code ONLY) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-emerald-600" />
                <span>{editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Name */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1.5">
                  اسم الموظف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="employee-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمود علي"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              {/* Field 2: Fingerprint Code */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1.5">
                  كود البصمة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Fingerprint className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    id="employee-code-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="مثال: 1006"
                    className="w-full pr-10 pl-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  الكود الذي يقوم الموظف بإدخاله في شاشة التبصيم لتسجيل الحضور والانصراف.
                </p>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="modal-is-active-check"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="modal-is-active-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  تفعيل حساب الموظف للتبصيم
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  id="save-employee-modal-btn"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingEmployee ? 'حفظ التعديلات' : 'إضافة الموظف الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base mb-1">
              تأكيد حذف الموظف
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              هل أنت متأكد من حذف الموظف <span className="font-bold text-slate-900">"{employeeToDelete.name}"</span> صاحب كود البصمة (<span className="font-mono font-bold text-emerald-700">{employeeToDelete.code}</span>)؟ لن يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                id="confirm-delete-employee-btn"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm text-xs"
              >
                نعم، حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Lock Reset Confirmation Modal */}
      {deviceResetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base mb-1">
              فك قفل هاتف الموظف
            </h3>
            <p className="text-xs text-slate-600 mb-2 leading-relaxed">
              هل تريد إلغاء اقتران هاتف الموظف <span className="font-bold text-slate-900">"{deviceResetTarget.name}"</span>؟
            </p>
            <p className="text-[11px] text-slate-500 mb-4 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60">
              * هذا الإجراء يتيح للموظف تسجيل الحضور من هاتفه الجديد، وسيتم قفل حسابه على الجهاز الجديد فور التبصيم.
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeviceResetTarget(null)}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDevice}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm text-xs"
              >
                تأكيد فك القفل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
