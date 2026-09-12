import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  Calendar, 
  Users, 
  FileSpreadsheet, 
  Settings, 
  QrCode, 
  Smartphone,
  AlertCircle,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

interface NavbarProps {
  activeTab: 'today' | 'history' | 'employees' | 'settings' | 'qr';
  setActiveTab: (tab: 'today' | 'history' | 'employees' | 'settings' | 'qr') => void;
  pendingCount: number;
  onOpenEmployeePortal: () => void;
  companyName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  onOpenEmployeePortal,
  companyName,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems: Array<{
    id: 'today' | 'history' | 'employees' | 'settings' | 'qr';
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'today',
      label: 'حضور اليوم',
      icon: <Clock className="w-4 h-4 ml-1.5" />,
      badge: pendingCount,
    },
    {
      id: 'history',
      label: 'السجل والتصدير',
      icon: <FileSpreadsheet className="w-4 h-4 ml-1.5" />,
    },
    {
      id: 'employees',
      label: 'الموظفين والأكواد',
      icon: <Users className="w-4 h-4 ml-1.5" />,
    },
    {
      id: 'settings',
      label: 'الإعدادات والنطاق',
      icon: <Settings className="w-4 h-4 ml-1.5" />,
    },
    {
      id: 'qr',
      label: 'رمز QR للطباعة',
      icon: <QrCode className="w-4 h-4 ml-1.5" />,
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Company */}
          <div className="flex items-center gap-3">
            <CompanyLogo size="md" companyName={companyName} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  نظام الحضور والانصراف
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 ml-1" />
                  مفعل
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-xs">{companyName}</p>
            </div>
          </div>

          {/* Center: Live Date & Clock */}
          <div className="hidden md:flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700">
            <div className="flex items-center gap-1.5 font-medium text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{currentDate}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 tracking-wide">
              <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span dir="ltr">{currentTime}</span>
            </div>
          </div>

          {/* Right Action: Mobile Portal Button */}
          <div className="flex items-center gap-2">
            <button
              id="open-employee-portal-btn"
              onClick={onOpenEmployeePortal}
              className="relative inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              title="محاكاة مسح الكود وشاشة تسجيل الحضور والانصراف للموظف"
            >
              <Smartphone className="w-4 h-4" />
              <span>تسجيل كموظف (QR)</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-reverse space-x-1 border-t border-slate-100 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`mr-2 px-1.5 py-0.5 text-xs rounded-full font-bold ${
                    isActive ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white animate-pulse'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
