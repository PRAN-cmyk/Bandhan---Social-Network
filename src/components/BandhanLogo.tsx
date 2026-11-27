import React from 'react';

export interface BandhanLogoProps {
  variant?: 'icon' | 'navbar' | 'hero' | 'splash';
  language?: 'bn' | 'en';
  className?: string;
}

/**
 * Bespoke geometric "Bandhan" (বন্ধন — Bond) emblem:
 * Two interlocking precision ribbon loops forming a luminous heart-infinity knot,
 * symbolizing human connection, trust, and continuity without emoji clichés.
 */
export const BandhanLogo: React.FC<BandhanLogoProps> = ({
  variant = 'navbar',
  language = 'bn',
  className = '',
}) => {
  const uid = React.useId().replace(/:/g, '');
  const gradPrimary = `bandhan-grad-a-${uid}`;
  const gradSecondary = `bandhan-grad-b-${uid}`;
  const glowId = `bandhan-glow-${uid}`;

  const renderEmblemSvg = (sizeClass: string) => (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={sizeClass}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradPrimary} x1="12" y1="12" x2="108" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id={gradSecondary} x1="108" y1="16" x2="16" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <filter id={glowId} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#2563EB" floodOpacity="0.32" />
        </filter>
      </defs>

      {/* Outer faceted squircle housing */}
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="30"
        fill="url(#bandhan-bg-none)"
        className="fill-slate-950/95 dark:fill-slate-900"
      />
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="30"
        fill={`url(#${gradPrimary})`}
        fillOpacity="0.16"
        stroke={`url(#${gradSecondary})`}
        strokeWidth="2.5"
      />

      {/* Interlocking left & right bond ribbons */}
      <g filter={`url(#${glowId})`}>
        {/* Left-to-center loop */}
        <path
          d="M34 45C34 33.954 42.954 25 54 25C62.2 25 69.2 30.1 72 37.5L48 82.5C45.2 89.9 38.2 95 30 95C24 95 19.5 91.2 19.5 84.5C19.5 76.5 27.8 70.5 38 70.5H77"
          stroke={`url(#${gradPrimary})`}
          strokeWidth="10.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right-to-center interlocking loop */}
        <path
          d="M86 75C86 86.046 77.046 95 66 95C57.8 95 50.8 89.9 48 82.5L72 37.5C74.8 30.1 81.8 25 90 25C96 25 100.5 28.8 100.5 35.5C100.5 43.5 92.2 49.5 82 49.5H43"
          stroke={`url(#${gradSecondary})`}
          strokeWidth="10.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Center luminous knot */}
      <circle cx="60" cy="60" r="8.5" fill="#FFFFFF" />
      <circle cx="60" cy="60" r="4.5" fill={`url(#${gradPrimary})`} />
    </svg>
  );

  if (variant === 'icon') {
    return <span className={`inline-flex items-center justify-center ${className}`}>{renderEmblemSvg('w-9 h-9')}</span>;
  }

  if (variant === 'navbar') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {renderEmblemSvg('w-9 h-9 sm:w-10 sm:h-10 shrink-0 transition-transform duration-300 group-hover:scale-105')}
        <div className="hidden sm:flex flex-col leading-none">
          <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-300 bg-clip-text text-transparent">
            {language === 'bn' ? 'বন্ধন' : 'Bandhan'}
          </span>
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-400 dark:text-slate-500 mt-0.5">
            {language === 'bn' ? 'BANDHAN' : 'SOCIAL'}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'splash') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        <div className="relative group">
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-blue-600/35 via-indigo-500/30 to-cyan-400/35 blur-xl opacity-80 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="relative p-1.5 rounded-[2rem] bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-cyan-400/30 border border-white/20 shadow-2xl">
            {renderEmblemSvg('w-24 h-24 sm:w-28 sm:h-28 transition-transform duration-500 group-hover:scale-105')}
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-sky-200 to-cyan-300 bg-clip-text text-transparent">
              {language === 'bn' ? 'বন্ধন' : 'Bandhan'}
            </h2>
            <span className="text-xs font-extrabold tracking-[0.18em] uppercase px-2 py-0.5 rounded-md bg-white/10 text-cyan-200 border border-white/15">
              {language === 'bn' ? 'BANDHAN' : 'বন্ধন'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-300">
            {language === 'bn'
              ? 'হৃদয়ের সুরক্ষিত বন্ধন • ছবি, রিল ও সরাসরি আলাপন'
              : 'Trusted Bonds • Stories, Reels & Real-Time Conversations'}
          </p>
        </div>
      </div>
    );
  }

  // Hero variant (used on Login / AuthScreen)
  return (
    <div className={`inline-flex items-center gap-3.5 sm:gap-4 select-none ${className}`}>
      <div className="relative shrink-0 group">
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-blue-600/30 via-indigo-500/25 to-cyan-400/30 blur-lg opacity-85 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="relative">
          {renderEmblemSvg('w-14 h-14 sm:w-16 sm:h-16 transition-transform duration-300 group-hover:scale-105')}
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent leading-none">
            {language === 'bn' ? 'বন্ধন' : 'Bandhan'}
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-blue-600/10 dark:bg-blue-400/15 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            {language === 'bn' ? 'BANDHAN' : 'বন্ধন'}
          </span>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1">
          {language === 'bn'
            ? 'বিশ্বস্ত সামাজিক বন্ধন — এক সাথে, নিরাপদে'
            : 'Authentic social connection — together, securely'}
        </p>
      </div>
    </div>
  );
};
