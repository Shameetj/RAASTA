import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  Vibrate, 
  DoorOpen, 
  Footprints, 
  Camera, 
  Layers 
} from 'lucide-react';

export default function RouteResultsPage() {
  const {
    origin,
    destination,
    routes,
    selectedProfile,
    selectedProfileId,
    handleSelectProfile,
    setCurrentStep,
    triggerHaptic,
    showVisualToast,
    setEmergencyStrobeActive,
    isHapticVibrating
  } = useNavigation();

  const fastest = routes.fastest;
  const accessible = routes.accessible;

  return (
    <div className="p-4 space-y-4 pb-8 animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-emerald-400 text-[10px] font-bold">
          Step 5 of 6: Route Results
        </div>
        <h2 className="text-xl font-bold text-white font-display">
          Route Accessibility Results
        </h2>
        <p className="text-xs text-slate-400">
          Comparing paths for <strong className="text-emerald-400">{selectedProfile.name} {selectedProfile.symbol}</strong>
        </p>
      </div>

      {/* Profile Persona Quick Switcher Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['wheelchair', 'deaf', 'blind', 'elderly'].map((pid) => {
          const isSelected = selectedProfileId === pid;
          const label = pid === 'wheelchair' ? 'Wheelchair ♿' : pid === 'deaf' ? 'Deaf 🦻' : pid === 'blind' ? 'Low Vision 👁️' : 'Senior 🦽';
          return (
            <button
              key={pid}
              onClick={() => {
                handleSelectProfile(pid);
                triggerHaptic([40, 20]);
              }}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all touch-active ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#131b2e] text-slate-300 border border-slate-800'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Visual Detour Routing Flowchart (A -> D -> C vs A -> B -> C) */}
      <div className="p-4 rounded-3xl bg-[#131b2e] border-2 border-emerald-500/60 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔀</span>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Detour Path Breakdown
              </h3>
              <div className="text-[10px] text-slate-400">Backend Obstacle Detection &amp; Rerouting</div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
            A ➔ D ➔ C
          </span>
        </div>

        {/* Path Flow 1: Safe Alternative Route (A -> D -> C) */}
        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span>✔ Alternative Route (Safe Detour)</span>
            <span className="text-[10px] text-emerald-300 font-mono">100% Step-Free</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold py-1">
            <span className="px-2 py-1 rounded-lg bg-emerald-900/80 text-emerald-200 border border-emerald-600 whitespace-nowrap">
              📍 A: Start
            </span>
            <span className="text-emerald-400 font-bold">➔</span>
            <span className="px-2 py-1 rounded-lg bg-emerald-800 text-white border border-emerald-400 font-bold whitespace-nowrap shadow-sm">
              ♿ D: West Promenade Ramp
            </span>
            <span className="text-emerald-400 font-bold">➔</span>
            <span className="px-2 py-1 rounded-lg bg-emerald-900/80 text-emerald-200 border border-emerald-600 whitespace-nowrap">
              🏁 C: {destination.name}
            </span>
          </div>
          <div className="text-[10px] text-emerald-300">
            Bypasses 18-step concrete stairs at B via 1:12 gentle ramp.
          </div>
        </div>

        {/* Path Flow 2: Blocked Direct Route (A -> B -> C) */}
        <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-rose-400">
            <span>✖ Direct Path (Blocked at B)</span>
            <span className="text-[10px] text-rose-300 font-mono">Inaccessible 🚫</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold py-1">
            <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-700 whitespace-nowrap">
              📍 A: Start
            </span>
            <span className="text-rose-400 font-bold">➔</span>
            <span className="px-2 py-1 rounded-lg bg-rose-900 text-white border border-rose-500 font-bold whitespace-nowrap shadow-sm">
              ⚠️ B: 18 Concrete Stairs
            </span>
            <span className="text-rose-400 font-bold">➔</span>
            <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-700 whitespace-nowrap">
              🏁 C: {destination.name}
            </span>
          </div>
          <div className="text-[10px] text-rose-300">
            Standard GPS route fails wheelchair accessibility due to 18 steep steps without a ramp.
          </div>
        </div>
      </div>

      {/* Dual Route Result Comparison Cards */}
      <div className="space-y-3">
        
        {/* Recommended Route B (Step-Free 94) */}
        <div className="p-4 rounded-3xl bg-[#131b2e] border-2 border-emerald-500/80 shadow-md space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Alternative Step-Free Route (A ➔ D ➔ C)
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
              Safe ♿
            </span>
          </div>

          <div className="flex items-baseline justify-between p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
            <div>
              <div className="text-3xl font-black text-emerald-400 font-display">
                {accessible.accessibilityScore}
                <span className="text-base font-normal text-emerald-600">/100</span>
              </div>
              <div className="text-[10px] text-emerald-300 font-semibold">{accessible.scoreRating}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">{accessible.durationMinutes} mins • {accessible.distanceMeters} m</div>
              <div className="text-[10px] text-emerald-400">0 Physical Barriers</div>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug">
            {accessible.summary}
          </p>
        </div>

        {/* Direct Route A (Contains Steps 32) */}
        <div className="p-4 rounded-3xl bg-[#131b2e] border border-rose-900/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Direct Route (A ➔ B ➔ C - Blocked)
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
              Contains Stairs 🚫
            </span>
          </div>

          <div className="flex items-baseline justify-between p-3 rounded-2xl bg-rose-950/20 border border-rose-800/20">
            <div>
              <div className="text-3xl font-black text-rose-400 font-display">
                {fastest.accessibilityScore}
                <span className="text-base font-normal text-rose-600">/100</span>
              </div>
              <div className="text-[10px] text-rose-300 font-semibold">{fastest.scoreRating}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">{fastest.durationMinutes} mins • {fastest.distanceMeters} m</div>
              <div className="text-[10px] text-rose-400">Blocked by 18 Stairs at B</div>
            </div>
          </div>

          <div className="space-y-1 bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30 text-[11px] text-slate-300">
            {fastest.barriers.map((b, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>{b.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CONDITIONAL FEATURE 1: WHEELCHAIR ♿ ACCOMMODATIONS                         */}
      {/* ========================================================================= */}
      {(selectedProfileId === 'wheelchair' || true) && (
        <div className="p-4 rounded-3xl bg-[#131b2e] border border-emerald-500/40 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">♿</span>
              <div>
                <h3 className="text-xs font-bold text-white font-display">
                  Wheelchair Checklist
                </h3>
                <span className="text-[10px] text-emerald-400 font-medium">100% Step-Free Route</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            
            {/* 1. STAIRS */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Stairs 🚫</span>
                <span className="text-emerald-400">0 Steps</span>
              </div>
              <div className="text-xs font-bold text-white">Zero Stairs</div>
              <div className="text-[10px] text-slate-300">18 overpass steps avoided</div>
            </div>

            {/* 2. RAMP */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Ramp 📐</span>
                <span className="text-emerald-400">1:12 Slope</span>
              </div>
              <div className="text-xs font-bold text-white">Gentle Ramp</div>
              <div className="text-[10px] text-slate-300">Dual handrails on both sides</div>
            </div>

            {/* 3. SIDEWALK */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Sidewalk 🚶</span>
                <span className="text-emerald-400">2.4m Wide</span>
              </div>
              <div className="text-xs font-bold text-white">Tactile Paved</div>
              <div className="text-[10px] text-slate-300">Flat ground, no debris or drops</div>
            </div>

            {/* 4. ENTRANCE */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Entrance 🚪</span>
                <span className="text-emerald-400">Level-0</span>
              </div>
              <div className="text-xs font-bold text-white">Auto Sliding</div>
              <div className="text-[10px] text-slate-300">Gate 1 motorized sliding door</div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONDITIONAL FEATURE 2: DEAF 🦻 ACCOMMODATIONS                              */}
      {/* ========================================================================= */}
      {(selectedProfileId === 'deaf' || true) && (
        <div className="p-4 rounded-3xl bg-[#131b2e] border border-cyan-500/40 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🦻</span>
              <div>
                <h3 className="text-xs font-bold text-white font-display">
                  Deaf &amp; Hard of Hearing Suite
                </h3>
                <span className="text-[10px] text-cyan-400 font-medium">Visual &amp; Haptic Cues Active</span>
              </div>
            </div>

            <button
              onClick={() => triggerHaptic([180, 80, 180])}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1 ${
                isHapticVibrating ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-cyan-950 text-cyan-300 border-cyan-700'
              }`}
            >
              <Vibrate className="w-3 h-3" />
              <span>Feel Buzz</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            
            {/* 1. VISUAL ALERTS */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Visual Alerts 🚨</div>
              <div className="text-xs font-bold text-white">Turn Banners</div>
              <button
                onClick={() => showVisualToast({
                  title: 'Turn Right in 30m',
                  subtitle: 'Approaching gentle 1:12 ramp on the right',
                  type: 'info'
                })}
                className="text-[10px] text-cyan-400 underline font-semibold"
              >
                ▶ Test Banner
              </button>
            </div>

            {/* 2. VIBRATION */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Vibration 📳</div>
              <div className="text-xs font-bold text-white">Turn Buzz</div>
              <button
                onClick={() => triggerHaptic([100, 50, 100, 50, 200])}
                className="text-[10px] text-cyan-400 underline font-semibold"
              >
                ▶ Feel Pattern
              </button>
            </div>

            {/* 3. ANNOUNCEMENTS */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Signage 📢</div>
              <div className="text-xs font-bold text-white">Live Subtitles</div>
              <div className="text-[10px] text-cyan-400 font-medium">✓ Metro lift open</div>
            </div>

            {/* 4. EMERGENCY */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Emergency ⚠️</div>
              <div className="text-xs font-bold text-white">Strobe Alert</div>
              <button
                onClick={() => setEmergencyStrobeActive(true)}
                className="text-[10px] text-red-400 underline font-semibold"
              >
                ▶ Test Strobe
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Step Turn Cards */}
      <div className="p-3.5 rounded-2xl bg-[#131b2e] border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Footprints className="w-3.5 h-3.5 text-emerald-400" />
          Step-by-Step Walk Guidance
        </h3>

        <div className="space-y-1.5">
          {accessible.segments.map((seg, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </span>
                <div>
                  <div className="text-slate-200">{seg.text}</div>
                  <div className="text-[10px] text-emerald-400">{seg.highlight}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{seg.distance}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => {
            setCurrentStep('map');
            triggerHaptic([50]);
          }}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 touch-active"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>View on Map</span>
        </button>

        <button
          onClick={() => {
            setCurrentStep('report');
            triggerHaptic([50]);
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md touch-active cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Report an Obstacle</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
