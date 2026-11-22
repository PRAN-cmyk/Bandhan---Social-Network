import React, { useState, useEffect } from 'react';

interface SmartImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackType?: 'avatar' | 'media' | 'cover';
  fallbackLabel?: string;
}

const AVATAR_PALETTE = [
  '#1877F2',
  '#0284c7',
  '#059669',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#0d9488',
];

export function buildInlineAvatarFallback(label = 'Bandhan'): string {
  const clean = (label || 'B').trim();
  const initials = clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'B';
  let hash = 0;
  for (let i = 0; i < clean.length; i += 1) {
    hash = (hash * 31 + clean.charCodeAt(i)) | 0;
  }
  const bg = AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui,-apple-system,sans-serif" font-size="60" font-weight="700">${initials.replace(/[<>&'"]/g, '')}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function buildInlineMediaFallback(label = 'Media unavailable'): string {
  const safeText = (label || 'Image').replace(/[<>&'"]/g, '').slice(0, 32);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="600" height="400" fill="url(#g)"/><circle cx="300" cy="175" r="36" fill="rgba(255,255,255,0.12)"/><path d="M282 190l14-18 10 12 8-9 14 15z" fill="#94a3b8"/><circle cx="290" cy="166" r="5" fill="#94a3b8"/><text x="300" y="236" text-anchor="middle" fill="#cbd5e1" font-family="system-ui,-apple-system,sans-serif" font-size="16" font-weight="600">${safeText}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function isUsableImgSrc(url?: string | null): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('idb://')) return false;
  return true;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  fallbackType = 'media',
  fallbackLabel,
  className = '',
  referrerPolicy = 'no-referrer',
  onError,
  ...rest
}) => {
  const getFallback = () =>
    fallbackType === 'avatar'
      ? buildInlineAvatarFallback(fallbackLabel || alt || 'B')
      : buildInlineMediaFallback(fallbackLabel || alt || 'Media preview');

  const [resolvedSrc, setResolvedSrc] = useState<string>(() =>
    isUsableImgSrc(src) ? src : getFallback(),
  );
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
    setResolvedSrc(isUsableImgSrc(src) ? src : getFallback());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fallbackType, fallbackLabel, alt]);

  return (
    <img
      src={resolvedSrc}
      alt={alt || ''}
      referrerPolicy={referrerPolicy}
      loading={rest.loading || 'lazy'}
      className={className}
      onError={(e) => {
        if (!hasFailed) {
          setHasFailed(true);
          setResolvedSrc(getFallback());
        }
        if (onError) onError(e);
      }}
      {...rest}
    />
  );
};
