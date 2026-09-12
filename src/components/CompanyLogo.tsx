import React, { useState } from 'react';

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  companyName?: string;
}

/**
 * Company Logo Component
 * Adapts dynamically to the company name configured by the administrator.
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  companyName = 'نظام إدارة الحضور والانصراف',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const initialLetter = companyName ? companyName.trim().charAt(0) : '🏢';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${currentSize} shrink-0 relative flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white font-extrabold shadow-xs border border-emerald-500/20 overflow-hidden select-none`}
        title={companyName}
      >
        <span>{initialLetter}</span>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-sm leading-tight">
            {companyName}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium tracking-wide">
            نظام الحضور والانصراف الذكي
          </span>
        </div>
      )}
    </div>
  );
};
