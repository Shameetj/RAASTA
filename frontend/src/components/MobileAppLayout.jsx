import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  Sun, 
  Moon, 
  Vibrate, 
  AlertTriangle, 
  BarChart3, 
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
    setIsHighContrast,
    triggerHaptic,
    setEmergencyStrobeActive,
    setCivicModalOpen,
    isHapticVibrating
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 touch-active"
          >
            {getProfileIcon()}
            <span className="text-[11px] max-w-[80px] truncate">{selectedProfile.name.split(' ')[0]}</span>
            <span className="text-[10px] text-emerald-400">{selectedProfile.symbol}</span>
          </button>

          {/* Test Haptic Button */}
          <button
            onClick={() => triggerHaptic([150, 80, 150])}
            className={`p-2 rounded-xl border transition-all touch-active ${
              isHapticVibrating 
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400'
            }`}
            title="Test Vibration"
          >
            <Vibrate className="w-3.5 h-3.5" />
          </button>

          {/* Emergency Alert Drill (Deaf Mode) */}
          <button
            onClick={() => {
              setEmergencyStrobeActive(true);
              triggerHaptic([200]);
            }}
            className="p-2 rounded-xl bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/50 touch-active"
            title="Emergency Strobe Drill"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </button>

          {/* Civic Dashboard */}
          <button
            onClick={() => {
              setCivicModalOpen(true);
              triggerHaptic([40]);
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 touch-active"
            title="Civic Portal"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>

          {/* High Contrast */}
          <button
            onClick={() => setIsHighContrast(!isHighContrast)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 touch-active"
            title="High Contrast"
          >
            {isHighContrast ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
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
