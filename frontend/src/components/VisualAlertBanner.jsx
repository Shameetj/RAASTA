import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  AlertTriangle, 
  CheckCircle2, 
  DoorOpen, 
  Vibrate, 
  X,
  Radio
} from 'lucide-react';

export default function VisualAlertBanner() {
  const {
    activeToast,
    isHapticVibrating,
    emergencyStrobeActive,
    setEmergencyStrobeActive,
    triggerHaptic
  } = useNavigation();

  return (
    <>
      {/* 1. Mobile Visual Vibration Wave Indicator */}
      {isHapticVibrating && (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full border-4 border-cyan-400 opacity-80 animate-haptic-ring" />
          <div className="w-28 h-28 rounded-full border-4 border-cyan-300 opacity-90 animate-haptic-ring" style={{ animationDelay: '0.15s' }} />
          <div className="absolute top-14 px-3 py-1 rounded-full bg-cyan-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-lg shadow-cyan-500/50 animate-pulse">
            <Vibrate className="w-3.5 h-3.5" />
            <span>HAPTIC VIBRATION</span>
          </div>
        </div>
      )}

      {/* 2. Top Visual Alert Banner (Deaf / Universal Toast / API Errors) */}
      {activeToast && (
        <div className={`absolute top-14 left-3 right-3 z-40 p-3 rounded-2xl backdrop-blur-xl border-2 shadow-2xl flex items-start gap-2.5 animate-slide-up ${
          activeToast.type === 'error'
            ? 'bg-rose-950/95 border-rose-500 text-rose-100'
            : activeToast.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-400 text-emerald-100'
            : 'bg-slate-950/95 border-cyan-400 text-slate-100'
        }`}>
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 text-sm font-bold ${
            activeToast.type === 'error'
              ? 'bg-rose-500/20 border-rose-400 text-rose-300'
              : activeToast.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
              : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
          }`}>
            {activeToast.type === 'error' ? '⚠️' : activeToast.type === 'success' ? '✓' : '🦻'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold leading-tight">
              {activeToast.title}
            </h4>
            <p className="text-[11px] opacity-90 mt-0.5 leading-snug">
              {activeToast.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* 3. Emergency Strobe Modal */}
      {emergencyStrobeActive && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full p-6 rounded-3xl bg-red-950 border-4 border-red-500 shadow-2xl space-y-4 text-center animate-strobe-warning">
            <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center text-2xl mx-auto shadow-lg shadow-red-600/50 animate-bounce">
              ⚠️
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-black tracking-widest uppercase text-red-300">
                Visual Emergency Protocol (Deaf Mode)
              </div>
              <h3 className="text-xl font-black text-white font-display">
                EMERGENCY EVACUATION
              </h3>
              <p className="text-xs text-red-200">
                Visual strobe active. Step-free evacuation egress route illuminated.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/70 border border-red-800 text-left space-y-1">
              <div className="text-[11px] font-bold text-red-300 uppercase flex items-center gap-1">
                <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Accessible Egress:</span>
              </div>
              <p className="text-[11px] text-slate-200">
                Proceed 40m East along West Promenade ramp to Exit Gate 1. Level clearance with visual beacon.
              </p>
            </div>

            <button
              onClick={() => {
                setEmergencyStrobeActive(false);
                triggerHaptic([100]);
              }}
              className="w-full py-2.5 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-wider hover:bg-slate-200 cursor-pointer shadow-md"
            >
              Dismiss Emergency Drill
            </button>
          </div>
        </div>
      )}
    </>
  );
}
