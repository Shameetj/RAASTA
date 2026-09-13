import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ACCESSIBILITY_PROFILES } from '../data/mockData';
import { Check, Sliders, ArrowLeft } from 'lucide-react';

export default function ProfileSelectionPage() {
  const {
    selectedProfileId,
    handleSelectProfile,
    preferences,
    setPreferences,
    setCurrentStep,
    showVisualToast,
    triggerHaptic
  } = useNavigation();

  const selectedProfile = ACCESSIBILITY_PROFILES.find(
    profile => profile.id === selectedProfileId
  );

  const toggle = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    if (triggerHaptic) triggerHaptic([30]);
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 space-y-4 pb-28 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCurrentStep('map')}
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
            Accessibility Profile
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Navigation Settings
          </h2>
        </div>
      </div>

      {/* Active Profile Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
            Active Profile
          </div>
          <div className="mt-0.5 text-sm font-bold text-white">
            {selectedProfile?.name || 'Accessibility profile'}
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
          Active
        </span>
      </div>

      {/* Profile Choices */}
      <div className="space-y-2">
        {ACCESSIBILITY_PROFILES
          .filter(profile => profile.id === 'wheelchair' || profile.id === 'deaf')
          .map(profile => {
            const selected = selectedProfileId === profile.id;

            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => {
                  handleSelectProfile(profile.id);
                  if (triggerHaptic) triggerHaptic([40, 20]);
                  showVisualToast({
                    title: `${profile.name} Selected`,
                    subtitle: 'Settings updated for your next route.',
                    type: 'success'
                  });
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all touch-active ${
                  selected
                    ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/60'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white">
                      {profile.name}
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">
                      {profile.badge}
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selected
                      ? 'bg-emerald-500 text-slate-950'
                      : 'border border-slate-700'
                  }`}>
                    {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  {profile.description}
                </p>
              </button>
            );
          })}
      </div>

      {/* Preferences Section */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white">Route Preferences</h3>
        </div>

        <PreferenceToggle
          title="Avoid all stairs"
          description="Prefer strictly step-free paths"
          enabled={preferences.avoidStairs}
          onClick={() => toggle('avoidStairs')}
        />

        <PreferenceToggle
          title="Require gentle ramps"
          description="Prefer ramped paths where available"
          enabled={preferences.needsRamp}
          onClick={() => toggle('needsRamp')}
        />

        <PreferenceToggle
          title="Visual navigation cues"
          description="High-visibility banners and visual alerts"
          enabled={preferences.visualHapticAlerts}
          onClick={() => toggle('visualHapticAlerts')}
        />
      </div>

      {/* Save Settings Button */}
      <button
        type="button"
        onClick={() => {
          setCurrentStep('map');
          showVisualToast({
            title: 'Profile Saved',
            subtitle: 'Ready to navigate on the map.',
            type: 'success'
          });
        }}
        className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors touch-active"
      >
        Save & Return to Map
      </button>
    </div>
  );
}

function PreferenceToggle({ title, description, enabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
        enabled
          ? 'bg-emerald-950/25 border-emerald-500/40'
          : 'bg-slate-950 border-slate-800'
      }`}
    >
      <div className="min-w-0">
        <div className="text-xs font-bold text-white">{title}</div>
        <div className="text-[10px] text-slate-400">{description}</div>
      </div>

      <div className={`w-9 h-5 rounded-full flex items-center p-0.5 flex-shrink-0 transition-colors ${
        enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
      }`}>
        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
      </div>
    </button>
  );
}
