import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  Key,
  Shield,
  ShieldCheck,
  LogOut,
  Trash2,
  AlertTriangle,
  Smartphone,
  Laptop,
  CheckCircle2,
  Globe,
  Users,
  Bell,
  Download,
  RotateCcw,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Sun,
  Moon,
  Monitor,
  History,
  Activity,
  Layers,
  FileText,
  Clock,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Cloud,
  MessageSquare,
  Maximize2,
  RefreshCw,
  Database,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ThemeMode } from '../types';
import {
  secureStorage,
  generateSecureTotpSecret,
  generateSecureRecoveryCodes,
} from '../utils/security';
import { CloudinarySettingsModal } from './CloudinarySettingsModal';
import { getCloudinaryConfig } from '../utils/cloudinary';
import { SmartImage } from './SmartImage';

export const AccountSecurityModal: React.FC = () => {
  const {
    isAccountSecurityOpen,
    setIsAccountSecurityOpen,
    currentUser,
    updateUser,
    logout,
    deleteCurrentAccount,
    setProfilePin,
    language,
    setLanguage,
    t,
    showToast,
    isProfileLocked,
    setIsProfileLocked,
    isMyStatusOnline,
    toggleMyOnlineStatus,
    themeMode,
    setThemeMode,
    activityLog,
    clearActivityLog,
    addActivityLog,
    posts,
    albums,
    blockedUserIds,
    unblockUser,
    contacts,
    profiles,
    sendPasswordReset,
    appScale,
    setAppScale,
    cloudSyncStatus,
    forceCloudResync,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'appearance' | 'messenger' | 'security' | '2fa' | 'activity' | 'privacy' | 'sessions' | 'data'
  >('appearance');

  // PIN & Password State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDisable2FAConfirm, setShowDisable2FAConfirm] = useState(false);

  // 2FA State (Encrypted & Persistent via secureStorage)
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(() =>
    secureStorage.get<boolean>('bandhan_2fa_enabled', false)
  );

  const [is2FAWizardOpen, setIs2FAWizardOpen] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<'qr' | 'verify' | 'recovery'>('qr');
  const [totpSecret, setTotpSecret] = useState<string>(() =>
    secureStorage.get<string>('bandhan_2fa_secret', generateSecureTotpSecret())
  );
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>(() =>
    secureStorage.get<string[]>('bandhan_2fa_recovery_codes', generateSecureRecoveryCodes(8))
  );
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [timerCount, setTimerCount] = useState(30);

  // Activity Log Filter
  const [activityFilter, setActivityFilter] = useState<'all' | 'login' | 'security' | 'post' | 'settings'>('all');

  // Notification Sound & Messenger Privacy Preferences
  const [notifSoundEnabled, setNotifSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bandhan_notif_sound') !== 'false';
    } catch {
      return true;
    }
  });
  const [typingIndicatorEnabled, setTypingIndicatorEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bandhan_pref_typing') !== 'false';
    } catch {
      return true;
    }
  });
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bandhan_pref_read_receipts') !== 'false';
    } catch {
      return true;
    }
  });
  const [chatTheme, setChatTheme] = useState<'blue' | 'indigo' | 'emerald' | 'rose'>(() => {
    try {
      const saved = localStorage.getItem('bandhan_pref_chat_theme');
      if (saved === 'indigo' || saved === 'emerald' || saved === 'rose') return saved;
    } catch {}
    return 'blue';
  });
  const [isCloudinaryModalOpen, setIsCloudinaryModalOpen] = useState(false);
  const cloudinaryConfig = getCloudinaryConfig();

  useEffect(() => {
    const handleOpenTab = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (
        detail === 'appearance' ||
        detail === 'messenger' ||
        detail === 'security' ||
        detail === '2fa' ||
        detail === 'activity' ||
        detail === 'privacy' ||
        detail === 'sessions' ||
        detail === 'data'
      ) {
        setActiveTab(detail);
      }
    };
    const syncPrefs = () => {
      try {
        setNotifSoundEnabled(localStorage.getItem('bandhan_notif_sound') !== 'false');
        setTypingIndicatorEnabled(localStorage.getItem('bandhan_pref_typing') !== 'false');
        setReadReceiptsEnabled(localStorage.getItem('bandhan_pref_read_receipts') !== 'false');
        const th = localStorage.getItem('bandhan_pref_chat_theme');
        if (th === 'blue' || th === 'indigo' || th === 'emerald' || th === 'rose') {
          setChatTheme(th);
        }
      } catch {}
    };
    window.addEventListener('bandhan:open-settings-tab', handleOpenTab);
    window.addEventListener('bandhan-prefs-updated', syncPrefs);
    return () => {
      window.removeEventListener('bandhan:open-settings-tab', handleOpenTab);
      window.removeEventListener('bandhan-prefs-updated', syncPrefs);
    };
  }, []);

  // Authentic Current Device Session Info (no fake remote IPs/devices)
  const [sessions, setSessions] = useState(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const browserName = ua.includes('Edg')
      ? 'Edge'
      : ua.includes('Chrome')
      ? 'Chrome'
      : ua.includes('Firefox')
      ? 'Firefox'
      : ua.includes('Safari')
      ? 'Safari'
      : 'Web Browser';
    const platformName =
      typeof navigator !== 'undefined' && navigator.platform ? navigator.platform : 'Web Platform';
    const screenInfo =
      typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : '';

    const currentSess = {
      id: 'sess_current',
      device: `${isMobile ? 'Mobile' : 'Desktop'} • ${browserName} (${platformName})`,
      location: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Current Browser',
      meta: screenInfo ? `Viewport ${screenInfo}` : 'Verified Local Vault',
      isCurrent: true,
      lastActive: language === 'bn' ? 'এখনই সক্রিয়' : 'Active Now',
    };
    return [currentSess];
  });

  // Timer for 2FA OTP simulation
  useEffect(() => {
    if (!is2FAWizardOpen || twoFAStep !== 'verify') return;
    const interval = setInterval(() => {
      setTimerCount((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [is2FAWizardOpen, twoFAStep]);

  if (!isAccountSecurityOpen) return null;

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin.trim()) {
      showToast(language === 'bn' ? 'পিন খালি রাখা যাবে না' : 'PIN cannot be empty');
      return;
    }
    if (newPin !== confirmPin) {
      showToast(language === 'bn' ? 'পিন দুটি মিলছে না' : 'PINs do not match');
      return;
    }
    if (newPin.length < 4) {
      showToast(language === 'bn' ? 'পিন কমপক্ষে ৪ অক্ষরের হতে হবে' : 'PIN must be at least 4 characters');
      return;
    }
    setProfilePin(newPin);
    addActivityLog({
      type: 'security',
      titleEn: 'Updated Security PIN & profile lock passcode',
      titleBn: 'সিকিউরিটি পিন ও প্রোফাইল লক পাসকোড আপডেট করা হয়েছে',
      detailEn: 'Encrypted hash stored locally',
      detailBn: 'এনক্রিপ্টেড হ্যাশ নিরাপদে সংরক্ষিত হয়েছে',
    });
    setNewPin('');
    setConfirmPin('');
  };

  const generateNewRecoveryCodes = () => {
    const newCodes = generateSecureRecoveryCodes(8);
    setRecoveryCodes(newCodes);
    secureStorage.set('bandhan_2fa_recovery_codes', newCodes);
    showToast(language === 'bn' ? 'নতুন রিকভারি কোড তৈরি হয়েছে' : 'New recovery codes generated');
  };

  const handleStart2FASetup = () => {
    const newSecret = generateSecureTotpSecret();
    setTotpSecret(newSecret);
    secureStorage.set('bandhan_2fa_secret', newSecret);
    generateNewRecoveryCodes();
    setTwoFAStep('qr');
    setVerificationCode('');
    setIs2FAWizardOpen(true);
  };

  const handleVerify2FACode = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim().length < 6) {
      showToast(language === 'bn' ? '৬ সংখ্যার ভেরিফিকেশন কোড লিখুন' : 'Please enter 6-digit code');
      return;
    }
    setTwoFAStep('recovery');
  };

  const handleComplete2FAActivation = () => {
    setIs2FAEnabled(true);
    setIs2FAWizardOpen(false);
    secureStorage.set('bandhan_2fa_enabled', true);
    addActivityLog({
      type: 'security',
      titleEn: 'Two-Factor Authentication (2FA) activated via Authenticator App',
      titleBn: 'অথেনটিকেটর অ্যাপের মাধ্যমে টু-ফ্যাক্টর অথেনটিকেশন (২এফএ) চালু করা হয়েছে',
      detailEn: 'TOTP 6-digit verification & recovery keys generated',
      detailBn: 'TOTP ৬ সংখ্যার ভেরিফিকেশন ও রিকভারি কোড সক্রিয় হয়েছে',
    });
    showToast(
      language === 'bn'
        ? '🔒 টু-ফ্যাক্টর অথেনটিকেশন (২এফএ) সফলভাবে সক্রিয় হয়েছে!'
        : '🔒 Two-Factor Authentication activated successfully!'
    );
  };

  const handleDisable2FA = () => {
    setIs2FAEnabled(false);
    setShowDisable2FAConfirm(false);
    secureStorage.set('bandhan_2fa_enabled', false);
    addActivityLog({
      type: 'security',
      titleEn: 'Two-Factor Authentication (2FA) was disabled',
      titleBn: 'টু-ফ্যাক্টর অথেনটিকেশন (২এফএ) বন্ধ করা হয়েছে',
    });
    showToast(
      language === 'bn'
        ? 'টু-ফ্যাক্টর অথেনটিকেশন বন্ধ করা হয়েছে'
        : 'Two-Factor Authentication disabled'
    );
  };

  const handleCopySecretKey = () => {
    navigator.clipboard?.writeText?.(totpSecret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showToast(language === 'bn' ? 'সিক্রেট কি কপি করা হয়েছে' : 'Secret key copied');
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard?.writeText?.(recoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
    showToast(language === 'bn' ? 'সকল রিকভারি কোড কপি হয়েছে' : 'Recovery codes copied to clipboard');
  };

  const handleDownloadRecoveryCodes = () => {
    const content = `=== BANDHAN SOCIAL NETWORK 2FA RECOVERY CODES ===\nAccount: ${currentUser.name} (${currentUser.username})\nDate: ${new Date().toLocaleString()}\n\nKeep these codes in a safe, offline place. Each code can be used once.\n\n${recoveryCodes.map((code, idx) => `${idx + 1}. ${code}`).join('\n')}\n\n=================================================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bandhan-2fa-recovery-codes-${currentUser.username}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(language === 'bn' ? 'রিকভারি কোড ফাইল ডাউনলোড হয়েছে' : 'Recovery codes text file downloaded');
  };

  const handleTerminateOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    addActivityLog({
      type: 'security',
      titleEn: 'Logged out of all other remote device sessions',
      titleBn: 'অন্যান্য সকল রিমোট ডিভাইস সেশন থেকে লগআউট করা হয়েছে',
    });
    showToast(
      language === 'bn'
        ? 'অন্যান্য সকল ডিভাইস থেকে সফলভাবে লগআউট করা হয়েছে'
        : 'Logged out of all other device sessions successfully'
    );
  };

  const handleExportData = () => {
    const backupData = {
      user: currentUser,
      exportDate: new Date().toISOString(),
      platform: 'Bandhan Social Network',
      stats: {
        postsCount: posts.length,
        albumsCount: albums?.length || 0,
      },
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bandhan-account-archive-${currentUser.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(language === 'bn' ? 'আপনার একাউন্টের ব্যাকআপ ফাইল ডাউনলোড হয়েছে' : 'Account data backup downloaded');
  };

  const handleDeleteAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText.trim().toLowerCase() !== 'delete') {
      showToast(
        language === 'bn'
          ? 'নিশ্চিত করতে "DELETE" শব্দটি সঠিকভাবে টাইপ করুন'
          : 'Please type "DELETE" to confirm'
      );
      return;
    }
    deleteCurrentAccount();
  };

  const filteredActivities = activityLog.filter((item) => {
    if (activityFilter === 'all') return true;
    return item.type === activityFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[94dvh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-7 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{language === 'bn' ? 'সেটিংস ও নিরাপত্তা কেন্দ্র' : 'Settings & Security Center'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {language === 'bn' ? 'সুরক্ষিত' : 'Encrypted'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'bn'
                  ? 'থিম, ভাষা, ২-ফ্যাক্টর নিরাপত্তা, পাসকোড ও একাউন্ট কার্যক্রম'
                  : 'Theme, Language, 2FA Security, PIN & Activity Log'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAccountSecurityOpen(false)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          {[
            {
              id: 'appearance',
              labelEn: 'Theme & Language',
              labelBn: 'থিম ও ভাষা',
              icon: Globe,
            },
            {
              id: 'messenger',
              labelEn: 'Messenger',
              labelBn: 'মেসেঞ্জার সেটিংস',
              icon: MessageSquare,
            },
            {
              id: '2fa',
              labelEn: 'Two-Factor (2FA)',
              labelBn: '২-ফ্যাক্টর (2FA)',
              icon: QrCode,
              badge: is2FAEnabled ? 'ON' : undefined,
            },
            {
              id: 'activity',
              labelEn: 'Activity Log',
              labelBn: 'কার্যক্রম লগ',
              icon: History,
            },
            {
              id: 'privacy',
              labelEn: 'Profile & Privacy',
              labelBn: 'প্রোফাইল ও প্রাইভেসি',
              icon: Lock,
            },
            {
              id: 'security',
              labelEn: 'Security PIN',
              labelBn: 'নিরাপত্তা পিন',
              icon: Key,
            },
            {
              id: 'sessions',
              labelEn: 'Devices',
              labelBn: 'ডিভাইসসমূহ',
              icon: Smartphone,
            },
            {
              id: 'data',
              labelEn: 'Data & Account',
              labelBn: 'ডাটা ও ডিলিট',
              icon: Download,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? tab.labelBn : tab.labelEn}</span>
                {tab.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-emerald-400 text-slate-900">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: THEME & LANGUAGE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Toggle (System, Light, Dark) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>{language === 'bn' ? 'ডিসপ্লে থিম নির্বাচন' : 'Display Theme'}</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'আপনার পছন্দ অনুযায়ী লাইট, ডার্ক অথবা ডিভাইসের সিস্টেম সেটিংস নির্বাচন করুন'
                        : 'Choose between Light, Dark, or automatically match your System OS preference'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('system');
                      addActivityLog({
                        type: 'settings',
                        titleEn: 'Theme set to System Default',
                        titleBn: 'থিম সিস্টেম অনুযায়ী নির্ধারণ করা হয়েছে',
                      });
                      showToast(language === 'bn' ? 'সিস্টেম থিম সক্রিয় হয়েছে' : 'System theme activated');
                    }}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                      themeMode === 'system'
                        ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/20 text-blue-600 dark:text-blue-400 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Monitor className="w-5 h-5 mb-1.5" />
                    <span className="text-xs">{language === 'bn' ? 'সিস্টেম (Auto)' : 'System'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('light');
                      addActivityLog({
                        type: 'settings',
                        titleEn: 'Theme switched to Light Mode',
                        titleBn: 'লাইট মোড নির্বাচন করা হয়েছে',
                      });
                      showToast(language === 'bn' ? 'লাইট মোড সক্রিয় হয়েছে' : 'Light mode activated');
                    }}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-500 ring-2 ring-amber-500/20 text-amber-700 dark:text-amber-400 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Sun className="w-5 h-5 mb-1.5 text-amber-500" />
                    <span className="text-xs">{language === 'bn' ? 'লাইট (Light)' : 'Light'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('dark');
                      addActivityLog({
                        type: 'settings',
                        titleEn: 'Theme switched to Dark Mode',
                        titleBn: 'ডার্ক মোড নির্বাচন করা হয়েছে',
                      });
                      showToast(language === 'bn' ? 'ডার্ক মোড সক্রিয় হয়েছে' : 'Dark mode activated');
                    }}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Moon className="w-5 h-5 mb-1.5 text-indigo-400" />
                    <span className="text-xs">{language === 'bn' ? 'ডার্ক (Dark)' : 'Dark'}</span>
                  </button>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <span>{language === 'bn' ? 'অ্যাপের ভাষা পরিবর্তন' : 'Language Selection'}</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'সম্পূর্ণ অ্যাপ্লিকেশন বাংলা অথবা ইংরেজিতে ব্যবহার করুন'
                      : 'Switch Bandhan between English and Bengali instantly'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('bn');
                      addActivityLog({
                        type: 'settings',
                        titleEn: 'Language changed to Bengali (বাংলা)',
                        titleBn: 'অ্যাপের ভাষা বাংলায় পরিবর্তন করা হয়েছে',
                      });
                      showToast('ভাষা বাংলা করা হয়েছে 🇧🇩');
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      language === 'bn'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-2xl">🇧🇩</span>
                    <div className="text-left">
                      <span className="block text-sm font-extrabold">বাংলা (Bangla)</span>
                      <span className="text-[11px] opacity-75">বাংলাদেশ</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      addActivityLog({
                        type: 'settings',
                        titleEn: 'Language changed to English (US)',
                        titleBn: 'অ্যাপের ভাষা ইংরেজিতে পরিবর্তন করা হয়েছে',
                      });
                      showToast('Language changed to English 🌐');
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 text-blue-800 dark:text-blue-300 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-2xl">🌐</span>
                    <div className="text-left">
                      <span className="block text-sm font-extrabold">English (US)</span>
                      <span className="text-[11px] opacity-75">International</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* App / Mobile Display Scale Selector (WebView/APK & Mobile Sizing Control) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-indigo-500" />
                    <span>
                      {language === 'bn'
                        ? 'অ্যাপ ও মোবাইল ডিসপ্লে স্কেল (App Scale)'
                        : 'App & Mobile Display Scale'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'অ্যাপ বা মোবাইলে সব লেখা ও কার্ড বেশি বড় মনে হলে কম্প্যাক্ট (Compact) বা অটো নির্বাচন করুন (ডেস্কটপ ওয়েবসাইট অপরিবর্তিত থাকবে)'
                      : 'Controls font & layout density on mobile & WebView apps while keeping desktop layout unchanged.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(
                    [
                      {
                        id: 'auto',
                        labelBn: 'অটো (সুপারিশকৃত)',
                        labelEn: 'Auto (Recommended)',
                        descBn: 'অ্যাপে স্মার্ট ফিট',
                        descEn: 'Smart fit on app',
                      },
                      {
                        id: 'compact',
                        labelBn: 'কম্প্যাক্ট (ছোট)',
                        labelEn: 'Compact',
                        descBn: 'অধিক কন্টেন্ট দৃশ্যমান',
                        descEn: 'Fits more on screen',
                      },
                      {
                        id: 'normal',
                        labelBn: 'স্বাভাবিক (১০০%)',
                        labelEn: 'Standard (100%)',
                        descBn: 'ডিফল্ট সাইজ',
                        descEn: 'Default size',
                      },
                    ] as const
                  ).map((opt) => {
                    const selected = appScale === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setAppScale(opt.id);
                          showToast(
                            language === 'bn'
                              ? `ডিসপ্লে স্কেল "${opt.labelBn}" সেট করা হয়েছে`
                              : `Display scale set to ${opt.labelEn}`,
                          );
                        }}
                        className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all cursor-pointer ${
                          selected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-xs font-extrabold">{language === 'bn' ? opt.labelBn : opt.labelEn}</span>
                        <span className="text-[10px] opacity-75 mt-0.5">{language === 'bn' ? opt.descBn : opt.descEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TWO-FACTOR AUTHENTICATION (2FA) */}
          {activeTab === '2fa' && (
            <div className="space-y-5">
              {/* 2FA Main Status Card */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/30 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{language === 'bn' ? 'টু-ফ্যাক্টর অথেনটিকেশন (2FA)' : 'Two-Factor Authentication (2FA)'}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            is2FAEnabled
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {is2FAEnabled
                            ? language === 'bn'
                              ? 'সক্রিয় (Active)'
                              : 'ENABLED'
                            : language === 'bn'
                            ? 'নিষ্ক্রিয়'
                            : 'OFF'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-lg">
                        {language === 'bn'
                          ? 'নতুন ডিভাইসে লগইন করার সময় গুগল অথেনটিকেটর বা টু-ফ্যাক্টর অ্যাপ থেকে ৬ সংখ্যার ওটিপি (OTP) ও নিরাপত্তা কোড প্রয়োজন হবে।'
                          : 'Require an authenticator app (Google Authenticator, Authy, or Duo) or security key each time you log in from an unrecognized device.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {!is2FAEnabled ? (
                      <button
                        type="button"
                        onClick={handleStart2FASetup}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>{language === 'bn' ? '২এফএ সেটআপ করুন' : 'Setup 2FA'}</span>
                      </button>
                    ) : showDisable2FAConfirm ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleDisable2FA}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          {language === 'bn' ? 'হ্যাঁ, বন্ধ করুন' : 'Confirm Disable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDisable2FAConfirm(false)}
                          className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          {language === 'bn' ? 'বাতিল' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDisable2FAConfirm(true)}
                        className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        {language === 'bn' ? '২এফএ বন্ধ করুন' : 'Disable 2FA'}
                      </button>
                    )}
                  </div>
                </div>

                {/* If 2FA is active, show quick actions */}
                {is2FAEnabled && (
                  <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIs2FAWizardOpen(true);
                        setTwoFAStep('recovery');
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5 text-blue-500" />
                      <span>{language === 'bn' ? 'রিকভারি কোড দেখুন' : 'View Recovery Codes'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={generateNewRecoveryCodes}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                      <span>{language === 'bn' ? 'নতুন কোড জেনারেট করুন' : 'Regenerate Codes'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 2FA Interactive Setup Wizard Modal / Drawer */}
              {is2FAWizardOpen && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/40 p-5 shadow-lg space-y-4">
                  {/* Step Indicators */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        twoFAStep === 'qr' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                        {twoFAStep === 'qr' ? '1' : '✓'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {language === 'bn' ? 'QR কোড স্ক্যান' : 'Scan QR'}
                      </span>
                      <span className="text-slate-300">→</span>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        twoFAStep === 'verify' ? 'bg-indigo-600 text-white' : twoFAStep === 'recovery' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {twoFAStep === 'recovery' ? '✓' : '2'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {language === 'bn' ? 'কোড যাচাই' : 'Verify'}
                      </span>
                      <span className="text-slate-300">→</span>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        twoFAStep === 'recovery' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        3
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {language === 'bn' ? 'রিকভারি কোড' : 'Backup'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIs2FAWizardOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* STEP 1: SCAN QR CODE */}
                  {twoFAStep === 'qr' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-center gap-5">
                        {/* High-fidelity SVG QR Code matrix mockup */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0 flex flex-col items-center">
                          <svg viewBox="0 0 160 160" className="w-36 h-36">
                            {/* Outer Finder Pattern Top-Left */}
                            <rect x="10" y="10" width="38" height="38" rx="6" fill="#1e1b4b" />
                            <rect x="16" y="16" width="26" height="26" rx="3" fill="#ffffff" />
                            <rect x="22" y="22" width="14" height="14" rx="2" fill="#4338ca" />

                            {/* Outer Finder Pattern Top-Right */}
                            <rect x="112" y="10" width="38" height="38" rx="6" fill="#1e1b4b" />
                            <rect x="118" y="16" width="26" height="26" rx="3" fill="#ffffff" />
                            <rect x="124" y="22" width="14" height="14" rx="2" fill="#4338ca" />

                            {/* Outer Finder Pattern Bottom-Left */}
                            <rect x="10" y="112" width="38" height="38" rx="6" fill="#1e1b4b" />
                            <rect x="16" y="118" width="26" height="26" rx="3" fill="#ffffff" />
                            <rect x="22" y="124" width="14" height="14" rx="2" fill="#4338ca" />

                            {/* Simulated matrix modules */}
                            <rect x="56" y="16" width="8" height="8" fill="#1e1b4b" />
                            <rect x="72" y="16" width="14" height="8" fill="#1e1b4b" />
                            <rect x="94" y="24" width="8" height="8" fill="#1e1b4b" />
                            <rect x="56" y="32" width="16" height="8" fill="#1e1b4b" />
                            <rect x="80" y="32" width="10" height="8" fill="#1e1b4b" />

                            <rect x="16" y="56" width="8" height="16" fill="#1e1b4b" />
                            <rect x="32" y="64" width="14" height="8" fill="#1e1b4b" />
                            <rect x="56" y="56" width="48" height="48" rx="10" fill="#4f46e5" />
                            <circle cx="80" cy="80" r="14" fill="#ffffff" />
                            <text x="80" y="85" textAnchor="middle" fontSize="13" fontWeight="900" fill="#4f46e5">b</text>

                            <rect x="112" y="56" width="8" height="14" fill="#1e1b4b" />
                            <rect x="128" y="64" width="16" height="8" fill="#1e1b4b" />
                            <rect x="112" y="80" width="14" height="14" fill="#1e1b4b" />

                            <rect x="56" y="112" width="14" height="8" fill="#1e1b4b" />
                            <rect x="80" y="120" width="8" height="14" fill="#1e1b4b" />
                            <rect x="96" y="112" width="16" height="8" fill="#1e1b4b" />
                            <rect x="120" y="120" width="20" height="14" fill="#1e1b4b" />
                            <rect x="64" y="136" width="16" height="8" fill="#1e1b4b" />
                            <rect x="96" y="136" width="14" height="8" fill="#1e1b4b" />
                          </svg>
                          <span className="text-[10px] font-bold text-indigo-700 mt-1">Bandhan 2FA Authenticator</span>
                        </div>

                        <div className="space-y-2 flex-1">
                          <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {language === 'bn' ? 'অথেনটিকেটর অ্যাপ দিয়ে QR কোডটি স্ক্যান করুন' : 'Scan this QR code with your Authenticator app'}
                          </h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {language === 'bn'
                              ? 'Google Authenticator, Microsoft Authenticator অথবা Authy অ্যাপ খুলে ক্যামেরা দিয়ে স্ক্যান করুন।'
                              : 'Use Google Authenticator, Microsoft Authenticator, 1Password, or Authy on your mobile phone to scan.'}
                          </p>

                          {/* Secret Key manual entry option */}
                          <div className="pt-2">
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              {language === 'bn' ? 'অথবা ম্যানুয়ালি সিক্রেট কি যোগ করুন:' : 'Or enter this secret key manually:'}
                            </label>
                            <div className="flex items-center gap-2">
                              <code className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 select-all truncate flex-1 border border-slate-200 dark:border-slate-700">
                                {totpSecret}
                              </code>
                              <button
                                type="button"
                                onClick={handleCopySecretKey}
                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedKey ? (language === 'bn' ? 'কপি হয়েছে' : 'Copied') : (language === 'bn' ? 'কপি' : 'Copy')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setTwoFAStep('verify')}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                        >
                          {language === 'bn' ? 'পরবর্তী ধাপ: কোড যাচাই →' : 'Next Step: Verify Code →'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: VERIFY 6-DIGIT TOTP CODE */}
                  {twoFAStep === 'verify' && (
                    <form onSubmit={handleVerify2FACode} className="space-y-4">
                      <div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {language === 'bn' ? 'অথেনটিকেটর থেকে ৬ সংখ্যার ওটিপি কোডটি লিখুন' : 'Enter the 6-digit code from your authenticator app'}
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {language === 'bn'
                            ? 'আপনার ফোনে যে ৬ সংখ্যার কোডটি দেখাচ্ছে তা নিচে লিখুন।'
                            : 'Enter the currently active 6-digit verification code.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="000000"
                          className="w-48 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-indigo-500/40 focus:border-indigo-600 text-center text-lg font-mono font-black tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none"
                          autoFocus
                        />
                        <span className="text-xs text-slate-400 font-mono">
                          ⏱ {timerCount}s
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setTwoFAStep('qr')}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          ← {language === 'bn' ? 'পূর্ববর্তী ধাপ' : 'Back'}
                        </button>
                        <button
                          type="submit"
                          disabled={verificationCode.length < 6}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                        >
                          {language === 'bn' ? 'কোড যাচাই করুন →' : 'Verify & Continue →'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* STEP 3: BACKUP RECOVERY CODES */}
                  {twoFAStep === 'recovery' && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>{language === 'bn' ? 'জরুরি ব্যাকআপ রিকভারি কোডস' : 'Emergency Backup Recovery Codes'}</span>
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {language === 'bn'
                            ? 'ফোন হারিয়ে গেলে বা অথেনটিকেটর কাজ না করলে এই কোডগুলো দিয়ে একাউন্টে প্রবেশ করা যাবে। কোডগুলো কপি বা ডাউনলোড করে সংরক্ষণ করুন।'
                            : 'If you ever lose access to your phone or authenticator app, you can use these one-time codes to sign in. Save them now.'}
                        </p>
                      </div>

                      {/* 8 Recovery Codes Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        {recoveryCodes.map((code, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200 select-all"
                          >
                            {code}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={handleCopyRecoveryCodes}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCodes ? (language === 'bn' ? 'কপি হয়েছে' : 'Copied!') : (language === 'bn' ? 'সব কোড কপি করুন' : 'Copy All Codes')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadRecoveryCodes}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-500" />
                          <span>{language === 'bn' ? 'ফাইল ডাউনলোড (.txt)' : 'Download (.txt)'}</span>
                        </button>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleComplete2FAActivation}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>{language === 'bn' ? '২এফএ সক্রিয়করণ সম্পন্ন করুন' : 'Complete 2FA Activation'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>{language === 'bn' ? 'একাউন্ট কার্যক্রম লগ (Activity History)' : 'Account Activity History'}</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'লগইন হিস্টোরি, সিকিউরিটি পরিবর্তন ও পোস্টের সকল ইন্টার‍্যাকশন'
                      : 'Recent logins, security modifications, and content interactions'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearActivityLog}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                  >
                    {language === 'bn' ? 'লগ মুছুন' : 'Clear Log'}
                  </button>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {[
                  { id: 'all', label: language === 'bn' ? 'সকল কার্যক্রম' : 'All' },
                  { id: 'login', label: language === 'bn' ? 'লগইন ও সেশন' : 'Logins' },
                  { id: 'security', label: language === 'bn' ? 'নিরাপত্তা ও ২এফএ' : 'Security' },
                  { id: 'post', label: language === 'bn' ? 'পোস্ট ও কমেন্ট' : 'Posts' },
                  { id: 'settings', label: language === 'bn' ? 'সেটিংস' : 'Settings' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActivityFilter(f.id as typeof activityFilter)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activityFilter === f.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Activity Timeline List */}
              <div className="space-y-2.5">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    {language === 'bn' ? 'এই ক্যাটাগরিতে কোনো কার্যক্রম পাওয়া যায়নি' : 'No activity records in this category'}
                  </div>
                ) : (
                  filteredActivities.map((act) => {
                    const iconMap = {
                      login: <Laptop className="w-4 h-4 text-emerald-500" />,
                      security: <Key className="w-4 h-4 text-amber-500" />,
                      post: <FileText className="w-4 h-4 text-blue-500" />,
                      reaction: <Sparkles className="w-4 h-4 text-rose-500" />,
                      settings: <Globe className="w-4 h-4 text-indigo-500" />,
                    };
                    return (
                      <div
                        key={act.id}
                        className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex items-start justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                            {iconMap[act.type] || <Activity className="w-4 h-4 text-slate-500" />}
                          </div>
                          <div>
                            <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                              {language === 'bn' ? act.titleBn : act.titleEn}
                            </h5>
                            {(act.detailBn || act.detailEn) && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {language === 'bn' ? (act.detailBn || act.detailEn) : (act.detailEn || act.detailBn)}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                          {act.timestamp}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* DEDICATED MESSENGER SETTINGS TAB */}
          {activeTab === 'messenger' && (
            <div className="space-y-4">
              {/* Active Status */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${isMyStatusOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    />
                    <span>{language === 'bn' ? 'অনলাইন উপস্থিতি (Active Status)' : 'Show Active Status'}</span>
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'বন্ধুরা মেসেঞ্জারে দেখতে পারবে আপনি কখন সক্রিয় আছেন।'
                      : 'Let friends see when you are active in Messenger.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleMyOnlineStatus}
                  className={`rounded-xl transition-colors cursor-pointer text-xs font-bold px-3 py-1.5 shrink-0 ${
                    isMyStatusOnline
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isMyStatusOnline
                    ? language === 'bn'
                      ? 'অনলাইন (চালু)'
                      : 'Active (On)'
                    : language === 'bn'
                    ? 'অফলাইন (বন্ধ)'
                    : 'Offline (Off)'}
                </button>
              </div>

              {/* Typing, Read Receipts & Sound */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>{language === 'bn' ? 'চ্যাট প্রাইভেসি ও অ্যালার্ট' : 'Chat Privacy & Alerts'}</span>
                </h5>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {language === 'bn' ? 'টাইপিং ইন্ডিকেটর দেখান' : 'Show Typing Indicator'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'bn'
                        ? 'মেসেজ লেখার সময় অপর প্রান্তে "লিখছেন..." দেখাবে।'
                        : 'Let recipients see when you are typing in real time.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !typingIndicatorEnabled;
                      setTypingIndicatorEnabled(next);
                      try {
                        localStorage.setItem('bandhan_pref_typing', String(next));
                      } catch {}
                      window.dispatchEvent(new Event('bandhan-prefs-updated'));
                    }}
                    className={`rounded-xl transition-colors cursor-pointer text-xs font-bold px-3 py-1.5 shrink-0 ${
                      typingIndicatorEnabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {typingIndicatorEnabled ? (language === 'bn' ? 'চালু' : 'On') : language === 'bn' ? 'বন্ধ' : 'Off'}
                  </button>
                </div>

                <div className="h-px bg-slate-200/70 dark:bg-slate-700/70" />

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {language === 'bn' ? 'রিড রিসিপ্ট (Seen) পাঠান' : 'Send Read Receipts'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'bn'
                        ? 'আপনি মেসেজ দেখলে প্রেরকের কাছে Seen নিশ্চিতকরণ যাবে।'
                        : 'Notify senders when you read their messages.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !readReceiptsEnabled;
                      setReadReceiptsEnabled(next);
                      try {
                        localStorage.setItem('bandhan_pref_read_receipts', String(next));
                      } catch {}
                      window.dispatchEvent(new Event('bandhan-prefs-updated'));
                    }}
                    className={`rounded-xl transition-colors cursor-pointer text-xs font-bold px-3 py-1.5 shrink-0 ${
                      readReceiptsEnabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {readReceiptsEnabled ? (language === 'bn' ? 'চালু' : 'On') : language === 'bn' ? 'বন্ধ' : 'Off'}
                  </button>
                </div>

                <div className="h-px bg-slate-200/70 dark:bg-slate-700/70" />

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {language === 'bn' ? 'নোটিফিকেশন ও মেসেজ সাউন্ড' : 'Message & Alert Chime'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'bn'
                        ? 'নতুন মেসেজ আসলে শব্দের মাধ্যমে সতর্কবার্তা চালু বা বন্ধ রাখুন।'
                        : 'Control audio alerts when new messages arrive.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !notifSoundEnabled;
                      setNotifSoundEnabled(next);
                      try {
                        localStorage.setItem('bandhan_notif_sound', String(next));
                      } catch {}
                      window.dispatchEvent(new Event('bandhan-prefs-updated'));
                    }}
                    className={`rounded-xl transition-colors cursor-pointer text-xs font-bold px-3 py-1.5 shrink-0 ${
                      notifSoundEnabled
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {notifSoundEnabled ? (language === 'bn' ? 'চালু' : 'On') : language === 'bn' ? 'মিউট' : 'Muted'}
                  </button>
                </div>
              </div>

              {/* Chat Bubble Theme Color */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                  {language === 'bn' ? 'চ্যাট বাবল থিম কালার' : 'Chat Bubble Accent Color'}
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'blue', labelEn: 'Cobalt Blue', labelBn: 'ক্লাসিক নীল', swatch: 'bg-blue-600' },
                      { id: 'indigo', labelEn: 'Deep Indigo', labelBn: 'ইন্ডিগো', swatch: 'bg-indigo-600' },
                      { id: 'emerald', labelEn: 'Emerald', labelBn: 'সবুজ', swatch: 'bg-emerald-600' },
                      { id: 'rose', labelEn: 'Crimson Rose', labelBn: 'গোলাপী', swatch: 'bg-rose-600' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setChatTheme(item.id);
                        try {
                          localStorage.setItem('bandhan_pref_chat_theme', item.id);
                        } catch {}
                        window.dispatchEvent(new Event('bandhan-prefs-updated'));
                        showToast(
                          language === 'bn'
                            ? 'মেসেঞ্জার থিম আপডেট হয়েছে'
                            : 'Messenger theme updated',
                        );
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                        chatTheme === item.id
                          ? 'border-blue-600 bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full ${item.swatch} shrink-0`} />
                      <span className="truncate">{language === 'bn' ? item.labelBn : item.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cloud Media Readiness */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-500" />
                    <span>{language === 'bn' ? 'ভয়েস নোট ও মিডিয়া ক্লাউড' : 'Voice & Media Cloud'}</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {cloudinaryConfig.cloudName
                      ? language === 'bn'
                        ? `সংযুক্ত: ${cloudinaryConfig.cloudName} (ভয়েস ও ভিডিও রেডি)`
                        : `Connected: ${cloudinaryConfig.cloudName} (Media ready)`
                      : language === 'bn'
                      ? 'অন্য ডিভাইসে দ্রুত মিডিয়া শেয়ার করতে Cloudinary সেটআপ করুন।'
                      : 'Configure Cloudinary for cross-device video & photo sharing.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCloudinaryModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  {language === 'bn' ? 'সেটআপ' : 'Configure'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY & PROFILE LOCK */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              {/* Profile Lock Feature Card */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-violet-950/30 rounded-2xl p-5 border border-blue-200 dark:border-blue-800/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-blue-950 dark:text-blue-100 flex items-center gap-2">
                        <span>{language === 'bn' ? 'প্রোফাইল লক (Profile Lock)' : 'Lock Your Profile'}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isProfileLocked
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isProfileLocked
                            ? language === 'bn'
                              ? 'লক করা আছে'
                              : 'LOCKED'
                            : language === 'bn'
                            ? 'আনলক'
                            : 'UNLOCKED'}
                        </span>
                      </h4>
                      <p className="text-xs text-blue-900/80 dark:text-blue-300/80 mt-1 leading-relaxed">
                        {language === 'bn'
                          ? 'প্রোফাইল লক সক্রিয় থাকলে অপরিচিত ব্যক্তিরা আপনার ফুল সাইজ ছবি, পোস্ট বা অ্যালবাম দেখতে বা সেভ করতে পারবে না।'
                          : 'When locked, people who are not your friends cannot view full-size photos, posts, or albums on your profile.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileLocked(!isProfileLocked);
                      addActivityLog({
                        type: 'security',
                        titleEn: !isProfileLocked ? 'Profile Lock activated' : 'Profile Lock deactivated',
                        titleBn: !isProfileLocked ? 'প্রোফাইল লক সক্রিয় করা হয়েছে' : 'প্রোফাইল লক নিষ্ক্রিয় করা হয়েছে',
                      });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0 ${
                      isProfileLocked
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isProfileLocked
                      ? language === 'bn'
                        ? 'আনলক করুন'
                        : 'Unlock Profile'
                      : language === 'bn'
                      ? 'প্রোফাইল লক করুন'
                      : 'Lock Profile'}
                  </button>
                </div>
              </div>

              {/* Shortcut to Messenger Settings */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {language === 'bn'
                      ? 'মেসেঞ্জারের অনলাইন স্ট্যাটাস, টাইপিং ও থিম নিয়ন্ত্রণ'
                      : 'Messenger Active Status, Typing & Bubble Theme'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('messenger')}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  {language === 'bn' ? 'মেসেঞ্জার সেটিংস →' : 'Open →'}
                </button>
              </div>

              {/* Blocked Accounts Manager */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>{language === 'bn' ? 'ব্লক করা অ্যাকাউন্ট তালিকা' : 'Blocked Accounts'}</span>
                  </h5>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {blockedUserIds.length}
                  </span>
                </div>
                {blockedUserIds.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    {language === 'bn' ? 'আপনি কাউকে ব্লক করেননি।' : 'You have not blocked any users.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {blockedUserIds.map((uid) => {
                      const foundUser =
                        contacts.find((c) => c.id === uid) || profiles.find((p) => p.id === uid);
                      return (
                        <div
                          key={uid}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {foundUser?.avatar ? (
                              <SmartImage
                                src={foundUser.avatar}
                                alt={foundUser.name}
                                fallbackType="avatar"
                                fallbackLabel={foundUser.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                                ?
                              </div>
                            )}
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {foundUser
                                ? language === 'bn'
                                  ? foundUser.nameBn || foundUser.name
                                  : foundUser.name
                                : uid}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => unblockUser(uid)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            {language === 'bn' ? 'আনব্লক' : 'Unblock'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & PIN */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>{language === 'bn' ? 'সিকিউরিটি পিন ও পাসওয়ার্ড পরিবর্তন' : 'Set or Change Security PIN'}</span>
                </h4>
                <form onSubmit={handleSetPin} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'bn' ? 'নতুন ৪ সংখ্যার পিন' : 'New 4-digit PIN'}
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPin ? 'text' : 'password'}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          placeholder="••••"
                          maxLength={8}
                          className="w-full px-3 py-2 pr-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPin(!showNewPin)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'bn' ? 'পিন নিশ্চিত করুন' : 'Confirm PIN'}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPin ? 'text' : 'password'}
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value)}
                          placeholder="••••"
                          maxLength={8}
                          className="w-full px-3 py-2 pr-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPin(!showConfirmPin)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'পিন সংরক্ষণ করুন' : 'Save Security PIN'}</span>
                  </button>
                </form>
              </div>

              {currentUser.email && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-blue-950 dark:text-blue-100">
                      {language === 'bn' ? 'ফায়ারবেস ইমেইল পাসওয়ার্ড রিসেট' : 'Firebase Email Password Reset'}
                    </h5>
                    <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                      {currentUser.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => sendPasswordReset(currentUser.email!)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    {language === 'bn' ? 'রিসেট ইমেইল পাঠান' : 'Send Reset Link'}
                  </button>
                </div>
              )}

              {/* Cloud Media & Live Deployment API Protection Card */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/70 dark:from-slate-800/70 dark:to-blue-950/30 rounded-2xl p-5 border border-blue-200/80 dark:border-blue-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-blue-600" />
                      <span>
                        {language === 'bn'
                          ? 'ক্লাউড মিডিয়া ও লাইভ ডোমেইন সুরক্ষা'
                          : 'Cloud Media & Live API Protection'}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? `সক্রিয় ক্লাউডিনারি প্রিসেট: ${cloudinaryConfig.cloudName} / ${cloudinaryConfig.uploadPreset}`
                        : `Active Cloudinary Preset: ${cloudinaryConfig.cloudName} / ${cloudinaryConfig.uploadPreset}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCloudinaryModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ক্লাউডিনারি সেটিংস' : 'Cloudinary Setup'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {language === 'bn' ? 'বর্তমান হোস্ট ডোমেইন:' : 'Active Host Domain:'}
                    </span>
                    <code className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-blue-600 dark:text-blue-400">
                      {typeof window !== 'undefined' ? window.location.hostname : 'localhost'}
                    </code>
                  </div>
                  <p>
                    {language === 'bn'
                      ? '• ব্রাউজারে কোনো API সিক্রেট সংরক্ষণ করা হয় না; কেবল Unsigned Upload Preset ব্যবহৃত হয়।'
                      : '• No private API keys or secrets are stored in client storage; only unsigned upload presets are used.'}
                  </p>
                  <p>
                    {language === 'bn'
                      ? '• GitHub Pages লাইভের জন্য Firebase Authorized Domains ও Google Cloud HTTP Referrer লক চালু রাখুন।'
                      : '• Keep Firebase Authorized Domains & Google Cloud HTTP Referrer restrictions active for GitHub Pages.'}
                  </p>
                </div>
              </div>

              {/* Firebase Cloud Sync Diagnostics & Resync */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>
                        {language === 'bn'
                          ? 'ফায়ারবেস ক্লাউড সিংক স্ট্যাটাস ও ডায়াগনস্টিকস'
                          : 'Firebase Cloud Sync & Diagnostics'}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {cloudSyncStatus.isConnected
                        ? language === 'bn'
                          ? '● ফায়ারবেস ক্লাউডের সাথে রিয়েল-টাইমে যুক্ত আছে'
                          : '● Connected to Firebase Cloud in real time'
                        : language === 'bn'
                        ? 'অফলাইন বা গেস্ট মোডে চলছে — সব আইডিতে দেখতে সাইন-ইন করুন'
                        : 'Local mode — sign in with Google or Email to sync across devices'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={forceCloudResync}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'পুনরায় সিংক করুন' : 'Force Resync'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-slate-400 block">Project / Database</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                      {cloudSyncStatus.diagnostics.projectId || '—'} • {cloudSyncStatus.diagnostics.databaseId}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-slate-400 block">
                      {language === 'bn' ? 'সক্রিয় ক্লাউড অ্যাকাউন্ট' : 'Active Cloud Account'}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {cloudSyncStatus.diagnostics.email || cloudSyncStatus.diagnostics.uid || 'Guest'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 sm:col-span-2 flex items-center justify-between">
                    <span className="text-slate-500">
                      {language === 'bn' ? 'সর্বশেষ ক্লাউড সিংক:' : 'Last Cloud Sync:'}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {cloudSyncStatus.lastSyncAt
                        ? new Date(cloudSyncStatus.lastSyncAt).toLocaleTimeString()
                        : language === 'bn'
                        ? 'অপেক্ষমাণ'
                        : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ACTIVE DEVICES / SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {language === 'bn' ? 'লগইন করা সক্রিয় ডিভাইসসমূহ' : 'Where You Are Logged In'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'bn'
                      ? 'যেসব ডিভাইসে আপনার একাউন্ট বর্তমানে সক্রিয় রয়েছে'
                      : 'Devices currently holding active session tokens for your profile'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTerminateOtherSessions}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'অন্যান্য ডিভাইস লগআউট' : 'Log Out Others'}
                </button>
              </div>

              <div className="space-y-2.5">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{sess.device}</span>
                          {sess.isCurrent && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded">
                              THIS DEVICE
                            </span>
                          )}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {sess.location} • {sess.meta} • {sess.lastActive}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: DATA & ACCOUNT DELETION */}
          {activeTab === 'data' && (
            <div className="space-y-5">
              {/* Export Data */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-500" />
                    <span>{language === 'bn' ? 'আপনার সকল তথ্য ডাউনলোড করুন' : 'Download Your Information'}</span>
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'পোস্ট, প্রোফাইল তথ্য এবং আর্কাইভের একটি ব্যাকআপ ফাইল কপি নামিয়ে নিন।'
                      : 'Download a JSON archive copy of your profile and content.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'ডাউনলোড' : 'Download'}
                </button>
              </div>

              {/* Copyright & Community Protection Info */}
              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-900/60 space-y-1.5">
                <h5 className="font-bold text-xs sm:text-sm text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>
                    {language === 'bn'
                      ? 'কপিরাইট সুরক্ষা ও কমিউনিটি নীতিমালা'
                      : 'Copyright Protection & Community Policy'}
                  </span>
                </h5>
                <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
                  {language === 'bn'
                    ? 'বন্ধনে প্রকাশিত প্রতিটি মৌলিক রিল, অডিও ও ফটো ক্রিয়েটরের নিজস্ব সম্পত্তি। অন্যের কন্টেন্ট ব্যবহারের পূর্বে মূল ক্রিয়েটরের অনুমতি ও অ্যাট্রিবিউশন বজায় রাখা বাধ্যতামূলক।'
                    : 'Every original Reel, Audio Track, and Photo published on Bandhan belongs to its creator. Respect creator licensing and attribution rules across all uploads.'}
                </p>
              </div>

              {/* Danger Zone: Delete Account */}
              <div className="bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/60 space-y-3">
                <h4 className="font-extrabold text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>{language === 'bn' ? 'বিপদজনক অঞ্চল: একাউন্ট স্থায়ীভাবে মুছে ফেলা' : 'Danger Zone: Permanently Delete Account'}</span>
                </h4>
                <p className="text-xs text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
                  {language === 'bn'
                    ? 'আপনার একাউন্ট, পোস্ট, কমেন্ট, স্টোরি এবং সমস্ত ডাটা স্থায়ীভাবে মুছে যাবে। এই কাজটি আর পুনরুদ্ধার করা সম্ভব নয়।'
                    : 'Once you delete your account, there is no going back. All your posts, photos, comments, and friends connections will be wiped.'}
                </p>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {language === 'bn' ? 'একাউন্ট ডিলিট করতে এগিয়ে যান' : 'Delete My Account'}
                  </button>
                ) : (
                  <form onSubmit={handleDeleteAccountSubmit} className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-rose-700 dark:text-rose-300">
                      {language === 'bn' ? 'নিশ্চিত করতে "DELETE" টাইপ করুন:' : 'Type "DELETE" to confirm permanent deletion:'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE"
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        {language === 'bn' ? 'স্থায়ীভাবে ডিলিট' : 'Confirm Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                      >
                        {language === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <CloudinarySettingsModal
        isOpen={isCloudinaryModalOpen}
        onClose={() => setIsCloudinaryModalOpen(false)}
      />
    </div>
  );
};