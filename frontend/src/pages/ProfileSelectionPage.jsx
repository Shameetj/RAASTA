import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ACCESSIBILITY_PROFILES } from '../data/mockData';
import { Check, Sliders } from 'lucide-react';

export default function ProfileSelectionPage() {
  const {
    selectedProfileId,
    handleSelectProfile,
    preferences,
    setPreferences,
    setCurrentStep,
    showVisualToast
  } = useNavigation();

  const selectedProfile = ACCESSIBILITY_PROFILES.find(
    profile => profile.id === selectedProfileId
  );

  const toggle = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 space-y-4 pb-28 animate-fade-in">
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
          Accessibility profile
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Navigation settings
        </h2>
        <p className="text-xs text-stone-400 leading-relaxed">
          Choose how RAASTA should adapt navigation to your needs.
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800">
        <div className="text-[9px] uppercase tracking-wider text-stone-500 font-semibold">
          Active profile
        </div>
        <div className="mt-1 text-sm font-semibold text-white">
          {selectedProfile?.name || 'Accessibility profile'}
        </div>
      </div>

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
                  showVisualToast({
                    title: `${profile.name} selected`,
                    subtitle: 'Settings updated. Route will calculate when guidance starts.',
                    type: 'success'
                  });
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-colors ${selected
                    ? 'bg-orange-950/30 border-amber-500/70'
                    : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                  }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {profile.name}
                    </div>
                    <div className="text-[10px] text-amber-400 mt-0.5">
                      {profile.badge}
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${selected
                      ? 'bg-amber-500 text-neutral-950'
                      : 'border border-stone-700'
                    }`}>
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <p className="text-[11px] text-stone-300 mt-2 leading-relaxed">
                  {profile.description}
                </p>
              </button>
            );
          })}
      </div>

      <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-white">Navigation preferences</h3>
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

      <button
        type="button"
        onClick={() => {
          setCurrentStep('map');
          showVisualToast({
            title: 'Profile saved',
            subtitle: 'Settings are ready for your next route.',
            type: 'success'
          });
        }}
        className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-colors"
      >
        Save settings
      </button>
    </div>
  );
}

function PreferenceToggle({ title, description, enabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left ${enabled
          ? 'bg-orange-950/30 border-amber-500/50'
          : 'bg-neutral-950 border-stone-800'
        }`}
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white">{title}</div>
        <div className="text-[10px] text-stone-400">{description}</div>
      </div>

      <div className={`w-9 h-5 rounded-full flex items-center p-0.5 flex-shrink-0 ${enabled ? 'bg-amber-500 justify-end' : 'bg-stone-800 justify-start'
        }`}>
        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
      </div>
    </button>
  );
}
