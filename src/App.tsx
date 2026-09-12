/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TodayDashboard } from './components/TodayDashboard';
import { HistoryLogs } from './components/HistoryLogs';
import { EmployeesManagement } from './components/EmployeesManagement';
import { SettingsPage } from './components/SettingsPage';
import { QrCodeStation } from './components/QrCodeStation';
import { EmployeePortalPage } from './components/EmployeePortalPage';

import { Employee, AttendanceRecord, SystemSettings } from './types';
import { 
  getStoredEmployees, 
  saveEmployees, 
  getStoredRecords, 
  saveRecords, 
  getStoredSettings, 
  saveSettings,
  getTodayDateString
} from './utils/storage';
import { checkAndApplyUrlSync } from './utils/syncUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'employees' | 'settings' | 'qr'>('today');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(getStoredSettings());
  const [syncToast, setSyncToast] = useState<{ title: string; desc: string } | null>(null);

  // Check if opened via QR code scan (e.g. ?portal=1, ?mode=portal, or #portal)
  const isInitiallyPortal = typeof window !== 'undefined' && (() => {
    const urlParams = new URLSearchParams(window.location.search);
    // If admin import is present, prioritize admin mode
    if (urlParams.has('import_admin')) return false;
    return (
      urlParams.get('portal') === '1' ||
      urlParams.get('mode') === 'portal' ||
      window.location.hash === '#portal'
    );
  })();

  const [isPortalMode, setIsPortalMode] = useState<boolean>(isInitiallyPortal);

  // Initialize data on mount + Apply Cross-Domain & QR Sync if present
  useEffect(() => {
    // 1. Check if URL contains sync payload from QR scan or Admin transfer
    const syncRes = checkAndApplyUrlSync();
    if (syncRes.applied) {
      if (syncRes.type === 'portal') {
        setIsPortalMode(true);
        setSyncToast({
          title: `تمت مزامنة بيانات ${syncRes.companyName || 'الشركة'} بنجاح!`,
          desc: `تم تحميل ${syncRes.employeeCount || 0} موظف معتمد ومطابقة نطاق المقر الجغرافي.`,
        });
      } else if (syncRes.type === 'admin') {
        setIsPortalMode(false);
        setSyncToast({
          title: `تم نقل لوحة الإدارة إلى هذا النطاق بنجاح!`,
          desc: `تم استيراد كافة إعدادات منشأة (${syncRes.companyName}) و${syncRes.employeeCount} موظف.`,
        });
      }
      setTimeout(() => setSyncToast(null), 5000);
    }

    setEmployees(getStoredEmployees());
    setRecords(getStoredRecords());
    setSettings(getStoredSettings());

    // Listen for storage updates across tabs/windows
    const handleDataChange = () => {
      setEmployees(getStoredEmployees());
      setRecords(getStoredRecords());
      setSettings(getStoredSettings());
    };

    window.addEventListener('attendance_data_changed', handleDataChange);
    window.addEventListener('storage', handleDataChange);

    return () => {
      window.removeEventListener('attendance_data_changed', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, []);

  // Switch between Portal Mode and Admin Mode
  const handleSwitchToAdmin = () => {
    setIsPortalMode(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('portal');
      url.searchParams.delete('mode');
      window.history.replaceState({}, '', url.pathname);
    }
  };

  const handleSwitchToPortal = () => {
    setIsPortalMode(true);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('portal', '1');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Today's pending permissions count for notification badge
  const today = getTodayDateString();
  const pendingPermissionsCount = records.filter(
    (r) => r.date === today && r.status === 'pending_permission' && r.permissionStatus === 'pending'
  ).length;

  // Handlers for Records
  const handleUpdateRecord = (updatedRecord: AttendanceRecord) => {
    const updated = records.map((r) => (r.id === updatedRecord.id ? updatedRecord : r));
    setRecords(updated);
    saveRecords(updated);
  };

  const handleAddManualRecord = (newRecord: AttendanceRecord) => {
    const updated = [newRecord, ...records];
    setRecords(updated);
    saveRecords(updated);
  };

  const handleRecordSuccessFromPortal = (record: AttendanceRecord) => {
    const existingIndex = records.findIndex((r) => r.id === record.id);
    let updated: AttendanceRecord[];
    if (existingIndex >= 0) {
      updated = [...records];
      updated[existingIndex] = record;
    } else {
      updated = [record, ...records];
    }
    setRecords(updated);
    saveRecords(updated);
  };

  // Handlers for Employees
  const handleAddEmployee = (newEmployee: Employee) => {
    const updated = [...employees, newEmployee];
    setEmployees(updated);
    saveEmployees(updated);
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    const updated = employees.map((e) => (e.id === updatedEmployee.id ? updatedEmployee : e));
    setEmployees(updated);
    saveEmployees(updated);

    const updatedRecs = records.map((r) => {
      if (r.employeeId === updatedEmployee.id) {
        return {
          ...r,
          employeeName: updatedEmployee.name,
          employeeCode: updatedEmployee.code,
        };
      }
      return r;
    });
    setRecords(updatedRecs);
    saveRecords(updatedRecs);
  };

  const handleDeleteEmployee = (id: string) => {
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    saveEmployees(updated);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    saveRecords(updated);
  };

  // Handlers for Settings
  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // If in Employee Portal mode (via QR code scan or employee link), 
  // render ONLY the employee portal interface!
  // The employee NEVER sees the admin dashboard, navbar, or settings!
  if (isPortalMode) {
    return (
      <div className="relative">
        {syncToast && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-md w-11/12 bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-emerald-500/50 animate-in fade-in slide-in-from-top-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              ✓
            </div>
            <div className="text-xs">
              <div className="font-bold text-emerald-400">{syncToast.title}</div>
              <div className="text-slate-300 mt-0.5">{syncToast.desc}</div>
            </div>
          </div>
        )}
        <EmployeePortalPage
          employees={employees}
          records={records}
          settings={settings}
          onRecordSuccess={handleRecordSuccessFromPortal}
          onSwitchToAdmin={handleSwitchToAdmin}
          onUpdateEmployee={handleUpdateEmployee}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Cairo',sans-serif]">
      {syncToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-11/12 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/60 animate-in fade-in slide-in-from-top-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
            ✓
          </div>
          <div className="text-xs">
            <div className="font-bold text-sm text-emerald-300">{syncToast.title}</div>
            <div className="text-slate-300 mt-1 leading-relaxed">{syncToast.desc}</div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingPermissionsCount}
        onOpenEmployeePortal={handleSwitchToPortal}
        companyName={settings.location.companyName}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'today' && (
          <TodayDashboard
            employees={employees}
            records={records}
            settings={settings}
            onUpdateRecord={handleUpdateRecord}
            onAddManualRecord={handleAddManualRecord}
            onDeleteRecord={handleDeleteRecord}
            onOpenEmployeePortal={handleSwitchToPortal}
          />
        )}

        {activeTab === 'history' && (
          <HistoryLogs 
            records={records} 
            employees={employees} 
            companyName={settings.location.companyName}
            onDeleteRecord={handleDeleteRecord} 
          />
        )}

        {activeTab === 'employees' && (
          <EmployeesManagement
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            settings={settings}
            employees={employees}
            records={records}
            onSaveSettings={handleSaveSettings}
            onUpdateEmployees={(newEmps) => {
              setEmployees(newEmps);
              saveEmployees(newEmps);
            }}
          />
        )}

        {activeTab === 'qr' && (
          <QrCodeStation
            settings={settings}
            employees={employees}
            records={records}
            onOpenEmployeePortal={handleSwitchToPortal}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>

      {/* Printable Report Header for Browser Print Dialog */}
      <div className="hidden print:block text-center p-6 border-b border-slate-300">
        <h1 className="text-2xl font-bold">{settings.location.companyName}</h1>
        <p className="text-sm text-slate-600 mt-1">{settings.location.locationName} - تقرير الحضور والانصراف الرسمي</p>
        <p className="text-xs text-slate-400 mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
      </div>
    </div>
  );
}
