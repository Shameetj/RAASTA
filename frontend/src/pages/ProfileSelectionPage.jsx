import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ACCESSIBILITY_PROFILES } from '../data/mockData';
import { 
  Check, 
  Sliders, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck 
} from 'lucide-react';

export default function ProfileSelectionPage() {
  const {
    selectedProfileId,
    handleSelectProfile,
    preferences,
    setPreferences,
    setCurrentStep,
    triggerHaptic,
    showVisualToast
  } = useNavigation();

  const handleTogglePreference = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    triggerHaptic([40, 20]);
  };

  return (
    <div className="p-4 space-y-5 pb-8 animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-emerald-400 text-[10px] font-bold">
          Step 2 of 6: Profile Selection
        </div>
        <h2 className="text-xl font-bold text-white font-display">
          How do you travel?
        </h2>
        <p className="text-xs text-slate-400">
          Pick your mobility profile to personalize route choices, warnings, and alerts.
        </p>
      </div>

      {/* Profiles List */}
      <div className="space-y-2.5">
        {ACCESSIBILITY_PROFILES.map((profile) => {
          const isSelected = selectedProfileId === profile.id;

          return (
            <div
              key={profile.id}
              onClick={() => {
                handleSelectProfile(profile.id);
                triggerHaptic([60, 30]);
                showVisualToast({
                  title: `${profile.name} Selected`,
                  subtitle: `Navigation adjusted for ${profile.badge}`,
                  type: 'info'
                });
              }}
              className={`p-3.5 rounded-2xl border transition-all duration-150 touch-active cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/25 border-emerald-500 shadow-md ring-1 ring-emerald-500/80'
                  : 'bg-[#131b2e] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                    {profile.symbol}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {profile.name}
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {profile.badge}
                    </span>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-700" />
                )}
              </div>

              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                {profile.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Granular Preference Toggles */}
      <div className="p-4 rounded-2xl bg-[#131b2e] border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white font-display">
            Personal Preferences
          </h3>
        </div>

        <div className="space-y-2">
          {/* Avoid Stairs */}
          <div 
            onClick={() => handleTogglePreference('avoidStairs')}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer touch-active ${
              preferences.avoidStairs ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-white">Avoid All Stairs 🚫</div>
              <div className="text-[10px] text-slate-400">Strictly step-free paths</div>
            </div>
            <div className={`w-8 h-4 rounded-full flex items-center p-0.5 ${preferences.avoidStairs ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'}`}>
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
          </div>

          {/* Prioritize Ramps */}
          <div 
            onClick={() => handleTogglePreference('needsRamp')}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer touch-active ${
              preferences.needsRamp ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-white">Require Gentle Ramps 📐</div>
              <div className="text-[10px] text-slate-400">1:12 slope with handrails</div>
            </div>
            <div className={`w-8 h-4 rounded-full flex items-center p-0.5 ${preferences.needsRamp ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'}`}>
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
          </div>

          {/* Visual Navigation Cues */}
          <div 
            onClick={() => handleTogglePreference('visualHapticAlerts')}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer touch-active ${
              preferences.visualHapticAlerts ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-white">Visual Navigation Cues 🦻</div>
              <div className="text-[10px] text-slate-400">High-visibility banners &amp; subtitles</div>
            </div>
            <div className={`w-8 h-4 rounded-full flex items-center p-0.5 ${preferences.visualHapticAlerts ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'}`}>
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Next CTA */}
      <button
        onClick={() => {
          setCurrentStep('destination');
          triggerHaptic([50]);
        }}
        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md touch-active cursor-pointer"
      >
        <span>Set Destination</span>
        <ArrowRight className="w-4 h-4" />
      </button>

    </div>
  );
}
