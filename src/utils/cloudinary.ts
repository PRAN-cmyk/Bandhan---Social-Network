/**
 * Cloudinary Media & Video Integration for Bandhan
 * - 100% Free Tier (No credit card, no Firebase billing required).
 * - Direct browser-to-Cloudinary unsigned REST upload with real-time progress.
 * - Hardware-accelerated global CDN URLs with automatic format (f_auto) and quality (q_auto).
 * - Automatic graceful fallback to high-capacity IndexedDB Native Blob storage if offline or unconfigured.
 */

import { fileToDataUrl } from './storage';
import { auth, uploadMediaToFirebaseStorage } from '../firebase';

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  isCustomConfigured: boolean;
}

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
  format?: string;
  duration?: number;
  width?: number;
  height?: number;
  bytes?: number;
  isCloudinary: boolean;
  isCloudPlayable: boolean;
  storageMode: 'cloudinary' | 'firebase' | 'inline-cloud' | 'local';
}

const STORAGE_KEY_CLOUD_NAME = 'bandhan_cloudinary_cloud_name';
const STORAGE_KEY_UPLOAD_PRESET = 'bandhan_cloudinary_upload_preset';
const LEGACY_STORAGE_KEY_API_KEY = 'bandhan_cloudinary_api_key';

// Default free-tier ready configuration
// Users can provide their own cloud name and unsigned preset in settings
const DEFAULT_CLOUD_NAME = 'dkhpt0h9z'; // Pre-configured community free-tier cloud for Bandhan
const DEFAULT_UPLOAD_PRESET = 'bandhan_unsigned'; // Pre-configured unsigned upload preset

/**
 * Retrieves the currently active Cloudinary configuration.
 * Unsigned presets never require or store an API key/secret on the client.
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  let customCloud = '';
  let customPreset = '';

  try {
    customCloud = localStorage.getItem(STORAGE_KEY_CLOUD_NAME) || '';
    customPreset = localStorage.getItem(STORAGE_KEY_UPLOAD_PRESET) || '';
    if (localStorage.getItem(LEGACY_STORAGE_KEY_API_KEY) !== null) {
      localStorage.removeItem(LEGACY_STORAGE_KEY_API_KEY);
    }
  } catch {
    // ignore localStorage restriction
  }

  const envCloud = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || '';
  const envPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || '';

  const cloudName = customCloud.trim() || envCloud.trim() || DEFAULT_CLOUD_NAME;
  const uploadPreset = customPreset.trim() || envPreset.trim() || DEFAULT_UPLOAD_PRESET;

  const isCustomConfigured = Boolean(
    (customCloud.trim() && customPreset.trim()) || (envCloud.trim() && envPreset.trim()),
  );

  return {
    cloudName,
    uploadPreset,
    isCustomConfigured,
  };
}

/**
 * Saves custom user/admin Cloudinary cloud name & unsigned upload preset.
 */
export function saveCloudinaryConfig(cloudName: string, uploadPreset: string): void {
  try {
    if (cloudName.trim()) {
      localStorage.setItem(STORAGE_KEY_CLOUD_NAME, cloudName.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_CLOUD_NAME);
    }

    if (uploadPreset.trim()) {
      localStorage.setItem(STORAGE_KEY_UPLOAD_PRESET, uploadPreset.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_UPLOAD_PRESET);
    }

    localStorage.removeItem(LEGACY_STORAGE_KEY_API_KEY);
  } catch (err) {
    console.warn('Failed to save Cloudinary configuration to storage:', err);
  }
}

/**
 * Clears custom Cloudinary credentials and restores system defaults.
 */
export function resetCloudinaryConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CLOUD_NAME);
    localStorage.removeItem(STORAGE_KEY_UPLOAD_PRESET);
    localStorage.removeItem(LEGACY_STORAGE_KEY_API_KEY);
  } catch {
    // ignore
  }
}

/**
 * Detects whether a File object is a video.
 */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp', 'ogg', 'ts'].includes(ext);
}

/**
 * Compresses an image File in-browser using HTMLCanvasElement into a compact JPEG Data URL (<= 420 KB)
 * so photos can be safely synced in Firestore and displayed on any device/account if CDN/Storage is unavailable.
 */
async function compressImageToDataUrl(file: File, maxBytes = 420_000): Promise<string | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageEl = new Image();
      imageEl.onload = () => resolve(imageEl);
      imageEl.onerror = reject;
      imageEl.src = objectUrl;
    });

    const maxDims = [1280, 960, 720, 480];
    const qualities = [0.82, 0.65, 0.48];
    for (const maxDim of maxDims) {
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const w = Math.max(1, Math.round((img.width || 640) * scale));
      const h = Math.max(1, Math.round((img.height || 480) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);

      for (const q of qualities) {
        const dataUrl = canvas.toDataURL('image/jpeg', q);
        if (dataUrl.length <= maxBytes) {
          return dataUrl;
        }
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Uploads any media (Video or Photo) to Cloudinary via unsigned HTTP POST.
 * Provides fine-grained upload progress callbacks (0% to 100%).
 * If Cloudinary fails or is offline, falls back cleanly to Firebase Storage (if signed in),
 * compressed inline image cloud payload (for images), or IndexedDB Native Blob storage.
 */
export async function uploadMediaToCloudinary(
  file: File,
  options?: {
    onProgress?: (percent: number) => void;
    folder?: string;
    resourceType?: 'auto' | 'image' | 'video';
  },
): Promise<CloudinaryUploadResult> {
  const config = getCloudinaryConfig();
  const isVideo = isVideoFile(file);
  const resourceType = options?.resourceType || (isVideo ? 'video' : 'image');

  // Attempt Cloudinary direct upload
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.uploadPreset);
    if (options?.folder) {
      formData.append('folder', options.folder);
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`;

    const response = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.timeout = resourceType === 'video' ? 120000 : 25000;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && options?.onProgress) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          options.onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (!data?.secure_url && !data?.url) {
              reject(new Error('Missing URL in Cloudinary response'));
              return;
            }
            if (options?.onProgress) options.onProgress(100);
            resolve(data);
          } catch {
            reject(new Error('Invalid JSON response from Cloudinary'));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.error?.message || `Cloudinary upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Cloudinary upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));
      xhr.ontimeout = () => reject(new Error('Cloudinary upload timed out'));

      xhr.send(formData);
    });

    const resolvedSecureUrl = response.secure_url || response.url;
    return {
      url: resolvedSecureUrl,
      secureUrl: resolvedSecureUrl,
      publicId: response.public_id,
      resourceType: response.resource_type || (isVideo ? 'video' : 'image'),
      format: response.format,
      duration: response.duration,
      width: response.width,
      height: response.height,
      bytes: response.bytes || file.size,
      isCloudinary: true,
      isCloudPlayable: true,
      storageMode: 'cloudinary',
    };
  } catch (error) {
    console.warn('Cloudinary upload failed, attempting cloud Storage fallback:', error);

    if (auth.currentUser && file.size <= 50 * 1024 * 1024) {
      try {
        const firebaseUrl = await uploadMediaToFirebaseStorage(file, options?.onProgress);
        return {
          url: firebaseUrl,
          secureUrl: firebaseUrl,
          publicId: `fb_${Date.now()}`,
          resourceType: isVideo ? 'video' : 'image',
          bytes: file.size,
          isCloudinary: false,
          isCloudPlayable: true,
          storageMode: 'firebase',
        };
      } catch (fbErr) {
        console.warn('Firebase Storage fallback failed, trying compressed/local fallback:', fbErr);
      }
    }

    if (!isVideo) {
      if (options?.onProgress) options.onProgress(70);
      const compressedDataUrl = await compressImageToDataUrl(file);
      if (compressedDataUrl) {
        if (options?.onProgress) options.onProgress(100);
        return {
          url: compressedDataUrl,
          secureUrl: compressedDataUrl,
          publicId: `inline_${Date.now()}`,
          resourceType: 'image',
          bytes: compressedDataUrl.length,
          isCloudinary: false,
          isCloudPlayable: true,
          storageMode: 'inline-cloud',
        };
      }
    }

    // Smooth fallback to IndexedDB Native Blob / Data URL storage so user's action never halts
    if (options?.onProgress) {
      options.onProgress(85);
    }
    const localUrl = await fileToDataUrl(file);
    if (options?.onProgress) {
      options.onProgress(100);
    }

    const isCloudPlayable =
      localUrl.startsWith('http://') ||
      localUrl.startsWith('https://') ||
      (localUrl.startsWith('data:') && localUrl.length < 700_000);

    return {
      url: localUrl,
      secureUrl: localUrl,
      publicId: `local_${Date.now()}`,
      resourceType: isVideo ? 'video' : 'image',
      bytes: file.size,
      isCloudinary: false,
      isCloudPlayable,
      storageMode: isCloudPlayable ? 'inline-cloud' : 'local',
    };
  }
}

/**
 * Generates an optimized Cloudinary delivery URL with automatic format and quality.
 */
export function getOptimizedCloudinaryUrl(
  url: string,
  options?: { width?: number; height?: number; crop?: string; quality?: string },
): string {
  if (!url || !url.includes('cloudinary.com') || url.includes('/upload/f_auto')) return url;

  const transformations: string[] = ['f_auto', 'q_auto'];
  if (options?.width) transformations.push(`w_${options.width}`);
  if (options?.height) transformations.push(`h_${options.height}`);
  if (options?.crop) transformations.push(`c_${options.crop}`);

  const transformStr = transformations.join(',');

  // Insert transformations after /upload/
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transformStr}/`);
  }

  return url;
}
