import React, { useState, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { Play, RotateCcw, Film, CloudOff } from 'lucide-react';

const PUBLIC_FALLBACK_VIDEOS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
];

export function isSafeVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return false;
  }
  return (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:video/') ||
    lower.startsWith('/') ||
    lower.startsWith('./')
  );
}

function isSampleExternalVideo(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('commondatastorage.googleapis.com/gtv-videos-bucket') ||
    url.includes('assets.mixkit.co')
  );
}

export interface SmartVideoProps {
  src?: string;
  poster?: string;
  className?: string;
  containerClassName?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  language?: 'bn' | 'en';
  compact?: boolean;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLVideoElement>;
  onTimeUpdate?: React.ReactEventHandler<HTMLVideoElement>;
  onEnded?: React.ReactEventHandler<HTMLVideoElement>;
  onLoadedData?: React.ReactEventHandler<HTMLVideoElement>;
  onError?: () => void;
}

export const SmartVideo = forwardRef<HTMLVideoElement, SmartVideoProps>(
  (
    {
      src,
      poster,
      className = 'w-full h-full object-contain',
      containerClassName = 'relative w-full h-full bg-black overflow-hidden',
      controls = false,
      autoPlay = false,
      loop = false,
      muted = false,
      playsInline = true,
      preload = 'metadata',
      language = 'bn',
      compact = false,
      title,
      onClick,
      onTimeUpdate,
      onEnded,
      onLoadedData,
      onError,
    },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLVideoElement | null>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current as HTMLVideoElement);

    const isUnresolvedLocalIdb = Boolean(src && src.startsWith('idb://'));
    const validSrc = isSafeVideoUrl(src) ? src : undefined;

    const [fallbackIndex, setFallbackIndex] = useState<number>(-1);
    const [hasError, setHasError] = useState<boolean>(!validSrc || isUnresolvedLocalIdb);

    useEffect(() => {
      setFallbackIndex(-1);
      setHasError(!isSafeVideoUrl(src) || Boolean(src && src.startsWith('idb://')));
    }, [src]);

    const activeSrc =
      fallbackIndex >= 0 && fallbackIndex < PUBLIC_FALLBACK_VIDEOS.length
        ? PUBLIC_FALLBACK_VIDEOS[fallbackIndex]
        : validSrc;

    const handleVideoError = () => {
      if (isSampleExternalVideo(validSrc) && fallbackIndex + 1 < PUBLIC_FALLBACK_VIDEOS.length) {
        setFallbackIndex((prev) => prev + 1);
        return;
      }
      setHasError(true);
      onError?.();
    };

    const handleRetry = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!validSrc || isUnresolvedLocalIdb) return;
      setFallbackIndex(-1);
      setHasError(false);
      setTimeout(() => {
        if (internalRef.current) {
          internalRef.current.load();
          internalRef.current.play().catch(() => {});
        }
      }, 60);
    };

    return (
      <div className={containerClassName}>
        {poster && (
          <img
            src={poster}
            alt={title || 'Video poster'}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none"
          />
        )}

        {activeSrc && !hasError ? (
          <video
            ref={internalRef}
            src={activeSrc}
            poster={poster}
            controls={controls}
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            playsInline={playsInline}
            preload={preload}
            onClick={onClick}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onLoadedData={(e) => {
              if (hasError) setHasError(false);
              onLoadedData?.(e);
            }}
            onError={handleVideoError}
            className={`relative z-10 ${className}`}
          />
        ) : compact ? (
          <div className="relative z-10 w-full h-full bg-slate-900/90 flex flex-col items-center justify-center text-white/80 p-2 text-center">
            <Film className="w-5 h-5 text-rose-400 mb-1" />
            <span className="text-[10px] font-semibold leading-tight">
              {language === 'bn' ? 'ভিডিও' : 'Video'}
            </span>
          </div>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full h-full min-h-[180px] bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-5 text-center text-white space-y-2.5"
          >
            <div className="w-11 h-11 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-rose-400 shadow-lg">
              {isUnresolvedLocalIdb ? <CloudOff className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-slate-100">
                {isUnresolvedLocalIdb
                  ? language === 'bn'
                    ? 'এই ভিডিওটি কেবল আগের ব্রাউজারে সেভ ছিল'
                    : 'Video stored locally on previous browser'
                  : language === 'bn'
                  ? 'ভিডিওটি লোড করা যায়নি'
                  : 'Video failed to load'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                {isUnresolvedLocalIdb
                  ? language === 'bn'
                    ? 'লাইভ ওয়েবসাইটে ভিডিও দেখতে ক্লাউডিনারি সেটিংস থেকে ভিডিও আপলোড করুন।'
                    : 'Configure Cloudinary Free CDN in Settings so videos stream across all devices.'
                  : language === 'bn'
                  ? 'নেটওয়ার্ক বা ফরম্যাট সমস্যার কারণে ভিডিও লোড হয়নি। আবার চেষ্টা করুন।'
                  : 'Network or format prevented playback. Tap retry to reload.'}
              </p>
            </div>
            {!isUnresolvedLocalIdb && validSrc && (
              <button
                type="button"
                onClick={handleRetry}
                className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'পুনরায় লোড করুন' : 'Retry Video'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);

SmartVideo.displayName = 'SmartVideo';
