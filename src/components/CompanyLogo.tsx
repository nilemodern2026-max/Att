import React, { useState } from 'react';

export const COMPANY_LOGO_URL = 'https://i.ibb.co/Qv4gxzG2/122.png';

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  companyName?: string;
  logoUrl?: string;
}

/**
 * Company Logo Component
 * Displays the company logo from the specified URL (or default),
 * with graceful fallback to initial letter if the image fails.
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  companyName = 'نظام إدارة الحضور والانصراف',
  logoUrl = COMPANY_LOGO_URL,
}) => {
  const [imgError, setImgError] = useState(false);

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
        className={`${currentSize} shrink-0 relative flex items-center justify-center rounded-xl bg-white p-1 border border-slate-200/80 shadow-xs overflow-hidden select-none`}
        title={companyName}
      >
        {!imgError && logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full rounded-lg bg-gradient-to-br from-emerald-600 to-slate-900 flex items-center justify-center text-white font-black">
            <span>{initialLetter}</span>
          </div>
        )}
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

