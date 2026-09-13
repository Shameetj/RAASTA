import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import {
  Accessibility,
  EarOff,
  Eye,
  HeartPulse
} from 'lucide-react';

export default function MobileAppLayout({ children }) {
  const {
    selectedProfile,
    selectedProfileId,
    setCurrentStep,
    triggerHaptic,
    isHighContrast
  } = useNavigation();

  const getProfileIcon = () => {
    switch (selectedProfileId) {
      case 'wheelchair':
        return <Accessibility className="w-4 h-4 text-amber-400" />;

      case 'deaf':
        return <EarOff className="w-4 h-4 text-cyan-400" />;

      case 'blind':
        return <Eye className="w-4 h-4 text-purple-400" />;

      case 'elderly':
        return <HeartPulse className="w-4 h-4 text-rose-400" />;

      default:
        return <Accessibility className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div
      className={`min-h-screen w-full bg-neutral-950 text-stone-100 flex flex-col ${isHighContrast ? 'high-contrast-mode' : ''
        }`}
    >

      {/* Minimal Header */}
      <header className="sticky top-0 z-40 w-full bg-neutral-950/95 backdrop-blur-md border-b border-stone-800/80 px-4 py-3 flex items-center justify-between">

        {/* Brand */}
        <button
          type="button"
          onClick={() => {
            setCurrentStep('home');
            triggerHaptic([40]);
          }}
          className="flex items-center gap-2.5 cursor-pointer touch-active"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-700 via-amber-500 to-yellow-400 flex items-center justify-center text-sm shadow-md shadow-orange-900/40">
            R
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-base font-black tracking-tight text-white font-display">
              RAASTA
            </span>

            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-950 text-amber-300 border border-orange-700/60 uppercase">
              Access
            </span>
          </div>
        </button>

        {/* Active Profile */}
        <button
          type="button"
          onClick={() => {
            setCurrentStep('profile');
            triggerHaptic([40]);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700/80 text-xs font-semibold text-stone-200 touch-active hover:border-stone-600 transition-colors"
        >
          {getProfileIcon()}

          <span className="text-[11px] max-w-[90px] truncate">
            {selectedProfile?.name?.split(' ')[0] || 'Profile'}
          </span>
        </button>

      </header>

      {/* Main Mobile Screen */}
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col">
        {children}
      </main>

    </div>
  );
}