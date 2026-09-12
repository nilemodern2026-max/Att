import React from 'react';

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  companyName?: string;
}

/**
 * Company Vector Logo Component
 * Matches the uploaded Nile Modern (NM) Industrial Monogram:
 * - Stylized geometric 'N' and 'M' in deep industrial navy blue (#1E3A5F)
 * - Industrial factory chimney and smokestack in slate gray (#6B7280)
 * - Upper industrial gear / cogwheel in steel gray (#6B7280)
 * - Factory roofline / angled teeth in slate gray (#6B7280)
 * - Elegant flowing curved water wave stream in vibrant blue (#2B5B84)
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  companyName = 'النيل الحديثة - Nile Modern',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${currentSize} shrink-0 relative flex items-center justify-center rounded-xl bg-white p-1 border border-slate-200/80 shadow-xs`}
        title={companyName}
      >
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full object-contain"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Defs for gradients */}
          <defs>
            <linearGradient id="nm-navy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A4B7C" />
              <stop offset="100%" stopColor="#1B3252" />
            </linearGradient>
            <linearGradient id="nm-gray-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7E8793" />
              <stop offset="100%" stopColor="#5A626E" />
            </linearGradient>
            <linearGradient id="nm-river-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B679B" />
              <stop offset="100%" stopColor="#1E395E" />
            </linearGradient>
          </defs>

          {/* Top Gear / Cogwheel in Gray */}
          <path
            d="M 230 48 L 270 48 L 274 74 C 286 78 298 83 308 90 L 331 77 L 359 105 L 346 128 C 353 138 358 150 362 162 L 388 166 L 388 206 L 362 210 C 358 222 353 234 346 244 L 359 267 L 331 295 L 308 282 C 298 289 286 294 274 298 L 270 324 L 230 324 L 226 298 C 214 294 202 289 192 282 L 169 295 L 141 267 L 154 244 C 147 234 142 222 138 210 L 112 206 L 112 166 L 138 162 C 142 150 147 138 154 128 L 141 105 L 169 77 L 192 90 C 202 83 214 78 226 74 Z"
            fill="url(#nm-gray-grad)"
          />

          {/* Inner Cog Hole / Cutout */}
          <circle cx="250" cy="186" r="62" fill="#FFFFFF" />

          {/* Left Industrial Factory Chimney Stack in Gray */}
          <polygon
            points="112,24 148,36 142,220 102,220"
            fill="url(#nm-gray-grad)"
          />

          {/* Bottom Right Factory Sawtooth Roof / Building in Gray */}
          <polygon
            points="294,400 358,350 358,440 426,350 426,440 452,440 452,480 294,480"
            fill="url(#nm-gray-grad)"
          />

          {/* Geometric Monogram: Upper Central Factory / 'N-M' Architectural Apex in Navy */}
          <path
            d="M 272 136 L 378 190 L 378 274 L 334 318 L 334 220 L 272 178 Z"
            fill="url(#nm-navy-grad)"
          />

          {/* Central Blue 'M' Structure & Wings */}
          <path
            d="M 166 132 L 272 216 L 376 132 L 498 184 L 418 240 L 452 440 L 426 440 L 394 250 L 334 322 L 272 272 L 212 334 L 166 132 Z"
            fill="url(#nm-navy-grad)"
          />

          {/* Left Large 'N' Monogram Structure in Deep Navy */}
          <path
            d="M 2 230 L 76 230 C 86 270 94 316 100 360 L 100 480 L 2 480 Z"
            fill="url(#nm-navy-grad)"
          />

          {/* Flowing Nile Water River Stream (Curving organically through the monogram) */}
          <path
            d="M 94 56 C 90 108 42 168 44 244 C 46 312 116 350 148 424 C 168 472 174 496 174 500 L 298 500 C 298 480 274 446 250 410 C 210 350 152 320 144 246 C 136 178 188 126 190 76 C 190 56 186 52 184 52 C 160 52 120 14 94 56 Z"
            fill="url(#nm-river-grad)"
          />

          {/* Clean Vector Trim Overlay */}
          <path
            d="M 50 324 L 50 480 L 16 480 L 16 324 Z"
            fill="#FFFFFF"
            opacity="0.1"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-sm leading-tight">
            {companyName}
          </span>
          <span className="text-[10px] text-slate-500 font-medium tracking-wide">
            Industrial & Manufacturing Solutions
          </span>
        </div>
      )}
    </div>
  );
};
