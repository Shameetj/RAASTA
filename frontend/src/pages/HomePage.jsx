import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  Compass, 
  ArrowRight, 
  Camera, 
  Layers, 
  ShieldCheck, 
  Footprints,
  Accessibility,
  EarOff,
  Eye,
  HeartPulse,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { DEMO_DESTINATIONS } from '../data/mockData';

export default function HomePage() {
  const { 
    setCurrentStep, 
    selectedProfile, 
    handleSelectProfile, 
    setDestination, 
    triggerHaptic, 
    showVisualToast 
  } = useNavigation();

  const launchScenario = (profileId, destIndex, targetStep) => {
    handleSelectProfile(profileId);
    setDestination(DEMO_DESTINATIONS[destIndex]);
    setCurrentStep(targetStep);
    triggerHaptic([80, 40]);
    showVisualToast({
      title: `${profileId === 'wheelchair' ? 'Wheelchair' : 'Deaf'} Mode Activated`,
      subtitle: `Setting path to ${DEMO_DESTINATIONS[destIndex].name}`,
      type: 'info'
    });
  };

  return (
    <div className="p-4 space-y-5 pb-6 animate-fade-in">
      
      {/* Friendly Hero Banner */}
      <div className="p-5 rounded-3xl bg-[#131b2e] border border-slate-800 shadow-lg space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
            Accessible City Mobility
          </span>
          <span className="text-xs text-slate-400">Track 1: Access</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display leading-tight">
          Find routes you can actually use.
        </h1>

        <p className="text-xs text-slate-300 leading-relaxed">
          Standard maps only look for the shortest distance. <strong className="text-emerald-400 font-semibold">RAASTA</strong> finds step-free paths with verified ramps, flat sidewalks, and visual guidance for wheelchair, deaf, and disabled commuters.
        </p>

        {/* Primary Action Button */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => {
              setCurrentStep('profile');
              triggerHaptic([50]);
            }}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md touch-active cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Plan an Accessible Journey</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setCurrentStep('report');
                triggerHaptic([50]);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 touch-active"
            >
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              <span>Report Obstacle</span>
            </button>

            <button
              onClick={() => {
                setCurrentStep('map');
                triggerHaptic([50]);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 touch-active"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Explore Map</span>
            </button>
          </div>
        </div>

        {/* City Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-center">
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-base font-extrabold text-emerald-400 font-display">Live</div>
            <div className="text-[10px] text-slate-400">Route Engine</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-base font-extrabold text-cyan-400 font-display">0 Steps</div>
            <div className="text-[10px] text-slate-400">On Detour Path</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-base font-extrabold text-purple-400 font-display">Active</div>
            <div className="text-[10px] text-slate-400">Obstacle Avoidance</div>
          </div>
        </div>
      </div>

      {/* Demo Quick Starts */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Try Scenarios
          </h3>
          <span className="text-[10px] text-slate-500">1-Tap Experience</span>
        </div>

        {/* Scenario 1: Wheelchair */}
        <div
          onClick={() => launchScenario('wheelchair', 0, 'results')}
          className="p-3.5 rounded-2xl bg-[#131b2e] border border-slate-800 hover:border-emerald-500/50 transition-all touch-active cursor-pointer flex items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-xl flex-shrink-0">
              ♿
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-white">Wheelchair Commuter</h4>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Step-Free
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Metro ➔ Library (Avoids 18 stairs, uses 1:12 ramp)
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        </div>

        {/* Scenario 2: Deaf Mode */}
        <div
          onClick={() => launchScenario('deaf', 0, 'results')}
          className="p-3.5 rounded-2xl bg-[#131b2e] border border-slate-800 hover:border-cyan-500/50 transition-all touch-active cursor-pointer flex items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-xl flex-shrink-0">
              🦻
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-white">Deaf &amp; Hard of Hearing</h4>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Visual Cues
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Visual turn banners, live subtitles, and hazard notices
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        </div>

        {/* Scenario 3: Community Barrier Report */}
        <div
          onClick={() => {
            setCurrentStep('report');
            triggerHaptic([50]);
          }}
          className="p-3.5 rounded-2xl bg-[#131b2e] border border-slate-800 hover:border-purple-500/50 transition-all touch-active cursor-pointer flex items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-xl flex-shrink-0">
              📸
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-white">Report an Obstacle</h4>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                  Community
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Upload a photo to alert fellow commuters and update routes
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
        </div>
      </div>

    </div>
  );
}
