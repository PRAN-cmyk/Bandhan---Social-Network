import React, { useState } from 'react';
import { X, Shield, Gamepad2, Film, Users, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BandhanLogo } from './BandhanLogo';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { language, setIsAccountSecurityOpen } = useApp();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDismiss = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('bandhan_welcome_v1', 'dismissed');
      } catch {}
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-blue-500/30 shadow-[0_0_60px_rgba(37,99,235,0.28)] overflow-hidden text-center flex flex-col max-h-[92vh]">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 overflow-y-auto no-scrollbar space-y-5">
          <BandhanLogo variant="splash" language={language} className="pt-2" />

          {/* Platform Highlights */}
          <div className="grid grid-cols-2 gap-2.5 text-left">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {language === 'bn' ? 'সুরক্ষিত অ্যাকাউন্ট' : 'Private & Safe'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  {language === 'bn' ? 'পিন লক ও ২-স্তর নিরাপত্তা' : 'PIN lock & 2FA vault'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {language === 'bn' ? 'স্টোরি ও রিল' : 'Stories & Reels'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  {language === 'bn' ? 'মিউজিক ও লাইভ রিঅ্যাক্ট' : 'Audio tags & reactions'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {language === 'bn' ? 'গেম জোন' : 'Playroom'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  {language === 'bn' ? 'চেস, লুডো, স্নেক ও কুইজ' : 'Chess, Ludo & arcade'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {language === 'bn' ? 'সরাসরি মেসেঞ্জার' : 'Messenger'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  {language === 'bn' ? 'ভয়েস, কল ও রিয়েল-টাইম চ্যাট' : 'Voice, media & calls'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
            >
              <span>{language === 'bn' ? 'বন্ধনে প্রবেশ করুন' : 'Enter Bandhan'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                setIsAccountSecurityOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-white/10"
            >
              {language === 'bn'
                ? 'অ্যাকাউন্ট সিকিউরিটি ও মেসেঞ্জার সেটিংস'
                : 'Account Security & Messenger Settings'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>
                {language === 'bn'
                  ? 'পরবর্তীতে স্বয়ংক্রিয়ভাবে দেখাবেন না'
                  : 'Do not show automatically next time'}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
