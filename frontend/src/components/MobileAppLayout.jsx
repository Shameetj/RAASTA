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
    isHighContrast, 
    triggerHaptic 
  } = useNavigation();

  const getProfileIcon = () => {
    switch (selectedProfileId) {
      case 'wheelchair': return <Accessibility className="w-4 h-4 text-emerald-400" />;
      case 'deaf': return <EarOff className="w-4 h-4 text-cyan-400" />;
      case 'blind': return <Eye className="w-4 h-4 text-purple-400" />;
      case 'elderly': return <HeartPulse className="w-4 h-4 text-amber-400" />;
      default: return <Accessibility className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className={`min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col ${
      isHighContrast ? 'high-contrast-mode' : ''
    }`}>
      
      {/* Real Mobile App Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => {
            setCurrentStep('home');
            triggerHaptic([40]);
          }}
          className="flex items-center gap-2.5 cursor-pointer touch-active"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-sm shadow-md shadow-emerald-900/40">
            ♿
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-white font-display">RAASTA</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 uppercase">
                Access
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5">
          {/* Active Profile Pill */}
          <button
            onClick={() => {
              setCurrentStep('profile');
              triggerHaptic([40]);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 touch-active hover:bg-slate-800 transition-colors"
          >
            {getProfileIcon()}
            <span className="text-[12px] font-medium">{selectedProfile.name.split(' ')[0]}</span>
            <span className="text-[11px] text-emerald-400 font-bold">{selectedProfile.symbol}</span>
          </button>
        </div>
      </header>

      {/* Main Mobile Screen Viewport */}
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col">
        {children}
      </main>

    </div>
  );
}
